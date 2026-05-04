/**
 * PackageExplorer — DEPRECATED, delegă la PricingCalculator
 * Păstrat pentru backward compatibility (importat în PortalClientSection.tsx)
 */
import PricingCalculator from "./PricingCalculator"

export default function PackageExplorer({
  onLayerChange,
  purchasedLayer = 0,
  purchasedPositions = 0,
  purchasedEmployees = 0,
  creditBalance = 0,
  forceOpen = false,
  forceClose = false,
  onPanelOpen,
}: {
  onLayerChange?: (layer: number | null) => void
  purchasedLayer?: number
  purchasedPositions?: number
  purchasedEmployees?: number
  creditBalance?: number
  forceOpen?: boolean
  forceClose?: boolean
  onPanelOpen?: (open: boolean) => void
} = {}) {
  return (
    <PricingCalculator
      mode="portal"
      purchasedLayer={purchasedLayer}
      purchasedPositions={purchasedPositions}
      purchasedEmployees={purchasedEmployees}
      creditBalance={creditBalance}
      onLayerChange={onLayerChange}
      onPanelOpen={onPanelOpen}
      forceOpen={forceOpen}
      forceClose={forceClose}
    />
  )
}
