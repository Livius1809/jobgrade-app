"use client"

import CardPipeline from "./CardPipeline"
import { computeC1Pipeline } from "./useC1Pipeline"

interface Props {
  jobCount: number
  jobsWithDescription: number
  statFunctiiExists: boolean
  departmentCount: number
  sessionCount: number
  sessionStatus: string | null
  evaluatedJobCount: number
  rankedJobCount: number
  isValidated: boolean
}

export default function PortalC1Pipeline(props: Props) {
  const { phases, overallProgress } = computeC1Pipeline(props)

  return (
    <CardPipeline
      cardId="C1"
      cardName="Organizare internă"
      phases={phases}
      overallProgress={overallProgress}
    />
  )
}
