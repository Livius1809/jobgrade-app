/**
 * POST /api/v1/media-books/pipeline
 *
 * Trigger pipeline de generare asset-uri pentru un Media Book.
 * Body: { code: string, audio?: boolean, video?: boolean, pdf?: boolean }
 *
 * Auth: sesiune NextAuth sau x-internal-key.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { MEDIA_BOOKS } from "@/lib/media-books"
import { runMediaBookPipeline } from "@/lib/media-books/pipeline"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { code, audio, video, pdf } = body as {
    code?: string
    audio?: boolean
    video?: boolean
    pdf?: boolean
  }

  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { error: "Parametru obligatoriu: code (ex: MB-R1)" },
      { status: 400 }
    )
  }

  const exists = MEDIA_BOOKS.some((mb) => mb.code === code)
  if (!exists) {
    return NextResponse.json(
      {
        error: `Media Book "${code}" nu exista`,
        available: MEDIA_BOOKS.map((mb) => mb.code),
      },
      { status: 404 }
    )
  }

  try {
    const result = await runMediaBookPipeline(code, {
      generateAudio: audio === true,
      generateVideo: video === true,
      generatePdf: pdf !== false, // default true
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[MEDIA-BOOK-PIPELINE]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
