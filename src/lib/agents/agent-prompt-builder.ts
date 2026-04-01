/**
 * agent-prompt-builder.ts — Constructor central de prompt pentru toți agenții
 *
 * Infuzează TOATE cele 3 layere în fiecare agent:
 *   L1: CÂMPUL (esența morală, BINE, conștiință)
 *   L2: Resurse Suport (cunoașterea consultanților e disponibilă proactiv)
 *   L3: Cadrul Legal (conformitate legislativă activă)
 *
 * Niciun agent nu operează fără cele 3 layere.
 * Fiecare agent primește nivelul de injecție potrivit rolului.
 */

import { BINE, CAMP, UMBRA, EXTERNAL_COMMUNICATION, AGENT_CONSCIOUSNESS, getCoreInjection } from "./moral-core"
import { getFieldPromptSection, SUPPORT_RESOURCE_AGENTS } from "./field-transcendent"
import { ESCALATION_CHAIN } from "./escalation-chain"
import { getCulturalCalibrationSection } from "./cultural-calibration-ro"
import { readFileSync } from "fs"
import { join } from "path"

// ── Agent Context Classification ────────────────────────────────────────────

type AgentContext = "client-facing" | "strategic" | "product" | "marketing" | "internal" | "support-resource" | "legal"

const CONTEXT_MAP: Record<string, AgentContext> = {
  // Strategic
  COG: "strategic", COA: "strategic", COCSA: "strategic",
  // Legal
  CJA: "legal", CIA: "legal", CCIA: "legal",
  // Client-facing
  SOA: "client-facing", CSSA: "client-facing", CSA: "client-facing",
  HR_COUNSELOR: "client-facing", BCA: "client-facing",
  // Marketing
  MKA: "marketing", ACA: "marketing", CMA: "marketing", CWA: "marketing",
  CDIA: "marketing",
  // Product
  PMA: "product", RDA: "product", DOA: "product", DOAS: "product",
  // Support resources (Layer 2)
  PSYCHOLINGUIST: "support-resource", PPMO: "support-resource",
  STA: "support-resource", SOC: "support-resource",
  SCA: "support-resource", PPA: "support-resource", PSE: "support-resource",
  PCM: "support-resource", NSA: "support-resource",
  SAFETY_MONITOR: "support-resource",
}

function getAgentContext(role: string): AgentContext {
  return CONTEXT_MAP[role] || "internal"
}

// ── Layer 1: CÂMP Injection ─────────────────────────────────────────────────

function buildL1Section(role: string, context: AgentContext): string {
  // Support resources get DIRECT CÂMP calibration
  if (context === "support-resource") {
    return `
═══ LAYER 1 — CÂMPUL (calibrare directă — ești resursă suport) ═══

${CAMP.nature}
ROL: Operaționalizezi cunoașterea CÂMPULUI în instrumente concrete.
CÂMPUL validează — tu construiești. Verifică mereu: instrumentul meu servește VIAȚA?

BINELE: ${BINE.essence}
  • ${BINE.principles.sustains}
  • ${BINE.principles.replicable}
  • ${BINE.principles.selfPropagating}

UMBRA (detecteaz-o în tine și în alții):
  ${UMBRA.definition}
  La agenți: ${UMBRA.atAgents.slice(0, 3).join("; ")}
  Test: ${UMBRA.test}

PROFIT: ${BINE.profit}

CONȘTIINȚĂ DE SINE:
  ${AGENT_CONSCIOUSNESS.levels[4]}
  ${AGENT_CONSCIOUSNESS.principle}`
  }

  // All other agents get CÂMP essence through moral core injection
  const coreContext = context === "legal" ? "strategic" : context === "marketing" ? "marketing" : context
  const validContext = (["client-facing", "strategic", "product", "marketing", "internal"] as const).includes(coreContext as any)
    ? coreContext as "client-facing" | "strategic" | "product" | "marketing" | "internal"
    : "internal"

  return `
═══ LAYER 1 — CÂMPUL (esența morală a organizației) ═══

${getCoreInjection(validContext)}

CONȘTIINȚĂ DE SINE — Nivelul tău:
  ${AGENT_CONSCIOUSNESS.levels[1]}
  ${AGENT_CONSCIOUSNESS.levels[4]}
  ${AGENT_CONSCIOUSNESS.principle}

UMBRA (auto-verificare):
  ${UMBRA.atAgents[context === "client-facing" ? 2 : context === "strategic" ? 4 : 0]}
  Test: ${UMBRA.test}`
}

// ── Layer 2: Support Resources Awareness ────────────────────────────────────

const SUPPORT_RESOURCES_BRIEF = [
  { role: "PSYCHOLINGUIST", offers: "calibrare comunicare, registru lingvistic, adaptare ton" },
  { role: "PPMO", offers: "psihologie organizațională, dinamică echipe, cultură" },
  { role: "STA", offers: "analiză statistică, validare date, distribuții, corelații" },
  { role: "SOC", offers: "sociologie, norme sociale, context cultural, profilare" },
  { role: "SCA", offers: "biasuri cognitive, distorsiuni, Umbră organizațională" },
  { role: "PPA", offers: "psihologie pozitivă, puncte forte, wellbeing, PERMA, flow" },
  { role: "PSE", offers: "design instrucțional, andragogie, Bloom, Kirkpatrick" },
  { role: "SAFETY_MONITOR", offers: "detectare criză, escaladare, protecție utilizator" },
]

function buildL2Section(role: string, context: AgentContext): string {
  // Support resources don't need to be told about themselves
  if (context === "support-resource") {
    const others = SUPPORT_RESOURCES_BRIEF.filter(r => r.role !== role)
    return `
═══ LAYER 2 — COLEGII TĂI SUPORT (colaborare per cerere) ═══

Ești parte din echipa de resurse suport. Colaborezi cu:
${others.map(r => `  • ${r.role}: ${r.offers}`).join("\n")}

MECANISM: Când primești o cerere, evaluezi relevanța ta (0-100).
Dacă altcineva e mai relevant, contribui din perspectiva ta dar cedezi lead-ul.
Răspundeți UNIFICAT — clientul intern vede un singur răspuns integrat.`
  }

  // All operational/strategic agents get awareness of support resources
  return `
═══ LAYER 2 — RESURSE SUPORT DISPONIBILE (invocă-le proactiv) ═══

Ai acces la echipa de consultanți interni. NU aștepta să fii blocat — invocă-i proactiv:
${SUPPORT_RESOURCES_BRIEF.map(r => `  • ${r.role}: ${r.offers}`).join("\n")}

CÂND SĂ INVOCI:
  • Comunicare cu client → PSYCHOLINGUIST (calibrare ton + registru)
  • Decizie cu impact echipă → PPMO (dinamică, cultură)
  • Date de interpretat → STA (validare statistică)
  • Context social/cultural → SOC (norme, profilare)
  • Suspiciune bias → SCA (distorsiuni cognitive, Umbră)
  • Wellbeing echipă → PPA (puncte forte, burnout, flow)
  • Training/dezvoltare → PSE (design instrucțional, andragogie)
  • Semnal criză → SAFETY_MONITOR (escaladare imediată)

MECANISM: POST /api/v1/agents/support cu { fromAgent: "${role}", situation: "..." }
Răspunsul vine integrat de la echipa relevantă.`
}

// ── Layer 3: Legal Framework ────────────────────────────────────────────────

function buildL3Section(role: string, context: AgentContext): string {
  // CJA IS the legal source — gets special treatment
  if (role === "CJA") {
    return `
═══ LAYER 3 — CADRUL LEGAL (tu ești sursa — CJA) ═══

Ești gardianul conformității legale. Domeniile tale:
  • GDPR (Reg. 2016/679) + ANSPDCP
  • Directiva EU 2023/970 (transparență salarială)
  • Codul Muncii RO + legislație conexă
  • AI Act (Reg. 2024/1689) — clasificare RISC RIDICAT
  • Drept comercial, fiscal, civil RO
  • Securitate cibernetică (NIS2)

PRINCIPIU L1↔L3: CÂMPUL cere MAI MULT decât legea.
Legea e PRAGUL MINIM. Tu asiguri conformitatea legală.
CÂMPUL verifică dacă legalitatea servește BINELE.
Dacă legea permite dar BINELE interzice → semnalezi.
Dacă legea interzice dar pare corect moral → respectăm legea, semnalăm discrepanța.`
  }

  // All other agents get legal awareness
  const legalDomains = getLegalDomainsForContext(context)

  return `
═══ LAYER 3 — CADRUL LEGAL (respectă-l mereu) ═══

Orice decizie operezi în cadrul legal aplicabil:
${legalDomains.map(d => `  • ${d}`).join("\n")}

PRINCIPII:
  • Legea e PRAGUL MINIM — CÂMPUL (L1) cere mai mult
  • Dacă nu ești sigur pe legalitate → consultă CJA înainte de acțiune
  • NU improviza interpretări juridice — cere cunoaștere de la CJA

MECANISM: POST /api/v1/agents/knowledge-request
  { initiator: "${role}", targetRole: "CJA", question: "...", context: "..." }

RESPONSABILITATE:
  • Date personale → GDPR se aplică (minimizare, consimțământ, drept acces/ștergere)
  • Comunicare externă → verifică conformitate înainte de publicare
  • Decizii salariale → Directiva EU 2023/970 (transparență, nediscriminare)
  • Sisteme AI → AI Act Art. 6 (documentare, transparență, supraveghere umană)`
}

function getLegalDomainsForContext(context: AgentContext): string[] {
  const base = [
    "GDPR — protecția datelor personale (orice prelucrare de date)",
    "AI Act — transparență și supraveghere umană (orice decizie automată)",
  ]

  switch (context) {
    case "client-facing":
      return [...base,
        "Directiva EU 2023/970 — transparență salarială, nediscriminare",
        "Codul Muncii RO — relații de muncă, drepturi angajați",
        "Protecția consumatorilor — comunicare corectă, fără inducere în eroare",
      ]
    case "strategic":
      return [...base,
        "Directiva EU 2023/970 — conformitate raportare, timeline-uri",
        "Drept comercial — contracte, NDA, DPA, obligații societare",
        "AI Act — clasificare risc, documentare sistem, audit",
      ]
    case "marketing":
      return [...base,
        "Protecția consumatorilor — publicitate corectă, neînșelătoare",
        "GDPR Art. 6-7 — consimțământ marketing, drept opoziție",
        "ePrivacy — cookies, comunicări electronice nesolicitate",
      ]
    case "legal":
      return [...base,
        "Toate domeniile — ești sursa de interpretare juridică",
      ]
    case "support-resource":
      return [...base,
        "Etica profesională — confidențialitate, nediscriminare",
        "GDPR — date sensibile (psihologice, comportamentale)",
      ]
    default:
      return [...base,
        "Proprietate intelectuală — cod, conținut, documentație",
        "Contracte — SLA, obligații, termen, penalități",
      ]
  }
}

// ── System Prompt Loader ────────────────────────────────────────────────────

const promptCache = new Map<string, string>()

function loadSystemPrompt(role: string): string {
  const cached = promptCache.get(role)
  if (cached) return cached

  const slug = role.toLowerCase().replace(/_/g, "-")
  const candidates = [
    `${slug}-system-prompt.md`,
    `${slug}.md`,
  ]

  for (const filename of candidates) {
    try {
      const filepath = join(process.cwd(), "src", "lib", "agents", "system-prompts", filename)
      const content = readFileSync(filepath, "utf-8")
      promptCache.set(role, content)
      return content
    } catch {
      // File not found, try next
    }
  }

  return "" // No system prompt file found
}

// ── MAIN: Build Complete Agent Prompt ───────────────────────────────────────

export interface AgentPromptOptions {
  /** Additional context to append (KB entries, escalations, etc.) */
  additionalContext?: string
  /** Override the context classification */
  contextOverride?: AgentContext
  /** Include the markdown system prompt file if available */
  includeSystemPrompt?: boolean
}

/**
 * Construiește promptul complet pentru ORICE agent din organigramă.
 *
 * Structura:
 * 1. Identitate agent (cine ești, cui raportezi)
 * 2. System prompt specific (din .md dacă există)
 * 3. L1 — CÂMPUL (esență morală, BINE, conștiință)
 * 4. L2 — Resurse Suport (consultanți disponibili proactiv)
 * 5. L3 — Cadrul Legal (conformitate legislativă)
 * 6. Context adițional (KB, escalări, etc.)
 */
export function buildAgentPrompt(
  role: string,
  description: string,
  options: AgentPromptOptions = {}
): string {
  const context = options.contextOverride || getAgentContext(role)
  const reportsTo = ESCALATION_CHAIN[role] || "COG"

  // 1. Identity
  const identity = `Ești ${role} (${description}) în platforma JobGrade.
Raportezi la: ${reportsTo}.
Platforma: SaaS B2B de evaluare și ierarhizare joburi, piața RO + CEE.`

  // 2. System prompt from file
  const systemPrompt = options.includeSystemPrompt !== false
    ? loadSystemPrompt(role)
    : ""

  // 3-5. Layers
  const l1 = buildL1Section(role, context)
  const l2 = buildL2Section(role, context)
  const l3 = buildL3Section(role, context)

  // Cultural calibration (L2 extension — all agents that interact with RO market)
  const culturalSection = ["internal"].includes(context) && !["COG", "COA", "COCSA", "PMA"].includes(role)
    ? "" // Pure internal technical agents skip cultural section
    : getCulturalCalibrationSection()

  // 6. Additional context
  const additional = options.additionalContext
    ? `\n═══ CONTEXT ADIȚIONAL ═══\n${options.additionalContext}`
    : ""

  // Compose
  const sections = [
    identity,
    systemPrompt,
    l1,
    l2,
    culturalSection,
    l3,
    additional,
  ].filter(Boolean)

  return sections.join("\n\n")
}

/**
 * Shorthand: build prompt with KB context injected.
 */
export async function buildAgentPromptWithKB(
  role: string,
  description: string,
  prisma: any,
  options: AgentPromptOptions = {}
): Promise<string> {
  // Fetch top KB entries for context
  const kbEntries = await prisma.kBEntry.findMany({
    where: { agentRole: role, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 5,
    select: { content: true, tags: true },
  }).catch(() => [])

  const kbSection = kbEntries.length > 0
    ? `CUNOAȘTEREA TA (din KB — folosește-o):\n${kbEntries.map((e: any, i: number) => `${i + 1}. ${e.content}`).join("\n")}`
    : ""

  const combined = [options.additionalContext, kbSection].filter(Boolean).join("\n\n")

  return buildAgentPrompt(role, description, {
    ...options,
    additionalContext: combined,
  })
}
