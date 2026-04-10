/**
 * Seed obiective cascadate pentru rolurile operaționale lipsă.
 *
 * Context: audit 10.04.2026 a descoperit că COA, PMP_B2B, PMA, CSM creează
 * taskuri prin proactive-loop fără objectiveId pentru că nu au niciun obiectiv
 * activ unde să fie owner sau contributor. Creăm obiective cascade pe pattern-ul
 * `b2b-first-client--{role}` (parent: b2b-first-client).
 *
 * Rulează: npx tsx scripts/seed-missing-role-objectives.ts
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

interface RoleObjective {
  role: string
  fullName: string
  contribution: string
  metricName: string
  targetValue: number
  metricUnit?: string
}

const MISSING: RoleObjective[] = [
  {
    role: "COA",
    fullName: "Chief Operations Agent",
    contribution: "Operațiuni platformă coerente, fluxuri funcționale, zero blocaje structurale",
    metricName: "operational_blockers_resolved_pct",
    targetValue: 95,
    metricUnit: "%",
  },
  {
    role: "PMP_B2B",
    fullName: "Project Manager Platform B2B",
    contribution: "Livrare funcționalități B2B la timp, coordonare între echipe tehnice",
    metricName: "b2b_features_delivered_on_time_pct",
    targetValue: 90,
    metricUnit: "%",
  },
  {
    role: "PMA",
    fullName: "Project Manager Agent",
    contribution: "Coordonare proiecte interne, urmărire livrabile, raportare progres",
    metricName: "projects_on_track_pct",
    targetValue: 85,
    metricUnit: "%",
  },
  {
    role: "CSM",
    fullName: "Customer Success Manager",
    contribution: "Pregătire succes client post-contract, onboarding planificat",
    metricName: "onboarding_readiness_score",
    targetValue: 90,
    metricUnit: "%",
  },
]

async function main() {
  const parent = await p.organizationalObjective.findFirst({
    where: { code: "b2b-first-client" },
    select: { id: true, code: true, title: true, businessId: true },
  })

  if (!parent) {
    console.error("[FATAL] Obiectivul părinte 'b2b-first-client' lipsește.")
    process.exit(1)
  }

  console.log(`\nParent objective: ${parent.code} (${parent.id})\n`)

  for (const m of MISSING) {
    const code = `b2b-first-client--${m.role.toLowerCase()}`
    const existing = await p.organizationalObjective.findFirst({
      where: { code },
      select: { id: true },
    })
    if (existing) {
      console.log(`  [skip] ${code} deja există`)
      continue
    }

    const created = await p.organizationalObjective.create({
      data: {
        businessId: parent.businessId,
        code,
        title: `[${m.role}] Contribuție ${m.fullName} la Primul client B2B plătitor`,
        description: m.contribution,
        metricName: m.metricName,
        metricUnit: m.metricUnit,
        targetValue: m.targetValue,
        status: "ACTIVE",
        level: "OPERATIONAL",
        parentObjectiveId: parent.id,
        ownerRoles: [m.role],
        contributorRoles: [],
        tags: ["b2b-first-client", "cascade", m.role.toLowerCase()],
        cascadedBy: "backfill-script",
        createdBy: "SYSTEM",
      },
    })
    console.log(`  [create] ${code} → ${created.id}`)
  }

  console.log()
  await p.$disconnect()
}

main().catch(async (e) => {
  console.error("FATAL:", e)
  try { await p.$disconnect() } catch {}
  process.exit(1)
})
