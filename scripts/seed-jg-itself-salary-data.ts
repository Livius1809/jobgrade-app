/**
 * Seed JG_itself — Date salariale pentru pay gap analysis
 *
 * Creează EmployeeSalaryRecord pentru cei 2 experți umani + câțiva agenți AI
 * cu salarii din benchmark piață. Pay gap >5% construit intenționat.
 *
 * Rulează: npx tsx scripts/seed-jg-itself-salary-data.ts
 */

require("dotenv").config()

const API = process.env.API_BASE || "https://jobgrade.ro"
const KEY = process.env.INTERNAL_API_KEY || "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"
const TENANT_ID = "cmolbwrlr000004jplchaxsy8"

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": KEY, "x-tenant-id": TENANT_ID },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }
}

// Verificăm dacă există un endpoint pentru salary records, dacă nu, folosim direct DB
async function main() {
  console.log("\n  Seed date salariale — pay gap analysis\n")

  // Angajații cu date salariale reale (2026)
  const employees = [
    // Cei 2 experți UMANI — pay gap >5% pe același ranking
    { code: "PSB-001", gender: "FEMALE", baseSalary: 14910, variableComp: 14910 * 12 * 0.15 / 12, department: "Experți & Metodologie", jobCategory: "Psiholog Principal", evaluationScore: 620 },
    { code: "PSB-002", gender: "MALE", baseSalary: 15904, variableComp: 15904 * 12 * 0.15 / 12, department: "Experți & Metodologie", jobCategory: "Psiholog Principal", evaluationScore: 620 },

    // Alte posturi cu salarii benchmark (simulare organizație reală)
    { code: "PSB-003", gender: "FEMALE", baseSalary: 8500, variableComp: 0, department: "Servicii Client & Marketing", jobCategory: "Marketing Specialist", evaluationScore: 380 },
    { code: "PSB-004", gender: "MALE", baseSalary: 9200, variableComp: 500, department: "Servicii Client & Marketing", jobCategory: "Sales Specialist", evaluationScore: 400 },
    { code: "PSB-005", gender: "FEMALE", baseSalary: 12000, variableComp: 1000, department: "Tehnic & Produs", jobCategory: "Senior Developer", evaluationScore: 480 },
    { code: "PSB-006", gender: "MALE", baseSalary: 11500, variableComp: 800, department: "Tehnic & Produs", jobCategory: "Senior Developer", evaluationScore: 470 },
    { code: "PSB-007", gender: "FEMALE", baseSalary: 7000, variableComp: 0, department: "Juridic & Conformitate", jobCategory: "Compliance Specialist", evaluationScore: 350 },
    { code: "PSB-008", gender: "MALE", baseSalary: 6800, variableComp: 0, department: "Financiar & Operațiuni", jobCategory: "Financial Analyst", evaluationScore: 340 },
    { code: "PSB-009", gender: "FEMALE", baseSalary: 5500, variableComp: 0, department: "Servicii Client & Marketing", jobCategory: "Customer Support", evaluationScore: 280 },
    { code: "PSB-010", gender: "MALE", baseSalary: 5800, variableComp: 300, department: "Servicii Client & Marketing", jobCategory: "Customer Support", evaluationScore: 290 },
  ]

  // Folosim endpoint-ul de import payroll dacă există, altfel direct API
  const { ok, data } = await apiPost("/api/v1/payroll/import", {
    year: 2026,
    month: 4,
    records: employees.map(e => ({
      employeeCode: e.code,
      gender: e.gender,
      baseSalary: e.baseSalary,
      variableComp: e.variableComp,
      department: e.department,
      jobCategory: e.jobCategory,
      evaluationScore: e.evaluationScore,
      workSchedule: "8h",
    })),
  })

  if (ok) {
    console.log(`  ✓ ${employees.length} înregistrări salariale importate`)
  } else {
    console.log(`  ⚠ Import payroll: ${data?.message || data?.error || JSON.stringify(data).slice(0, 200)}`)
    console.log("  Încerc creare individuală...")

    // Fallback — creăm individual
    let created = 0
    for (const emp of employees) {
      const r = await apiPost("/api/v1/salary-data", {
        employeeCode: emp.code,
        gender: emp.gender,
        baseSalary: emp.baseSalary,
        variableComp: emp.variableComp,
        department: emp.department,
        jobCategory: emp.jobCategory,
        evaluationScore: emp.evaluationScore,
        periodYear: 2026,
        periodMonth: 4,
        workSchedule: "8h",
      })
      if (r.ok) created++
      else console.log(`    ${emp.code}: ${r.data?.message || r.status}`)
    }
    console.log(`  ✓ ${created}/${employees.length} create individual`)
  }

  // Test pay gap report
  console.log("\n  Test pay gap report...")
  const pgResult = await apiPost("/api/v1/pay-gap/report", { year: 2026 })
  if (pgResult.ok) {
    console.log("  ✓ Pay gap report generat!")
    console.log("  ", JSON.stringify(pgResult.data).slice(0, 300))
  } else {
    console.log(`  ⚠ Pay gap: ${pgResult.data?.message || pgResult.status}`)
  }

  console.log()
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
