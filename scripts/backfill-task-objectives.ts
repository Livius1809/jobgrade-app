/**
 * Backfill — leagă taskurile proactive existente la obiectivul managerului lor.
 *
 * Context: înainte de fix 10.04.2026, proactive-loop.ts crea AgentTask fără
 * objectiveId. După fix, taskurile noi sunt linked. Acest script repară
 * istoricul pentru ca Test 8 (Scop) să reflecte corect starea organizării.
 *
 * Logică:
 *  - Pentru fiecare task proactive (exclude SYSTEM + recovery tags)
 *  - Dacă objectiveId e null, caută primul OrganizationalObjective activ
 *    cu `assignedBy` în ownerRoles sau contributorRoles
 *  - Dacă găsește → set objectiveId. Nu găsește → adaugă tag "orphan:no-objective"
 *
 * Rulează: npx tsx scripts/backfill-task-objectives.ts
 * Dry-run: DRY=1 npx tsx scripts/backfill-task-objectives.ts
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const DRY = !!process.env.DRY
const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

async function main() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const orphans = await p.agentTask.findMany({
    where: {
      createdAt: { gte: since },
      objectiveId: null,
      assignedBy: { notIn: ["SYSTEM"] },
      NOT: { tags: { hasSome: ["recovery", "task_expired"] } },
    },
    select: { id: true, assignedBy: true, tags: true, title: true },
  })

  console.log(`\n═══ BACKFILL task→objective (${orphans.length} orphans) ═══`)
  console.log(DRY ? "MODE: DRY-RUN (nimic nu se scrie)\n" : "MODE: LIVE\n")

  // Cache obiective per rol. Logica prioritizată:
  //  1. Obiectiv dedicat rolului: code se termină cu `--{role_lowercase}`
  //  2. Obiectiv unde rolul e owner
  //  3. Obiectiv unde rolul e contributor
  const objCache = new Map<string, string | null>()
  async function findObjectiveFor(role: string): Promise<string | null> {
    if (objCache.has(role)) return objCache.get(role)!

    const suffix = `--${role.toLowerCase()}`
    // 1. Match exact pe suffix
    let obj = await p.organizationalObjective.findFirst({
      where: { completedAt: null, code: { endsWith: suffix } },
      select: { id: true, code: true },
    })
    // 2. Owner
    if (!obj) {
      obj = await p.organizationalObjective.findFirst({
        where: { completedAt: null, ownerRoles: { has: role } },
        orderBy: { code: "asc" },
        select: { id: true, code: true },
      })
    }
    // 3. Contributor
    if (!obj) {
      obj = await p.organizationalObjective.findFirst({
        where: { completedAt: null, contributorRoles: { has: role } },
        orderBy: { code: "asc" },
        select: { id: true, code: true },
      })
    }

    const id = obj?.id ?? null
    objCache.set(role, id)
    if (obj) console.log(`  [cache] ${role.padEnd(10)} → ${obj.code}`)
    else console.log(`  [cache] ${role.padEnd(10)} → (niciun obiectiv activ)`)
    return id
  }

  let linked = 0
  let tagged = 0
  let skipped = 0

  for (const t of orphans) {
    const objId = await findObjectiveFor(t.assignedBy)
    if (objId) {
      if (!DRY) {
        await p.agentTask.update({
          where: { id: t.id },
          data: { objectiveId: objId },
        })
      }
      linked++
    } else {
      // Tag orphan pentru audit
      if (!(t.tags || []).includes("orphan:no-objective")) {
        if (!DRY) {
          await p.agentTask.update({
            where: { id: t.id },
            data: { tags: { set: [...(t.tags || []), "orphan:no-objective"] } },
          })
        }
        tagged++
      } else {
        skipped++
      }
    }
  }

  console.log(`\n── Rezultat ──`)
  console.log(`  Linked la obiectiv:        ${linked}`)
  console.log(`  Tagged orphan (fără obj):  ${tagged}`)
  console.log(`  Deja tagged (skip):        ${skipped}`)
  console.log(`  Total procesate:           ${orphans.length}`)

  await p.$disconnect()
}

main().catch(async (e) => {
  console.error("FATAL:", e)
  try { await p.$disconnect() } catch {}
  process.exit(1)
})
