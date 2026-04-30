/**
 * /api/v1/culture/simulator
 *
 * C4 F6 — Simulator strategic
 * POST — Simulare "what if" pe cultură și structură
 * GET  — Listare simulări anterioare
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

const simulatorSchema = z.object({
  scenarioType: z.enum([
    "CHANGE_STRUCTURE",
    "CHANGE_MANAGEMENT",
    "INVEST_DEVELOPMENT",
    "TRANSITION_HU_AI",
    "MARKET_SCENARIO",
    "GREENFIELD",
  ]),
  params: z.record(z.string(), z.unknown()),
  compareClassicVsTransformational: z.boolean().optional().default(false),
})

// Tipuri interne
interface ImpactItem {
  dimension: string
  currentState: string
  projectedState: string
  delta: string
}

interface CostBenefitProjection {
  period: string
  costs: number
  benefits: number
  netImpact: number
}

interface RiskItem {
  risk: string
  probability: string
  impact: string
  mitigation: string
}

interface SimulationBranch {
  approach: string
  impacts: ImpactItem[]
  costBenefit: CostBenefitProjection[]
  risks: RiskItem[]
  summary: string
}

interface SimulationResult {
  scenario: {
    type: string
    params: Record<string, unknown>
  }
  impacts: ImpactItem[]
  costBenefit: CostBenefitProjection[]
  risks: RiskItem[]
  classic?: SimulationBranch
  transformational?: SimulationBranch
  createdAt: string
}

/**
 * POST — Simulare strategică "what if"
 * Încarcă raportul 3C, ROI, plan de intervenție și profilul companiei
 * Utilizează Claude pentru a simula impactul scenariului
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = simulatorSchema.parse(body)

    // Încarcă toate datele acumulate pentru context
    const [report3C, roiResult, interventionPlan, company] = await Promise.all([
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_3C_REPORT"),
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_ROI"),
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_INTERVENTION_PLAN"),
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
    ])

    // Descrieri scenariu pentru prompt
    const scenarioDescriptions: Record<string, string> = {
      CHANGE_STRUCTURE: "Restructurare organizațională (fuziuni departamente, ierarhie nouă, echipe noi)",
      CHANGE_MANAGEMENT: "Schimbare management (director nou, stil de conducere diferit, reorganizare C-level)",
      INVEST_DEVELOPMENT: "Investiție în dezvoltare (programe formare, coaching, mentoring la scară)",
      TRANSITION_HU_AI: "Tranziție uman → AI (automatizare procese, asistent AI, reducere roluri repetitive)",
      MARKET_SCENARIO: "Scenariu de piață (recesiune, creștere rapidă, concurență nouă, reglementare nouă)",
      GREENFIELD: "Greenfield (departament/unitate nouă de la zero, cultură de proiectat)",
    }

    // Context acumulat pentru Claude
    const accumulatedContext = `## Date acumulate din analizele anterioare

### Raport 3C (Consecvență · Coerență · Congruență):
${report3C ? JSON.stringify(report3C).slice(0, 2000) : "Nedisponibil — simularea va folosi estimări generice."}

### ROI Cultură (costul gap-urilor):
${roiResult ? JSON.stringify(roiResult).slice(0, 1500) : "Nedisponibil."}

### Plan de intervenție activ:
${interventionPlan ? JSON.stringify(interventionPlan).slice(0, 1500) : "Nedisponibil."}

### Profil companie:
- Industrie: ${company?.industry ?? "—"}
- Dimensiune: ${company?.size ?? "—"}
- Maturitate MVV: ${company?.mvvMaturity ?? "IMPLICIT"}
- Misiune: ${company?.mission ?? "nedeclarată"}
- Viziune: ${company?.vision ?? "nedeclarată"}
- Valori: ${company?.values?.join(", ") ?? "nedeclarate"}`

    // Structura JSON așteptată — diferă dacă comparăm clasic vs transformațional
    const compareMode = data.compareClassicVsTransformational

    const comparisonInstruction = compareMode
      ? `
## MOD COMPARATIV activat — generează AMBELE variante

Returnează un JSON valid cu structura:
{
  "impacts": [], // impact general al scenariului (fără intervenție)
  "costBenefit": [],
  "risks": [],
  "classic": {
    "approach": "Abordare clasică / tradițională",
    "impacts": [{"dimension":"...", "currentState":"...", "projectedState":"...", "delta":"..."}],
    "costBenefit": [{"period":"6 luni", "costs": N, "benefits": N, "netImpact": N}, {"period":"12 luni",...}, {"period":"24 luni",...}],
    "risks": [{"risk":"...", "probability":"SCĂZUT|MEDIU|RIDICAT", "impact":"SCĂZUT|MEDIU|RIDICAT", "mitigation":"..."}],
    "summary": "Sinteză abordare clasică"
  },
  "transformational": {
    "approach": "Abordare transformațională / organism viu",
    "impacts": [...],
    "costBenefit": [...],
    "risks": [...],
    "summary": "Sinteză abordare transformațională"
  }
}`
      : `
Returnează un JSON valid cu structura:
{
  "impacts": [
    {"dimension": "numele dimensiunii F3(A) afectate", "currentState": "starea actuală", "projectedState": "starea proiectată", "delta": "schimbarea estimată"}
  ],
  "costBenefit": [
    {"period": "6 luni", "costs": numar_RON, "benefits": numar_RON, "netImpact": numar_RON},
    {"period": "12 luni", "costs": N, "benefits": N, "netImpact": N},
    {"period": "24 luni", "costs": N, "benefits": N, "netImpact": N}
  ],
  "risks": [
    {"risk": "descriere risc", "probability": "SCĂZUT|MEDIU|RIDICAT", "impact": "SCĂZUT|MEDIU|RIDICAT", "mitigation": "măsură de atenuare"}
  ]
}`

    const prompt = `Ești expert în strategie organizațională și transformare culturală. Simulează impactul unui scenariu "what if".

## Scenariu solicitat: ${scenarioDescriptions[data.scenarioType]}
## Parametri specifici: ${JSON.stringify(data.params)}

${accumulatedContext}

## Ce trebuie simulat:
1. **Impact pe starea actuală F3(A)** — cum se modifică fiecare dimensiune culturală
2. **Proiecție cost vs beneficiu** pe 3 orizonturi: 6, 12, 24 luni
3. **Analiză riscuri** — minim 3, maxim 7 riscuri cu probabilitate, impact și măsuri de atenuare
${compareMode ? "4. **Comparație CLASIC vs TRANSFORMAȚIONAL** — generează ambele variante paralel" : ""}

${comparisonInstruction}

REGULI:
- Dimensiunile de impact urmăresc F3(A): execuție, adaptare, învățare, calitate decizii, coeziune
- Costuri și beneficii în RON, realiste pentru România
- Riscurile includ atât riscuri de implementare cât și riscuri de non-acțiune
- Fii specific la industria și dimensiunea companiei dacă sunt disponibile
- Proiecțiile sunt conservatoare (mai bine subliniem riscuri decât promitem prea mult)`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: compareMode ? 6000 : 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const aiText = response.content[0].type === "text" ? response.content[0].text : ""

    // Extrage JSON din răspunsul Claude
    let simResult: {
      impacts: ImpactItem[]
      costBenefit: CostBenefitProjection[]
      risks: RiskItem[]
      classic?: SimulationBranch
      transformational?: SimulationBranch
    }
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Nu s-a putut extrage JSON.")
      simResult = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { message: "Eroare la procesarea răspunsului AI. Reîncercați." },
        { status: 502 }
      )
    }

    // Construiește rezultatul complet
    const timestamp = new Date().toISOString()
    const storedResult: SimulationResult = {
      scenario: {
        type: data.scenarioType,
        params: data.params,
      },
      impacts: simResult.impacts,
      costBenefit: simResult.costBenefit,
      risks: simResult.risks,
      ...(simResult.classic ? { classic: simResult.classic } : {}),
      ...(simResult.transformational ? { transformational: simResult.transformational } : {}),
      createdAt: timestamp,
    }

    // Salvează simularea cu timestamp unic
    const storageKey = `CULTURE_SIMULATION_${timestamp.replace(/[:.]/g, "-")}`
    await setTenantData(tenantId, storageKey, storedResult)

    return NextResponse.json(storedResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[CULTURE SIMULATOR POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

/**
 * GET — Listare simulări anterioare
 * Returnează toate simulările salvate pentru tenant
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Caută toate intrările de simulare din SystemConfig
    // Cheia urmează pattern-ul: TENANT_{tenantId}_CULTURE_SIMULATION_{timestamp}
    const prefix = `TENANT_${tenantId}_CULTURE_SIMULATION_`
    const simulations = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: prefix },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        key: true,
        value: true,
        updatedAt: true,
      },
    })

    const results = simulations.map((s) => {
      try {
        const parsed = JSON.parse(s.value) as Record<string, unknown>
        return { id: s.key, ...parsed }
      } catch {
        return { id: s.key, error: "JSON invalid" }
      }
    })

    return NextResponse.json({ simulations: results, total: results.length })
  } catch (error) {
    console.error("[CULTURE SIMULATOR GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
