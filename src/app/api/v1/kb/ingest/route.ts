/**
 * POST /api/v1/kb/ingest — Pâlnia de cunoaștere
 *
 * Primește un document (PDF, DOCX, text) de la Owner și:
 *  1. Extrage textul
 *  2. Claude extrage cunoaștere declarativă + procedurală
 *  3. Rutează automat pe consultanții L2
 *  4. Creează KB entries
 *
 * Moduri de utilizare:
 *  A) Upload fișier (FormData):
 *     file: PDF/DOCX/TXT
 *     sourceTitle: "Creativitate și Inteligență Emoțională"
 *     sourceAuthor: "Mihaela Rocco"
 *     sourceType: "carte" | "curs" | "articol" | "manual" | "politica"
 *     dryRun: "true" (opțional)
 *
 *  B) Text brut (JSON):
 *     { rawText: "...", sourceTitle, sourceAuthor, sourceType, dryRun? }
 *
 * Acces: doar Owner (via INTERNAL_API_KEY sau owner session)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ingestDocument } from "@/lib/kb/ingest-document"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // documentele mari pot dura

function verifyAccess(req: NextRequest): boolean {
  // Internal API key (pentru n8n, scripts)
  const key = process.env.INTERNAL_API_KEY
  if (key && req.headers.get("x-internal-key") === key) return true
  return false
}

export async function POST(req: NextRequest) {
  // Verificare acces: internal key SAU owner session
  const hasInternalKey = verifyAccess(req)

  if (!hasInternalKey) {
    const session = await auth()
    if (!session?.user?.role || !["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Acces rezervat Owner" }, { status: 401 })
    }
  }

  const contentType = req.headers.get("content-type") || ""

  // ── Mod A: Upload fișier (FormData) ────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const sourceTitle = formData.get("sourceTitle") as string
    const sourceAuthor = formData.get("sourceAuthor") as string
    const sourceType = (formData.get("sourceType") as string) || "carte"
    const dryRun = formData.get("dryRun") === "true"

    if (!file) return NextResponse.json({ error: "Fișierul lipsește" }, { status: 400 })
    if (!sourceTitle) return NextResponse.json({ error: "sourceTitle obligatoriu" }, { status: 400 })
    if (!sourceAuthor) return NextResponse.json({ error: "sourceAuthor obligatoriu" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = "." + file.name.toLowerCase().split(".").pop()

    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Fișier prea mare (max 50 MB)" }, { status: 400 })
    }

    const bibliographyMode = formData.get("bibliographyMode") === "true"

    const result = await ingestDocument({
      fileBuffer: buffer,
      fileExtension: ext,
      sourceTitle,
      sourceAuthor,
      sourceType: sourceType as any,
      dryRun,
      bibliographyMode,
    })

    return NextResponse.json(result)
  }

  // ── Mod B: Text brut sau Referință bibliografică (JSON) ─────
  if (contentType.includes("application/json")) {
    const body = await req.json()

    if (!body.sourceTitle) return NextResponse.json({ error: "sourceTitle obligatoriu" }, { status: 400 })
    if (!body.sourceAuthor) return NextResponse.json({ error: "sourceAuthor obligatoriu" }, { status: 400 })

    // Dacă e referință bibliografică, nu cere rawText
    if (!body.bibliographicReference && !body.bibliographyMode && !body.rawText) {
      return NextResponse.json({ error: "rawText obligatoriu (sau setează bibliographicReference: true sau bibliographyMode: true)" }, { status: 400 })
    }

    const result = await ingestDocument({
      rawText: body.rawText,
      sourceTitle: body.sourceTitle,
      sourceAuthor: body.sourceAuthor,
      sourceType: body.sourceType || "carte",
      dryRun: body.dryRun === true,
      chunkSize: body.chunkSize,
      bibliographicReference: body.bibliographicReference === true,
      bibliographyMode: body.bibliographyMode === true,
      entriesPerReference: body.entriesPerReference,
      publisher: body.publisher,
      year: body.year,
      edition: body.edition,
      isbn: body.isbn,
      focusTopics: body.focusTopics,
      targetEntries: body.targetEntries,
      coverImageBase64: body.coverImageBase64,
      coverImageType: body.coverImageType,
    })

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: "Content-Type nesuportat" }, { status: 400 })
}

export async function GET() {
  return NextResponse.json({
    usage: {
      description: "Pâlnia de cunoaștere — ingestie documente în KB L2",
      endpoint: "POST /api/v1/kb/ingest",
      modes: {
        fileUpload: {
          contentType: "multipart/form-data",
          fields: {
            file: "PDF, DOCX, DOC, TXT (max 50MB)",
            sourceTitle: "Titlul sursei (obligatoriu)",
            sourceAuthor: "Autorul (obligatoriu)",
            sourceType: "carte | curs | articol | manual | politica",
            dryRun: "true = preview fără scriere în DB",
          },
        },
        rawText: {
          contentType: "application/json",
          body: {
            rawText: "Textul documentului (obligatoriu)",
            sourceTitle: "Titlul sursei",
            sourceAuthor: "Autorul",
            sourceType: "carte | curs | articol | manual | politica",
            dryRun: "boolean",
          },
        },
      },
      access: "Owner session sau x-internal-key header",
    },
  })
}
