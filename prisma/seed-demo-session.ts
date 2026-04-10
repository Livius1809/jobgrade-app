/**
 * Seed Demo Session — creează o sesiune de evaluare gata de demo pentru
 * tenantul TechVision România (seed-demo.ts trebuie rulat întâi).
 *
 * Conținut:
 *  - 1 EvaluationSession DRAFT "Evaluare Q2 2026 — Poziții Tehnice"
 *  - 3 SessionJob (CTO, Senior Dev, Junior Dev)
 *  - 4 SessionParticipant (Owner, HR Dir, HR BP, Dev Lead)
 *  - JobAssignment pentru fiecare combinație user × sessionJob (12 assignments)
 *
 * Idempotent: verifică dacă sesiunea demo există deja înainte să creeze.
 *
 * Rulează: npx tsx prisma/seed-demo-session.ts
 */
import { config } from "dotenv"
config()

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const DEMO_TENANT_SLUG = "demo-company"
const SESSION_NAME = "Evaluare Q2 2026 — Poziții Tehnice"
const DEMO_JOB_CODES = ["CTO-001", "DEV-001", "DEV-002"]
const PARTICIPANT_EMAILS = [
  "owner@techvision.ro",
  "admin@techvision.ro",
  "facilitator@techvision.ro",
  "dev.lead@techvision.ro",
]

async function main() {
  console.log("\n🎯 Seed demo session pentru tenant demo...")

  // 1. Găsește tenantul
  const tenant = await prisma.tenant.findUnique({
    where: { slug: DEMO_TENANT_SLUG },
    select: { id: true, name: true },
  })
  if (!tenant) {
    throw new Error(
      `Tenant '${DEMO_TENANT_SLUG}' nu există. Rulează întâi: npx tsx prisma/seed-demo.ts`,
    )
  }
  console.log(`  Tenant: ${tenant.name}`)

  // 2. Găsește joburi demo
  const jobs = await prisma.job.findMany({
    where: {
      tenantId: tenant.id,
      code: { in: DEMO_JOB_CODES },
    },
    select: { id: true, code: true, title: true },
  })
  if (jobs.length !== DEMO_JOB_CODES.length) {
    throw new Error(
      `Lipsesc joburi: găsite ${jobs.length}/${DEMO_JOB_CODES.length}. Rulează seed-demo.ts.`,
    )
  }
  console.log(`  Joburi găsite: ${jobs.map((j) => j.code).join(", ")}`)

  // 3. Găsește users participanți
  const users = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      email: { in: PARTICIPANT_EMAILS },
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  })
  if (users.length !== PARTICIPANT_EMAILS.length) {
    throw new Error(
      `Lipsesc users: găsite ${users.length}/${PARTICIPANT_EMAILS.length}.`,
    )
  }
  console.log(`  Participanți: ${users.map((u) => u.email).join(", ")}`)

  // 4. Găsește owner-ul (pentru createdById)
  const owner = users.find((u) => u.email === "owner@techvision.ro")
  if (!owner) throw new Error("Owner demo lipsește")

  // 5. Check dacă sesiunea există deja (idempotență)
  const existingSession = await prisma.evaluationSession.findFirst({
    where: { tenantId: tenant.id, name: SESSION_NAME },
    select: { id: true },
  })
  if (existingSession) {
    console.log(`  [skip] Sesiunea '${SESSION_NAME}' există deja: ${existingSession.id}`)
    console.log(`\n🎉 Demo session deja pregătit!`)
    await prisma.$disconnect()
    return
  }

  // 6. Creează sesiunea + sub-entities într-o tranzacție
  const session = await prisma.$transaction(async (tx: any) => {
    const newSession = await tx.evaluationSession.create({
      data: {
        tenantId: tenant.id,
        name: SESSION_NAME,
        status: "DRAFT",
        currentRound: 1,
        consensusThreshold: 0.75,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdById: owner.id,
      },
    })

    // Adaugă joburi la sesiune
    const sessionJobs = []
    for (const j of jobs) {
      const sj = await tx.sessionJob.create({
        data: { sessionId: newSession.id, jobId: j.id },
      })
      sessionJobs.push(sj)
    }

    // Adaugă participanți
    for (const u of users) {
      await tx.sessionParticipant.create({
        data: { sessionId: newSession.id, userId: u.id },
      })
    }

    // Asignează fiecare user la fiecare sessionJob (12 assignments)
    for (const sj of sessionJobs) {
      for (const u of users) {
        await tx.jobAssignment.create({
          data: { sessionJobId: sj.id, userId: u.id },
        })
      }
    }

    return newSession
  })

  console.log(`  ✅ Sesiune creată: ${session.id}`)
  console.log(`  ✅ ${jobs.length} joburi adăugate la sesiune`)
  console.log(`  ✅ ${users.length} participanți adăugați`)
  console.log(`  ✅ ${jobs.length * users.length} job assignments create`)
  console.log(`\n🎉 Demo session pregătit!`)
  console.log(`   Session ID: ${session.id}`)
  console.log(`   Status: DRAFT (gata pentru start evaluare)`)
  console.log(`   Consensus threshold: 0.75`)
  console.log(`   Deadline: ${session.deadline?.toISOString()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
