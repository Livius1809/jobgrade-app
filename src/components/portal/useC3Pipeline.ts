/**
 * useC3Pipeline — Calculează starea pipeline-ului C3 din datele clientului
 *
 * C3: COMPETITIVITATE
 * F1: KPI per post/echipă/departament
 * F2: Pachet salarial (fix+variabil) + benchmark vs piață
 * F3: Evaluare personal (baterie psihometrică)
 * F4: Profil echipe (sociogramă Balint + factori + 3 rapoarte)
 * F5: Matching B2B↔B2C
 * F6: Hartă procese (furnizor→proces→client)
 * F7: Manual calitate (SOP + KPI + RACI)
 * F8: Simulări (exploatează F1-F7)
 */

import type { PipelinePhase } from "./CardPipeline"

interface C3Data {
  // Dependențe C1+C2
  c1c2Complete: boolean
  jobCount: number
  hasSalaryGrades: boolean
  // F1: KPI
  kpiCount: number
  jobsWithKpi: number
  // F2: Pachete + benchmark
  hasBenchmarkData: boolean
  hasVariableComp: boolean
  // F3: Evaluare personal
  evaluatedEmployees: number
  totalEmployees: number
  hasPsychometricResults: boolean
  // F4: Profil echipe
  hasSociogram: boolean
  teamCount: number
  teamsWithSociogram: number
  // F5: Matching
  hasMatchingActive: boolean
  // F6: Hartă procese
  processMapCount: number
  // F7: Manual calitate
  hasQualityManual: boolean
  sopCount: number
}

export function computeC3Pipeline(data: C3Data): { phases: PipelinePhase[]; overallProgress: number } {
  const phases: PipelinePhase[] = []

  // F1: KPI
  const f1Locked = !data.c1c2Complete
  const f1Done = data.kpiCount >= 3 && data.jobsWithKpi >= 2
  const f1Partial = data.kpiCount > 0
  phases.push({
    id: "F1",
    name: "KPI",
    description: "Indicatori de performanță per post, echipă și departament — target, frecvență, responsabil",
    status: f1Locked ? "LOCKED" : f1Done ? "DONE" : f1Partial ? "IN_PROGRESS" : "ACTIVE",
    progress: f1Partial && !f1Done ? Math.round((data.jobsWithKpi / Math.max(1, data.jobCount)) * 100) : undefined,
    detail: f1Done
      ? `${data.kpiCount} KPI configurați pe ${data.jobsWithKpi} posturi`
      : f1Partial
        ? `${data.kpiCount} KPI definiți, ${data.jobsWithKpi}/${data.jobCount} posturi acoperite`
        : "Definește KPI-uri per post — baza pentru evaluare și pachete variabile",
    actionLabel: f1Done ? "Gestionează KPI" : "Configurează KPI",
    actionUrl: "/settings",
    missingInputs: f1Locked ? ["C1 + C2 completate"] : undefined,
  })

  // F2: Pachet salarial + benchmark
  const f2Locked = !data.hasSalaryGrades
  const f2Done = data.hasBenchmarkData && data.hasVariableComp
  const f2Partial = data.hasBenchmarkData || data.hasVariableComp
  phases.push({
    id: "F2",
    name: "Pachete salariale + benchmark",
    description: "Structura compensație fix+variabil per grad, comparare cu piața, configurare parte variabilă",
    status: f2Locked ? "LOCKED" : f2Done ? "DONE" : f2Partial ? "IN_PROGRESS" : "ACTIVE",
    detail: f2Done
      ? "Pachete configurate + benchmark actualizat"
      : f2Partial
        ? `${data.hasBenchmarkData ? "Benchmark disponibil" : "Benchmark lipsă"}, ${data.hasVariableComp ? "variabil configurat" : "variabil neonfigurat"}`
        : "Configurează pachete salariale și compară cu piața",
    actionLabel: "Pachete + benchmark",
    actionUrl: "/benchmark",
    missingInputs: f2Locked ? ["Grilă salarială (C2)"] : undefined,
  })

  // F3: Evaluare personal
  const f3Locked = !data.c1c2Complete
  const f3Done = data.hasPsychometricResults && data.evaluatedEmployees >= 3
  const f3Partial = data.evaluatedEmployees > 0
  const f3Progress = data.totalEmployees > 0 ? Math.round((data.evaluatedEmployees / data.totalEmployees) * 100) : 0
  phases.push({
    id: "F3",
    name: "Evaluare personal",
    description: "Baterie psihometrică per angajat — profil individual, compatibilitate om↔post, 3 niveluri diseminare",
    status: f3Locked ? "LOCKED" : f3Done ? "DONE" : f3Partial ? "IN_PROGRESS" : "ACTIVE",
    progress: f3Partial && !f3Done ? f3Progress : undefined,
    detail: f3Done
      ? `${data.evaluatedEmployees} angajați evaluați — profiluri complete`
      : f3Partial
        ? `${data.evaluatedEmployees}/${data.totalEmployees} angajați evaluați`
        : "Configurează și aplică bateria psihometrică",
    actionLabel: f3Done ? "Vezi profiluri" : "Evaluează personal",
    actionUrl: "/psychometrics",
    missingInputs: f3Locked ? ["C1 + C2 completate"] : undefined,
  })

  // F4: Profil echipe
  const f4Locked = !f3Partial
  const f4Done = data.hasSociogram && data.teamsWithSociogram >= 2
  const f4Partial = data.hasSociogram || data.teamsWithSociogram > 0
  phases.push({
    id: "F4",
    name: "Profil echipe",
    description: "Sociogramă Balint, dinamică 5 factori, 3 rapoarte (manager / HR / superior)",
    status: f4Locked ? "LOCKED" : f4Done ? "DONE" : f4Partial ? "IN_PROGRESS" : "ACTIVE",
    progress: f4Partial && !f4Done && data.teamCount > 0
      ? Math.round((data.teamsWithSociogram / data.teamCount) * 100) : undefined,
    detail: f4Done
      ? `${data.teamsWithSociogram} echipe profilate cu sociogramă`
      : f4Partial
        ? `${data.teamsWithSociogram}/${data.teamCount} echipe cu sociogramă`
        : "Aplică sociograma pe echipe pentru a genera profilul de dinamică",
    actionLabel: f4Done ? "Vezi echipe" : "Profilare echipe",
    actionUrl: "/sociogram",
    missingInputs: f4Locked ? ["Evaluare personal (F3) începută"] : undefined,
  })

  // F5: Matching B2B↔B2C
  const f5Locked = !f3Done
  phases.push({
    id: "F5",
    name: "Matching B2B ↔ B2C",
    description: "Candidați pre-evaluați pe 6 criterii JE — fit cultural + complementaritate echipă",
    status: f5Locked ? "LOCKED" : data.hasMatchingActive ? "DONE" : "ACTIVE",
    detail: data.hasMatchingActive
      ? "Matching activ — candidați disponibili"
      : "Activează matching-ul cu platforma B2C",
    actionLabel: "Matching",
    actionUrl: "/settings",
    missingInputs: f5Locked ? ["Evaluare personal completă (F3)"] : undefined,
  })

  // F6: Hartă procese
  const f6Done = data.processMapCount >= 2
  const f6Partial = data.processMapCount > 0
  phases.push({
    id: "F6",
    name: "Hartă procese",
    description: "Furnizor → proces → client per departament și companie, procese principale vs auxiliare",
    status: f6Done ? "DONE" : f6Partial ? "IN_PROGRESS" : "ACTIVE",
    detail: f6Done
      ? `${data.processMapCount} procese mapate`
      : f6Partial
        ? `${data.processMapCount} procese definite — continuă maparea`
        : "Modelează procesele organizației — baza pentru manual calitate",
    actionLabel: f6Done ? "Vezi procese" : "Mapează procese",
    actionUrl: "/settings",
  })

  // F7: Manual calitate
  const f7Locked = !f6Partial
  const f7Done = data.hasQualityManual && data.sopCount >= 3
  const f7Partial = data.sopCount > 0
  phases.push({
    id: "F7",
    name: "Manual calitate",
    description: "SOP + KPI + RACI per proces, ISO-compatible, integrat cu harta procese",
    status: f7Locked ? "LOCKED" : f7Done ? "DONE" : f7Partial ? "IN_PROGRESS" : "ACTIVE",
    detail: f7Done
      ? `Manual complet — ${data.sopCount} proceduri documentate`
      : f7Partial
        ? `${data.sopCount} proceduri definite`
        : "Generează manual calitate din procesele mapate",
    actionLabel: f7Done ? "Vezi manual" : "Generează manual",
    actionUrl: "/settings",
    missingInputs: f7Locked ? ["Hartă procese (F6) începută"] : undefined,
  })

  // F8: Simulări
  const hasData = f1Done || f3Partial || f4Partial || f6Partial
  phases.push({
    id: "F8",
    name: "Simulări",
    description: "Schimb om, ocup poziție vacantă, modific KPI/ponderi, restructurare, impact relații — exploatează F1-F7",
    status: hasData ? "ACTIVE" : "LOCKED",
    detail: hasData
      ? "Simulări disponibile din datele acumulate — mai multe date = mai multe opțiuni"
      : "Completează cel puțin o fază (F1-F7) pentru a activa simulările",
    actionLabel: "Simulează",
    actionUrl: "/settings",
    missingInputs: hasData ? undefined : ["Date din cel puțin o fază (F1-F7)"],
  })

  // Overall progress
  const w = [10, 10, 20, 15, 5, 15, 10, 15]
  let overallProgress = 0
  phases.forEach((p, i) => {
    if (p.status === "DONE") overallProgress += w[i]
    else if (p.progress !== undefined) overallProgress += Math.round(w[i] * p.progress / 100)
  })

  return { phases, overallProgress: Math.min(100, overallProgress) }
}
