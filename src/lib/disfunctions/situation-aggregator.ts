/**
 * Situation Aggregator — traduce evenimente brute în situații contextualizate.
 *
 * Livrat: 05.04.2026, Sprint 3 Block 2 extins.
 * Motivație: cockpit-ul brut arăta 232 evenimente; Owner nu putea lua decizii
 * calibrate din zgomot. Aggregatorul grupează evenimentele în 3-8 situații cu
 * context (cauză, impact, tendință, acțiune cerută).
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O, zero side-effects. Testabilă direct.
 *  - Zero conținut semantic — lucrează pe metadate (class, signal, targetType, targetId).
 *  - Reguli explicite, ordonate pe prioritate. Early-exit pe prima match.
 *  - Toate event id-urile se păstrează în `eventIds` pentru drill-down.
 *
 * NU înlocuiește `/api/v1/disfunctions` (events brute). Vine PESTE el.
 *
 * ─── REGULI ACTIVE (ordine = prioritate, early-exit pe prima match) ──────────
 *
 *   R1  known_gap_calea1_monotony    ROLE ∈ {EMA,CCO,QLA} + signal="monotone_*"
 *                                    → KNOWN_GAP_ACCEPTED (pending Calea 1)
 *   R2  stack_auto_healed            D1 RESOLVED, remediationOk=true, <15min
 *                                    → AUTO_REMEDIATING (info-only, SLA check)
 *   R2b stack_open_recent            D1 SERVICE OPEN, <10min
 *                                    → AUTO_REMEDIATING (în curs de recuperare)
 *   R3  stack_open_needs_owner       D1 OPEN, >10min
 *                                    → DECISION_REQUIRED (cere Owner manual)
 *   R4  workflow_fail_rate           D1 WORKFLOW OPEN (per targetId)
 *                                    → DECISION_REQUIRED
 *   R5  role_cluster                 D2 ROLE OPEN, ≥3 roluri pe același signal
 *                                    → DECISION_REQUIRED cluster
 *                                    (<3 cade pe fallback single-role DR)
 *   R6  flux_step_stuck              FLUX_STEP OPEN/ESCALATED
 *                                    → DECISION_REQUIRED per step
 *
 *   Fallback: D2 ROLE OPEN izolat → DECISION_REQUIRED single;
 *             orice altceva neclasificat → CONFIG_NOISE
 *
 * ─── CUM ADAUGI O REGULĂ NOUĂ ────────────────────────────────────────────────
 *
 * 1. Adaugă o intrare în array-ul `RULES` (jos). Ordinea contează — regulile
 *    mai specifice/prioritare merg sus. Early-exit: primul `matches === true`
 *    câștigă evenimentul.
 *
 * 2. Câmpuri obligatorii:
 *     - `name`       — identificator stabil (folosit în logs & debug)
 *     - `matches`    — predicat pur pe un singur event
 *     - `clusterKey` — funcție care produce cheia de grupare; două evenimente
 *                      cu aceeași cheie se unesc într-o singură situație
 *     - `build`      — construiește Situation finală dintr-un cluster
 *
 * 3. Dacă regula are un prag minim de cluster (ca R5), adaugă verificarea în
 *    loop-ul din `aggregateSituations` (vezi comentariul "Pentru R5").
 *    Evenimentele care nu ating pragul trebuie re-împinse în `unmatched` ca
 *    să ajungă pe fallback, nu să dispară.
 *
 * 4. Scrie cel puțin două teste în `__tests__/situation-aggregator.test.ts`:
 *    un happy-path (regula se activează) + un negative (regula NU consumă
 *    evenimente care nu-i aparțin).
 *
 * 5. Nu adăuga conținut semantic în regulă (nu "dacă signal conține
 *    «database»..."). Dacă simți nevoia, adaugă un câmp nou pe EventInput
 *    (ex: un tag enumerat) și lasă detectorul să-l seteze upstream.
 *
 * ─── CUM AJUSTEZI PRAGURI ────────────────────────────────────────────────────
 *
 * Cele 3 constante de tuning (ROLE_CLUSTER_MIN, AUTO_REMEDIATE_WINDOW_MS,
 * D1_OPEN_ESCALATE_MS) sunt declarate imediat sub PAUSED_KNOWN_GAP_ROLES.
 * Modifică-le direct — testele folosesc fixture cu detectedAt relativ la
 * Date.now() și vor prinde orice regresie de interval.
 */

// ── Tipuri publice ────────────────────────────────────────────────────────────

export type SituationClassification =
  | "DECISION_REQUIRED" // Owner trebuie să decidă ceva
  | "AUTO_REMEDIATING" // Sistemul rezolvă singur, info-only
  | "KNOWN_GAP_ACCEPTED" // Gap cunoscut acceptat (ex: pending Calea 1)
  | "CONFIG_NOISE" // Probabil zgomot de configurare, verificat

export type SituationTrend = "NEW" | "STABLE" | "REMEDIATING" | "ESCALATING"

export interface Situation {
  /** Cluster key stabil — poate fi folosit ca dedup între rulări consecutive */
  id: string
  classification: SituationClassification
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  /** Titlu scurt, uman (≤80 chars) */
  title: string
  /** Cauza probabilă într-o propoziție */
  cause: string
  /** Ce e afectat concret */
  scope: {
    count: number
    entities: string[] // ex: ["EMA", "CCO", "QLA"] sau ["jobgrade_redis"]
  }
  /** Impact funcțional: ce funcție a firmei e afectată */
  impact: string
  trend: SituationTrend
  /** Ce se așteaptă de la Owner */
  actionRequired: string
  /** Trail înapoi la evenimentele brute */
  eventIds: string[]
  /** Timestamp primul event din cluster */
  firstSeenAt: string
  /** Timestamp ultimul event din cluster */
  lastSeenAt: string
}

// ── Input — subset minim din DisfunctionEvent (zero dep pe Prisma types) ──────

export interface EventInput {
  id: string
  class: "D1_TECHNICAL" | "D2_FUNCTIONAL_MGMT" | "D3_BUSINESS_PROCESS"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "OPEN" | "REMEDIATING" | "RESOLVED" | "ESCALATED"
  targetType: "SERVICE" | "WORKFLOW" | "ROLE" | "FLUX_STEP"
  targetId: string
  signal: string
  detectedAt: string | Date
  resolvedAt?: string | Date | null
  remediationOk?: boolean | null
  detectorSource: string
  durationMs?: number | null
}

// ── Constante de clasificare ──────────────────────────────────────────────────

/**
 * Roluri cu buclă cunoscută pending Calea 1 (delegare executor).
 * Vezi project_disfunction_system_status.md — Sprint 3 Block 2.
 */
const PAUSED_KNOWN_GAP_ROLES = new Set(["EMA", "CCO", "QLA"])

/** Prag minim pentru a considera un cluster de roluri (≥ acest număr = cluster) */
const ROLE_CLUSTER_MIN = 3

/** Fereastra pentru "auto-remediat recent" (ms) */
const AUTO_REMEDIATE_WINDOW_MS = 15 * 60 * 1000

/** Prag pentru "D1 OPEN prea mult" (ms) — dincolo de asta cere Owner */
const D1_OPEN_ESCALATE_MS = 10 * 60 * 1000

// ── Helper-i ──────────────────────────────────────────────────────────────────

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null
  return v instanceof Date ? v : new Date(v)
}

function maxSeverity(
  a: Situation["severity"],
  b: Situation["severity"],
): Situation["severity"] {
  const order = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }
  return order[a] >= order[b] ? a : b
}

function computeTrend(events: EventInput[]): SituationTrend {
  if (events.length === 0) return "STABLE"
  const hasRemediating = events.some(
    (e) => e.status === "REMEDIATING" || e.remediationOk === false,
  )
  if (hasRemediating) return "REMEDIATING"
  const hasEscalating = events.some((e) => e.status === "ESCALATED")
  if (hasEscalating) return "ESCALATING"
  // Tendință simplă: dacă cel mai recent e la <5min, e "nou"
  const latest = Math.max(
    ...events.map((e) => toDate(e.detectedAt)?.getTime() ?? 0),
  )
  const ageMin = (Date.now() - latest) / 60000
  if (ageMin < 5) return "NEW"
  return "STABLE"
}

function firstLast(events: EventInput[]): { first: string; last: string } {
  const dates = events
    .map((e) => toDate(e.detectedAt))
    .filter((d): d is Date => d !== null)
    .map((d) => d.getTime())
  if (dates.length === 0) {
    const nowIso = new Date().toISOString()
    return { first: nowIso, last: nowIso }
  }
  return {
    first: new Date(Math.min(...dates)).toISOString(),
    last: new Date(Math.max(...dates)).toISOString(),
  }
}

// ── Reguli de clasificare (ordonate, early-exit) ──────────────────────────────

interface Rule {
  name: string
  matches: (e: EventInput) => boolean
  clusterKey: (e: EventInput) => string
  build: (events: EventInput[], clusterKey: string) => Situation
}

const RULES: Rule[] = [
  // ── R1: Known gap Calea 1 — monotonia EMA/CCO/QLA ────────────────────────────
  {
    name: "known_gap_calea1_monotony",
    matches: (e) =>
      e.targetType === "ROLE" &&
      PAUSED_KNOWN_GAP_ROLES.has(e.targetId) &&
      e.signal.startsWith("monotone_"),
    clusterKey: () => "known_gap:calea1_monotony",
    build: (events, key) => {
      const roles = Array.from(new Set(events.map((e) => e.targetId))).sort()
      const { first, last } = firstLast(events)
      return {
        id: key,
        classification: "KNOWN_GAP_ACCEPTED",
        severity: events.reduce<Situation["severity"]>(
          (acc, e) => maxSeverity(acc, e.severity),
          "LOW",
        ),
        title: `Monotonie managerială (${roles.length} roluri) — pending Calea 1`,
        cause:
          "Managerii repetă INTERVENE pe executori în DORMANT_UNTIL_DELEGATED — buclă fără efect până la livrarea flow-ului de delegare executor.",
        scope: { count: roles.length, entities: roles },
        impact:
          "Zero impact operațional direct. Semnal arhitectural: lipsește infrastructura de delegare funcțională manager→executor.",
        trend: computeTrend(events),
        actionRequired:
          "Nimic acum. Se rezolvă automat când Calea 1 migrează executorii DORMANT → PROACTIVE_CYCLIC.",
        eventIds: events.map((e) => e.id),
        firstSeenAt: first,
        lastSeenAt: last,
      }
    },
  },

  // ── R2: Stack tehnic auto-rezolvat recent ────────────────────────────────────
  {
    name: "stack_auto_healed",
    matches: (e) => {
      if (e.class !== "D1_TECHNICAL") return false
      if (e.status !== "RESOLVED") return false
      if (e.remediationOk !== true) return false
      const resolvedAt = toDate(e.resolvedAt)
      if (!resolvedAt) return false
      return Date.now() - resolvedAt.getTime() <= AUTO_REMEDIATE_WINDOW_MS
    },
    clusterKey: () => "stack:auto_healed_recent",
    build: (events, key) => {
      const services = Array.from(new Set(events.map((e) => e.targetId))).sort()
      const { first, last } = firstLast(events)
      return {
        id: key,
        classification: "AUTO_REMEDIATING",
        severity: "LOW",
        title: `Stack auto-recuperat (${services.length} servicii) în ultimele 15min`,
        cause:
          "Incident tehnic detectat și remediat automat prin remediation-runner. Pipeline-ul funcționează.",
        scope: { count: services.length, entities: services },
        impact:
          "Zero impact durabil. Timpul de down a fost sub pragul SLA intern.",
        trend: "REMEDIATING",
        actionRequired: "Nimic. Info-only pentru verificare SLA.",
        eventIds: events.map((e) => e.id),
        firstSeenAt: first,
        lastSeenAt: last,
      }
    },
  },

  // ── R2b: Stack tehnic OPEN recent — presupus în curs de auto-remediere ───────
  // Pipeline-ul FLUX-044 încearcă restart la fiecare 2min. Sub 10min = în
  // fereastra normală de recuperare. Peste 10min trece la R3 (DECISION_REQUIRED).
  {
    name: "stack_open_recent",
    matches: (e) => {
      if (e.class !== "D1_TECHNICAL") return false
      if (e.targetType !== "SERVICE") return false
      if (e.status !== "OPEN") return false
      const detectedAt = toDate(e.detectedAt)
      if (!detectedAt) return false
      return Date.now() - detectedAt.getTime() <= D1_OPEN_ESCALATE_MS
    },
    clusterKey: () => "stack:open_recent_pending_remediation",
    build: (events, key) => {
      const services = Array.from(new Set(events.map((e) => e.targetId))).sort()
      const { first, last } = firstLast(events)
      return {
        id: key,
        classification: "AUTO_REMEDIATING",
        severity: events.reduce<Situation["severity"]>(
          (acc, e) => maxSeverity(acc, e.severity),
          "LOW",
        ),
        title: `${services.length} serviciu(i) în curs de auto-remediere`,
        cause:
          "Incident tehnic recent detectat. Pipeline-ul FLUX-044 încearcă restart în ciclul de 2min. Dacă nu se rezolvă în <10min, escaladează automat la DECISION_REQUIRED.",
        scope: { count: services.length, entities: services },
        impact:
          "Temporar: funcțiile dependente pot fi afectate până la reparare. Urmăribil pe cockpit live.",
        trend: "REMEDIATING",
        actionRequired:
          "Așteaptă auto-remedierea. Verifică din nou în 5-10 min; dacă persistă, situația migrează la DECISION_REQUIRED.",
        eventIds: events.map((e) => e.id),
        firstSeenAt: first,
        lastSeenAt: last,
      }
    },
  },

  // ── R3: Stack tehnic OPEN prea mult — cere Owner ─────────────────────────────
  {
    name: "stack_open_needs_owner",
    matches: (e) => {
      if (e.class !== "D1_TECHNICAL") return false
      if (e.status !== "OPEN") return false
      const detectedAt = toDate(e.detectedAt)
      if (!detectedAt) return false
      return Date.now() - detectedAt.getTime() > D1_OPEN_ESCALATE_MS
    },
    clusterKey: (e) => `stack:open_long:${e.targetId}`,
    build: (events, key) => {
      const target = events[0].targetId
      const { first, last } = firstLast(events)
      return {
        id: key,
        classification: "DECISION_REQUIRED",
        severity: events.reduce<Situation["severity"]>(
          (acc, e) => maxSeverity(acc, e.severity),
          "LOW",
        ),
        title: `Serviciu ${target} DOWN > 10min, fără auto-remediere`,
        cause:
          "Serviciul e detectat jos dar remediation-runner nu a reușit să-l repare (posibil nu e în allowlist, posibil restart nu a mers).",
        scope: { count: 1, entities: [target] },
        impact: `Funcțiile care depind de ${target} sunt afectate. Verifică manual log-urile containerului.`,
        trend: computeTrend(events),
        actionRequired: `Investighează manual: docker logs ${target}. Dacă e reparabil, restart manual. Dacă nu, escaladare.`,
        eventIds: events.map((e) => e.id),
        firstSeenAt: first,
        lastSeenAt: last,
      }
    },
  },

  // ── R4: Workflow n8n cu rată mare de eșec ────────────────────────────────────
  {
    name: "workflow_fail_rate",
    matches: (e) =>
      e.class === "D1_TECHNICAL" &&
      e.targetType === "WORKFLOW" &&
      e.status === "OPEN",
    clusterKey: (e) => `workflow:fail:${e.targetId}`,
    build: (events, key) => {
      const target = events[0].targetId
      const { first, last } = firstLast(events)
      return {
        id: key,
        classification: "DECISION_REQUIRED",
        severity: events.reduce<Situation["severity"]>(
          (acc, e) => maxSeverity(acc, e.severity),
          "LOW",
        ),
        title: `Workflow ${target}: rată de eșec ridicată`,
        cause:
          "Workflow-ul n8n eșuează peste pragul de toleranță. Auto-remedierea nu se aplică pe workflows — nu pot fi restartate ca servicii.",
        scope: { count: 1, entities: [target] },
        impact: `Automatizarea ${target} nu se execută fiabil. Verifică ce trigger-uri sau dependențe sunt sparte.`,
        trend: computeTrend(events),
        actionRequired:
          "Deschide n8n UI, verifică ultimele execuții, identifică nodul care eșuează.",
        eventIds: events.map((e) => e.id),
        firstSeenAt: first,
        lastSeenAt: last,
      }
    },
  },

  // ── R5: Cluster de roluri cu aceeași cauză (≥3) ──────────────────────────────
  {
    name: "role_cluster",
    matches: (e) =>
      e.class === "D2_FUNCTIONAL_MGMT" &&
      e.targetType === "ROLE" &&
      e.status === "OPEN",
    clusterKey: (e) => `role_cluster:${e.signal}`,
    build: (events, key) => {
      const roles = Array.from(new Set(events.map((e) => e.targetId))).sort()
      const signal = events[0].signal
      const { first, last } = firstLast(events)
      // Inactivitate si monotonie = CONFIG_NOISE, nu decizie Owner
      const isInactivityOrMonotony = /no_activity|no_cycles|monotone_/i.test(signal)
      return {
        id: key,
        classification: isInactivityOrMonotony ? "CONFIG_NOISE" as SituationClassification : "DECISION_REQUIRED",
        severity: events.reduce<Situation["severity"]>(
          (acc, e) => maxSeverity(acc, e.severity),
          "LOW",
        ),
        title: `${roles.length} roluri cu același semnal: ${signal}`,
        cause: `Cluster de ${roles.length} roluri raportează aceeași problemă funcțională. Probabil cauză sistemică comună, nu individuală.`,
        scope: { count: roles.length, entities: roles },
        impact:
          "Impact pe mai multe poziții organizaționale — cere diagnostic la nivel de proces, nu de rol individual.",
        trend: computeTrend(events),
        actionRequired:
          "Verifică cauza comună: config detector, schimbare arhitecturală recentă, dependență lipsă.",
        eventIds: events.map((e) => e.id),
        firstSeenAt: first,
        lastSeenAt: last,
      }
    },
  },

  // ── R6: Flux step stuck ──────────────────────────────────────────────────────
  {
    name: "flux_step_stuck",
    matches: (e) =>
      e.targetType === "FLUX_STEP" &&
      (e.status === "OPEN" || e.status === "ESCALATED"),
    clusterKey: (e) => `flux_stuck:${e.targetId}`,
    build: (events, key) => {
      const step = events[0].targetId
      const { first, last } = firstLast(events)
      return {
        id: key,
        classification: "DECISION_REQUIRED",
        severity: events.reduce<Situation["severity"]>(
          (acc, e) => maxSeverity(acc, e.severity),
          "LOW",
        ),
        title: `Flux step blocat: ${step}`,
        cause:
          "Un pas dintr-un flux business a depășit SLA-ul. Cineva așteaptă pe cineva să continue.",
        scope: { count: 1, entities: [step] },
        impact: `Fluxul care conține ${step} nu progresează. Verifică cine e responsabil pe pasul curent.`,
        trend: computeTrend(events),
        actionRequired:
          "Identifică rolul asignat la step, verifică de ce nu răspunde, escaladează dacă e necesar.",
        eventIds: events.map((e) => e.id),
        firstSeenAt: first,
        lastSeenAt: last,
      }
    },
  },

  // ── R7: Outcome business deviation ──────────────────────────────────────────
  // D3 events emise de outcome-health-monitor: underperforming, declining_trend,
  // measurement_gap. Clusterizate per signal type — Owner decide pe cluster.
  {
    name: "outcome_deviation",
    matches: (e) =>
      e.class === "D3_BUSINESS_PROCESS" &&
      e.detectorSource === "outcome-health-monitor" &&
      e.signal.startsWith("outcome_"),
    clusterKey: (e) => `outcome:${e.signal}`,
    build: (events, key) => {
      const services = Array.from(new Set(events.map((e) => e.targetId))).sort()
      const signal = events[0].signal.replace("outcome_", "")
      const { first, last } = firstLast(events)
      const sevLabels: Record<string, string> = {
        underperforming: "Sub target",
        declining_trend: "Trend descrescător",
        measurement_gap: "Lipsă date",
      }
      return {
        id: key,
        classification: "DECISION_REQUIRED",
        severity: events.reduce<Situation["severity"]>(
          (acc, e) => maxSeverity(acc, e.severity),
          "LOW",
        ),
        title: `${sevLabels[signal] ?? signal}: ${services.length} serviciu(i)`,
        cause: `Outcome monitor a detectat ${signal} pe ${services.join(", ")}. Verifică dacă e tendință reală sau context temporar.`,
        scope: { count: services.length, entities: services },
        impact:
          "Metrici de rezultat real sub așteptări — afectează capacitatea de a demonstra valoare către clienți.",
        trend: computeTrend(events),
        actionRequired:
          services.length === 1
            ? `Investighează ${services[0]}: cauza deviației, dacă target-ul e realist, dacă datele de colectare sunt corecte.`
            : `Verifică ${services.length} servicii afectate. Cauza poate fi sistemică (ex: lipsă clienți activi) sau individuală.`,
        eventIds: events.map((e) => e.id),
        firstSeenAt: first,
        lastSeenAt: last,
      }
    },
  },
]

// ── Aggregator principal ──────────────────────────────────────────────────────

/**
 * Agregă o listă de evenimente brute în situații contextualizate.
 *
 * Nu primește toate evenimentele din istorie — DOAR cele relevante pentru
 * decizia de moment (ex: OPEN + recent RESOLVED într-o fereastră configurabilă).
 * Apelantul decide ce trimite.
 */
export function aggregateSituations(events: EventInput[]): Situation[] {
  const clustersByKey = new Map<
    string,
    { rule: Rule; events: EventInput[] }
  >()
  const unmatched: EventInput[] = []

  for (const event of events) {
    let matched = false
    for (const rule of RULES) {
      if (rule.matches(event)) {
        const key = rule.clusterKey(event)
        const entry = clustersByKey.get(key)
        if (entry) {
          entry.events.push(event)
        } else {
          clustersByKey.set(key, { rule, events: [event] })
        }
        matched = true
        break
      }
    }
    if (!matched) unmatched.push(event)
  }

  const situations: Situation[] = []

  for (const [key, { rule, events: clusterEvents }] of clustersByKey) {
    // Pentru R5 (role_cluster), aplicăm pragul minim: <3 înseamnă "single role",
    // care merge la fallback de mai jos.
    if (rule.name === "role_cluster") {
      const uniqueRoles = new Set(clusterEvents.map((e) => e.targetId))
      if (uniqueRoles.size < ROLE_CLUSTER_MIN) {
        unmatched.push(...clusterEvents)
        continue
      }
    }
    situations.push(rule.build(clusterEvents, key))
  }

  // Fallback: evenimente unmatched devin situații individuale
  // D2 single-role cu semnal REAL (nu inactivitate/monotonie) → DECISION_REQUIRED
  // D2 single-role cu inactivitate/monotonie → CONFIG_NOISE (nu e decizie Owner)
  // Orice altceva → CONFIG_NOISE
  for (const e of unmatched) {
    const isOpenD2Role =
      e.class === "D2_FUNCTIONAL_MGMT" &&
      e.targetType === "ROLE" &&
      e.status === "OPEN"
    const isInactivityOrMonotony = /no_activity|no_cycles|monotone_|dormant|reactivare/i.test(e.signal)
    const isRealDecision = isOpenD2Role && !isInactivityOrMonotony
    const { first, last } = firstLast([e])
    situations.push({
      id: `single:${e.targetType}:${e.targetId}:${e.signal}`,
      classification: isRealDecision ? "DECISION_REQUIRED" : "CONFIG_NOISE",
      severity: e.severity,
      title: isOpenD2Role
        ? `Rol ${e.targetId}: ${e.signal}`
        : `Eveniment neclasificat: ${e.targetId}`,
      cause: isOpenD2Role
        ? `Un singur rol (${e.targetId}) raportează ${e.signal}. Izolat, nu cluster — verifică dacă e configurare sau problemă reală.`
        : "Eveniment care nu se încadrează în nicio regulă cunoscută. Probabil zgomot de config.",
      scope: { count: 1, entities: [e.targetId] },
      impact: isOpenD2Role
        ? `Verifică rolul ${e.targetId} individual.`
        : "Verifică și extinde regulile de clusterizare dacă pattern-ul se repetă.",
      trend: computeTrend([e]),
      actionRequired: isOpenD2Role
        ? "Decide dacă e semnal real sau ajustare de config pe activityMode."
        : "Notează pentru revizie periodică a regulilor de clusterizare.",
      eventIds: [e.id],
      firstSeenAt: first,
      lastSeenAt: last,
    })
  }

  // Sortare: DECISION_REQUIRED întâi (pe severity desc), apoi AUTO_REMEDIATING,
  // apoi KNOWN_GAP_ACCEPTED, apoi CONFIG_NOISE.
  const classOrder = {
    DECISION_REQUIRED: 0,
    AUTO_REMEDIATING: 1,
    KNOWN_GAP_ACCEPTED: 2,
    CONFIG_NOISE: 3,
  }
  const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  situations.sort((a, b) => {
    const byClass = classOrder[a.classification] - classOrder[b.classification]
    if (byClass !== 0) return byClass
    return sevOrder[a.severity] - sevOrder[b.severity]
  })

  return situations
}

/**
 * Sumar rapid — pentru header-ul cockpit-ului.
 */
export function summarizeSituations(situations: Situation[]): {
  total: number
  decisionRequired: number
  autoRemediating: number
  knownGap: number
  configNoise: number
  topDecision: Situation | null
} {
  const decisionRequired = situations.filter(
    (s) => s.classification === "DECISION_REQUIRED",
  )
  return {
    total: situations.length,
    decisionRequired: decisionRequired.length,
    autoRemediating: situations.filter((s) => s.classification === "AUTO_REMEDIATING")
      .length,
    knownGap: situations.filter((s) => s.classification === "KNOWN_GAP_ACCEPTED")
      .length,
    configNoise: situations.filter((s) => s.classification === "CONFIG_NOISE").length,
    topDecision: decisionRequired[0] ?? null,
  }
}
