/**
 * Seed FluxStepRole pentru FLUX-002 (Remuneration System) și FLUX-010 (Compliance Calendar)
 * Run: node scripts/seed_flux_002_010.mjs
 */
import 'dotenv/config'

const API = 'http://localhost:3000/api/v1/admin/flux-step-role'
const KEY = process.env.INTERNAL_API_KEY

const mappings = [
  // ── FLUX-002 Remuneration System ───────────────────────────────────────
  // Step 1: Definire grile salariale
  { fluxId: "FLUX-002", stepId: "002-01-salary-grades", roleCode: "RDA", raci: "OWNER", isCritical: true, notes: "Definire grile pe baza rezultatelor evaluare" },
  { fluxId: "FLUX-002", stepId: "002-01-salary-grades", roleCode: "CHRO", raci: "REVIEWER", isCritical: true },
  // Step 2: Pachete compensare
  { fluxId: "FLUX-002", stepId: "002-02-comp-packages", roleCode: "RDA", raci: "OWNER", isCritical: true },
  { fluxId: "FLUX-002", stepId: "002-02-comp-packages", roleCode: "DDA", raci: "CONTRIBUTOR" },
  // Step 3: Simulări buget
  { fluxId: "FLUX-002", stepId: "002-03-budget-sim", roleCode: "DDA", raci: "OWNER", isCritical: true, notes: "Simulări what-if salary" },
  { fluxId: "FLUX-002", stepId: "002-03-budget-sim", roleCode: "COA", raci: "REVIEWER" },
  // Step 4: KPI linking
  { fluxId: "FLUX-002", stepId: "002-04-kpi-link", roleCode: "RDA", raci: "OWNER" },
  { fluxId: "FLUX-002", stepId: "002-04-kpi-link", roleCode: "CJA", raci: "REVIEWER", notes: "Conformitate KPI cu reglementări" },
  // Step 5: Benchmarking extern
  { fluxId: "FLUX-002", stepId: "002-05-benchmark", roleCode: "RDA", raci: "OWNER", isCritical: true },
  { fluxId: "FLUX-002", stepId: "002-05-benchmark", roleCode: "DDA", raci: "CONTRIBUTOR" },
  { fluxId: "FLUX-002", stepId: "002-05-benchmark", roleCode: "CDIA", raci: "CONTRIBUTOR", notes: "Surse date benchmarking" },
  // Step 6: Aprobare finală
  { fluxId: "FLUX-002", stepId: "002-06-approval", roleCode: "CHRO", raci: "OWNER", isCritical: true },
  { fluxId: "FLUX-002", stepId: "002-06-approval", roleCode: "COG", raci: "REVIEWER" },

  // ── FLUX-010 Compliance Calendar ───────────────────────────────────────
  // Step 1: Inventar obligații legale
  { fluxId: "FLUX-010", stepId: "010-01-legal-inventory", roleCode: "CJA", raci: "OWNER", isCritical: true, notes: "Inventar obligații EU + RO" },
  { fluxId: "FLUX-010", stepId: "010-01-legal-inventory", roleCode: "DPO", raci: "CONTRIBUTOR", notes: "Obligații GDPR specifice" },
  // Step 2: Calendar termene
  { fluxId: "FLUX-010", stepId: "010-02-deadline-calendar", roleCode: "CJA", raci: "OWNER", isCritical: true },
  { fluxId: "FLUX-010", stepId: "010-02-deadline-calendar", roleCode: "DOAS", raci: "CONTRIBUTOR" },
  // Step 3: Alerte pre-termen
  { fluxId: "FLUX-010", stepId: "010-03-alerts", roleCode: "CJA", raci: "OWNER" },
  { fluxId: "FLUX-010", stepId: "010-03-alerts", roleCode: "COG", raci: "NOTIFIED" },
  // Step 4: Raportare conformitate
  { fluxId: "FLUX-010", stepId: "010-04-compliance-report", roleCode: "DPO", raci: "OWNER", isCritical: true },
  { fluxId: "FLUX-010", stepId: "010-04-compliance-report", roleCode: "CJA", raci: "REVIEWER" },
  { fluxId: "FLUX-010", stepId: "010-04-compliance-report", roleCode: "CHRO", raci: "NOTIFIED" },
  // Step 5: Audit trail
  { fluxId: "FLUX-010", stepId: "010-05-audit-trail", roleCode: "DOAS", raci: "OWNER" },
  { fluxId: "FLUX-010", stepId: "010-05-audit-trail", roleCode: "CJA", raci: "REVIEWER" },
]

const res = await fetch(API, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-key': KEY },
  body: JSON.stringify({ mappings }),
})

const json = await res.json()
console.log(`FLUX-002 + FLUX-010: ${json.created ?? 0} created, ${json.updated ?? 0} updated`)
console.log('Total mappings sent:', mappings.length)
