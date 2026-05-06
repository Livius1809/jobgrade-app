/**
 * /candidates — Sectiune candidati B2C in portalul B2B
 *
 * Listeaza candidati B2C anonimizati care au match pe pozitiile companiei.
 * Scoruri de compatibilitate, filtrare, actiuni.
 */

import { auth } from "@/lib/auth"
import { getTenantData } from "@/lib/tenant-storage"
import CandidatesList from "@/components/candidates/CandidatesList"

export const metadata = { title: "Candidati" }
export const dynamic = "force-dynamic"

interface MatchResult {
  pseudonym: string
  compatibilityScore: number
  strengths: string[]
  gaps: string[]
  recommendation: string
  jobId: string
  jobTitle: string
  matchedAt: string
}

interface MatchingState {
  requests: Array<{
    id: string
    jobId: string
    jobTitle: string
    status: string
    matches?: MatchResult[]
  }>
}

export default async function CandidatesPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const matchingState = await getTenantData<MatchingState>(tenantId, "MATCHING_REQUESTS")

  // Flatten all matches from all matching requests
  const allMatches: MatchResult[] = []
  if (matchingState?.requests) {
    for (const request of matchingState.requests) {
      if (request.matches) {
        for (const match of request.matches) {
          allMatches.push({
            ...match,
            jobId: request.jobId,
            jobTitle: request.jobTitle,
            matchedAt: match.matchedAt ?? new Date().toISOString(),
          })
        }
      }
    }
  }

  // Sort by compatibility score descending
  allMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore)

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Candidati</h1>
        <p className="text-sm text-gray-500 mt-1">
          Candidati compatibili identificati din platforma B2C (anonimizati pana la accept reciproc)
        </p>
      </div>
      <CandidatesList candidates={allMatches} />
    </div>
  )
}
