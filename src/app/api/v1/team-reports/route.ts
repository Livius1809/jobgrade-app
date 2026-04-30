/**
 * /api/v1/team-reports
 *
 * Rapoarte echipa C3 (Competitivitate): generare AI de rapoarte diferentiate
 * pe 3 tipuri (MANAGER, HR, SUPERIOR) cu date din sociograma si psihometrie.
 *
 * POST — Genereaza raport echipa cu Claude AI
 * GET  — Lista rapoarte generate per tenant
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema validare input
const TeamReportInputSchema = z.object({
  departmentId: z.string().min(1, "departmentId este obligatoriu"),
  reportType: z.enum(["MANAGER", "HR", "SUPERIOR"]),
})

// Tipuri pentru structura raportului
interface TeamReport {
  departmentId: string
  departmentName: string
  reportType: "MANAGER" | "HR" | "SUPERIOR"
  generatedAt: string
  generatedBy: string
  content: Record<string, unknown>
}

// Cheie SystemConfig pentru rapoarte echipa
function teamReportKey(tenantId: string, departmentId: string, reportType: string): string {
  return `TEAM_REPORT_${tenantId}_${departmentId}_${reportType}`
}

// Construieste promptul specific per tip de raport
function buildReportPrompt(reportType: "MANAGER" | "HR" | "SUPERIOR"): string {
  switch (reportType) {
    case "MANAGER":
      return `Genereaza un raport de echipa pentru MANAGER cu urmatoarele sectiuni:
{
  "competencyMap": {
    "description": "Harta competentelor echipei",
    "competencies": [
      { "name": "Competenta", "currentLevel": 1-5, "targetLevel": 1-5, "gap": number, "members": ["Membru"] }
    ]
  },
  "teamRealVsIdeal": {
    "description": "Comparatie echipa reala vs echipa ideala",
    "currentProfile": { "strengths": ["Punct forte"], "weaknesses": ["Punct slab"] },
    "idealProfile": { "requiredCompetencies": ["Competenta necesara"] },
    "alignmentScore": 0-100,
    "recommendations": ["Recomandare"]
  },
  "styleVsTeam": {
    "description": "Stilul tau de management vs nevoile echipei",
    "managerStyle": "Descriere stil predominant",
    "teamNeeds": ["Nevoie echipa"],
    "alignment": "Descriere aliniere",
    "adjustments": ["Ajustare recomandata"]
  },
  "actionPlan": ["Actiune concreta 1", "Actiune 2"]
}`

    case "HR":
      return `Genereaza un raport de echipa pentru HR cu urmatoarele sectiuni:
{
  "trainingNeeds": {
    "description": "Nevoi de instruire identificate",
    "priorities": [
      { "area": "Domeniu", "urgency": "CRITICAL|HIGH|MEDIUM|LOW", "affectedMembers": number, "recommendedTraining": "Program" }
    ]
  },
  "restructuringAnalysis": {
    "description": "Analiza potentiala de restructurare",
    "currentStructure": "Descriere structura curenta",
    "recommendations": ["Recomandare"],
    "risks": ["Risc identificat"]
  },
  "internalBenchmark": {
    "description": "Benchmark intern — performanta departament vs organizatie",
    "metrics": [
      { "metric": "Indicator", "departmentValue": "Valoare dept", "orgAverage": "Media org", "status": "ABOVE|AT|BELOW" }
    ]
  },
  "plan30_60_90": {
    "description": "Plan de actiune 30/60/90 zile",
    "days30": ["Actiune imediata"],
    "days60": ["Actiune termen mediu"],
    "days90": ["Actiune termen lung"]
  }
}`

    case "SUPERIOR":
      return `Genereaza un raport de echipa pentru SUPERIORUL IERARHIC cu urmatoarele sectiuni:
{
  "manifestationFramework": {
    "description": "Cadru de manifestare echipa — cum se exprima performanta",
    "positiveIndicators": ["Indicator pozitiv"],
    "warningSignals": ["Semnal de avertizare"],
    "criticalSignals": ["Semnal critic"]
  },
  "supportNeeds": {
    "description": "Nevoi de suport din partea conducerii",
    "resources": ["Resursa necesara"],
    "decisions": ["Decizie asteptata de la conducere"],
    "blockers": ["Blocaj care necesita interventie"]
  },
  "coachingOpportunities": {
    "description": "Oportunitati de coaching si mentorat",
    "highPotential": ["Membru cu potential ridicat + domeniu"],
    "interventionNeeded": ["Membru + tipul de interventie necesara"]
  },
  "monitoringSignals": {
    "description": "Semnale de monitorizare — ce sa urmariti",
    "leadIndicators": ["Indicator devreme"],
    "lagIndicators": ["Indicator intarziat"],
    "escalationTriggers": ["Cand trebuie escaladat"]
  }
}`
  }
}

// POST — Genereaza raport echipa cu AI
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user

    const body = await req.json()
    const parsed = TeamReportInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { departmentId, reportType } = parsed.data

    // Verificam departamentul
    const department = await prisma.department.findFirst({
      where: { id: departmentId, tenantId },
      include: {
        jobs: {
          select: { id: true, title: true, description: true, status: true },
        },
      },
    })
    if (!department) {
      return NextResponse.json({ error: "Departamentul nu a fost gasit" }, { status: 404 })
    }

    // Incarcam date sociograma (daca exista) din SystemConfig
    const sociogramKey = `SOCIOGRAM_${tenantId}_${departmentId}`
    const sociogramConfig = await prisma.systemConfig.findUnique({ where: { key: sociogramKey } })
    const sociogramData = sociogramConfig ? JSON.parse(sociogramConfig.value) : null

    // Incarcam date psihometrice (daca exista) din SystemConfig
    const psychoKey = `PSYCHOMETRIC_${tenantId}_${departmentId}`
    const psychoConfig = await prisma.systemConfig.findUnique({ where: { key: psychoKey } })
    const psychometricData = psychoConfig ? JSON.parse(psychoConfig.value) : null

    // Incarcam profilul companiei
    const company = await prisma.companyProfile.findUnique({ where: { tenantId } })

    // Construim contextul
    const jobsContext = ((department as any).jobs ?? [])
      .map((j: any) => `- ${j.title}${j.status ? ` (Status: ${j.status})` : ""}${j.description ? ": " + j.description.slice(0, 100) : ""}`)
      .join("\n")

    // Prompt pentru Claude
    const systemPrompt = `Esti un expert in dezvoltare organizationala, psihologia muncii si managementul echipelor.
Genereaza rapoarte de echipa bazate pe date reale (sociograma, psihometrie, structura organizationala).

IMPORTANT: Raspunde STRICT in formatul JSON specificat, fara text suplimentar in afara structurii JSON.
Adapteaza limbajul si profunzimea la audienta: ${
      reportType === "MANAGER" ? "manager direct — limbaj practic, orientat pe actiune" :
      reportType === "HR" ? "director HR — limbaj specialist, benchmark-uri, planificare" :
      "superior ierarhic — limbaj strategic, semnale de monitorizare, coaching"
    }.`

    const reportPromptStructure = buildReportPrompt(reportType)

    const userPrompt = `Genereaza raportul de tip ${reportType} pentru departamentul "${department.name}".

COMPANIE: ${(company as any)?.name || "Nespecificata"} — ${company?.industry || "Domeniu nespecificat"}

POSTURI IN DEPARTAMENT:
${jobsContext || "Nu exista posturi definite."}

${sociogramData ? `DATE SOCIOGRAMA:\n${JSON.stringify(sociogramData, null, 2)}` : "SOCIOGRAMA: Nu exista date de sociograma disponibile. Genereaza estimari bazate pe structura organizationala."}

${psychometricData ? `DATE PSIHOMETRICE:\n${JSON.stringify(psychometricData, null, 2)}` : "PSIHOMETRIE: Nu exista date psihometrice disponibile. Genereaza estimari bazate pe tipologia posturilor."}

${reportPromptStructure}

Raspunde STRICT in formatul JSON de mai sus.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 6000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    })

    // Extragem textul din raspunsul Claude
    const textBlock = response.content.find((b) => b.type === "text")
    const rawText = textBlock?.text ?? "{}"

    // Parsam raspunsul JSON
    let reportContent: Record<string, unknown>
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      reportContent = JSON.parse(jsonMatch?.[0] ?? "{}")
    } catch {
      return NextResponse.json(
        { error: "Eroare la parsarea raspunsului AI. Incercati din nou." },
        { status: 502 },
      )
    }

    // Construim raportul complet
    const teamReport: TeamReport = {
      departmentId,
      departmentName: department.name,
      reportType,
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.id,
      content: reportContent,
    }

    // Salvam in SystemConfig
    const key = teamReportKey(tenantId, departmentId, reportType)
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: JSON.stringify(teamReport) },
      create: { key, value: JSON.stringify(teamReport) },
    })

    return NextResponse.json({
      ok: true,
      key,
      report: teamReport,
      dataSources: {
        sociogram: !!sociogramData,
        psychometric: !!psychometricData,
        jobs: ((department as any).jobs ?? []).length,
      },
    })
  } catch (error) {
    console.error("[TEAM-REPORTS POST]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}

// GET — Lista rapoarte generate per tenant
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user
    const url = new URL(req.url)
    const departmentId = url.searchParams.get("departmentId")
    const reportType = url.searchParams.get("reportType")

    // Prefix pentru cautare
    const prefix = `TEAM_REPORT_${tenantId}_`

    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: prefix } },
      orderBy: { updatedAt: "desc" },
    })

    let reports: Array<TeamReport & { key: string }> = configs
      .map(c => {
        try {
          return { ...JSON.parse(c.value) as TeamReport, key: c.key }
        } catch {
          return null
        }
      })
      .filter(Boolean) as Array<TeamReport & { key: string }>

    // Filtrare optionala
    if (departmentId) {
      reports = reports.filter(r => r.departmentId === departmentId)
    }
    if (reportType) {
      reports = reports.filter(r => r.reportType === reportType)
    }

    // Grupare pe departament
    const byDepartment: Record<string, Array<TeamReport & { key: string }>> = {}
    for (const report of reports) {
      const deptKey = report.departmentName || report.departmentId
      if (!byDepartment[deptKey]) byDepartment[deptKey] = []
      byDepartment[deptKey].push(report)
    }

    return NextResponse.json({
      reports,
      byDepartment,
      stats: {
        total: reports.length,
        byType: {
          MANAGER: reports.filter(r => r.reportType === "MANAGER").length,
          HR: reports.filter(r => r.reportType === "HR").length,
          SUPERIOR: reports.filter(r => r.reportType === "SUPERIOR").length,
        },
        departments: Object.keys(byDepartment).length,
      },
    })
  } catch (error) {
    console.error("[TEAM-REPORTS GET]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}
