/**
 * escalation-chain.ts — Lanțul de escaladare ierarhică
 *
 * Când un manager nu poate rezolva un blocaj:
 *   Agent blocat → Manager direct → Manager superior → ... → COG → Owner
 *
 * Fiecare escalare are:
 * - Sursă (cine escaladează)
 * - Target (cui escaladează)
 * - About (despre cine/ce e blocajul)
 * - Prioritate
 * - Status tracking
 * - Timeout automat (dacă nu e rezolvat, urcă mai sus)
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type EscalationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type EscalationStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED_UP" | "TIMEOUT"

export interface Escalation {
  id: string
  sourceRole: string      // cine a escaladat
  targetRole: string      // cui i s-a escaladat
  aboutRole: string       // despre cine e blocajul
  reason: string
  details: string
  priority: EscalationPriority
  status: EscalationStatus
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  resolution?: string
  timeoutHours: number    // după câte ore urcă automat
  escalatedFromId?: string // dacă e escalare din altă escalare
}

export interface EscalationInput {
  sourceRole: string
  targetRole: string
  aboutRole: string
  reason: string
  details: string
  priority: EscalationPriority
  escalatedFromId?: string
}

// ── Lanțul ierarhic ───────────────────────────────────────────────────────────

export const ESCALATION_CHAIN: Record<string, string> = {
  // Operațional → Tactic
  EMA: "COA",
  QLA: "COA",
  CSSA: "COCSA",
  // Tactic → Strategic
  COA: "COG",
  // COCSA are 2 căi de escalare:
  // - Operațional → OWNER direct (Owner ține legătura cu COCSA pe operațiuni)
  // - "Nu știu, nu pot" → CPU → COG (pentru instrumente/capabilități noi)
  COCSA: "OWNER",
  PMA: "COA",
  // Strategic L4 → COG
  ACEA: "COG",
  // Strategic → Owner
  COG: "OWNER",
  CPU: "OWNER", // CPU (creierul) escaladează doar la Owner
  // Agenți fără subordonați — escaladează la managerul lor
  FDA: "EMA",
  BDA: "EMA",
  DEA: "EMA",
  MAA: "EMA",
  QAA: "QLA",
  SQA: "QLA",
  CSA: "CSSA",
  DPA: "COA",
  SA: "COA",
  CAA: "COA",
  COAFin: "COA",
  ISA: "COCSA",
  MOA: "COCSA",
  IRA: "COCSA",
  MDA: "COCSA",
  SOA: "COCSA",
  BCA: "COCSA",
  CDIA: "COCSA",
  MKA: "COCSA",
  ACA: "COCSA",
  CMA: "COCSA",
  CWA: "CMA",
  RDA: "PMA",
  DOA: "PMA",
  DOAS: "PMA",
  PPMO: "PMA",
  STA: "PMA",
  SOC: "PMA",
  // Independenți → COG
  CJA: "COG",
  CIA: "COG",
  CCIA: "COG",
  // Client-facing specializat
  MEDIATOR: "PMA",
  // Suport specializat → PMA
  HR_COUNSELOR: "PMA",
  PSYCHOLINGUIST: "PMA",
  PPA: "PMA",
  PSE: "PMA",
  PCM: "PMA",
  NSA: "PMA",
  SCA: "PMA",
  SVHA: "PMA",
  MGA: "PMA",
  SAFETY_MONITOR: "COG",
}

// ── Timeout per prioritate ────────────────────────────────────────────────────

const TIMEOUT_HOURS: Record<EscalationPriority, number> = {
  CRITICAL: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
}

// ── Creare escalare ──────────────────────────────────────────────────────────

export async function createEscalation(
  input: EscalationInput,
  prisma: any
): Promise<Escalation> {
  const now = new Date().toISOString()
  const timeoutHours = TIMEOUT_HOURS[input.priority]

  const escalation: Escalation = {
    id: `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    sourceRole: input.sourceRole,
    targetRole: input.targetRole,
    aboutRole: input.aboutRole,
    reason: input.reason,
    details: input.details,
    priority: input.priority,
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
    timeoutHours,
    escalatedFromId: input.escalatedFromId,
  }

  // Persistă
  await prisma.escalation.create({
    data: {
      externalId: escalation.id,
      sourceRole: escalation.sourceRole,
      targetRole: escalation.targetRole,
      aboutRole: escalation.aboutRole,
      reason: escalation.reason,
      details: escalation.details,
      priority: escalation.priority,
      status: escalation.status,
      timeoutHours: escalation.timeoutHours,
      escalatedFromId: escalation.escalatedFromId,
    },
  }).catch(() => {
    // Fallback: table might not exist yet
    console.log(
      `   🚨 ESCALARE [${escalation.id}]: ${escalation.sourceRole} → ${escalation.targetRole} ` +
        `despre ${escalation.aboutRole}: ${escalation.reason} (${escalation.priority})`
    )
  })

  return escalation
}

// ── Rezolvare escalare ────────────────────────────────────────────────────────

export async function resolveEscalation(
  escalationId: string,
  resolution: string,
  prisma: any
): Promise<void> {
  await prisma.escalation.updateMany({
    where: { externalId: escalationId },
    data: {
      status: "RESOLVED",
      resolution,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    },
  }).catch(() => {
    console.log(`   ✅ ESCALARE REZOLVATĂ [${escalationId}]: ${resolution}`)
  })
}

// ── Escalare mai sus (timeout) ────────────────────────────────────────────────

export async function escalateUp(
  escalationId: string,
  currentTarget: string,
  prisma: any
): Promise<Escalation | null> {
  const nextTarget = ESCALATION_CHAIN[currentTarget]
  if (!nextTarget || nextTarget === "OWNER") {
    // Am ajuns la Owner — marchează pentru atenția umană
    await prisma.escalation.updateMany({
      where: { externalId: escalationId },
      data: {
        status: "TIMEOUT",
        targetRole: "OWNER",
        updatedAt: new Date(),
      },
    }).catch(() => {
      console.log(`   🔴 ESCALARE TIMEOUT → OWNER [${escalationId}]`)
    })
    return null
  }

  // Marchează escalarea curentă
  await prisma.escalation.updateMany({
    where: { externalId: escalationId },
    data: {
      status: "ESCALATED_UP",
      updatedAt: new Date(),
    },
  }).catch(() => {})

  // Citește datele escalării originale
  const original = await prisma.escalation.findFirst({
    where: { externalId: escalationId },
  }).catch(() => null)

  if (!original) return null

  // Creează escalare nouă la nivel superior
  return createEscalation(
    {
      sourceRole: currentTarget,
      targetRole: nextTarget,
      aboutRole: original.aboutRole,
      reason: `[ESCALAT de la ${currentTarget}] ${original.reason}`,
      details: original.details,
      priority: original.priority,
      escalatedFromId: escalationId,
    },
    prisma
  )
}

// ── Escalări active per manager ───────────────────────────────────────────────

export async function getActiveEscalations(
  managerRole: string,
  prisma: any
): Promise<Escalation[]> {
  const rows = await prisma.escalation.findMany({
    where: {
      OR: [
        { sourceRole: managerRole, status: { in: ["OPEN", "IN_PROGRESS"] } },
        { targetRole: managerRole, status: { in: ["OPEN", "IN_PROGRESS"] } },
      ],
    },
    orderBy: { createdAt: "desc" },
  }).catch(() => [])

  return rows.map((r: any) => ({
    id: r.externalId || r.id,
    sourceRole: r.sourceRole,
    targetRole: r.targetRole,
    aboutRole: r.aboutRole,
    reason: r.reason,
    details: r.details,
    priority: r.priority,
    status: r.status,
    createdAt: r.createdAt?.toISOString?.() || r.createdAt,
    updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt,
    resolvedAt: r.resolvedAt?.toISOString?.() || r.resolvedAt,
    resolution: r.resolution,
    timeoutHours: r.timeoutHours,
    escalatedFromId: r.escalatedFromId,
  }))
}

// ── Verificare timeout-uri ────────────────────────────────────────────────────

export async function processTimeouts(prisma: any): Promise<number> {
  const now = Date.now()
  let escalated = 0

  const openEscalations = await prisma.escalation.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  }).catch(() => [])

  for (const esc of openEscalations) {
    const createdAt = new Date(esc.createdAt).getTime()
    const timeoutMs = (esc.timeoutHours || 24) * 60 * 60 * 1000

    if (now - createdAt > timeoutMs) {
      const result = await escalateUp(esc.externalId || esc.id, esc.targetRole, prisma)
      if (result) escalated++
    }
  }

  if (escalated > 0) {
    console.log(`   ⏰ ${escalated} escalări timeout — escaladate mai sus`)
  }

  return escalated
}

// ── Sumar escalări pentru Owner dashboard ─────────────────────────────────────

export async function getEscalationSummary(prisma: any): Promise<{
  total: number
  open: number
  resolved: number
  timedOut: number
  byPriority: Record<string, number>
  ownerAttention: number
}> {
  const all = await prisma.escalation.findMany().catch(() => [])

  const open = all.filter((e: any) => ["OPEN", "IN_PROGRESS"].includes(e.status)).length
  const resolved = all.filter((e: any) => e.status === "RESOLVED").length
  const timedOut = all.filter((e: any) => e.status === "TIMEOUT").length
  const ownerAttention = all.filter(
    (e: any) => e.targetRole === "OWNER" && ["OPEN", "TIMEOUT"].includes(e.status)
  ).length

  const byPriority: Record<string, number> = {}
  for (const e of all.filter((e: any) => ["OPEN", "IN_PROGRESS"].includes(e.status))) {
    byPriority[e.priority] = (byPriority[e.priority] || 0) + 1
  }

  return {
    total: all.length,
    open,
    resolved,
    timedOut,
    byPriority,
    ownerAttention,
  }
}
