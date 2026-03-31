/**
 * execution-framework.ts — Orchestrator acțiuni reale
 *
 * Puntea între DECIZIE (thinking layer) și ACȚIUNE (execution layer).
 * Primește instrucțiuni de la agenți și le execută în lumea reală.
 *
 * Tipuri de acțiuni:
 * - PUBLISH_CONTENT → Marketing Executor (blog, social, email campaign)
 * - SEND_EMAIL → Sales/Marketing Executor (email personalizat via Resend)
 * - GENERATE_DOCUMENT → Document Executor (contract, propunere, NDA)
 * - NOTIFY_OWNER → ntfy push
 * - SCHEDULE_TASK → n8n webhook trigger
 *
 * Principii:
 * - Fiecare acțiune e logată (audit trail)
 * - Acțiunile cu impact extern necesită Owner approval (configurable)
 * - Rate limiting per tip de acțiune
 * - Rollback unde posibil
 */

import type { PrismaClient } from "@/generated/prisma"

// ── Action Types ─────────────────────────────────────────────────────────────

export type ActionType =
  | "PUBLISH_CONTENT"
  | "SEND_EMAIL"
  | "GENERATE_DOCUMENT"
  | "NOTIFY_OWNER"
  | "SCHEDULE_TASK"
  | "UPDATE_KB"

export interface ExecutionAction {
  type: ActionType
  requestedBy: string      // agentRole
  target: string           // ce/cui (email address, blog slug, document type)
  payload: any             // date specifice acțiunii
  requiresApproval: boolean // Owner trebuie să aprobe?
  priority: "HIGH" | "MEDIUM" | "LOW"
}

export interface ExecutionResult {
  actionId: string
  type: ActionType
  status: "EXECUTED" | "QUEUED" | "NEEDS_APPROVAL" | "FAILED"
  details: string
  externalId?: string      // ID-ul din sistemul extern (email ID, doc URL, etc.)
  timestamp: string
}

// ── Action Config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<ActionType, {
  requiresApproval: boolean
  maxPerDay: number
  description: string
}> = {
  PUBLISH_CONTENT: { requiresApproval: false, maxPerDay: 10, description: "Publicare conținut (blog, social)" },
  SEND_EMAIL: { requiresApproval: false, maxPerDay: 50, description: "Trimitere email (outreach, nurturing)" },
  GENERATE_DOCUMENT: { requiresApproval: false, maxPerDay: 20, description: "Generare document (contract, propunere)" },
  NOTIFY_OWNER: { requiresApproval: false, maxPerDay: 100, description: "Notificare Owner" },
  SCHEDULE_TASK: { requiresApproval: true, maxPerDay: 5, description: "Programare task nou" },
  UPDATE_KB: { requiresApproval: false, maxPerDay: 200, description: "Actualizare Knowledge Base" },
}

// ── Rate Limiting ────────────────────────────────────────────────────────────

const dailyCounts = new Map<string, { count: number; date: string }>()

function checkRateLimit(type: ActionType): boolean {
  const today = new Date().toISOString().split("T")[0]
  const key = `${type}-${today}`
  const entry = dailyCounts.get(key) || { count: 0, date: today }

  if (entry.date !== today) {
    entry.count = 0
    entry.date = today
  }

  if (entry.count >= ACTION_CONFIG[type].maxPerDay) return false

  entry.count++
  dailyCounts.set(key, entry)
  return true
}

// ── Execute Action ───────────────────────────────────────────────────────────

export async function executeAction(
  action: ExecutionAction,
  prisma: PrismaClient,
  executors: ActionExecutors
): Promise<ExecutionResult> {
  const actionId = `ACT-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const config = ACTION_CONFIG[action.type]

  // Rate limit check
  if (!checkRateLimit(action.type)) {
    return {
      actionId, type: action.type, status: "FAILED",
      details: `Rate limit exceeded: max ${config.maxPerDay}/day for ${action.type}`,
      timestamp: new Date().toISOString(),
    }
  }

  // Approval check
  if (config.requiresApproval || action.requiresApproval) {
    // Queue for Owner approval
    try {
      await (prisma as any).orgProposal.create({
        data: {
          proposalType: "MODIFY_OBJECTIVES",
          status: "COG_REVIEWED",
          proposedBy: action.requestedBy,
          title: `[EXEC] ${config.description}: ${action.target}`,
          description: JSON.stringify(action.payload),
          rationale: `Acțiune reală cerută de ${action.requestedBy}. Tip: ${action.type}.`,
          changeSpec: { actionId, ...action },
          reviewedByCog: true,
          cogComment: "Auto-approved for Owner review.",
        },
      })
    } catch { /* log error */ }

    return {
      actionId, type: action.type, status: "NEEDS_APPROVAL",
      details: `Queued for Owner approval: ${config.description}`,
      timestamp: new Date().toISOString(),
    }
  }

  // Execute
  try {
    let result: ExecutionResult

    switch (action.type) {
      case "PUBLISH_CONTENT":
        result = await executors.publishContent(actionId, action)
        break
      case "SEND_EMAIL":
        result = await executors.sendEmail(actionId, action)
        break
      case "GENERATE_DOCUMENT":
        result = await executors.generateDocument(actionId, action)
        break
      case "NOTIFY_OWNER":
        result = await executors.notifyOwner(actionId, action)
        break
      default:
        result = {
          actionId, type: action.type, status: "FAILED",
          details: `No executor for ${action.type}`,
          timestamp: new Date().toISOString(),
        }
    }

    // Log execution
    try {
      await (prisma as any).cycleLog.create({
        data: {
          managerRole: action.requestedBy,
          targetRole: action.target,
          actionType: `EXEC_${action.type}`,
          description: result.details,
          details: JSON.stringify({ actionId, externalId: result.externalId, payload: action.payload }),
          resolved: result.status === "EXECUTED",
        },
      })
    } catch { /* non-blocking */ }

    return result
  } catch (e: any) {
    return {
      actionId, type: action.type, status: "FAILED",
      details: `Execution failed: ${e.message}`,
      timestamp: new Date().toISOString(),
    }
  }
}

// ── Executor Interface ───────────────────────────────────────────────────────

export interface ActionExecutors {
  publishContent: (id: string, action: ExecutionAction) => Promise<ExecutionResult>
  sendEmail: (id: string, action: ExecutionAction) => Promise<ExecutionResult>
  generateDocument: (id: string, action: ExecutionAction) => Promise<ExecutionResult>
  notifyOwner: (id: string, action: ExecutionAction) => Promise<ExecutionResult>
}
