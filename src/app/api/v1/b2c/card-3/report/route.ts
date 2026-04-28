/**
 * POST /api/v1/b2c/card-3/report
 *
 * Generează raport plătit pentru Card 3 B2C.
 * Flow: verifică credite → debitează → generează cu Claude → returnează.
 *
 * Body: {
 *   userId: string,
 *   reportType: "compatibility-detail" | "interview-prep" | "job-selection-guide" | "career-trends",
 *   jobId?: string (necesar pentru compatibility + interview)
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const REPORT_COSTS: Record<string, number> = {
  "compatibility-detail": 5,
  "interview-prep": 8,
  "job-selection-guide": 10,
  "career-trends": 8,
}

const REPORT_PROMPTS: Record<string, string> = {
  "compatibility-detail": `Genereaza un raport DETALIAT de compatibilitate candidat-post.
Pentru fiecare din cele 6 criterii:
- Analiza aprofundata a nivelului candidatului vs cerinta postului
- Plan CONCRET de dezvoltare (ce sa faca, cum, in cat timp)
- Resurse recomandate
La final: plan de actiune prioritizat (primii 30-60-90 zile).
Ton: profesional dar cald, in romana. Fara superlative. Fara jargon tehnic.`,

  "interview-prep": `Genereaza un ghid de pregatire interviu PERSONALIZAT pe acest post.
Include:
- 5-7 intrebari probabile (specifice postului, nu generice)
- Pentru fiecare: directie de raspuns bazata pe profilul candidatului
- Puncte forte de evidentiat (din datele reale)
- Puncte slabe de gestionat (cum sa le prezinte pozitiv)
- Cum sa se prezinte in primele 3 minute
- Ce intrebari sa puna candidatul
Ton: coach sportiv inainte de meci — incurajare bazata pe fapte.`,

  "job-selection-guide": `Genereaza un ghid personalizat de selectie posturi.
Include:
- Criteriile care conteaza cel mai mult pentru ACEST candidat (din profil)
- De ce (bazat pe Hermann, personalitate, valori detectate)
- Green flags si red flags la evaluarea unei oferte
- Benchmark salarial orientativ pentru profilul lui
- 3-5 directii de cariera recomandate cu fit score
Ton: mentor cu experienta, nu algoritm.`,

  "career-trends": `Genereaza o proiectie a tendintelor de cariera relevante pentru acest candidat.
Include:
- Tendintele din domeniul/industria candidatului (din experienta lui)
- Ce competente vor conta in urmatorii 2-5 ani
- Cum se pozitioneaza candidatul fata de aceste tendinte
- Ce sa invete/dezvolte ca sa ramana relevant
- Oportunitati emergente pe care le poate prinde
- Riscuri de evitat (competente care devin irelevante)
Ton: analist cu empatie — realist dar constructiv. Fara speculatii, bazat pe tendinte observabile.`,
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, reportType, jobId } = body

  if (!userId || !reportType) {
    return NextResponse.json({ error: "userId si reportType obligatorii" }, { status: 400 })
  }

  if (!REPORT_COSTS[reportType]) {
    return NextResponse.json({ error: `Tip raport necunoscut: ${reportType}` }, { status: 400 })
  }

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const p = prisma as any
  const cost = REPORT_COSTS[reportType]

  // 1. Verifică credite
  const balance = await p.b2CCreditBalance.findUnique({ where: { userId } })
  const currentBalance = balance?.balance || 0

  if (currentBalance < cost) {
    return NextResponse.json({
      error: "Credite insuficiente",
      balance: currentBalance,
      needed: cost,
    }, { status: 402 })
  }

  // 2. Colectează datele clientului
  const [user, card3, profile] = await Promise.all([
    p.b2CUser.findUnique({ where: { id: userId }, select: { alias: true, age: true, gender: true, lastJobTitle: true } }),
    p.b2CCardProgress.findFirst({ where: { userId, card: "CARD_3" }, select: { cvExtractedData: true, questionnaireData: true } }),
    p.b2CProfile.findUnique({ where: { userId }, select: { herrmannA: true, herrmannB: true, herrmannC: true, herrmannD: true, externalTests: true } }),
  ])

  const cvData = card3?.cvExtractedData || {}
  const questionnaireData = card3?.questionnaireData || {}
  const hermannData = profile ? `Hermann: A=${profile.herrmannA || "?"} B=${profile.herrmannB || "?"} C=${profile.herrmannC || "?"} D=${profile.herrmannD || "?"}` : ""
  const mbtiData = (profile?.externalTests as any)?.mbti ? `MBTI: ${(profile.externalTests as any).mbti.type}` : ""

  // 3. Colectează date specifice raportului
  let jobContext = ""
  let matchContext = ""

  if (jobId && (reportType === "compatibility-detail" || reportType === "interview-prep")) {
    const job = await p.job.findUnique({
      where: { id: jobId },
      select: { title: true, purpose: true, description: true, responsibilities: true, requirements: true, department: { select: { name: true } }, tenant: { select: { name: true } } },
    })
    if (job) {
      jobContext = `Post: ${job.title} la ${job.tenant?.name || "?"} (${job.department?.name || ""})
Scop: ${job.purpose || ""}
Responsabilitati: ${job.responsibilities || ""}
Cerinte: ${job.requirements || ""}`
    }
  }

  // 4. Construiește prompt
  const candidateContext = [
    `Candidat: ${user?.alias || "anonim"}, ${user?.age || "?"} ani`,
    `Ultimul job: ${user?.lastJobTitle || cvData.title || "nespecificat"}`,
    `Experienta: ${cvData.experience || "nespecificata"}`,
    `Educatie: ${cvData.education || "nespecificata"}`,
    `Competente: ${cvData.requirements || "nespecificate"}`,
    `Criterii estimate: ${JSON.stringify(cvData.criteriaEstimate || {})}`,
    hermannData,
    mbtiData,
    `Preferinte: ${JSON.stringify(questionnaireData)}`,
  ].filter(Boolean).join("\n")

  const systemPrompt = `Esti un consultant de cariera senior cu 20 ani experienta pe piata din Romania.
Generezi rapoarte personalizate bazate pe date REALE ale candidatului (nu inventezi).
Scrii in romana, ton profesional dar cald, fara superlative americane.
Daca nu ai date suficiente pe un aspect, spui sincer "date insuficiente" nu inventezi.

${REPORT_PROMPTS[reportType]}`

  const userMessage = [
    "DATELE CANDIDATULUI:",
    candidateContext,
    jobContext ? `\nDATELE POSTULUI:\n${jobContext}` : "",
    matchContext ? `\nREZULTAT MATCHING:\n${matchContext}` : "",
    "\nGenereaza raportul complet.",
  ].filter(Boolean).join("\n")

  // 5. Generează raportul
  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })

  const reportContent = response.content[0].type === "text" ? response.content[0].text : ""

  if (!reportContent || reportContent.length < 100) {
    return NextResponse.json({ error: "Raportul nu a putut fi generat" }, { status: 500 })
  }

  // 6. Debitează credite (DUPĂ generare reușită)
  await p.b2CCreditBalance.update({
    where: { userId },
    data: { balance: { decrement: cost } },
  })

  await p.b2CCreditTransaction.create({
    data: {
      userId,
      type: "SERVICE",
      amount: -cost,
      description: `Raport: ${reportType}${jobId ? ` (post: ${jobId.slice(0, 8)})` : ""}`,
      card: "CARD_3",
      sourceId: reportType,
    },
  })

  // 7. Salvează raportul în B2CSession pentru re-vizualizare
  await p.b2CSession.create({
    data: {
      userId,
      card: "CARD_3",
      agentRole: "CAREER_COUNSELOR",
      status: "COMPLETED",
      contextSnapshot: { reportType, jobId, cost },
      result: reportContent,
    },
  }).catch(() => {})

  // Raport B2C = cunoaștere despre profiluri candidați și matching
  try {
    const { learnFromReport } = await import("@/lib/learning-hooks")
    await learnFromReport(`B2C_${reportType.toUpperCase().replace(/-/g, "_")}`, userId, `Raport ${reportType}: ${user?.alias || "anonim"}, ${reportContent.slice(0, 400)}`)
  } catch {}

  return NextResponse.json({
    ok: true,
    reportType,
    content: reportContent,
    creditsCost: cost,
    newBalance: currentBalance - cost,
  })
}
