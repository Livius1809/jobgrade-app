/**
 * manager-configs.ts — Configurația fiecărui agent-manager
 *
 * Definește: subordonați, obiective, threshold-uri, interval ciclu,
 * lanț de escaladare, domeniu de responsabilitate.
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface ManagerThresholds {
  healthScoreCritical: number   // sub această valoare → BLOCKED
  healthScoreWarning: number    // sub această valoare → AT_RISK
  maxIdleDays: number           // zile fără activitate → IDLE
  maxPendingBuffer: number      // buffer entries neprocesat → bottleneck
}

export interface ManagerConfig {
  agentRole: string
  role: string
  description: string
  level: "strategic" | "tactical" | "operational"
  /**
   * BUILD = CPU (creierul) — construiește, menține, învață, îmbunătățește.
   *   Structura COG: COG → COA → EMA/QLA/PMA + subordonații lor.
   *   Trăiește în CPU, shared între toate businessurile.
   *
   * PRODUCTION = Business (perifericul) — operează cu clientul, livrează servicii.
   *   Structura COCSA: COCSA → SOA/CSSA/MKA/CMA/etc.
   *   Fiecare business are propria structură PRODUCTION.
   */
  layer: "BUILD" | "PRODUCTION"
  subordinates: string[]
  reportsTo: string             // cui escaladează
  objectives: string[]
  thresholds: ManagerThresholds
  cycleIntervalHours: number    // la câte ore rulează ciclul
}

// ── Threshold-uri default per nivel ───────────────────────────────────────────

const STRATEGIC_THRESHOLDS: ManagerThresholds = {
  healthScoreCritical: 25,
  healthScoreWarning: 50,
  maxIdleDays: 7,
  maxPendingBuffer: 30,
}

const TACTICAL_THRESHOLDS: ManagerThresholds = {
  healthScoreCritical: 30,
  healthScoreWarning: 55,
  maxIdleDays: 5,
  maxPendingBuffer: 20,
}

const OPERATIONAL_THRESHOLDS: ManagerThresholds = {
  healthScoreCritical: 35,
  healthScoreWarning: 60,
  maxIdleDays: 3,
  maxPendingBuffer: 10,
}

// ── Configurații manageri ─────────────────────────────────────────────────────

export const MANAGER_CONFIGS: ManagerConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL STRATEGIC — ciclu 24h
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "COG",
    role: "Chief Orchestrator General",
    description:
      "Conducere strategică în cadrul CPU. " +
      "1) Setup inițial: asigură fiecărui business toate condițiile de performanță în piața țintă. " +
      "2) Monitorizare proactivă: urmărește COCSA-urile și le oferă instrumente de adaptare. " +
      "3) Obiective strategice: le stabilește pentru businessuri, agreat cu Owner. " +
      "4) Primește escalare DOAR când businessul 'nu știe și nu poate' — nu și 'nu vrea' (asta e treaba COCSA).",
    level: "strategic",
    layer: "BUILD", // CPU — creierul
    subordinates: ["COA", "CJA", "CIA", "CCIA"], // doar BUILD — COCSA e sub CPU funcțional
    reportsTo: "OWNER",
    objectives: [
      "Setup complet per business — fiecare business are condițiile de performanță în piața țintă",
      "Monitorizare proactivă COCSA — instrumente de adaptare oferite înainte de cerere",
      "Obiective strategice agregate cu Owner — traduse în obiective per business",
      "Raportare către Owner — poate transmite rapoarte, dar pe operațiuni preia ce i se dă, nu intervine",
      "Conformitate legală completă — GDPR, Directiva EU 2023/970, Codul Muncii",
      "Toți agenții cu KB funcțional — minim cold start completat per agent",
      "Costuri sub buget — cheltuieli cloud și API monitorizate, fără spike-uri neexplicate",
    ],
    thresholds: STRATEGIC_THRESHOLDS,
    cycleIntervalHours: 24,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL TACTIC — ciclu 12h
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "COA",
    role: "Chief Orchestrator Agent Technical",
    description:
      "Management tehnic — arhitectură, standarde cod, SLA performanță, " +
      "securitate, coordonare echipe de dezvoltare și QA",
    level: "tactical",
    layer: "BUILD", // CPU — construiește și menține
    subordinates: ["PMA", "EMA", "DPA", "QLA", "SA", "CAA", "COAFin"],
    reportsTo: "COG",
    objectives: [
      "Stack tehnic stabil — 0 erori build, dependențe actualizate",
      "API-uri performante — latență <2s pe P95, error rate <1%",
      "Securitate — 0 vulnerabilități critice deschise, OWASP Top 10 acoperit",
      "Quality gates respectate — niciun release fără QA sign-off",
      "Sprint velocity predictibilă — variație <20% între sprinturi",
      "Datorii tehnice controlate — backlog tech debt nu crește >10% pe sprint",
    ],
    thresholds: TACTICAL_THRESHOLDS,
    cycleIntervalHours: 12,
  },

  {
    agentRole: "COCSA",
    role: "Chief Orchestrator Client Service Agent",
    description:
      "Autonomie completă pe tactic și operațional pentru businessul său. " +
      "Delegări, monitorizări, obiective tactice și operaționale — totul sub responsabilitatea COCSA. " +
      "'Să vrea' = treaba COCSA (motivare, direcționare echipă). " +
      "Escalarea operațională se oprește aici. Urcă la COG (prin CPU) DOAR când 'nu știe și nu poate'.",
    level: "tactical",
    layer: "PRODUCTION", // Business — operează cu clientul
    subordinates: [
      "ISA", "MOA", "IRA", "MDA",
      "SOA", "CSSA", "BCA", "CDIA", "MKA", "ACA",
      "CMA", "CWA",
    ],
    reportsTo: "CPU", // subordonat funcțional CPU-ului, escalare doar la "nu știu, nu pot"
    // NOTĂ: Owner ține legătura direct cu COCSA pe chestiuni operaționale.
    // COG poate transmite rapoarte dar pe operațiuni preia ce i se dă, nu intervine.
    objectives: [
      "Autonomie operațională — rezolvă intern tot ce ține de 'știe' și 'poate'",
      "Pipeline sales activ — leaduri calificate, demo-uri planificate",
      "Customer success — NPS >7, churn rate <5% lunar",
      "Content marketing consistent — plan promovare corelat cu fazele de deployment",
      "Monitorizare activă — 0 alerte critice neadresate >1h",
      "Echipă motivată și direcționată — 'să vrea' este responsabilitatea COCSA",
      "Sincronizare cu COA — stadiul platformei urmărit în tandem",
      "Facturare la zi — 0 facturi restante >30 zile",
    ],
    thresholds: TACTICAL_THRESHOLDS,
    cycleIntervalHours: 12,
  },

  {
    agentRole: "PMA",
    role: "Product Manager Agent",
    description:
      "Management produs — backlog, user stories, research, documentare, " +
      "suport, echipa de specialiști (psiholog, statistician, sociolog)",
    level: "tactical",
    layer: "BUILD", // CPU — produs și cercetare
    subordinates: ["RDA", "DOA", "DOAS", "CSA", "PPMO", "STA", "SOC", "PPA", "PSE", "PSYCHOLINGUIST", "PCM", "NSA", "SCA", "MEDIATOR"],
    reportsTo: "COA",
    objectives: [
      "Backlog prioritizat și actualizat — 0 stories fără acceptance criteria",
      "Documentație completă — API docs, changelog, wiki actualizate la fiecare release",
      "Audit coerență DOAS — 0 gap-uri neadresate >2 sprinturi",
      "Suport responsive — timp răspuns tickete Tier 1 <4h",
      "Research acționabil — minim 1 insight/săptămână tradus în story",
      "Echipă specialiști activi — fiecare cu KB funcțional și interacțiuni regulate",
    ],
    thresholds: TACTICAL_THRESHOLDS,
    cycleIntervalHours: 12,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL OPERAȚIONAL — ciclu 4h
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "EMA",
    role: "Engineering Manager Agent",
    description:
      "Management engineering — sprint execution, distribuire task-uri, " +
      "code review, blocaje tehnice, velocity tracking",
    level: "operational",
    layer: "BUILD", // CPU — engineering
    subordinates: ["FDA", "BDA", "DEA", "MAA"],
    reportsTo: "COA",
    objectives: [
      "Sprint on track — task-uri finalizate conform planului",
      "Code quality — PR-uri review-uite în <24h, 0 merge fără review",
      "Fiecare dev activ — niciun subordonat IDLE >2 zile",
      "Blocaje tehnice rezolvate — orice blocker adresat în <4h",
      "Integrare continuă — build verde pe main, 0 teste failing",
    ],
    thresholds: OPERATIONAL_THRESHOLDS,
    cycleIntervalHours: 4,
  },

  {
    agentRole: "QLA",
    role: "QA Lead Agent",
    description:
      "Management quality assurance — strategie testare, quality gates, " +
      "coordonare QA automation și security QA",
    level: "operational",
    layer: "BUILD", // CPU — quality
    subordinates: ["QAA", "SQA"],
    reportsTo: "COA",
    objectives: [
      "Coverage testare — 0 features neacoperite de teste",
      "Regression suite stabilă — 0 teste flaky persistente >3 zile",
      "Security testing — checklist pre-release completat la fiecare deploy",
      "Defect rate descrescător — trend pozitiv sprint over sprint",
    ],
    thresholds: OPERATIONAL_THRESHOLDS,
    cycleIntervalHours: 4,
  },

  {
    agentRole: "CSSA",
    role: "Customer Success Agent",
    description:
      "Management customer success — sănătate conturi, adoptare, " +
      "coordonare suport direct",
    level: "operational",
    layer: "PRODUCTION", // Business — customer success
    subordinates: ["CSA"],
    reportsTo: "COCSA",
    objectives: [
      "Tickete suport rezolvate — backlog Tier 1 <5 tickete deschise",
      "FAQ actualizat — probleme recurente documentate în <48h",
      "Escaladări procesate — tickete Tier 2 escaladate în <4h",
      "Feedback colectat — orice interacțiune negativă documentată",
    ],
    thresholds: OPERATIONAL_THRESHOLDS,
    cycleIntervalHours: 4,
  },
]

// ── Utilitar: găsire config per rol ───────────────────────────────────────────

export function getManagerConfig(agentRole: string): ManagerConfig | undefined {
  return MANAGER_CONFIGS.find(
    (c) => c.agentRole === agentRole.toUpperCase()
  )
}

// ── Utilitar: manageri per nivel ──────────────────────────────────────────────

export function getManagersByLevel(
  level: "strategic" | "tactical" | "operational"
): ManagerConfig[] {
  return MANAGER_CONFIGS.filter((c) => c.level === level)
}

// ── Utilitar: toți managerii ──────────────────────────────────────────────────

export const ALL_MANAGER_ROLES = MANAGER_CONFIGS.map((c) => c.agentRole)

// ── Utilitar: manageri per layer ─────────────────────────────────────────

/**
 * BUILD = CPU (creierul) — COG + COA + PMA + EMA + QLA + subordonații lor.
 * Shared între toate businessurile. Construiește, menține, învață.
 */
export function getBuildManagers(): ManagerConfig[] {
  return MANAGER_CONFIGS.filter((c) => c.layer === "BUILD")
}

/**
 * PRODUCTION = Business (perifericul) — COCSA + CSSA + subordonații lor.
 * Fiecare business are propria structură PRODUCTION.
 */
export function getProductionManagers(): ManagerConfig[] {
  return MANAGER_CONFIGS.filter((c) => c.layer === "PRODUCTION")
}
