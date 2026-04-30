"use client"

/**
 * OwnerServicePipelines — Arată progresul C1-C4 pe Owner Dashboard
 *
 * Aceleași pipeline-uri ca pe portal (prototip raport client).
 * Datele se încarcă din API, nu din props server.
 */

import { useState, useEffect } from "react"
import CardPipeline from "@/components/portal/CardPipeline"
import { computeC1Pipeline } from "@/components/portal/useC1Pipeline"
import { computeC2Pipeline } from "@/components/portal/useC2Pipeline"
import { computeC3Pipeline } from "@/components/portal/useC3Pipeline"
import { computeC4Pipeline } from "@/components/portal/useC4Pipeline"

export default function OwnerServicePipelines() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/owner/service-status")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-slate-400 text-center py-4">Se încarcă...</p>
  if (!data) return null

  const c1 = computeC1Pipeline(data.c1)
  const c2 = computeC2Pipeline(data.c2)
  const c3 = computeC3Pipeline(data.c3)
  const c4 = computeC4Pipeline(data.c4)

  return (
    <div className="space-y-3">
      <CardPipeline cardId="C1" cardName="Organizare internă" phases={c1.phases} overallProgress={c1.overallProgress} />
      <CardPipeline cardId="C2" cardName="Conformitate" phases={c2.phases} overallProgress={c2.overallProgress} />
      <CardPipeline cardId="C3" cardName="Competitivitate" phases={c3.phases} overallProgress={c3.overallProgress} />
      <CardPipeline cardId="C4" cardName="Dezvoltare" phases={c4.phases} overallProgress={c4.overallProgress} />
    </div>
  )
}
