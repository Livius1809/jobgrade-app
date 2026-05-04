/**
 * Seed matrice acces iCredit — Opțiunea B
 *
 * Opțiunea B = acces departamental:
 *   - admin@icredit.ro primește DG + DHR (acces complet pilot)
 *   - Template roluri per departament (pentru onboarding viitori useri)
 *   - Permission rules seed-uite din PERMISSION_MATRIX
 *   - Departament → roluri recomandate configurate în tenant settings
 *
 * RULARE:
 *   DATABASE_URL=<prod_url> npx tsx scripts/seed-icredit-access.ts
 *
 * SAU prin API intern:
 *   POST /api/v1/admin/seed-permissions (seed-uiește regulile globale)
 *   + acest script asignează rolurile specifice iCredit
 */

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { PERMISSION_MATRIX } from "../src/lib/permissions"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const dbHost = new URL(process.env.DATABASE_URL!).host
console.log("Target DB:", dbHost)

// ═══════════════════════════════════════════════════════════════
// CONFIGURARE iCREDIT
// ═══════════════════════════════════════════════════════════════

const ICREDIT_ADMIN_EMAIL = "admin@icredit.ro"

/**
 * Opțiunea B: Mapare departamente → roluri OrgRole recomandate.
 *
 * Fiecare departament are roluri care se asignează automat
 * când un user din acel departament primește acces la platformă.
 *
 * Notă: Un user poate avea multiple roluri (vezi cumulableWith).
 */
const DEPT_ROLE_TEMPLATE: Record<string, { roles: string[]; description: string }> = {
  "General Management": {
    roles: ["DG", "REPM"],
    description: "Director General — acces complet + reprezentant management în comisia Art. 10",
  },
  "Directia Resurse Umane": {
    roles: ["DHR", "RSAL", "RREC", "RAP", "RLD", "FJE", "FA10"],
    description: "Echipa HR — acces complet pe funcțiunile HR. DHR obligatoriu, restul se alocă per persoană.",
  },
  "Directia Vanzari si Colectare": {
    roles: ["SAL", "REPM"],
    description: "Salariați + potențial reprezentant management",
  },
  "Departament Recuperare Creante": {
    roles: ["SAL"],
    description: "Salariați — vizualizare posturi, cereri Art. 7",
  },
  "Directia Operatiuni": {
    roles: ["SAL", "REPM"],
    description: "Salariați + potențial reprezentant management",
  },
  "Directia Juridica": {
    roles: ["SAL", "FA10"],
    description: "Salariați + potențial facilitator evaluare comună (competență juridică)",
  },
  "Departament Managementul Riscurilor si Analiza Date": {
    roles: ["SAL"],
    description: "Salariați — vizualizare posturi, cereri Art. 7",
  },
  "Departament Control Intern si Antifrauda": {
    roles: ["SAL"],
    description: "Salariați — vizualizare posturi, cereri Art. 7",
  },
  "Departament Financiar": {
    roles: ["SAL", "RSAL"],
    description: "Salariați + potențial responsabil salarizare (comp&ben)",
  },
  "Departament Administrativ": {
    roles: ["SAL", "RAP"],
    description: "Salariați + potențial responsabil administrare personal",
  },
  "Departament IT": {
    roles: ["SAL"],
    description: "Salariați — vizualizare posturi, cereri Art. 7",
  },
  "Departament Marketing si Relatii Publice": {
    roles: ["SAL"],
    description: "Salariați — vizualizare posturi, cereri Art. 7",
  },
  "Departament Proiecte Persoane Juridice": {
    roles: ["SAL"],
    description: "Salariați — vizualizare posturi, cereri Art. 7",
  },
}

// Rolurile admin-ului pilot — acces complet pe toate funcțiunile
const ADMIN_ROLES = ["DG", "DHR"] as const

// ═══════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("\n=== Seed matrice acces iCredit (Opțiunea B) ===\n")

  // 1. Seed permission rules (global)
  console.log("1. Seed permission rules...")
  const { count: deleted } = await prisma.permissionRule.deleteMany()
  const { count: inserted } = await prisma.permissionRule.createMany({
    data: PERMISSION_MATRIX.map((rule) => ({
      orgRole: rule.orgRole,
      resource: rule.resource,
      action: rule.action,
      minLayer: rule.minLayer,
      condition: rule.condition ?? null,
    })),
    skipDuplicates: true,
  })
  console.log(`   ${deleted} vechi sterse, ${inserted} reguli inserate`)

  // 2. Găsim tenant + admin user
  console.log("\n2. Căutare tenant iCredit + admin user...")
  // CUI e pe CompanyProfile, slug e pe Tenant
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: "easy-asset-management" },
        { company: { cui: "28042464" } },
      ],
    },
    select: { id: true, name: true, slug: true },
  })
  if (!tenant) {
    console.error("   Tenant iCredit NU există! Rulează mai întâi: npx tsx scripts/seed-icredit-tenant.ts")
    process.exit(1)
  }
  console.log(`   Tenant: ${tenant.name} (${tenant.id})`)

  const adminUser = await prisma.user.findFirst({
    where: { email: ICREDIT_ADMIN_EMAIL, tenantId: tenant.id },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  if (!adminUser) {
    console.error(`   User ${ICREDIT_ADMIN_EMAIL} NU există pe tenant-ul iCredit!`)
    console.log("   Creez user-ul admin...")
    const newUser = await prisma.user.create({
      data: {
        email: ICREDIT_ADMIN_EMAIL,
        firstName: "Admin",
        lastName: "iCredit",
        tenantId: tenant.id,
        role: "COMPANY_ADMIN",
        status: "ACTIVE",
      },
      select: { id: true, email: true, firstName: true },
    })
    console.log(`   Creat: ${newUser.email} (${newUser.id})`)
    await assignRoles(newUser.id, tenant.id)
  } else {
    console.log(`   Admin: ${adminUser.email} (${adminUser.id})`)
    await assignRoles(adminUser.id, tenant.id)
  }

  // 3. Salvăm template-ul departament → roluri în SystemConfig
  console.log("\n3. Salvare template departament → roluri...")
  await prisma.systemConfig.upsert({
    where: { key: `DEPT_ROLE_TEMPLATE:${tenant.id}` },
    update: { value: JSON.stringify(DEPT_ROLE_TEMPLATE) },
    create: {
      key: `DEPT_ROLE_TEMPLATE:${tenant.id}`,
      value: JSON.stringify(DEPT_ROLE_TEMPLATE),
      label: "Template roluri per departament — iCredit (Opțiunea B)",
    },
  })
  console.log(`   Salvat ${Object.keys(DEPT_ROLE_TEMPLATE).length} departamente cu roluri recomandate`)

  // 4. Rezumat
  console.log("\n=== REZUMAT ===")
  console.log(`Permission rules: ${inserted} active`)
  console.log(`Admin (${ICREDIT_ADMIN_EMAIL}): roluri DG + DHR`)
  console.log(`Template departamental: ${Object.keys(DEPT_ROLE_TEMPLATE).length} departamente configurate`)
  console.log(`\nLa onboarding viitori useri, sistemul va sugera rolurile din template pe baza departamentului.`)
  console.log("\nDone.")
}

async function assignRoles(userId: string, tenantId: string) {
  console.log(`\n   Asignare roluri admin: ${ADMIN_ROLES.join(", ")}`)
  for (const role of ADMIN_ROLES) {
    const existing = await prisma.userOrgRole.findFirst({
      where: { userId, tenantId, orgRole: role },
    })
    if (existing) {
      console.log(`   ${role} — deja asignat`)
    } else {
      await prisma.userOrgRole.create({
        data: { userId, tenantId, orgRole: role },
      })
      console.log(`   ${role} — asignat`)
    }
  }
}

main()
  .catch((e) => {
    console.error("EROARE:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
