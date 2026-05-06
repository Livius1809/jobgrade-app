/**
 * POST /api/v1/documents/analyze
 *
 * Analiză AI a documentelor organizaționale (pipeline C3).
 * Primește text extras din document, încarcă profilul companiei pentru context,
 * și returnează analiză structurată (teme, gap-uri, îmbunătățiri, aliniere MVV).
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { analyzeDocument } from "@/lib/engines/document-analysis-engine"

export const dynamic = "force-dynamic"

const schema = z.object({
  documentText: z.string().min(10, "Textul documentului trebuie să aibă minim 10 caractere."),
  documentType: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    // Încarcă profilul companiei pentru context organizațional
    const profile = await prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        mission: true,
        industry: true,
        values: true,
      },
    })

    const tenantContext = {
      mission: profile?.mission ?? undefined,
      values: profile?.values && profile.values.length > 0 ? profile.values : undefined,
      industry: profile?.industry ?? undefined,
    }

    const result = await analyzeDocument(
      data.documentText,
      tenantContext,
      "DOAS"
    )

    return NextResponse.json({
      ok: true,
      documentType: data.documentType ?? null,
      analysis: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Date invalide.", details: error.issues },
        { status: 400 }
      )
    }
    console.error("[DOCUMENTS ANALYZE]", error)
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 })
  }
}
