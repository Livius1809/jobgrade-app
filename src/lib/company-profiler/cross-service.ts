/**
 * Company Profiler — Punct 8: Punte între servicii
 *
 * Evaluarea JE produce un rezultat. Pay Gap-ul îl folosește.
 * Benchmark-ul îl contextualizează. Cultura îl interpretează.
 * Engine-ul e LIANTUL — fără el, fiecare serviciu e izolat.
 *
 * + Punct 9: Protecție contra inconsistenței
 * Dacă clientul declară "inovație" ca valoare dar nu are niciun
 * post de R&D, engine-ul nu îl judecă — dar semnalează deviația.
 */

import type {
  CompanyProfile,
  CrossServiceLink,
  DataPointPresence,
  InconsistencyAlert,
  ServiceEcosystem,
  ServiceType,
} from "./types"

// ── Punct 8: Punte între servicii ──────────────────────────────────

const SERVICE_LINKS: Array<{
  from: ServiceType
  to: ServiceType
  dataFlow: string
  influence: string
  fromReady: (d: DataPointPresence) => boolean
}> = [
  {
    from: "JOB_EVALUATION",
    to: "PAY_GAP_ANALYSIS",
    dataFlow: "Grade salariale din evaluare → categorii comparabile pay gap",
    influence: "Evaluarea determină gruparea posturilor; fără evaluare, pay gap-ul compară mere cu pere",
    fromReady: d => d.evaluationSessionsCompleted > 0,
  },
  {
    from: "JOB_EVALUATION",
    to: "SALARY_BENCHMARK",
    dataFlow: "Ierarhia internă → comparație cu piața pe fiecare grad",
    influence: "Benchmark-ul fără evaluare internă nu are referință; cu evaluare, arată exact unde e compania vs. piață",
    fromReady: d => d.evaluationSessionsCompleted > 0,
  },
  {
    from: "JOB_DESCRIPTION_AI",
    to: "JOB_EVALUATION",
    dataFlow: "Fișe de post → baza evaluării pe 6 criterii",
    influence: "Calitatea fișelor determină acuratețea evaluării; fișe incomplete = scorare imprecisă",
    fromReady: d => d.jobsWithDescriptions >= 2,
  },
  {
    from: "PAY_GAP_ANALYSIS",
    to: "PAY_GAP_MEDIATION",
    dataFlow: "Categorii cu gap >5% → sesiuni mediere Art. 10",
    influence: "Fără analiză, medierea nu are obiect; analiza identifică exact ce categorii necesită evaluare comună",
    fromReady: d => d.hasPayGapAnalysis,
  },
  {
    from: "JOB_EVALUATION",
    to: "CULTURE_AUDIT",
    dataFlow: "Criteriile de evaluare + scoruri → reflectă valorile practicate",
    influence: "Auditul culturii compară valorile declarate cu ce scorează posturile; JE e oglinda valorilor reale",
    fromReady: d => d.evaluationSessionsCompleted > 0,
  },
  {
    from: "SALARY_BENCHMARK",
    to: "DEVELOPMENT_PLAN",
    dataFlow: "Poziționare piață → priorități de dezvoltare",
    influence: "Planul de dezvoltare reflectă unde e compania vs. unde vrea să fie (viziune + benchmark)",
    fromReady: d => d.hasBenchmark,
  },
  {
    from: "CULTURE_AUDIT",
    to: "PERFORMANCE_SYSTEM",
    dataFlow: "Valori practicate → KPI-uri aliniate",
    influence: "KPI-urile fără audit cultural pot măsura lucruri care nu reflectă valorile reale",
    fromReady: d => d.hasValues && d.evaluationSessionsCompleted > 0,
  },
  {
    from: "PAY_GAP_MEDIATION",
    to: "DEVELOPMENT_PLAN",
    dataFlow: "Plan remediere gap → acțiuni de dezvoltare",
    influence: "Planul de dezvoltare integrează acțiunile de remediere a gap-urilor salariale identificate",
    fromReady: d => d.hasPayGapAnalysis,
  },
]

/**
 * Construiește ecosistemul de servicii: ce e activ, ce e legat, ce e izolat
 */
export function buildServiceEcosystem(data: DataPointPresence): ServiceEcosystem {
  // Servicii active (au date suficiente)
  const activeServices: ServiceType[] = []
  if (data.evaluationSessionsCompleted > 0) activeServices.push("JOB_EVALUATION")
  if (data.jobsWithDescriptions >= 1) activeServices.push("JOB_DESCRIPTION_AI")
  if (data.hasPayGapAnalysis) activeServices.push("PAY_GAP_ANALYSIS")
  if (data.hasSalaryStructure && data.evaluationSessionsCompleted > 0) activeServices.push("SALARY_BENCHMARK")
  if (data.hasPayGapAnalysis) activeServices.push("PAY_GAP_MEDIATION")
  if (data.hasValues && data.evaluationSessionsCompleted > 0) activeServices.push("CULTURE_AUDIT")
  if (data.hasKPIs && data.hasValues) activeServices.push("PERFORMANCE_SYSTEM")
  if (data.hasMission && data.hasVision && data.hasValues) activeServices.push("DEVELOPMENT_PLAN")

  const activeSet = new Set(activeServices)

  // Legături active
  const links: CrossServiceLink[] = SERVICE_LINKS
    .filter(l => activeSet.has(l.from) || activeSet.has(l.to))
    .map(l => ({
      from: l.from,
      to: l.to,
      dataFlow: l.dataFlow,
      influence: l.influence,
      fresh: l.fromReady(data),
    }))

  // Servicii izolate (active dar fără legături)
  const linkedServices = new Set<ServiceType>()
  for (const link of links) {
    linkedServices.add(link.from)
    linkedServices.add(link.to)
  }
  const isolated = activeServices.filter(s => !linkedServices.has(s))

  // Narativ unificat
  const unifiedNarrative = buildUnifiedNarrative(activeServices, links, isolated)

  return { activeServices, links, isolated, unifiedNarrative }
}

function buildUnifiedNarrative(
  active: ServiceType[],
  links: CrossServiceLink[],
  isolated: ServiceType[],
): string {
  if (active.length === 0) {
    return "Niciun serviciu nu are încă date suficiente. Începeți cu adăugarea posturilor și completarea fișelor."
  }

  const parts: string[] = []

  if (active.length === 1) {
    parts.push(`Serviciul ${active[0]} este activ. Pe măsură ce adăugați date, alte servicii se vor conecta automat.`)
  } else {
    const freshLinks = links.filter(l => l.fresh)
    parts.push(`${active.length} servicii active, conectate prin ${freshLinks.length} fluxuri de date.`)
  }

  if (isolated.length > 0) {
    parts.push(`${isolated.join(", ")} ${isolated.length === 1 ? "funcționează" : "funcționează"} independent — datele vor fi integrate când serviciile adiacente devin active.`)
  }

  const staleLinks = links.filter(l => !l.fresh)
  if (staleLinks.length > 0) {
    parts.push(`${staleLinks.length} ${staleLinks.length === 1 ? "conexiune necesită" : "conexiuni necesită"} date actualizate.`)
  }

  return parts.join(" ")
}

// ── Punct 9: Protecție contra inconsistenței ───────────────────────

/**
 * Detectează inconsistențe între ce declară clientul și ce arată datele.
 * Nu judecă — iluminează.
 */
export function detectInconsistencies(profile: CompanyProfile): InconsistencyAlert[] {
  const alerts: InconsistencyAlert[] = []
  const values = profile.mvv.valuesValidated.length > 0 ? profile.mvv.valuesValidated : profile.mvv.valuesDraft
  const mission = profile.mvv.missionValidated || profile.mvv.missionDraft

  // 1. Valori declarate vs. posturi existente
  if (values.length > 0 && profile.maturityState.dataPoints.jobCount > 0) {
    const valueKeywords = extractValueKeywords(values)

    // Verificăm dacă vreuna din valori e "inovație"/"creativitate" dar nu avem posturi R&D
    if (valueKeywords.hasInnovation && profile.maturityState.dataPoints.jobCount >= 5) {
      alerts.push({
        declared: `Valoare declarată: "${values.find(v => /inova|creativ|r&d|cercetare/i.test(v)) || "inovație"}"`,
        reality: `Din ${profile.maturityState.dataPoints.jobCount} posturi, niciunul nu pare orientat spre inovație/R&D (bazat pe titluri)`,
        visibleIn: ["JOB_EVALUATION", "CULTURE_AUDIT"],
        severity: "SEMNIFICATIV",
        suggestion: "Verificați dacă inovația e reflectată în responsabilitățile posturilor existente, chiar dacă nu are un post dedicat",
      })
    }
  }

  // 2. Misiune orientată spre clienți dar fără posturi client-facing
  if (mission && /client|servicii|satisfac/i.test(mission)) {
    if (profile.maturityState.dataPoints.jobCount >= 5 && profile.maturityState.dataPoints.jobsWithDescriptions < 2) {
      alerts.push({
        declared: "Misiunea menționează orientarea spre clienți/servicii",
        reality: "Fișele de post nu sunt completate — nu se poate verifica dacă posturile reflectă orientarea spre client",
        visibleIn: ["JOB_EVALUATION", "JOB_DESCRIPTION_AI"],
        severity: "MINOR",
        suggestion: "Completați fișele de post pentru a verifica alinierea atribuțiilor cu misiunea",
      })
    }
  }

  // 3. Structură salarială există dar fără evaluare (plătesc fără să știe de ce)
  if (profile.maturityState.dataPoints.hasSalaryStructure && profile.maturityState.dataPoints.evaluationSessionsCompleted === 0) {
    alerts.push({
      declared: "Structură salarială configurată",
      reality: "Nicio evaluare de posturi finalizată — salariile nu sunt ancorate în valoarea relativă a posturilor",
      visibleIn: ["PAY_GAP_ANALYSIS", "SALARY_BENCHMARK"],
      severity: "SEMNIFICATIV",
      suggestion: "Evaluarea posturilor dă sens structurii salariale — recomandăm evaluarea înainte de decizii de compensare",
    })
  }

  // 4. Evaluare făcută dar MVV complet lipsă
  if (profile.maturityState.dataPoints.evaluationSessionsCompleted > 0 && !profile.maturityState.dataPoints.hasMission && !profile.maturityState.dataPoints.hasValues) {
    alerts.push({
      declared: "Evaluare posturi finalizată",
      reality: "MVV-ul (misiune, viziune, valori) nu e definit — evaluarea e corectă tehnic dar nu e ancorată strategic",
      visibleIn: ["JOB_EVALUATION", "CULTURE_AUDIT", "DEVELOPMENT_PLAN"],
      severity: "SEMNIFICATIV",
      suggestion: "Validați MVV-ul din secțiunea dedicată — evaluările viitoare vor fi automat aliniate",
    })
  }

  return alerts
}

function extractValueKeywords(values: string[]): { hasInnovation: boolean; hasQuality: boolean; hasClient: boolean } {
  const joined = values.join(" ").toLowerCase()
  return {
    hasInnovation: /inova|creativ|r&d|cercet|dezvolt|tehnolog/i.test(joined),
    hasQuality: /calitat|excelen|performan|standar|rigu/i.test(joined),
    hasClient: /client|servicii|satisfac|relat|partener/i.test(joined),
  }
}
