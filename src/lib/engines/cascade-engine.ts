/**
 * cascade-engine.ts — Motor simulari cascada (AI-powered)
 *
 * Extras din /api/v1/simulations/cascade/route.ts pentru refolosire
 * din endpoint-ul unificat si din cel original.
 *
 * Foloseste Claude AI pentru analiza impact cascada pe 7 dimensiuni
 * organizationale, cu context real incarcat din DB.
 */

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

// ═══ TIPURI ═══

export const CASCADE_TYPES = [
  "CHANGE_PERSON",
  "VACANCY",
  "RESTRUCTURE_TEAM",
  "MODIFY_KPI",
  "CHANGE_SALARY_PACKAGE",
] as const

export type CascadeType = (typeof CASCADE_TYPES)[number]

export const cascadeSchema = z.object({
  type: z.enum(CASCADE_TYPES),
  params: z.record(z.string(), z.any()),
  mode: z.enum(["CLASIC", "TRANSFORMATIONAL"]).default("CLASIC"),
})

export interface CascadeImpact {
  area: string
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  affected: string[]
}

export interface CascadeResult {
  impacts: CascadeImpact[]
  summary: string
  recommendation: string
}

// ═══ MOTOR ═══

/**
 * Ruleaza o simulare cascada AI-powered.
 * Incarca contextul organizational complet si il trimite la Claude.
 */
export async function runCascadeSimulation(
  tenantId: string,
  data: { type: CascadeType; params: Record<string, any>; mode?: "CLASIC" | "TRANSFORMATIONAL" },
): Promise<CascadeResult & { mode: string }> {
  const mode = data.mode || "CLASIC"
  // Incarca structura organizationala curenta
  const [departments, jobs, employees, kpis, packages, company] = await Promise.all([
    prisma.department.findMany({
      where: { tenantId, isActive: true },
      include: { jobs: { select: { id: true, title: true, status: true } } },
    }),
    prisma.job.findMany({
      where: { tenantId, isActive: true },
      include: {
        department: { select: { name: true } },
      },
    }),
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
    prisma.kpiDefinition.findMany({
      where: { tenantId },
      select: { id: true, jobId: true, name: true, weight: true, targetValue: true },
    }),
    prisma.compensationPackage.findMany({
      where: { tenantId },
      select: { id: true, jobId: true, baseSalary: true, currency: true },
    }),
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

  // Construieste contextul organizational pentru Claude
  const orgContext = `## Structura organizationala curenta

### Departamente (${departments.length}):
${departments.map(d => `- ${d.name}: ${d.jobs.length} pozitii`).join("\n")}

### Pozitii active (${jobs.length}):
${jobs.map(j => `- ${j.title} (${j.department?.name ?? "fara dept"}) — status: ${j.status}`).join("\n")}

### Angajati (${employees.length} inregistrari):
${employees.map(e => `- ${e.employeeCode}: dept ${e.department ?? "—"}, salariu baza ${e.baseSalary}, variabil ${e.variableComp}`).join("\n")}

### KPI-uri definite (${kpis.length}):
${kpis.map(k => `- ${k.name} (job: ${k.jobId}, pondere: ${k.weight}%, target: ${k.targetValue})`).join("\n")}

### Pachete compensare (${packages.length}):
${packages.map(p => `- Job ${p.jobId}: baza ${p.baseSalary} ${p.currency}`).join("\n")}

### Profil companie:
- Industrie: ${company?.industry ?? "—"}
- Dimensiune: ${company?.size ?? "—"}
- Misiune: ${company?.mission ?? "—"}
- Valori: ${company?.values?.join(", ") ?? "—"}`

  const typeDescriptions: Record<string, string> = {
    CHANGE_PERSON: "Schimbarea unei persoane dintr-o pozitie — impact pe echipa, flux de lucru, cunostinte pierdute",
    VACANCY: "Vacanta in organigrama — impact pe distributia muncii, responsabilitati temporare, urgenta recrutare",
    RESTRUCTURE_TEAM: "Restructurare echipa — reorganizare departament, fuziune/scindare, impact pe relatii",
    MODIFY_KPI: "Modificare KPI-uri — impact cascada pe evaluari, compensatii, motivatie",
    CHANGE_SALARY_PACKAGE: "Modificare pachet salarial — impact pe echitate interna, retentie, buget",
  }

  const prompt = `Esti expert in analiza organizationala si simulari what-if. Analizeaza impactul cascada al unei schimbari.

${orgContext}

## Simulare ceruta: ${typeDescriptions[data.type]}
## Tip: ${data.type}
## Parametri: ${JSON.stringify(data.params, null, 2)}

Analizeaza impactul cascada pe TOATE aceste dimensiuni:
1. **Relatii ierarhice** (reports-to) — cine raporteaza cui, lantul de comanda
2. **Relatii de coordonare** (laterale) — colaborare inter-departamentala
3. **Relatii functionale** (input/output flow) — cine primeste/furnizeaza date
4. **Relatii de reprezentare** (substituiti) — cine preia temporar
5. **Noduri de proces afectate** — ce procese se opresc/incetinesc
6. **Impact bugetar** — costuri directe si indirecte
7. **Dinamica echipei** — moral, incarcatura, coeziune

Returneaza un JSON valid cu structura:
{
  "impacts": [
    {
      "area": "una din cele 7 dimensiuni",
      "description": "descriere impact concret",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "affected": ["entitati afectate"]
    }
  ],
  "summary": "rezumat executiv al impactului total",
  "recommendation": "recomandare de actiune"
}

Fii specific la entitati afectate. Severitatea reflecta impactul real pe operatiuni.
${mode === "TRANSFORMATIONAL" ? `
Daca modul este TRANSFORMATIONAL, analizeaza suplimentar:
- Impact pe cultura organizationala
- Oportunitati de transformare structurala
- Sens (sense-making) — ce inseamna aceasta schimbare pentru identitatea organizatiei
` : ""}`

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  })

  const aiText = response.content[0].type === "text" ? response.content[0].text : ""

  // Extrage JSON din raspunsul Claude
  let result: CascadeResult = {
    impacts: [],
    summary: "Analiza nu a putut fi procesata.",
    recommendation: "Reincercati cu parametri mai specifici.",
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
    // Parsare esuata — returneaza structura default
  }

  return { ...result, mode }
}
