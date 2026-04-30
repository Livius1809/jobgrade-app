/**
 * useC1Pipeline — Calculează starea pipeline-ului C1 din datele clientului
 *
 * C1: ORGANIZARE INTERNĂ
 * F1: Fișe de post (generare AI sau upload)
 * F2: Stat de funcții (dedus din fișe sau manual)
 * F3: Evaluare posturi (6 criterii, sesiune JE)
 * F4: Ierarhizare (ranking posturi din scoruri)
 */

import type { PipelinePhase } from "./CardPipeline"

interface C1Data {
  jobCount: number
  jobsWithDescription: number
  statFunctiiExists: boolean
  departmentCount: number
  sessionCount: number
  sessionStatus: string | null // DRAFT, IN_PROGRESS, COMPLETED, VALIDATED
  evaluatedJobCount: number
  rankedJobCount: number
  isValidated: boolean
}

export function computeC1Pipeline(data: C1Data): { phases: PipelinePhase[]; overallProgress: number } {
  const phases: PipelinePhase[] = []

  // F1: Fișe de post
  const f1Progress = data.jobCount === 0 ? 0 : Math.min(100, Math.round((data.jobsWithDescription / Math.max(1, data.jobCount)) * 100))
  const f1Done = data.jobCount >= 2 && f1Progress >= 80
  phases.push({
    id: "F1",
    name: "Fișe de post",
    description: "Definirea posturilor organizației — generare AI din obiectul de activitate sau upload manual",
    status: data.jobCount === 0 ? "ACTIVE" : f1Done ? "DONE" : "IN_PROGRESS",
    progress: f1Progress,
    detail: data.jobCount === 0
      ? "Niciun post definit — adaugă primul post"
      : `${data.jobsWithDescription}/${data.jobCount} posturi cu descriere completă`,
    actionLabel: data.jobCount === 0 ? "Adaugă primul post" : "Gestionează posturi",
    actionUrl: "/jobs",
  })

  // F2: Stat de funcții
  const f2Locked = data.jobCount < 2
  const f2Done = data.statFunctiiExists || data.departmentCount >= 2
  phases.push({
    id: "F2",
    name: "Stat de funcții",
    description: "Structura departamentală — dedusă automat din fișele de post sau introdusă manual",
    status: f2Locked ? "LOCKED" : f2Done ? "DONE" : "ACTIVE",
    detail: f2Done
      ? `${data.departmentCount} departamente, ${data.jobCount} posturi`
      : "Adaugă departamente sau importă stat de funcții",
    actionLabel: "Stat de funcții",
    actionUrl: "/jobs",
    missingInputs: f2Locked ? ["Minimum 2 posturi definite (F1)"] : undefined,
  })

  // F3: Evaluare posturi
  const f3Locked = !f1Done
  const f3Done = data.sessionStatus === "COMPLETED" || data.sessionStatus === "VALIDATED"
  const f3InProgress = data.sessionStatus === "IN_PROGRESS" || data.sessionStatus === "PRE_SCORING" || data.sessionStatus === "VOTING"
  const f3Progress = data.jobCount > 0 ? Math.round((data.evaluatedJobCount / data.jobCount) * 100) : 0
  phases.push({
    id: "F3",
    name: "Evaluare posturi",
    description: "Evaluare pe 6 criterii obiective — AI, comitet sau mixt. Fiecare post primește un scor",
    status: f3Locked ? "LOCKED" : f3Done ? "DONE" : f3InProgress ? "IN_PROGRESS" : "ACTIVE",
    progress: f3InProgress ? f3Progress : undefined,
    detail: f3Done
      ? `${data.evaluatedJobCount} posturi evaluate, sesiune completă`
      : f3InProgress
        ? `${data.evaluatedJobCount}/${data.jobCount} posturi evaluate`
        : data.sessionCount > 0
          ? "Sesiune creată — pornește evaluarea"
          : "Creează o sesiune de evaluare",
    actionLabel: f3Done ? "Vezi rezultatele" : data.sessionCount > 0 ? "Continuă evaluarea" : "Pornește evaluarea",
    actionUrl: "/sessions",
    missingInputs: f3Locked ? ["Fișe de post completate (F1)"] : undefined,
  })

  // F4: Ierarhizare
  const f4Locked = !f3Done
  const f4Done = data.isValidated
  phases.push({
    id: "F4",
    name: "Ierarhizare",
    description: "Clasamentul posturilor pe baza scorurilor — structura organizatorică ierarhizată",
    status: f4Locked ? "LOCKED" : f4Done ? "DONE" : "ACTIVE",
    detail: f4Done
      ? `${data.rankedJobCount} posturi ierarhizate și validate`
      : "Verifică și validează ierarhia generată",
    actionLabel: f4Done ? "Vezi ierarhia" : "Validează ierarhia",
    actionUrl: data.sessionCount > 0 ? "/sessions" : undefined,
    missingInputs: f4Locked ? ["Evaluare completată (F3)"] : undefined,
  })

  // Overall progress
  const phaseWeights = [25, 15, 35, 25] // F1 mai greu ca F2, F3 cel mai greu
  let overallProgress = 0
  phases.forEach((p, i) => {
    if (p.status === "DONE") overallProgress += phaseWeights[i]
    else if (p.progress !== undefined) overallProgress += Math.round(phaseWeights[i] * p.progress / 100)
  })

  return { phases, overallProgress: Math.min(100, overallProgress) }
}
