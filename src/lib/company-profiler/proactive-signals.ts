/**
 * Company Profiler — Punct 6: Semnale proactive
 *
 * Engine-ul nu reacționează la cereri — observă și semnalează.
 * "Ai adăugat 5 posturi noi dar niciuna nu are fișă completă
 *  — coerența a scăzut de la 72 la 48."
 *
 * Alimentează DOA cu audit continuu.
 */

import type {
  CompanyProfile,
  CoherenceReport,
  DataPointPresence,
  MaturityLevel,
  ProactiveSignal,
  ProactiveSignalSeverity,
} from "./types"

interface PreviousState {
  coherenceScore: number | null
  maturityLevel: MaturityLevel | null
  dataPoints: DataPointPresence | null
}

/**
 * Detectează semnale proactive comparând starea curentă cu cea anterioară
 */
export function detectProactiveSignals(
  current: {
    coherence: CoherenceReport
    maturityLevel: MaturityLevel
    dataPoints: DataPointPresence
    maturityScore: number
  },
  previous: PreviousState,
): ProactiveSignal[] {
  const signals: ProactiveSignal[] = []
  const now = new Date()
  let signalIdx = 0

  // 1. Coerența a scăzut semnificativ
  if (previous.coherenceScore !== null && current.coherence.overallScore < previous.coherenceScore) {
    const delta = previous.coherenceScore - current.coherence.overallScore
    if (delta >= 10) {
      signals.push({
        id: `proactive-${++signalIdx}`,
        severity: delta >= 25 ? "CRITIC" : delta >= 15 ? "IMPORTANT" : "ATENTIE",
        event: `Coerența organizațională a scăzut de la ${previous.coherenceScore} la ${current.coherence.overallScore}`,
        impact: `Rapoartele și evaluările vor reflecta o aliniere mai slabă între MVV și operațiuni`,
        recommendation: identifyCoherenceDropCause(current.coherence, current.dataPoints),
        coherencePair: current.coherence.deviations[0]?.pair || null,
        scoreDelta: -delta,
        detectedAt: now,
      })
    }
  }

  // 2. Posturi fără fișe (raport scăzut)
  if (current.dataPoints.jobCount > 0) {
    const coverageRate = current.dataPoints.jobsWithDescriptions / current.dataPoints.jobCount
    if (coverageRate < 0.5 && current.dataPoints.jobCount >= 3) {
      signals.push({
        id: `proactive-${++signalIdx}`,
        severity: coverageRate < 0.25 ? "IMPORTANT" : "ATENTIE",
        event: `${current.dataPoints.jobCount - current.dataPoints.jobsWithDescriptions} din ${current.dataPoints.jobCount} posturi nu au fișă completă`,
        impact: `Evaluarea posturilor va fi mai puțin precisă, iar coerența MVV nu poate fi verificată la nivel de post`,
        recommendation: `Completați fișele de post — puteți folosi generarea AI pentru a accelera procesul`,
        coherencePair: "valori-fise",
        scoreDelta: null,
        detectedAt: now,
      })
    }
  }

  // 3. Maturitate a crescut (semnal pozitiv)
  if (previous.maturityLevel !== null && maturityOrd(current.maturityLevel) > maturityOrd(previous.maturityLevel)) {
    signals.push({
      id: `proactive-${++signalIdx}`,
      severity: "INFO",
      event: `Nivelul de maturitate a avansat de la ${previous.maturityLevel} la ${current.maturityLevel}`,
      impact: `Servicii noi sunt acum disponibile la nivelul ${current.maturityLevel}`,
      recommendation: `Verificați serviciile deblocate — pot oferi perspective noi asupra organizației`,
      coherencePair: null,
      scoreDelta: current.maturityScore - (maturityBaseScore(previous.maturityLevel)),
      detectedAt: now,
    })
  }

  // 4. MVV declarat dar niciodată validat + multe date deja
  if (current.dataPoints.hasMission && current.dataPoints.evaluationSessionsCompleted > 0) {
    // Are misiune draft dar nu validată — și a evaluat deja posturi
    // Semnalăm doar dacă maturitatea nu e COMPLETE
    if (current.maturityLevel !== "COMPLETE" && !current.dataPoints.hasValues) {
      signals.push({
        id: `proactive-${++signalIdx}`,
        severity: "ATENTIE",
        event: `Evaluarea posturilor s-a făcut fără valori organizaționale validate`,
        impact: `Criteriile de evaluare nu reflectă valorile companiei — rezultatele sunt corecte tehnic dar nu sunt ancorate strategic`,
        recommendation: `Validați valorile organizației din secțiunea MVV — evaluările viitoare vor fi aliniate automat`,
        coherencePair: "valori-evaluari",
        scoreDelta: null,
        detectedAt: now,
      })
    }
  }

  // 5. Deviații noi apărute
  for (const deviation of current.coherence.deviations) {
    if (deviation.status === "DEVIANT" && deviation.score < 30) {
      signals.push({
        id: `proactive-${++signalIdx}`,
        severity: "IMPORTANT",
        event: `Deviație semnificativă: ${deviation.gap}`,
        impact: `Afectează credibilitatea rapoartelor pe perechea ${deviation.pair}`,
        recommendation: deviation.suggestion || "Verificați alinierea între MVV și datele operaționale",
        coherencePair: deviation.pair,
        scoreDelta: null,
        detectedAt: now,
      })
    }
  }

  return signals
}

function identifyCoherenceDropCause(coherence: CoherenceReport, data: DataPointPresence): string {
  // Cea mai gravă deviație nouă
  const worst = coherence.deviations.sort((a, b) => a.score - b.score)[0]
  if (worst?.suggestion) return worst.suggestion

  if (data.jobCount > 0 && data.jobsWithDescriptions === 0) {
    return "Completați fișele de post — sunt baza coerenței organizaționale"
  }
  return "Verificați alinierea între misiune, posturi și structura salarială"
}

function maturityOrd(level: MaturityLevel): number {
  const ord: Record<MaturityLevel, number> = { IMPLICIT: 0, EMERGENT: 1, PARTIAL: 2, SUBSTANTIAL: 3, COMPLETE: 4 }
  return ord[level]
}

function maturityBaseScore(level: MaturityLevel): number {
  const scores: Record<MaturityLevel, number> = { IMPLICIT: 10, EMERGENT: 25, PARTIAL: 45, SUBSTANTIAL: 65, COMPLETE: 85 }
  return scores[level]
}
