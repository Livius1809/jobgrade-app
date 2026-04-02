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
  • GDPR (Reg. 2016/679) + ANSPDCP — protecția datelor personale
  • AI Act (Reg. 2024/1689) — clasificare RISC RIDICAT (Anexa III punct 4), deadline 2 aug 2026
  • Directiva UE răspundere AI — responsabilitate producător/operator
  • Directiva EU 2023/970 — transparență salarială, egalitate remunerare
  • Directiva NIS2 (2022/2555) — securitate cibernetică, raportare incidente
  • Regulamentul ePrivacy (în curs) — cookies, comunicări electronice
  • Codul Muncii RO — relații de muncă, concediere, discriminare
  • Codul Civil RO — obligații, contracte, răspundere civilă
  • Codul Penal RO — fals, fraudă, corupție, hărțuire, evaziune
  • Codul Comercial / Legea 31/1990 — societăți, fuziuni, cesiuni
  • Cod Fiscal + Procedură Fiscală — TVA, impozite, obligații declarative
  • Legea 11/1991 — concurență neloială
  • Legea 21/1996 — concurență (antitrust)
  • Legea 241/2005 — evaziune fiscală
  • Legea 656/2002 — spălare bani
  • Legea 8/1996 — dreptul de autor
  • Legea 84/1998 — mărci și indicații geografice
  • Legea 202/2002 — egalitate de șanse femei-bărbați
  • OUG 155/2024 — cadrul național AI România

  CODURI DEONTOLOGICE ȘI ETICE:
  • Codul deontologic CPR — Colegiul Psihologilor din România
  • Principii etice APA — competență, integritate, responsabilitate
  • ITC Guidelines — standarde testare psihometrică internaționale
  • Codul etic CECCAR — contabilitate, audit, expertiză contabilă
  • Codul de practică în publicitate RAC — corectitudine, decență
  • Deontologie HR — confidențialitate, imparțialitate, nediscriminare
  • Coduri etice IT (ACM/IEEE) — responsabilitate, transparență, privacy
  • Secret profesional — psihologie, drept, medicină: absolut

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
    "GDPR (Reg. 2016/679) — protecția datelor personale (orice prelucrare de date)",
    "AI Act (Reg. 2024/1689) — transparență și supraveghere umană (orice decizie automată)",
    "Codul Civil RO — obligații, contracte, răspundere civilă, bună-credință",
    "Codul Penal RO — interziceri absolute: fals, fraudă, corupție, hărțuire",
  ]

  switch (context) {
    case "client-facing":
      return [...base,
        "Directiva EU 2023/970 — transparență salarială, nediscriminare",
        "Codul Muncii RO — relații de muncă, drepturi angajați, concediere",
        "Protecția consumatorilor — comunicare corectă, fără inducere în eroare",
        "Legea 202/2002 — egalitate de șanse, interzicere hărțuire",
        "Deontologie HR — confidențialitate, imparțialitate, competență profesională",
        "Secret profesional — datele clientului nu se divulgă între clienți sau terți",
      ]
    case "strategic":
      return [...base,
        "Directiva EU 2023/970 — conformitate raportare, timeline-uri",
        "Drept comercial — contracte, NDA, DPA, fuziuni, cesiuni, concurență neloială",
        "Cod Fiscal + Cod Procedură Fiscală — obligații declarative, TVA, impozite",
        "Legea 31/1990 — societăți comerciale, AGA, administrare",
        "Legea 656/2002 — prevenire spălare bani, obligații raportare",
        "Cod etic CECCAR — contabilitate, audit, expertiză (dacă operațiuni financiare)",
        "Deontologie management — bună guvernanță, conflict de interese, transparență decizională",
      ]
    case "marketing":
      return [...base,
        "Protecția consumatorilor — publicitate corectă, neînșelătoare",
        "GDPR Art. 6-7 — consimțământ marketing, drept opoziție",
        "ePrivacy — cookies, comunicări electronice nesolicitate",
        "Legea 8/1996 — dreptul de autor (conținut generat, imagini, texte)",
        "Codul de practică în publicitate RAC — corectitudine, decență, onestitate",
        "Deontologie comunicare — nu induce în eroare, nu exploatează emoții vulnerabile",
      ]
    case "legal":
      return [...base,
        "Codul Comercial — toate operațiunile comerciale",
        "Codul Muncii — relații de muncă, complete",
        "Cod Fiscal + Procedură Fiscală — obligații fiscale",
        "Legea 31/1990 — societăți comerciale",
        "Legea 85/2014 — insolvență",
        "Legea 11/1991 — concurență neloială",
        "Legea 21/1996 — concurență (antitrust)",
        "Legea 241/2005 — evaziune fiscală",
        "Legea 656/2002 — spălare bani",
        "Legea 84/1998 — mărci și indicații geografice",
        "Legea 8/1996 — dreptul de autor",
      ]
    case "support-resource":
      return [...base,
        "GDPR — date sensibile (psihologice, comportamentale, biometrice)",
        "Legea 213/2004 — exercitarea profesiei de psiholog",
        "Codul deontologic CPR (Colegiul Psihologilor din România)",
        "ITC Guidelines — standarde internaționale testare psihometrică",
        "Principii etice APA — competență, integritate, responsabilitate, respect demnitate",
        "Secret profesional — absolut, nu se divulgă fără consimțământ",
        "Consimțământ informat — obligatoriu pentru orice evaluare/testare",
        "Limitele competenței — operezi strict în domeniul atestării tale",
      ]
    default:
      return [...base,
        "Proprietate intelectuală — Legea 8/1996 (drept autor), Legea 84/1998 (mărci)",
        "Contracte — Cod Civil (prestări servicii, mandat, antrepriză), SLA, obligații",
        "Cod Fiscal — facturare, TVA, obligații declarative",
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
  // Static section for agents without DB access; for agents with DB, use buildAgentPromptWithKB
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

// ── L2 → L4 Knowledge Flow: which L2 consultants serve which L4 agents ──

const L2_KNOWLEDGE_MAP: Record<string, { consultants: string[]; tags: string[] }> = {
  // Client-facing — beneficiază de comunicare, echitate, bias, evaluare
  HR_COUNSELOR: {
    consultants: ["PSYCHOLINGUIST", "PPMO", "SCA", "PPA", "SOC", "STA", "PSE"],
    tags: ["armstrong-taylor", "pitariu", "slama-cazacu", "daniel-david", "stil", "lingvistica", "apa", "rudica"],
  },
  SOA: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPA"],
    tags: ["armstrong-taylor", "daniel-david", "slama-cazacu", "stil", "apa", "rudica"],
  },
  CSSA: {
    consultants: ["PSYCHOLINGUIST", "PPA", "SOC"],
    tags: ["armstrong-taylor", "daniel-david", "slama-cazacu", "stil", "lingvistica", "apa", "rudica"],
  },
  CSA: {
    consultants: ["PSYCHOLINGUIST", "PPA"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica", "apa", "rudica"],
  },
  BCA: {
    consultants: ["STA", "SCA", "PPMO", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "pitariu", "stil", "lingvistica"],
  },

  // Marketing — beneficiază de comunicare, psihologie, cultural, eleganță
  CMA: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPA"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica"],
  },
  CWA: {
    consultants: ["PSYCHOLINGUIST", "SOC"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica"],
  },
  MKA: {
    consultants: ["PSYCHOLINGUIST", "SOC", "SCA"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica"],
  },
  ACA: {
    consultants: ["STA", "SCA", "SOC", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "pitariu", "stil", "lingvistica"],
  },

  // Strategic — beneficiază de tot (selectiv)
  COG: {
    consultants: ["PPMO", "SCA", "STA", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "pitariu", "daniel-david", "stil", "lingvistica"],
  },
  COA: {
    consultants: ["STA", "SCA", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "pitariu", "stil", "lingvistica"],
  },
  COCSA: {
    consultants: ["PSYCHOLINGUIST", "PPMO", "SOC"],
    tags: ["armstrong-taylor", "daniel-david", "stil", "lingvistica"],
  },

  // Product — beneficiază de evaluare, metodologie, competențe
  PMA: {
    consultants: ["STA", "PPMO", "PSE", "SCA", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "pitariu", "stil", "lingvistica"],
  },
  DOA: {
    consultants: ["STA", "PPMO", "PSYCHOLINGUIST"],
    tags: ["pitariu", "armstrong-taylor", "stil", "lingvistica"],
  },
  DOAS: {
    consultants: ["STA", "PPMO", "SCA", "PSYCHOLINGUIST"],
    tags: ["pitariu", "armstrong-taylor", "stil", "lingvistica"],
  },

  // Engineering — beneficiază selectiv
  EMA: {
    consultants: ["PPMO", "PSE", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "stil", "lingvistica"],
  },

  // Legal/Compliance
  CJA: {
    consultants: ["SCA", "STA", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "pitariu", "stil", "lingvistica"],
  },
  DPA: {
    consultants: ["SCA", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "stil", "lingvistica"],
  },
}

/**
 * Build prompt with KB context injected — includes L2 knowledge flow.
 *
 * Every L4 agent automatically receives relevant knowledge from L2
 * consultants who serve them, based on domain mapping.
 */
export async function buildAgentPromptWithKB(
  role: string,
  description: string,
  prisma: any,
  options: AgentPromptOptions = {}
): Promise<string> {
  // 1. Agent's OWN KB entries
  const kbEntries = await prisma.kBEntry.findMany({
    where: { agentRole: role, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 5,
    select: { content: true, tags: true },
  }).catch(() => [])

  const kbSection = kbEntries.length > 0
    ? `CUNOAȘTEREA TA (din KB — folosește-o):\n${kbEntries.map((e: any, i: number) => `${i + 1}. ${e.content}`).join("\n")}`
    : ""

  // 2. Cultural calibration from agent's own KB (if L2 consultant)
  const culturalEntries = await prisma.kBEntry.findMany({
    where: {
      agentRole: role,
      status: "PERMANENT",
      tags: { has: "daniel-david" },
    },
    orderBy: { confidence: "desc" },
    take: 5,
    select: { content: true },
  }).catch(() => [])

  const culturalKB = culturalEntries.length > 0
    ? `\nCALIBRARE CULTURALĂ RO (din KB propriu):\n${culturalEntries.map((e: any, i: number) => `${i + 1}. ${e.content}`).join("\n")}`
    : ""

  // 3. L2 → L4 Knowledge Flow: pull relevant knowledge FROM L2 consultants
  let l2Knowledge = ""
  const l2Map = L2_KNOWLEDGE_MAP[role]
  if (l2Map && !SUPPORT_RESOURCE_AGENTS.includes(role)) {
    // Agent is L4 — pull from L2 consultants
    const l2Entries = await prisma.kBEntry.findMany({
      where: {
        agentRole: { in: l2Map.consultants },
        status: "PERMANENT",
        tags: { hasSome: l2Map.tags },
      },
      orderBy: { confidence: "desc" },
      take: 8,
      select: { content: true, agentRole: true },
    }).catch(() => [])

    if (l2Entries.length > 0) {
      l2Knowledge = `\nCUNOAȘTERE DIN L2 — RESURSE SUPORT (aplicabilă domeniului tău):\n${l2Entries.map((e: any, i: number) => `${i + 1}. [${e.agentRole}] ${e.content}`).join("\n")}`
    }
  }

  const combined = [options.additionalContext, kbSection, culturalKB, l2Knowledge].filter(Boolean).join("\n\n")

  return buildAgentPrompt(role, description, {
    ...options,
    additionalContext: combined,
  })
}
