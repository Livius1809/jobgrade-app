/**
 * /api/v1/psychometrics
 *
 * Framework baterie psihometrica configurabila per post/rol.
 * Instrumente obligatorii: Herrmann HBDI + MBTI (din B2C Card 3)
 * Instrumente externe: TestCentral etc — upload PDF rezultat per angajat
 *
 * GET  — Configurare baterie + status completare per angajat
 * POST — Configureaza baterie per post SAU uploadeaza rezultat per angajat
 * PATCH — Actualizeaza status
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// Instrumente disponibile
interface Instrument {
  id: string
  name: string
  provider: string
  type: "INTERNAL" | "EXTERNAL" // intern (noi il administram) vs extern (upload PDF)
  required: boolean
  description: string
  costPerAdmin: number | null // cost per administrare (credite) — null = inclus
}

const AVAILABLE_INSTRUMENTS: Instrument[] = [
  {
    id: "herrmann_hbdi",
    name: "Herrmann HBDI (Brain Dominance)",
    provider: "JobGrade (licenta)",
    type: "INTERNAL",
    required: true,
    description: "Profilul de dominanta cerebrala: analitic, secvential, interpersonal, imaginativ. 4 cadrane.",
    costPerAdmin: null,
  },
  {
    id: "mbti",
    name: "MBTI (Myers-Briggs Type Indicator)",
    provider: "JobGrade",
    type: "INTERNAL",
    required: true,
    description: "Tipul de personalitate: 16 tipuri bazate pe 4 dimensiuni (E/I, S/N, T/F, J/P).",
    costPerAdmin: null,
  },
  {
    id: "via_strengths",
    name: "VIA Character Strengths",
    provider: "JobGrade",
    type: "INTERNAL",
    required: false,
    description: "24 trasaturi de caracter — puncte forte, virtuti cultivate vs necultivate.",
    costPerAdmin: null,
  },
  {
    id: "testcentral_generic",
    name: "TestCentral — instrument configurat",
    provider: "TestCentral (extern)",
    type: "EXTERNAL",
    required: false,
    description: "Orice instrument administrat prin TestCentral. Clientul completeaza pe platforma lor, uploadeaza PDF cu rezultate.",
    costPerAdmin: 5,
  },
  {
    id: "external_other",
    name: "Alt instrument extern",
    provider: "Furnizor extern",
    type: "EXTERNAL",
    required: false,
    description: "Orice instrument psihometric de la alt furnizor. Upload PDF cu rezultate.",
    costPerAdmin: 0,
  },
]

// Configurare baterie per post
interface BatteryConfig {
  jobId: string
  jobTitle: string
  instruments: string[] // IDs din AVAILABLE_INSTRUMENTS
  configuredAt: string
  configuredBy: string
}

// Rezultat per angajat
interface EmployeeResult {
  employeeCode: string
  employeeName: string
  jobId: string
  instrumentId: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  resultFileName: string | null
  completedAt: string | null
}

interface PsychometricState {
  batteries: BatteryConfig[]
  results: EmployeeResult[]
}

async function getState(tenantId: string): Promise<PsychometricState> {
  return await getTenantData<PsychometricState>(tenantId, "PSYCHOMETRICS") || { batteries: [], results: [] }
}

async function saveState(tenantId: string, state: PsychometricState): Promise<void> {
  await setTenantData(tenantId, "PSYCHOMETRICS", state)
}

// GET — Configurare + status
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const state = await getState(session.user.tenantId)

  // Departamente cu joburi
  const departments = await prisma.department.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  // Angajati din stat salarii, grupati per departament, cu tot ce stim
  const employees = await prisma.employeeSalaryRecord.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      employeeCode: true,
      gender: true,
      baseSalary: true,
      variableComp: true,
      department: true,
      jobCategory: true,
      workSchedule: true,
      salaryGradeId: true,
      salaryGrade: { select: { name: true } },
    },
    orderBy: [{ department: "asc" }, { jobCategory: "asc" }],
    take: 500,
  })

  // Joburi (pentru mapare post → angajat)
  const jobs = await prisma.job.findMany({
    where: { tenantId: session.user.tenantId, status: "ACTIVE" },
    select: { id: true, title: true, departmentId: true, department: { select: { name: true } } },
    orderBy: { title: "asc" },
  })

  // Organigramă: angajați grupați per departament
  const orgByDept: Record<string, any[]> = {}
  for (const emp of employees) {
    const dept = emp.department || "Fara departament"
    if (!orgByDept[dept]) orgByDept[dept] = []
    orgByDept[dept].push({
      code: emp.employeeCode,
      department: dept,
      post: emp.jobCategory || "Nespecificat",
      salary: emp.baseSalary,
      variable: emp.variableComp || 0,
      grade: emp.salaryGrade?.name || null,
      gender: emp.gender,
      schedule: emp.workSchedule,
    })
  }

  // Stats
  const totalResults = state.results.length
  const completed = state.results.filter(r => r.status === "COMPLETED").length
  const pending = state.results.filter(r => r.status === "PENDING").length

  return NextResponse.json({
    instruments: AVAILABLE_INSTRUMENTS,
    batteries: state.batteries,
    results: state.results,
    departments,
    jobs,
    orgByDept,
    employeeCount: employees.length,
    stats: {
      batteriesConfigured: state.batteries.length,
      totalAssignments: totalResults,
      completed,
      pending,
      inProgress: totalResults - completed - pending,
      completionPct: totalResults > 0 ? Math.round((completed / totalResults) * 100) : 0,
    },
  })
}

// POST — Configurare baterie per post SAU upload rezultat per angajat
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const contentType = req.headers.get("content-type") || ""
  const state = await getState(session.user.tenantId)

  // Upload rezultat (multipart/form-data)
  if (contentType.includes("multipart")) {
    const formData = await req.formData()
    const employeeCode = formData.get("employeeCode") as string
    const instrumentId = formData.get("instrumentId") as string
    const jobId = formData.get("jobId") as string
    const file = formData.get("file") as File | null

    if (!employeeCode || !instrumentId) {
      return NextResponse.json({ error: "employeeCode si instrumentId obligatorii" }, { status: 400 })
    }

    // Gaseste sau creaza rezultatul
    const idx = state.results.findIndex(r =>
      r.employeeCode === employeeCode && r.instrumentId === instrumentId
    )

    const result: EmployeeResult = {
      employeeCode,
      employeeName: employeeCode,
      jobId: jobId || "",
      instrumentId,
      status: file ? "COMPLETED" : "IN_PROGRESS",
      resultFileName: file?.name || null,
      completedAt: file ? new Date().toISOString() : null,
    }

    if (idx >= 0) state.results[idx] = result
    else state.results.push(result)

    await saveState(session.user.tenantId, state)
    return NextResponse.json({ ok: true, result })
  }

  // Configurare baterie (application/json)
  const body = await req.json()
  const { action } = body

  if (action === "configure-battery") {
    const { jobId, jobTitle, instruments } = body
    if (!jobId || !instruments?.length) {
      return NextResponse.json({ error: "jobId si instruments obligatorii" }, { status: 400 })
    }

    // Obligatoriu: herrmann + mbti
    const requiredIds = AVAILABLE_INSTRUMENTS.filter(i => i.required).map(i => i.id)
    const finalInstruments = [...new Set([...requiredIds, ...instruments])]

    const idx = state.batteries.findIndex(b => b.jobId === jobId)
    const battery: BatteryConfig = {
      jobId,
      jobTitle: jobTitle || jobId,
      instruments: finalInstruments,
      configuredAt: new Date().toISOString(),
      configuredBy: session.user.id,
    }

    if (idx >= 0) state.batteries[idx] = battery
    else state.batteries.push(battery)

    await saveState(session.user.tenantId, state)
    return NextResponse.json({ ok: true, battery })
  }

  if (action === "assign-employee") {
    const { employeeCode, employeeName, jobId } = body
    if (!employeeCode || !jobId) {
      return NextResponse.json({ error: "employeeCode si jobId obligatorii" }, { status: 400 })
    }

    // Gaseste bateria pentru job
    const battery = state.batteries.find(b => b.jobId === jobId)
    if (!battery) {
      return NextResponse.json({ error: "Bateria nu e configurata pentru acest post" }, { status: 400 })
    }

    // Creaza assignments PENDING per instrument
    let created = 0
    for (const instrId of battery.instruments) {
      const exists = state.results.find(r =>
        r.employeeCode === employeeCode && r.instrumentId === instrId
      )
      if (!exists) {
        state.results.push({
          employeeCode,
          employeeName: employeeName || employeeCode,
          jobId,
          instrumentId: instrId,
          status: "PENDING",
          resultFileName: null,
          completedAt: null,
        })
        created++
      }
    }

    await saveState(session.user.tenantId, state)
    return NextResponse.json({ ok: true, assigned: created, instruments: battery.instruments.length })
  }

  return NextResponse.json({ error: "action necunoscuta" }, { status: 400 })
}

// PATCH — Actualizeaza status rezultat
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { employeeCode, instrumentId, status } = body

  if (!employeeCode || !instrumentId || !status) {
    return NextResponse.json({ error: "employeeCode, instrumentId si status obligatorii" }, { status: 400 })
  }

  const state = await getState(session.user.tenantId)
  const result = state.results.find(r =>
    r.employeeCode === employeeCode && r.instrumentId === instrumentId
  )

  if (!result) {
    return NextResponse.json({ error: "Rezultat negasit" }, { status: 404 })
  }

  result.status = status
  if (status === "COMPLETED") result.completedAt = new Date().toISOString()

  await saveState(session.user.tenantId, state)
  return NextResponse.json({ ok: true })
}
