/**
 * useC4Pipeline — Calculează starea pipeline-ului C4 din datele clientului
 *
 * C4: DEZVOLTARE
 * F1: Climat organizațional (chestionar bottom-up)
 * F2: Audit cultural (7 dimensiuni + Hofstede/David)
 * F3: 3C — Consecvență, Coerență, Congruență (F3D vs F3A)
 * F4: ROI cultură (costul distanței F3A→F3D)
 * F5: Plan intervenție multi-nivel
 * F6: Simulator (scenarii F3D sau greenfield)
 * F7: Monitorizare evoluție (organismul clientului)
 */

import type { PipelinePhase } from "./CardPipeline"

interface C4Data {
  c1c2c3Complete: boolean
  // F1
  hasClimateResults: boolean
  climateDimensionsScored: number
  // F2
  hasAuditCultural: boolean
  hasMVV: boolean
  // F3
  has3CReport: boolean
  // F4
  hasROICulture: boolean
  // F5
  hasInterventionPlan: boolean
  // F6
  hasSimulations: boolean
  // F7
  hasMonitoring: boolean
  pulseCount: number
  // Obiective CA
  hasStrategicObjectives: boolean
}

export function computeC4Pipeline(data: C4Data): { phases: PipelinePhase[]; overallProgress: number } {
  const phases: PipelinePhase[] = []

  // F1: Climat organizațional
  const f1Done = data.hasClimateResults
  phases.push({
    id: "F1",
    name: "Climat organizațional",
    description: "Chestionar bottom-up pe niveluri ierarhice — cum SE SIMTE organizația",
    status: f1Done ? "DONE" : data.climateDimensionsScored > 0 ? "IN_PROGRESS" : "ACTIVE",
    progress: data.climateDimensionsScored > 0 && !f1Done ? Math.round((data.climateDimensionsScored / 8) * 100) : undefined,
    detail: f1Done
      ? "Rezultate climat disponibile pe toate dimensiunile"
      : data.climateDimensionsScored > 0
        ? `${data.climateDimensionsScored}/8 dimensiuni evaluate`
        : "Aplică chestionarul de climat — 10 min per angajat, anonim",
    actionLabel: f1Done ? "Vezi rezultate" : "Aplică chestionar",
    actionUrl: "/climate",
  })

  // F2: Audit cultural
  const f2Locked = !data.hasMVV
  const f2Done = data.hasAuditCultural
  phases.push({
    id: "F2",
    name: "Audit cultural",
    description: "7 dimensiuni culturale + calibrare Hofstede / Daniel David / GLOBE — cum FUNCȚIONEAZĂ cultural",
    status: f2Locked ? "LOCKED" : f2Done ? "DONE" : "ACTIVE",
    detail: f2Done
      ? "Audit cultural complet — calibrat pe cultura românească"
      : "Analizează cultura organizațională pe 7 dimensiuni",
    actionLabel: f2Done ? "Vezi audit" : "Pornește audit",
    actionUrl: "/culture/audit",
    missingInputs: f2Locked ? ["MVV (misiune, viziune, valori) definite"] : undefined,
  })

  // F3: 3C — Consecvență, Coerență, Congruență
  const f3Locked = !f1Done || !f2Done
  const f3Done = data.has3CReport
  phases.push({
    id: "F3",
    name: "3C — Consecvență · Coerență · Congruență",
    description: "F3(D) declarat vs F3(A) actual — cât de aliniată e organizația între ce spune și ce face",
    status: f3Locked ? "LOCKED" : f3Done ? "DONE" : "ACTIVE",
    detail: f3Done
      ? "Raport 3C disponibil — gap-uri identificate per dimensiune"
      : "Analizează distanța între declarat (MVV, politici) și realitate (climat, date HR)",
    actionLabel: f3Done ? "Vezi raport 3C" : "Generează 3C",
    actionUrl: "/culture/3c-report",
    missingInputs: f3Locked ? ["Climat (F1) + audit cultural (F2) completate"] : undefined,
  })

  // F4: ROI cultură
  const f4Locked = !f3Done
  phases.push({
    id: "F4",
    name: "ROI cultură",
    description: "Costul distanței F3(A) → F3(D) în cifre: turnover, comunicare deficitară, rezistență, silozuri",
    status: f4Locked ? "LOCKED" : data.hasROICulture ? "DONE" : "ACTIVE",
    detail: data.hasROICulture
      ? "ROI calculat — costul de a NU schimba, în lei"
      : "Calculează impactul financiar al gap-urilor culturale",
    actionLabel: data.hasROICulture ? "Vezi ROI" : "Calculează ROI",
    actionUrl: "/culture/roi",
    missingInputs: f4Locked ? ["Raport 3C (F3)"] : undefined,
  })

  // F5: Plan intervenție
  const f5Locked = !f3Done || !data.hasStrategicObjectives
  phases.push({
    id: "F5",
    name: "Plan intervenție multi-nivel",
    description: "Drumul de la F3(A) la F3(D) — strategic + tactic + operațional + individual + transversal",
    status: f5Locked ? "LOCKED" : data.hasInterventionPlan ? "DONE" : "ACTIVE",
    detail: data.hasInterventionPlan
      ? "Plan de intervenție activ cu timeline, KPI și responsabili"
      : "Generează plan de transformare pe mai multe niveluri organizaționale",
    actionLabel: data.hasInterventionPlan ? "Vezi plan" : "Creează plan",
    actionUrl: "/culture/intervention-plan",
    missingInputs: f5Locked
      ? [!f3Done ? "Raport 3C (F3)" : "", !data.hasStrategicObjectives ? "Obiective strategice CA" : ""].filter(Boolean)
      : undefined,
  })

  // F6: Simulator
  const f6Locked = !f3Done
  phases.push({
    id: "F6",
    name: "Simulator",
    description: "Scenarii F3(D): dacă schimb X, cum arată noul F3? Sau business plan complet nou (greenfield)",
    status: f6Locked ? "LOCKED" : data.hasSimulations ? "DONE" : "ACTIVE",
    detail: data.hasSimulations
      ? "Simulări disponibile — explorează scenarii"
      : "Simulează impactul schimbărilor pe cultura și structura organizației",
    actionLabel: "Simulează",
    actionUrl: "/culture/simulator",
    missingInputs: f6Locked ? ["Raport 3C (F3)"] : undefined,
  })

  // F7: Monitorizare evoluție
  const f7HasData = data.pulseCount > 0 || data.hasMonitoring
  phases.push({
    id: "F7",
    name: "Monitorizare evoluție",
    description: "Organismul organizației: puls lunar, maturitate trimestrial, impact intervenții, raport CA anual",
    status: f7HasData ? "IN_PROGRESS" : f3Done ? "ACTIVE" : "LOCKED",
    detail: f7HasData
      ? `${data.pulseCount} măsurători puls — monitorizare activă`
      : "Activează monitorizarea periodică după completarea planului",
    actionLabel: f7HasData ? "Vezi evoluție" : "Activează monitorizare",
    actionUrl: "/culture/monitoring",
    missingInputs: !f3Done ? ["Raport 3C (F3) completat"] : undefined,
  })

  // Overall progress
  const w = [15, 15, 20, 10, 15, 10, 15]
  let overallProgress = 0
  phases.forEach((p, i) => {
    if (p.status === "DONE") overallProgress += w[i]
    else if (p.progress !== undefined) overallProgress += Math.round(w[i] * p.progress / 100)
  })

  return { phases, overallProgress: Math.min(100, overallProgress) }
}
