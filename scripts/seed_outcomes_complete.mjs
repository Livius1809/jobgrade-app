#!/usr/bin/env node
/**
 * Seed Service Outcomes complet — metrici reale per serviciu
 *
 * Bazat pe:
 * - 4 servicii B2B (S1-S4) din project_b2b_new_services
 * - B2C carduri (1-5) din project_b2c_card*
 * - Platforma overall
 *
 * Rulare: node scripts/seed_outcomes_complete.mjs
 */

const BASE = "http://localhost:3001"
const KEY = process.env.INTERNAL_API_KEY || "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"
const BIZ = "biz_jobgrade"

const headers = { "Content-Type": "application/json", "x-internal-key": KEY }

async function post(path, data) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(data) })
  const json = await res.json()
  if (res.status === 409) { console.log(`  SKIP: ${data.serviceCode}`); return }
  if (!res.ok) { console.error(`  FAIL ${res.status}: ${data.serviceCode}`); return }
  console.log(`  OK: ${data.serviceCode} — ${data.metricName}`)
}

const outcomes = [
  // ═══ B2B Services ═══
  {
    businessId: BIZ, serviceCode: "b2b_s1_evaluare",
    serviceName: "S1: Evaluare si Ierarhizare Posturi",
    metricName: "evaluation_accuracy_vs_expert", metricUnit: "%", targetValue: 85,
    collectionMethod: "manual_review", collectionFrequency: "quarterly",
  },
  {
    businessId: BIZ, serviceCode: "b2b_s2_multigenerational",
    serviceName: "S2: Analiza Multigenerationala",
    metricName: "manager_actionability_score", metricUnit: "score", targetValue: 4.0,
    collectionMethod: "client_feedback", collectionFrequency: "per_session",
  },
  {
    businessId: BIZ, serviceCode: "b2b_s3_calitate",
    serviceName: "S3: Procese Calitate",
    metricName: "process_compliance_improvement", metricUnit: "%", targetValue: 15,
    collectionMethod: "automated", collectionFrequency: "quarterly",
  },
  {
    businessId: BIZ, serviceCode: "b2b_s4_cultura",
    serviceName: "S4: Cultura si Performanta",
    metricName: "culture_alignment_score", metricUnit: "%", targetValue: 70,
    collectionMethod: "client_feedback", collectionFrequency: "quarterly",
  },
  {
    businessId: BIZ, serviceCode: "b2b_pay_equity",
    serviceName: "Pay Equity / Gap Analysis EU 2023/970",
    metricName: "gap_detection_accuracy", metricUnit: "%", targetValue: 95,
    collectionMethod: "automated", collectionFrequency: "quarterly",
  },

  // ═══ B2C Cards ═══
  {
    businessId: BIZ, serviceCode: "b2c_card1_nucleu",
    serviceName: "B2C Card 1: Drumul catre mine",
    metricName: "authenticity_alignment_score", metricUnit: "score", targetValue: 7.0,
    collectionMethod: "automated", collectionFrequency: "per_session",
  },
  {
    businessId: BIZ, serviceCode: "b2c_card2_relatii",
    serviceName: "B2C Card 2: Eu si ceilalti",
    metricName: "relationship_insight_rating", metricUnit: "score", targetValue: 4.0,
    collectionMethod: "client_feedback", collectionFrequency: "per_session",
  },
  {
    businessId: BIZ, serviceCode: "b2c_card3_cariera",
    serviceName: "B2C Card 3: Rol profesional",
    metricName: "matching_success_rate", metricUnit: "%", targetValue: 70,
    collectionMethod: "client_feedback", collectionFrequency: "per_session",
  },
  {
    businessId: BIZ, serviceCode: "b2c_card4_succes",
    serviceName: "B2C Card 4: Oameni de succes/valoare",
    metricName: "hawkins_level_improvement", metricUnit: "points", targetValue: 20,
    collectionMethod: "automated", collectionFrequency: "monthly",
  },
  {
    businessId: BIZ, serviceCode: "b2c_card5_antreprenoriat",
    serviceName: "B2C Card 5: Antreprenoriat transformational",
    metricName: "venture_launch_rate", metricUnit: "%", targetValue: 15,
    collectionMethod: "manual_review", collectionFrequency: "quarterly",
  },

  // ═══ Platform Overall ═══
  {
    businessId: BIZ, serviceCode: "b2b_platform_overall",
    serviceName: "Platforma B2B Overall",
    metricName: "client_retention_6m", metricUnit: "%", targetValue: 80,
    collectionMethod: "automated", collectionFrequency: "monthly",
  },
  {
    businessId: BIZ, serviceCode: "b2c_platform_overall",
    serviceName: "Platforma B2C Overall",
    metricName: "user_monthly_engagement", metricUnit: "%", targetValue: 60,
    collectionMethod: "automated", collectionFrequency: "monthly",
  },
  {
    businessId: BIZ, serviceCode: "support_quality",
    serviceName: "Departament Suport",
    metricName: "first_response_resolution_rate", metricUnit: "%", targetValue: 75,
    collectionMethod: "automated", collectionFrequency: "monthly",
  },
  {
    businessId: BIZ, serviceCode: "agent_system_health",
    serviceName: "Sistem Agenti AI",
    metricName: "homeostasis_optimal_pct", metricUnit: "%", targetValue: 80,
    collectionMethod: "automated", collectionFrequency: "monthly",
  },
]

async function main() {
  console.log("Seed Outcomes Complete — " + new Date().toISOString())
  for (const o of outcomes) await post("/api/v1/outcomes", o)
  console.log(`\nTotal: ${outcomes.length} outcomes`)
}

main().catch(console.error)
