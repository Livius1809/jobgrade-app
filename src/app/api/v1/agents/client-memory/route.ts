import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getClientProfile, recordClientMemory, formatClientProfileForPrompt } from "@/lib/agents/client-memory"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/client-memory?tenantId=xxx&format=prompt|full
 * Get client profile for injection into agent prompts.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const tenantId = url.searchParams.get("tenantId")
  const format = url.searchParams.get("format") || "full"

  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 })

  try {
    const profile = await getClientProfile(tenantId, prisma)

    if (format === "prompt") {
      return NextResponse.json({ prompt: formatClientProfileForPrompt(profile) })
    }

    return NextResponse.json(profile)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/v1/agents/client-memory
 * Record a client memory.
 * Body: { tenantId, category, content, source, importance?, tags?, expiresAt? }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { tenantId, category, content, source, importance, tags, expiresAt } = body

    if (!tenantId || !category || !content || !source) {
      return NextResponse.json({ error: "Required: tenantId, category, content, source" }, { status: 400 })
    }

    const id = await recordClientMemory(tenantId, category, content, source, prisma, {
      importance,
      tags,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })

    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
