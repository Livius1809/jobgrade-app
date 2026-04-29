/**
 * /api/v1/access-matrix — Matrice acces diferențiat per utilizator
 *
 * GET  — Matricea curentă + status validare
 * POST — Configurare/actualizare matrice (admin)
 * PATCH — Validare individuală (user confirmă rolul)
 *
 * Flux:
 * 1. Admin configurează matrice (POST)
 * 2. Fiecare user primește email și confirmă (PATCH)
 * 3. Când toți au confirmat → matrice activată → acces diferențiat
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface AccessEntry {
  userId: string
  email: string
  name: string
  role: string // rolul în companie (HR Director, DG, CFO, IT Admin)
  resources: string[] // funcționalități accesibile
  confirmedAt: string | null // null = neconfirmat
  confirmedFrom: string | null // IP/device de unde a confirmat
}

interface AccessMatrix {
  entries: AccessEntry[]
  configuredBy: string
  configuredAt: string
  activatedAt: string | null // null = nu toți au confirmat
  status: "CONFIGURING" | "PENDING_VALIDATION" | "ACTIVE"
}

const AVAILABLE_RESOURCES = [
  { id: "JOBS", label: "Fișe de post", category: "C1" },
  { id: "EVALUATION", label: "Evaluare posturi", category: "C1" },
  { id: "SALARY_IMPORT", label: "Import stat salarii", category: "C2" },
  { id: "PAY_GAP_REPORT", label: "Raport pay gap", category: "C2" },
  { id: "SALARY_GRADES", label: "Clase salariale", category: "C2" },
  { id: "COMPLIANCE", label: "Conformitate EU", category: "C2" },
  { id: "KPI", label: "KPI-uri", category: "C3" },
  { id: "COMPENSATION", label: "Pachete salariale", category: "C3" },
  { id: "PSYCHOMETRICS", label: "Evaluare psihometrică", category: "C3" },
  { id: "SOCIOGRAM", label: "Sociogramă echipe", category: "C3" },
  { id: "BENCHMARK", label: "Benchmark piață", category: "C3" },
  { id: "CLIMATE", label: "Climat organizațional", category: "C4" },
  { id: "STRATEGIC_OBJ", label: "Obiective strategice", category: "C4" },
  { id: "SIMULATION", label: "Simulări WIF", category: "C4" },
  { id: "DASHBOARD", label: "Dashboard", category: "General" },
  { id: "REPORTS", label: "Rapoarte", category: "General" },
  { id: "AUDIT_TRAIL", label: "Jurnal audit", category: "General" },
  { id: "SESSIONS", label: "Sesiuni evaluare", category: "General" },
  { id: "CONFIGURATION", label: "Configurare platformă", category: "Admin" },
  { id: "USER_MANAGEMENT", label: "Gestionare utilizatori", category: "Admin" },
  { id: "BILLING", label: "Facturare & credite", category: "Admin" },
]

async function getMatrix(tenantId: string): Promise<AccessMatrix | null> {
  return getTenantData<AccessMatrix>(tenantId, "ACCESS_MATRIX")
}

async function saveMatrix(tenantId: string, matrix: AccessMatrix): Promise<void> {
  await setTenantData(tenantId, "ACCESS_MATRIX", matrix)
}

// GET — Matrice + status + resurse disponibile
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const matrix = await getMatrix(session.user.tenantId)

  // Resurse accesibile pentru user-ul curent
  const myAccess = matrix?.entries.find(e => e.userId === session.user.id)

  return NextResponse.json({
    matrix: matrix || null,
    myAccess: myAccess || null,
    availableResources: AVAILABLE_RESOURCES,
    isAdmin: ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(session.user.role),
  })
}

// POST — Configurare matrice (admin)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId || !["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Doar adminii pot configura matricea" }, { status: 401 })
  }

  const body = await req.json()
  const { entries } = body

  if (!Array.isArray(entries) || entries.length < 2) {
    return NextResponse.json({ error: "Minim 2 utilizatori (securitate)" }, { status: 400 })
  }

  // Validare: fiecare entry trebuie userId, email, role, resources
  for (const e of entries) {
    if (!e.userId || !e.email || !e.role || !Array.isArray(e.resources)) {
      return NextResponse.json({ error: "Fiecare entry: userId, email, role, resources[]" }, { status: 400 })
    }
  }

  const matrix: AccessMatrix = {
    entries: entries.map((e: any) => ({
      userId: e.userId,
      email: e.email,
      name: e.name || e.email,
      role: e.role,
      resources: e.resources,
      confirmedAt: null,
      confirmedFrom: null,
    })),
    configuredBy: session.user.id,
    configuredAt: new Date().toISOString(),
    activatedAt: null,
    status: "PENDING_VALIDATION",
  }

  await saveMatrix(session.user.tenantId, matrix)

  // Trimite email de confirmare la fiecare user
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    for (const entry of matrix.entries) {
      await resend.emails.send({
        from: "JobGrade <noreply@jobgrade.ro>",
        to: entry.email,
        subject: "[JobGrade] Confirmați rolul și accesul la platformă",
        html: `
          <h2>Confirmare acces JobGrade</h2>
          <p>Bună, <strong>${entry.name}</strong>,</p>
          <p>Ați fost adăugat pe platforma JobGrade cu următorul acces:</p>
          <table style="border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 4px 12px; font-weight: bold;">Rol:</td><td style="padding: 4px 12px;">${entry.role}</td></tr>
            <tr><td style="padding: 4px 12px; font-weight: bold;">Acces la:</td><td style="padding: 4px 12px;">${entry.resources.map((r: string) => AVAILABLE_RESOURCES.find(ar => ar.id === r)?.label || r).join(", ")}</td></tr>
          </table>
          <p>Pentru a activa accesul, confirmați că informațiile sunt corecte:</p>
          <p><a href="https://jobgrade.ro/portal?confirm=access" style="padding: 12px 24px; background: #4F46E5; color: white; border-radius: 8px; text-decoration: none; display: inline-block;">Confirm rolul și accesul</a></p>
          <p style="color: #666; font-size: 12px;">Accesul diferențiat se activează când toți utilizatorii confirmă.</p>
        `,
      }).catch(() => {})
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    totalUsers: matrix.entries.length,
    status: matrix.status,
    message: `Matrice configurată. ${matrix.entries.length} utilizatori notificați pentru confirmare.`,
  })
}

// PATCH — Validare individuală (user confirmă, poate scoate bife dar nu adăuga)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { resources: userResources } = body // bifele modificate de user (opțional)

  const matrix = await getMatrix(session.user.tenantId)
  if (!matrix) {
    return NextResponse.json({ error: "Matrice neconfigurată" }, { status: 404 })
  }

  const entryIdx = matrix.entries.findIndex(e => e.userId === session.user.id)
  if (entryIdx < 0) {
    return NextResponse.json({ error: "Nu sunteți în matrice" }, { status: 403 })
  }

  // Dacă user-ul trimite resurse modificate — poate doar SCOATE, nu adăuga
  if (Array.isArray(userResources)) {
    const originalResources = matrix.entries[entryIdx].resources
    // Filtrează: păstrează doar ce era în original ȘI ce a bifat user-ul
    matrix.entries[entryIdx].resources = userResources.filter((r: string) => originalResources.includes(r))
  }

  // Confirmă
  matrix.entries[entryIdx].confirmedAt = new Date().toISOString()
  matrix.entries[entryIdx].confirmedFrom = req.headers.get("x-forwarded-for") || "unknown"

  // Verifică dacă toți au confirmat
  const allConfirmed = matrix.entries.every(e => e.confirmedAt !== null)

  if (allConfirmed) {
    matrix.status = "ACTIVE"
    matrix.activatedAt = new Date().toISOString()
  }

  await saveMatrix(session.user.tenantId, matrix)

  const confirmed = matrix.entries.filter(e => e.confirmedAt).length
  const total = matrix.entries.length

  return NextResponse.json({
    ok: true,
    confirmed,
    total,
    activated: allConfirmed,
    message: allConfirmed
      ? "Toți utilizatorii au confirmat. Accesul diferențiat este activ."
      : `${confirmed}/${total} confirmări. Mai sunt necesare ${total - confirmed}.`,
  })
}
