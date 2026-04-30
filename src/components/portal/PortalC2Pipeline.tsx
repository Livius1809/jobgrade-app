"use client"

import CardPipeline from "./CardPipeline"
import { computeC2Pipeline } from "./useC2Pipeline"

interface Props {
  c1Complete: boolean
  jobCount: number
  hasSalaryData: boolean
  employeeCount: number
  hasSalaryGrades: boolean
  salaryGradeCount: number
  hasPayGapReport: boolean
  payGapYear: number | null
  hasJointAssessment: boolean
  complianceEventsTotal: number
  complianceOverdue: number
  complianceCompleted: number
  uploadedDocsCount: number
  hasROI: boolean
  hasCCM: boolean
}

export default function PortalC2Pipeline(props: Props) {
  const { phases, overallProgress } = computeC2Pipeline(props)

  return (
    <CardPipeline
      cardId="C2"
      cardName="Conformitate"
      phases={phases}
      overallProgress={overallProgress}
    />
  )
}
