/**
 * Calea 1 — Task Delegation Engine
 *
 * Transformă INTERVENE actions din proactive loop în task-uri concrete
 * pentru agenți executor (DORMANT_UNTIL_DELEGATED).
 *
 * Funcție pură: primește evaluarea managerului, returnează task-uri de creat.
 * I/O (Prisma) doar în endpoint, nu aici.
 *
 * Livrat: 06.04.2026
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type TaskType =
  | "KB_RESEARCH"
  | "KB_VALIDATION"
  | "DATA_ANALYSIS"
  | "CONTENT_CREATION"
  | "PROCESS_EXECUTION"
  | "REVIEW"
  | "INVESTIGATION"
  | "OUTREACH"

export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"

export interface InterventionAction {
  target: string          // agentRole executor
  type: "INTERVENE"
  description: string     // ce a decis managerul
  details?: string
  priority?: string       // din evaluare
}

export interface DelegatedTask {
  assignedTo: string
  title: string
  description: string
  taskType: TaskType
  priority: TaskPriority
  tags: string[]
  estimatedMinutes: number | null
  deadlineHours: number | null
}

// ── Mapare INTERVENE → TaskType ──────────────────────────────────────────────

const ROLE_DEFAULT_TASK_TYPE: Record<string, TaskType> = {
  // Execuție operațională
  ACA: "PROCESS_EXECUTION",      // Agent Configurare Aplicație
  BCA: "PROCESS_EXECUTION",      // Business Config Agent
  BDA: "DATA_ANALYSIS",          // Business Data Analyst
  DEA: "DATA_ANALYSIS",          // Data Engineering Agent
  FDA: "DATA_ANALYSIS",          // Financial Data Analyst
  MAA: "DATA_ANALYSIS",          // Market Analysis Agent
  MKA: "CONTENT_CREATION",       // Marketing Agent
  PPA: "PROCESS_EXECUTION",      // Payment Processing Agent
  QAA: "REVIEW",                 // Quality Assurance Agent
  SQA: "REVIEW",                 // Security & Quality Agent
  TDA: "DATA_ANALYSIS",          // Training Data Agent
  IRA: "INVESTIGATION",          // Incident Response Agent
  MOA: "INVESTIGATION",          // Monitoring Agent
  // Suport
  RDA: "KB_RESEARCH",            // Research & Documentation Agent
  CDA: "CONTENT_CREATION",       // Content Development Agent
  // Vânzări
  LGA: "OUTREACH",               // Lead Generation Agent
  CMA: "OUTREACH",               // Client Management Agent
  CWA: "CONTENT_CREATION",       // Content Writing Agent
}

const PRIORITY_MAP: Record<string, TaskPriority> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
}

const PRIORITY_DEADLINES: Record<TaskPriority, number> = {
  CRITICAL: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
}

// ── Parsare descriere → task structurat ──────────────────────────────────────

function inferTaskType(role: string, description: string): TaskType {
  const desc = description.toLowerCase()

  // ═══ PRINCIPIU: ȘTIU vs FAC ═══
  // KB_RESEARCH/KB_VALIDATION = "ce știi?" → KB poate rezolva singur
  // Restul = "fă ceva" → KB e context, nu răspuns
  //
  // Atenție: "verificare", "audit", "validare", "raport" sunt ACȚIUNI,
  // nu cereri de cunoaștere. Agentul trebuie să FACĂ, nu să RECITE.

  // Acțiuni concrete (FAC) — prioritare
  if (desc.includes("scrie") || desc.includes("redactare") || desc.includes("creare conținut") || desc.includes("generare")) return "CONTENT_CREATION"
  if (desc.includes("testare") || desc.includes("test ") || desc.includes("smoke") || desc.includes("e2e")) return "REVIEW"
  if (desc.includes("verifică") || desc.includes("verificare") || desc.includes("audit") || desc.includes("review")) return "REVIEW"
  if (desc.includes("investigare") || desc.includes("incident") || desc.includes("diagnoz") || desc.includes("cercetare cauze")) return "INVESTIGATION"
  if (desc.includes("contact") || desc.includes("outreach") || desc.includes("email") || desc.includes("trimite")) return "OUTREACH"
  if (desc.includes("execut") || desc.includes("implementare") || desc.includes("configurare") || desc.includes("setup")) return "PROCESS_EXECUTION"
  if (desc.includes("raport") || desc.includes("analiză") || desc.includes("analiz") || desc.includes("calcul")) return "DATA_ANALYSIS"

  // Cunoaștere (ȘTIU) — doar cereri explicite de informație
  if (desc.includes("ce știm despre") || desc.includes("documentare") || desc.includes("research") || desc.includes("adună informații")) return "KB_RESEARCH"
  if (desc.includes("validare kb") || desc.includes("validare cunoștin") || desc.includes("e corect ce știm")) return "KB_VALIDATION"

  // Default pe rol
  return ROLE_DEFAULT_TASK_TYPE[role] ?? "PROCESS_EXECUTION"
}

function inferPriority(priority?: string, description?: string): TaskPriority {
  if (priority && PRIORITY_MAP[priority]) return PRIORITY_MAP[priority]

  const desc = (description ?? "").toLowerCase()
  if (desc.includes("urgent") || desc.includes("critic") || desc.includes("imediat")) return "CRITICAL"
  if (desc.includes("prioritar") || desc.includes("important")) return "HIGH"

  return "MEDIUM"
}

function generateTitle(role: string, description: string): string {
  // Extrage prima propoziție ca titlu (max 100 caractere)
  const firstSentence = description.split(/[.!?\n]/)[0].trim()
  if (firstSentence.length <= 100) return firstSentence
  return firstSentence.slice(0, 97) + "..."
}

// ── Export principal ──────────────────────────────────────────────────────────

export function convertInterventionToTask(
  action: InterventionAction,
  managerRole: string,
): DelegatedTask {
  const taskType = inferTaskType(action.target, action.description)
  const priority = inferPriority(action.priority, action.description)

  return {
    assignedTo: action.target,
    title: generateTitle(action.target, action.description),
    description: action.description + (action.details ? `\n\nDetalii: ${action.details}` : ""),
    taskType,
    priority,
    tags: [managerRole.toLowerCase(), taskType.toLowerCase()],
    estimatedMinutes: null, // poate fi setat de executor la accept
    deadlineHours: PRIORITY_DEADLINES[priority],
  }
}

export function convertInterventionsToTasks(
  actions: InterventionAction[],
  managerRole: string,
): DelegatedTask[] {
  return actions
    .filter((a) => a.type === "INTERVENE")
    .map((a) => convertInterventionToTask(a, managerRole))
}

// ── Task Queue Stats ─────────────────────────────────────────────────────────

export interface TaskQueueStats {
  agentRole: string
  assigned: number
  inProgress: number
  reviewPending: number
  completedLast7d: number
  failedLast7d: number
  avgCompletionMinutes: number | null
  isOverloaded: boolean  // >5 tasks active
}

export interface TaskInput {
  assignedTo: string
  status: string
  createdAt: Date | string
  completedAt: Date | string | null
  startedAt: Date | string | null
}

export function computeTaskQueueStats(
  tasks: TaskInput[],
  roles: string[],
): TaskQueueStats[] {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  return roles.map((role) => {
    const roleTasks = tasks.filter((t) => t.assignedTo === role)
    const assigned = roleTasks.filter((t) => t.status === "ASSIGNED" || t.status === "ACCEPTED").length
    const inProgress = roleTasks.filter((t) => t.status === "IN_PROGRESS").length
    const reviewPending = roleTasks.filter((t) => t.status === "REVIEW_PENDING").length

    const recent = roleTasks.filter((t) =>
      new Date(t.createdAt).getTime() >= sevenDaysAgo,
    )
    const completedLast7d = recent.filter((t) => t.status === "COMPLETED").length
    const failedLast7d = recent.filter((t) => t.status === "FAILED").length

    // Avg completion time
    const completed = roleTasks.filter(
      (t) => t.status === "COMPLETED" && t.startedAt && t.completedAt,
    )
    let avgCompletionMinutes: number | null = null
    if (completed.length > 0) {
      const totalMs = completed.reduce((s, t) => {
        return s + (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime())
      }, 0)
      avgCompletionMinutes = Math.round(totalMs / completed.length / 60000)
    }

    return {
      agentRole: role,
      assigned,
      inProgress,
      reviewPending,
      completedLast7d,
      failedLast7d,
      avgCompletionMinutes,
      isOverloaded: assigned + inProgress > 5,
    }
  }).sort((a, b) => (b.assigned + b.inProgress) - (a.assigned + a.inProgress))
}
