/**
 * Seed iCredit tenant pe PROD
 *
 * Creează:
 * 1. Tenant EASY ASSET MANAGEMENT IFN S.A. (CUI 28042464)
 * 2. Departamentele din statul de funcții
 * 3. Cele 57+ posturi cu text complet din fișele de post OCR-izate
 *
 * RULARE: DATABASE_URL=$(grep DATABASE_URL .env.prod | cut -d= -f2-) npx tsx scripts/seed-icredit-tenant.ts
 */

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import * as fs from "fs"
import * as path from "path"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Verify we're on PROD
const dbHost = new URL(process.env.DATABASE_URL!).host
console.log("🎯 Target DB:", dbHost)
if (!dbHost.includes("ep-divine-union")) {
  console.error("❌ STOP — Nu suntem pe DB PROD! Host:", dbHost)
  process.exit(1)
}

// ═══════════════════════════════════════════════════════════════
// COMPANY DATA
// ═══════════════════════════════════════════════════════════════

const COMPANY = {
  name: "EASY ASSET MANAGEMENT IFN S.A.",
  cui: "28042464",
  brand: "iCredit",
  slug: "easy-asset-management",
}

const DEPARTMENTS = [
  "General Management",
  "Directia Vanzari si Colectare",
  "Departament Recuperare Creante",
  "Directia Operatiuni",
  "Directia Juridica",
  "Directia Resurse Umane",
  "Departament Managementul Riscurilor si Analiza Date",
  "Departament Control Intern si Antifrauda",
  "Departament Financiar",
  "Departament Administrativ",
  "Departament IT",
  "Departament Marketing si Relatii Publice",
  "Departament Proiecte Persoane Juridice",
]

// Map job → department (from stat de functii analysis)
const JOB_DEPT_MAP: Record<string, string> = {
  "Auditor Intern": "General Management",
  "Functionar administrativ": "Directia Vanzari si Colectare",
  "Manager Agentie": "Directia Vanzari si Colectare",
  "Manager Echipa": "Directia Vanzari si Colectare",
  "Consultant credit": "Directia Vanzari si Colectare",
  "Regional Manager": "Directia Vanzari si Colectare",
  "Manager Colectare Nationala": "Departament Recuperare Creante",
  "Coordonator Colectare": "Departament Recuperare Creante",
  "Colector Teren": "Departament Recuperare Creante",
  "Ofiter Executare Silita": "Departament Recuperare Creante",
  "Director Operatiuni": "Directia Operatiuni",
  "Manager Departament Relatii cu Clientii": "Directia Operatiuni",
  "Manager Departament Business Suport si Dezvoltare": "Directia Operatiuni",
  "Coordonator serviciu vanzari": "Directia Operatiuni",
  "Coordonator serviciu colectare": "Directia Operatiuni",
  "Coordonator serviciu Introducere si Validare Date": "Directia Operatiuni",
  "Coordonator serviciu Analiza": "Directia Operatiuni",
  "Coordonator Serviciu Distributie de Asigurari Auxiliare": "Directia Operatiuni",
  "Operator Vanzari prin Telefon - Vanzari": "Directia Operatiuni",
  "Operator Vanzari prin Telefon - Colectare": "Directia Operatiuni",
  "Operator vanzari prin telefon - Asigurare": "Directia Operatiuni",
  "Ofiter Credite": "Directia Operatiuni",
  "Specialist Monitorizare": "Directia Operatiuni",
  "Operator introducere validare si prelucrare date": "Directia Operatiuni",
  "Ofiter Business Suport": "Directia Operatiuni",
  "Director juridic": "Directia Juridica",
  "Manager Departament Sesizari": "Directia Juridica",
  "Consilier Juridic - sesizari": "Directia Juridica",
  "Consilier Juridic": "Directia Juridica",
  "Director Resurse Umane": "Directia Resurse Umane",
  "Manager Resurse Umane": "Directia Resurse Umane",
  "Manager Training": "Directia Resurse Umane",
  "Business Trainer": "Directia Resurse Umane",
  "Specialist salarizare": "Directia Resurse Umane",
  "Specialist Recrutare": "Directia Resurse Umane",
  "Specialist Resurse Umane": "Directia Resurse Umane",
  "Manager Managementul Riscurilor si Analiza Date": "Departament Managementul Riscurilor si Analiza Date",
  "Risc Analist Junior": "Departament Managementul Riscurilor si Analiza Date",
  "Risc Analist Senior": "Departament Managementul Riscurilor si Analiza Date",
  "Manager Departament Control Intern si Antifrauda": "Departament Control Intern si Antifrauda",
  "Coordonator serviciu Control Intern si Antifrauda": "Departament Control Intern si Antifrauda",
  "Functionar Administrativ CI": "Departament Control Intern si Antifrauda",
  "Director Financiar": "Departament Financiar",
  "Economist": "Departament Financiar",
  "Contabil Sef": "Departament Financiar",
  "Contabil": "Departament Financiar",
  "Manager administrativ": "Departament Administrativ",
  "Functionar Administrativ Adm": "Departament Administrativ",
  "Manager IT": "Departament IT",
  "Administrator de retea de calculatoare": "Departament IT",
  "Operator Suport Tehnic Comunicatii Electronice": "Departament IT",
  "Manager Marketing si Relatii Publice": "Departament Marketing si Relatii Publice",
  "Specialist Marketing Junior": "Departament Marketing si Relatii Publice",
  "Specialist Marketing Senior": "Departament Marketing si Relatii Publice",
  "Manager National de Vanzari": "Departament Proiecte Persoane Juridice",
  "Manager Zonal": "Departament Proiecte Persoane Juridice",
  "Regional Manager PJ": "Departament Proiecte Persoane Juridice",
  "Manager Proiect": "Departament Proiecte Persoane Juridice",
  "Reprezentant Comercial": "Departament Proiecte Persoane Juridice",
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("🏢 Creez tenant:", COMPANY.name)

  // 1. Check if tenant already exists
  const existing = await prisma.tenant.findFirst({
    where: { slug: COMPANY.slug },
  })

  if (existing) {
    console.log("⚠️ Tenant deja există:", existing.id, existing.name)
    console.log("Continuăm cu tenant existent...")
    await seedJobs(existing.id)
    return
  }

  // 2. Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: COMPANY.name,
      slug: COMPANY.slug,
      status: "ACTIVE",
    },
  })

  // Create CompanyProfile with CUI
  await prisma.companyProfile.create({
    data: {
      tenantId: tenant.id,
      cui: COMPANY.cui,
    },
  })
  console.log("✅ Tenant creat:", tenant.id)

  // 3. Create departments
  await seedDepartments(tenant.id)

  // 4. Create jobs from extracted data
  await seedJobs(tenant.id)

  console.log("🎉 Seed complet pentru", COMPANY.brand)
}

async function seedDepartments(tenantId: string) {
  console.log("\n📁 Creez departamente...")
  for (const dept of DEPARTMENTS) {
    const existing = await prisma.department.findFirst({
      where: { tenantId, name: dept },
    })
    if (!existing) {
      await prisma.department.create({
        data: { tenantId, name: dept },
      })
      console.log("  ✅", dept)
    } else {
      console.log("  ⏭️", dept, "(existent)")
    }
  }
}

async function seedJobs(tenantId: string) {
  console.log("\n📄 Import fișe de post...")

  // Load extracted text
  const extractedPath = path.resolve(
    "C:/Users/Liviu/OneDrive/Desktop/exercitiu instalare_visual/documentare/15-owner-inputs/pilot_iCredit/fise post/FP_iCredit_extracted.json"
  )

  if (!fs.existsSync(extractedPath)) {
    console.error("❌ Nu găsesc fișierul extras:", extractedPath)
    return
  }

  const pages: Array<{ page: number; text: string }> = JSON.parse(
    fs.readFileSync(extractedPath, "utf8")
  )

  // Get departments map
  const departments = await prisma.department.findMany({ where: { tenantId } })
  const deptMap = new Map(departments.map((d) => [d.name, d.id]))

  let created = 0
  let skipped = 0

  for (const p of pages) {
    const t = p.text

    // Extract title
    let title = ""
    const titleMatch = t.match(
      /FISA\s+POSTULUI\s+(.+?)(?:\s*\(|\s*Anexa|\s*Cod\s*C)/i
    )
    if (titleMatch) {
      title = titleMatch[1]
        .trim()
        .replace(/[,.:;]+$/, "")
        .replace(/\s+/g, " ")
        .replace(/[^a-zA-ZăâîșțĂÂÎȘȚ\s\-&]/g, "")
        .trim()
    }
    if (!title || title.length < 3 || title.length > 80) {
      skipped++
      continue
    }

    // Apply OCR fixes
    const fixes: Record<string, string> = {
      "t  llii  Titlul fostului": "Business Trainer",
      "Anexa  elI i tiMijlij  tltularului  Resurse Umane Recrutare RapJeatrJfil": "Specialist Recrutare",
      "i Specialist Marketing": "Specialist Marketing Senior",
      "Rise Analist Junior": "Risc Analist Junior",
      "Rise Ana list Senior": "Risc Analist Senior",
      "Directia Vanzari & Colectare - District Manager Agentie": "Manager Echipa",
      "Manager Tehnologia lnformatiilor": "Manager IT",
      "DIRECTOR FINANCIAR": "Director Financiar",
      "CONTABIL SEF": "Contabil Sef",
    }
    if (fixes[title]) title = fixes[title]

    // Extract COR
    const corMatch = t.match(/[Cc]od\s*C\.?O\.?R\.?\s*[:\-]?\s*(\d{6})/)
    const cor = corMatch ? corMatch[1] : undefined

    // Extract objective
    let purpose = ""
    const objMatch = t.match(
      /(?:OBIECTIVUL\s+POSTULUI|Obiectivul\s+postului)\s+(.+?)(?:\s+SARCINI|\s+PRINCIPALELE|\s+Responsabilitati|•)/is
    )
    if (objMatch) purpose = objMatch[1].trim().replace(/\s+/g, " ").substring(0, 500)

    // Extract responsibilities (first ~1000 chars)
    let responsibilities = ""
    const respMatch = t.match(
      /(?:SARCINI\s+SI\s+RESPONSABILITATI|PRINCIPALELE\s+SARCINI|SARCINI\s+SI\s+RESPONSABILIT)\s+(.+?)(?:\s+Responsabilitati\s+GDPR|\s+Responsabilitati\s+privind\s+Control|\s+Responsabilitati\s+in\s+domeniu)/is
    )
    if (respMatch)
      responsibilities = respMatch[1].trim().replace(/\s+/g, " ").substring(0, 2000)

    // Find department
    const deptName = JOB_DEPT_MAP[title]
    const departmentId = deptName ? deptMap.get(deptName) : undefined

    // Check duplicate
    const existingJob = await prisma.job.findFirst({
      where: { tenantId, title },
    })
    if (existingJob) {
      // Update with more complete version if current is longer
      const currentLen =
        (existingJob.purpose?.length || 0) +
        (existingJob.responsibilities?.length || 0)
      const newLen = purpose.length + responsibilities.length
      if (newLen > currentLen) {
        await prisma.job.update({
          where: { id: existingJob.id },
          data: {
            purpose: purpose || existingJob.purpose,
            responsibilities: responsibilities || existingJob.responsibilities,
            code: cor || existingJob.code,
            departmentId: departmentId || existingJob.departmentId,
          },
        })
        console.log("  🔄", title, "(actualizat — versiune mai completă)")
      } else {
        console.log("  ⏭️", title, "(existent, la fel sau mai complet)")
      }
      skipped++
      continue
    }

    await prisma.job.create({
      data: {
        tenantId,
        title,
        code: cor,
        purpose: purpose || undefined,
        responsibilities: responsibilities || undefined,
        departmentId: departmentId || undefined,
        status: "ACTIVE",
        isActive: true,
        aiAnalyzed: true,
      },
    })
    created++
    console.log("  ✅", title, cor ? `(COR ${cor})` : "")
  }

  console.log(`\n📊 Rezultat: ${created} create, ${skipped} skip/actualizate`)
}

main()
  .catch((e) => {
    console.error("❌ Eroare:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
