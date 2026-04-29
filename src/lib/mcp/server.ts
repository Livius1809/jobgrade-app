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

  // ═══ SCRIERE (inputuri prin MCP) ═══
  {
    name: "submit_salary_data",
    description: "Import date salariale per angajat. Alternativă la upload CSV.",
    category: "ACTION",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      employees: { type: "array", description: "Array de {employeeCode, gender, baseSalary, variableComp, department, jobCategory}", required: true },
    },
  },
  {
    name: "add_job",
    description: "Adaugă un post nou în organigrama companiei.",
    category: "ACTION",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      title: { type: "string", description: "Titlul postului", required: true },
      department: { type: "string", description: "Departament" },
      purpose: { type: "string", description: "Scopul rolului" },
      responsibilities: { type: "string", description: "Responsabilități principale" },
    },
  },
  {
    name: "configure_kpi",
    description: "Setează KPI-uri per post. Poate genera cu AI sau primi manual.",
    category: "ACTION",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      jobId: { type: "string", description: "ID-ul postului", required: true },
      kpis: { type: "array", description: "Array de {name, targetValue, measurementUnit, frequency, weight}", required: true },
    },
  },
  {
    name: "submit_climate_response",
    description: "Completează chestionarul climat organizațional (40 răspunsuri 1-7).",
    category: "ACTION",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      sessionId: { type: "string", description: "ID sesiune climat", required: true },
      respondentCode: { type: "string", description: "Codul respondentului", required: true },
      respondentGroup: { type: "string", description: "Grupul: PM sau NPM" },
      answers: { type: "array", description: "40 răspunsuri (1-7) în ordinea din chestionar", required: true },
    },
  },
  {
    name: "update_company_profile",
    description: "Actualizează datele companiei: MVV, website, industrie.",
    category: "ACTION",
    creditCost: 0,
    parameters: {
      tenantId: { type: "string", description: "ID-ul tenantului", required: true },
      companyName: { type: "string", description: "Nume companie" },
      mission: { type: "string", description: "Misiune" },
      vision: { type: "string", description: "Viziune" },
      values: { type: "string", description: "Valori" },
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

      case "generate_report": {
        const { reportType } = params
        if (!reportType) return { success: false, error: "reportType obligatoriu (pay_gap, equity, job_description, kpi_sheet, session_analysis)" }

        // Dispatch la API-urile existente
        const reportEndpoints: Record<string, string> = {
          pay_gap: "/api/v1/pay-gap/report",
          equity: "/api/v1/compliance/equity",
          session_analysis: "/api/v1/ai/session-analysis",
        }
        const endpoint = reportEndpoints[reportType]
        if (!endpoint) return { success: false, error: `reportType necunoscut: ${reportType}` }

        // Folosim import direct (nu fetch intern)
        if (reportType === "equity") {
          const equityData = await prisma.employeeSalaryRecord.findMany({
            where: { tenantId },
            select: { gender: true, baseSalary: true, variableComp: true, department: true, jobCategory: true },
          })
          return { success: true, data: { employeeCount: equityData.length, reportType }, creditsUsed: 3 }
        }

        return { success: true, data: { reportType, status: "generare disponibilă prin portal" }, creditsUsed: 3 }
      }

      case "run_simulation": {
        const { preset } = params
        if (!preset) return { success: false, error: "preset obligatoriu" }
        try {
          const { runSimulation } = await import("@/lib/engines/wif-engine")
          const result = await runSimulation({
            preset,
            mode: params.mode || "CLASIC",
            tenantId,
            params: params.params || {},
          })
          return { success: true, data: result, creditsUsed: 2 }
        } catch (e: any) {
          return { success: false, error: e.message }
        }
      }

      case "send_notification": {
        const { recipientEmail, subject, body: emailBody } = params
        if (!recipientEmail || !subject || !emailBody) {
          return { success: false, error: "recipientEmail, subject, body obligatorii" }
        }
        try {
          // Folosim Resend (deja configurat)
          const { Resend } = await import("resend")
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: "JobGrade <noreply@jobgrade.ro>",
            to: recipientEmail,
            subject,
            text: emailBody,
          })
          return { success: true, data: { sent: true, to: recipientEmail } }
        } catch (e: any) {
          return { success: false, error: `Email nelivrat: ${e.message}` }
        }
      }

      case "detect_anomalies": {
        // Verifică: gap-uri salariale, distribuție, anomalii
        const employees = await prisma.employeeSalaryRecord.findMany({
          where: { tenantId },
          select: { employeeCode: true, baseSalary: true, department: true, jobCategory: true, gender: true, salaryGradeId: true },
        })
        const anomalies: Array<{ type: string; description: string; severity: string }> = []

        // Angajați fără grad salarial
        const noGrade = employees.filter(e => !e.salaryGradeId)
        if (noGrade.length > 0) {
          anomalies.push({ type: "FARA_GRAD", description: `${noGrade.length} angajati fara grad salarial atribuit`, severity: "MEDIUM" })
        }

        // Gap gen pe departament
        const deptGender: Record<string, { M: number[]; F: number[] }> = {}
        for (const emp of employees) {
          const dept = emp.department || "Necunoscut"
          if (!deptGender[dept]) deptGender[dept] = { M: [], F: [] }
          const g = String(emp.gender)
          if (g === "M" || g === "F") deptGender[dept][g].push(emp.baseSalary)
        }
        for (const [dept, genders] of Object.entries(deptGender)) {
          if (genders.M.length > 0 && genders.F.length > 0) {
            const avgM = genders.M.reduce((s, v) => s + v, 0) / genders.M.length
            const avgF = genders.F.reduce((s, v) => s + v, 0) / genders.F.length
            const gap = Math.round(((avgM - avgF) / avgM) * 100)
            if (Math.abs(gap) > 10) {
              anomalies.push({ type: "PAY_GAP", description: `${dept}: gap salarial ${gap}% intre M (${Math.round(avgM)}) si F (${Math.round(avgF)})`, severity: gap > 20 ? "CRITICAL" : "HIGH" })
            }
          }
        }

        return { success: true, data: { anomalies, count: anomalies.length } }
      }

      case "suggest_actions": {
        const { focus } = params
        const suggestions: Array<{ action: string; priority: string; impact: string }> = []

        if (!focus || focus === "compliance") {
          suggestions.push(
            { action: "Verifică notificarea anuală Art. 6 — informează angajații despre dreptul la transparență salarială", priority: "HIGH", impact: "Obligație legală" },
            { action: "Generează raportul pay gap Art. 9 dacă ai >100 angajați", priority: "MEDIUM", impact: "Conformitate Directiva EU" },
          )
        }
        if (!focus || focus === "salary") {
          const subClasa = await prisma.employeeSalaryRecord.count({
            where: { tenantId, baseSalary: { lt: 3000 } }, // placeholder
          })
          if (subClasa > 0) {
            suggestions.push({ action: `${subClasa} angajați cu salariu posibil sub nivelul clasei — verifică alinierea`, priority: "HIGH", impact: "Echitate salarială" })
          }
        }
        if (!focus || focus === "performance") {
          const kpiCount = await prisma.kpiDefinition.count({ where: { tenantId } })
          const jobCount = await prisma.job.count({ where: { tenantId, status: "ACTIVE" } })
          if (kpiCount === 0 && jobCount > 0) {
            suggestions.push({ action: `${jobCount} posturi fără KPI definit — configurează indicatori de performanță`, priority: "MEDIUM", impact: "Evaluare performanță" })
          }
        }

        return { success: true, data: { suggestions, focus: focus || "all" }, creditsUsed: 1 }
      }

      // ═══ SCRIERE ═══

      case "submit_salary_data": {
        const { employees: emps } = params
        if (!Array.isArray(emps) || emps.length === 0) return { success: false, error: "employees obligatoriu (array)" }
        let created = 0
        for (const emp of emps) {
          if (!emp.employeeCode || !emp.baseSalary) continue
          // Verifică dacă există
          const existing = await prisma.employeeSalaryRecord.findFirst({ where: { tenantId, employeeCode: emp.employeeCode } })
          if (existing) {
            await prisma.employeeSalaryRecord.update({
              where: { id: existing.id },
              data: { baseSalary: Number(emp.baseSalary), variableComp: emp.variableComp ? Number(emp.variableComp) : 0, department: emp.department || null, jobCategory: emp.jobCategory || null, gender: emp.gender || null },
            })
          } else {
            await (prisma as any).employeeSalaryRecord.create({
              data: { tenantId, employeeCode: emp.employeeCode, baseSalary: Number(emp.baseSalary), variableComp: emp.variableComp ? Number(emp.variableComp) : 0, department: emp.department || null, jobCategory: emp.jobCategory || null, gender: emp.gender || null, periodYear: new Date().getFullYear() },
            })
          }
          created++
        }
        return { success: true, data: { imported: created, total: emps.length } }
      }

      case "add_job": {
        const { title: jobTitle, department: deptName, purpose, responsibilities } = params
        if (!jobTitle) return { success: false, error: "title obligatoriu" }
        let departmentId = null
        if (deptName) {
          const dept = await prisma.department.findFirst({ where: { tenantId, name: deptName } })
          departmentId = dept?.id || null
          if (!departmentId) {
            const newDept = await prisma.department.create({ data: { tenantId, name: deptName } })
            departmentId = newDept.id
          }
        }
        const job = await prisma.job.create({
          data: { tenantId, title: jobTitle, departmentId, purpose: purpose || null, responsibilities: responsibilities || null, status: "ACTIVE" },
        })
        return { success: true, data: { jobId: job.id, title: jobTitle } }
      }

      case "configure_kpi": {
        const { jobId, kpis: kpiList } = params
        if (!jobId || !Array.isArray(kpiList)) return { success: false, error: "jobId si kpis obligatorii" }
        await prisma.kpiDefinition.createMany({
          data: kpiList.map((k: any) => ({
            tenantId, jobId,
            name: k.name, weight: Number(k.weight || 0),
            targetValue: parseFloat(k.targetValue) || 0,
            measurementUnit: k.measurementUnit || "%",
            frequency: k.frequency || "MONTHLY",
          })),
        })
        return { success: true, data: { created: kpiList.length, jobId } }
      }

      case "submit_climate_response": {
        const { sessionId, respondentCode, respondentGroup, answers } = params
        if (!sessionId || !respondentCode || !Array.isArray(answers) || answers.length !== 40) {
          return { success: false, error: "sessionId, respondentCode, 40 answers obligatorii" }
        }
        const { scoreRespondent } = await import("@/lib/climate/questionnaire")
        // Trimitem la API-ul climate existent
        const state = await getTenantData<any>(tenantId, "CLIMATE_CO") || { sessions: [], responses: [], results: [] }
        state.responses = state.responses.filter((r: any) => !(r.sessionId === sessionId && r.respondentCode === respondentCode))
        state.responses.push({ sessionId, respondentCode, respondentGroup: respondentGroup || "NPM", answers, completedAt: new Date().toISOString() })
        const { setTenantData: setTD } = await import("@/lib/tenant-storage")
        await setTD(tenantId, "CLIMATE_CO", state)
        const result = scoreRespondent(respondentCode, respondentGroup || "NPM", answers, true)
        return { success: true, data: result }
      }

      case "update_company_profile": {
        const { companyName, mission, vision, values } = params
        if (companyName) await prisma.tenant.update({ where: { id: tenantId }, data: { name: companyName } })
        if (mission || vision || values) {
          const { setTenantData: setTD } = await import("@/lib/tenant-storage")
          const existing = await getTenantData<any>(tenantId, "MVV_STATE") || {}
          await setTD(tenantId, "MVV_STATE", { ...existing, ...(mission ? { missionDraft: mission } : {}), ...(vision ? { visionDraft: vision } : {}), ...(values ? { valuesDraft: values } : {}) })
        }
        return { success: true, data: { updated: true } }
      }

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
