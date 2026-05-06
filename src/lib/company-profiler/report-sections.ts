/**
 * Company Profiler — Secțiuni raport injectabile
 *
 * Engine-ul nu produce rapoarte separate.
 * Produce SECȚIUNI care se injectează în rapoartele serviciilor.
 *
 * JE primește secțiunea "Alinierea postului cu misiunea".
 * Pay Gap primește "Context valoric al diferențelor".
 * Cultura primește "Valori declarate vs. practicate".
 */

import type { CompanyProfile, ReportSection, ServiceType } from "./types"
import { cpuCall } from "@/lib/cpu/gateway"

/**
 * Generează secțiunile de raport disponibile pentru un serviciu
 */
export async function generateReportSections(
  profile: CompanyProfile,
  service: ServiceType,
  serviceData: Record<string, unknown> = {},
): Promise<ReportSection[]> {
  const readiness = profile.maturityState.unlockedServices.find(s => s.service === service)
  if (!readiness?.ready || readiness.reportSections.length === 0) return []

  const mvv = {
    mission: profile.mvv.missionValidated || profile.mvv.missionDraft,
    vision: profile.mvv.visionValidated || profile.mvv.visionDraft,
    values: profile.mvv.valuesValidated.length > 0 ? profile.mvv.valuesValidated : profile.mvv.valuesDraft,
  }

  const relevantDeviations = profile.coherence.deviations
    .filter(d => isDeviationRelevantForService(d.pair, service))
    .map(d => d.gap)
    .filter((g): g is string => g !== null)

  const relevantCoherence = profile.coherence.checks
    .filter(c => isDeviationRelevantForService(c.pair, service))

  const avgCoherence = relevantCoherence.length > 0
    ? Math.round(relevantCoherence.reduce((s, c) => s + c.score, 0) / relevantCoherence.length)
    : profile.coherence.overallScore

  const cpuResult = await cpuCall({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    system: "",
    messages: [{
      role: "user",
      content: `Generează secțiuni de raport pentru serviciul ${service} al unei companii.

PROFIL COMPANIE:
- Misiune: ${mvv.mission || "nedefinită"}
- Viziune: ${mvv.vision || "nedefinită"}
- Valori: ${mvv.values.join(", ") || "nedefinite"}
- Maturitate: ${profile.mvv.maturity} (scor ${profile.maturityState.score}/100)
- Coerență generală: ${profile.coherence.overallScore}/100

DEVIAȚII RELEVANTE:
${relevantDeviations.length > 0 ? relevantDeviations.map(d => `- ${d}`).join("\n") : "Nicio deviație semnificativă"}

DATE SERVICIU:
${JSON.stringify(serviceData, null, 2).slice(0, 500)}

SECȚIUNI DE GENERAT:
${readiness.reportSections.map((s, i) => `${i + 1}. ${s}`).join("\n")}

INSTRUCȚIUNI:
- Fiecare secțiune: narativ profesional (2-4 propoziții), deviații concrete, recomandări acționabile
- Limba română, ton profesional dar accesibil
- Dacă o deviație e relevantă, o semnalezi în narativ (nu separat)
- Recomandările sunt concrete ("Adăugați scopul postului X") nu generice
- Nu inventezi date — dacă nu ai, spui "date insuficiente pentru această analiză"

JSON STRICT:
[{
  "title": "Alinierea postului cu misiunea",
  "narrative": "...",
  "deviations": ["..."],
  "recommendations": ["..."]
}]`
    }],
    agentRole: "DOAS",
    operationType: "report-section-generation",
  })

  const text = cpuResult.text
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return (parsed as any[]).map((s, i) => ({
      id: `${service}-${i}`,
      title: s.title || readiness.reportSections[i] || "Secțiune",
      level: readiness.level,
      service,
      narrative: s.narrative || "",
      deviations: s.deviations || [],
      recommendations: s.recommendations || [],
      coherenceScore: avgCoherence,
    }))
  } catch {
    return []
  }
}

function isDeviationRelevantForService(pair: string, service: ServiceType): boolean {
  const relevance: Record<string, ServiceType[]> = {
    "misiune-caen": ["JOB_EVALUATION", "JOB_DESCRIPTION_AI"],
    "misiune-posturi": ["JOB_EVALUATION", "JOB_DESCRIPTION_AI", "CULTURE_AUDIT"],
    "valori-fise": ["JOB_EVALUATION", "JOB_DESCRIPTION_AI", "CULTURE_AUDIT"],
    "valori-evaluari": ["JOB_EVALUATION", "CULTURE_AUDIT", "PERFORMANCE_SYSTEM"],
    "structura-misiune": ["PAY_GAP_ANALYSIS", "PAY_GAP_MEDIATION", "SALARY_BENCHMARK"],
    "viziune-benchmark": ["SALARY_BENCHMARK", "DEVELOPMENT_PLAN"],
    "kpi-remunerare": ["PAY_GAP_MEDIATION", "PERFORMANCE_SYSTEM"],
  }
  return (relevance[pair] || []).includes(service)
}
