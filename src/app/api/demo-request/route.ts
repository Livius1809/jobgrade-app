import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

/**
 * POST /api/demo-request
 *
 * Endpoint PUBLIC (fără auth) pentru formularul de demo de pe landing page.
 * Creează un Lead intern via API-ul protejat.
 */

const schema = z.object({
  companyName: z.string().min(2).max(200),
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(20).optional(),
  companySize: z.string().optional(),
  industry: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  const apiKey = process.env.INTERNAL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "server_config_error" }, { status: 500 })
  }

  try {
    const base = `http://localhost:${process.env.PORT ?? 3001}`
    const res = await fetch(`${base}/api/v1/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": apiKey },
      body: JSON.stringify({
        ...input,
        source: "INBOUND_WEBSITE",
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: "lead_creation_failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Mulțumim! Vă vom contacta în cel mai scurt timp pentru a programa demo-ul.",
    })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
