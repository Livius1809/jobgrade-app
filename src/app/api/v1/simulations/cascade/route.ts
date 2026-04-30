/**
 * /api/v1/simulations/cascade
 *
 * C3 F8 — Simulări cascadă (What-If)
 * POST — Simulare impact cascadă pe relații, procese, buget, dinamică echipă
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

export const dynamic = "force-dynamic"

// Tipuri de simulare cascadă
const simulationTypes = [
  "CHANGE_PERSON",
  "VACANCY",
  "RESTRUCTURE_TEAM",
  "MODIFY_KPI",
  "CHANGE_SALARY_PACKAGE",
] as const

const cascadeSchema = z.object({
  type: z.enum(simulationTypes),
  params: z.record(z.string(), z.any()),
})

// Tipuri interne
interface CascadeImpact {
  area: string
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  affected: string[]
}

interface CascadeResult {
  impacts: CascadeImpact[]
  summary: string
  recommendation: string
}

/**
 * POST — Simulare what-if cu impact cascadă
 * Analizează impactul pe relații ierarhice, de coordonare, funcționale,
 * de reprezentare, noduri de proces, buget și dinamică echipă
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = cascadeSchema.parse(body)

    // Încarcă structura organizațională curentă
    const [departments, jobs, employees, kpis, packages, company] = await Promise.all([
      // Departamente cu ierarhie
      prisma.department.findMany({
        where: { tenantId, isActive: true },
        include: { jobs: { select: { id: true, title: true, status: true } } },
      }),
      // Toate joburile
      prisma.job.findMany({
        where: { tenantId, isActive: true },
        include: {
          department: { select: { name: true } },
        },
      }),
      // Angajați (din salary records pentru date anonimizate)
      prisma.employeeSalaryRecord.findMany({
        where: { tenantId },
        select: {
          id: true,
          employeeCode: true,
          department: true,
          jobCategory: true,
          baseSalary: true,
          variableComp: true,
          gender: true,
        },
      }),
      // KPI-uri definite
      prisma.kpiDefinition.findMany({
        where: { tenantId },
        select: { id: true, jobId: true, name: true, weight: true, targetValue: true },
      }),
      // Pachete compensare
      prisma.compensationPackage.findMany({
        where: { tenantId },
        select: { id: true, jobId: true, baseSalary: true, currency: true },
      }),
      // Profilul companiei
      prisma.companyProfile.findFirst({
        where: { tenantId },
        select: {
          mission: true,
          vision: true,
          values: true,
          industry: true,
          size: true,
        },
      }),
    ])

    // Construiește contextul organizațional pentru Claude
    const orgContext = `## Structura organizațională curentă

### Departamente (${departments.length}):
${departments.map(d => `- ${d.name}: ${d.jobs.length} poziții`).join("\n")}

### Poziții active (${jobs.length}):
${jobs.map(j => `- ${j.title} (${j.department?.name ?? "fără dept"}) — status: ${j.status}`).join("\n")}

### Angajați (${employees.length} înregistrări):
${employees.map(e => `- ${e.employeeCode}: dept ${e.department ?? "—"}, salariu bază ${e.baseSalary}, variabil ${e.variableComp}`).join("\n")}

### KPI-uri definite (${kpis.length}):
${kpis.map(k => `- ${k.name} (job: ${k.jobId}, pondere: ${k.weight}%, target: ${k.targetValue})`).join("\n")}

### Pachete compensare (${packages.length}):
${packages.map(p => `- Job ${p.jobId}: bază ${p.baseSalary} ${p.currency}`).join("\n")}

### Profil companie:
- Industrie: ${company?.industry ?? "—"}
- Dimensiune: ${company?.size ?? "—"}
- Misiune: ${company?.mission ?? "—"}
- Valori: ${company?.values?.join(", ") ?? "—"}`

    // Descriere specifică tipului de simulare
    const typeDescriptions: Record<string, string> = {
      CHANGE_PERSON: "Schimbarea unei persoane dintr-o poziție — impact pe echipă, flux de lucru, cunoștințe pierdute",
      VACANCY: "Vacanță în organigramă — impact pe distribuția muncii, responsabilități temporare, urgență recrutare",
      RESTRUCTURE_TEAM: "Restructurare echipă — reorganizare departament, fuziune/scindare, impact pe relații",
      MODIFY_KPI: "Modificare KPI-uri — impact cascadă pe evaluări, compensații, motivație",
      CHANGE_SALARY_PACKAGE: "Modificare pachet salarial — impact pe echitate internă, retenție, buget",
    }

    const prompt = `Ești expert în analiză organizațională și simulări what-if. Analizează impactul cascadă al unei schimbări.

${orgContext}

## Simulare cerută: ${typeDescriptions[data.type]}
## Tip: ${data.type}
## Parametri: ${JSON.stringify(data.params, null, 2)}

Analizează impactul cascadă pe TOATE aceste dimensiuni:
1. **Relații ierarhice** (reports-to) — cine raportează cui, lanțul de comandă
2. **Relații de coordonare** (laterale) — colaborare inter-departamentală
3. **Relații funcționale** (input/output flow) — cine primește/furnizează date
4. **Relații de reprezentare** (substituți) — cine preia temporar
5. **Noduri de proces afectate** — ce procese se opresc/încetinesc
6. **Impact bugetar** — costuri directe și indirecte
7. **Dinamica echipei** — moral, încărcătură, coeziune

Returnează un JSON valid cu structura:
{
  "impacts": [
    {
      "area": "una din cele 7 dimensiuni",
      "description": "descriere impact concret",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "affected": ["entități afectate"]
    }
  ],
  "summary": "rezumat executiv al impactului total",
  "recommendation": "recomandare de acțiune"
}

Fii specific la entități afectate. Severitatea reflectă impactul real pe operațiuni.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    })

    const aiText = response.content[0].type === "text" ? response.content[0].text : ""

    // Extrage JSON din răspunsul Claude
    let result: CascadeResult = {
      impacts: [],
      summary: "Analiza nu a putut fi procesată.",
      recommendation: "Reîncercați cu parametri mai specifici.",
    }

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        result = {
          impacts: parsed.impacts ?? [],
          summary: parsed.summary ?? "",
          recommendation: parsed.recommendation ?? "",
        }
      }
    } catch {
      // Parsare eșuată — returnează structura default
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[SIMULATIONS CASCADE POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
