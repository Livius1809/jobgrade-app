/**
 * useC2Pipeline — Calculează starea pipeline-ului C2 din datele clientului
 *
 * C2: CONFORMITATE
 * F1: Grading + clase salariale + trepte
 * F2: Grilă salarială (min/max per grad)
 * F3: Verificare conformitate (pay gap, equity, GDPR, AI Act)
 * F4: Calendar obligații + alerte
 * F5: Audit documente (ROI, CIM, CCM, politici)
 */

import type { PipelinePhase } from "./CardPipeline"

interface C2Data {
  // Din C1
  c1Complete: boolean
  jobCount: number
  // Inputuri C2
  hasSalaryData: boolean
  employeeCount: number
  hasSalaryGrades: boolean
  salaryGradeCount: number
  // Rapoarte
  hasPayGapReport: boolean
  payGapYear: number | null
  hasJointAssessment: boolean
  // Calendar
  complianceEventsTotal: number
  complianceOverdue: number
  complianceCompleted: number
  // Documente
  uploadedDocsCount: number
  hasROI: boolean
  hasCCM: boolean
}

export function computeC2Pipeline(data: C2Data): { phases: PipelinePhase[]; overallProgress: number } {
  const phases: PipelinePhase[] = []

  // F1: Grading + clase salariale
  const f1Locked = !data.c1Complete
  const f1Done = data.hasSalaryGrades && data.salaryGradeCount >= 3
  phases.push({
    id: "F1",
    name: "Grading și clase salariale",
    description: "Clasificarea posturilor pe grade salariale cu trepte de progresie",
    status: f1Locked ? "LOCKED" : f1Done ? "DONE" : data.hasSalaryData ? "ACTIVE" : "ACTIVE",
    detail: f1Done
      ? `${data.salaryGradeCount} grade salariale configurate`
      : data.hasSalaryData
        ? "Date salariale disponibile — configurează gradele"
        : "Introdu datele salariale pentru a genera gradele",
    actionLabel: f1Done ? "Vezi gradele" : "Configurează grilă",
    actionUrl: "/settings/salary-grid",
    missingInputs: f1Locked ? ["Ierarhia posturilor din C1"] : undefined,
  })

  // F2: Grilă salarială
  const f2Locked = !f1Done
  const f2Done = data.hasSalaryGrades && data.salaryGradeCount >= 3
  phases.push({
    id: "F2",
    name: "Grilă salarială",
    description: "Intervale min-max per grad, progresie geometrică, vizualizare și editare",
    status: f2Locked ? "LOCKED" : f2Done ? "DONE" : "ACTIVE",
    detail: f2Done
      ? `${data.salaryGradeCount} grade cu intervale configurate`
      : "Generează grila din wizard sau editează manual",
    actionLabel: f2Done ? "Editează grila" : "Generează grilă",
    actionUrl: "/settings/salary-grid",
    missingInputs: f2Locked ? ["Grade salariale (F1)"] : undefined,
  })

  // F3: Verificare conformitate
  const f3Locked = !data.hasSalaryData
  const f3Done = data.hasPayGapReport
  const f3Partial = data.employeeCount > 0
  phases.push({
    id: "F3",
    name: "Verificare conformitate",
    description: "Pay gap Art.9, joint pay Art.10, echitate internă, GDPR, AI Act",
    status: f3Locked ? "LOCKED" : f3Done ? "DONE" : f3Partial ? "IN_PROGRESS" : "ACTIVE",
    progress: f3Partial && !f3Done ? (data.hasPayGapReport ? 80 : data.hasJointAssessment ? 60 : 30) : undefined,
    detail: f3Done
      ? `Raport pay gap ${data.payGapYear || "curent"} generat`
      : f3Partial
        ? `${data.employeeCount} angajați încărcați — generează raportul`
        : "Încarcă datele salariale pentru verificare",
    actionLabel: f3Done ? "Vezi rapoarte" : "Verifică conformitate",
    actionUrl: "/compliance/equity",
    missingInputs: f3Locked ? ["Date salariale per angajat"] : undefined,
  })

  // F4: Calendar obligații
  const f4Done = data.complianceCompleted > 0
  const f4HasOverdue = data.complianceOverdue > 0
  phases.push({
    id: "F4",
    name: "Calendar obligații",
    description: "Termene legale, alerte, status obligații recurente",
    status: f4HasOverdue ? "IN_PROGRESS" : f4Done ? "DONE" : "ACTIVE",
    detail: f4HasOverdue
      ? `${data.complianceOverdue} obligații depășite — necesită atenție`
      : f4Done
        ? `${data.complianceCompleted}/${data.complianceEventsTotal} obligații îndeplinite`
        : `${data.complianceEventsTotal} obligații de monitorizat`,
    actionLabel: f4HasOverdue ? "Vezi urgente" : "Calendar",
    actionUrl: "/compliance/calendar",
  })

  // F5: Audit documente
  const f5Done = data.uploadedDocsCount >= 2 && data.hasROI
  const f5Partial = data.uploadedDocsCount > 0 || data.hasROI || data.hasCCM
  phases.push({
    id: "F5",
    name: "Audit documente",
    description: "Verificare ROI (clauza salariu), audit contracte, politici interne, CCM",
    status: f5Done ? "DONE" : f5Partial ? "IN_PROGRESS" : "ACTIVE",
    progress: f5Partial && !f5Done
      ? Math.round(((data.hasROI ? 1 : 0) + (data.hasCCM ? 1 : 0) + Math.min(2, data.uploadedDocsCount)) / 4 * 100)
      : undefined,
    detail: f5Done
      ? `${data.uploadedDocsCount} documente verificate`
      : f5Partial
        ? `${data.uploadedDocsCount} documente încărcate${data.hasROI ? ", ROI verificat" : ""}${data.hasCCM ? ", CCM verificat" : ""}`
        : "Încarcă ROI, CCM și politicile interne pentru audit",
    actionLabel: "Audit documente",
    actionUrl: "/compliance/documents",
  })

  // Overall progress
  const phaseWeights = [20, 15, 30, 15, 20]
  let overallProgress = 0
  phases.forEach((p, i) => {
    if (p.status === "DONE") overallProgress += phaseWeights[i]
    else if (p.progress !== undefined) overallProgress += Math.round(phaseWeights[i] * p.progress / 100)
  })

  return { phases, overallProgress: Math.min(100, overallProgress) }
}
