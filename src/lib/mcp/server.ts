/**
 * MCP Server JobGrade — Protocol de comunicare cu platforma
 *
 * Faza 1: Intern (FW + agenți client-facing)
 * Faza 2: Client (Claude Desktop)
 *
 * Tools expuse:
 *   CITIRE (cost zero): get_company_profile, get_pay_gap, get_salary_grades,
 *     get_kpis, get_compliance_status, get_evaluation_results, get_climate_results, get_benchmark
 *   ACȚIUNI (credite): generate_report, run_simulation, send_notification, create_session
 *   PROACTIVE (FW): check_deadlines, detect_anomalies, suggest_actions
 */

import { prisma } from "@/lib/prisma"
import { getTenantData } from "@/lib/tenant-storage"

// ── Tipuri MCP ──────────────────────────────────────────────

export interface MCPToolDefinition {
  name: string
  description: string
  category: "READ" | "ACTION" | "PROACTIVE"
  creditCost: number // 0 = gratuit
  parameters: Record<string, { type: string; description: string; required?: boolean }>
}

export interface MCPToolResult {
  success: boolean
  data?: any
  error?: string
  creditsUsed?: number
}

// ── Registru tools ──────────────────────────────────────────

export const MCP_TOOLS: MCPToolDefinition[] = [
  // ═══ CITIRE (cost zero) ═══
  {
    name: "get_company_profile",
    description: "Profil companie: nume, CUI, industrie, MVV, structură. Contextul de bază pentru orice interacțiune.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
    },
  },
  {
    name: "get_pay_gap",
    description: "Indicatori pay gap pe dimensiuni (gen, departament, grad, categorie). Art. 9 Directiva EU 2023/970.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      year: { type: "number", description: "Anul raportului (default: curent)" },
    },
  },
  {
    name: "get_salary_grades",
    description: "Clase salariale, trepte, aliniere angajați. Structura compensațiilor.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      sessionId: { type: "string", description: "Sesiunea de evaluare (optional)" },
    },
  },
  {
    name: "get_kpis",
    description: "KPI-uri per post/echipă/departament. Indicatori de performanță configurați.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      jobId: { type: "string", description: "Filtrare per post (optional)" },
    },
  },
  {
    name: "get_compliance_status",
    description: "Status conformitate: termene Directiva EU, GDPR, AI Act. Calendar obligații.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
    },
  },
  {
    name: "get_evaluation_results",
    description: "Rezultate evaluare posturi: ierarhie, scoruri, clase. Sesiune completată.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      sessionId: { type: "string", description: "ID sesiune (optional — ultima dacă lipsește)" },
    },
  },
  {
    name: "get_climate_results",
    description: "Rezultate chestionar climat organizațional: 8 dimensiuni, comparație niveluri ierarhice.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
    },
  },
  {
    name: "get_benchmark",
    description: "Poziționare salarială vs piață: percentile, compa-ratio, tendințe.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      jobFamily: { type: "string", description: "Familia de posturi (optional)" },
    },
  },
  {
    name: "get_employee_profile",
    description: "Profil angajat: post, salariu, grad, KPI-uri, rezultate psihometrice.",
    category: "READ",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      employeeCode: { type: "string", description: "Codul angajatului", required: true },
    },
  },

  // ═══ ACȚIUNI (consumă credite) ═══
  {
    name: "generate_report",
    description: "Generează raport: pay_gap, equity, job_description, kpi_sheet, session_analysis.",
    category: "ACTION",
    creditCost: 3,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      reportType: { type: "string", description: "Tipul raportului", required: true },
      params: { type: "object", description: "Parametri specifici raportului" },
    },
  },
  {
    name: "run_simulation",
    description: "Rulează simulare What-If: schimb responsabilități, poziție vacantă, ajustare salariu, etc.",
    category: "ACTION",
    creditCost: 2,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      preset: { type: "string", description: "Tipul simulării", required: true },
      params: { type: "object", description: "Parametri simulare" },
    },
  },
  {
    name: "send_notification",
    description: "Trimite notificare angajat/manager: termen conformitate, rezultat evaluare, etc.",
    category: "ACTION",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      recipientEmail: { type: "string", description: "Email destinatar", required: true },
      subject: { type: "string", description: "Subiect", required: true },
      body: { type: "string", description: "Conținut", required: true },
    },
  },

  // ═══ PROACTIVE (FW) ═══
  {
    name: "check_deadlines",
    description: "Verifică termene conformitate apropiate: Art.6, pay gap, audit GDPR.",
    category: "PROACTIVE",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      daysAhead: { type: "number", description: "Câte zile înainte (default: 30)" },
    },
  },
  {
    name: "detect_anomalies",
    description: "Detectează anomalii: KPI sub prag, gap salarial nou, angajat dezaliniat.",
    category: "PROACTIVE",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
    },
  },
  {
    name: "suggest_actions",
    description: "Propune acțiuni bazate pe datele curente: aliniere salarială, training, restructurare.",
    category: "PROACTIVE",
    creditCost: 1,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      focus: { type: "string", description: "Zona de focus: salary, compliance, performance, development" },
    },
  },
]

// ── Executor tools ──────────────────────────────────────────

export async function executeMCPTool(toolName: string, params: Record<string, any>): Promise<MCPToolResult> {
  const tool = MCP_TOOLS.find(t => t.name === toolName)
  if (!tool) return { success: false, error: `Tool necunoscut: ${toolName}` }

  const tenantId = params.tenantId
  if (!tenantId) return { success: false, error: "tenantId obligatoriu" }

  try {
    switch (toolName) {
      case "get_company_profile": {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true, slug: true },
        })
        if (!tenant) return { success: false, error: "Tenant negăsit" }
        const mvv = await getTenantData(tenantId, "MVV_STATE")
        const jobCount = await prisma.job.count({ where: { tenantId, status: "ACTIVE" } })
        const empCount = await prisma.employeeSalaryRecord.count({ where: { tenantId } })
        return { success: true, data: { ...tenant, mvv, jobCount, employeeCount: empCount } }
      }

      case "get_pay_gap": {
        const reports = await prisma.payGapReport.findMany({
          where: { tenantId, ...(params.year ? { reportYear: params.year } : {}) },
          orderBy: { reportYear: "desc" },
          take: 1,
        })
        return { success: true, data: reports[0] || null }
      }

      case "get_kpis": {
        const where: any = { tenantId }
        if (params.jobId) where.jobId = params.jobId
        const kpis = await prisma.kpiDefinition.findMany({ where, orderBy: { weight: "desc" } })
        return { success: true, data: kpis }
      }

      case "get_evaluation_results": {
        const where: any = { tenantId }
        if (params.sessionId) where.id = params.sessionId
        else where.status = "COMPLETED"
        const session = await prisma.evaluationSession.findFirst({
          where,
          include: { jobResults: { include: { job: { select: { title: true } } }, orderBy: { rank: "asc" } } },
          orderBy: { completedAt: "desc" },
        })
        return { success: true, data: session }
      }

      case "get_climate_results": {
        const data = await getTenantData(tenantId, "CLIMATE_CO")
        return { success: true, data }
      }

      case "get_benchmark": {
        const { queryBenchmarks } = await import("@/lib/benchmark")
        const data = await queryBenchmarks({ jobFamily: params.jobFamily }, prisma)
        return { success: true, data }
      }

      case "get_compliance_status": {
        const equity = await getTenantData(tenantId, "EQUITY_EXTRA_DIMS")
        const reports = await prisma.payGapReport.findMany({ where: { tenantId }, select: { reportYear: true, status: true } })
        return { success: true, data: { equityDimensions: !!equity, payGapReports: reports } }
      }

      case "get_salary_grades": {
        const grades = await prisma.salaryGrade.findMany({ where: { tenantId }, orderBy: { name: "asc" } })
        return { success: true, data: grades }
      }

      case "get_employee_profile": {
        const emp = await prisma.employeeSalaryRecord.findFirst({
          where: { tenantId, employeeCode: params.employeeCode },
          include: { salaryGrade: true },
        })
        if (!emp) return { success: false, error: "Angajat negăsit" }
        const kpis = await prisma.kpiDefinition.findMany({ where: { tenantId, jobId: emp.jobCategory || undefined } })
        const psychData = await getTenantData(tenantId, "PSYCHOMETRICS")
        return { success: true, data: { employee: emp, kpis, psychometrics: psychData } }
      }

      case "check_deadlines": {
        const daysAhead = params.daysAhead || 30
        const deadlines = [
          { name: "Notificare anuală Art. 6", date: "2026-12-31", daysLeft: Math.round((new Date("2026-12-31").getTime() - Date.now()) / 86400000) },
          { name: "Raport pay gap Art. 9", date: "2027-06-07", daysLeft: Math.round((new Date("2027-06-07").getTime() - Date.now()) / 86400000) },
        ]
        return { success: true, data: deadlines.filter(d => d.daysLeft <= daysAhead && d.daysLeft > 0) }
      }

      case "generate_report":
      case "run_simulation":
      case "send_notification":
      case "detect_anomalies":
      case "suggest_actions":
        return { success: false, error: `Tool ${toolName} — implementare în curs` }

      default:
        return { success: false, error: `Tool ${toolName} neimplementat` }
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── MCP Protocol helpers ────────────────────────────────────

export function getToolManifest() {
  return MCP_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(t.parameters).map(([key, val]) => [key, { type: val.type, description: val.description }])
      ),
      required: Object.entries(t.parameters).filter(([, v]) => v.required).map(([k]) => k),
    },
  }))
}
