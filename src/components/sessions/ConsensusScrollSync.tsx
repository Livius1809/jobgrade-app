"use client"

/**
 * ConsensusScrollSync — Wrapper scroll sync pentru sesiunea de consens
 *
 * Adaugă sincronizarea scroll-ului între evaluatori în sesiunea de consens (C1 F3).
 * Fiecare evaluator vede criteriul activ sincronizat cu ceilalți.
 * În lateral: inferența AI per criteriu (de ce a propus scorul respectiv).
 *
 * Se compune cu ConsensusView existent — nu-l înlocuiește.
 */

import { useCallback, useEffect, useRef, useState } from "react"

interface CriterionInference {
  criterionId: string
  criterionName: string
  /** De ce AI-ul a propus acest scor (dacă evaluarea a fost AI-assisted) */
  aiReasoning?: string
  /** Distribuția explicată */
  distributionInsight: string
  /** Ce înseamnă divergența */
  divergenceExplanation?: string
  /** Recomandare pentru facilitator */
  facilitatorHint?: string
}

interface ConsensusScrollSyncProps {
  sessionId: string
  sessionJobId: string
  /** Criteriile cu inferențe generate */
  criterionInferences: CriterionInference[]
  /** Criteriul activ curent (din server sau local) */
  activeCriterionId?: string
  /** Callback-ul de sync (trimite criteriul activ la ceilalți prin polling/WS) */
  onCriterionChange?: (criterionId: string) => void
  /** Mod: facilitator vede tot, evaluator vede doar criteriul activ */
  isFacilitator: boolean
  children: React.ReactNode
}

export function ConsensusScrollSync({
  sessionId,
  sessionJobId,
  criterionInferences,
  activeCriterionId,
  onCriterionChange,
  isFacilitator,
  children,
}: ConsensusScrollSyncProps) {
  const [localActiveCriterion, setLocalActiveCriterion] = useState<string | null>(
    activeCriterionId || null
  )

  // Sync from external (other evaluators scrolling)
  useEffect(() => {
    if (activeCriterionId && activeCriterionId !== localActiveCriterion) {
      setLocalActiveCriterion(activeCriterionId)
      // Scroll to that criterion in the wrapped view
      const el = document.getElementById(`criterion-${activeCriterionId}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [activeCriterionId, localActiveCriterion])

  // Notify others when local scroll changes
  const handleLocalCriterionChange = useCallback(
    (criterionId: string) => {
      setLocalActiveCriterion(criterionId)
      onCriterionChange?.(criterionId)
    },
    [onCriterionChange]
  )

  const activeInference = criterionInferences.find(
    (ci) => ci.criterionId === localActiveCriterion
  )

  return (
    <div className="flex gap-0 h-full">
      {/* Main content (ConsensusView wrapped) */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Side panel: inference per criteriu (facilitator vede tot, evaluator vede sumar) */}
      {activeInference && (
        <aside className="w-80 border-l bg-slate-50 dark:bg-slate-900 overflow-y-auto p-4">
          <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            {isFacilitator ? "Inferență criteriu" : "Context criteriu"}
          </div>

          <div className="space-y-4">
            {/* Criterion header */}
            <div>
              <h4 className="text-sm font-semibold">{activeInference.criterionName}</h4>
            </div>

            {/* Distribution insight */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Distribuție
              </span>
              <p className="text-xs mt-1 leading-relaxed">
                {activeInference.distributionInsight}
              </p>
            </div>

            {/* AI reasoning (facilitator only) */}
            {isFacilitator && activeInference.aiReasoning && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Raționament AI
                </span>
                <p className="text-xs mt-1 leading-relaxed font-mono bg-muted/50 p-2 rounded">
                  {activeInference.aiReasoning}
                </p>
              </div>
            )}

            {/* Divergence explanation */}
            {activeInference.divergenceExplanation && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  De ce există divergență
                </span>
                <p className="text-xs mt-1 leading-relaxed">
                  {activeInference.divergenceExplanation}
                </p>
              </div>
            )}

            {/* Facilitator hint */}
            {isFacilitator && activeInference.facilitatorHint && (
              <div className="border-l-2 border-amber-400 pl-3 py-1">
                <span className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
                  Sugestie facilitator
                </span>
                <p className="text-xs mt-1 leading-relaxed text-amber-800 dark:text-amber-200">
                  {activeInference.facilitatorHint}
                </p>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
