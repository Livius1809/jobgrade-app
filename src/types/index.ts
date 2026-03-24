import { UserRole, SessionStatus, ConsensusState, JobStatus } from "@/generated/prisma"

// ─── Auth ───────────────────────────────

declare module "next-auth" {
  interface User {
    tenantId: string
    role: UserRole
    locale: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      tenantId: string
      role: UserRole
      locale: string
    }
  }
}

declare module "next-auth" {
  interface JWT {
    tenantId: string
    role: UserRole
    locale: string
  }
}

// ─── API Responses ───────────────────────

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ─── Criteria & Scoring ─────────────────

export interface SubfactorWithPoints {
  id: string
  code: string
  description: string
  points: number
  order: number
}

export interface CriterionWithSubfactors {
  id: string
  name: string
  description: string | null
  category: string | null
  order: number
  subfactors: SubfactorWithPoints[]
}

export interface EvaluationScore {
  criterionId: string
  subfactorId: string
  justification?: string
}

export interface JobEvaluation {
  jobId: string
  scores: EvaluationScore[]
  isDraft: boolean
}

// ─── Consensus ──────────────────────────

export interface SubfactorDistribution {
  subfactorId: string
  code: string
  points: number
  count: number
  percentage: number
}

export interface CriterionConsensus {
  criterionId: string
  criterionName: string
  status: ConsensusState
  distribution: SubfactorDistribution[]
  cv: number
  mode: SubfactorWithPoints | null
  consensusReached: boolean
  mySubfactorId?: string
}

// ─── Results ────────────────────────────

export interface JobHierarchyItem {
  jobId: string
  jobTitle: string
  department: string | null
  totalScore: number
  normalizedScore: number
  rank: number
  salaryGrade: string | null
  scoreBreakdown: {
    criterionName: string
    subfactorCode: string
    points: number
  }[]
}

// ─── Compensation ───────────────────────

export type CvCategory = "PERFORMANCE" | "GRADE" | "ALL"

export interface VariableComponent {
  id: string
  name: string
  category: CvCategory
  type: "PERCENTAGE" | "FIXED" | "COMMISSION"
  value: number
  frequency: "MONTHLY" | "QUARTERLY" | "ANNUALLY"
  condition?: string
  cap?: number
  partialBonus: boolean
  minThreshold?: number
}

export interface CompensationSummary {
  baseSalary: number
  cvPerformance: number
  cvGrade: number
  cvAll: number
  benefits: number
  total: number
  fixedTotal: number
  variableTotal: number
  fixedPercent: number
  variablePercent: number
}

export interface SimulationResult {
  scenarioName: string
  kpiScore: number
  baseSalary: number
  cvPerformance: number
  cvGrade: number
  cvAll: number
  benefits: number
  total: number
  annualTotal: number
  employerCost: number
}

// ─── Dashboard ──────────────────────────

export interface DashboardStats {
  activeJobs: number
  activeSessions: number
  evaluatorsCompleted: number
  evaluatorsTotal: number
  creditsRemaining: number
}

export interface ActivityItem {
  id: string
  type: string
  description: string
  creditsUsed?: number
  createdAt: Date
}
