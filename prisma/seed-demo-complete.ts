/**
 * Seed Demo Complete — simulează o sesiune completă cu evaluări de la toți
 * participanții și apelează finalizeSession pentru a popula JobResult.
 *
 * Rulează DUPĂ seed-demo.ts + seed-demo-session.ts.
 *
 * Flow:
 *  1. Preia sesiunea demo DRAFT
 *  2. Setează status = IN_PROGRESS
 *  3. Pentru fiecare JobAssignment, creează Evaluation pentru toate cele 6 criterii
 *     (subfactor ales ușor diferit per user + job ca să producă variație)
 *  4. Marcă JobAssignment.submittedAt
 *  5. Marcă SessionParticipant.completedAt
 *  6. Apelează finalizeSession → populează JobResult
 *
 * Rezultat: un session COMPLETED cu 3 joburi ranked, vizibil în /reports
 *
 * Idempotent: dacă sesiunea e deja COMPLETED, skip complet.
 */
import { config } from "dotenv"
config()

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { finalizeSession } from "../src/lib/evaluation/je-process-engine"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SESSION_NAME = "Evaluare Q2 2026 — Poziții Tehnice"

// Scoruri țintă realiste pentru cele 3 joburi (diferențiate)
// CTO trebuie să iasă cel mai sus, DEV Senior la mijloc, Junior cel mai jos
const JOB_TARGET_PROFILE: Record<string, string> = {
  "CTO-001": "H", // Scor ridicat (subfactor index mare)
  "DEV-001": "F", // Scor mediu-ridicat
  "DEV-002": "C", // Scor mediu-jos
}

// Variație mică per user ca să nu fie toate identice
const USER_VARIATION: Record<string, number> = {
  "owner@techvision.ro": 0, // fix
  "admin@techvision.ro": 1, // +1 poziție in subfactor
  "facilitator@techvision.ro": -1, // -1 poziție
  "dev.lead@techvision.ro": 0, // fix
}

function applyVariation(baseCode: string, variation: number): string {
  const base = baseCode.charCodeAt(0) // 'A' = 65
  const newCode = Math.max("A".charCodeAt(0), Math.min("J".charCodeAt(0), base + variation))
  return String.fromCharCode(newCode)
}

async function main() {
  console.log("\n🎬 Seed demo complete session...")

  // 1. Găsește sesiunea
  const session = await prisma.evaluationSession.findFirst({
    where: { name: SESSION_NAME },
    include: {
      tenant: { select: { slug: true, name: true } },
      sessionJobs: {
        include: {
          job: { select: { code: true, title: true } },
          assignments: {
            include: { user: { select: { email: true } } },
          },
        },
      },
      participants: { include: { user: { select: { email: true } } } },
    },
  })

  if (!session) {
    throw new Error(
      `Sesiunea '${SESSION_NAME}' nu există. Rulează întâi seed-demo-session.ts`,
    )
  }
  console.log(`  Tenant: ${session.tenant.name}`)
  console.log(`  Session: ${session.id} (status: ${session.status})`)

  if (session.status === "COMPLETED") {
    console.log(`  [skip] Deja COMPLETED. Nimic de făcut.`)
    await prisma.$disconnect()
    return
  }

  // 2. Ia criteriile cu subfactorii
  const criteria = await prisma.criterion.findMany({
    include: { subfactors: { orderBy: { code: "asc" } } },
    orderBy: { order: "asc" },
  })
  if (criteria.length === 0) {
    throw new Error("Niciun criteriu în DB. Rulează prisma/seed.ts pentru criteriile de bază.")
  }
  console.log(`  Criterii: ${criteria.length} (cu ${criteria[0].subfactors.length} subfactori fiecare)`)

  // 3. Marcă session ca IN_PROGRESS (dacă e DRAFT)
  if (session.status === "DRAFT") {
    await prisma.evaluationSession.update({
      where: { id: session.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    })
    console.log(`  ✅ Status → IN_PROGRESS`)
  }

  // 4. Creează Evaluation pentru fiecare assignment × criterion
  let evalCount = 0
  for (const sj of session.sessionJobs) {
    const jobCode = sj.job.code || ""
    const baseSubfactor = JOB_TARGET_PROFILE[jobCode] || "E"

    for (const assignment of sj.assignments) {
      const variation = USER_VARIATION[assignment.user.email] || 0
      const userSubfactorCode = applyVariation(baseSubfactor, variation)

      for (const criterion of criteria) {
        // Găsește subfactor-ul cu acel cod
        const subfactor = criterion.subfactors.find((s: any) => s.code === userSubfactorCode)
          || criterion.subfactors[5] // fallback F
        if (!subfactor) continue

        await prisma.evaluation.upsert({
          where: {
            assignmentId_criterionId: {
              assignmentId: assignment.id,
              criterionId: criterion.id,
            },
          },
          update: {},
          create: {
            sessionId: session.id,
            assignmentId: assignment.id,
            criterionId: criterion.id,
            subfactorId: subfactor.id,
            justification: `Evaluare demo pentru ${sj.job.title} — ${criterion.name}: ${subfactor.code} (${subfactor.points} puncte)`,
          },
        })
        evalCount++
      }

      // Marcă assignment ca submitted
      if (!assignment.submittedAt) {
        await prisma.jobAssignment.update({
          where: { id: assignment.id },
          data: { submittedAt: new Date() },
        })
      }
    }
  }
  console.log(`  ✅ ${evalCount} evaluări create`)

  // 5. Marcă participanții ca completed
  for (const p of session.participants) {
    if (!p.completedAt) {
      await prisma.sessionParticipant.update({
        where: { id: p.id },
        data: { completedAt: new Date() },
      })
    }
  }
  console.log(`  ✅ ${session.participants.length} participanți marcați completed`)

  // 6. Finalize session — populează JobResult
  console.log(`  ⏳ Apelez finalizeSession...`)
  try {
    const result = await finalizeSession(session.id, prisma)
    console.log(`  ✅ Session finalized`)
    if (Array.isArray((result as any)?.finalResults)) {
      for (const r of (result as any).finalResults) {
        console.log(
          `     - ${r.jobTitle.padEnd(30)} grade=${r.grade} label=${r.gradeLabel} points=${r.totalPoints}`,
        )
      }
    }
  } catch (e: any) {
    console.error(`  ❌ finalizeSession error:`, e.message)
    // Fallback: marchez manual COMPLETED + populez JobResult simplu
    console.log(`  ⚠  Fallback: populez JobResult manual...`)

    const sessionJobs = await prisma.sessionJob.findMany({
      where: { sessionId: session.id },
      include: {
        assignments: {
          include: { evaluations: { include: { subfactor: true } } },
        },
      },
    })

    const jobScores: Array<{ jobId: string; avgScore: number }> = []
    for (const sj of sessionJobs) {
      const allPoints = sj.assignments.flatMap((a: any) =>
        a.evaluations.map((e: any) => e.subfactor.points),
      )
      const avg = allPoints.length > 0 ? allPoints.reduce((s: number, p: number) => s + p, 0) / allPoints.length : 0
      jobScores.push({ jobId: sj.jobId, avgScore: avg })
    }

    // Sort desc pentru rank
    jobScores.sort((a, b) => b.avgScore - a.avgScore)

    for (let i = 0; i < jobScores.length; i++) {
      const js = jobScores[i]
      await prisma.jobResult.upsert({
        where: { sessionId_jobId: { sessionId: session.id, jobId: js.jobId } },
        update: {
          totalScore: Math.round(js.avgScore),
          normalizedScore: js.avgScore / 280,
          rank: i + 1,
        },
        create: {
          sessionId: session.id,
          jobId: js.jobId,
          totalScore: Math.round(js.avgScore),
          normalizedScore: js.avgScore / 280,
          rank: i + 1,
        },
      })
    }

    await prisma.evaluationSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    })
    console.log(`  ✅ Fallback: ${jobScores.length} JobResult create + session COMPLETED`)
  }

  console.log(`\n🎉 Demo complete session gata!`)
  console.log(`   Session ID: ${session.id}`)
  console.log(`   Accesează: http://localhost:3000/sessions/${session.id}/results`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
