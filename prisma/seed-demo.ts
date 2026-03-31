import { config } from "dotenv"
config()

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

async function main() {
  console.log("🏢 Seeding demo data...")

  // ── Tenant ──────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "TechVision România SRL",
      slug: "demo-company",
      plan: "PROFESSIONAL",
      locale: "ro",
      status: "ACTIVE",
    },
  })
  console.log(`✅ Tenant: ${tenant.name}`)

  // ── Company Profile ─────────────────────────────────────
  await prisma.companyProfile.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      cui: "RO12345678",
      industry: "Tehnologie & Software",
      size: "50-100",
      website: "https://techvision.ro",
      address: "Str. Victoriei 42, București",
      county: "București",
      description:
        "Companie de dezvoltare software și consultanță IT, cu focus pe soluții enterprise și transformare digitală.",
      mission: "Transformăm digital afacerile din România prin soluții software inovative.",
      vision: "Lider în transformare digitală în Europa de Est până în 2030.",
      values: ["Inovație", "Calitate", "Transparență", "Colaborare"],
    },
  })
  console.log("✅ Company profile creat")

  // ── Departments ─────────────────────────────────────────
  const deptNames = [
    "Management",
    "Dezvoltare Software",
    "Resurse Umane",
    "Vânzări & Marketing",
    "Financiar",
    "Suport Tehnic",
  ]

  const departments: Record<string, string> = {}
  for (const name of deptNames) {
    const dept = await prisma.department.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: { tenantId: tenant.id, name, isActive: true },
    })
    departments[name] = dept.id
  }
  console.log(`✅ ${deptNames.length} departamente`)

  // ── Users ───────────────────────────────────────────────
  const usersData = [
    {
      email: "owner@techvision.ro",
      firstName: "Alexandru",
      lastName: "Popescu",
      jobTitle: "CEO",
      role: "OWNER" as const,
      dept: "Management",
    },
    {
      email: "admin@techvision.ro",
      firstName: "Maria",
      lastName: "Ionescu",
      jobTitle: "HR Director",
      role: "COMPANY_ADMIN" as const,
      dept: "Resurse Umane",
    },
    {
      email: "facilitator@techvision.ro",
      firstName: "Andrei",
      lastName: "Dumitrescu",
      jobTitle: "HR Business Partner",
      role: "FACILITATOR" as const,
      dept: "Resurse Umane",
    },
    {
      email: "dev.lead@techvision.ro",
      firstName: "Cristian",
      lastName: "Radu",
      jobTitle: "Engineering Manager",
      role: "REPRESENTATIVE" as const,
      dept: "Dezvoltare Software",
    },
    {
      email: "sales.lead@techvision.ro",
      firstName: "Elena",
      lastName: "Marin",
      jobTitle: "Sales Director",
      role: "REPRESENTATIVE" as const,
      dept: "Vânzări & Marketing",
    },
  ]

  const users: Record<string, string> = {}
  const hashedPassword = await hashPassword("Demo2026!")
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: { passwordHash: hashedPassword },
      create: {
        tenantId: tenant.id,
        email: u.email,
        passwordHash: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        jobTitle: u.jobTitle,
        role: u.role,
        departmentId: departments[u.dept],
        status: "ACTIVE",
      },
    })
    users[u.email] = user.id
  }
  console.log(`✅ ${usersData.length} utilizatori (parolă: Demo2026!)`)

  // ── Jobs ────────────────────────────────────────────────
  const jobsData = [
    {
      code: "CEO-001",
      title: "Director General (CEO)",
      purpose: "Conducerea strategică a companiei și reprezentarea în relația cu stakeholderii.",
      responsibilities:
        "Stabilirea viziunii și strategiei companiei. Gestionarea relațiilor cu investitorii și partenerii strategici. Aprobarea bugetului anual și a planurilor de dezvoltare. Conducerea echipei de management.",
      dept: "Management",
      rep: "owner@techvision.ro",
    },
    {
      code: "CTO-001",
      title: "Director Tehnic (CTO)",
      purpose: "Conducerea direcției tehnologice și arhitecturale a produselor companiei.",
      responsibilities:
        "Definirea stack-ului tehnologic și a arhitecturii. Coordonarea echipelor de dezvoltare. Evaluarea și adoptarea tehnologiilor noi. Asigurarea calității tehnice a livrabilelor.",
      dept: "Dezvoltare Software",
      rep: "dev.lead@techvision.ro",
    },
    {
      code: "DEV-001",
      title: "Senior Software Developer",
      purpose: "Dezvoltarea și mentenanța aplicațiilor software complexe ale companiei.",
      responsibilities:
        "Scrierea de cod de calitate și review-uri. Mentorarea dezvoltatorilor juniori. Participarea la decizii arhitecturale. Estimarea efortului pentru features noi.",
      dept: "Dezvoltare Software",
      rep: "dev.lead@techvision.ro",
    },
    {
      code: "DEV-002",
      title: "Junior Software Developer",
      purpose: "Dezvoltarea de funcționalități sub ghidajul seniorilor și învățare continuă.",
      responsibilities:
        "Implementarea task-urilor asignate. Scrierea de teste unitare. Participarea la daily stand-ups. Documentarea codului propriu.",
      dept: "Dezvoltare Software",
      rep: "dev.lead@techvision.ro",
    },
    {
      code: "HR-001",
      title: "HR Director",
      purpose: "Conducerea strategiei de resurse umane și dezvoltare organizațională.",
      responsibilities:
        "Definirea politicilor HR. Gestionarea proceselor de recrutare și retenție. Coordonarea evaluărilor de performanță. Administrarea pachetelor de compensații și beneficii.",
      dept: "Resurse Umane",
      rep: "admin@techvision.ro",
    },
    {
      code: "HR-002",
      title: "HR Specialist",
      purpose: "Administrarea operațională a proceselor HR și suport angajați.",
      responsibilities:
        "Administrarea contractelor de muncă. Gestionarea dosarelor de personal. Organizarea training-urilor. Suport angajați pe întrebări HR.",
      dept: "Resurse Umane",
      rep: "facilitator@techvision.ro",
    },
    {
      code: "SAL-001",
      title: "Sales Director",
      purpose: "Conducerea strategiei comerciale și atingerea targetelor de vânzări.",
      responsibilities:
        "Definirea strategiei de vânzări. Gestionarea pipeline-ului. Negocierea contractelor majore. Coordonarea echipei de vânzări.",
      dept: "Vânzări & Marketing",
      rep: "sales.lead@techvision.ro",
    },
    {
      code: "SAL-002",
      title: "Account Manager",
      purpose: "Gestionarea relațiilor cu clienții existenți și dezvoltarea portofoliului.",
      responsibilities:
        "Menținerea relațiilor cu clienții. Identificarea oportunităților de upselling. Rezolvarea problemelor clienților. Raportarea activității comerciale.",
      dept: "Vânzări & Marketing",
      rep: "sales.lead@techvision.ro",
    },
    {
      code: "FIN-001",
      title: "Director Financiar (CFO)",
      purpose: "Conducerea funcției financiare și asigurarea conformității fiscale.",
      responsibilities:
        "Planificarea financiară și bugetarea. Raportarea financiară. Gestionarea cash flow-ului. Relația cu auditorii și autoritățile fiscale.",
      dept: "Financiar",
      rep: "owner@techvision.ro",
    },
    {
      code: "SUP-001",
      title: "Team Lead Suport Tehnic",
      purpose: "Coordonarea echipei de suport și asigurarea calității serviciilor.",
      responsibilities:
        "Distribuirea ticketelor. Escaladarea problemelor complexe. Monitorizarea SLA-urilor. Training-ul echipei pe produse noi.",
      dept: "Suport Tehnic",
      rep: "dev.lead@techvision.ro",
    },
  ]

  for (const j of jobsData) {
    // Check if job with this code already exists for this tenant
    const existing = await prisma.job.findFirst({
      where: { tenantId: tenant.id, code: j.code },
    })
    if (!existing) {
      await prisma.job.create({
        data: {
          tenantId: tenant.id,
          code: j.code,
          title: j.title,
          purpose: j.purpose,
          responsibilities: j.responsibilities,
          departmentId: departments[j.dept],
          representativeId: users[j.rep],
          status: "ACTIVE",
          createdBy: users["owner@techvision.ro"],
        },
      })
    }
  }
  console.log(`✅ ${jobsData.length} joburi`)

  // ── Credit Balance ──────────────────────────────────────
  await prisma.creditBalance.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      balance: 100,
    },
  })
  console.log("✅ 100 credite demo")

  console.log("\n🎉 Seed demo complet!")
  console.log("   Login: owner@techvision.ro / Demo2026!")
  console.log("   Login: admin@techvision.ro / Demo2026!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
