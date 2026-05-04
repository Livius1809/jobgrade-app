/**
 * PackageSelector — DEPRECATED, delegă la PricingCalculator
 * Păstrat pentru backward compatibility (importat în page-legacy.tsx)
 */
import PricingCalculator from "./PricingCalculator"

interface Props {
  positionCount: number
  employeeCount: number
  creditBalance: number
  currentTierId?: string
  billingPeriod?: "monthly" | "annual"
}

export default function PackageSelector({ positionCount, employeeCount, creditBalance, currentTierId }: Props) {
  return (
    <PricingCalculator
      mode="portal"
      purchasedPositions={positionCount}
      purchasedEmployees={employeeCount}
      creditBalance={creditBalance}
      currentTier={currentTierId as any}
    />
  )
}
