import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { RemediationLevel } from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/disfunctions/remediate
 *
 * Înregistrează o tentativă de remediere pentru un eveniment de disfuncție.
 *
 * Principiu: auto-remediere DOAR la Nivel 1 (AUTO) — idempotent, reversibil.
 * Nivel 2 (AGENT) = agent responsabil preia sarcina.
 * Nivel 3 (OWNER) = escaladare la Owner.
 *
 * Acest endpoint NU execută acțiunea — doar marchează intenția/rezultatul.
 * Execuția e responsabilitatea monitor-ului care apelează (restart container,
 * re-trigger workflow n8n, notify agent etc.).
 */

const schema = z.object({
  eventId: z.string().min(1),
  level: z.enum(["AUTO", "AGENT", "OWNER"]),
  action: z.string().min(1), // etichetă: "restart", "retry", "re-trigger", "notify", "escalate"
  ok: z.boolean(),
  resolvedBy: z.string().optional(), // "auto", "SA", "COG", "owner"
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

  const event = await prisma.disfunctionEvent.findUnique({
    where: { id: input.eventId },
  })
  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 })
  }

  // Tranziție status: REMEDIATING → RESOLVED (ok) | OPEN (fail) | ESCALATED (Nivel 3)
  const nextStatus =
    input.level === "OWNER"
      ? "ESCALATED"
      : input.ok
        ? "RESOLVED"
        : "OPEN"

  const updated = await prisma.disfunctionEvent.update({
    where: { id: event.id },
    data: {
      status: nextStatus,
      remediationLevel: input.level as RemediationLevel,
      remediationAction: input.action,
      remediationAt: new Date(),
      remediationOk: input.ok,
      resolvedAt: input.ok && input.level !== "OWNER" ? new Date() : null,
      resolvedBy: input.ok && input.level !== "OWNER" ? (input.resolvedBy ?? "auto") : null,
    },
  })

  return NextResponse.json({ event: updated })
}
