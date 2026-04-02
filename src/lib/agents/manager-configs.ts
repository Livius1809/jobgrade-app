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
      "Conducere strategică — traduce viziunea Owner în strategie executabilă, " +
      "monitorizează KPI business, conformitate, direcția pe termen lung",
    level: "strategic",
    subordinates: ["COA", "COCSA", "CJA", "CIA", "CCIA"],
    reportsTo: "OWNER",
    objectives: [
      "Platforma JobGrade operațională și stabilă — uptime >99.5%, 0 incidente P0 deschise",
      "Pipeline B2B activ — minim 1 client în onboarding sau evaluare activă",
      "Conformitate legală completă — GDPR, Directiva EU 2023/970, Codul Muncii",
      "Toți agenții cu KB funcțional — minim cold start completat per agent",
      "Costuri sub buget — cheltuieli cloud și API monitorizate, fără spike-uri neexplicate",
      "B2C metodologie finalizată — documentație completă pentru sprint-urile de build",
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
      "Management operațional, business și go-to-market — urmărește stadiul platformei " +
      "împreună cu COA, coordonează landing pages, content, plan promovare B2B cu bugete " +
      "corelate cu fazele de deployment, securitate informațională, sales, customer success",
    level: "tactical",
    subordinates: [
      "ISA", "MOA", "IRA", "MDA",
      "SOA", "CSSA", "BCA", "CDIA", "MKA", "ACA",
      "CMA", "CWA", // Content Manager Agent + Copywriter Agent (noi)
    ],
    reportsTo: "COG",
    objectives: [
      "Sincronizare cu COA — stadiul platformei urmărit în tandem, landing pages gata la fiecare fază de deployment",
      "Plan promovare B2B complet — canale, bugete, timeline corelat cu fazele de dare în exploatare",
      "Content pipeline activ — copywriter produce texte landing pages + ad-uri, content manager coordonează",
      "Propuneri clipuri scurte — minim 3 concepte video pentru social media per fază de lansare",
      "Monitorizare activă — 0 alerte critice neadresate >1h",
      "Incidente gestionate — timp răspuns P0 <15min, P1 <1h",
      "Pipeline sales activ — leaduri calificate, demo-uri planificate",
      "Customer success — NPS >7, churn rate <5% lunar",
      "Facturare la zi — 0 facturi restante >30 zile",
      "Content marketing consistent — minim 2 publicări/săptămână (blog + social)",
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
