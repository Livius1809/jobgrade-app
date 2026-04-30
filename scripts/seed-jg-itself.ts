/**
 * Seed JG_itself — cont demo cu datele organizației Psihobusiness
 * Rulare: npx tsx scripts/seed-jg-itself.ts
 */

// @ts-nocheck
require("dotenv").config()
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  // 1. Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "jg-itself" },
    update: {},
    create: { name: "Psihobusiness Consulting SRL", slug: "jg-itself", status: "ACTIVE" },
  })
  console.log("Tenant:", tenant.id, tenant.name)

  // 2. Company Profile
  await prisma.companyProfile.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      cui: "RO15790994",
      industry: "Consultanță management și resurse umane",
      caenCode: "7022",
      caenName: "Activități de consultanță pentru afaceri și management",
      address: "România",
      mission: "Oferim organizațiilor instrumente și metodologii bazate pe psihologia muncii pentru evaluarea, ierarhizarea și dezvoltarea capitalului uman, cu suport AI integrat.",
      vision: "O piață a muncii în care fiecare organizație înțelege valoarea reală a fiecărui rol și fiecare profesionist este evaluat obiectiv.",
      values: ["Rigoare științifică", "Transparență", "Evoluție continuă", "Dreapta măsură", "Onestitate radicală"],
    },
  })
  console.log("Company profile created")

  // 3. User demo
  const hashedPw = await bcrypt.hash("Demo2026!", 10)
  const user = await prisma.user.upsert({
    where: { email: "demo@jobgrade.ro" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "demo@jobgrade.ro",
      firstName: "Demo",
      lastName: "Owner",
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
      passwordHash: hashedPw,
    },
  })
  console.log("User:", user.id, user.email)

  // 4. Service purchase (Layer 4)
  await prisma.servicePurchase.upsert({
    where: { tenantId: tenant.id },
    update: { layer: 4, positions: 20, employees: 10 },
    create: { tenantId: tenant.id, layer: 4, positions: 20, employees: 10 },
  })
  console.log("Service: Layer 4")

  // 5. Departamente
  const deptNames = ["Conducere", "Echipa Psihologie", "Echipa Tehnică", "Consultanță B2B", "Marketing & Vânzări"]
  for (const name of deptNames) {
    await prisma.department.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: { name, tenantId: tenant.id },
    })
  }
  console.log("5 departamente")

  const departments = await prisma.department.findMany({ where: { tenantId: tenant.id } })
  const d = Object.fromEntries(departments.map(x => [x.name, x.id]))

  // 6. Posturi
  const jobs = [
    { title: "Director General", dept: "Conducere", purpose: "Coordonare strategică a companiei, stabilire direcție, relația cu partenerii și clienții strategici.", resp: "Definire strategie, supervizare departamente, reprezentare legală, decizii investiții, relație clienți cheie.", req: "Experiență management 10+ ani, cunoștințe psihologia muncii, viziune strategică.", struct: "HUMAN" as const },
    { title: "Psiholog principal", dept: "Echipa Psihologie", purpose: "Coordonare evaluări psihologice, supervizare instrumente, validare rapoarte.", resp: "Administrare baterii psihometrice (CPI, AMI, ESQ-2, HBDI), interpretare rezultate, supervizare echipă.", req: "Atestat psiholog, specializare psihologia muncii și transporturilor, experiență 15+ ani.", struct: "HUMAN" as const },
    { title: "Specialist Psiholingvistică", dept: "Echipa Psihologie", purpose: "Calibrare lingvistică a comunicării platformei.", resp: "Analiză lingvistică, calibrare agenți AI, adaptare conținut cultural.", req: "Formare psiholingvistică, experiență comunicare organizațională.", struct: "HUMAN" as const },
    { title: "Psiholog Psihometrician", dept: "Echipa Psihologie", purpose: "Construcție și validare instrumente de evaluare.", resp: "Design chestionare, etaloanare, normalizare scoruri, validare statistică.", req: "Atestat psiholog, competențe psihometrice.", struct: "HUMAN" as const },
    { title: "Arhitect AI / Developer Principal", dept: "Echipa Tehnică", purpose: "Arhitectura și implementarea platformei JobGrade.", resp: "Dezvoltare Next.js/Prisma, integrare Claude API, design BD, deployment Vercel.", req: "Full-stack 5+ ani, Next.js, TypeScript, AI/LLM.", struct: "MIXED" as const },
    { title: "Specialist DevOps", dept: "Echipa Tehnică", purpose: "Infrastructură, deployment, monitorizare.", resp: "Vercel, Neon DB, Redis, Docker, CI/CD, monitorizare.", req: "DevOps 3+ ani, cloud, containerizare.", struct: "MIXED" as const },
    { title: "Consultant HR Senior", dept: "Consultanță B2B", purpose: "Livrare servicii evaluare și ierarhizare posturi.", resp: "Facilitare sesiuni JE, interpretare rezultate, consiliere salarială.", req: "HR consulting 5+ ani, evaluare posturi.", struct: "HUMAN" as const },
    { title: "Consultant Dezvoltare Organizațională", dept: "Consultanță B2B", purpose: "Audit cultural, plan intervenție, monitorizare.", resp: "Diagnostic organizațional, climat, audit cultural, coaching management.", req: "OD 5+ ani, certificări coaching, Hofstede/GLOBE.", struct: "HUMAN" as const },
    { title: "Specialist Marketing Digital", dept: "Marketing & Vânzări", purpose: "Strategie marketing digital, conținut, SEO.", resp: "Content, SEO, social media, email marketing, analytics.", req: "Marketing digital 3+ ani, content creation.", struct: "HUMAN" as const },
    { title: "Sales & Onboarding Specialist", dept: "Marketing & Vânzări", purpose: "Primul contact cu clienții, onboarding.", resp: "Prospectare, demo, onboarding, follow-up.", req: "Vânzări B2B 2+ ani, prezentare, HR domain.", struct: "HUMAN" as const },
  ]

  let created = 0
  for (const j of jobs) {
    const existing = await prisma.job.findFirst({ where: { tenantId: tenant.id, title: j.title } })
    if (!existing) {
      await prisma.job.create({
        data: {
          tenantId: tenant.id,
          title: j.title,
          departmentId: d[j.dept],
          purpose: j.purpose,
          responsibilities: j.resp,
          requirements: j.req,
          status: "ACTIVE",
          structureType: j.struct,
        },
      })
      created++
    }
  }
  console.log(`${created} posturi create (din ${jobs.length})`)

  // Rezumat
  const jobCount = await prisma.job.count({ where: { tenantId: tenant.id } })
  console.log("\n=== CONT DEMO JG_itself ===")
  console.log(`Tenant: ${tenant.id}`)
  console.log("Login: demo@jobgrade.ro / Demo2026!")
  console.log("Layer: 4 (toate cardurile)")
  console.log(`Departamente: ${deptNames.length}`)
  console.log(`Posturi: ${jobCount}`)
  console.log("\nGata pentru testare pe portal!")

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
