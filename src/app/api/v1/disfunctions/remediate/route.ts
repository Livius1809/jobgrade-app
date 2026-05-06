import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { RemediationLevel } from "@/generated/prisma"
import { remediateEvent, isAutoRemediable } from "@/lib/agents/remediation-runner"

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

  // D1 AUTO: executare efectivă a remedierii prin remediation-runner
  let executionResult: { outcome: string; details: string } | null = null
  if (input.level === "AUTO" && isAutoRemediable(event.targetType, event.signal)) {
    try {
      const attempt = await remediateEvent(event.id)
      if (attempt) {
        executionResult = { outcome: attempt.outcome, details: attempt.details }
        // Update event with execution result if runner changed status
        if (attempt.outcome === "SUCCESS") {
          await prisma.disfunctionEvent.update({
            where: { id: event.id },
            data: {
              status: "RESOLVED",
              remediationOk: true,
              resolvedAt: new Date(),
              resolvedBy: "auto",
            },
          }).catch(() => {})
        }
      }
    } catch (err) {
      console.warn(`[remediate] Auto-execution error: ${err instanceof Error ? err.message : "unknown"}`)
      executionResult = { outcome: "FAILED", details: err instanceof Error ? err.message : "unknown error" }
    }
  }

  // Sincronizare cu tabela escalations: când un eveniment trece la ESCALATED,
  // creează automat înregistrare în escalations (single source of truth)
  if (nextStatus === "ESCALATED") {
    try {
      const externalId = `disfunction:${event.id}`
      const existing = await prisma.escalation.findUnique({
        where: { externalId },
      }).catch(() => null)

      if (!existing) {
        const aboutRole = event.targetType === "ROLE" ? event.targetId : event.targetId
        await prisma.escalation.create({
          data: {
            externalId,
            sourceRole: event.targetType === "ROLE" ? event.targetId : "SYSTEM",
            targetRole: "OWNER",
            aboutRole,
            reason: `Disfuncție escaladată: ${event.signal} (${event.severity})`,
            details: `Eveniment ${event.id}: ${event.targetType}=${event.targetId}, detectat la ${event.detectedAt.toISOString()}`,
            priority: event.severity,
            status: "OPEN",
            timeoutHours: 24,
          },
        }).catch((err) => {
          console.warn(`[remediate] Failed to create escalation record: ${err.message}`)
        })
      }
    } catch (err) {
      // Non-blocking — escaladarea principală a reușit, doar sincronizarea a eșuat
      console.warn(`[remediate] Escalation sync error: ${err instanceof Error ? err.message : "unknown"}`)
    }
  }

  return NextResponse.json({ event: updated, ...(executionResult ? { execution: executionResult } : {}) })
}
