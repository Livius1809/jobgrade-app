/**
 * E2E iCredit — Verificare stare + lansare evaluare AI pe toate posturile
 *
 * RULARE: DATABASE_URL=<prod> npx tsx scripts/e2e-icredit-check.ts
 */

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

const TENANT_SLUG = "easy-asset-management"

async function main() {
  console.log("=== E2E iCredit — Verificare stare ===\n")

  // 1. Tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: TENANT_SLUG },
    select: { id: true, name: true, isPilot: true, status: true },
  })
  if (!tenant) { console.error("Tenant NOT FOUND!"); process.exit(1) }
  console.log(`Tenant: ${tenant.name}`)
  console.log(`  ID: ${tenant.id}`)
  console.log(`  isPilot: ${tenant.isPilot}`)
  console.log(`  Status: ${tenant.status}`)

  // 2. Departamente
  const depts = await prisma.department.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  console.log(`\nDepartamente: ${depts.length}`)

  // 3. Posturi
  const jobs = await prisma.job.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, title: true, departmentId: true, status: true },
    orderBy: { title: "asc" },
  })
  console.log(`Posturi: ${jobs.length}`)
  const byStatus: Record<string, number> = {}
  for (const j of jobs) { byStatus[j.status] = (byStatus[j.status] || 0) + 1 }
  console.log(`  Per status: ${JSON.stringify(byStatus)}`)

  // 4. Useri
  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, email: true, role: true, status: true },
  })
  console.log(`\nUseri: ${users.length}`)
  for (const u of users) { console.log(`  ${u.email} — ${u.role} (${u.status})`) }

  // 5. Roluri organizaționale
  const orgRoles = await prisma.userOrgRole.findMany({
    where: { tenantId: tenant.id },
    select: { orgRole: true, user: { select: { email: true } } },
  })
  console.log(`\nRoluri org: ${orgRoles.length}`)
  for (const r of orgRoles) { console.log(`  ${r.user.email} → ${r.orgRole}`) }

  // 6. Criterii evaluare
  const criteria = await prisma.criterion.findMany({
    where: { isActive: true },
    select: { id: true, name: true, order: true },
    orderBy: { order: "asc" },
  })
  console.log(`\nCriterii active: ${criteria.length}`)
  for (const c of criteria) { console.log(`  ${c.order}. ${c.name}`) }

  // Subfactori
  const subfactors = await prisma.subfactor.count()
  console.log(`Subfactori: ${subfactors}`)

  // 7. Sesiuni existente
  const sessions = await prisma.evaluationSession.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })
  console.log(`\nSesiuni evaluare: ${sessions.length}`)
  for (const s of sessions) { console.log(`  ${s.name} — ${s.status} (${new Date(s.createdAt).toLocaleDateString("ro-RO")})`) }

  // 8. Permission rules
  const permRules = await prisma.permissionRule.count()
  console.log(`\nPermission rules: ${permRules}`)

  // 9. Rezumat readiness
  console.log("\n=== READINESS CHECK ===")
  const ready = {
    tenant: !!tenant,
    departments: depts.length >= 10,
    jobs: jobs.length >= 50,
    admin: users.some((u: any) => u.email === "admin@icredit.ro" && u.status === "ACTIVE"),
    roles: orgRoles.length >= 2,
    criteria: criteria.length >= 6,
    subfactors: subfactors >= 20,
    permissions: permRules >= 100,
  }
  for (const [k, v] of Object.entries(ready)) {
    console.log(`  ${v ? "✓" : "✗"} ${k}`)
  }
  const allReady = Object.values(ready).every(Boolean)
  console.log(`\n${allReady ? "READY pentru evaluare AI" : "BLOCKER — vezi itemii cu ✗ mai sus"}`)

  // Output IDs for next step
  if (allReady) {
    console.log("\n=== DATE PENTRU LANSARE ===")
    console.log(`Tenant ID: ${tenant.id}`)
    console.log(`Admin user ID: ${users.find((u: any) => u.email === "admin@icredit.ro")?.id}`)
    console.log(`Job IDs (${jobs.length}): ${jobs.slice(0, 3).map((j: any) => j.id).join(", ")}...`)
    console.log(`Criteria IDs: ${criteria.map((c: any) => c.id).join(", ")}`)
  }
}

main()
  .catch(e => { console.error("EROARE:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
