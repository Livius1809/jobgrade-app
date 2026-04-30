"use client"

import CardPipeline from "./CardPipeline"
import { computeC3Pipeline } from "./useC3Pipeline"

interface Props {
  c1c2Complete: boolean
  jobCount: number
  hasSalaryGrades: boolean
  kpiCount: number
  jobsWithKpi: number
  hasBenchmarkData: boolean
  hasVariableComp: boolean
  evaluatedEmployees: number
  totalEmployees: number
  hasPsychometricResults: boolean
  hasSociogram: boolean
  teamCount: number
  teamsWithSociogram: number
  hasMatchingActive: boolean
  processMapCount: number
  hasQualityManual: boolean
  sopCount: number
}

export default function PortalC3Pipeline(props: Props) {
  const { phases, overallProgress } = computeC3Pipeline(props)

  return (
    <CardPipeline
      cardId="C3"
      cardName="Competitivitate"
      phases={phases}
      overallProgress={overallProgress}
    />
  )
}
