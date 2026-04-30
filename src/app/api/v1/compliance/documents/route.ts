/**
 * /api/v1/compliance/documents
 *
 * Upload documente interne de conformitate (C2): politici interne, certificari, CCM, ROI.
 * Stocare continut text in SystemConfig ca COMPLIANCE_DOC_{type}_{slug}.
 *
 * POST   — Upload/creare document intern (JSON body)
 * GET    — Lista toate documentele per tenant, grupate pe tip
 * DELETE — Sterge document dupa cheie
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Tipuri de documente de conformitate
type ComplianceDocType = "POLICY" | "CERTIFICATION" | "CCM" | "ROI"

interface ComplianceDocMeta {
  title: string
  documentType: ComplianceDocType
  content: string
  validFrom: string | null
  validUntil: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  key: string // cheia SystemConfig
}

// Slugificare titlu pentru cheie unica
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60)
}

// Prefix cheie pentru documentele de conformitate
function docKeyPrefix(tenantId: string): string {
  return `TENANT_${tenantId}_COMPLIANCE_DOC_`
}

function docKey(tenantId: string, docType: ComplianceDocType, slug: string): string {
  return `${docKeyPrefix(tenantId)}${docType}_${slug}`
}

// POST — Creare/actualizare document intern
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { title, documentType, content, validFrom, validUntil } = body

  // Validari
  if (!title || !documentType || !content) {
    return NextResponse.json(
      { error: "Campuri obligatorii: title, documentType, content" },
      { status: 400 }
    )
  }

  const allowedTypes: ComplianceDocType[] = ["POLICY", "CERTIFICATION", "CCM", "ROI"]
  if (!allowedTypes.includes(documentType)) {
    return NextResponse.json(
      { error: `documentType invalid. Valori acceptate: ${allowedTypes.join(", ")}` },
      { status: 400 }
    )
  }

  const slug = slugify(title)
  if (!slug) {
    return NextResponse.json({ error: "Titlu invalid (nu produce slug valid)" }, { status: 400 })
  }

  const key = docKey(session.user.tenantId, documentType, slug)

  const now = new Date().toISOString()
  const meta: ComplianceDocMeta = {
    title,
    documentType,
    content,
    validFrom: validFrom || null,
    validUntil: validUntil || null,
    createdAt: now,
    updatedAt: now,
    createdBy: session.user.id,
    key,
  }

  // Upsert — daca exista deja, actualizeaza (pastreaza createdAt original)
  const existing = await prisma.systemConfig.findUnique({ where: { key } })
  if (existing) {
    const existingMeta = JSON.parse(existing.value) as ComplianceDocMeta
    meta.createdAt = existingMeta.createdAt // pastreaza data crearii
  }

  await prisma.systemConfig.upsert({
    where: { key },
    update: { value: JSON.stringify(meta) },
    create: { key, value: JSON.stringify(meta) },
  })

  return NextResponse.json({
    ok: true,
    document: {
      key,
      title: meta.title,
      documentType: meta.documentType,
      validFrom: meta.validFrom,
      validUntil: meta.validUntil,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    },
  })
}

// GET — Lista toate documentele de conformitate per tenant, grupate pe tip
export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const prefix = docKeyPrefix(session.user.tenantId)

  // Cautam toate cheile care incep cu prefixul de documente conformitate
  const configs = await prisma.systemConfig.findMany({
    where: { key: { startsWith: prefix } },
    orderBy: { key: "asc" },
  })

  const documents: ComplianceDocMeta[] = configs.map(c => {
    try {
      return JSON.parse(c.value) as ComplianceDocMeta
    } catch {
      return null
    }
  }).filter(Boolean) as ComplianceDocMeta[]

  // Grupare pe documentType
  const grouped: Record<ComplianceDocType, ComplianceDocMeta[]> = {
    POLICY: [],
    CERTIFICATION: [],
    CCM: [],
    ROI: [],
  }

  for (const doc of documents) {
    if (grouped[doc.documentType]) {
      grouped[doc.documentType].push({
        ...doc,
        content: doc.content.slice(0, 200) + (doc.content.length > 200 ? "..." : ""), // trunchiere continut in lista
      })
    }
  }

  return NextResponse.json({
    documents,
    grouped,
    stats: {
      total: documents.length,
      POLICY: grouped.POLICY.length,
      CERTIFICATION: grouped.CERTIFICATION.length,
      CCM: grouped.CCM.length,
      ROI: grouped.ROI.length,
    },
  })
}

// DELETE — Sterge document dupa cheie
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const url = new URL(req.url)
  const key = url.searchParams.get("key")

  if (!key) {
    return NextResponse.json({ error: "Parametru 'key' obligatoriu" }, { status: 400 })
  }

  // Verificare securitate: cheia apartine tenant-ului curent
  const prefix = docKeyPrefix(session.user.tenantId)
  if (!key.startsWith(prefix)) {
    return NextResponse.json({ error: "Acces interzis la acest document" }, { status: 403 })
  }

  const existing = await prisma.systemConfig.findUnique({ where: { key } })
  if (!existing) {
    return NextResponse.json({ error: "Document negasit" }, { status: 404 })
  }

  await prisma.systemConfig.delete({ where: { key } })

  return NextResponse.json({ ok: true, deletedKey: key })
}
