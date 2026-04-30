/**
 * Seed JG_itself — restul de agenți (48 din 73 total)
 * Completează seed-ul real cu toți agenții care nu au fost incluși în primul seed.
 *
 * Rulează: npx tsx scripts/seed-jg-itself-remaining.ts
 */

require("dotenv").config()

const API = process.env.API_BASE || "https://jobgrade.ro"
const KEY = process.env.INTERNAL_API_KEY || "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"
const TENANT_ID = "cmolbwrlr000004jplchaxsy8"

const fs = require("fs")

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": KEY, "x-tenant-id": TENANT_ID },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }
}

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { "x-internal-key": KEY, "x-tenant-id": TENANT_ID },
  })
  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}

// Mapare agent → departament
const DEPT_MAP: Record<string, string> = {
  // Conducere Strategică
  COG: "Conducere Strategică", ACEA: "Conducere Strategică", SAFETY_MONITOR: "Conducere Strategică",
  DOAS: "Conducere Strategică", DPO: "Conducere Strategică", CFO: "Conducere Strategică",

  // Tehnic & Produs
  COA: "Tehnic & Produs", PMA: "Tehnic & Produs", EMA: "Tehnic & Produs",
  DPA: "Tehnic & Produs", QLA: "Tehnic & Produs", SA: "Tehnic & Produs",
  CAA: "Tehnic & Produs", COAFin: "Tehnic & Produs", TDA: "Tehnic & Produs",
  BDA: "Tehnic & Produs", DEA: "Tehnic & Produs", FDA: "Tehnic & Produs",
  MAA: "Tehnic & Produs", QAA: "Tehnic & Produs", SQA: "Tehnic & Produs",
  DOA: "Tehnic & Produs",

  // Servicii Client & Marketing
  COCSA: "Servicii Client & Marketing", SOA: "Servicii Client & Marketing",
  CSSA: "Servicii Client & Marketing", CSA: "Servicii Client & Marketing",
  MKA: "Servicii Client & Marketing", CMA: "Servicii Client & Marketing",
  CWA: "Servicii Client & Marketing", ACA: "Servicii Client & Marketing",
  CCO: "Servicii Client & Marketing", BCA: "Servicii Client & Marketing",
  CDIA: "Servicii Client & Marketing", ISA: "Servicii Client & Marketing",
  MOA: "Servicii Client & Marketing", IRA: "Servicii Client & Marketing",
  MDA: "Servicii Client & Marketing",
  CSM: "Servicii Client & Marketing", DMA: "Servicii Client & Marketing",
  DVB2B: "Servicii Client & Marketing", DVB2C: "Servicii Client & Marketing",
  DMM: "Servicii Client & Marketing", CSEO: "Servicii Client & Marketing",
  EMAS: "Servicii Client & Marketing", SMMA: "Servicii Client & Marketing",
  PMP_B2B: "Servicii Client & Marketing", PMP_B2C: "Servicii Client & Marketing",
  PMRA: "Servicii Client & Marketing", SEBC: "Servicii Client & Marketing",
  PCA: "Servicii Client & Marketing", REVOPS: "Servicii Client & Marketing",
  DDA: "Servicii Client & Marketing", GDA: "Servicii Client & Marketing",

  // Juridic & Conformitate
  CJA: "Juridic & Conformitate", CCIA: "Juridic & Conformitate",

  // Experți & Metodologie
  PSYCHOLINGUIST: "Experți & Metodologie", HR_COUNSELOR: "Experți & Metodologie",
  MEDIATOR: "Experți & Metodologie", NSA: "Experți & Metodologie",
  PCM: "Experți & Metodologie", PPA: "Experți & Metodologie",
  PPMO: "Experți & Metodologie", PSE: "Experți & Metodologie",
  SCA: "Experți & Metodologie", SOC: "Experți & Metodologie",
  STA: "Experți & Metodologie", SVHA: "Experți & Metodologie",
  PTA: "Experți & Metodologie", MGA: "Experți & Metodologie",
  RDA: "Experți & Metodologie",

  // Financiar & Operațiuni
  CIA: "Financiar & Operațiuni", FPA: "Financiar & Operațiuni",
  RPA_FIN: "Financiar & Operațiuni",
}

async function main() {
  console.log("\n  Seed JG_itself — completare 73 agenți\n")

  // 1. Citim registry-ul complet
  const agentsData = JSON.parse(fs.readFileSync("C:\\Users\\Liviu\\OneDrive\\Desktop\\agents_full.json", "utf8"))
  const allAgents = agentsData.agents || agentsData

  // 2. Citim posturile existente
  const { data: existingJobs } = await apiGet("/api/v1/jobs")
  const existingTitles = new Set((existingJobs?.jobs || []).map((j: any) => j.title))

  // 3. Citim departamentele
  const { data: depts } = await apiGet("/api/v1/departments")
  const deptIds: Record<string, string> = {}
  for (const d of (Array.isArray(depts) ? depts : [])) {
    deptIds[d.name] = d.id
  }

  console.log(`  Posturi existente: ${existingTitles.size}`)
  console.log(`  Departamente: ${Object.keys(deptIds).length}`)
  console.log(`  Agenți în registry: ${allAgents.length}\n`)

  // 4. Creăm posturile lipsă
  let created = 0
  let skipped = 0

  for (const agent of allAgents) {
    // Construim titlul
    const title = `${agent.displayName} (${agent.agentRole})`

    // Skip dacă deja există (verificăm și variante)
    if (existingTitles.has(title)) { skipped++; continue }
    // Check dacă există sub altă formă
    const alreadyExists = [...existingTitles].some(t =>
      t.includes(agent.agentRole) || t.includes(agent.displayName)
    )
    if (alreadyExists) { skipped++; continue }

    const deptName = DEPT_MAP[agent.agentRole] || "Servicii Client & Marketing"
    const deptId = deptIds[deptName] || null

    const { ok, data } = await apiPost("/api/v1/jobs", {
      title,
      purpose: agent.description || agent.coldStartDescription || `${agent.displayName} — ${agent.level}`,
      responsibilities: (agent.coldStartPrompts || []).slice(0, 2).join(" | ").slice(0, 500) || agent.description,
      requirements: `Nivel: ${agent.level}. Raportează la: ${agent.parentRole || "Owner"}. Skills: ${(agent.coldStartPrompts || []).length} domenii.`,
      structureType: "AI" as const,
      departmentId: deptId,
      status: "ACTIVE",
    })

    if (ok) {
      created++
      if (created % 10 === 0) console.log(`  ... ${created} create`)
    } else {
      console.log(`  ⚠ ${title}: ${data?.message || "eroare"}`)
    }
  }

  console.log(`\n  ✓ ${created} posturi noi create`)
  console.log(`  ○ ${skipped} existente (skip)`)
  console.log(`  Total: ${existingTitles.size + created} posturi pe JG_itself`)
  console.log()
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
