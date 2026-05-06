/**
 * POST /api/v1/b2c/card-3/match — Matching profil candidat ↔ post B2B
 * Body: { userId, jobId }
 * Returnează: raport compatibilitate bilateral pe 6 criterii
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import { matchProfiles, type CriteriaProfile } from "@/lib/b2c/matching-engine"
import { cpuCall } from "@/lib/cpu/gateway"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/**
 * Estimează criteriile unui post din descriere când nu are evaluare JE.
 * Folosește Claude Haiku (rapid + ieftin) pentru estimare.
 */
async function estimateJobCriteria(job: any): Promise<CriteriaProfile> {
  try {
    const jobText = [
      job.title && `Titlu: ${job.title}`,
      job.purpose && `Scop: ${job.purpose}`,
      job.description && `Descriere: ${job.description}`,
      job.responsibilities && `Responsabilități: ${job.responsibilities}`,
      job.requirements && `Cerințe: ${job.requirements}`,
    ].filter(Boolean).join("\n")

    if (jobText.length < 20) return {}

    const cpuResult = await cpuCall({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `Estimează nivelul pe 6 criterii JobGrade pentru un post. Răspunde DOAR cu JSON valid:
{"Knowledge":"A-G","Communications":"A-E","ProblemSolving":"A-G","DecisionMaking":"A-G","BusinessImpact":"A-D","WorkingConditions":"A-C"}
A=minim, G=maxim. Fii realist, nu infla.`,
      messages: [{ role: "user", content: jobText.slice(0, 1500) }],
      agentRole: "CAREER_COUNSELOR",
      operationType: "estimate-job-criteria",
    })

    return JSON.parse(cpuResult.text) as CriteriaProfile
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, jobId } = body

  if (!userId || !jobId) {
    return NextResponse.json({ error: "userId + jobId necesare" }, { status: 400 })
  }

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  // Profil candidat din CV extras
  const card = await prisma.b2CCardProgress.findFirst({
    where: { userId, card: "CARD_3" },
    select: { cvExtractedData: true },
  })

  if (!card?.cvExtractedData) {
    return NextResponse.json({ error: "Încarcă CV-ul mai întâi" }, { status: 400 })
  }

  const extractedData = card.cvExtractedData as Record<string, unknown>
  const candidateProfile: CriteriaProfile = (extractedData.criteriaEstimate as CriteriaProfile) || {}

  // Profil post B2B — din ultima evaluare sau din cerințe
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true, title: true, code: true, purpose: true,
      description: true, responsibilities: true, requirements: true,
      department: { select: { name: true } },
      tenant: { select: { name: true } },
    },
  })

  if (!job) return NextResponse.json({ error: "Post negăsit" }, { status: 404 })

  // Criteriile postului din ultima evaluare JE
  const evaluations = await prisma.evaluation.findMany({
    where: {
      assignment: { sessionJob: { jobId } },
    },
    include: { criterion: true, subfactor: true },
    orderBy: { updatedAt: "desc" },
  })

  const jobProfile: CriteriaProfile = {}
  for (const ev of evaluations) {
    const key = ev.criterion.name as keyof CriteriaProfile
    if (!jobProfile[key]) {
      jobProfile[key] = ev.subfactor.code
    }
  }

  // Dacă nu are evaluare JE, estimăm criteriile din descrierea postului via Claude
  if (Object.keys(jobProfile).length === 0) {
    const estimated = await estimateJobCriteria(job)
    Object.assign(jobProfile, estimated)
  }

  // Matching
  const result = matchProfiles(candidateProfile, jobProfile)

  // Notify B2B tenant if compatibility is good (>= 65%)
  if (result.overallScore >= 65 && job.tenant) {
    try {
      const b2cUser = await prisma.b2CUser.findUnique({
        where: { id: userId },
        select: { alias: true },
      })
      const pseudonym = (b2cUser as any)?.alias || `candidat_${userId.slice(0, 6)}`

      // Fire-and-forget notification to B2B side
      const notificationPayload = {
        jobId,
        jobTitle: job.title,
        matchedCandidates: [{
          pseudonym,
          compatibilityScore: result.overallScore,
          b2cUserId: userId,
        }],
      }

      // Call the notification endpoint internally
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
      fetch(`${baseUrl}/api/v1/matching/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || "",
        },
        body: JSON.stringify(notificationPayload),
      }).catch(() => {
        // Notification is best-effort, don't block the match response
      })
    } catch {
      // Notification failure doesn't affect match result
    }
  }

  return NextResponse.json({
    match: result,
    job: {
      title: job.title, code: job.code, purpose: job.purpose,
      department: job.department?.name, company: job.tenant?.name,
    },
    candidateProfile,
    jobProfile,
    hasJE: Object.keys(jobProfile).length > 0,
  })
}
