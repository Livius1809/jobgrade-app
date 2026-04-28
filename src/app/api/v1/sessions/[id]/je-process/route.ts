/**
 * je-process/route.ts — API route pentru motorul de evaluare a posturilor
 *
 * POST: Dispatch pe acțiuni (16 funcții din je-process-engine)
 * GET: Status curent + date specifice fazei
 *
 * Auth: NextAuth session, roluri OWNER/SUPER_ADMIN/COMPANY_ADMIN/EVALUATOR
 * maxDuration: 60 (pentru apeluri AI)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  startPreScoring,
  submitPreScore,
  getPreScoringStatus,
  revealScores,
  flagForMediation,
  suggestBenchmarks,
  confirmBenchmarks,
  suggestSlotting,
  confirmSlotting,
  startOwnerValidation,
  getHierarchyForValidation,
  proposeGradeAdjustment,
  confirmAdjustment,
  getAdjustmentImpact,
  finalizeSession,
  getSessionJournal,
} from "@/lib/evaluation/je-process-engine"

export const maxDuration = 60

// ── Roluri permise per acțiune ──────────────────────────────────────────────

type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "OWNER" | "FACILITATOR" | "REPRESENTATIVE"

const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]
const EVALUATOR_ROLES: UserRole[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "FACILITATOR", "REPRESENTATIVE"]
const OWNER_ONLY: UserRole[] = ["SUPER_ADMIN", "OWNER"]

const ACTION_ROLES: Record<string, UserRole[]> = {
  // Sprint 5: Pre-scoring
  startPreScoring: ADMIN_ROLES,
  submitPreScore: EVALUATOR_ROLES,
  getPreScoringStatus: EVALUATOR_ROLES,
  revealScores: ADMIN_ROLES,
  flagForMediation: ADMIN_ROLES,

  // Sprint 6: Benchmark + Slotting
  suggestBenchmarks: ADMIN_ROLES,
  confirmBenchmarks: ADMIN_ROLES,
  suggestSlotting: ADMIN_ROLES,
  confirmSlotting: ADMIN_ROLES,

  // Sprint 7: Owner Validation
  startOwnerValidation: ADMIN_ROLES,
  getHierarchyForValidation: ADMIN_ROLES,
  proposeGradeAdjustment: OWNER_ONLY,
  confirmAdjustment: OWNER_ONLY,
  getAdjustmentImpact: ADMIN_ROLES,

  // Sprint 8: Finalize — extins la ADMIN_ROLES (OWNER + COMPANY_ADMIN + SUPER_ADMIN)
  // Fix 10.04.2026: client solo cu rol COMPANY_ADMIN era blocat de OWNER_ONLY
  finalizeSession: ADMIN_ROLES,
  getSessionJournal: ADMIN_ROLES,
}

// ── Helper ──────────────────────────────────────────────────────────────────

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status })
}

function hasRole(userRole: string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole as UserRole)
}

// ── GET: Status curent + date specifice fazei ───────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return err("Neautorizat.", 401)

    const { id: sessionId } = await params
    const tenantId = session.user.tenantId

    // Verifică sesiunea există și aparține tenantului
    const evalSession = await (prisma as any).evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        sessionJobs: { include: { job: { select: { id: true, title: true } } } },
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    })

    if (!evalSession) return err("Sesiunea nu a fost găsită.", 404)

    // Date de bază
    const base = {
      sessionId: evalSession.id,
      sessionName: evalSession.name,
      status: evalSession.status,
      currentRound: evalSession.currentRound,
      totalJobs: evalSession.sessionJobs.length,
      totalParticipants: evalSession.participants.length,
      deadline: evalSession.deadline,
      startedAt: evalSession.startedAt,
      completedAt: evalSession.completedAt,
    }

    // Date specifice fazei
    let phaseData: any = null

    switch (evalSession.status) {
      case "PRE_SCORING": {
        phaseData = await getPreScoringStatus(sessionId, prisma as any)
        break
      }
      case "OWNER_VALIDATION": {
        if (hasRole(session.user.role, ADMIN_ROLES)) {
          phaseData = await getHierarchyForValidation(sessionId, prisma as any)
        }
        break
      }
      case "COMPLETED": {
        if (hasRole(session.user.role, ADMIN_ROLES)) {
          const results = await (prisma as any).jobResult.findMany({
            where: { sessionId },
            include: { job: { select: { id: true, title: true } } },
            orderBy: { rank: "asc" },
          })
          phaseData = {
            results: results.map((r: any) => ({
              jobId: r.job.id,
              jobTitle: r.job.title,
              grade: r.rank,
              gradeLabel: `Nivel ${r.rank}`,
            })),
          }
        }
        break
      }
      case "BENCHMARK_SELECTION": {
        const benchmarks = await (prisma as any).jobResult.findMany({
          where: { sessionId, rank: -1 },
          include: { job: { select: { id: true, title: true } } },
        })
        phaseData = {
          benchmarks: benchmarks.map((b: any) => ({
            jobId: b.job.id,
            jobTitle: b.job.title,
          })),
          benchmarkCount: benchmarks.length,
        }
        break
      }
      case "SLOTTING": {
        const allResults = await (prisma as any).jobResult.findMany({
          where: { sessionId },
          include: { job: { select: { id: true, title: true } } },
        })
        const benchmarks = allResults.filter((r: any) => r.rank === -1)
        const slotted = allResults.filter((r: any) => r.rank > 0)
        const totalJobs = evalSession.sessionJobs.length
        phaseData = {
          benchmarkCount: benchmarks.length,
          slottedCount: slotted.length,
          remainingCount: totalJobs - benchmarks.length - slotted.length,
          slotted: slotted.map((r: any) => ({
            jobId: r.job.id,
            jobTitle: r.job.title,
            grade: r.rank,
          })),
        }
        break
      }
      default:
        break
    }

    return NextResponse.json({ ...base, phaseData })
  } catch (error: any) {
    console.error("[JE-PROCESS GET]", error)
    return err(error.message ?? "Eroare internă.", 500)
  }
}

// ── POST: Dispatch acțiuni ──────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return err("Neautorizat.", 401)

    const { id: sessionId } = await params
    const body = await req.json()
    const { action, ...actionParams } = body

    if (!action || typeof action !== "string") {
      return err("Parametrul 'action' este obligatoriu.", 400)
    }

    // Verifică existența acțiunii
    const allowedRoles = ACTION_ROLES[action]
    if (!allowedRoles) {
      return err(`Acțiunea "${action}" nu este recunoscută.`, 400)
    }

    // Verifică rolul
    if (!hasRole(session.user.role, allowedRoles)) {
      return err(`Nu ai permisiunea să efectuezi acțiunea "${action}".`, 403)
    }

    // Verifică sesiunea aparține tenantului
    const evalSession = await (prisma as any).evaluationSession.findFirst({
      where: { id: sessionId, tenantId: session.user.tenantId },
    })
    if (!evalSession) return err("Sesiunea nu a fost găsită.", 404)

    // Dispatch
    let result: any

    switch (action) {
      // ── Sprint 5: Pre-scoring ─────────────────────────────────────────
      case "startPreScoring":
        result = await startPreScoring(sessionId, prisma as any)
        break

      case "submitPreScore": {
        const { jobId, scores } = actionParams
        if (!jobId) return err("Parametrul 'jobId' este obligatoriu.", 400)
        if (!scores || typeof scores !== "object") return err("Parametrul 'scores' este obligatoriu (obiect cu litere per criteriu).", 400)
        result = await submitPreScore(sessionId, session.user.id, jobId, scores, prisma as any)
        break
      }

      case "getPreScoringStatus":
        result = await getPreScoringStatus(sessionId, prisma as any)
        break

      case "revealScores": {
        const { jobId } = actionParams
        if (!jobId) return err("Parametrul 'jobId' este obligatoriu.", 400)
        result = await revealScores(sessionId, jobId, prisma as any)
        break
      }

      case "flagForMediation": {
        const { jobId, criterionId } = actionParams
        if (!jobId || !criterionId) return err("Parametrii 'jobId' și 'criterionId' sunt obligatorii.", 400)
        result = await flagForMediation(sessionId, jobId, criterionId, prisma as any)
        break
      }

      // ── Sprint 6: Benchmark + Slotting ────────────────────────────────
      case "suggestBenchmarks":
        result = await suggestBenchmarks(sessionId, prisma as any)
        break

      case "confirmBenchmarks": {
        const { benchmarkJobIds } = actionParams
        if (!benchmarkJobIds || !Array.isArray(benchmarkJobIds)) {
          return err("Parametrul 'benchmarkJobIds' este obligatoriu (array de ID-uri).", 400)
        }
        result = await confirmBenchmarks(sessionId, benchmarkJobIds, prisma as any)
        break
      }

      case "suggestSlotting": {
        const { jobId } = actionParams
        if (!jobId) return err("Parametrul 'jobId' este obligatoriu.", 400)
        result = await suggestSlotting(sessionId, jobId, prisma as any)
        break
      }

      case "confirmSlotting": {
        const { jobId, grade } = actionParams
        if (!jobId) return err("Parametrul 'jobId' este obligatoriu.", 400)
        if (grade === undefined || typeof grade !== "number") return err("Parametrul 'grade' este obligatoriu (număr 1-8).", 400)
        result = await confirmSlotting(sessionId, jobId, grade, prisma as any)
        break
      }

      // ── Sprint 7: Owner Validation ────────────────────────────────────
      case "startOwnerValidation":
        result = await startOwnerValidation(sessionId, prisma as any)
        break

      case "getHierarchyForValidation":
        result = await getHierarchyForValidation(sessionId, prisma as any)
        break

      case "proposeGradeAdjustment": {
        const { jobId, newGrade, reason, affectedCriterion, newLevel } = actionParams
        if (!jobId || newGrade === undefined || !reason || !affectedCriterion || !newLevel) {
          return err("Parametrii 'jobId', 'newGrade', 'reason', 'affectedCriterion', 'newLevel' sunt obligatorii.", 400)
        }
        result = await proposeGradeAdjustment(
          sessionId, jobId, newGrade, reason, affectedCriterion, newLevel, prisma as any
        )
        break
      }

      case "confirmAdjustment": {
        const { jobId, affectedCriterion, newLevel, reason } = actionParams
        if (!jobId || !affectedCriterion || !newLevel || !reason) {
          return err("Parametrii 'jobId', 'affectedCriterion', 'newLevel', 'reason' sunt obligatorii.", 400)
        }
        result = await confirmAdjustment(
          sessionId, jobId, session.user.id, affectedCriterion, newLevel, reason, prisma as any
        )
        break
      }

      case "getAdjustmentImpact": {
        const { jobId, newGrade } = actionParams
        if (!jobId || newGrade === undefined) {
          return err("Parametrii 'jobId' și 'newGrade' sunt obligatorii.", 400)
        }
        result = await getAdjustmentImpact(sessionId, jobId, newGrade, prisma as any)
        break
      }

      // ── Sprint 8: Finalize ────────────────────────────────────────────
      case "finalizeSession":
        result = await finalizeSession(sessionId, prisma as any)
        break

      case "getSessionJournal":
        result = await getSessionJournal(sessionId, prisma as any)
        break

      default:
        return err(`Acțiunea "${action}" nu este implementată.`, 400)
    }

    // Fiecare actiune JE = cunoastere despre evaluare posturi per industrie
    try {
      const { learnFromReport } = await import("@/lib/learning-hooks")
      await learnFromReport(`JE_${action}`, session.user.tenantId, JSON.stringify(result).slice(0, 500))
    } catch {}

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[JE-PROCESS POST]", error)

    // Erori de business logic — returnăm mesajul
    if (error.message && !error.message.includes("prisma") && !error.message.includes("ECONNREFUSED")) {
      return err(error.message, 422)
    }

    return err("Eroare internă la procesarea acțiunii.", 500)
  }
}
