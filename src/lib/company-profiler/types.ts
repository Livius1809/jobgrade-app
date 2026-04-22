/**
 * Company Profiler Engine — Tipuri
 *
 * Profilul viu al firmei: nu ce declară, ci ce face.
 * Echivalentul B2C Profiler-ului, dar pentru organizație.
 */

// ── Maturitate organizațională ──────────────────────────────────────

export type MaturityLevel = "IMPLICIT" | "EMERGENT" | "PARTIAL" | "SUBSTANTIAL" | "COMPLETE"

export interface MaturityState {
  level: MaturityLevel
  score: number // 0-100
  /** Ce date sunt disponibile */
  dataPoints: DataPointPresence
  /** Ce servicii sunt deblocate la acest nivel */
  unlockedServices: ServiceReadiness[]
  /** Ce date lipsesc pentru nivelul următor */
  nextLevelRequirements: string[]
}

export interface DataPointPresence {
  hasCaen: boolean
  hasDescription: boolean
  hasMission: boolean
  hasVision: boolean
  hasValues: boolean
  jobCount: number
  jobsWithDescriptions: number
  evaluationSessionsCompleted: number
  hasSalaryStructure: boolean
  hasBenchmark: boolean
  hasPayGapAnalysis: boolean
  hasKPIs: boolean
}

// ── Coerență ────────────────────────────────────────────────────────

export type CoherencePair =
  | "misiune-caen"
  | "misiune-posturi"
  | "viziune-benchmark"
  | "valori-evaluari"
  | "valori-fise"
  | "kpi-remunerare"
  | "structura-misiune"

export interface CoherenceCheck {
  pair: CoherencePair
  score: number // 0-100
  status: "COERENT" | "ATENTIE" | "DEVIANT"
  gap: string | null
  suggestion: string | null
  /** Nivelul minim de maturitate la care e relevant */
  relevantFrom: MaturityLevel
}

export interface CoherenceReport {
  overallScore: number
  checks: CoherenceCheck[]
  deviations: CoherenceCheck[] // doar cele cu status DEVIANT sau ATENTIE
  summary: string // narativ scurt
}

// ── Servicii deblocate ──────────────────────────────────────────────

export type ServiceType =
  | "JOB_EVALUATION"      // N1 — evaluare posturi
  | "JOB_DESCRIPTION_AI"  // N1 — generare fișe AI
  | "PAY_GAP_ANALYSIS"    // N1 — conformitate salarială
  | "SALARY_BENCHMARK"    // N2 — benchmark piață
  | "PAY_GAP_MEDIATION"   // N2 — mediere gap-uri
  | "CULTURE_AUDIT"       // N3 — audit cultură organizațională
  | "PERFORMANCE_SYSTEM"  // N3 — sistem KPI + performanță
  | "DEVELOPMENT_PLAN"    // N3 — plan dezvoltare aliniat MVV

export interface ServiceReadiness {
  service: ServiceType
  level: 1 | 2 | 3
  ready: boolean
  /** Ce date mai lipsesc (gol dacă ready=true) */
  missing: string[]
  /** Ce secțiuni de raport poate produce engine-ul */
  reportSections: string[]
}

// ── Context pentru agenți ───────────────────────────────────────────

export type AgentRole =
  | "JE"           // Job Evaluation
  | "PAY_GAP"      // Pay Gap Mediator
  | "DOA"          // Director Operațiuni Administrative
  | "SOA"          // Specialist Operațiuni Administrative
  | "BENCHMARK"    // Benchmark & Market
  | "CULTURE"      // Cultură organizațională
  | "REPORT"       // Generare rapoarte

export interface AgentContext {
  role: AgentRole
  tenantId: string
  /** Ce știm despre firmă — relevant pentru acest agent */
  companyEssence: string
  /** MVV validat sau draft */
  mvv: { mission: string | null; vision: string | null; values: string[] }
  /** Scor coerență relevant pentru agent */
  coherenceRelevant: CoherenceCheck[]
  /** Deviații pe care agentul trebuie să le semnaleze */
  deviationsToFlag: string[]
  /** Nivel maturitate curent */
  maturity: MaturityLevel
  /** Date specifice agentului */
  specificData: Record<string, unknown>
}

// ── Secțiuni raport injectabile ─────────────────────────────────────

export interface ReportSection {
  id: string
  title: string
  level: 1 | 2 | 3
  service: ServiceType
  /** Conținut generat — narativ, nu tabel */
  narrative: string
  /** Deviații semnalate în context */
  deviations: string[]
  /** Recomandări concrete */
  recommendations: string[]
  /** Scor coerență în contextul serviciului */
  coherenceScore: number
}

// ── Punct 5: Deblocare naturală servicii (Smart Dashboard) ──────────

export interface ServiceActivationSignal {
  service: ServiceType
  level: 1 | 2 | 3
  /** Serviciul tocmai s-a deblocat (datele noi l-au activat) */
  justUnlocked: boolean
  /** Mesaj pentru client — ce poate face acum */
  clientMessage: string
  /** Ce date au declanșat deblocarea */
  triggeredBy: string
  /** Procent completare spre deblocare (0-100) */
  readinessPercent: number
}

// ── Punct 6: Semnale proactive ─────────────────────────────────────

export type ProactiveSignalSeverity = "INFO" | "ATENTIE" | "IMPORTANT" | "CRITIC"

export interface ProactiveSignal {
  id: string
  severity: ProactiveSignalSeverity
  /** Ce s-a întâmplat */
  event: string
  /** Impact concret */
  impact: string
  /** Ce recomandăm */
  recommendation: string
  /** Ce pereche de coerență e afectată (dacă e cazul) */
  coherencePair: CoherencePair | null
  /** Scor înainte vs. după */
  scoreDelta: number | null
  /** Timestamp */
  detectedAt: Date
}

// ── Punct 7: Memorie de evoluție ───────────────────────────────────

export interface MaturitySnapshot {
  level: MaturityLevel
  score: number
  coherenceScore: number
  dataPoints: DataPointPresence
  takenAt: Date
}

export interface EvolutionTrajectory {
  /** Snapshots ordonate cronologic */
  snapshots: MaturitySnapshot[]
  /** Trend general */
  trend: "ASCENDING" | "STAGNANT" | "DECLINING"
  /** Câte niveluri a avansat (poate fi negativ) */
  levelDelta: number
  /** Narativ scurt: ce s-a schimbat */
  narrative: string
  /** Timp mediu între niveluri (zile) */
  avgDaysBetweenLevels: number | null
}

// ── Punct 8: Punte între servicii ──────────────────────────────────

export interface CrossServiceLink {
  from: ServiceType
  to: ServiceType
  /** Ce date circulă de la from → to */
  dataFlow: string
  /** Cum influențează from rezultatul lui to */
  influence: string
  /** Dacă datele sunt actualizate (from a rulat recent) */
  fresh: boolean
}

export interface ServiceEcosystem {
  /** Servicii active (au date) */
  activeServices: ServiceType[]
  /** Legături între servicii */
  links: CrossServiceLink[]
  /** Servicii izolate (nu primesc date din alte servicii) */
  isolated: ServiceType[]
  /** Tablou unitar: narativ al interconexiunilor */
  unifiedNarrative: string
}

// ── Punct 9: Protecție contra inconsistenței ───────────────────────

export interface InconsistencyAlert {
  /** Ce a declarat clientul */
  declared: string
  /** Ce arată datele */
  reality: string
  /** Unde se vede inconsistența */
  visibleIn: ServiceType[]
  /** Gravitate */
  severity: "MINOR" | "SEMNIFICATIV" | "GRAV"
  /** Sugestie neutră (nu judecăm) */
  suggestion: string
}

// ── Jurnal client (Punct 2 din discuție) ───────────────────────────

export interface ClientJournalEntry {
  date: Date
  category: "ACȚIUNE" | "SERVICIU" | "MVV" | "DECIZIE" | "CREDIT"
  action: string
  detail: string
  /** Credite consumate (0 dacă e acțiune gratuită) */
  credits: number
  /** Serviciul asociat */
  service: ServiceType | null
}

export interface ClientJournal {
  entries: ClientJournalEntry[]
  /** Rezumat narativ al traiectoriei */
  trajectory: string
  /** Sold credite curent */
  creditBalance: number
  /** Total credite consumate */
  totalCreditsUsed: number
  /** Perioada acoperită */
  period: { from: Date; to: Date }
}

// ── Profil complet ──────────────────────────────────────────────────

export interface CompanyProfile {
  tenantId: string
  /** Date administrative (din formularul de editare) */
  identity: {
    name: string | null
    cui: string | null
    caenCode: string | null
    caenName: string | null
    industry: string | null
    description: string | null
  }
  /** MVV — draft AI + validat client */
  mvv: {
    maturity: MaturityLevel
    missionDraft: string | null
    missionValidated: string | null
    visionDraft: string | null
    visionValidated: string | null
    valuesDraft: string[]
    valuesValidated: string[]
    lastBuiltAt: Date | null
    coherenceScore: number | null
  }
  /** Starea de maturitate cu servicii deblocate */
  maturityState: MaturityState
  /** Raport coerență */
  coherence: CoherenceReport
  /** Punct 5: Servicii tocmai deblocate */
  activationSignals: ServiceActivationSignal[]
  /** Punct 6: Semnale proactive */
  proactiveSignals: ProactiveSignal[]
  /** Punct 9: Inconsistențe detectate */
  inconsistencies: InconsistencyAlert[]
  /** Timestamp profil */
  profiledAt: Date
}
