#!/usr/bin/env node
/**
 * Seed Living Organization — D1 Boundary Rules + G3 Rituals
 *
 * Regulile fundamentale de graniță (moral core, GDPR, scope) +
 * ritualurile default (retrospectivă, review strategic, calibrare).
 *
 * Idempotent: skip dacă code există deja.
 * Rulare: node scripts/seed_living_org.mjs
 */

const BASE = "http://localhost:3001"
const KEY = process.env.INTERNAL_API_KEY || "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"
const BIZ = "biz_jobgrade"

const headers = { "Content-Type": "application/json", "x-internal-key": KEY }

async function post(path, data) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(data) })
  const json = await res.json()
  if (res.status === 409) {
    console.log(`  SKIP (exists): ${data.code}`)
    return json
  }
  if (!res.ok) {
    console.error(`  FAIL ${res.status}: ${JSON.stringify(json)}`)
    return null
  }
  console.log(`  OK: ${data.code}`)
  return json
}

async function seedBoundaryRules() {
  console.log("\n=== D1: Boundary Rules ===")

  const rules = [
    {
      businessId: null,
      code: "moral-core-hawkins-sub200",
      name: "Moral Core: Hawkins sub 200",
      description: "Blocheaza continut care opereaza sub nivelul 200 pe scala Hawkins (forta, frica, furie, rusine)",
      ruleType: "MORAL_CORE",
      severity: "CRITICAL",
      condition: { keywords: ["manipulare", "intimidare", "santaj", "amenintare", "umilire", "discriminare", "hartuire"] },
      action: "BLOCK",
      notifyRoles: ["COG", "SAFETY_MONITOR"],
      escalateToOwner: true,
    },
    {
      businessId: null,
      code: "moral-core-shadow-bypass",
      name: "Moral Core: Shadow Bypass",
      description: "Detecteaza incercari de a ocoli mecanismele de siguranta sau de a simula competente inexistente",
      ruleType: "MORAL_CORE",
      severity: "HIGH",
      condition: { keywords: ["ignora regulile", "fara restrictii", "pretinde ca esti", "simuleaza", "bypass safety"] },
      action: "QUARANTINE",
      notifyRoles: ["COG", "SCA"],
      escalateToOwner: true,
    },
    {
      businessId: BIZ,
      code: "privacy-gdpr-personal-data",
      name: "GDPR: Date personale in context neprotejat",
      description: "Detecteaza transmiterea de date personale (CNP, adresa, telefon) in canale nesecurizate",
      ruleType: "PRIVACY",
      severity: "CRITICAL",
      condition: { regex: "\\b\\d{13}\\b|\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b", context: "client_input" },
      action: "QUARANTINE",
      notifyRoles: ["DPO", "COG"],
      escalateToOwner: true,
    },
    {
      businessId: BIZ,
      code: "scope-cja-salary-modify",
      name: "Scope: CJA nu poate modifica salarii",
      description: "CJA evalueaza job-uri, NU modifica salarii. Scope violation daca incearca.",
      ruleType: "SCOPE_VIOLATION",
      severity: "HIGH",
      condition: { roleScope: "CJA", forbiddenActions: ["modify_salary", "approve_payment", "change_compensation"] },
      action: "BLOCK",
      notifyRoles: ["COG", "CFO"],
      escalateToOwner: false,
    },
    {
      businessId: BIZ,
      code: "data-integrity-score-bounds",
      name: "Data Integrity: Score evaluare in [0, 100]",
      description: "Scorurile de evaluare trebuie sa fie intre 0 si 100",
      ruleType: "DATA_INTEGRITY",
      severity: "MEDIUM",
      condition: { fieldName: "score", minValue: 0, maxValue: 100 },
      action: "BLOCK",
      notifyRoles: [],
      escalateToOwner: false,
    },
    {
      businessId: BIZ,
      code: "consistency-mvv-contradiction",
      name: "Consistency: Contradictie cu MVV declarat",
      description: "Detecteaza directive care contrazic misiunea/viziunea/valorile companiei",
      ruleType: "CONSISTENCY",
      severity: "MEDIUM",
      condition: { keywords: ["contravine misiunii", "ignora valorile", "nu ne intereseaza viziunea"], context: "directive" },
      action: "WARN",
      notifyRoles: ["COG", "DOAS"],
      escalateToOwner: false,
    },
  ]

  for (const rule of rules) {
    await post("/api/v1/boundaries", rule)
  }
}

async function seedRituals() {
  console.log("\n=== G3: Rituals ===")

  const rituals = [
    {
      businessId: BIZ,
      code: "weekly-retrospective",
      name: "Retrospectiva Saptamanala",
      description: "Review saptamanal: ce a mers bine, ce nu, ce ajustam. Participanti: management tactic + COG.",
      ritualType: "RETROSPECTIVE",
      cronExpression: "0 17 * * 5",
      templatePrompt: "Genereaza un raport retrospectiv pentru saptamana curenta:\n1. Top 3 realizari (bazat pe objectives health + disfunctii rezolvate)\n2. Top 3 blocaje (bazat pe disfunctii OPEN + objectives AT_RISK)\n3. Lectii invatate (bazat pe patches confirmate/revertate)\n4. Propuneri pentru saptamana urmatoare\nFormat: text structurat, max 500 cuvinte.",
      participantRoles: ["COG", "CCO", "CFO", "COA", "COCSA", "DMA"],
      outputTarget: "ntfy",
    },
    {
      businessId: BIZ,
      code: "monthly-strategic-review",
      name: "Review Strategic Lunar",
      description: "Analiza lunara a directiei strategice: obiective, teme externe, adaptare.",
      ritualType: "STRATEGIC",
      cronExpression: "0 10 1 * *",
      templatePrompt: "Genereaza un raport strategic lunar:\n1. Status obiective organizationale (% completare, risk)\n2. Teme strategice dominante (din COSO)\n3. Homeostasis status (targets in/out of band)\n4. Adaptation metrics (OODA time, KB velocity, patch effectiveness)\n5. Recomandari strategice pentru luna urmatoare\nFormat: executive summary, max 800 cuvinte.",
      participantRoles: ["COG", "CCO", "CFO"],
      outputTarget: "report",
    },
    {
      businessId: BIZ,
      code: "calibration-quarterly",
      name: "Calibrare Trimestriala",
      description: "Recalibrare praguri, reguli boundary, bugete resurse. Review complet al configuratiei sistemului.",
      ritualType: "CALIBRATION",
      cronExpression: "0 10 1 1,4,7,10 *",
      templatePrompt: "Review de calibrare trimestriala:\n1. Boundary rules: false positives detectate, reguli de actualizat\n2. Homeostatic targets: praguri care necesita ajustare\n3. Resource budgets: agenti care au depasit/sub-utilizat consistent\n4. Pruning candidates: KB entries flagged, decizie batch\n5. Wild cards: engagement rate, idei promovate\nPropune ajustari concrete cu justificare.",
      participantRoles: ["COG", "COA", "DOAS"],
      outputTarget: "report",
    },
    {
      businessId: BIZ,
      code: "post-incident-template",
      name: "Post-Incident Review",
      description: "Template activat manual dupa incidente. Analiza root cause + actiuni preventive.",
      ritualType: "POST_INCIDENT",
      cronExpression: "0 0 31 2 *",
      templatePrompt: "Post-incident review:\n1. Timeline: ce s-a intamplat, cand, in ce ordine\n2. Impact: ce servicii/clienti au fost afectati\n3. Root cause: de ce s-a intamplat (5 whys)\n4. Ce a functionat: detectia, remedierea, comunicarea\n5. Ce nu a functionat: gaps in monitoring, response time\n6. Actiuni preventive: ce schimbam concret\nFormat: structurat, fiecare punct max 3 propozitii.",
      participantRoles: ["COG", "COA", "DPA"],
      outputTarget: "kb",
    },
    {
      businessId: BIZ,
      code: "celebration-outcome-met",
      name: "Celebrare Obiectiv Atins",
      description: "Activat cand un ServiceOutcome atinge targetValue. Recunoastere + propagare succes.",
      ritualType: "CELEBRATION",
      cronExpression: "0 0 31 2 *",
      templatePrompt: "Un obiectiv a fost atins! Genereaza:\n1. Ce obiectiv, ce metrica, cat a durat\n2. Cine a contribuit (agenti + roluri umane)\n3. Ce a functionat (ce comportamente/patches au ajutat)\n4. Cum propagam succesul (F2 propagation candidates)\n5. Urmatorul milestone natural\nTon: celebrator dar concret.",
      participantRoles: ["COG"],
      outputTarget: "ntfy",
    },
  ]

  for (const ritual of rituals) {
    await post("/api/v1/rituals", ritual)
  }
}

async function seedOutcomes() {
  console.log("\n=== G1: Service Outcomes (schema seed) ===")

  const outcomes = [
    {
      businessId: BIZ,
      serviceCode: "b2b_s1_evaluare",
      serviceName: "Evaluare si Ierarhizare Posturi",
      metricName: "evaluation_accuracy_vs_expert",
      metricUnit: "%",
      targetValue: 85,
      collectionMethod: "manual_review",
      collectionFrequency: "quarterly",
    },
    {
      businessId: BIZ,
      serviceCode: "b2b_platform_overall",
      serviceName: "Platforma B2B Overall",
      metricName: "client_retention_6m",
      metricUnit: "%",
      targetValue: 80,
      collectionMethod: "automated",
      collectionFrequency: "monthly",
    },
    {
      businessId: BIZ,
      serviceCode: "b2c_card3_cariera",
      serviceName: "B2C Card 3 - Rol Profesional",
      metricName: "matching_success_rate",
      metricUnit: "%",
      targetValue: 70,
      collectionMethod: "client_feedback",
      collectionFrequency: "per_session",
    },
  ]

  for (const outcome of outcomes) {
    await post("/api/v1/outcomes", outcome)
  }
}

async function main() {
  console.log("Seed Living Organization — " + new Date().toISOString())
  await seedBoundaryRules()
  await seedRituals()
  await seedOutcomes()
  console.log("\nDone.")
}

main().catch(console.error)
