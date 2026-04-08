/**
 * Evolution Engine — Masterpiece-ul JobGrade
 *
 * Același mecanism fractal, 4 contexte:
 *   OWNER    → client zero, primul testat
 *   INTERNAL → agenții proprii (organismul viu)
 *   B2B      → organizația client
 *   B2C      → individul client
 *
 * "Nu urmărim produsul ci procesul;
 *  perfecționăm procesul și tragem piața spre evoluție."
 */

export { runEvolutionCycle, getLastCycle, saveCycle } from "./engine"
export { getConfigForContext, OWNER_CONFIG, INTERNAL_CONFIG, B2B_CONFIG, B2C_CONFIG } from "./adapters"
export { getDimensionsForContext } from "./dimensions"
export type {
  EvolutionContext,
  EvolutionCycle,
  StateSnapshot,
  Misalignment,
  EvolutionPlan,
  PlannedAction,
  EffectMeasurement,
  DimensionScore,
  DimensionDefinition,
  ContextConfig,
  MaturityLevel,
  CycleStep,
} from "./types"
export { maturityFromScore, MATURITY_CLIENT_LABELS, MATURITY_B2B_LABELS } from "./types"
