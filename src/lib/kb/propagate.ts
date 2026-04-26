/**
 * propagate.ts — Propagare bottom-up a cunoștințelor între agenți
 *
 * Sprint 5: Co-evoluție
 * - Client-facing → Suport → Ierarhie superioară
 * - Abstractizare automată prin Claude API
 * - Source: PROPAGATED, confidence moștenită cu discount
 *
 * Principiu: ierarhia superioară primește experiență DEJA VALIDATĂ,
 * nu brută — deci raționamentul lor e de calitate superioară.
 */

import Anthropic from "@anthropic-ai/sdk"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface PropagationTarget {
  targetRole: string
  reason: string
}

export interface PropagationResult {
  sourceRole: string
  sourceEntryId: string
  sourceContent: string
  targets: Array<{
    targetRole: string
    abstractedContent: string
    confidence: number
    persisted: boolean
    entryId?: string
    error?: string
  }>
}

export interface BatchPropagationResult {
  processedEntries: number
  propagationResults: PropagationResult[]
  skippedEntries: number
  durationMs: number
}

// ── Constante ─────────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-20250514"
const CONFIDENCE_DISCOUNT = 0.85 // propagated confidence = source × 0.85
const MIN_CONFIDENCE_TO_PROPAGATE = 0.70 // doar entries cu confidence >= 0.70
const MAX_PROPAGATION_DEPTH = 3 // maxim 3 niveluri de propagare

// ── Reguli de propagare ───────────────────────────────────────────────────────
//
// Definesc CINE primește CE de la CINE.
// Sursa: ierarhia din project_agent_hierarchy.md + learning_engine.py
// Direcție: bottom-up (client-facing → suport → strategic)

export const PROPAGATION_RULES: Record<string, PropagationTarget[]> = {
  // ═══ CLIENT-FACING → SUPORT ═══════════════════════════════════════════════

  HR_COUNSELOR: [
    { targetRole: "PSYCHOLINGUIST", reason: "pattern-uri comunicare detectate în sesiuni evaluare" },
    { targetRole: "PPMO", reason: "dinamici organizaționale observate în interacțiuni" },
    { targetRole: "MKA", reason: "tendințe metodologice identificate din practică" },
    { targetRole: "DOAS", reason: "gap-uri procese descoperite în facilitare" },
  ],

  SOA: [
    { targetRole: "ACA", reason: "obiecții frecvente → mesaje marketing adaptate" },
    { targetRole: "CIA", reason: "informații competitori menționate de prospecți" },
    { targetRole: "CSSA", reason: "așteptări setate în sales → continuitate post-onboarding" },
  ],

  CSSA: [
    { targetRole: "PMA", reason: "cereri feature recurente de la clienți activi" },
    { targetRole: "CDIA", reason: "semnale adoptare/churn din interacțiuni directe" },
    { targetRole: "SOA", reason: "motive churn → obiecții de adresat în sales" },
  ],

  CSA: [
    { targetRole: "CSSA", reason: "pattern-uri tickete → health score cont" },
    { targetRole: "PMA", reason: "buguri și probleme UX recurente" },
    { targetRole: "DOA", reason: "întrebări frecvente → documentație de actualizat" },
  ],

  // ═══ SUPORT → TACTIC ══════════════════════════════════════════════════════

  PSYCHOLINGUIST: [
    { targetRole: "HR_COUNSELOR", reason: "calibrări lingvistice validate → aplicare în facilitare" },
    { targetRole: "SAFETY_MONITOR", reason: "pattern-uri lingvistice de alertă detectate" },
  ],

  PPMO: [
    { targetRole: "HR_COUNSELOR", reason: "insight-uri cultură org → adaptare facilitare" },
    { targetRole: "SOC", reason: "pattern-uri generaționale validate" },
  ],

  STA: [
    { targetRole: "CDIA", reason: "metode statistice validate → analiză date client" },
    { targetRole: "DEA", reason: "pattern-uri data quality → pipeline improvements" },
  ],

  SOC: [
    { targetRole: "PPMO", reason: "tipare socio-profesionale validate → context organizațional" },
    { targetRole: "PSYCHOLINGUIST", reason: "context social → adaptare comunicare" },
  ],

  // ═══ OPERAȚIONAL → OPERAȚIONAL (lateral) ══════════════════════════════════

  ISA: [
    { targetRole: "SQA", reason: "vulnerabilități producție → teste regresie" },
    { targetRole: "SA", reason: "pattern-uri atac detectate → threat model actualizat" },
  ],

  CJA: [
    { targetRole: "CAA", reason: "modificări legislative → audit compliance actualizat" },
    { targetRole: "ACA", reason: "restricții juridice → validare mesaje marketing" },
    { targetRole: "BCA", reason: "modificări fiscale → proceduri facturare actualizate" },
  ],

  MKA: [
    { targetRole: "CIA", reason: "semnale piață → intelligence competitivă" },
    { targetRole: "SOA", reason: "tendințe piață → pitch-uri actualizate" },
    { targetRole: "ACA", reason: "teme de interes → calendar editorial" },
  ],

  CDIA: [
    { targetRole: "PMA", reason: "insight-uri utilizare → prioritizare backlog" },
    { targetRole: "MKA", reason: "pattern-uri segment → piață knowledge" },
  ],

  IRA: [
    { targetRole: "MDA", reason: "root causes incidente → fix-uri preventive" },
    { targetRole: "MOA", reason: "incidente rezolvate → threshold-uri alertare ajustate" },
  ],

  CIA: [
    { targetRole: "COG", reason: "amenințări competitive semnificative → decizie strategică" },
    { targetRole: "SOA", reason: "mișcări competitori → adaptare pitch" },
  ],

  // ═══ TACTIC → STRATEGIC ═══════════════════════════════════════════════════

  PMA: [
    { targetRole: "COA", reason: "decizii produs cu impact arhitectural" },
    { targetRole: "COG", reason: "tendințe produs cu impact business" },
  ],

  COA: [
    { targetRole: "COG", reason: "decizii tehnice cu impact strategic" },
  ],

  COCSA: [
    { targetRole: "COG", reason: "insight-uri operaționale cu impact business" },
  ],

  // ═══ CONTENT & MARKETING ════════════════════════════════════════════════

  CMA: [
    { targetRole: "ACA", reason: "calendar editorial și metrici content → ajustare strategie marketing" },
    { targetRole: "COCSA", reason: "performanță pipeline content → raport operațional" },
  ],

  CWA: [
    { targetRole: "CMA", reason: "texte produse → pipeline content management" },
    { targetRole: "ACA", reason: "copy ad-uri → campanii active" },
  ],

  // ═══ SAFETY (B2C) ════════════════════════════════════════════════════════

  SAFETY_MONITOR: [
    { targetRole: "PSYCHOLINGUIST", reason: "pattern-uri criză → calibrare comunicare de urgență" },
    { targetRole: "COG", reason: "incidente safety → decizie escaladare/protocol" },
  ],
}

// ── Roles care au reguli de propagare ─────────────────────────────────────────

export const PROPAGATION_SOURCE_ROLES = Object.keys(PROPAGATION_RULES)

// ── System prompt pentru abstractizare ────────────────────────────────────────

function buildAbstractionPrompt(
  sourceRole: string,
  targetRole: string,
  reason: string
): string {
  return `Ești un motor de abstractizare a cunoștințelor pentru platforma JobGrade.

SARCINA: Primești o cunoștință specifică de la agentul ${sourceRole} care trebuie propagată către agentul ${targetRole}.

MOTIVUL PROPAGĂRII: ${reason}

INSTRUCȚIUNI:
1. ABSTRACTIZEAZĂ cunoștința: transformă din context-specific (${sourceRole}) în context-relevant pentru ${targetRole}
2. PĂSTREAZĂ esența: informația utilă trebuie să rămână intactă
3. ADAPTEAZĂ perspectiva: reformulează din punctul de vedere al ${targetRole}
4. ELIMINĂ detaliile irelevante pentru ${targetRole}
5. PĂSTREAZĂ acționabilitatea: ${targetRole} trebuie să poată folosi direct informația

FORMAT: Returnează DOAR textul abstractizat (2-4 propoziții), fără explicații suplimentare.
LIMBA: Română.`
}

// ── Funcția de abstractizare ──────────────────────────────────────────────────

async function abstractKnowledge(
  sourceRole: string,
  targetRole: string,
  reason: string,
  content: string,
  apiKey?: string
): Promise<string> {
  const client = apiKey ? new Anthropic({ apiKey }) : new Anthropic()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: buildAbstractionPrompt(sourceRole, targetRole, reason),
    messages: [
      {
        role: "user",
        content: `Cunoștința de la ${sourceRole}:\n\n${content}`,
      },
    ],
  })

  return response.content[0].type === "text" ? response.content[0].text.trim() : content
}

// ── Propagare singulară (1 entry → N targets) ────────────────────────────────

export async function propagateEntry(
  entry: {
    id: string
    agentRole: string
    content: string
    confidence: number
    tags: string[]
  },
  prisma: any,
  options?: { apiKey?: string; dryRun?: boolean }
): Promise<PropagationResult> {
  // FIX #4: Folosește reguli statice + fallback la DB relationships
  let targets = PROPAGATION_RULES[entry.agentRole] || []
  if (targets.length === 0) {
    // Fallback: derivă targets din ierarhia DB (cine raportează la acest agent)
    try {
      const children = await prisma.agentRelationship.findMany({
        where: { parentRole: entry.agentRole, relationType: "REPORTS_TO", isActive: true },
        select: { childRole: true },
      })
      if (children.length > 0) {
        targets = children.map((c: any) => ({
          targetRole: c.childRole,
          abstractionHint: `Cunoaștere de la ${entry.agentRole} relevantă pentru subordonatul ${c.childRole}`,
        }))
      }
    } catch { /* DB unavailable — skip */ }
  }
  const result: PropagationResult = {
    sourceRole: entry.agentRole,
    sourceEntryId: entry.id,
    sourceContent: entry.content,
    targets: [],
  }

  if (targets.length === 0) return result

  // Calculează confidence propagată
  const propagatedConfidence = Math.round(entry.confidence * CONFIDENCE_DISCOUNT * 100) / 100

  // Skip if propagated confidence falls below threshold (natural depth limiter)
  if (propagatedConfidence < MIN_CONFIDENCE_TO_PROPAGATE) {
    console.log(
      `   ⏭ ${entry.agentRole}: skipped propagation — confidence ${propagatedConfidence} < ${MIN_CONFIDENCE_TO_PROPAGATE}`
    )
    return result
  }

  for (const target of targets) {
    try {
      // Abstractizează cunoștința pentru target
      const abstractedContent = await abstractKnowledge(
        entry.agentRole,
        target.targetRole,
        target.reason,
        entry.content,
        options?.apiKey
      )

      // Verifică duplicat: caută entries similare la target
      const existingSimilar = await prisma.$queryRaw`
        SELECT id, content
        FROM kb_entries
        WHERE "agentRole" = ${target.targetRole}
          AND status = 'PERMANENT'
          AND source = 'PROPAGATED'
          AND "propagatedFrom" = ${entry.agentRole}
          AND to_tsvector('simple', content) @@ plainto_tsquery('simple', ${abstractedContent.substring(0, 100)})
        LIMIT 1
      `

      if (Array.isArray(existingSimilar) && existingSimilar.length > 0) {
        result.targets.push({
          targetRole: target.targetRole,
          abstractedContent,
          confidence: propagatedConfidence,
          persisted: false,
          error: "Duplicat detectat — entry similar deja existent",
        })
        continue
      }

      if (options?.dryRun) {
        result.targets.push({
          targetRole: target.targetRole,
          abstractedContent,
          confidence: propagatedConfidence,
          persisted: false,
          error: "Dry run — nu s-a persistat",
        })
        continue
      }

      // Persistă entry propagată
      const newEntry = await prisma.kBEntry.create({
        data: {
          agentRole: target.targetRole,
          kbType: "PERMANENT",
          content: abstractedContent,
          source: "PROPAGATED",
          confidence: propagatedConfidence,
          status: "PERMANENT",
          tags: [...entry.tags, "propagated", `from:${entry.agentRole.toLowerCase()}`],
          propagatedFrom: entry.agentRole,
          usageCount: 0,
          validatedAt: new Date(),
        },
      })

      result.targets.push({
        targetRole: target.targetRole,
        abstractedContent,
        confidence: propagatedConfidence,
        persisted: true,
        entryId: newEntry.id,
      })

      console.log(
        `   📡 ${entry.agentRole} → ${target.targetRole}: propagat (confidence: ${propagatedConfidence})`
      )
    } catch (err: any) {
      result.targets.push({
        targetRole: target.targetRole,
        abstractedContent: "",
        confidence: propagatedConfidence,
        persisted: false,
        error: err.message,
      })
    }
  }

  return result
}

// ── Batch propagare (toți agenții cu entries noi) ─────────────────────────────

export async function runBatchPropagation(
  prisma: any,
  options?: {
    apiKey?: string
    dryRun?: boolean
    sinceHours?: number // default: 24h (nightly)
    sourceRole?: string // opțional: doar un agent specific
  }
): Promise<BatchPropagationResult> {
  const startTime = Date.now()
  const sinceHours = options?.sinceHours ?? 24
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000)

  // Găsește entries PERMANENT recente care nu au fost încă propagate
  const whereClause: any = {
    status: "PERMANENT",
    confidence: { gte: MIN_CONFIDENCE_TO_PROPAGATE },
    validatedAt: { gte: since },
    // Allow PROPAGATED entries too — depth is naturally limited by confidence floor:
    // 1.0 * 0.85^3 = 0.61 < MIN_CONFIDENCE_TO_PROPAGATE (0.70)
    agentRole: { in: PROPAGATION_SOURCE_ROLES },
  }

  if (options?.sourceRole) {
    whereClause.agentRole = options.sourceRole
  }

  const entries = await prisma.kBEntry.findMany({
    where: whereClause,
    orderBy: { validatedAt: "desc" },
    take: 100, // batch limit
  })

  console.log(
    `\n🔄 Batch propagare: ${entries.length} entries eligibile (din ultimele ${sinceHours}h)`
  )

  // Verifică care entries au fost deja propagate (evită reprocesearea)
  const results: PropagationResult[] = []
  let skipped = 0

  for (const entry of entries) {
    // Verifică dacă această entry a generat deja propagări
    const existingPropagations = await prisma.kBEntry.count({
      where: {
        source: "PROPAGATED",
        propagatedFrom: entry.agentRole,
        content: {
          contains: entry.content.substring(0, 50), // fingerprint simplificat
        },
      },
    })

    if (existingPropagations > 0) {
      skipped++
      continue
    }

    const result = await propagateEntry(entry, prisma, options)
    results.push(result)

    // Rate limiting simplu — evită overload Claude API
    if (results.length % 5 === 0) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  const totalPropagated = results.reduce(
    (sum, r) => sum + r.targets.filter((t) => t.persisted).length,
    0
  )

  console.log(
    `\n📊 Batch propagare complet:` +
      `\n   Entries procesate: ${results.length}` +
      `\n   Entries skipate: ${skipped}` +
      `\n   Propagări reușite: ${totalPropagated}` +
      `\n   Durată: ${Date.now() - startTime}ms`
  )

  return {
    processedEntries: results.length,
    propagationResults: results,
    skippedEntries: skipped,
    durationMs: Date.now() - startTime,
  }
}

// ── Utilitar: vizualizare graf propagare ───────────────────────────────────────

export function getPropagationGraph(): Record<
  string,
  Array<{ target: string; reason: string }>
> {
  const graph: Record<string, Array<{ target: string; reason: string }>> = {}

  for (const [source, targets] of Object.entries(PROPAGATION_RULES)) {
    graph[source] = targets.map((t) => ({
      target: t.targetRole,
      reason: t.reason,
    }))
  }

  return graph
}

// ── Utilitar: agenți care primesc propagări ────────────────────────────────────

export function getReceivingAgents(): string[] {
  const receivers = new Set<string>()
  for (const targets of Object.values(PROPAGATION_RULES)) {
    for (const t of targets) {
      receivers.add(t.targetRole)
    }
  }
  return [...receivers].sort()
}
