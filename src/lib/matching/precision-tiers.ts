/**
 * precision-tiers.ts — Matching precision by B2C credit balance
 *
 * Higher credit balance = more features + stricter threshold (higher quality matches).
 * BASIC: free tier, broad matching (50%+)
 * STANDARD: gap analysis + compatibility report (65%+)
 * PREMIUM: full package incl. interview prep + counseling (75%+)
 */

export interface MatchingTier {
  name: string
  minCredits: number
  matchThreshold: number
  features: string[]
}

export const MATCHING_TIERS: MatchingTier[] = [
  {
    name: "BASIC",
    minCredits: 0,
    matchThreshold: 50,
    features: ["matching_basic", "notification"],
  },
  {
    name: "STANDARD",
    minCredits: 5,
    matchThreshold: 65,
    features: ["matching_standard", "gap_analysis", "compatibility_report"],
  },
  {
    name: "PREMIUM",
    minCredits: 15,
    matchThreshold: 75,
    features: ["matching_premium", "gap_analysis", "interview_prep", "counseling", "detailed_report"],
  },
]

/**
 * Returns the highest tier the user can afford based on credit balance.
 */
export function getMatchingTier(creditBalance: number): MatchingTier {
  // Walk tiers in reverse (highest first), return first that user can afford
  for (let i = MATCHING_TIERS.length - 1; i >= 0; i--) {
    if (creditBalance >= MATCHING_TIERS[i].minCredits) {
      return MATCHING_TIERS[i]
    }
  }
  return MATCHING_TIERS[0]
}

/**
 * Returns the minimum match score threshold for a given credit balance.
 */
export function calculateMatchThreshold(creditBalance: number): number {
  return getMatchingTier(creditBalance).matchThreshold
}
