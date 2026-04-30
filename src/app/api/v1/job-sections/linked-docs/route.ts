/**
 * /api/v1/job-sections/linked-docs — Pasaje din documente sursă legate la fișe de post
 *
 * Flux:
 * 1. Client definește pasaje din ROI/CCM/Cod conduită care se includ în fișe
 * 2. Fiecare pasaj e legat de documentul sursă (ROI v3, CCM 2026 etc.)
 * 3. La actualizare document sursă → detectare fișe afectate → re-semnare
 *
 * GET  — Pasaje legate per tenant (cu status semnare)
 * POST — Adaugă/actualizează pasaj legat
 * PATCH — Marchează document sursă ca actualizat → propagare la fișe
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface LinkedPassage {
  id: string
  sourceDocType: string // ROI | CCM | COD_CONDUITA | COD_ETICA | ALTUL
  sourceDocVersion: string // ex: "v3 / martie 2026"
  passageTitle: string // ex: "Art. 15 — Obligații privind confidențialitatea"
  passageContent: string // textul efectiv din document
  linkedToJobs: string[] // ID-uri joburi care conțin acest pasaj
  lastUpdated: string
  lastSignatureRound: string | null // ultima rundă de re-semnare
}

interface SignatureRecord {
  passageId: string
  userId: string
  userEmail: string
  userName: string
  jobId: string
  signedAt: string
  signedFrom: string // IP / dispozitiv
  documentVersion: string
}

interface LinkedDocsState {
  passages: LinkedPassage[]
  signatures: SignatureRecord[]
}

async function getState(tenantId: string): Promise<LinkedDocsState> {
  return await getTenantData<LinkedDocsState>(tenantId, "LINKED_DOCS") || { passages: [], signatures: [] }
}

// GET — Pasaje + status semnare
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const state = await getState(session.user.tenantId)

  const passagesWithStatus = state.passages.map(p => {
    const sigs = state.signatures.filter(s => s.passageId === p.id)
    return {
      ...p,
      signatureCount: sigs.length,
      latestSignature: sigs.sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0] || null,
    }
  })

  return NextResponse.json({
    passages: passagesWithStatus,
    totalSignatures: state.signatures.length,
    docTypes: ["ROI", "CCM", "COD_CONDUITA", "COD_ETICA", "ALTUL"],
  })
}

// POST — Adaugă pasaj legat
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId || !["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Doar adminii pot configura" }, { status: 401 })
  }

  const body = await req.json()
  const { sourceDocType, sourceDocVersion, passageTitle, passageContent, linkedToJobs } = body

  if (!sourceDocType || !passageTitle || !passageContent) {
    return NextResponse.json({ error: "sourceDocType, passageTitle, passageContent obligatorii" }, { status: 400 })
  }

  const state = await getState(session.user.tenantId)
  const id = `passage_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  state.passages.push({
    id,
    sourceDocType,
    sourceDocVersion: sourceDocVersion || "v1",
    passageTitle,
    passageContent,
    linkedToJobs: linkedToJobs || [],
    lastUpdated: new Date().toISOString(),
    lastSignatureRound: null,
  })

  await setTenantData(session.user.tenantId, "LINKED_DOCS", state)

  return NextResponse.json({ ok: true, id })
}

// PATCH — Document sursă actualizat → propagare + re-semnare
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId || !["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Doar adminii pot actualiza" }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body

  const state = await getState(session.user.tenantId)

  // Actualizare pasaj
  if (action === "update-passage") {
    const { passageId, newContent, newVersion } = body
    const passage = state.passages.find(p => p.id === passageId)
    if (!passage) return NextResponse.json({ error: "Pasaj negăsit" }, { status: 404 })

    passage.passageContent = newContent || passage.passageContent
    passage.sourceDocVersion = newVersion || passage.sourceDocVersion
    passage.lastUpdated = new Date().toISOString()
    passage.lastSignatureRound = new Date().toISOString()

    await setTenantData(session.user.tenantId, "LINKED_DOCS", state)

    // Identifică angajații afectați (cei pe joburile legate)
    const { prisma } = await import("@/lib/prisma")
    const affectedEmployees = await prisma.employeeSalaryRecord.findMany({
      where: { tenantId: session.user.tenantId, jobCategory: { in: passage.linkedToJobs } },
      select: { employeeCode: true, department: true },
    })

    // Notificare: fișele trebuie re-semnate
    // TODO: email + notificare în portal
    return NextResponse.json({
      ok: true,
      passageId,
      affectedJobs: passage.linkedToJobs.length,
      affectedEmployees: affectedEmployees.length,
      message: `Pasaj actualizat. ${affectedEmployees.length} angajați necesită re-semnare.`,
    })
  }

  // Înregistrare semnătură angajat
  if (action === "sign") {
    const { passageId, userId, userEmail, userName, jobId } = body
    if (!passageId || !userId) return NextResponse.json({ error: "passageId, userId obligatorii" }, { status: 400 })

    state.signatures.push({
      passageId,
      userId,
      userEmail: userEmail || "",
      userName: userName || "",
      jobId: jobId || "",
      signedAt: new Date().toISOString(),
      signedFrom: req.headers.get("x-forwarded-for") || "unknown",
      documentVersion: state.passages.find(p => p.id === passageId)?.sourceDocVersion || "?",
    })

    await setTenantData(session.user.tenantId, "LINKED_DOCS", state)

    return NextResponse.json({ ok: true, signedAt: new Date().toISOString() })
  }

  return NextResponse.json({ error: "action: update-passage | sign" }, { status: 400 })
}
