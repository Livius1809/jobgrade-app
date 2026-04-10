/**
 * Reset demo session de la COMPLETED înapoi la IN_PROGRESS + șterge JobResults,
 * ca să pot retesta finalizeSession cu fix-ul credits:0.
 *
 * Păstrează: sessionJobs, participants, assignments, evaluations.
 * Șterge: jobResults, aiGeneration cu sourceId=sessionId.
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

const SESSION_NAME = "Evaluare Q2 2026 — Poziții Tehnice"

;(async () => {
  const session = await p.evaluationSession.findFirst({
    where: { name: SESSION_NAME },
    select: { id: true, status: true },
  })
  if (!session) {
    console.log("Session absent")
    await p.$disconnect()
    return
  }

  console.log(`Session ${session.id} current status: ${session.status}`)

  // Șterge JobResults existenți
  const deletedResults = await p.jobResult.deleteMany({
    where: { sessionId: session.id },
  })
  console.log(`Deleted ${deletedResults.count} JobResults`)

  // Șterge aiGeneration pentru raport final
  try {
    const deletedGen = await p.aiGeneration.deleteMany({
      where: { sourceId: session.id, sourceType: "final_report" },
    })
    console.log(`Deleted ${deletedGen.count} aiGeneration rows`)
  } catch (e: any) {
    console.log(`aiGeneration cleanup skipped: ${e.message}`)
  }

  // Reset session la IN_PROGRESS
  await p.evaluationSession.update({
    where: { id: session.id },
    data: { status: "IN_PROGRESS", completedAt: null },
  })
  console.log(`Reset session → IN_PROGRESS`)

  await p.$disconnect()
  console.log("\n✓ Ready to re-run seed-demo-complete.ts (va apela engine real)")
})()
