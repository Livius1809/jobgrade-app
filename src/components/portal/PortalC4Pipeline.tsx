"use client"

import CardPipeline from "./CardPipeline"
import { computeC4Pipeline } from "./useC4Pipeline"

interface Props {
  c1c2c3Complete: boolean
  hasClimateResults: boolean
  climateDimensionsScored: number
  hasAuditCultural: boolean
  hasMVV: boolean
  has3CReport: boolean
  hasROICulture: boolean
  hasInterventionPlan: boolean
  hasSimulations: boolean
  hasMonitoring: boolean
  pulseCount: number
  hasStrategicObjectives: boolean
}

export default function PortalC4Pipeline(props: Props) {
  const { phases, overallProgress } = computeC4Pipeline(props)

  return (
    <CardPipeline
      cardId="C4"
      cardName="Dezvoltare"
      phases={phases}
      overallProgress={overallProgress}
    />
  )
}
