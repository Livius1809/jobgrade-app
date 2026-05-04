/**
 * Enrich iCredit jobs with stat de funcții data (studii, experiență, condiții)
 * Salvează stat funcții în tenant storage + adaugă requirements pe fiecare job
 *
 * RULARE: DATABASE_URL=$(grep DATABASE_URL .env.prod | cut -d= -f2-) npx tsx scripts/enrich-icredit-stat.ts
 */

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { setTenantData } from "../src/lib/tenant-storage"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const TENANT_ID = "cmor1wh3t000030vhi1luwa7i"

const STAT_ROWS = [
  { title: "Auditor Intern", studies: "S*", conditions: "B", experience: "≥5" },
  { title: "Director comercial", studies: "S", conditions: "T", experience: "≥5" },
  { title: "Regional Manager", studies: "S", conditions: "T", experience: "≥5" },
  { title: "Manager Agentie", studies: "S/M", conditions: "T", experience: "≥3" },
  { title: "Manager Echipa", studies: "M", conditions: "T", experience: "≥1" },
  { title: "Functionar administrativ", studies: "M", conditions: "T", experience: "fara exp." },
  { title: "Consultant credit", studies: "M", conditions: "T", experience: "fara exp." },
  { title: "Manager Colectare Nationala", studies: "S", conditions: "T", experience: "≥3" },
  { title: "Coordonator Colectare", studies: "S", conditions: "T", experience: "≥1" },
  { title: "Ofiter executare silita", studies: "S", conditions: "T", experience: "≥2" },
  { title: "Director Operatiuni", studies: "S", conditions: "B", experience: "≥5" },
  { title: "Manager Departament Relatii cu Clientii", studies: "S", conditions: "B", experience: "≥3" },
  { title: "Manager Departament Business Suport si Dezvoltare", studies: "S", conditions: "B", experience: "≥3" },
  { title: "Coordonator serviciu vanzari", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Coordonator serviciu colectare", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Coordonator serviciu lntroducere si Validare Date", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Coordonator Serviciu Distributie de Asigurari Auxiliare", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Coordonator serviciu Analiza", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Operator Vanzari prin Telefon - Vanzari", studies: "S", conditions: "B", experience: "fara exp" },
  { title: "Operator Vanzari prin Telefon - Colectare", studies: "S", conditions: "B", experience: "fara exp" },
  { title: "Operator vanzari prin telefon - Asigurare", studies: "M", conditions: "B", experience: "fara exp" },
  { title: "Ofiter credite", studies: "M*", conditions: "B", experience: "fara exp" },
  { title: "Specialist Monitorizare", studies: "M", conditions: "B", experience: "≥1" },
  { title: "Operator introducere validare si prelucrare date", studies: "M", conditions: "B", experience: "fara exp" },
  { title: "Ofiter Business Suport SR", studies: "M", conditions: "B", experience: "≥1" },
  { title: "Director juridic", studies: "S", conditions: "B", experience: "≥5" },
  { title: "Manager Departament Sesizari", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Consilier Juridic - sesizari", studies: "S", conditions: "B", experience: "fara exp/≥3" },
  { title: "Consilier Juridic", studies: "S", conditions: "B", experience: "fara exp/≥3" },
  { title: "Director Resurse Umane", studies: "S", conditions: "B", experience: "≥5" },
  { title: "Manager Resurse Umane", studies: "S*", conditions: "B", experience: "≥3" },
  { title: "Manager Training", studies: "S*", conditions: "B", experience: "≥3" },
  { title: "Business Trainer", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Specialist salarizare", studies: "S", conditions: "B", experience: "≥3" },
  { title: "Specialist Recrutare", studies: "S*", conditions: "B", experience: "≥3" },
  { title: "Specialist Resurse Umane", studies: "S*", conditions: "B", experience: "≥3" },
  { title: "Manager Managementul Riscurilor si Analiza Date", studies: "S", conditions: "B", experience: "≥5" },
  { title: "Risc Analist Junior", studies: "S", conditions: "B", experience: "fara exp/≥3" },
  { title: "Risc Analist Senior", studies: "S", conditions: "B", experience: "fara exp/≥3" },
  { title: "Manager Departament Control Intern si Antifrauda", studies: "S", conditions: "B", experience: "≥5" },
  { title: "Coordonator serviciu Control Intern si Antifrauda", studies: "S", conditions: "T", experience: "fara exp." },
  { title: "Functionar Administrativ", studies: "M", conditions: "T", experience: "fara exp." },
  { title: "Director Financiar", studies: "S", conditions: "B", experience: "≥5" },
  { title: "Economist", studies: "S", conditions: "B", experience: "≥3" },
  { title: "Contabil Sef", studies: "S", conditions: "B", experience: "≥3" },
  { title: "Contabil", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Manager administrativ", studies: "S", conditions: "B/T", experience: "≥3" },
  { title: "Manager IT", studies: "S", conditions: "B", experience: "≥3" },
  { title: "Administrator de retea de calculatoare", studies: "S", conditions: "B", experience: "≥1" },
  { title: "Manager Marketing si Relatii Publice", studies: "S", conditions: "B", experience: "≥5" },
  { title: "Specialist Marketing Junior", studies: "S", conditions: "B", experience: "fara exp/≥3" },
  { title: "Specialist Marketing Senior", studies: "S", conditions: "B", experience: "fara exp/≥3" },
  { title: "Manager National de Vanzari", studies: "S", conditions: "T", experience: "≥5" },
  { title: "Manager Zonal", studies: "S/M", conditions: "T", experience: "≥1" },
  { title: "Manager Proiect", studies: "S/M", conditions: "T", experience: "≥2" },
  { title: "Reprezentant Comercial", studies: "M", conditions: "T", experience: "fara exp." },
]

const STUDIES_LABELS: Record<string, string> = {
  "S*": "Postuniversitare", "S": "Superioare", "S/M": "Superioare sau Medii",
  "M": "Medii", "M*": "Medii cu specializare", "B": "Bacalaureat", "B/T": "Bacalaureat sau Tehnice",
}

const CONDITIONS_LABELS: Record<string, string> = {
  "T": "Teren (deplasari)", "B": "Birou", "B/T": "Mixt (birou + teren)",
}

async function main() {
  console.log("🎯 Target:", new URL(process.env.DATABASE_URL!).host)

  // 1. Save stat functii to tenant storage
  await setTenantData(TENANT_ID, "STAT_FUNCTII", {
    rows: STAT_ROWS.map((r, i) => ({
      jobId: `sf-${i + 1}`,
      title: r.title,
      code: "",
      department: "",
      hierarchyLevel: 0,
      positionCount: 1,
      isActive: true,
      studies: r.studies,
      experience: r.experience,
      workConditions: r.conditions,
    })),
    generatedAt: new Date().toISOString(),
    totalPositions: STAT_ROWS.length,
    totalJobs: STAT_ROWS.length,
    departments: [],
  })
  console.log("✅ Stat funcții salvat:", STAT_ROWS.length, "rânduri")

  // 2. Enrich each job with requirements from stat
  let enriched = 0
  for (const row of STAT_ROWS) {
    const studiesLabel = STUDIES_LABELS[row.studies] || row.studies
    const condLabel = CONDITIONS_LABELS[row.conditions] || row.conditions

    const reqText = [
      `Studii: ${studiesLabel} (${row.studies})`,
      `Experienta: ${row.experience}`,
      `Conditii de munca: ${condLabel}`,
    ].join(". ")

    const result = await prisma.job.updateMany({
      where: { tenantId: TENANT_ID, title: row.title },
      data: { requirements: reqText },
    })
    if (result.count > 0) enriched += result.count
  }
  console.log("✅ Jobs enriched:", enriched)

  // 3. Verify
  const withReq = await prisma.job.count({
    where: { tenantId: TENANT_ID, requirements: { not: null } },
  })
  const total = await prisma.job.count({ where: { tenantId: TENANT_ID } })
  console.log(`📊 Jobs cu requirements: ${withReq}/${total}`)
}

main()
  .catch((e) => console.error("❌", e.message))
  .finally(() => prisma.$disconnect())
