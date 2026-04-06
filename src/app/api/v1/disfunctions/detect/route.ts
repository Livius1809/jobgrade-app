import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  DisfunctionClass,
  DisfunctionSeverity,
  DisfunctionTarget,
} from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/disfunctions/detect
 *
 * Înregistrează un eveniment de disfuncție detectat de un monitor/cron.
 *
 * Principiu (05.04.2026): strict funcțional. Zero conținut semantic.
 * Atingem DOAR canale / ritm / tranziții.
 */

const schema = z.object({
  class: z.enum(["D1_TECHNICAL", "D2_FUNCTIONAL_MGMT", "D3_BUSINESS_PROCESS"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().default("MEDIUM"),
  targetType: z.enum(["SERVICE", "WORKFLOW", "ROLE", "FLUX_STEP"]),
  targetId: z.string().min(1),
  detectorSource: z.string().min(1),
  signal: z.string().min(1),
  durationMs: z.number().int().nonnegative().optional(),
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
  const input = parsed.data

  // Dedup: cât timp există un eveniment OPEN pentru aceeași combinație
  // (targetType, targetId, signal), îl actualizăm în loc să creăm unul nou.
  // Fără fereastră de timp — un OPEN reprezintă același incident cât timp nu a
  // fost rezolvat. Dacă se rezolvă și reapare, statusul != OPEN și se creează
  // un eveniment nou legitim (recurență).
  //
  // Nota: fereastra anterioară de 60 min era egală cu intervalul detectorului,
  // ceea ce făcea ca runurile succesive să creeze duplicate (amplificare ~3.7x
  // observată în producție pe 05.04.2026).
  const existing = await prisma.disfunctionEvent.findFirst({
    where: {
      status: "OPEN",
      targetType: input.targetType as DisfunctionTarget,
      targetId: input.targetId,
      signal: input.signal,
    },
    orderBy: { detectedAt: "desc" },
  })

  if (existing) {
    const updated = await prisma.disfunctionEvent.update({
      where: { id: existing.id },
      data: {
        durationMs: input.durationMs ?? existing.durationMs,
        severity: input.severity as DisfunctionSeverity,
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({ event: updated, deduplicated: true })
  }

  const created = await prisma.disfunctionEvent.create({
    data: {
      class: input.class as DisfunctionClass,
      severity: input.severity as DisfunctionSeverity,
      targetType: input.targetType as DisfunctionTarget,
      targetId: input.targetId,
      detectorSource: input.detectorSource,
      signal: input.signal,
      durationMs: input.durationMs,
    },
  })

  return NextResponse.json({ event: created, deduplicated: false })
}
