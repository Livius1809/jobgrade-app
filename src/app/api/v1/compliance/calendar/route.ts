/**
 * /api/v1/compliance/calendar
 *
 * Calendar conformitate B2B Card 2 — obligatii legale cu verificare din DB.
 * Doua surse: (A) obligatii statice recurente, (B) alerte dinamice din date existente.
 *
 * GET  — Lista evenimente calendar + status calculat din DB
 * POST — Marcheaza eveniment ca indeplinit (salveaza in SystemConfig)
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Tipuri eveniment calendar
type EventCategory = "EU_DIRECTIVE" | "GDPR" | "AI_ACT" | "LABOR_LAW"
type EventStatus = "COMPLETED" | "UPCOMING" | "OVERDUE" | "NOT_APPLICABLE"
type EventUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

interface CalendarEvent {
  id: string
  title: string
  description: string
  category: EventCategory
  dueDate: string | null
  status: EventStatus
  urgency: EventUrgency
  completedAt?: string
  actionUrl?: string
}

// ─── Utilitare ───

function currentYear(): number {
  return new Date().getFullYear()
}

/** Verifica daca exista o intrare COMPLIANCE_EVENT_{eventId}_{year} in SystemConfig */
async function getCompletionRecord(eventId: string, year: number): Promise<string | null> {
  const key = `COMPLIANCE_EVENT_${eventId}_${year}`
  const record = await prisma.systemConfig.findUnique({ where: { key } })
  return record?.value ?? null
}

/** Calculeaza urgenta pe baza zilelor ramase */
function computeUrgency(dueDate: string | null, status: EventStatus): EventUrgency {
  if (status === "COMPLETED" || status === "NOT_APPLICABLE") return "LOW"
  if (!dueDate) return "MEDIUM"

  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return "CRITICAL"
  if (days <= 14) return "HIGH"
  if (days <= 60) return "MEDIUM"
  return "LOW"
}

/** Calculeaza status pe baza datei si completarii */
function computeStatus(dueDate: string | null, completedAt: string | null): EventStatus {
  if (completedAt) return "COMPLETED"
  if (!dueDate) return "UPCOMING"
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return days < 0 ? "OVERDUE" : "UPCOMING"
}

// ─── (A) Obligatii statice recurente ───

interface StaticObligation {
  id: string
  title: string
  description: string
  category: EventCategory
  dueDateFn: (year: number) => string  // calculeaza termenul pe anul curent
  actionUrl?: string
  /** Daca e definit, obligatia se aplica doar daca functia intoarce true */
  applicableCheck?: (tenantId: string) => Promise<boolean>
}

const STATIC_OBLIGATIONS: StaticObligation[] = [
  {
    id: "PAY_GAP_REPORT_ART9",
    title: "Raport pay gap Art.9 — Directiva EU 2023/970",
    description: "Publicarea raportului anual privind diferentele de remunerare pe gen. Obligatoriu pentru companii >100 angajati (termen 2027) sau >250 (termen 2026).",
    category: "EU_DIRECTIVE",
    dueDateFn: (year) => `${year}-06-30`,
    actionUrl: "/compliance/equity",
  },
  {
    id: "JOINT_PAY_ASSESSMENT_ART10",
    title: "Evaluare comuna Art.10 — pay gap >5%",
    description: "Evaluare comuna angajator-reprezentanti angajati cand diferenta de remunerare pe gen depaseste 5% pe orice categorie si nu poate fi justificata obiectiv.",
    category: "EU_DIRECTIVE",
    dueDateFn: (year) => `${year}-06-30`,
    actionUrl: "/compliance/equity",
  },
  {
    id: "GDPR_ANNUAL_REVIEW",
    title: "Revizie anuala GDPR — Registru prelucrari Art.30",
    description: "Mentinerea si revizuirea anuala a registrului activitatilor de prelucrare a datelor personale. Include DPIA daca e cazul.",
    category: "GDPR",
    dueDateFn: (year) => `${year}-12-31`,
    actionUrl: "/compliance/gdpr-ai-act",
  },
  {
    id: "AI_ACT_COMPLIANCE_CHECK",
    title: "Verificare conformitate AI Act — trimestrial",
    description: "Daca organizatia foloseste sisteme AI sau posturi mixte (om+AI) in HR, trebuie asigurata conformitatea cu AI Act Anexa III. Include supraveghere umana Art.14.",
    category: "AI_ACT",
    // Trimestrial — urmatorul termen e sfarsitul trimestrului curent
    dueDateFn: (year) => {
      const month = new Date().getMonth() // 0-11
      const quarterEnd = [2, 5, 8, 11] // martie, iunie, septembrie, decembrie
      const nextQuarter = quarterEnd.find(m => m >= month) ?? quarterEnd[0]
      const targetYear = nextQuarter < month ? year + 1 : year
      const lastDay = new Date(targetYear, nextQuarter + 1, 0).getDate()
      return `${targetYear}-${String(nextQuarter + 1).padStart(2, "0")}-${lastDay}`
    },
    actionUrl: "/compliance/gdpr-ai-act",
    // Se aplica doar daca tenantul are joburi AI sau MIXED
    applicableCheck: async (tenantId: string) => {
      const aiJobs = await prisma.job.count({
        where: {
          tenantId,
          isActive: true,
          structureType: { in: ["AI", "MIXED"] },
        },
      })
      return aiJobs > 0
    },
  },
  {
    id: "SALARY_GRID_REVIEW",
    title: "Revizie grila salariala",
    description: "Verificare si actualizare anuala a grilei de salarizare. Alinierea cu piata, inflatia si echitatea interna.",
    category: "LABOR_LAW",
    dueDateFn: (year) => `${year}-12-31`,
    actionUrl: "/compensation",
  },
  {
    id: "EQUAL_PAY_TRANSPARENCY_ART7",
    title: "Transparenta salariala Art.7 — informare la angajare",
    description: "Angajatorii trebuie sa puna la dispozitia candidatilor si angajatilor criteriile de stabilire a salariului, nivelurile si evolutia salariilor. Verificare continua la fiecare angajare.",
    category: "EU_DIRECTIVE",
    dueDateFn: (year) => `${year}-12-31`,
    actionUrl: "/compliance/equity",
  },
  {
    id: "WORKER_REP_INFO_ART12",
    title: "Informare reprezentanti angajati Art.12",
    description: "Transmiterea anuala catre reprezentantii angajatilor a informatiilor privind diferentele de remunerare pe gen si criteriile utilizate.",
    category: "EU_DIRECTIVE",
    dueDateFn: (year) => `${year}-03-31`,
    actionUrl: "/compliance/equity",
  },
]

// ─── (B) Alerte dinamice din date existente ───

async function getDynamicAlerts(tenantId: string): Promise<CalendarEvent[]> {
  const alerts: CalendarEvent[] = []
  const year = currentYear()

  // 1. Verifica PayGapReport — daca ultimul raport arata gap >5%, Joint Pay Assessment e URGENT
  const latestReport = await prisma.payGapReport.findFirst({
    where: { tenantId },
    orderBy: { reportYear: "desc" },
  })

  if (latestReport?.indicators) {
    // indicators e JSON — verificam daca exista vreo dimensiune cu gap >5%
    const indicators = latestReport.indicators as Record<string, unknown>
    let hasHighGap = false

    // Parcurgem recursiv structura indicatorilor
    const checkGap = (obj: unknown): void => {
      if (typeof obj === "number" && Math.abs(obj) > 5) {
        hasHighGap = true
        return
      }
      if (obj && typeof obj === "object") {
        for (const val of Object.values(obj as Record<string, unknown>)) {
          if (hasHighGap) break
          // Cautam campuri cu "gap" sau "diferenta" in nume
          checkGap(val)
        }
      }
    }

    // Verificam campuri tipice
    if ("overallGap" in indicators) checkGap(indicators.overallGap)
    if ("genderPayGap" in indicators) checkGap(indicators.genderPayGap)
    if ("gaps" in indicators) checkGap(indicators.gaps)
    // Fallback: scanam tot
    if (!hasHighGap) checkGap(indicators)

    if (hasHighGap) {
      // Verificam daca exista deja un JointPayAssessment deschis
      const openAssessment = await prisma.jointPayAssessment.findFirst({
        where: {
          tenantId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      })

      if (!openAssessment) {
        alerts.push({
          id: `DYNAMIC_JOINT_PAY_REQUIRED_${year}`,
          title: "Evaluare comuna Art.10 OBLIGATORIE — pay gap >5% detectat",
          description: `Raportul pay gap ${latestReport.reportYear} arata diferente >5% pe cel putin o dimensiune. Conform Art.10, evaluarea comuna este obligatorie.`,
          category: "EU_DIRECTIVE",
          dueDate: `${year}-06-30`,
          status: "OVERDUE",
          urgency: "CRITICAL",
          actionUrl: "/compliance/equity",
        })
      }
    }
  }

  // 2. Verifica Job records — daca exista posturi AI/MIXED, flag AI Act
  const aiMixedCount = await prisma.job.count({
    where: {
      tenantId,
      isActive: true,
      structureType: { in: ["AI", "MIXED"] },
    },
  })

  if (aiMixedCount > 0) {
    // Verificam daca exista deja un check completat
    const completionKey = `COMPLIANCE_EVENT_AI_ACT_COMPLIANCE_CHECK_${year}`
    const completed = await prisma.systemConfig.findUnique({ where: { key: completionKey } })

    if (!completed) {
      alerts.push({
        id: `DYNAMIC_AI_ACT_JOBS_${year}`,
        title: `${aiMixedCount} posturi AI/mixte detectate — conformitate AI Act necesara`,
        description: `Organizatia are ${aiMixedCount} posturi cu structura AI sau mixta. Conformitatea cu AI Act (Anexa III, Art.14) este obligatorie pentru sistemele HR cu risc ridicat.`,
        category: "AI_ACT",
        dueDate: null,
        status: "UPCOMING",
        urgency: "HIGH",
        actionUrl: "/compliance/gdpr-ai-act",
      })
    }
  }

  // 3. Verifica SalaryGrade — daca nu exista, flag grila neconfigurala
  const gradeCount = await prisma.salaryGrade.count({
    where: { tenantId },
  })

  if (gradeCount === 0) {
    alerts.push({
      id: `DYNAMIC_SALARY_GRID_MISSING_${year}`,
      title: "Grila salariala neconfigurata",
      description: "Nu exista nicio grila de salarizare definita. Aceasta este necesara pentru transparenta salariala (Art.7) si pentru raportarea pay gap (Art.9).",
      category: "LABOR_LAW",
      dueDate: null,
      status: "UPCOMING",
      urgency: "HIGH",
      actionUrl: "/compensation",
    })
  }

  return alerts
}

// ─── GET — Lista evenimente calendar ───

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const year = currentYear()
  const events: CalendarEvent[] = []

  // (A) Obligatii statice
  for (const obligation of STATIC_OBLIGATIONS) {
    // Verificam daca obligatia se aplica acestui tenant
    if (obligation.applicableCheck) {
      const applicable = await obligation.applicableCheck(tenantId)
      if (!applicable) {
        events.push({
          id: obligation.id,
          title: obligation.title,
          description: obligation.description,
          category: obligation.category,
          dueDate: obligation.dueDateFn(year),
          status: "NOT_APPLICABLE",
          urgency: "LOW",
          actionUrl: obligation.actionUrl,
        })
        continue
      }
    }

    const dueDate = obligation.dueDateFn(year)

    // Verificam daca a fost completat anul acesta
    const completionRaw = await getCompletionRecord(obligation.id, year)
    let completedAt: string | null = null

    if (completionRaw) {
      try {
        const parsed = JSON.parse(completionRaw)
        completedAt = parsed.completedAt ?? completionRaw
      } catch {
        completedAt = completionRaw
      }
    }

    // Verificari suplimentare din DB pentru anumite obligatii
    if (!completedAt) {
      // PayGapReport — verificam daca exista raport publicat pe anul curent
      if (obligation.id === "PAY_GAP_REPORT_ART9") {
        const report = await prisma.payGapReport.findFirst({
          where: { tenantId, reportYear: year, status: "PUBLISHED" },
        })
        if (report?.publishedAt) {
          completedAt = report.publishedAt.toISOString()
        }
      }

      // JointPayAssessment — verificam daca exista evaluare rezolvata
      if (obligation.id === "JOINT_PAY_ASSESSMENT_ART10") {
        const assessment = await prisma.jointPayAssessment.findFirst({
          where: {
            tenantId,
            status: { in: ["RESOLVED", "CLOSED"] },
            resolvedAt: { gte: new Date(`${year}-01-01`) },
          },
        })
        if (assessment?.resolvedAt) {
          completedAt = assessment.resolvedAt.toISOString()
        }
      }
    }

    const status = computeStatus(dueDate, completedAt)
    const urgency = computeUrgency(dueDate, status)

    events.push({
      id: obligation.id,
      title: obligation.title,
      description: obligation.description,
      category: obligation.category,
      dueDate,
      status,
      urgency,
      ...(completedAt ? { completedAt } : {}),
      actionUrl: obligation.actionUrl,
    })
  }

  // (B) Alerte dinamice
  const dynamicAlerts = await getDynamicAlerts(tenantId)
  // Evitam duplicate — daca o alerta dinamica are acelasi id radacina ca una statica, nu o adaugam
  for (const alert of dynamicAlerts) {
    const existingIdx = events.findIndex(e => alert.id.includes(e.id))
    if (existingIdx === -1) {
      events.push(alert)
    }
  }

  // Sortare: OVERDUE first, apoi UPCOMING by dueDate, apoi COMPLETED, apoi NOT_APPLICABLE
  const statusOrder: Record<EventStatus, number> = {
    OVERDUE: 0,
    UPCOMING: 1,
    COMPLETED: 2,
    NOT_APPLICABLE: 3,
  }

  events.sort((a, b) => {
    const sa = statusOrder[a.status]
    const sb = statusOrder[b.status]
    if (sa !== sb) return sa - sb
    // In cadrul aceluiasi status, urgenta descrescatoare
    const urgencyOrder: Record<EventUrgency, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    const ua = urgencyOrder[a.urgency]
    const ub = urgencyOrder[b.urgency]
    if (ua !== ub) return ua - ub
    // Apoi dupa dueDate ascendent
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })

  return NextResponse.json({ events })
}

// ─── POST — Marcheaza eveniment ca indeplinit ───

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { eventId, note } = body as { eventId?: string; note?: string }

  if (!eventId) {
    return NextResponse.json({ error: "eventId obligatoriu" }, { status: 400 })
  }

  const year = currentYear()
  const key = `COMPLIANCE_EVENT_${eventId}_${year}`
  const value = JSON.stringify({
    completedAt: new Date().toISOString(),
    completedBy: session.user.email || session.user.id,
    note: note || null,
  })

  // Upsert in SystemConfig
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value, label: `Conformitate: ${eventId} (${year})` },
  })

  return NextResponse.json({ ok: true, key, year })
}
