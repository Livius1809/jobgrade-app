import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/disfunctions/{id}/related
 *
 * Dat fiind un disfunction event, returnează entitățile "legate" funcțional:
 *  - Dacă targetType=ROLE: toate fluxurile care au pași atribuiți rolului (din FluxStepRole)
 *  - Dacă targetType=FLUX_STEP: rolul proprietar + managerul acestuia (lanț escaladare)
 *  - Dacă targetType=WORKFLOW: dacă e un FLUX_XXX, returnăm rolurile implicate
 *  - Dacă targetType=SERVICE: N/A (nu e legat de organigramă), returnăm lista goală
 *
 * Principiu canonic: răspunsul conține DOAR metadata funcțională (coduri roluri,
 * id-uri fluxuri, pași, RACI). Zero conținut semantic.
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params

  const event = await prisma.disfunctionEvent.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 })
  }

  const result: {
    event: typeof event
    affectedFluxes: Array<{
      fluxId: string
      steps: Array<{ stepId: string; raci: string; isCritical: boolean; slaMinutes: number | null }>
    }>
    ownerRole: string | null
    escalationChain: string[]
    note: string | null
  } = {
    event,
    affectedFluxes: [],
    ownerRole: null,
    escalationChain: [],
    note: null,
  }

  // Case 1: ROLE — găsim fluxurile afectate
  if (event.targetType === "ROLE") {
    const mappings = await prisma.fluxStepRole.findMany({
      where: { roleCode: event.targetId },
      orderBy: [{ fluxId: "asc" }, { stepId: "asc" }],
    })

    // Grupăm pe fluxId
    const byFlux = new Map<string, typeof result.affectedFluxes[number]["steps"]>()
    for (const m of mappings) {
      if (!byFlux.has(m.fluxId)) byFlux.set(m.fluxId, [])
      byFlux.get(m.fluxId)!.push({
        stepId: m.stepId,
        raci: m.raci,
        isCritical: m.isCritical,
        slaMinutes: m.slaMinutes,
      })
    }
    result.affectedFluxes = Array.from(byFlux.entries()).map(([fluxId, steps]) => ({
      fluxId,
      steps,
    }))

    // Lanț escaladare — urmărim AgentRelationship (REPORTS_TO) în sus
    result.escalationChain = await buildEscalationChain(event.targetId)

    if (mappings.length === 0) {
      result.note = "no_flux_mappings_yet_role_not_seeded"
    }
  }

  // Case 2: FLUX_STEP — găsim rolul proprietar și lanțul de escaladare
  if (event.targetType === "FLUX_STEP") {
    // Convenție targetId: "FLUX-XXX:stepId" sau doar "FLUX-XXX" pentru pas unic
    const [fluxId, stepId] = event.targetId.split(":")
    const owners = await prisma.fluxStepRole.findMany({
      where: {
        fluxId,
        ...(stepId && { stepId }),
        raci: "OWNER",
      },
    })
    if (owners.length > 0) {
      const ownerRole = owners[0].roleCode
      result.ownerRole = ownerRole
      result.escalationChain = await buildEscalationChain(ownerRole)
    } else {
      result.note = "no_owner_found_for_flux_step"
    }
  }

  // Case 3: WORKFLOW (FLUX-XXX) — dacă e flux business, listăm rolurile
  if (event.targetType === "WORKFLOW") {
    const mappings = await prisma.fluxStepRole.findMany({
      where: { fluxId: event.targetId },
      orderBy: [{ stepId: "asc" }],
    })
    if (mappings.length > 0) {
      const steps = mappings.map((m) => ({
        stepId: m.stepId,
        raci: m.raci,
        isCritical: m.isCritical,
        slaMinutes: m.slaMinutes,
      }))
      result.affectedFluxes = [{ fluxId: event.targetId, steps }]
    } else {
      result.note = "no_step_mappings_for_workflow"
    }
  }

  // Case 4: SERVICE — nu e legat de organigramă
  if (event.targetType === "SERVICE") {
    result.note = "service_targets_not_linked_to_organigrama"
  }

  return NextResponse.json(result)
}

/**
 * Construiește lanțul de escaladare pornind de la un rol, urmărind
 * AgentRelationship REPORTS_TO în sus până la vârf.
 * Oprire la 10 niveluri (protecție bucle).
 */
async function buildEscalationChain(startRole: string): Promise<string[]> {
  const chain: string[] = []
  let current = startRole
  const visited = new Set<string>()

  for (let i = 0; i < 10; i++) {
    if (visited.has(current)) break // protecție cicluri
    visited.add(current)

    const parentRel = await prisma.agentRelationship.findFirst({
      where: {
        childRole: current,
        relationType: "REPORTS_TO",
        isActive: true,
      },
      select: { parentRole: true },
    })

    if (!parentRel) break
    chain.push(parentRel.parentRole)
    current = parentRel.parentRole
  }

  return chain
}
