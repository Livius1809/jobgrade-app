/**
 * /api/v1/culture/intervention-plan
 *
 * C4 F5 — Plan de intervenție multi-nivel
 * POST — Generează plan strategic, tactic, operațional, individual și transversal
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

const planSchema = z.object({
  strategicObjectives: z.array(z.string()).optional(),
  timeline: z.enum(["6M", "12M", "24M"]).optional().default("12M"),
})

// Tipuri interne
interface PlanAction {
  action: string
  responsible: string
  kpi: string
  deadline: string
}

interface PlanLevel {
  level: string
  actions: PlanAction[]
}

interface InterventionPlanResult {
  levels: PlanLevel[]
  timeline: string
  estimatedInvestment: string
  projectedROI: string
  createdAt: string
}

/**
 * POST — Plan de intervenție multi-nivel
 * Utilizează raportul 3C + ROI + obiective strategice
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = planSchema.parse(body)

    // Încarcă toate datele acumulate
    const [report3C, roiResult, culturalAudit, company, departments] = await Promise.all([
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_3C_REPORT"),
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_ROI"),
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_AUDIT"),
      prisma.companyProfile.findFirst({
        where: { tenantId },
        select: {
          mission: true,
          vision: true,
          values: true,
          industry: true,
          size: true,
          mvvMaturity: true,
        },
      }),
      prisma.department.findMany({
        where: { tenantId, isActive: true },
        select: { name: true },
      }),
    ])

    // Context acumulat pentru Claude
    const accumulatedContext = `## Date acumulate din analizele anterioare

### Raport 3C (Consecvență · Coerență · Congruență):
${report3C ? JSON.stringify(report3C).slice(0, 2000) : "Nedisponibil — planul va fi generic."}

### ROI Cultură (costul gap-urilor):
${roiResult ? JSON.stringify(roiResult).slice(0, 1500) : "Nedisponibil."}

### Audit Cultural:
${culturalAudit ? JSON.stringify(culturalAudit).slice(0, 1500) : "Nedisponibil."}

### Profil companie:
- Industrie: ${company?.industry ?? "—"}
- Dimensiune: ${company?.size ?? "—"}
- Maturitate MVV: ${company?.mvvMaturity ?? "IMPLICIT"}
- Misiune: ${company?.mission ?? "nedeclarată"}
- Viziune: ${company?.vision ?? "nedeclarată"}
- Valori: ${company?.values?.join(", ") ?? "nedeclarate"}

### Departamente: ${departments.map(d => d.name).join(", ") || "—"}

### Obiective strategice furnizate de client:
${data.strategicObjectives?.length ? data.strategicObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n") : "Nefurnizate — generează obiective din gaps-urile identificate."}

### Orizont de timp: ${data.timeline}`

    const timelineMonths = data.timeline === "6M" ? 6 : data.timeline === "24M" ? 24 : 12

    const prompt = `Ești expert în dezvoltare organizațională și transformare culturală. Generează un plan de intervenție CONCRET și ACȚIONABIL pe ${timelineMonths} luni.

${accumulatedContext}

## Structura planului — 5 niveluri obligatorii:

### 1. STRATEGIC (CA/Director General)
- Direcții, priorități, decizii de guvernanță
- Responsabil: top management
- KPI: indicatori de nivel organizație

### 2. TACTIC (Middle Management)
- Acțiuni specifice per departament
- Responsabil: manageri departamente
- KPI: indicatori departamentali

### 3. OPERAȚIONAL (Echipe)
- Activități concrete de echipă
- Responsabil: team leads
- KPI: indicatori de echipă

### 4. INDIVIDUAL (Dezvoltare personală)
- Programe de dezvoltare individuală
- Responsabil: HR + angajat
- KPI: indicatori personali

### 5. TRANSVERSAL (Cross-departamental)
- Inițiative de cultură care traversează departamentele
- Responsabil: HR + comitet de cultură
- KPI: indicatori de coeziune

Returnează un JSON valid cu structura:
{
  "levels": [
    {
      "level": "STRATEGIC | TACTIC | OPERAȚIONAL | INDIVIDUAL | TRANSVERSAL",
      "actions": [
        {
          "action": "descriere acțiune concretă",
          "responsible": "cine e responsabil",
          "kpi": "indicator de succes măsurabil",
          "deadline": "termen (lună/trimestru relativ la T0)"
        }
      ]
    }
  ],
  "timeline": "${data.timeline}",
  "estimatedInvestment": "buget estimativ total în RON (interval)",
  "projectedROI": "ROI proiectat pe baza costurilor gap-urilor din analiza ROI"
}

REGULI:
- Minim 3 acțiuni per nivel, maxim 7
- Deadline-urile sunt relative (T0+1 lună, T0+Q1, etc.)
- Investiția estimativă e realistă pentru piața din România
- ROI proiectat se bazează pe datele ROI dacă există, altfel pe benchmarkuri
- Acțiunile sunt CONCRETE (nu "îmbunătățirea comunicării" ci "workshop lunar cross-departamental de 2h")
- Adaptate la industria și dimensiunea companiei`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const aiText = response.content[0].type === "text" ? response.content[0].text : ""

    // Extrage JSON din răspunsul Claude
    let planResult: { levels: PlanLevel[]; timeline: string; estimatedInvestment: string; projectedROI: string }
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Nu s-a putut extrage JSON.")
      planResult = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { message: "Eroare la procesarea răspunsului AI. Reîncercați." },
        { status: 502 }
      )
    }

    // Salvează planul de intervenție
    const storedResult: InterventionPlanResult = {
      ...planResult,
      createdAt: new Date().toISOString(),
    }
    await setTenantData(tenantId, "CULTURE_INTERVENTION_PLAN", storedResult)

    return NextResponse.json(storedResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[CULTURE INTERVENTION-PLAN POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
