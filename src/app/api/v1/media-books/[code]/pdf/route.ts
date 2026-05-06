/**
 * GET /api/v1/media-books/[code]/pdf
 *
 * Returneaza HTML print-ready pentru un Media Book.
 * Clientul poate face window.print() sau folosi html2pdf.js.
 *
 * Auth: sesiune NextAuth sau x-internal-key.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { MEDIA_BOOKS } from "@/lib/media-books"
import { generateMediaBookPDF } from "@/lib/media-books/pdf-generator"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const { code } = await params

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
    const pdf = await generateMediaBookPDF(code)

    return new NextResponse(pdf.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${code}.html"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[MEDIA-BOOK-PDF]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
