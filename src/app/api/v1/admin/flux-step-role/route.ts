import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/admin/flux-step-role
 *
 * Bulk upsert pentru maparea flux ↔ rol. Folosit pentru seed + actualizări.
 * Principiu 05.04.2026: metadata funcțională pură (fluxId, stepId, roleCode, raci).
 *
 * Upsert pe cheie unică (fluxId, stepId, roleCode, raci).
 */

const mappingSchema = z.object({
  fluxId: z.string().min(1),
  stepId: z.string().min(1),
  roleCode: z.string().min(1),
  raci: z.enum(["OWNER", "CONTRIBUTOR", "REVIEWER", "NOTIFIED"]),
  slaMinutes: z.number().int().positive().optional(),
  isCritical: z.boolean().optional().default(false),
  notes: z.string().optional(),
})

const schema = z.object({
  mappings: z.array(mappingSchema).min(1).max(500),
})

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const results = { upserted: 0, errors: [] as string[] }
  for (const m of parsed.data.mappings) {
    try {
      await prisma.fluxStepRole.upsert({
        where: {
          fluxId_stepId_roleCode_raci: {
            fluxId: m.fluxId,
            stepId: m.stepId,
            roleCode: m.roleCode,
            raci: m.raci,
          },
        },
        create: {
          fluxId: m.fluxId,
          stepId: m.stepId,
          roleCode: m.roleCode,
          raci: m.raci,
          slaMinutes: m.slaMinutes,
          isCritical: m.isCritical ?? false,
          notes: m.notes,
        },
        update: {
          slaMinutes: m.slaMinutes,
          isCritical: m.isCritical ?? false,
          notes: m.notes,
        },
      })
      results.upserted++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      results.errors.push(`${m.fluxId}:${m.stepId}:${m.roleCode}:${m.raci} → ${msg}`)
    }
  }

  return NextResponse.json(results)
}

/**
 * GET /api/v1/admin/flux-step-role?fluxId=...
 *
 * Listare mapări (pentru debug/audit).
 */
export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const url = new URL(req.url)
  const fluxId = url.searchParams.get("fluxId")
  const roleCode = url.searchParams.get("roleCode")

  const mappings = await prisma.fluxStepRole.findMany({
    where: {
      ...(fluxId && { fluxId }),
      ...(roleCode && { roleCode }),
    },
    orderBy: [{ fluxId: "asc" }, { stepId: "asc" }],
  })
  return NextResponse.json({ count: mappings.length, mappings })
}
