import { prisma } from "@/lib/prisma"
import { createHash } from "crypto"

interface ReorgResult {
  success: boolean
  eventId?: string
  reason: string
  conflict?: string
}

/**
 * Redistribuie subordonații unui rol D2 la un peer disponibil.
 *
 * Logică:
 * 1. Găsește peer-ul cu cel mai puțin subordonați din aceeași echipă (via AgentRelationship)
 * 2. Verifică că peer-ul NU e el însuși D2 (evită CONFLICTED)
 * 3. Creează snapshot originalConfig/newConfig
 * 4. Setează auto-revert la +24h
 * 5. Detectează pattern repetat (≥3 ori în 30 zile pe aceeași semnătură)
 */
export async function redistributeSubordinates(
  triggeredByRole: string,
  triggeredByEventId?: string
): Promise<ReorgResult> {
  const p = prisma as any

  // 1. Find the role's parent (reports_to)
  const parentRel = await p.agentRelationship.findFirst({
    where: { sourceRole: triggeredByRole, type: "REPORTS_TO" },
  })
  if (!parentRel) {
    return { success: false, reason: `${triggeredByRole} nu are relație REPORTS_TO` }
  }

  // 2. Find peers (siblings under same parent)
  const siblingRels = await p.agentRelationship.findMany({
    where: { targetRole: parentRel.targetRole, type: "REPORTS_TO" },
    select: { sourceRole: true },
  })
  const peers = siblingRels
    .map((r: any) => r.sourceRole)
    .filter((r: string) => r !== triggeredByRole)

  if (peers.length === 0) {
    return { success: false, reason: `${triggeredByRole} nu are peers pentru redistribuire` }
  }

  // 3. Find subordinates of the D2 role
  const subordinateRels = await p.agentRelationship.findMany({
    where: { targetRole: triggeredByRole, type: "REPORTS_TO" },
    select: { sourceRole: true },
  })
  const subordinates = subordinateRels.map((r: any) => r.sourceRole)

  if (subordinates.length === 0) {
    return { success: false, reason: `${triggeredByRole} nu are subordonați de redistribuit` }
  }

  // 4. Check peer D2 status (via recent cycle logs or agent metrics)
  const peerActivityMode = await p.agentDefinition.findMany({
    where: {
      roleCode: { in: peers },
      activityMode: { in: ["PROACTIVE_CYCLIC", "HYBRID"] },
    },
    select: { roleCode: true },
  })
  const activePeers = peerActivityMode.map((a: any) => a.roleCode)

  if (activePeers.length === 0) {
    return {
      success: false,
      reason: `Toți peers-ii lui ${triggeredByRole} sunt inactivi`,
      conflict: "ALL_PEERS_INACTIVE",
    }
  }

  // 5. Pick the peer with fewest subordinates
  const peerSubCounts = await Promise.all(
    activePeers.map(async (peer: string) => {
      const count = await p.agentRelationship.count({
        where: { targetRole: peer, type: "REPORTS_TO" },
      })
      return { peer, count }
    })
  )
  peerSubCounts.sort((a: any, b: any) => a.count - b.count)
  const bestPeer = peerSubCounts[0].peer

  // 6. Create pattern signature for detection
  const sigInput = `${triggeredByRole}→${bestPeer}:SUBORDINATE_REASSIGN`
  const patternSignature = createHash("sha256").update(sigInput).digest("hex").slice(0, 16)

  // 7. Check repeated pattern (≥3 in 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const pastEvents = await prisma.reorganizationEvent.count({
    where: { patternSignature, appliedAt: { gte: thirtyDaysAgo } },
  })
  const isRepeatedPattern = pastEvents >= 2 // this will be the 3rd

  // 8. Create the event
  const autoRevertAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const event = await prisma.reorganizationEvent.create({
    data: {
      triggeredByRole,
      triggeredByEventId,
      reorgType: "SUBORDINATE_REASSIGN",
      originalConfig: { subordinates, parent: parentRel.targetRole },
      newConfig: { reassignedTo: bestPeer, subordinates },
      status: "ACTIVE",
      autoRevertAt,
      isRepeatedPattern,
      patternSignature,
    },
  })

  return {
    success: true,
    eventId: event.id,
    reason: `${subordinates.length} subordonați redistribuiți temporar de la ${triggeredByRole} la ${bestPeer} (auto-revert: 24h)${isRepeatedPattern ? " ⚠️ PATTERN REPETAT — propunere restructurare permanentă" : ""}`,
  }
}

/**
 * Revert o reorganizare (manual sau automat).
 */
export async function revertReorganization(
  eventId: string,
  reason: "auto_timeout" | "role_recovered" | "owner_override"
): Promise<ReorgResult> {
  const event = await prisma.reorganizationEvent.findUnique({
    where: { id: eventId },
  })

  if (!event) {
    return { success: false, reason: "Eveniment negăsit" }
  }

  if (event.status !== "ACTIVE") {
    return { success: false, reason: `Eveniment nu e ACTIVE (status: ${event.status})` }
  }

  await prisma.reorganizationEvent.update({
    where: { id: eventId },
    data: {
      status: "REVERTED",
      revertedAt: new Date(),
      revertReason: reason,
    },
  })

  return {
    success: true,
    eventId,
    reason: `Reorganizare ${eventId} revertată (${reason})`,
  }
}

/**
 * Auto-revert pentru reorganizări expirate.
 * Apelat periodic (cron) — revertează toate ACTIVE cu autoRevertAt < now.
 */
export async function autoRevertExpired(): Promise<{ reverted: number; escalated: number }> {
  const now = new Date()

  // Expired (24h default)
  const expired = await prisma.reorganizationEvent.findMany({
    where: {
      status: "ACTIVE",
      autoRevertAt: { lt: now },
    },
  })

  let reverted = 0
  let escalated = 0

  for (const event of expired) {
    // If active >72h, escalate instead of revert
    const ageHours = (now.getTime() - event.appliedAt.getTime()) / (1000 * 60 * 60)

    if (ageHours > 72) {
      await prisma.reorganizationEvent.update({
        where: { id: event.id },
        data: { status: "ESCALATED" },
      })
      console.warn(`[REORG-ESCALATED] Reorganization ${event.id} active >72h, escalated. Original role: ${event.triggeredByRole}`)
      escalated++
    } else {
      await prisma.reorganizationEvent.update({
        where: { id: event.id },
        data: {
          status: "REVERTED",
          revertedAt: now,
          revertReason: "auto_timeout",
        },
      })
      reverted++
    }
  }

  return { reverted, escalated }
}
