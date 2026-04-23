import pg from "pg"
import fs from "fs"
const { Pool } = pg

const p = new Pool({
  connectionString: "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
})

const [tiers, costs, cv] = await Promise.all([
  p.query('SELECT "operationType", description, "currentModel", "coveringModel", "tokenAmplificationFactor"::float as amp FROM ai_operation_tiers ORDER BY "operationType"'),
  p.query('SELECT provider, "resourceType", "costCategory", "unitMeasure", notes, "currentCostUSD"::float as real, "coveringCostUSD"::float as cov FROM provider_costs ORDER BY "costCategory", provider, "resourceType"'),
  p.query('SELECT "bnrUsdRonRate"::float as bnr, "bufferPercent"::float as buf, "effectiveUsdRonRate"::float as rate, "valuePerCreditRON"::float as creditRON, "bnrEurRonRate"::float as eurRate, notes, "effectiveFrom" FROM credit_values ORDER BY "effectiveFrom" DESC LIMIT 1'),
])

const USD_RON = cv.rows[0].rate
const CREDIT_RON = Number(cv.rows[0].creditRON) || 8.0
const now = new Date().toISOString().slice(0, 10)

// Prețuri per model din DB
const mp = {}
costs.rows.filter(r => r.resourceType.includes("tokens")).forEach(r => {
  const model = r.resourceType.replace(/-input-tokens|-output-tokens/, "")
  const io = r.resourceType.includes("input") ? "in" : "out"
  if (!mp[model]) mp[model] = {}
  mp[model][io + "_real"] = r.real
  mp[model][io + "_cov"] = r.cov
})

const TOK = {
  "consultant-hr-chat":      { i: 2217,  o: 1500, unit: "per mesaj",       cr: 0, crNote: "3 cr/min consultanță; 60 min/lună gratuit familiarizare" },
  "import-stat-functii":     { i: 2650,  o: 4000, unit: "per fișier",      cr: 0, crNote: "contra credite — de stabilit" },
  "intent-classification":   { i: 2000,  o: 200,  unit: "per clasificare", cr: 0, crNote: "intern organism (nu client)" },
  "job-ad-generation":       { i: 850,   o: 1500, unit: "per anunț",       cr: 4, crNote: "JOB_AD" },
  "job-auto-evaluation":     { i: 1900,  o: 1000, unit: "per poziție",     cr: 0, crNote: "60 cr / 10 poz inclus în pachetul Baza" },
  "job-description-ai":      { i: 975,   o: 1500, unit: "per fișă",        cr: 0, crNote: "12 cr / 10 poz inclus în pachetul Baza" },
  "kpi-generation":          { i: 375,   o: 1200, unit: "per fișă KPI",    cr: 3, crNote: "KPI_SHEET" },
  "mediation-facilitation":  { i: 2000,  o: 1500, unit: "per rundă",       cr: 0, crNote: "+1 cr/poz (var B,D); +20 cr/poz (var C consultant)" },
  "pay-gap-analysis":        { i: 1500,  o: 2000, unit: "per raport",      cr: 3, crNote: "PAY_GAP_REPORT" },
  "relevance-check":         { i: 800,   o: 400,  unit: "per verificare",  cr: 0, crNote: "gratuit (Haiku, cost minimal)" },
  "report-generation":       { i: 1750,  o: 2000, unit: "per sesiune",     cr: 0, crNote: "inclus în pachetul Baza" },
  "session-analysis":        { i: 1750,  o: 2000, unit: "per sesiune",     cr: 4, crNote: "SESSION_ANALYSIS" },
  "social-media-generation": { i: 500,   o: 800,  unit: "per postare",     cr: 2, crNote: "SOCIAL_MEDIA_PER_PLATFORM" },
  "website-extraction":      { i: 850,   o: 600,  unit: "per companie",    cr: 2, crNote: "COMPANY_EXTRACT" },
}

// Exporturi non-AI
const EXPORTS = [
  { name: "Export PDF", cr: 5, costRON: 0.02, code: "EXPORT_PDF" },
  { name: "Export Excel", cr: 5, costRON: 0.01, code: "EXPORT_EXCEL" },
  { name: "Export JSON", cr: 5, costRON: 0.005, code: "EXPORT_JSON" },
  { name: "Export XML", cr: 5, costRON: 0.005, code: "EXPORT_XML" },
  { name: "Generare grade salariale", cr: 5, costRON: 1.0, code: "GENERATE_GRADES" },
  { name: "Simulare remunerare", cr: 3, costRON: 0.8, code: "SIMULATE_REMUNERATION" },
  { name: "Recalibrare consens", cr: 2, costRON: 1.49, code: "RECALIBRATION_ROUND" },
]

// Operații gratuite
const FREE_OPS = [
  { name: "Adăugare/editare post", resource: "DB write", cost: "<0.001" },
  { name: "Import posturi din Excel", resource: "ExcelJS + DB write", cost: "<0.001" },
  { name: "Import stat salarii XLSX/CSV", resource: "ExcelJS + DB write", cost: "<0.001" },
  { name: "Adăugare angajat manual", resource: "DB write", cost: "<0.001" },
  { name: "Creare sesiune evaluare", resource: "DB write", cost: "<0.001" },
  { name: "Scorare individuală (comisie)", resource: "DB write × 6 criterii", cost: "<0.001" },
  { name: "Consens: vot", resource: "DB write", cost: "<0.001" },
  { name: "Consens: recalibrare", resource: "DB logic", cost: "<0.001" },
  { name: "Consens: decizie", resource: "DB logic", cost: "<0.001" },
  { name: "JE Process Engine (toate acțiunile)", resource: "DB logic complexă (Pitariu)", cost: "<0.001" },
  { name: "Finalizare sesiune", resource: "DB finalizare", cost: "<0.001" },
  { name: "Vizualizare rezultate", resource: "DB read", cost: "<0.001" },
  { name: "Vizualizare raport (fără export)", resource: "DB read + render", cost: "<0.001" },
  { name: "Dashboard pay gap", resource: "DB read + calcul indicatori", cost: "<0.001" },
  { name: "Profil companie CRUD", resource: "DB read/write", cost: "<0.001" },
  { name: "Lookup ANAF", resource: "API extern public", cost: "$0" },
  { name: "Navigare portal / progres", resource: "7 DB queries paralele", cost: "<0.001" },
  { name: "Smart Activation (badge-uri)", resource: "Company Profiler cache", cost: "<0.001" },
  { name: "Jurnal activități", resource: "DB write", cost: "<0.001" },
  { name: "Account export/import/reset", resource: "DB + crypto", cost: "<0.01" },
  { name: "Verificare relevanță fișă (real-time)", resource: "Haiku API", cost: "0.012 RON" },
]

let out = ""
const w = (s) => { out += s + "\n"; console.log(s) }

w("# TABEL COMPLET PRICING — JobGrade Platform")
w("## Generat automat din DB producție")
w("")
w(`**Data generare:** ${now}`)
w(`**Sursă:** DB prod (22 provider_costs + 14 ai_operation_tiers + 1 credit_value)`)
w(`**Curs:** 1 USD = ${USD_RON} RON (BNR ${cv.rows[0].bnr} + buffer ${cv.rows[0].buf}%)`)
w(`**Credit:** 1 credit = ${CREDIT_RON} RON`)
w("")
w("---")
w("")

// ═══ SECȚIUNEA 1: VALOARE CREDIT ═══
w("## 1. VALOAREA CREDITULUI")
w("")
w("| Parametru | Valoare | Sursă |")
w("|-----------|---------|-------|")
w(`| Curs BNR USD/RON | ${cv.rows[0].bnr} | bnr.ro |`)
w(`| Curs BNR EUR/RON | ${cv.rows[0].eurRate || "—"} | bnr.ro |`)
w(`| Buffer valutar | +${cv.rows[0].buf}% | Decizie COG |`)
w(`| Curs efectiv USD/RON | ${USD_RON} | BNR × (1 + buffer) |`)
w(`| Valoare 1 credit | ${CREDIT_RON} RON | Decizie COG+Owner |`)
w(`| Notă | ${cv.rows[0].notes || "—"} | |`)
w(`| Efectiv din | ${new Date(cv.rows[0].effectiveFrom).toISOString().slice(0, 10)} | |`)
w("")

// ═══ SECȚIUNEA 2: PREȚURI FURNIZORI ═══
w("## 2. PREȚURI FURNIZORI (provider_costs)")
w("")

// CAPEX
w("### 2.1 CAPEX — Costuri fixe lunare")
w("")
w("| Furnizor | Resursă | Unitate | Cost real USD | Cost acoperitor USD | Notă |")
w("|----------|---------|---------|-------------|-------------------|------|")
let totalCapexReal = 0, totalCapexCov = 0
costs.rows.filter(r => r.costCategory === "CAPEX").forEach(r => {
  totalCapexReal += r.real
  totalCapexCov += r.cov
  w(`| ${r.provider} | ${r.resourceType} | ${r.unitMeasure} | $${r.real.toFixed(2)} | $${r.cov.toFixed(2)} | ${r.notes || ""} |`)
})
w(`| **TOTAL** | | | **$${totalCapexReal.toFixed(2)}** | **$${totalCapexCov.toFixed(2)}** | **=${(totalCapexCov * USD_RON).toFixed(0)} RON** |`)
w("")

// OPEX per client
w("### 2.2 OPEX per client — Costuri fixe per cont activ")
w("")
w("| Furnizor | Resursă | Unitate | Cost real USD | Cost acoperitor USD |")
w("|----------|---------|---------|-------------|-------------------|")
costs.rows.filter(r => r.costCategory === "OPEX_PER_CLIENT").forEach(r => {
  w(`| ${r.provider} | ${r.resourceType} | ${r.unitMeasure} | $${r.real.toFixed(2)} | $${r.cov.toFixed(2)} |`)
})
w("")

// OPEX per execution
w("### 2.3 OPEX per execuție — Costuri variabile")
w("")
w("| Furnizor | Resursă | Unitate | Cost real USD | Cost acoperitor USD |")
w("|----------|---------|---------|-------------|-------------------|")
costs.rows.filter(r => r.costCategory === "OPEX_PER_EXECUTION").forEach(r => {
  w(`| ${r.provider} | ${r.resourceType} | ${r.unitMeasure} | $${r.real.toFixed(6)} | $${r.cov.toFixed(6)} |`)
})
w("")

// ═══ SECȚIUNEA 3: AI OPERATION TIERS ═══
w("## 3. TIERING AI (ai_operation_tiers)")
w("")
w("| Operație | Descriere | Model real | Model covering | Amplif. |")
w("|----------|-----------|-----------|---------------|---------|")
tiers.rows.forEach(t => {
  w(`| ${t.operationType} | ${t.description || "—"} | ${t.currentModel} | ${t.coveringModel} | ×${t.amp.toFixed(1)} |`)
})
w("")

// ═══ SECȚIUNEA 4: COST PER SERVICIU AI ═══
w("## 4. COST PER SERVICIU AI — Calculat din tokeni reali")
w("")
w("| Serviciu | Model real | Input tok | Output tok | Amp | Cost real USD | Cost real RON | Plasa 1+2 RON | Credite | Preț RON | Marja | Cod credit | Notă |")
w("|----------|-----------|-----------|------------|-----|-------------|--------------|---------------|---------|----------|-------|------------|------|")

tiers.rows.forEach(tier => {
  const t = TOK[tier.operationType] || { i: 0, o: 0, unit: "?", cr: 0, crNote: "" }
  const cur = tier.currentModel.replace("claude-", "").replace("-20251001", "").replace("-20250514", "")
  const covKey = tier.coveringModel.replace(/-20251001|-20250514/g, "")
  const realKey = tier.currentModel.replace(/-20251001|-20250514/g, "")

  const rp = mp[realKey] || { in_real: 0, out_real: 0 }
  const cp = mp[covKey] || { in_cov: 0, out_cov: 0 }

  const costReal = (t.i / 1e6 * (rp.in_real || 0)) + (t.o / 1e6 * (rp.out_real || 0))
  const costRealRON = costReal * USD_RON
  const costCov = (t.i * tier.amp / 1e6 * (cp.in_cov || 0)) + (t.o * tier.amp / 1e6 * (cp.out_cov || 0))
  const costCovRON = costCov * USD_RON

  const pretRON = t.cr * CREDIT_RON
  const marja = pretRON > 0 ? ((1 - costCovRON / pretRON) * 100).toFixed(0) + "%" : "inclus"

  w(`| ${tier.operationType} | ${cur} | ${t.i} | ${t.o} | ×${tier.amp.toFixed(1)} | $${costReal.toFixed(5)} | ${costRealRON.toFixed(3)} RON | **${costCovRON.toFixed(3)} RON** | ${t.cr || "—"} | ${pretRON > 0 ? pretRON + " RON" : "—"} | **${marja}** | ${t.crNote} | ${t.unit} |`)
})
w("")

// ═══ SECȚIUNEA 5: EXPORTURI ȘI ALTE SERVICII NON-AI ═══
w("## 5. EXPORTURI ȘI SERVICII NON-AI (contra credite)")
w("")
w("| Serviciu | Credite | Preț RON | Cost acoperitor RON | Marja | Cod credit |")
w("|----------|---------|----------|-------------------|-------|------------|")
EXPORTS.forEach(e => {
  const pretRON = e.cr * CREDIT_RON
  const marja = ((1 - e.costRON / pretRON) * 100).toFixed(0)
  w(`| ${e.name} | ${e.cr} cr | ${pretRON} RON | ${e.costRON} RON | **${marja}%** | ${e.code} |`)
})
w("")

// ═══ SECȚIUNEA 6: OPERAȚII GRATUITE ═══
w("## 6. OPERAȚII GRATUITE (incluse în abonament)")
w("")
w("| Operație | Resurse | Cost intern |")
w("|----------|---------|-------------|")
FREE_OPS.forEach(o => {
  w(`| ${o.name} | ${o.resource} | ${o.cost} |`)
})
w("")

// ═══ SECȚIUNEA 7: VARIANTE EVALUARE ═══
w("## 7. VARIANTE EVALUARE — Credite suplimentare per poziție")
w("")

const evalTier = tiers.rows.find(t => t.operationType === "job-auto-evaluation")
const medTier = tiers.rows.find(t => t.operationType === "mediation-facilitation")
const humanCov = costs.rows.find(r => r.resourceType === "human-specialist-min")
const cpOpus = mp["claude-opus-4-6"] || { in_cov: 20, out_cov: 100 }

const evalCov = ((1900 * evalTier.amp / 1e6 * cpOpus.in_cov) + (1000 * evalTier.amp / 1e6 * cpOpus.out_cov)) * USD_RON
const medCov = ((2000 * medTier.amp / 1e6 * cpOpus.in_cov) + (1500 * medTier.amp / 1e6 * cpOpus.out_cov)) * USD_RON
const humanCovRON = humanCov.cov * 7 * USD_RON

w("| Variantă | Componente | Cost acoperitor/poz | +Credite/poz | Exemplu 20 poz | Marja |")
w("|----------|-----------|-------------------|-------------|----------------|-------|")
w(`| **A: Auto AI** | job-auto-evaluation (Haiku, amp ${evalTier.amp}) | ${evalCov.toFixed(2)} RON | 0 (inclus) | 0 cr / 0 RON | inclus |`)
w(`| **B: Comisie + AI** | mediation-facilitation (Sonnet, amp ${medTier.amp}) | ${medCov.toFixed(2)} RON | +1 cr | +20 cr / +160 RON | ~90% |`)
w(`| **C: Comisie + Consultant** | human-specialist-min ($${humanCov.cov}/min × 7 min) | ${humanCovRON.toFixed(2)} RON | +20 cr | +400 cr / +3.200 RON | ~33% |`)
w(`| **D: Hibrid AI→Comisie** | A complet + B pe ~30% posturi | ${(evalCov + medCov * 0.3).toFixed(2)} RON | +1 cr | +20 cr / +160 RON | ~90% |`)
w("")

// ═══ SECȚIUNEA 8: CHAT CONSULTANT HR ═══
w("## 8. CHAT CONSULTANT HR — Tarifare diferențiată")
w("")
const chatCov = ((2217 * 1.2 / 1e6 * cpOpus.in_cov) + (1500 * 1.2 / 1e6 * cpOpus.out_cov)) * USD_RON

w("| Mod | Badge | Cost/mesaj acoperitor | Credite | Inclus lunar | Clasificare |")
w("|-----|-------|---------------------|---------|-------------|-------------|")
w(`| **Familiarizare** | 🟢 | ${chatCov.toFixed(2)} RON | 0 | 60 min (~120 mesaje) | Platformă, servicii, funcționalități |`)
w(`| **Consultanță** | 🟡 | ${chatCov.toFixed(2)} RON | 3 cr/min | Din sold credite | Norme, lege, cod muncă, proceduri |`)
w("")
w(`**Cost familiarizare/client/lună:** ~${(chatCov * 120).toFixed(0)} RON (absorbit de abonament 399 RON = ${((chatCov * 120) / 399 * 100).toFixed(0)}%)`)
w("")

// ═══ SECȚIUNEA 9: PACHETE CREDITE ═══
w("## 9. PACHETE CREDITE")
w("")
w("| Pachet | Credite | RON | Per credit | Discount | Stripe Price ID |")
w("|--------|---------|-----|-----------|----------|-----------------|")
;[
  ["Micro", 100, 800, "8.00", "0%"],
  ["Mini", 250, 1875, "7.50", "6%"],
  ["Start", 500, 3500, "7.00", "12%"],
  ["Business", 1500, 9750, "6.50", "19%"],
  ["Professional", 5000, 30000, "6.00", "25%"],
  ["Enterprise", 15000, 82500, "5.50", "31%"],
].forEach(([n, cr, ron, ppc, d]) => {
  w(`| ${n} | ${cr} | ${ron} RON | ${ppc} RON | ${d} | env var |`)
})
w("")

// ═══ SECȚIUNEA 10: FORMULE PACHETE SERVICII ═══
w("## 10. FORMULE PACHETE SERVICII (din pricing.ts)")
w("")
w("| Layer | Nume | Componente | Formula credite |")
w("|-------|------|-----------|----------------|")
w("| 1 | Ordine internă (Baza) | JE AUTO + Fișe AI + Structură salarială | `60×poz + 12×poz + 20+1×ang` |")
w("| 2 | Conformitate (Nivelul 1) | + Pay gap + Benchmark | `+ 15+0.5×ang + 30+1.5×poz` |")
w("| 3 | Competitivitate (Nivelul 2) | + Pachete salariale + Performanță + Impact | `+ 25+1×poz + 15×ang + 40` |")
w("| 4 | Dezvoltare (Nivelul 3) | + HR + Recrutare + Manual angajat | `+ 40+1×ang + 60×proiecte + 20+1.5×poz` |")
w("")

// ═══ SECȚIUNEA 11: DISCOUNT COMPANII ═══
w("## 11. DISCOUNT PE DIMENSIUNE COMPANIE")
w("")
w("| Tip | Poziții | Angajați | Discount servicii |")
w("|-----|---------|----------|-------------------|")
w("| Starter | 1-50 | 1-50 | 0% |")
w("| Professional | 51-150 | 51-150 | 12% |")
w("| Enterprise | 150+ | 150+ | 25% |")
w("")

// ═══ SECȚIUNEA 12: ABONAMENT ═══
w("## 12. ABONAMENT")
w("")
w("| Componentă | Preț | Include |")
w("|-----------|------|--------|")
w("| Lunar | 399 RON (fără TVA) | Acces portal, dashboard, MVV draft, profil sectorial, consultant HR 60 min/lună |")
w("| Anual | 3.990 RON (17% discount) | Idem |")
w("| NU include | — | Credite (se cumpără separat) |")
w("")

// ═══ SECȚIUNEA 13: CAPEX vs ABONAMENT ═══
w("## 13. VERIFICARE FEZABILITATE")
w("")
w("| Metrică | Valoare |")
w("|---------|---------|")
w(`| CAPEX total (covering) | $${totalCapexCov.toFixed(2)}/lună = ${(totalCapexCov * USD_RON).toFixed(0)} RON |`)
w(`| Abonament | 399 RON/lună |`)
w(`| Break-even CAPEX | ${Math.ceil(totalCapexCov * USD_RON / 399)} clienți |`)
w(`| Chat familiarizare/client | ~${(chatCov * 120).toFixed(0)} RON/lună |`)
w(`| Marjă servicii AI | 94-99% |`)
w(`| Marjă consultant uman | ~33% |`)
w(`| Marjă exporturi | 96-99% |`)
w("")

w("---")
w("")
w("*Generat automat din DB producție. Script: scripts/pricing-table-full.mjs*")
w("*Responsabil actualizare: COG + DMA. Aprobare: Owner.*")
w("*La fiecare schimbare de preț furnizor → regenerează acest document.*")

// Salvăm fișierul
fs.writeFileSync("docs/pricing-tables-complete.md", out)
console.log("\n✓ Salvat în docs/pricing-tables-complete.md (" + (out.length / 1024).toFixed(1) + " KB)")

await p.end()
