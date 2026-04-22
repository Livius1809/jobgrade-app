/**
 * Company Profiler Engine — Export central
 *
 * Utilizare:
 *   import { getCompanyProfile, getAgentContext, getReportSections } from "@/lib/company-profiler"
 *   import { getEvolution, getServiceEcosystem, getClientJournal } from "@/lib/company-profiler"
 */

// Engine — punctele de intrare
export {
  getCompanyProfile,
  getAgentContext,
  getReportSections,
  getEvolution,
  getServiceEcosystem,
  getClientJournal,
  invalidateProfileCache,
  onSignificantAction,
} from "./engine"

// Tipuri
export type {
  CompanyProfile,
  MaturityLevel,
  MaturityState,
  DataPointPresence,
  CoherenceCheck,
  CoherenceReport,
  CoherencePair,
  ServiceType,
  ServiceReadiness,
  AgentRole,
  AgentContext,
  ReportSection,
  // Punct 5: Smart Activation
  ServiceActivationSignal,
  // Punct 6: Proactive Signals
  ProactiveSignal,
  ProactiveSignalSeverity,
  // Punct 7: Evolution
  MaturitySnapshot,
  EvolutionTrajectory,
  // Punct 8: Cross-Service
  CrossServiceLink,
  ServiceEcosystem,
  // Punct 9: Inconsistency
  InconsistencyAlert,
  // Jurnal client
  ClientJournal,
  ClientJournalEntry,
} from "./types"

// Utilități (pentru cazuri avansate)
export { computeMaturityState, computeMaturityLevel, computeMaturityScore } from "./maturity"
export { buildAgentContext } from "./agent-context"
export { buildServiceEcosystem, detectInconsistencies } from "./cross-service"
export { detectActivationSignals } from "./smart-activation"
export { detectProactiveSignals } from "./proactive-signals"
