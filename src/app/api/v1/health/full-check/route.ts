/**
 * GET /api/v1/health/full-check
 *
 * Health check COMPLET al platformei — verificare funcțională C1→C4.
 * Apelabil de QLA (intern) sau Owner (sesiune).
 * NU face apeluri AI (rapid, ~5-10s) — testează doar că endpoint-urile răspund.
 *
 * POST /api/v1/health/full-check
 * Rulează check + creează escalare automată dacă sunt eșecuri critice.
 *
 * Rezultatul se salvează în SystemConfig::FULL_CHECK_LAST_RUN
 * și în AgentTask dacă e apelat din organism.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type CheckStatus = "PASS" | "FAIL" | "WARN"

interface CheckResult {
  zone: string
  endpoint: string
  status: CheckStatus
  detail: string
  ms: number
}

interface FullCheckReport {
  timestamp: string
  totalChecks: number
  passed: number
  failed: number
  warned: number
  coverage: number
  durationMs: number
  checks: CheckResult[]
  criticalFailures: string[]
}

// Tenant JG_itself — contul permanent al organizației
const JG_TENANT = "cmolbwrlr000004jplchaxsy8"

async function runCheck(
  zone: string,
  endpoint: string,
  method: "GET" | "POST",
  body?: any
): Promise<CheckResult> {
  const t0 = Date.now()
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://jobgrade.ro"
    const headers: Record<string, string> = {
      "x-internal-key": process.env.INTERNAL_API_KEY || "",
      "x-tenant-id": JG_TENANT,
    }
    if (method === "POST") {
      headers["Content-Type"] = "application/json"
    }

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const ms = Date.now() - t0
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      return { zone, endpoint, status: "PASS", detail: summarize(data), ms }
    }
    if (res.status === 401) {
      return { zone, endpoint, status: "FAIL", detail: "Auth eșuată (401)", ms }
    }
    if (res.status >= 500) {
      return { zone, endpoint, status: "FAIL", detail: `Server error ${res.status}: ${data?.message || data?.error || ""}`, ms }
    }
    // 400-499 (non-401) = endpoint răspunde dar date lipsă — WARN nu FAIL
    return { zone, endpoint, status: "WARN", detail: `${res.status}: ${data?.message || data?.error || "date insuficiente"}`, ms }
  } catch (e: any) {
    return { zone, endpoint, status: "FAIL", detail: `Eroare: ${e.message}`, ms: Date.now() - t0 }
  }
}

function summarize(data: any): string {
  if (!data) return "OK"
  // Extrage câteva câmpuri relevante
  if (data.jobs) return `${data.jobs.length} posturi`
  if (data.grades) return `${data.grades.length} grade`
  if (data.events) return `${data.events.length} obligații`
  if (data.c1) return `C1: ${data.c1.jobCount} posturi`
  if (data.dimensions) return `${data.dimensions.length} dimensiuni`
  if (data.ok) return "OK"
  if (data.status) return data.status
  if (Array.isArray(data)) return `${data.length} intrări`
  return "OK"
}

async function runAllChecks(): Promise<FullCheckReport> {
  const t0 = Date.now()
  const checks: CheckResult[] = []

  // ═══ SETUP ═══
  checks.push(await runCheck("SETUP", "/api/v1/owner/service-status", "GET"))
  checks.push(await runCheck("SETUP", "/api/v1/jobs", "GET"))
  checks.push(await runCheck("SETUP", "/api/v1/departments", "GET"))

  // ═══ C1: ORGANIZARE ═══
  checks.push(await runCheck("C1", "/api/v1/sessions", "GET"))

  // ═══ C2: CONFORMITATE ═══
  checks.push(await runCheck("C2", "/api/v1/salary-grades", "GET"))
  checks.push(await runCheck("C2", "/api/v1/compliance/calendar", "GET"))
  checks.push(await runCheck("C2", "/api/v1/compliance/simulate-grid-legal", "POST", {}))

  // ═══ C3: COMPETITIVITATE ═══
  checks.push(await runCheck("C3", "/api/v1/benchmark", "GET"))
  checks.push(await runCheck("C3", "/api/v1/sociogram", "GET"))
  checks.push(await runCheck("C3", "/api/v1/compensation/variable", "GET"))
  checks.push(await runCheck("C3", "/api/v1/processes/quality-manual", "GET"))

  // ═══ C4: DEZVOLTARE ═══
  checks.push(await runCheck("C4", "/api/v1/culture/roi", "POST", {
    averageSalary: 8000, turnoverRate: 15, absenteeismRate: 5,
  }))

  // ═══ RAPOARTE ═══
  checks.push(await runCheck("RAPOARTE", "/api/v1/employee-reports", "GET"))
  checks.push(await runCheck("RAPOARTE", "/api/v1/owner/report", "GET"))

  // ═══ MATCHING ═══
  checks.push(await runCheck("MATCHING", "/api/v1/matching", "GET"))

  // ═══ ACCES ═══
  checks.push(await runCheck("ACCES", "/api/v1/access-matrix", "GET"))

  // ═══ BILLING ═══
  checks.push(await runCheck("BILLING", "/api/v1/billing/portal", "POST", {}))

  // ═══ CHAT ═══
  checks.push(await runCheck("CHAT", "/api/v1/guide-journal", "GET"))

  // ═══ ORGANISM ═══
  checks.push(await runCheck("ORGANISM", "/api/v1/organism-health", "GET"))
  checks.push(await runCheck("ORGANISM", "/api/v1/health/heartbeat", "GET"))
  checks.push(await runCheck("ORGANISM", "/api/v1/disfunctions/cockpit", "GET"))
  checks.push(await runCheck("ORGANISM", "/api/v1/evolution", "GET"))

  const durationMs = Date.now() - t0
  const passed = checks.filter(c => c.status === "PASS").length
  const failed = checks.filter(c => c.status === "FAIL").length
  const warned = checks.filter(c => c.status === "WARN").length
  const criticalFailures = checks
    .filter(c => c.status === "FAIL")
    .map(c => `[${c.zone}] ${c.endpoint}: ${c.detail}`)

  return {
    timestamp: new Date().toISOString(),
    totalChecks: checks.length,
    passed,
    failed,
    warned,
    coverage: Math.round((passed / checks.length) * 100),
    durationMs,
    checks,
    criticalFailures,
  }
}

// GET — Rulează check, returnează rezultatul
export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const report = await runAllChecks()

  // Salvează în SystemConfig
  await prisma.systemConfig.upsert({
    where: { key: "FULL_CHECK_LAST_RUN" },
    update: { value: JSON.stringify(report) },
    create: { key: "FULL_CHECK_LAST_RUN", value: JSON.stringify(report), label: "Ultimul full-check platformă" },
  })

  return NextResponse.json(report)
}

// POST — Rulează check + creează escalare dacă sunt eșecuri
export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const report = await runAllChecks()

  // Salvează în SystemConfig
  await prisma.systemConfig.upsert({
    where: { key: "FULL_CHECK_LAST_RUN" },
    update: { value: JSON.stringify(report) },
    create: { key: "FULL_CHECK_LAST_RUN", value: JSON.stringify(report), label: "Ultimul full-check platformă" },
  })

  // Dacă sunt eșecuri critice → creează escalare automată
  if (report.failed > 0) {
    try {
      // Creează task de investigare pentru QLA
      await prisma.agentTask.create({
        data: {
          title: `[AUTOMAT] Full-check: ${report.failed} endpoint-uri eșuate`,
          description: `Full-check a detectat ${report.failed} eșecuri:\n\n${report.criticalFailures.join("\n")}\n\nInvestigare necesară.`,
          assignedTo: "QLA",
          assignedBy: "SYSTEM",
          businessId: "biz_jobgrade",
          status: "ASSIGNED",
          priority: report.failed >= 3 ? "IMPORTANT_URGENT" : "URGENT",
          taskType: "INVESTIGATION",
          tags: ["full-check", "auto"],
        },
      })

      // Dacă >3 eșecuri → escalare la COA
      if (report.failed >= 3) {
        await prisma.agentTask.create({
          data: {
            title: `[ESCALARE] Full-check critic: ${report.failed}/${report.totalChecks} eșecuri`,
            description: `QLA raportează degradare semnificativă a platformei.\n\nEndpoint-uri afectate:\n${report.criticalFailures.join("\n")}`,
            assignedTo: "COA",
            assignedBy: "QLA",
            businessId: "biz_jobgrade",
            status: "ASSIGNED",
            priority: "IMPORTANT_URGENT",
            taskType: "INVESTIGATION",
            tags: ["full-check", "escalation"],
          },
        })
      }
    } catch (e) {
      console.error("[FULL-CHECK] Eroare la creare task/escalare:", e)
    }
  }

  return NextResponse.json({
    ...report,
    escalated: report.failed >= 3,
    taskCreated: report.failed > 0,
  })
}
