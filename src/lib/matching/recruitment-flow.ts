/**
 * recruitment-flow.ts — 6-step recruitment state machine (B2C ↔ B2B bridge)
 *
 * Flow: MATCHED → NOTIFIED_B2C → B2C_INTERESTED → REPORTS_EXCHANGED
 *       → B2B_INVITED → IDENTITY_REVEALED → COMPLETED
 *
 * Data stored in SystemConfig as B2C_RECRUITMENT_{flowId} + index keys.
 * Anonymization preserved until step IDENTITY_REVEALED.
 */

import { prisma } from "@/lib/prisma"

// ── Types ──────────────────────────────────────────────────────────────────

export type RecruitmentStep =
  | "MATCHED"
  | "NOTIFIED_B2C"
  | "B2C_INTERESTED"
  | "REPORTS_EXCHANGED"
  | "B2B_INVITED"
  | "IDENTITY_REVEALED"
  | "COMPLETED"
  | "DECLINED_B2C"
  | "DECLINED_B2B"

export interface RecruitmentFlowState {
  id: string
  jobId: string
  candidateId: string
  candidateAlias: string
  companyId: string
  step: RecruitmentStep
  matchScore: number
  matchDetails: { criterion: string; score: number }[]
  b2cReport?: Record<string, unknown>
  b2bReport?: Record<string, unknown>
  b2bContactPhone?: string
  createdAt: string
  updatedAt: string
}

// ── Valid transitions ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, { actions: string[]; actor: ("B2C" | "B2B")[]; nextStep: RecruitmentStep }[]> = {
  MATCHED: [
    { actions: ["notify"], actor: ["B2B"], nextStep: "NOTIFIED_B2C" },
  ],
  NOTIFIED_B2C: [
    { actions: ["interested"], actor: ["B2C"], nextStep: "B2C_INTERESTED" },
    { actions: ["decline"], actor: ["B2C"], nextStep: "DECLINED_B2C" },
  ],
  B2C_INTERESTED: [
    { actions: ["send_report"], actor: ["B2B", "B2C"], nextStep: "REPORTS_EXCHANGED" },
    { actions: ["decline"], actor: ["B2B"], nextStep: "DECLINED_B2B" },
    { actions: ["decline"], actor: ["B2C"], nextStep: "DECLINED_B2C" },
  ],
  REPORTS_EXCHANGED: [
    { actions: ["invite"], actor: ["B2B"], nextStep: "B2B_INVITED" },
    { actions: ["decline"], actor: ["B2B"], nextStep: "DECLINED_B2B" },
    { actions: ["decline"], actor: ["B2C"], nextStep: "DECLINED_B2C" },
  ],
  B2B_INVITED: [
    { actions: ["reveal"], actor: ["B2C"], nextStep: "IDENTITY_REVEALED" },
    { actions: ["decline"], actor: ["B2C"], nextStep: "DECLINED_B2C" },
  ],
  IDENTITY_REVEALED: [
    { actions: ["complete"], actor: ["B2B", "B2C"], nextStep: "COMPLETED" },
    { actions: ["decline"], actor: ["B2B"], nextStep: "DECLINED_B2B" },
    { actions: ["decline"], actor: ["B2C"], nextStep: "DECLINED_B2C" },
  ],
}

// ── Persistence helpers ──────────────────────────────────────────────────────

function flowKey(flowId: string): string {
  return `B2C_RECRUITMENT_${flowId}`
}

export async function getFlow(flowId: string): Promise<RecruitmentFlowState | null> {
  const config = await prisma.systemConfig.findUnique({ where: { key: flowKey(flowId) } })
  if (!config) return null
  return JSON.parse(config.value) as RecruitmentFlowState
}

export async function saveFlow(flow: RecruitmentFlowState): Promise<void> {
  const value = JSON.stringify(flow)
  await prisma.systemConfig.upsert({
    where: { key: flowKey(flow.id) },
    update: { value },
    create: { key: flowKey(flow.id), value },
  })
}

/**
 * Creates a new recruitment flow at MATCHED step.
 */
export async function createRecruitmentFlow(params: {
  jobId: string
  candidateId: string
  candidateAlias: string
  companyId: string
  matchScore: number
  matchDetails: { criterion: string; score: number }[]
}): Promise<RecruitmentFlowState> {
  const id = `rf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()

  const flow: RecruitmentFlowState = {
    id,
    jobId: params.jobId,
    candidateId: params.candidateId,
    candidateAlias: params.candidateAlias,
    companyId: params.companyId,
    step: "MATCHED",
    matchScore: params.matchScore,
    matchDetails: params.matchDetails,
    createdAt: now,
    updatedAt: now,
  }

  await saveFlow(flow)

  // Also update index for listing
  await addToFlowIndex(flow)

  return flow
}

/**
 * Advances a recruitment flow to the next step based on action + actor.
 */
export async function advanceRecruitmentFlow(
  flowId: string,
  action: string,
  actor: "B2C" | "B2B",
  data?: Record<string, unknown>,
): Promise<RecruitmentFlowState> {
  const flow = await getFlow(flowId)
  if (!flow) {
    throw new Error(`Flow ${flowId} nu a fost gasit.`)
  }

  // Check if flow is in a terminal state
  if (flow.step === "COMPLETED" || flow.step === "DECLINED_B2C" || flow.step === "DECLINED_B2B") {
    throw new Error(`Fluxul este deja finalizat (${flow.step}).`)
  }

  // Find valid transition
  const transitions = VALID_TRANSITIONS[flow.step] || []
  const transition = transitions.find(
    (t) => t.actions.includes(action) && t.actor.includes(actor),
  )

  if (!transition) {
    throw new Error(
      `Acțiunea "${action}" de la "${actor}" nu este validă în pasul "${flow.step}".`,
    )
  }

  // Apply step-specific data
  if (action === "send_report" && data) {
    if (actor === "B2B" && data.b2bReport) flow.b2bReport = data.b2bReport as Record<string, unknown>
    if (actor === "B2C" && data.b2cReport) flow.b2cReport = data.b2cReport as Record<string, unknown>
    // Only advance to REPORTS_EXCHANGED if both reports exist
    if (!flow.b2bReport || !flow.b2cReport) {
      flow.updatedAt = new Date().toISOString()
      await saveFlow(flow)
      return flow
    }
  }

  if (action === "invite" && data?.phone) {
    flow.b2bContactPhone = data.phone as string
  }

  // Advance step
  flow.step = transition.nextStep
  flow.updatedAt = new Date().toISOString()

  await saveFlow(flow)
  await updateFlowIndex(flow)

  return flow
}

// ── Index management (for listing flows per candidate / company) ──────────

interface FlowIndex {
  flows: Array<{
    id: string
    jobId: string
    candidateId: string
    companyId: string
    step: RecruitmentStep
    matchScore: number
    updatedAt: string
  }>
}

async function getFlowIndex(): Promise<FlowIndex> {
  const config = await prisma.systemConfig.findUnique({ where: { key: "B2C_RECRUITMENT_INDEX" } })
  if (!config) return { flows: [] }
  return JSON.parse(config.value) as FlowIndex
}

async function saveFlowIndex(index: FlowIndex): Promise<void> {
  const value = JSON.stringify(index)
  await prisma.systemConfig.upsert({
    where: { key: "B2C_RECRUITMENT_INDEX" },
    update: { value },
    create: { key: "B2C_RECRUITMENT_INDEX", value },
  })
}

async function addToFlowIndex(flow: RecruitmentFlowState): Promise<void> {
  const index = await getFlowIndex()
  index.flows.push({
    id: flow.id,
    jobId: flow.jobId,
    candidateId: flow.candidateId,
    companyId: flow.companyId,
    step: flow.step,
    matchScore: flow.matchScore,
    updatedAt: flow.updatedAt,
  })
  // Keep max 1000 entries
  if (index.flows.length > 1000) {
    index.flows = index.flows.slice(-1000)
  }
  await saveFlowIndex(index)
}

async function updateFlowIndex(flow: RecruitmentFlowState): Promise<void> {
  const index = await getFlowIndex()
  const entry = index.flows.find((f) => f.id === flow.id)
  if (entry) {
    entry.step = flow.step
    entry.updatedAt = flow.updatedAt
  }
  await saveFlowIndex(index)
}

/**
 * Lists flows filtered by actor role.
 */
export async function listFlows(params: {
  candidateId?: string
  companyId?: string
  activeOnly?: boolean
}): Promise<RecruitmentFlowState[]> {
  const index = await getFlowIndex()
  const TERMINAL: RecruitmentStep[] = ["COMPLETED", "DECLINED_B2C", "DECLINED_B2B"]

  let filtered = index.flows
  if (params.candidateId) {
    filtered = filtered.filter((f) => f.candidateId === params.candidateId)
  }
  if (params.companyId) {
    filtered = filtered.filter((f) => f.companyId === params.companyId)
  }
  if (params.activeOnly) {
    filtered = filtered.filter((f) => !TERMINAL.includes(f.step))
  }

  // Sort by updatedAt desc
  filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  // Load full flow data for results (max 50)
  const results: RecruitmentFlowState[] = []
  for (const entry of filtered.slice(0, 50)) {
    const full = await getFlow(entry.id)
    if (full) results.push(full)
  }

  return results
}

/**
 * Check if a candidate-job pair already has an active flow.
 */
export async function hasActiveFlow(candidateId: string, jobId: string): Promise<boolean> {
  const index = await getFlowIndex()
  const TERMINAL: RecruitmentStep[] = ["COMPLETED", "DECLINED_B2C", "DECLINED_B2B"]
  return index.flows.some(
    (f) => f.candidateId === candidateId && f.jobId === jobId && !TERMINAL.includes(f.step),
  )
}
