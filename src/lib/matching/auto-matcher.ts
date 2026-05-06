/**
 * auto-matcher.ts — Periodic matching of B2C candidates with B2B jobs
 *
 * Runs via cron (maintenance route) or on-demand after CV upload.
 * Respects: filters, precision tiers, already-matched pairs.
 */

import { prisma } from "@/lib/prisma"
import { matchProfiles, type CriteriaProfile } from "@/lib/b2c/matching-engine"
import { calculateMatchThreshold } from "@/lib/matching/precision-tiers"
import { createRecruitmentFlow, hasActiveFlow } from "@/lib/matching/recruitment-flow"
import { getAppUrl } from "@/lib/get-app-url"

// ── Types ──────────────────────────────────────────────────────────────────

interface MatchingPreferences {
  targetIndustries?: string[]
  excludedCompanies?: string[]
  preferredLocations?: string[]
  minMatchScore?: number
}

interface AutoMatchResult {
  newMatches: number
  notifications: number
}

// ── Auto-matcher ───────────────────────────────────────────────────────────

/**
 * Runs periodically (via cron or after CV upload).
 * Matches all eligible B2C candidates with all active B2B jobs.
 * Respects filters, precision tiers, and already-matched pairs.
 */
export async function runAutoMatching(options?: {
  candidateId?: string
  jobId?: string
}): Promise<AutoMatchResult> {
  const p = prisma as any
  let newMatches = 0
  let notifications = 0

  try {
    // 1. Query B2C users with status ACTIVE and CV uploaded
    const candidateFilter: Record<string, unknown> = {
      status: "ACTIVE",
      deletedAt: null,
    }
    if (options?.candidateId) {
      candidateFilter.id = options.candidateId
    }

    const b2cUsers = await p.b2CUser.findMany({
      where: candidateFilter,
      select: { id: true, alias: true },
      take: 100, // batch size
    })

    if (b2cUsers.length === 0) return { newMatches: 0, notifications: 0 }

    // Get CV data for each candidate
    const candidatesWithCV: Array<{
      id: string
      alias: string
      profile: CriteriaProfile
      preferences: MatchingPreferences
      creditBalance: number
    }> = []

    for (const user of b2cUsers) {
      const card3 = await p.b2CCardProgress.findFirst({
        where: { userId: user.id, card: "CARD_3" },
        select: { cvExtractedData: true },
      })

      if (!card3?.cvExtractedData) continue

      const extractedData = card3.cvExtractedData as Record<string, unknown>
      const candidateProfile = (extractedData.criteriaEstimate as CriteriaProfile) || {}

      // Skip if no criteria extracted
      if (Object.keys(candidateProfile).length === 0) continue

      // Load preferences
      const prefsConfig = await prisma.systemConfig.findUnique({
        where: { key: `B2C_MATCHING_PREFS_${user.id}` },
      })
      const preferences: MatchingPreferences = prefsConfig
        ? JSON.parse(prefsConfig.value)
        : {}

      // Load credit balance
      const creditRec = await p.b2CCreditBalance.findUnique({
        where: { userId: user.id },
        select: { balance: true },
      })
      const creditBalance = creditRec?.balance ?? 0

      candidatesWithCV.push({
        id: user.id,
        alias: user.alias,
        profile: candidateProfile,
        preferences,
        creditBalance,
      })
    }

    if (candidatesWithCV.length === 0) return { newMatches: 0, notifications: 0 }

    // 2. Query B2B jobs with isActive=true
    const jobFilter: Record<string, unknown> = { isActive: true }
    if (options?.jobId) {
      jobFilter.id = options.jobId
    }

    const jobs = await prisma.job.findMany({
      where: jobFilter,
      include: {
        department: { select: { name: true } },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            company: { select: { industry: true, county: true } },
          },
        },
      },
      take: 200,
    })

    if (jobs.length === 0) return { newMatches: 0, notifications: 0 }

    // 3. Get job criteria from evaluations
    const jobProfiles: Map<string, { profile: CriteriaProfile; tenantId: string; industry?: string; county?: string }> = new Map()

    for (const job of jobs) {
      // Get criteria from evaluations
      const evaluations = await prisma.evaluation.findMany({
        where: {
          assignment: { sessionJob: { jobId: job.id } },
        },
        include: { criterion: true, subfactor: true },
        orderBy: { updatedAt: "desc" },
      })

      const profile: CriteriaProfile = {}
      for (const ev of evaluations) {
        const key = ev.criterion.name as keyof CriteriaProfile
        if (!profile[key]) {
          profile[key] = ev.subfactor.code
        }
      }

      // Skip jobs without evaluation data
      if (Object.keys(profile).length === 0) continue

      jobProfiles.set(job.id, {
        profile,
        tenantId: job.tenantId,
        industry: (job.tenant as any)?.company?.industry,
        county: (job.tenant as any)?.company?.county,
      })
    }

    // 4. Match each candidate against each job
    for (const candidate of candidatesWithCV) {
      const threshold = candidate.preferences.minMatchScore
        ?? calculateMatchThreshold(candidate.creditBalance)

      for (const job of jobs) {
        const jobData = jobProfiles.get(job.id)
        if (!jobData) continue

        // Apply B2C filters
        if (candidate.preferences.excludedCompanies?.length) {
          const tenantName = (job.tenant as any)?.name?.toLowerCase() ?? ""
          const tenantSlug = (job.tenant as any)?.slug?.toLowerCase() ?? ""
          const isExcluded = candidate.preferences.excludedCompanies.some(
            (exc) => tenantName.includes(exc.toLowerCase()) || tenantSlug.includes(exc.toLowerCase()),
          )
          if (isExcluded) continue
        }

        if (candidate.preferences.targetIndustries?.length) {
          const jobIndustry = jobData.industry?.toLowerCase() ?? ""
          const matchesIndustry = candidate.preferences.targetIndustries.some(
            (ind) => jobIndustry.includes(ind.toLowerCase()),
          )
          if (!matchesIndustry) continue
        }

        if (candidate.preferences.preferredLocations?.length) {
          const jobCounty = jobData.county?.toLowerCase() ?? ""
          const matchesLocation = candidate.preferences.preferredLocations.some(
            (loc) => jobCounty.includes(loc.toLowerCase()),
          )
          if (!matchesLocation) continue
        }

        // Skip already-matched pairs
        const alreadyMatched = await hasActiveFlow(candidate.id, job.id)
        if (alreadyMatched) continue

        // Run matching engine
        const result = matchProfiles(candidate.profile, jobData.profile)

        // Check threshold
        if (result.overallScore < threshold) continue

        // Create recruitment flow
        const matchDetails = result.criteria.map((c) => ({
          criterion: c.criterion,
          score: c.match === "ABOVE" ? 100
            : c.match === "MATCH" ? 100
            : c.match === "CLOSE" ? 70
            : 30,
        }))

        await createRecruitmentFlow({
          jobId: job.id,
          candidateId: candidate.id,
          candidateAlias: candidate.alias,
          companyId: jobData.tenantId,
          matchScore: result.overallScore,
          matchDetails,
        })

        newMatches++

        // Notify B2B side (best-effort)
        try {
          const baseUrl = getAppUrl()
          fetch(`${baseUrl}/api/v1/matching/notifications`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.INTERNAL_API_KEY || "",
              "x-internal-key": process.env.INTERNAL_API_KEY || "",
              "x-tenant-id": jobData.tenantId,
            },
            body: JSON.stringify({
              jobId: job.id,
              jobTitle: job.title,
              matchedCandidates: [{
                pseudonym: candidate.alias,
                compatibilityScore: result.overallScore,
                b2cUserId: candidate.id,
              }],
            }),
          }).catch(() => {})
          notifications++
        } catch {
          // Notification is best-effort
        }
      }
    }
  } catch (error) {
    console.error("[auto-matcher] Error:", error)
  }

  return { newMatches, notifications }
}
