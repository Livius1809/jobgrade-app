/**
 * Company Profiler — Coerență organizațională
 *
 * Verifică aliniamentul real pe tot lanțul:
 * MVV ↔ fișe ↔ evaluări ↔ salarii ↔ KPI
 *
 * Nu judecă — semnalează. Clientul decide.
 */

import type { CoherenceCheck, CoherenceReport, CoherencePair, MaturityLevel } from "./types"
import { cpuCall } from "@/lib/cpu/gateway"

interface CoherenceInput {
  caenName: string | null
  mission: string | null
  vision: string | null
  values: string[]
  jobs: Array<{ title: string; purpose: string | null; responsibilities: string | null }>
  evaluationCriteria: string[] // criteriile folosite la evaluare
  salaryNotes: string | null // observații structură salarială
  maturity: MaturityLevel
}

/**
 * Verificări care se pot face fără AI (reguli deterministe)
 */
function deterministicChecks(input: CoherenceInput): CoherenceCheck[] {
  const checks: CoherenceCheck[] = []

  // Misiune ↔ CAEN: dacă avem ambele, verificăm dacă sunt completate
  if (input.caenName && input.mission) {
    checks.push({
      pair: "misiune-caen",
      score: 70, // placeholder — AI rafinează
      status: "COERENT",
      gap: null,
      suggestion: null,
      relevantFrom: "EMERGENT",
    })
  } else if (input.caenName && !input.mission) {
    checks.push({
      pair: "misiune-caen",
      score: 20,
      status: "ATENTIE",
      gap: "Obiect de activitate definit dar misiunea lipsește",
      suggestion: "Misiunea poate fi construită automat din CAEN + posturi existente",
      relevantFrom: "EMERGENT",
    })
  }

  // Valori ↔ Fișe: dacă are valori declarate dar fișe fără scop
  if (input.values.length > 0 && input.jobs.length > 0) {
    const jobsWithoutPurpose = input.jobs.filter(j => !j.purpose).length
    if (jobsWithoutPurpose > input.jobs.length * 0.5) {
      checks.push({
        pair: "valori-fise",
        score: 30,
        status: "ATENTIE",
        gap: `${jobsWithoutPurpose} din ${input.jobs.length} posturi nu au scopul definit — valorile nu pot fi verificate la nivel de post`,
        suggestion: "Completați scopul fiecărui post pentru a verifica alinierea cu valorile",
        relevantFrom: "EMERGENT",
      })
    }
  }

  return checks
}

/**
 * Verificare completă coerență cu AI
 */
export async function computeCoherence(input: CoherenceInput): Promise<CoherenceReport> {
  const deterministic = deterministicChecks(input)

  // Dacă nu avem suficiente date pentru AI, returnăm doar deterministicele
  if (!input.mission && input.jobs.length === 0) {
    return {
      overallScore: 0,
      checks: deterministic,
      deviations: deterministic.filter(c => c.status !== "COERENT"),
      summary: "Date insuficiente pentru verificarea coerenței. Adăugați posturi și completați profilul.",
    }
  }

  // Perechi relevante la nivelul curent de maturitate
  const relevantPairs = getRelevantPairs(input.maturity)

  const cpuResult = await cpuCall({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: "",
    messages: [{
      role: "user",
      content: `Analizează coerența organizațională a unei companii din România.

DATE COMPANIE:
- CAEN: ${input.caenName || "necunoscut"}
- Misiune: ${input.mission || "nedefinită"}
- Viziune: ${input.vision || "nedefinită"}
- Valori: ${input.values.length > 0 ? input.values.join(", ") : "nedefinite"}

POSTURI (${input.jobs.length}):
${input.jobs.slice(0, 15).map(j => `- ${j.title}${j.purpose ? `: ${j.purpose}` : ""}`).join("\n") || "–"}

CRITERII EVALUARE: ${input.evaluationCriteria.join(", ") || "–"}
OBSERVAȚII SALARIALE: ${input.salaryNotes || "–"}

VERIFICĂ ACESTE PERECHI:
${relevantPairs.map(p => `- ${p}`).join("\n")}

INSTRUCȚIUNI:
- Pentru fiecare pereche verificabilă: scor 0-100, status (COERENT/ATENTIE/DEVIANT), gap concret, sugestie
- Semnalează doar deviații reale, nu presupuneri
- Dacă nu ai date suficiente pentru o pereche, scor 50, status ATENTIE, gap = "date insuficiente"
- Formulare profesională, concisă
- summary = 1-2 propoziții, ce merge bine + ce e de atenție

JSON STRICT:
{
  "checks": [{"pair": "misiune-caen", "score": 85, "status": "COERENT", "gap": null, "suggestion": null}],
  "overallScore": 72,
  "summary": "..."
}`
    }],
    agentRole: "DOAS",
    operationType: "coherence-analysis",
  })

  const text = cpuResult.text
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return {
      overallScore: deterministic.length > 0 ? Math.round(deterministic.reduce((s, c) => s + c.score, 0) / deterministic.length) : 0,
      checks: deterministic,
      deviations: deterministic.filter(c => c.status !== "COERENT"),
      summary: "Verificarea AI nu a putut fi finalizată. Rezultate parțiale din reguli deterministe.",
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const aiChecks: CoherenceCheck[] = (parsed.checks || []).map((c: any) => ({
      pair: c.pair as CoherencePair,
      score: c.score ?? 50,
      status: c.status || "ATENTIE",
      gap: c.gap || null,
      suggestion: c.suggestion || null,
      relevantFrom: pairRelevance(c.pair),
    }))

    // Mergem deterministice + AI (AI are prioritate pe aceleași perechi)
    const aiPairs = new Set(aiChecks.map(c => c.pair))
    const merged = [
      ...aiChecks,
      ...deterministic.filter(c => !aiPairs.has(c.pair)),
    ]

    const deviations = merged.filter(c => c.status !== "COERENT")

    return {
      overallScore: parsed.overallScore ?? Math.round(merged.reduce((s, c) => s + c.score, 0) / merged.length),
      checks: merged,
      deviations,
      summary: parsed.summary || "Analiză completă.",
    }
  } catch {
    return {
      overallScore: 50,
      checks: deterministic,
      deviations: deterministic.filter(c => c.status !== "COERENT"),
      summary: "Eroare la parsarea rezultatului AI.",
    }
  }
}

function getRelevantPairs(maturity: MaturityLevel): CoherencePair[] {
  const pairs: CoherencePair[] = ["misiune-caen", "misiune-posturi"]
  if (maturity === "PARTIAL" || maturity === "SUBSTANTIAL" || maturity === "COMPLETE") {
    pairs.push("valori-fise", "valori-evaluari", "structura-misiune")
  }
  if (maturity === "SUBSTANTIAL" || maturity === "COMPLETE") {
    pairs.push("viziune-benchmark", "kpi-remunerare")
  }
  return pairs
}

function pairRelevance(pair: string): MaturityLevel {
  switch (pair) {
    case "misiune-caen":
    case "misiune-posturi":
      return "EMERGENT"
    case "valori-fise":
    case "valori-evaluari":
    case "structura-misiune":
      return "PARTIAL"
    case "viziune-benchmark":
    case "kpi-remunerare":
      return "SUBSTANTIAL"
    default:
      return "EMERGENT"
  }
}
