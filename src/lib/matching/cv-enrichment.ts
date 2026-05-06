/**
 * cv-enrichment.ts — CV Enrichment Trigger
 *
 * After CV upload on Card 3 (B2C), agentul B2B Card 1 (specialistul in evaluare
 * si fise de post) analizeaza CV-ul pe cele 6 criterii JG si identifica gaps.
 * Este acelasi specialist care ajuta clientii B2B sa-si faca fisele de post —
 * deci cunoaste criteriile din practica de grading.
 *
 * The 6 criteria: Educatie, Comunicare, Rezolvare probleme, Luarea deciziilor,
 *                 Impact afaceri, Conditii munca.
 */

import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"

const CRITERIA = [
  { key: "Knowledge", label: "Educatie si cunostinte" },
  { key: "Communications", label: "Comunicare" },
  { key: "ProblemSolving", label: "Rezolvare probleme" },
  { key: "DecisionMaking", label: "Luarea deciziilor" },
  { key: "BusinessImpact", label: "Impact afaceri" },
  { key: "WorkingConditions", label: "Conditii de munca" },
] as const

interface CriterionGap {
  criterion: string
  label: string
  available: boolean
  confidence: number
  gapDescription: string
}

interface EnrichmentResult {
  gaps: CriterionGap[]
  guidedPrompt: string
  enrichmentStatus: "COMPLETE" | "PARTIAL" | "INSUFFICIENT"
}

/**
 * After CV upload on Card 3 (B2C), specialistul B2B Card 1 (evaluare posturi)
 * analizeaza CV-ul si identifica ce lipseste pentru scorare pe 6 criterii.
 * Apoi ghideaza un dialog pentru completarea informatiilor lipsa.
 */
export async function triggerCVEnrichment(userId: string, cvText: string): Promise<void> {
  const p = prisma as any

  // 1. Extract what maps to each criterion from CV text via CPU
  const analysisResult = await cpuCall({
    system: `Esti expert in evaluare JobGrade. Analizeaza un CV si determina ce informatii sunt disponibile pentru fiecare din cele 6 criterii de evaluare.

Raspunde DOAR cu JSON valid:
{
  "criteria": [
    {
      "criterion": "Knowledge",
      "label": "Educatie si cunostinte",
      "available": true/false,
      "confidence": 0.0-1.0,
      "extractedInfo": "ce ai gasit relevant",
      "gapDescription": "ce lipseste pentru scorare"
    }
  ],
  "overallCompleteness": 0-100
}

Fii riguros: un CV tipic ofera date bune pentru Knowledge si partial Communications, dar rareori ofera date directe pentru DecisionMaking sau BusinessImpact. Marcheaza sincer ce lipseste.`,
    messages: [
      {
        role: "user",
        content: `Analizeaza acest CV pentru cele 6 criterii JobGrade:\n\n${cvText.slice(0, 4000)}`,
      },
    ],
    max_tokens: 800,
    agentRole: "EMA", // Evaluation Manager Agent — specialistul B2B Card 1
    operationType: "cv-enrichment-analysis",
    skipObjectiveCheck: true,
  })

  let analysis: { criteria: CriterionGap[]; overallCompleteness: number }
  try {
    const jsonMatch = analysisResult.text.match(/\{[\s\S]*\}/)
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { criteria: [], overallCompleteness: 0 }
  } catch {
    analysis = { criteria: [], overallCompleteness: 0 }
  }

  // 2. Identify gaps
  const gaps = (analysis.criteria || []).filter(
    (c) => !c.available || c.confidence < 0.5,
  )

  // 3. Determine enrichment status
  const enrichmentStatus: EnrichmentResult["enrichmentStatus"] =
    gaps.length === 0 ? "COMPLETE" :
    gaps.length <= 3 ? "PARTIAL" :
    "INSUFFICIENT"

  // 4. Create a guided conversation prompt for EMA (specialistul B2B evaluare)
  let guidedPrompt = ""
  if (gaps.length > 0) {
    const gapDescriptions = gaps.map(
      (g) => `- ${g.label}: ${g.gapDescription || "informatii insuficiente"}`,
    ).join("\n")

    guidedPrompt = `CV candidat B2C analizat pe cele 6 criterii JG. Lipsesc informatii pentru:

${gapDescriptions}

Ca specialist in evaluare posturi (Card 1 B2B), formuleaza intrebari de clarificare pentru candidat — acelasi tip de intrebari pe care le-ai folosi la completarea unei fise de post, dar adaptate pentru CV. Scopul: obtine informatii concrete care fac CV-ul scorabil pe cele 6 criterii. Intrebarile trebuie sa sune natural, despre experienta reala, situatii concrete si responsabilitati. Informatiile vor fi folosite la matching cu posturi B2B.`
  }

  // 5. Save enrichment status on B2CCardProgress for CARD_3 (where CV was uploaded)
  const card3 = await p.b2CCardProgress.findFirst({
    where: { userId, card: "CARD_3" },
  })

  if (card3) {
    await p.b2CCardProgress.update({
      where: { id: card3.id },
      data: {
        questionnaireData: {
          ...(card3.questionnaireData as Record<string, unknown> || {}),
          cvEnrichment: {
            status: enrichmentStatus,
            gaps: gaps.map((g) => ({ criterion: g.criterion, label: g.label, gapDescription: g.gapDescription })),
            analyzedAt: new Date().toISOString(),
          },
        },
      },
    })
  }

  // 6. Create an agentTask for EMA (B2B Card 1 specialist) with context about gaps
  if (gaps.length > 0) {
    await prisma.agentTask.create({
      data: {
        title: `Enrichment CV — clarifica ${gaps.length} criterii pentru ${userId.slice(0, 8)}`,
        description: guidedPrompt,
        assignedTo: "EMA", // Evaluation Manager Agent — specialistul B2B Card 1
        assignedBy: "EMA",
        status: "ASSIGNED",
        priority: "HIGH",
        taskType: "PROCESS_EXECUTION",
        businessId: "biz_jobgrade",
        tags: [
          "cv-enrichment",
          `b2c-user:${userId}`,
          ...gaps.map((g) => `gap:${g.criterion}`),
        ],
      },
    }).catch((err: Error) => {
      console.error("[cv-enrichment] Failed to create CALAUZA task:", err.message)
    })
  }

  // 7. Log evolution entry
  await p.b2CEvolutionEntry.create({
    data: {
      userId,
      card: "CARD_3",
      type: "MILESTONE",
      title: "CV analizat pentru matching",
      description: `Analiza CV: ${analysis.overallCompleteness || 0}% complet. ${gaps.length} criterii necesita clarificari.`,
      phase: "CHRYSALIS",
      stage: 1,
      agentRole: "EMA",
      metadata: { enrichmentStatus, gapCount: gaps.length },
    },
  }).catch(() => {})
}
