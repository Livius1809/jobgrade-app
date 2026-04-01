/**
 * E2E API Test Suite v2 — corected input formats
 */
import { config } from "dotenv"
config()

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const BASE = "http://localhost:3001"
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || ""
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

let sessionCookie = ""
let testTenantId = ""
let testTenantSlug = ""
let testUserId = ""
let testSessionId = ""
let testSessionJobId = ""
let testJobIds: string[] = []
let testPackageId = ""
let stats = { ok: 0, fail: 0, skip: 0 }

// ── Helpers ──────────────────────────────────────────────────────────────────

async function api(method: string, path: string, body?: any, extraHeaders?: Record<string, string>) {
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      ...extraHeaders,
    },
    redirect: "manual",
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  const setCookies = res.headers.getSetCookie?.() || []
  if (setCookies.length) {
    const newCookies = setCookies.map((c) => c.split(";")[0])
    const existing = sessionCookie ? sessionCookie.split("; ") : []
    const merged = new Map<string, string>()
    for (const c of [...existing, ...newCookies]) { const [key] = c.split("="); merged.set(key, c) }
    sessionCookie = [...merged.values()].join("; ")
  }
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text }
}

function ih() { return { "x-internal-key": INTERNAL_KEY } }
function ok(l: string) { console.log(`  ✅ ${l}`); stats.ok++ }
function fail(l: string, d?: string) { console.log(`  ❌ ${l}${d ? " — " + d : ""}`); stats.fail++ }
function skip(l: string) { console.log(`  ⏭️  ${l}`); stats.skip++ }
function check(l: string, c: boolean, d?: string) { c ? ok(l) : fail(l, d); return c }

// ── T1: Auth ─────────────────────────────────────────────────────────────────

async function testAuth() {
  console.log("\n═══ T1: AUTH ═══")
  const csrfRes = await api("GET", "/api/auth/csrf")
  const csrfToken = csrfRes.json?.csrfToken
  check("CSRF token", !!csrfToken)

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: sessionCookie },
    body: `csrfToken=${csrfToken}&email=owner@techvision.ro&password=Demo2026!`,
    redirect: "manual",
  })
  const loginCookies = loginRes.headers.getSetCookie?.() || []
  if (loginCookies.length) {
    const all = [...(sessionCookie ? sessionCookie.split("; ") : []), ...loginCookies.map(c => c.split(";")[0])]
    const merged = new Map<string, string>()
    for (const c of all) { const [key] = c.split("="); merged.set(key, c) }
    sessionCookie = [...merged.values()].join("; ")
  }
  check("Login (session cookie)", sessionCookie.includes("authjs.session-token"))

  const user = await prisma.user.findFirst({ where: { email: "owner@techvision.ro" }, include: { tenant: true } })
  if (user) {
    testTenantId = user.tenantId
    testUserId = user.id
    testTenantSlug = (user as any).tenant?.slug || "demo-company"
    ok(`User: ${user.firstName} ${user.lastName} (${user.role})`)
  }

  const reg = await api("POST", "/api/v1/auth/register", {
    email: "test-e2e-" + Date.now() + "@example.com",
    password: "TestE2E2026!", firstName: "Test", lastName: "E2E", companyName: "E2E Corp",
  })
  check("Register new user", [200, 201, 409].includes(reg.status), `status=${reg.status}`)
}

// ── T2: Company ──────────────────────────────────────────────────────────────

async function testCompany() {
  console.log("\n═══ T2: COMPANY ═══")
  const res = await api("PUT", "/api/v1/company", {
    mission: "Test E2E mission", vision: "Test E2E vision", industry: "IT & Software",
  })
  check("PUT company profile", [200].includes(res.status), `status=${res.status}`)
}

// ── T3: Departments ──────────────────────────────────────────────────────────

async function testDepartments() {
  console.log("\n═══ T3: DEPARTMENTS ═══")
  const name = "E2E Dept " + Date.now()
  const create = await api("POST", "/api/v1/departments", { name })
  check("POST create department", [200, 201].includes(create.status), `status=${create.status}`)
  if (create.json?.id) {
    const update = await api("PATCH", `/api/v1/departments/${create.json.id}`, { name: name + " updated" })
    check("PATCH update department", [200].includes(update.status), `status=${update.status}`)
  }
  skip("DELETE department — not implemented (by design, use isActive flag)")
}

// ── T4: Jobs ─────────────────────────────────────────────────────────────────

async function testJobs() {
  console.log("\n═══ T4: JOBS ═══")
  const jobs = await prisma.job.findMany({ where: { tenantId: testTenantId }, take: 3 })
  testJobIds = jobs.map(j => j.id)
  check(`Found ${jobs.length} existing jobs`, jobs.length > 0)

  const dept = await prisma.department.findFirst({ where: { tenantId: testTenantId } })
  const create = await api("POST", "/api/v1/jobs", {
    title: "E2E Job " + Date.now(), code: "E2E-" + Date.now(),
    purpose: "Test purpose", responsibilities: "Test responsibilities",
    departmentId: dept?.id, status: "ACTIVE",
  })
  check("POST create job", [200, 201].includes(create.status), `status=${create.status}`)
  if (create.json?.id) {
    testJobIds.push(create.json.id)
    const update = await api("PATCH", `/api/v1/jobs/${create.json.id}`, { purpose: "Updated" })
    check("PATCH update job", [200].includes(update.status), `status=${update.status}`)
  }

  // AI job description
  const aiDesc = await api("POST", "/api/v1/ai/job-description", {
    title: "Senior Dev", department: "IT", level: "Senior",
  })
  check("AI generate job description", [200].includes(aiDesc.status), `status=${aiDesc.status}`)
}

// ── T5: Evaluation Session ───────────────────────────────────────────────────

async function testEvaluationSession() {
  console.log("\n═══ T5: EVALUATION SESSION ═══")
  if (testJobIds.length < 2) { skip("Need 2+ jobs"); return }

  const users = await prisma.user.findMany({ where: { tenantId: testTenantId }, take: 3 })

  // Create session
  const create = await api("POST", "/api/v1/sessions", {
    name: "E2E Session " + Date.now(), description: "E2E test",
    jobIds: testJobIds.slice(0, 2), participantIds: users.map(u => u.id),
  })
  check("POST create session", [200, 201].includes(create.status), `status=${create.status}`)
  if (!create.json?.id) { skip("No session ID"); return }
  testSessionId = create.json.id

  // Get session jobs from DB (no GET route)
  const sessionJobs = await prisma.sessionJob.findMany({ where: { sessionId: testSessionId } })
  check(`Session has ${sessionJobs.length} jobs`, sessionJobs.length > 0)
  if (sessionJobs.length > 0) testSessionJobId = sessionJobs[0].id

  // Step 1: Set session to IN_PROGRESS (required before evaluation)
  const patch = await api("PATCH", `/api/v1/sessions/${testSessionId}`, { status: "IN_PROGRESS" })
  check("PATCH session → IN_PROGRESS", [200].includes(patch.status), `status=${patch.status}`)

  // Step 2: Ensure SessionParticipant exists
  const existingParticipant = await prisma.sessionParticipant.findFirst({
    where: { sessionId: testSessionId, userId: testUserId }
  })
  if (!existingParticipant) {
    await prisma.sessionParticipant.create({
      data: { sessionId: testSessionId, userId: testUserId }
    })
  }
  ok("SessionParticipant ensured")

  // Step 3: Create assignment + evaluate
  if (testSessionJobId) {
    let assignment = await prisma.jobAssignment.findFirst({
      where: { sessionJobId: testSessionJobId, userId: testUserId }
    })
    if (!assignment) {
      assignment = await prisma.jobAssignment.create({
        data: { sessionJobId: testSessionJobId, userId: testUserId }
      })
    }
    ok("Job assignment ready")

    // Evaluate with correct schema: assignmentId, scores[], isDraft
    const criteria = await prisma.criterion.findMany({ include: { subfactors: true } })
    const scores = criteria.map(c => ({
      criterionId: c.id,
      subfactorId: c.subfactors[Math.floor(c.subfactors.length / 2)]?.id,
      justification: `E2E justification for ${c.name}`,
    }))

    const evalRes = await api("PUT", `/api/v1/sessions/${testSessionId}/jobs/${testSessionJobId}/evaluate`, {
      assignmentId: assignment.id,
      scores,
      isDraft: false,
    })
    check("PUT submit evaluation", [200].includes(evalRes.status), `status=${evalRes.status} ${JSON.stringify(evalRes.json?.message || evalRes.json?.error || "")}`)
  }
}

// ── T6: AI Tools ─────────────────────────────────────────────────────────────

async function testAITools() {
  console.log("\n═══ T6: AI TOOLS ═══")
  if (testJobIds.length === 0) { skip("No jobs for AI tools"); return }
  const jobId = testJobIds[0]

  // Job Ad — needs jobId, tone (enum), platform (enum)
  const ad = await api("POST", "/api/v1/ai/job-ad", {
    jobId, tone: "professional", platform: "linkedin",
  })
  check("AI Job Ad", [200].includes(ad.status), `status=${ad.status}`)

  // Social Media — needs jobId, platforms[] (enum array), tone (enum)
  const social = await api("POST", "/api/v1/ai/social-media", {
    jobId, platforms: ["linkedin", "facebook"], tone: "professional",
  })
  check("AI Social Media", [200].includes(social.status), `status=${social.status}`)

  // KPI Sheet — needs jobId
  const kpi = await api("POST", "/api/v1/ai/kpi-sheet", { jobId })
  check("AI KPI Sheet", [200].includes(kpi.status), `status=${kpi.status}`)

  // Session Analysis
  if (testSessionId) {
    const analysis = await api("POST", "/api/v1/ai/session-analysis", { sessionId: testSessionId })
    check("AI Session Analysis", [200, 400].includes(analysis.status), `status=${analysis.status}`)
  }
}

// ── T7: Export ────────────────────────────────────────────────────────────────

async function testExport() {
  console.log("\n═══ T7: EXPORT ═══")
  if (!testSessionId) { skip("No session"); return }
  for (const fmt of ["excel", "pdf", "json", "xml"]) {
    const res = await api("POST", `/api/v1/sessions/${testSessionId}/export/${fmt}`)
    check(`Export ${fmt.toUpperCase()}`, [200, 400].includes(res.status), `status=${res.status}`)
  }
}

// ── T8: Compensation ─────────────────────────────────────────────────────────

async function testCompensation() {
  console.log("\n═══ T8: COMPENSATION ═══")
  if (testJobIds.length === 0) { skip("No jobs"); return }
  const jobId = testJobIds[0]

  // Package
  const pkg = await api("POST", "/api/v1/packages", {
    jobId, baseSalary: 8000, currency: "RON", benefits: ["meal tickets"],
  })
  check("POST package", [200, 201].includes(pkg.status), `status=${pkg.status}`)
  if (pkg.json?.id) {
    testPackageId = pkg.json.id
    const update = await api("PATCH", `/api/v1/packages/${pkg.json.id}`, { baseSalary: 8500 })
    check("PATCH package", [200].includes(update.status), `status=${update.status}`)
  }

  // KPI — needs jobId, kpis[] with name, targetValue, measurementUnit, frequency (enum), weight
  const kpiDef = await api("POST", "/api/v1/kpis", {
    jobId,
    kpis: [
      { name: "Code Quality", targetValue: "90", measurementUnit: "%", frequency: "QUARTERLY", weight: 50 },
      { name: "Delivery Speed", targetValue: "95", measurementUnit: "%", frequency: "MONTHLY", weight: 50 },
    ],
  })
  check("POST KPI definitions", [200, 201].includes(kpiDef.status), `status=${kpiDef.status}`)

  // Simulation — needs jobId, packageId, name, kpiAchievements
  if (testPackageId) {
    const kpis = await prisma.kpiDefinition.findMany({ where: { jobId }, take: 2 })
    const kpiAchievements: Record<string, number> = {}
    for (const k of kpis) kpiAchievements[k.id] = 95

    const sim = await api("POST", "/api/v1/simulations", {
      jobId, packageId: testPackageId, name: "E2E Simulation",
      kpiAchievements: Object.keys(kpiAchievements).length > 0 ? kpiAchievements : { dummy: 90 },
    })
    check("POST simulation", [200, 201].includes(sim.status), `status=${sim.status}`)
  } else {
    skip("Simulation (no package)")
  }
}

// ── T9: Pay Gap + Employee Portal ────────────────────────────────────────────

async function testPayGap() {
  console.log("\n═══ T9: PAY GAP + EMPLOYEE PORTAL ═══")

  // Import employees — correct schema
  const empData = await api("POST", "/api/v1/pay-gap/employees", {
    records: [
      { employeeCode: "EMP001", gender: "FEMALE", baseSalary: 7500, department: "IT", periodYear: 2026 },
      { employeeCode: "EMP002", gender: "MALE", baseSalary: 8000, department: "IT", periodYear: 2026 },
      { employeeCode: "EMP003", gender: "FEMALE", baseSalary: 12000, department: "HR", periodYear: 2026 },
      { employeeCode: "EMP004", gender: "MALE", baseSalary: 12500, department: "HR", periodYear: 2026 },
    ],
  })
  check("POST import salary records", [200, 201].includes(empData.status), `status=${empData.status}`)

  // Dashboard
  const dashboard = await api("GET", "/api/v1/pay-gap/dashboard")
  check("GET pay gap dashboard", [200].includes(dashboard.status), `status=${dashboard.status}`)

  // Report
  const report = await api("POST", "/api/v1/pay-gap/report", { year: 2026, publish: false })
  check("POST pay gap report", [200, 201].includes(report.status), `status=${report.status}`)

  // Joint assessments
  const ja = await api("GET", "/api/v1/joint-assessments")
  check("GET joint assessments", [200].includes(ja.status), `status=${ja.status}`)

  // Employee request — public endpoint, needs tenantSlug
  const empReq = await api("POST", "/api/v1/employee-requests", {
    tenantSlug: testTenantSlug,
    requestedBy: "Ana Popescu",
    requestEmail: "ana.popescu@example.com",
    requestDetails: "Solicit informații privind nivelul mediu de remunerare conform Art. 7 Directiva EU 2023/970 pentru categoria mea profesională.",
  })
  check("POST employee request Art.7", [200, 201].includes(empReq.status), `status=${empReq.status}`)
}

// ── T10: KB Routes ───────────────────────────────────────────────────────────

async function testKB() {
  console.log("\n═══ T10: KB ROUTES ═══")
  const h = ih()

  const health = await api("GET", "/api/v1/kb/health/HR_COUNSELOR", undefined, h)
  check("KB health HR_COUNSELOR", health.status === 200, `status=${health.status}`)

  const query = await api("POST", "/api/v1/kb/query", {
    query: "evaluare joburi consens", agentRole: "HR_COUNSELOR", limit: 5,
  }, h)
  check("KB semantic query", query.status === 200, `status=${query.status}`)

  // Buffer — correct schema: agentRole, rawContent (min 10 chars)
  const buffer = await api("POST", "/api/v1/kb/buffer", {
    agentRole: "HR_COUNSELOR",
    rawContent: "E2E test: pattern detectat în sesiunea de evaluare — evaluatorii cu experiență sub 2 ani tind să subevalueze criteriul Impact Afaceri.",
  }, h)
  check("KB buffer write", [200, 201].includes(buffer.status), `status=${buffer.status}`)

  const cs = await api("GET", "/api/v1/kb/cold-start", undefined, h)
  check("KB cold-start status", cs.status === 200, `status=${cs.status}`)

  const prop = await api("GET", "/api/v1/kb/propagate", undefined, h)
  check("KB propagation status", prop.status === 200, `status=${prop.status}`)
}

// ── T11: n8n + Agents ────────────────────────────────────────────────────────

async function testN8N() {
  console.log("\n═══ T11: N8N + AGENTS ═══")
  try {
    const res = await fetch("http://localhost:5678/healthz", { signal: AbortSignal.timeout(5000) })
    check("n8n healthz", res.ok)
  } catch (e: any) { fail("n8n healthz", e.message) }

  const cycle = await api("GET", "/api/v1/agents/cycle", undefined, ih())
  check("Agents cycle config", cycle.status === 200, `status=${cycle.status}`)

  const invite = await api("POST", "/api/v1/users/invite", {
    email: "invite-e2e-" + Date.now() + "@techvision.ro",
    firstName: "Invited", lastName: "User", role: "REPRESENTATIVE",
  })
  check("POST user invite", [200, 201].includes(invite.status), `status=${invite.status}`)
}

// ── Settings ─────────────────────────────────────────────────────────────────

async function testSettings() {
  console.log("\n═══ SETTINGS ═══")
  const pw = await api("PATCH", "/api/v1/users/password", {
    currentPassword: "Demo2026!", newPassword: "Demo2026!",
  })
  check("PATCH password change", [200, 400].includes(pw.status), `status=${pw.status}`)

  // Billing credits — route doesn't exist, skip
  skip("GET billing credits — route not implemented")
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧪 JobGrade E2E Test Suite v2")
  console.log(`   Base: ${BASE}`)
  console.log(`   DB: ${process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "?"}`)

  await testAuth()
  await testCompany()
  await testDepartments()
  await testJobs()
  await testEvaluationSession()
  await testAITools()
  await testExport()
  await testCompensation()
  await testPayGap()
  await testKB()
  await testN8N()
  await testSettings()

  console.log("\n════════════════════════════════════════════")
  console.log(`🏁 REZULTAT: ${stats.ok} ✅  ${stats.fail} ❌  ${stats.skip} ⏭️`)
  console.log("════════════════════════════════════════════")
  await prisma.$disconnect()
}

main().catch(console.error)
