/**
 * Curățare task-uri imposibil de realizat (generate de executor necontrolat)
 *
 * Marchează CANCELLED toate task-urile non-COMPLETED care:
 * - sunt BLOCKED cu UNCLEAR_SCOPE, WAITING_INPUT, sau DEPENDENCY fără task parent
 * - sunt ASSIGNED/ACCEPTED dar nu au fost atinse > 24h
 * - sunt REVIEW_PENDING dar nimeni nu le review-uiește
 * - sunt FAILED
 */
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const now = new Date()

  // 1. Cancel all BLOCKED tasks (no path to resolution without real clients/data)
  const blocked = await prisma.agentTask.updateMany({
    where: { status: "BLOCKED" },
    data: { status: "CANCELLED", failureReason: "Cleanup 28.04: task imposibil fara clienti/date reale" },
  })
  console.log(`BLOCKED → CANCELLED: ${blocked.count}`)

  // 2. Cancel all FAILED tasks
  const failed = await prisma.agentTask.updateMany({
    where: { status: "FAILED" },
    data: { status: "CANCELLED", failureReason: "Cleanup 28.04: task esuat" },
  })
  console.log(`FAILED → CANCELLED: ${failed.count}`)

  // 3. Cancel ASSIGNED tasks older than 12h (never picked up = nobody can execute them)
  const staleAssigned = await prisma.agentTask.updateMany({
    where: {
      status: "ASSIGNED",
      createdAt: { lt: new Date(now.getTime() - 12 * 3600000) },
    },
    data: { status: "CANCELLED", failureReason: "Cleanup 28.04: task nerevendicat >12h" },
  })
  console.log(`ASSIGNED stale → CANCELLED: ${staleAssigned.count}`)

  // 4. Cancel ACCEPTED tasks older than 24h that never started
  const staleAccepted = await prisma.agentTask.updateMany({
    where: {
      status: "ACCEPTED",
      startedAt: null,
      createdAt: { lt: new Date(now.getTime() - 24 * 3600000) },
    },
    data: { status: "CANCELLED", failureReason: "Cleanup 28.04: task acceptat dar neinceput >24h" },
  })
  console.log(`ACCEPTED stale → CANCELLED: ${staleAccepted.count}`)

  // 5. Cancel REVIEW_PENDING older than 48h (nobody reviewing)
  const staleReview = await prisma.agentTask.updateMany({
    where: {
      status: "REVIEW_PENDING",
      createdAt: { lt: new Date(now.getTime() - 48 * 3600000) },
    },
    data: { status: "CANCELLED", failureReason: "Cleanup 28.04: review nefacut >48h" },
  })
  console.log(`REVIEW_PENDING stale → CANCELLED: ${staleReview.count}`)

  // Remaining counts
  const remaining = await prisma.agentTask.groupBy({ by: ["status"], _count: { _all: true } })
  console.log("\n=== REMAINING ===")
  for (const c of remaining) console.log(`${c.status}: ${c._count._all}`)
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
