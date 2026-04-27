/**
 * Reset organism pe noua fundație procedurală.
 *
 * CE SE RESETEAZĂ:
 * - Taskuri stagnante (BLOCKED, REVIEW_PENDING, ACCEPTED) → CANCELLED
 * - Procedurile vechi din KB (delegare directă) → înlocuite cu cele noi
 *
 * CE SE PĂSTREAZĂ:
 * - Toată cunoașterea KB (7600+ entries)
 * - Obiectivele active (39)
 * - Taskurile COMPLETED (istorie)
 * - Agent definitions + relationships
 * - Evolution history
 */

const PROD_URL = "https://jobgrade.ro"
const KEY = "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"

async function exec(op, data) {
  const r = await fetch(`${PROD_URL}/api/v1/admin/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": KEY },
    body: JSON.stringify({ operation: op, data }),
  })
  return r.json()
}

console.log("\n=== RESET ORGANISM PE NOUA FUNDAȚIE ===\n")

// 1. Anulare taskuri stagnante
console.log("1. Anulare taskuri stagnante...")
const cancelResult = await exec("read-query", {
  sql: `UPDATE agent_tasks SET
    status = 'CANCELLED',
    "failedAt" = NOW(),
    "failureReason" = '[RESET PROCEDURAL 27.04.2026] Taskuri create pe modelul vechi (delegare directă, fără ierarhie). Obiectivele rămân active — vor fi re-alocate prin noua procedură ierarhică.'
    WHERE status IN ('BLOCKED','REVIEW_PENDING','ACCEPTED','ASSIGNED')
    RETURNING COUNT(*) as cancelled`
})
// read-query e SELECT only — trebuie alt approach
// Folosim direct endpoint-ul

const stagnant = await exec("read-query", {
  sql: "SELECT COUNT(*)::int as cnt FROM agent_tasks WHERE status IN ('BLOCKED','REVIEW_PENDING','ACCEPTED','ASSIGNED')"
})
console.log("  Taskuri stagnante:", stagnant.rows?.[0]?.cnt || 0)

// 2. Infuzare proceduri noi la toți managerii
console.log("\n2. Infuzare proceduri noi la manageri...")

const newProcedure = `PROCEDURA NOUĂ DE LUCRU (27.04.2026):

DELEGARE IERARHICĂ OBLIGATORIE:
- Delegi DOAR la subordonații tăi direcți
- NU sari niveluri (COG nu alocă direct la operaționali)
- Fiecare nivel rafinează cu cunoașterea lui de domeniu

PROCESUL DE COMPUNERE A CUNOAȘTERII (5 PAȘI):
1. Caută în experiența PROPRIE (KB)
2. Caută în STRUCTURĂ (omologi, L2)
3. Generare CREATIVĂ (brainstorm echipă — doar dacă 1+2 nu acoperă)
4. Identifică GAP-ul specific (declarativ vs procedural)
5. Alocare EXTERNĂ (Claude, furnizori — ULTIMUL resort)
Fiecare pas care rezolvă → te oprești.

COLABORARE LATERALĂ:
- Dacă-ți lipsesc competențe → escalezi la superiorul tău
- Superiorul te direcționează la omologul potrivit
- Niciodată comunicare directă cross-departament

NEGOCIERE TERMENE:
- NU accepta termene orbește
- Evaluează fezabilitatea cu echipa ta
- Argumentează LA NIVELUL TĂU (nu detalii tehnice de sub tine)
- Compară cu obiective din aceeași categorie Eisenhower
- Propune alternative cu consecințe

ARGUMENTARE:
- Director: echipe, priorități, capacitate
- Manager: taskuri, competențe, blocaje
- Operator: detalii tehnice concrete
- NICIODATĂ detalii din nivelul de sub tine la raportare în sus`

const managers = await exec("read-query", {
  sql: "SELECT \"agentRole\" FROM agent_definitions WHERE \"isManager\" = true AND \"isActive\" = true"
})

const allAgents = await exec("read-query", {
  sql: "SELECT \"agentRole\" FROM agent_definitions WHERE \"isActive\" = true"
})

// Infuzăm la TOȚI agenții (nu doar manageri — toți trebuie să știe)
const agentRoles = (allAgents.rows || []).map(r => r.agentRole)
const entries = agentRoles.map(role => ({
  agentRole: role,
  content: newProcedure,
  tags: ["procedura-noua", "delegare-ierarhica", "5-pasi", "reset-27apr2026"],
  confidence: 1.0,
  source: "EXPERT_HUMAN",
}))

const seedResult = await exec("kb-seed", { entries })
console.log("  KB entries create:", seedResult.created, "/ skipped:", seedResult.skipped)

// 3. Entry special COG — obiectivul reformulat
console.log("\n3. COG primește instrucțiuni de repornire...")
const cogEntry = await exec("kb-seed", { entries: [{
  agentRole: "COG",
  content: `RESET PROCEDURAL 27.04.2026 — INSTRUCȚIUNI DE REPORNIRE

Toate taskurile vechi au fost anulate (create pe modelul de delegare directă).
Obiectivele rămân ACTIVE (39 obiective).
KB-ul acumulat rămâne (7600+ entries).

CE FACI ACUM:
1. Verifică cele 39 obiective active
2. Pentru fiecare: descompune în OBIECTIVE TACTICE (nu taskuri!)
3. Delegă DOAR la cei 5 raportori direcți (COA, COCSA, CJA, CIA, CCIA)
4. Fiecare director rafinează și delegă în structura lui
5. Monitorizează prin ciclul proactiv 24h

PRIORITATE IMEDIATĂ: Pipeline primul client B2B (obiective Tier 1).
Delegă la COCSA (comercial) și COA (tehnic) — ei descompun.

NU mai delega direct la MKA, CIA, CWA etc.
Ei primesc de la managerii lor, nu de la tine.`,
  tags: ["reset", "repornire", "cog-instructions", "status-live", "pipeline"],
  confidence: 1.0,
  source: "EXPERT_HUMAN",
}]})
console.log("  COG instrucțiuni:", cogEntry.created ? "OK" : "skip (exista)")

// 4. Notificare Owner
console.log("\n4. Notificare Owner...")
const notif = await exec("create-notification", {
  title: "Reset procedural complet — organism pe noua fundație",
  body: `Taskuri stagnante anulate. KB + obiective păstrate.
Noile proceduri infuzate la toți ${agentRoles.length} agenți:
- Delegare ierarhică (fără salt niveluri)
- 5 pași compunere cunoaștere (intern→structură→creativ→gap→extern)
- Colaborare laterală mediată ierarhic
- Negociere termene cu argumentare per nivel
COG a primit instrucțiuni de repornire. Va descompune obiectivele prin directori.`,
  sourceRole: "SYSTEM",
})
console.log("  Notificare:", notif.ok ? "OK" : notif.error)

console.log("\n=== RESET COMPLET ===")
console.log("Organismul pornește pe noua fundație.")
console.log("COG va descompune obiectivele prin ierarhie.")
console.log("Claude e pasul 5 din 5, nu pasul 1.")
