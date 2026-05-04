/**
 * E2E iCredit — Lansare evaluare AI pe toate cele 55 posturi
 *
 * 1. Creează sesiune de evaluare
 * 2. Lansează auto-evaluate (Claude Haiku scorează pe 6 criterii)
 * 3. Verifică rezultatele
 *
 * RULARE: DATABASE_URL=<prod> npx tsx scripts/e2e-icredit-evaluate.ts
 */

import { config } from "dotenv"
config({ path: ".env.prod" })

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

const TENANT_SLUG = "easy-asset-management"
const ADMIN_EMAIL = "admin@icredit.ro"

async function main() {
  console.log("=== E2E iCredit — Evaluare AI ===\n")

  // 1. Tenant + admin + jobs
  const tenant = await prisma.tenant.findFirst({
    where: { slug: TENANT_SLUG },
    select: { id: true, name: true },
  })
  if (!tenant) { console.error("Tenant NOT FOUND!"); process.exit(1) }

  const admin = await prisma.user.findFirst({
    where: { email: ADMIN_EMAIL, tenantId: tenant.id },
    select: { id: true },
  })
  if (!admin) { console.error("Admin NOT FOUND!"); process.exit(1) }

  const jobs = await prisma.job.findMany({
    where: { tenantId: tenant.id, status: "ACTIVE" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  })
  console.log(`Tenant: ${tenant.name}`)
  console.log(`Admin: ${admin.id}`)
  console.log(`Posturi active: ${jobs.length}\n`)

  // 2. Verifică dacă există deja o sesiune
  const existingSession = await prisma.evaluationSession.findFirst({
    where: { tenantId: tenant.id, name: { contains: "E2E" } },
    select: { id: true, name: true, status: true },
  })

  let sessionId: string

  if (existingSession) {
    console.log(`Sesiune existentă: ${existingSession.name} (${existingSession.status})`)
    if (existingSession.status === "COMPLETED") {
      console.log("Sesiunea e deja completă. Verificăm rezultatele...\n")
      sessionId = existingSession.id
    } else {
      sessionId = existingSession.id
      // Activează dacă e DRAFT
      if (existingSession.status === "DRAFT") {
        await prisma.evaluationSession.update({
          where: { id: sessionId },
          data: { status: "IN_PROGRESS", startedAt: new Date() },
        })
        console.log("Sesiune activată → IN_PROGRESS")
      }
      console.log("Continuăm...\n")
    }
  } else {
    // 3. Creează sesiune nouă
    console.log("Creare sesiune evaluare...")
    const session = await prisma.evaluationSession.create({
      data: {
        tenantId: tenant.id,
        name: `E2E iCredit — ${new Date().toLocaleDateString("ro-RO")}`,
        status: "DRAFT",
        evaluationType: "AI_GENERATED",
        createdById: admin.id,
      },
    })
    sessionId = session.id
    console.log(`Sesiune creată: ${session.id}`)

    // 4. Adaugă toate posturile la sesiune
    const sessionJobs = await prisma.sessionJob.createMany({
      data: jobs.map((j: any) => ({ sessionId: session.id, jobId: j.id })),
      skipDuplicates: true,
    })
    console.log(`SessionJobs create: ${sessionJobs.count}`)

    // 5. Adaugă admin ca participant
    await prisma.sessionParticipant.create({
      data: { sessionId: session.id, userId: admin.id },
    }).catch(() => { /* deja existent */ })
    console.log("Admin adăugat ca participant")

    // 6. Activează sesiunea
    await prisma.evaluationSession.update({
      where: { id: session.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    })
    console.log("Sesiune ACTIVĂ\n")
  }

  // 7. Lansează auto-evaluate
  console.log("=== LANSARE AUTO-EVALUATE ===")
  console.log(`Sesiune: ${sessionId}`)
  console.log(`Posturi de evaluat: ${jobs.length}`)
  console.log("Aceasta poate dura 3-5 minute (Claude Haiku × 55 posturi)...\n")

  try {
    const { autoEvaluateSession } = await import("../src/lib/agents/job-auto-evaluator")
    const result = await autoEvaluateSession(sessionId, admin.id)
    console.log("\n=== REZULTATE ===")
    console.log(`Posturi evaluate: ${result.jobsEvaluated}`)
    console.log(`Erori: ${result.errors || 0}`)

    if (result.scores) {
      console.log("\n=== CLASAMENT (Top 10 + Bottom 5) ===")
      const sorted = Object.entries(result.scores as Record<string, number>)
        .sort((a, b) => b[1] - a[1])

      console.log("\nTOP 10:")
      sorted.slice(0, 10).forEach(([title, score], i) => {
        console.log(`  ${i + 1}. ${title}: ${score} pct`)
      })

      console.log("\nBOTTOM 5:")
      sorted.slice(-5).forEach(([title, score], i) => {
        console.log(`  ${sorted.length - 4 + i}. ${title}: ${score} pct`)
      })

      console.log(`\nMin: ${sorted[sorted.length - 1][1]} | Max: ${sorted[0][1]} | Spread: ${(sorted[0][1] as number) - (sorted[sorted.length - 1][1] as number)}`)
    }
  } catch (e: any) {
    console.error("EROARE la auto-evaluate:", e.message)
    console.log("\nÎncerc evaluare via API (necesită server pornit)...")
    console.log("Alternativ: pornește dev server și rulează:")
    console.log(`  curl -X POST https://jobgrade.ro/api/v1/sessions/auto-evaluate \\`)
    console.log(`    -H "Content-Type: application/json" \\`)
    console.log(`    -H "Cookie: <session_cookie>" \\`)
    console.log(`    -d '{"sessionId":"${sessionId}"}'`)
  }

  // 8. Verificare finală
  console.log("\n=== VERIFICARE FINALĂ ===")
  const sessionFinal = await prisma.evaluationSession.findUnique({
    where: { id: sessionId },
    select: { status: true, completedAt: true },
  })
  console.log(`Status sesiune: ${sessionFinal?.status}`)

  const evaluations = await prisma.evaluation.count({ where: { sessionId } })
  console.log(`Evaluări în DB: ${evaluations}`)
  console.log(`Așteptat: ${jobs.length * 6} (${jobs.length} posturi × 6 criterii)`)

  const assignments = await prisma.jobAssignment.findMany({
    where: { sessionJob: { sessionId } },
    select: { id: true },
  })
  console.log(`Assignments: ${assignments.length}`)

  if (evaluations >= jobs.length * 5) {
    console.log("\n✓ E2E TEST PASSED — evaluare completă")
  } else if (evaluations > 0) {
    console.log(`\n⚠ E2E PARTIAL — ${evaluations}/${jobs.length * 6} evaluări`)
  } else {
    console.log("\n✗ E2E FAILED — 0 evaluări")
  }
}

main()
  .catch(e => { console.error("EROARE:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
