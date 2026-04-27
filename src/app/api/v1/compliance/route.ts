/**
 * /api/v1/compliance
 *
 * Calendar conformitate — obligatii legale cu termene si alerte.
 * Stocat in CompanyProfile.aiAnalysis.complianceCalendar (zero migrare schema).
 *
 * GET  — Lista obligatii + alerte pe cele care se apropie
 * POST — Adauga/actualizeaza obligatie
 * PATCH — Marcheaza obligatie ca indeplinita
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface ComplianceObligation {
  id: string
  title: string
  description: string
  legalBasis: string // ex: "Directiva EU 2023/970 Art.9", "GDPR Art.30", "Codul Muncii Art.166"
  category: "PAY_TRANSPARENCY" | "GDPR" | "LABOR_LAW" | "AI_ACT" | "FISCAL" | "OTHER"
  dueDate: string // ISO date
  recurrence: "ONCE" | "ANNUAL" | "SEMI_ANNUAL" | "QUARTERLY" | "MONTHLY" | null
  responsibleRole: string // ex: "HR Director", "DPO", "Director General"
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE"
  completedAt: string | null
  notes: string | null
}

// Obligatii standard pre-populate (seed) — legislatie RO + EU
const DEFAULT_OBLIGATIONS: Omit<ComplianceObligation, "id" | "status" | "completedAt" | "notes">[] = [
  {
    title: "Raport pay gap Art.9 — Directiva EU 2023/970",
    description: "Publicarea raportului anual privind diferentele de remunerare pe gen. Obligatoriu pentru companii >100 angajati (termen 2027) sau >250 (termen 2026).",
    legalBasis: "Directiva EU 2023/970, Art.9",
    category: "PAY_TRANSPARENCY",
    dueDate: "2027-06-07",
    recurrence: "ANNUAL",
    responsibleRole: "HR Director",
  },
  {
    title: "Evaluare comuna Art.10 — daca pay gap >5%",
    description: "Evaluare comuna angajator-angajati daca diferenta de remunerare pe gen depaseste 5% si nu poate fi justificata obiectiv.",
    legalBasis: "Directiva EU 2023/970, Art.10",
    category: "PAY_TRANSPARENCY",
    dueDate: "2027-06-07",
    recurrence: "ANNUAL",
    responsibleRole: "HR Director",
  },
  {
    title: "Eliminare clauza confidentialitate salariu din ROI",
    description: "Conform Directivei EU 2023/970, angajatorul nu mai poate impune confidentialitatea salariului. Clauza trebuie scoasa din Regulamentul de Ordine Interioara.",
    legalBasis: "Directiva EU 2023/970, Art.7 + Proiect lege transparenta salariala RO 2026",
    category: "PAY_TRANSPARENCY",
    dueDate: "2026-12-31",
    recurrence: "ONCE",
    responsibleRole: "HR Director",
  },
  {
    title: "Registru prelucrari date personale Art.30 GDPR",
    description: "Mentinerea unui registru actualizat al activitatilor de prelucrare a datelor personale.",
    legalBasis: "GDPR Art.30",
    category: "GDPR",
    dueDate: "2026-12-31",
    recurrence: "ANNUAL",
    responsibleRole: "DPO",
  },
  {
    title: "Evaluare impact protectia datelor (DPIA)",
    description: "Evaluare de impact pentru prelucrarile cu risc ridicat (profilare, date sensibile, monitorizare sistematica).",
    legalBasis: "GDPR Art.35",
    category: "GDPR",
    dueDate: "2026-12-31",
    recurrence: "ANNUAL",
    responsibleRole: "DPO",
  },
  {
    title: "Informare angajati privind criteriile salariale Art.7",
    description: "Angajatorii trebuie sa puna la dispozitia angajatilor criteriile de stabilire a salariului, nivelurile si evolutia salariilor.",
    legalBasis: "Directiva EU 2023/970, Art.7",
    category: "PAY_TRANSPARENCY",
    dueDate: "2026-12-31",
    recurrence: null,
    responsibleRole: "HR Director",
  },
  {
    title: "Revizia Regulamentului Intern (ROI)",
    description: "Verificare anuala si actualizare ROI conform legislatiei in vigoare. Include: eliminare clauze ilegale, actualizare drepturi/obligatii.",
    legalBasis: "Codul Muncii Art.241-246",
    category: "LABOR_LAW",
    dueDate: "2026-12-31",
    recurrence: "ANNUAL",
    responsibleRole: "HR Director",
  },
  {
    title: "Declaratie unica (112) — lunar",
    description: "Depunere declaratie unica privind obligatiile de plata a contributiilor sociale, impozitului pe venit si evidenta nominala a persoanelor asigurate.",
    legalBasis: "Codul Fiscal, OUG 153/2020",
    category: "FISCAL",
    dueDate: "2026-05-25",
    recurrence: "MONTHLY",
    responsibleRole: "Director Financiar",
  },
  {
    title: "Conformitate AI Act — sisteme cu risc ridicat",
    description: "Daca organizatia foloseste sisteme AI in HR (recrutare, evaluare performanta, promovari), trebuie asigurata conformitatea cu AI Act Anexa III. Include: supraveghere umana Art.14, documentatie Anexa IV.",
    legalBasis: "Regulamentul EU AI Act 2024/1689, Anexa III + Art.14",
    category: "AI_ACT",
    dueDate: "2027-08-02",
    recurrence: "ANNUAL",
    responsibleRole: "Director General",
  },
]

function generateId(): string {
  return "co_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

async function getCalendar(tenantId: string): Promise<ComplianceObligation[]> {
  return await getTenantData<ComplianceObligation[]>(tenantId, "COMPLIANCE_CALENDAR") || []
}

async function saveCalendar(tenantId: string, calendar: ComplianceObligation[]): Promise<void> {
  await setTenantData(tenantId, "COMPLIANCE_CALENDAR", calendar)
}

// GET — Lista obligatii + alerte
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  let calendar = await getCalendar(session.user.tenantId)

  // Daca e gol, seed cu obligatii standard
  if (calendar.length === 0) {
    calendar = DEFAULT_OBLIGATIONS.map(o => ({
      ...o,
      id: generateId(),
      status: "PENDING" as const,
      completedAt: null,
      notes: null,
    }))
    await saveCalendar(session.user.tenantId, calendar)
  }

  // Actualizare automata status OVERDUE
  const now = new Date()
  let updated = false
  for (const o of calendar) {
    if (o.status === "PENDING" && new Date(o.dueDate) < now) {
      o.status = "OVERDUE"
      updated = true
    }
  }
  if (updated) await saveCalendar(session.user.tenantId, calendar)

  // Sortare: OVERDUE first, apoi dupa dueDate
  const sorted = [...calendar].sort((a, b) => {
    if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1
    if (b.status === "OVERDUE" && a.status !== "OVERDUE") return 1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  // Alerte: obligatii care expira in urmatoarele 30 zile
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const alerts = sorted.filter(o =>
    o.status !== "COMPLETED" && new Date(o.dueDate) <= thirtyDays
  )

  return NextResponse.json({
    obligations: sorted,
    alerts,
    stats: {
      total: calendar.length,
      pending: calendar.filter(o => o.status === "PENDING").length,
      inProgress: calendar.filter(o => o.status === "IN_PROGRESS").length,
      completed: calendar.filter(o => o.status === "COMPLETED").length,
      overdue: calendar.filter(o => o.status === "OVERDUE").length,
    },
  })
}

// POST — Adauga obligatie noua
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, legalBasis, category, dueDate, recurrence, responsibleRole } = body

  if (!title || !dueDate) {
    return NextResponse.json({ error: "Titlu si termen obligatorii" }, { status: 400 })
  }

  const calendar = await getCalendar(session.user.tenantId)

  const newObligation: ComplianceObligation = {
    id: generateId(),
    title,
    description: description || "",
    legalBasis: legalBasis || "",
    category: category || "OTHER",
    dueDate,
    recurrence: recurrence || null,
    responsibleRole: responsibleRole || "",
    status: "PENDING",
    completedAt: null,
    notes: null,
  }

  calendar.push(newObligation)
  await saveCalendar(session.user.tenantId, calendar)

  return NextResponse.json({ ok: true, obligation: newObligation })
}

// PATCH — Marcheaza obligatie (status change)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { id, status, notes } = body

  if (!id || !status) {
    return NextResponse.json({ error: "id si status obligatorii" }, { status: 400 })
  }

  const calendar = await getCalendar(session.user.tenantId)
  const obligation = calendar.find(o => o.id === id)

  if (!obligation) {
    return NextResponse.json({ error: "Obligatie negasita" }, { status: 404 })
  }

  obligation.status = status
  if (status === "COMPLETED") obligation.completedAt = new Date().toISOString()
  if (notes !== undefined) obligation.notes = notes

  await saveCalendar(session.user.tenantId, calendar)

  return NextResponse.json({ ok: true, obligation })
}
