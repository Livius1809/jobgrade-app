import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

;(async () => {
  const session = await p.evaluationSession.findFirst({
    where: { name: "Evaluare Q2 2026 — Poziții Tehnice" },
    include: {
      jobResults: {
        include: { job: { select: { title: true, code: true } } },
        orderBy: { rank: "asc" },
      },
      sessionJobs: { include: { job: { select: { title: true } } } },
      participants: { include: { user: { select: { email: true } } } },
    },
  })
  if (!session) return console.log("Session absent")

  console.log("\n═══ DEMO SESSION VERIFY ═══\n")
  console.log(`Name: ${session.name}`)
  console.log(`ID: ${session.id}`)
  console.log(`Status: ${session.status}`)
  console.log(`Completed: ${session.completedAt?.toISOString() || "—"}`)
  console.log(`Round: ${session.currentRound}`)
  console.log()
  console.log(`Participanți (${session.participants.length}):`)
  for (const p of session.participants) {
    console.log(
      `  ${p.user.email.padEnd(35)} completed=${p.completedAt ? "✓" : "✗"}`
    )
  }
  console.log()
  console.log(`Joburi (${session.sessionJobs.length}):`)
  console.log()
  console.log(`Rezultate finale (${session.jobResults.length}):`)
  for (const r of session.jobResults) {
    console.log(
      `  Rank ${r.rank}  ${r.job.title.padEnd(30)}  score=${r.totalScore}  normalized=${r.normalizedScore.toFixed(3)}`
    )
  }
  console.log()
  console.log(`URL demo: http://localhost:3000/sessions/${session.id}/results`)
  console.log(`URL reports: http://localhost:3000/reports`)

  await p.$disconnect()
})()
