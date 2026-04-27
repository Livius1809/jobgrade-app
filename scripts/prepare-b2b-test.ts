/**
 * prepare-b2b-test.ts — Script unificat pentru pregatire test B2B
 *
 * Ruleaza in ordine:
 *   1. seed.ts — criterii de evaluare (6 criterii, 33 subfactori)
 *   2. seed-demo.ts — companie demo, useri, joburi, departamente
 *   3. seed-demo-session.ts — sesiune de evaluare DRAFT cu 3 joburi si 4 evaluatori
 *   4. seed-demo-complete.ts — evaluari complete, finalizare, ranking
 *   5. Seteaza isPilot=true pe tenant-ul demo (fara billing)
 *   6. Verifica structura agenti (agent relationships)
 *
 * Rulare: npx tsx scripts/prepare-b2b-test.ts
 *
 * Credentiale demo:
 *   Owner:       owner@techvision.ro / Demo2026!
 *   HR Admin:    admin@techvision.ro / Demo2026!
 *   Facilitator: facilitator@techvision.ro / Demo2026!
 *   Dev Lead:    dev.lead@techvision.ro / Demo2026!
 */
import { config } from "dotenv"
config()

import { execSync } from "child_process"

const DEMO_TENANT_SLUG = "demo-company"

async function run(label: string, script: string) {
  console.log(`\n${"═".repeat(60)}`)
  console.log(`  ${label}`)
  console.log(`${"═".repeat(60)}\n`)
  try {
    execSync(`npx tsx ${script}`, { stdio: "inherit", cwd: process.cwd() })
    console.log(`\n  ✓ ${label} — OK`)
  } catch (e: any) {
    console.error(`\n  ✗ ${label} — EROARE: ${e.message?.slice(0, 120)}`)
    // Continuam, seed-urile sunt idempotente
  }
}

async function setPilotMode() {
  console.log(`\n${"═".repeat(60)}`)
  console.log("  Pas 5: Setare isPilot=true pe tenant demo")
  console.log(`${"═".repeat(60)}\n`)

  const { PrismaClient } = await import("../src/generated/prisma")
  const { PrismaPg } = await import("@prisma/adapter-pg")

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: DEMO_TENANT_SLUG },
      select: { id: true, name: true, isPilot: true },
    })

    if (!tenant) {
      console.log("  ✗ Tenant demo nu exista — seed-demo.ts a esuat")
      return
    }

    if (tenant.isPilot) {
      console.log(`  ✓ ${tenant.name} — deja isPilot=true`)
    } else {
      await prisma.tenant.update({
        where: { slug: DEMO_TENANT_SLUG },
        data: { isPilot: true },
      })
      console.log(`  ✓ ${tenant.name} — setat isPilot=true (fara billing)`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function verifyAgentStructure() {
  console.log(`\n${"═".repeat(60)}`)
  console.log("  Pas 6: Verificare structura agenti")
  console.log(`${"═".repeat(60)}\n`)

  const { PrismaClient } = await import("../src/generated/prisma")
  const { PrismaPg } = await import("@prisma/adapter-pg")

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    const p = prisma as any

    const agentCount = await p.agent?.count({ where: { isActive: true } }).catch(() => 0) ?? 0
    const relCount = await p.agentRelationship?.count({ where: { isActive: true } }).catch(() => 0) ?? 0

    console.log(`  Agenti activi: ${agentCount}`)
    console.log(`  Relatii ierarhice: ${relCount}`)

    if (agentCount === 0) {
      console.log("  ⚠ Zero agenti — ruleaza: npx tsx prisma/seed-final-agents.ts")
    }
    if (relCount === 0 && agentCount > 0) {
      console.log("  ⚠ Zero relatii ierarhice — delegarea nu va functiona")
      console.log("    Ruleaza: npx tsx prisma/seed-new-orgchart.ts")
    }
    if (agentCount > 0 && relCount > 0) {
      console.log("  ✓ Structura agenti OK")
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function printSummary() {
  console.log(`\n${"═".repeat(60)}`)
  console.log("  REZUMAT TEST B2B")
  console.log(`${"═".repeat(60)}`)
  console.log(`
  URL:       ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}

  Credentiale:
    Owner:       owner@techvision.ro / Demo2026!
    HR Admin:    admin@techvision.ro / Demo2026!
    Facilitator: facilitator@techvision.ro / Demo2026!
    Dev Lead:    dev.lead@techvision.ro / Demo2026!

  Flow de test:
    1. Login ca owner@techvision.ro
    2. Mergi la /sessions — vezi sesiunea demo COMPLETED
    3. Verifica /reports — ranking CTO > Senior Dev > Junior Dev
    4. Creaza sesiune noua cu joburi proprii
    5. Invita evaluatori, ruleaza pre-scoring
    6. Benchmark → Slotting → Validare Owner → Finalizare

  Pilot mode: ACTIV (fara billing)
`)
}

async function main() {
  console.log("\n🚀 PREGATIRE TEST B2B — JobGrade\n")
  const start = Date.now()

  // Pas 1-4: Seed-uri in ordine
  await run("Pas 1: Criterii evaluare (6 criterii, 33 subfactori)", "prisma/seed.ts")
  await run("Pas 2: Companie demo + useri + joburi", "prisma/seed-demo.ts")
  await run("Pas 3: Sesiune evaluare + participanti + assignments", "prisma/seed-demo-session.ts")
  await run("Pas 4: Evaluari complete + finalizare + ranking", "prisma/seed-demo-complete.ts")

  // Pas 5: Pilot mode
  await setPilotMode()

  // Pas 6: Verificare agenti
  await verifyAgentStructure()

  // Rezumat
  await printSummary()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`  Timp total: ${elapsed}s\n`)
}

main().catch((e) => {
  console.error("EROARE FATALA:", e)
  process.exit(1)
})
