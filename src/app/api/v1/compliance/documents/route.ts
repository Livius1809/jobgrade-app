/**
 * /api/v1/compliance/documents
 *
 * Configurator documente interne — bife per tip + upload.
 * Tipuri: ROI, CCM, politici interne, certificari.
 * Stocare metadata in CompanyProfile.aiAnalysis.documents
 * Fisierele se stocheaza via Vercel Blob (sau fallback base64 in DB).
 *
 * GET  — Lista tipuri documente + status (uploadat/neuploadat)
 * POST — Upload document per tip
 * DELETE — Sterge document per tip
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 30

interface DocumentType {
  id: string
  label: string
  description: string
  card: "C2" | "C3" | "C4"
  required: boolean
}

interface DocumentRecord {
  typeId: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  uploadedBy: string
}

const DOCUMENT_TYPES: DocumentType[] = [
  // C2 — Conformitate
  {
    id: "roi",
    label: "Regulament de Ordine Interioara (ROI)",
    description: "Document obligatoriu conform Codului Muncii Art.241-246. Poate fi verificat automat in sectiunea dedicata.",
    card: "C2",
    required: true,
  },
  {
    id: "ccm",
    label: "Contract Colectiv de Munca (CCM)",
    description: "Daca exista — verificam conformitatea cu legislatia muncii in vigoare.",
    card: "C2",
    required: false,
  },
  {
    id: "politica_salarizare",
    label: "Politica de salarizare",
    description: "Reguli si criterii de stabilire a salariilor, bonusurilor, beneficiilor.",
    card: "C2",
    required: false,
  },
  {
    id: "politica_nediscriminare",
    label: "Politica de nediscriminare si egalitate de sanse",
    description: "Conform L.202/2002 si OG 137/2000.",
    card: "C2",
    required: false,
  },
  {
    id: "certificari",
    label: "Certificari si acreditari (ISO, OHSAS etc)",
    description: "Documente de certificare existente ale organizatiei.",
    card: "C2",
    required: false,
  },

  // C3 — Competitivitate
  {
    id: "proceduri_lucru",
    label: "Proceduri de lucru (SOP)",
    description: "Proceduri operationale standard per departament sau proces.",
    card: "C3",
    required: false,
  },
  {
    id: "politica_recrutare",
    label: "Politica de recrutare",
    description: "Procesul de recrutare, criterii de selectie, etape.",
    card: "C3",
    required: false,
  },
  {
    id: "politica_formare",
    label: "Politica de formare si dezvoltare",
    description: "Planuri de training, bugete de dezvoltare, criterii de acces.",
    card: "C3",
    required: false,
  },
  {
    id: "regulamente_dept",
    label: "Regulamente interne departamente",
    description: "Reguli specifice per departament, norme de operare.",
    card: "C3",
    required: false,
  },
  {
    id: "manual_angajator",
    label: "Manual angajator (onboarding)",
    description: "Ghidul angajatorului: procese, responsabilitati, proceduri.",
    card: "C3",
    required: false,
  },
  {
    id: "manual_angajat",
    label: "Manual angajat (onboarding)",
    description: "Ghidul noului angajat: ce trebuie sa stie, drepturi, obligatii, cultura.",
    card: "C3",
    required: false,
  },
  {
    id: "cod_etic",
    label: "Cod etic / Cod de conduita",
    description: "Valorile, principiile si comportamentele asteptate. Suma manualelor angajator + angajat.",
    card: "C3",
    required: false,
  },
]

async function getDocuments(tenantId: string): Promise<DocumentRecord[]> {
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId },
    select: { aiAnalysis: true },
  })
  const analysis = (profile?.aiAnalysis as Record<string, unknown>) || {}
  return (analysis.documents as DocumentRecord[]) || []
}

async function saveDocuments(tenantId: string, docs: DocumentRecord[]): Promise<void> {
  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId },
    select: { aiAnalysis: true },
  })
  const analysis = (profile?.aiAnalysis as Record<string, unknown>) || {}
  await prisma.companyProfile.update({
    where: { tenantId },
    data: { aiAnalysis: { ...analysis, documents: docs } as any },
  })
}

// GET — Lista tipuri + status
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const uploaded = await getDocuments(session.user.tenantId)
  const uploadedMap = new Map(uploaded.map(d => [d.typeId, d]))

  const result = DOCUMENT_TYPES.map(dt => ({
    ...dt,
    uploaded: uploadedMap.has(dt.id),
    document: uploadedMap.get(dt.id) || null,
  }))

  const c2Docs = result.filter(d => d.card === "C2")
  const c3Docs = result.filter(d => d.card === "C3")

  return NextResponse.json({
    types: result,
    c2: c2Docs,
    c3: c3Docs,
    stats: {
      total: result.length,
      uploaded: uploaded.length,
      c2Uploaded: c2Docs.filter(d => d.uploaded).length,
      c3Uploaded: c3Docs.filter(d => d.uploaded).length,
    },
  })
}

// POST — Upload document
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const formData = await req.formData()
  const typeId = formData.get("typeId") as string
  const file = formData.get("file") as File | null

  if (!typeId) {
    return NextResponse.json({ error: "typeId obligatoriu" }, { status: 400 })
  }

  const docType = DOCUMENT_TYPES.find(dt => dt.id === typeId)
  if (!docType) {
    return NextResponse.json({ error: "Tip document invalid" }, { status: 400 })
  }

  const docs = await getDocuments(session.user.tenantId)

  if (file) {
    // Inlocuieste daca exista deja
    const idx = docs.findIndex(d => d.typeId === typeId)
    const record: DocumentRecord = {
      typeId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.user.id,
    }

    if (idx >= 0) {
      docs[idx] = record
    } else {
      docs.push(record)
    }

    await saveDocuments(session.user.tenantId, docs)
    return NextResponse.json({ ok: true, document: record })
  }

  // Fara fisier — doar marcheaza ca "are document" (confirmare manuala)
  const idx = docs.findIndex(d => d.typeId === typeId)
  const record: DocumentRecord = {
    typeId,
    fileName: "(confirmat manual)",
    fileSize: 0,
    mimeType: "",
    uploadedAt: new Date().toISOString(),
    uploadedBy: session.user.id,
  }
  if (idx >= 0) docs[idx] = record
  else docs.push(record)
  await saveDocuments(session.user.tenantId, docs)

  return NextResponse.json({ ok: true, document: record })
}

// DELETE — Sterge document
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const url = new URL(req.url)
  const typeId = url.searchParams.get("typeId")
  if (!typeId) {
    return NextResponse.json({ error: "typeId obligatoriu" }, { status: 400 })
  }

  const docs = await getDocuments(session.user.tenantId)
  const filtered = docs.filter(d => d.typeId !== typeId)
  await saveDocuments(session.user.tenantId, filtered)

  return NextResponse.json({ ok: true })
}
