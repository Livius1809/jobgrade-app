/**
 * /api/v1/culture/3c-report
 *
 * C4 F3 — Raport 3C: Consecvență · Coerență · Congruență
 * POST — Compară F3D (declarat: MVV) cu F3A (actual: climat + metrici HR)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

// Tipuri interne
interface DimensionGap {
  dimension: string
  declared: string
  actual: string
  gap: number       // 0-100 (0=aliniat, 100=total dezaliniat)
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

interface Indicators3C {
  consecventa: number  // 0-100: faci ce zici?
  coerenta: number     // 0-100: zici lucruri compatibile între ele?
  congruenta: number   // 0-100: ce zici corespunde cu ce ești?
}

interface Report3CResult {
  f3d: { dimensions: Record<string, string> }
  f3a: { dimensions: Record<string, string> }
  gaps: DimensionGap[]
  overallCoherence: number
  indicators3C: Indicators3C
  createdAt: string
}

/**
 * POST — Analiză Consecvență · Coerență · Congruență
 * Utilizează toate datele acumulate (MVV, climat, HR, audit cultural)
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // F3D = Declarat (MVV, obiective declarate)
    const company = await prisma.companyProfile.findFirst({
      where: { tenantId },
    })

    // F3A = Actual (climat, metrici HR, audit cultural)
    const [climateState, culturalAudit, employees] = await Promise.all([
      getTenantData<Record<string, unknown>>(tenantId, "CLIMATE_CO"),
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_AUDIT"),
      prisma.employeeSalaryRecord.findMany({
        where: { tenantId },
        select: {
          baseSalary: true,
          variableComp: true,
          department: true,
          gender: true,
        },
      }),
    ])

    // Construiește F3D (declarații)
    const f3dContext = `## F3D — CE DECLARĂ ORGANIZAȚIA

### Misiune declarată:
${company?.mission ?? "Nedeclarată (IMPLICIT)"}

### Viziune declarată:
${company?.vision ?? "Nedeclarată (IMPLICIT)"}

### Valori declarate:
${company?.values?.length ? company.values.join(", ") : "Nedeclarate (IMPLICIT)"}

### Misiune draft (generată AI):
${company?.missionDraft ?? "—"}

### Viziune draft (generată AI):
${company?.visionDraft ?? "—"}

### Valori draft:
${company?.valuesDraft?.length ? company.valuesDraft.join(", ") : "—"}

### Maturitate MVV: ${company?.mvvMaturity ?? "IMPLICIT"}
### Scor coerență MVV: ${company?.mvvCoherenceScore ?? "necalculat"}
### Gaps coerență MVV: ${company?.mvvCoherenceGaps ? JSON.stringify(company.mvvCoherenceGaps) : "—"}`

    // Construiește F3A (realitate măsurată)
    const totalEmployees = employees.length
    const avgSalary = totalEmployees > 0
      ? Math.round(employees.reduce((sum, e) => sum + e.baseSalary, 0) / totalEmployees)
      : 0
    const salarySpread = totalEmployees > 0
      ? Math.round(Math.max(...employees.map(e => e.baseSalary)) - Math.min(...employees.map(e => e.baseSalary)))
      : 0

    const f3aContext = `## F3A — CE SE ÎNTÂMPLĂ ÎN REALITATE

### Metrici HR:
- Total angajați (salary records): ${totalEmployees}
- Salariu mediu: ${avgSalary} RON
- Ecart salarial (max-min): ${salarySpread} RON
- Distribuție gen: ${JSON.stringify(employees.reduce((acc, e) => { acc[e.gender] = (acc[e.gender] || 0) + 1; return acc }, {} as Record<string, number>))}

### Climat organizațional:
${climateState ? JSON.stringify(climateState).slice(0, 1500) : "Chestionar climat necompletat."}

### Audit cultural (dacă există):
${culturalAudit ? JSON.stringify(culturalAudit).slice(0, 1500) : "Audit cultural neefectuat încă."}`

    const prompt = `Ești expert în consultanță organizațională. Realizează analiza 3C (Consecvență · Coerență · Congruență) comparând CE DECLARĂ organizația (F3D) cu CE FACE ÎN REALITATE (F3A).

${f3dContext}

${f3aContext}

## Definiții 3C:
- **Consecvență**: Organizația face CE zice? (acțiuni = declarații)
- **Coerență**: Declarațiile sunt compatibile între ele? (misiune ↔ viziune ↔ valori ↔ obiective)
- **Congruență**: Ce zice organizația corespunde cu CE ESTE ea? (identitate autentică vs. declarativă)

Analizează pe dimensiuni relevante (leadership, HR, comunicare, dezvoltare, etc.).

Returnează un JSON valid cu structura:
{
  "f3d": {
    "dimensions": {
      "leadership": "ce declară despre leadership",
      "hr_practices": "ce declară despre practicile HR",
      "comunicare": "ce declară despre comunicare",
      "dezvoltare": "ce declară despre dezvoltare",
      "performanta": "ce declară despre performanță"
    }
  },
  "f3a": {
    "dimensions": {
      "leadership": "ce se observă în practică",
      "hr_practices": "ce se observă în practică",
      "comunicare": "ce se observă în practică",
      "dezvoltare": "ce se observă în practică",
      "performanta": "ce se observă în practică"
    }
  },
  "gaps": [
    {
      "dimension": "numele dimensiunii",
      "declared": "ce e declarat (rezumat)",
      "actual": "ce e real (rezumat)",
      "gap": 0-100,
      "severity": "LOW | MEDIUM | HIGH | CRITICAL"
    }
  ],
  "overallCoherence": 0-100,
  "indicators3C": {
    "consecventa": 0-100,
    "coerenta": 0-100,
    "congruenta": 0-100
  }
}

REGULI:
- Dacă MVV este IMPLICIT, consecvența este automat scăzută (nu poți fi consecvent cu ce n-ai declarat)
- Gap 0 = perfect aliniat, 100 = total dezaliniat
- Fii onest dar constructiv — scopul e să ajuți, nu să judeci
- Dacă datele sunt insuficiente, semnalează explicit și dă scoruri conservatoare`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    })

    const aiText = response.content[0].type === "text" ? response.content[0].text : ""

    // Extrage JSON din răspunsul Claude
    let reportResult: Omit<Report3CResult, "createdAt">
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Nu s-a putut extrage JSON.")
      reportResult = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { message: "Eroare la procesarea răspunsului AI. Reîncercați." },
        { status: 502 }
      )
    }

    // Salvează raportul pentru utilizare în ROI și plan intervenție
    const storedResult: Report3CResult = {
      ...reportResult,
      createdAt: new Date().toISOString(),
    }
    await setTenantData(tenantId, "CULTURE_3C_REPORT", storedResult)

    return NextResponse.json(storedResult)
  } catch (error) {
    console.error("[CULTURE 3C-REPORT POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
