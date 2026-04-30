/**
 * /api/v1/processes/quality-manual
 *
 * Manual calitate C3 (Competitivitate): generare AI a manualului de calitate
 * pe baza hartii de procese existente. Include SOP, KPI si matrice RACI.
 *
 * POST — Genereaza manualul de calitate cu Claude AI
 * GET  — Recupereaza manualul de calitate existent per tenant
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema validare input
const QualityManualInputSchema = z.object({
  processMapKey: z.string().min(1, "processMapKey este obligatoriu"),
})

// Tipuri pentru structura manualului de calitate
interface SOPStep {
  order: number
  action: string
  responsible: string
  inputs: string[]
  outputs: string[]
  exceptions: string[]
  escalation: string
}

interface KPIDefinition {
  name: string
  description: string
  target: string
  frequency: string
  responsible: string
  measurementMethod: string
}

interface RACIEntry {
  step: string
  responsible: string
  accountable: string
  consulted: string[]
  informed: string[]
}

interface ProcessQualitySection {
  processId: string
  processName: string
  sop: {
    purpose: string
    scope: string
    steps: SOPStep[]
  }
  kpis: KPIDefinition[]
  raci: RACIEntry[]
}

interface QualityManual {
  title: string
  version: string
  generatedAt: string
  processMapKey: string
  sections: ProcessQualitySection[]
  generalPolicies: string[]
}

// POST — Genereaza manualul de calitate cu AI
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user

    const body = await req.json()
    const parsed = QualityManualInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { processMapKey } = parsed.data

    // Incarcam harta de procese existenta
    const processMapConfig = await prisma.systemConfig.findUnique({
      where: { key: processMapKey },
    })

    if (!processMapConfig) {
      return NextResponse.json(
        { error: "Harta de procese nu a fost gasita. Generati intai harta de procese." },
        { status: 404 },
      )
    }

    // Verificare securitate: cheia apartine tenant-ului curent
    if (!processMapKey.includes(tenantId)) {
      return NextResponse.json({ error: "Acces interzis la aceasta harta de procese" }, { status: 403 })
    }

    const processMap = JSON.parse(processMapConfig.value)

    // Incarcam datele despre joburi pentru context suplimentar
    const jobs = await prisma.job.findMany({
      where: { tenantId },
      select: { title: true, description: true, department: { select: { name: true } } },
    })

    const jobsContext = jobs
      .map(j => `${j.title} (${j.department?.name || "fara departament"})`)
      .join(", ")

    // Prompt pentru Claude — generare manual calitate
    const systemPrompt = `Esti un expert in managementul calitatii (ISO 9001:2015, ISO 14001).
Genereaza un manual de calitate complet pentru o organizatie romaneasca,
bazat pe harta de procese furnizata.

IMPORTANT: Raspunde STRICT in formatul JSON specificat, fara text suplimentar.

Pentru fiecare proces din harta, genereaza:
1. SOP (Standard Operating Procedure): pasi detaliati, responsabili, inputuri, outputuri, exceptii, escaladare
2. KPI: ce se masoara, target, frecventa, responsabil, metoda de masurare
3. RACI: Responsible, Accountable, Consulted, Informed per pas`

    const userPrompt = `Genereaza manualul de calitate bazat pe aceasta harta de procese:

HARTA PROCESE:
${JSON.stringify(processMap.nodes, null, 2)}

LEGATURI INTRE PROCESE:
${JSON.stringify(processMap.links, null, 2)}

POSTURI EXISTENTE IN ORGANIZATIE:
${jobsContext}

Raspunde STRICT in acest format JSON:
{
  "title": "Manual de Calitate",
  "version": "1.0",
  "generalPolicies": ["Politica 1", "Politica 2"],
  "sections": [
    {
      "processId": "proc_1",
      "processName": "Numele procesului",
      "sop": {
        "purpose": "Scopul procedurii",
        "scope": "Domeniul de aplicare",
        "steps": [
          {
            "order": 1,
            "action": "Actiunea",
            "responsible": "Responsabilul",
            "inputs": ["input1"],
            "outputs": ["output1"],
            "exceptions": ["exceptie1"],
            "escalation": "Catre cine se escaleaza"
          }
        ]
      },
      "kpis": [
        {
          "name": "Numele KPI",
          "description": "Ce masoara",
          "target": "Tinta (ex: >95%)",
          "frequency": "Lunar/Trimestrial",
          "responsible": "Cine masoara",
          "measurementMethod": "Cum se masoara"
        }
      ],
      "raci": [
        {
          "step": "Pasul din SOP",
          "responsible": "Cine face",
          "accountable": "Cine raspunde",
          "consulted": ["Cine e consultat"],
          "informed": ["Cine e informat"]
        }
      ]
    }
  ]
}`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    })

    // Extragem textul din raspunsul Claude
    const textBlock = response.content.find((b) => b.type === "text")
    const rawText = textBlock?.text ?? "{}"

    // Parsam raspunsul JSON
    let manualData: Partial<QualityManual>
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      manualData = JSON.parse(jsonMatch?.[0] ?? "{}")
    } catch {
      return NextResponse.json(
        { error: "Eroare la parsarea raspunsului AI. Incercati din nou." },
        { status: 502 },
      )
    }

    // Construim structura completa
    const qualityManual: QualityManual = {
      title: manualData.title || "Manual de Calitate",
      version: manualData.version || "1.0",
      generatedAt: new Date().toISOString(),
      processMapKey,
      sections: Array.isArray(manualData.sections) ? manualData.sections : [],
      generalPolicies: Array.isArray(manualData.generalPolicies) ? manualData.generalPolicies : [],
    }

    // Salvam in SystemConfig
    const key = `QUALITY_MANUAL_${tenantId}`
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: JSON.stringify(qualityManual) },
      create: { key, value: JSON.stringify(qualityManual) },
    })

    return NextResponse.json({
      ok: true,
      key,
      qualityManual,
      stats: {
        totalSections: qualityManual.sections.length,
        totalSOPSteps: qualityManual.sections.reduce((sum, s) => sum + (s.sop?.steps?.length || 0), 0),
        totalKPIs: qualityManual.sections.reduce((sum, s) => sum + (s.kpis?.length || 0), 0),
        totalRACIEntries: qualityManual.sections.reduce((sum, s) => sum + (s.raci?.length || 0), 0),
      },
    })
  } catch (error) {
    console.error("[QUALITY-MANUAL POST]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}

// GET — Recupereaza manualul de calitate existent
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const key = `QUALITY_MANUAL_${session.user.tenantId}`
    const config = await prisma.systemConfig.findUnique({ where: { key } })

    if (!config) {
      return NextResponse.json({ error: "Manualul de calitate nu a fost generat inca." }, { status: 404 })
    }

    let qualityManual: QualityManual
    try {
      qualityManual = JSON.parse(config.value)
    } catch {
      return NextResponse.json({ error: "Eroare la citirea manualului de calitate." }, { status: 500 })
    }

    return NextResponse.json({
      qualityManual,
      stats: {
        totalSections: qualityManual.sections.length,
        totalSOPSteps: qualityManual.sections.reduce((sum, s) => sum + (s.sop?.steps?.length || 0), 0),
        totalKPIs: qualityManual.sections.reduce((sum, s) => sum + (s.kpis?.length || 0), 0),
        totalRACIEntries: qualityManual.sections.reduce((sum, s) => sum + (s.raci?.length || 0), 0),
      },
    })
  } catch (error) {
    console.error("[QUALITY-MANUAL GET]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}
