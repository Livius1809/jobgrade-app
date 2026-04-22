/**
 * Company Profiler — Punct 5: Deblocare naturală servicii
 *
 * Serviciile nu se "cumpără" — se aprind singure când datele arată
 * că firma e gata. Clientul vede un buton care devine activ,
 * nu un pitch de vânzare.
 *
 * Compară starea curentă cu starea anterioară (din DB) pentru a
 * detecta servicii TOCMAi deblocate.
 */

import type { MaturityState, ServiceActivationSignal, ServiceType, MaturityLevel } from "./types"

const SERVICE_MESSAGES: Record<ServiceType, string> = {
  JOB_EVALUATION: "Aveți suficiente posturi pentru a porni evaluarea. Fiecare post va fi analizat pe 6 criterii.",
  JOB_DESCRIPTION_AI: "Putem genera fișe de post profesionale bazate pe profilul companiei.",
  PAY_GAP_ANALYSIS: "Datele salariale și evaluările permit analiza conformității cu Directiva EU 2023/970.",
  SALARY_BENCHMARK: "Puteți compara structura salarială cu piața pentru a vedea poziționarea companiei.",
  PAY_GAP_MEDIATION: "Analiza pay gap a identificat categorii care necesită evaluare comună — putem media procesul.",
  CULTURE_AUDIT: "Aveți suficiente date pentru un audit al culturii organizaționale — valori declarate vs. practicate.",
  PERFORMANCE_SYSTEM: "KPI-urile și valorile permit construirea unui sistem de performanță aliniat cu misiunea.",
  DEVELOPMENT_PLAN: "MVV-ul validat + evaluările permit un plan de dezvoltare coerent cu viziunea companiei.",
}

const SERVICE_TRIGGERS: Record<ServiceType, string> = {
  JOB_EVALUATION: "posturi adăugate cu fișe de post",
  JOB_DESCRIPTION_AI: "cod CAEN + primul post",
  PAY_GAP_ANALYSIS: "evaluare finalizată + structură salarială",
  SALARY_BENCHMARK: "evaluare finalizată + structură salarială configurată",
  PAY_GAP_MEDIATION: "analiză pay gap completă",
  CULTURE_AUDIT: "valori validate + evaluări + fișe completate",
  PERFORMANCE_SYSTEM: "KPI-uri definite + valori validate",
  DEVELOPMENT_PLAN: "MVV complet validat + evaluare finalizată",
}

/**
 * Detectează servicii tocmai deblocate comparând starea curentă cu cea anterioară
 */
export function detectActivationSignals(
  current: MaturityState,
  previousMaturity: MaturityLevel | null,
  previousReadyServices: ServiceType[],
): ServiceActivationSignal[] {
  const signals: ServiceActivationSignal[] = []
  const prevSet = new Set(previousReadyServices)

  for (const service of current.unlockedServices) {
    const justUnlocked = service.ready && !prevSet.has(service.service)

    // Calcul procent readiness
    const totalReqs = service.missing.length + (service.ready ? 1 : 0)
    const readinessPercent = service.ready ? 100 : Math.round(((totalReqs - service.missing.length) / Math.max(totalReqs, 1)) * 100)

    // Includem semnalul dacă:
    // - tocmai s-a deblocat (justUnlocked)
    // - sau e aproape gata (readinessPercent >= 60 și nu e încă ready)
    if (justUnlocked || (!service.ready && readinessPercent >= 60)) {
      signals.push({
        service: service.service,
        level: service.level,
        justUnlocked,
        clientMessage: justUnlocked
          ? SERVICE_MESSAGES[service.service]
          : `Mai ${service.missing.length === 1 ? "e nevoie de un singur pas" : `sunt ${service.missing.length} pași`}: ${service.missing.join("; ")}`,
        triggeredBy: justUnlocked ? SERVICE_TRIGGERS[service.service] : "",
        readinessPercent,
      })
    }
  }

  return signals
}
