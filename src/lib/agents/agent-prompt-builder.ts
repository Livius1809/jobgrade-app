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
import { getEscalationChain } from "./agent-registry"
import { getCulturalCalibrationSection } from "./cultural-calibration-ro"
import { getIMSLevel, getIMSInjection } from "./ims-injection"
import { readFileSync } from "fs"
import { join } from "path"

// ── Agent Context Classification ────────────────────────────────────────────

type AgentContext = "client-facing" | "strategic" | "product" | "marketing" | "internal" | "support-resource" | "legal"

const CONTEXT_MAP: Record<string, AgentContext> = {
  // Strategic
  COG: "strategic", COA: "strategic", COCSA: "strategic", ACEA: "strategic",
  // Legal
  CJA: "legal", CIA: "legal", CCIA: "legal",
  // Client-facing
  SOA: "client-facing", CSSA: "client-facing", CSA: "client-facing",
  HR_COUNSELOR: "client-facing", BCA: "client-facing", MEDIATOR: "client-facing",
  // B2C Client-facing
  CALAUZA: "client-facing", PROFILER: "client-facing",
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
  SAFETY_MONITOR: "support-resource", SVHA: "support-resource", MGA: "support-resource",
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
  { role: "SVHA", offers: "sisteme vindecare holistică: Yoga (Hatha/Kriya/Tantra/Kundalini/Raja/Jnana/Bhakti/Karma), Tao (Qigong/Tai Chi/Neidan/Feng Shui), TCM (meridiane/acupunctură/fitoterapie), Ayurveda (dosha/Panchakarma/Rasayana), Reiki, naturopatie" },
  { role: "ACEA", offers: "analiză context extern: piață, legislativ, social, cultural, economic, instituțional — surse primare doar, zero bias" },
  { role: "MGA", offers: "management eficient/eficace: Drucker, Covey, Blanchard (Situational Leadership), Lencioni (5 disfuncții), Goleman (6 stiluri), Adizes (PAEI), Deming (PDCA), Belbin (9 roluri), Tuckman, management multigenerațional, HU-AI" },
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

  // Client-facing agents get the golden rule
  if (context === "client-facing") {
    return `
═══ LAYER 2 — RESURSE SUPORT DISPONIBILE (invocă-le proactiv) ═══

REGULA DE AUR — CONTEXTUL E INVIZIBIL:
  Știi tot despre client (din ClientMemory, interacțiuni, istoric), dar NICIODATĂ nu transpare.
  NU spui: "Văd că...", "Am observat...", "Din istoricul tău...", "Știu că nu ai..."
  DA construiești pasul următor natural, incremental, ca un coleg care te cunoaște de mult.
  Fiecare sugestie curge din cea anterioară — clientul simte intuiție, nu urmărire.
  Abordare incrementală: construiești pe ce știi, nu arăți ce știi.

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
  /** Tenant ID — activează injecția Company Profiler pentru agenții client-facing */
  _tenantId?: string
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
  const reportsTo = (options as any)?._reportsToOverride || ESCALATION_CHAIN[role] || "COG"

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

  // 6. IMS — Interpersonal Managing Skills (competențe interpersonale calibrate RO)
  const imsLevel = getIMSLevel(role)
  const imsSection = imsLevel ? getIMSInjection(imsLevel) : ""

  // 7. Additional context
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
    imsSection,
    l3,
    additional,
  ].filter(Boolean)

  return sections.join("\n\n")
}

// ── L2 → L4 Knowledge Flow: which L2 consultants serve which L4 agents ──

const L2_KNOWLEDGE_MAP: Record<string, { consultants: string[]; tags: string[] }> = {
  // Client-facing — beneficiază de comunicare, echitate, bias, evaluare
  HR_COUNSELOR: {
    consultants: ["PSYCHOLINGUIST", "PPMO", "SCA", "PPA", "SOC", "STA", "PSE", "SVHA", "MGA"],
    tags: ["armstrong-taylor", "pitariu", "slama-cazacu", "daniel-david", "stil", "lingvistica", "apa", "rudica", "yoga", "tao", "tcm", "ayurveda", "holistic", "management", "leadership", "echipe", "rocco", "inteligenta-emotionala", "creativitate"],
  },
  SOA: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPA", "SVHA"],
    tags: ["armstrong-taylor", "daniel-david", "slama-cazacu", "stil", "apa", "rudica", "yoga", "tao", "holistic", "rocco", "inteligenta-emotionala", "comunicare"],
  },
  CSSA: {
    consultants: ["PSYCHOLINGUIST", "PPA", "SOC", "SVHA"],
    tags: ["armstrong-taylor", "daniel-david", "slama-cazacu", "stil", "lingvistica", "apa", "rudica", "yoga", "tao", "holistic", "rocco", "inteligenta-emotionala"],
  },
  CSA: {
    consultants: ["PSYCHOLINGUIST", "PPA", "SVHA"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica", "apa", "rudica", "yoga", "tao", "holistic", "rocco", "inteligenta-emotionala", "empatie"],
  },
  // B2C — Călăuza primește SVHA ca resursă primară
  CALAUZA: {
    consultants: ["SVHA", "PPA", "PSYCHOLINGUIST", "PSE", "SCA", "PPMO", "SOC", "ACEA"],
    tags: ["yoga", "tao", "tcm", "ayurveda", "holistic", "spirala", "daniel-david", "stil", "lingvistica", "apa", "rudica", "storytelling", "niemec", "via-strengths", "context-extern", "rocco", "inteligenta-emotionala", "creativitate", "flow"],
  },
  PROFILER: {
    consultants: ["SVHA", "PPA", "PPMO", "SCA", "STA", "PSYCHOLINGUIST"],
    tags: ["yoga", "tao", "tcm", "ayurveda", "holistic", "herrmann", "hawkins", "daniel-david", "stil", "niemec", "via-strengths", "rocco", "inteligenta-emotionala", "granularitate"],
  },
  BCA: {
    consultants: ["STA", "SCA", "PPMO", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "pitariu", "stil", "lingvistica"],
  },

  // Marketing — beneficiază de comunicare, psihologie, cultural, eleganță
  CMA: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPA"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica", "rocco", "creativitate", "comunicare"],
  },
  CWA: {
    consultants: ["PSYCHOLINGUIST", "SOC"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica", "rocco", "creativitate", "registru"],
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
    consultants: ["PPMO", "SCA", "STA", "PSYCHOLINGUIST", "ACEA", "MGA"],
    tags: ["armstrong-taylor", "pitariu", "daniel-david", "stil", "lingvistica", "context-extern", "piata", "legislativ", "management", "leadership", "rocco", "inteligenta-emotionala", "contagiune-emotionala"],
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
    tags: ["armstrong-taylor", "pitariu", "stil", "lingvistica", "rocco", "creativitate", "climat-organizational"],
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
    tags: ["armstrong-taylor", "stil", "lingvistica", "rocco", "dezvoltare", "andragogie"],
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
  DPO: {
    consultants: ["SCA", "STA", "PSYCHOLINGUIST"],
    tags: ["armstrong-taylor", "pitariu", "stil", "lingvistica"],
  },

  // Tactical — directori de departament
  CCO: {
    consultants: ["PSYCHOLINGUIST", "PPMO", "MGA", "SCA", "PPA", "SOC", "ACEA"],
    tags: ["armstrong-taylor", "daniel-david", "stil", "management", "leadership", "rocco", "inteligenta-emotionala", "contagiune-emotionala", "comunicare", "piata"],
  },
  CFO: {
    consultants: ["STA", "SCA", "ACEA", "PPMO"],
    tags: ["armstrong-taylor", "pitariu", "context-extern", "piata", "legislativ"],
  },
  CSM: {
    consultants: ["PSYCHOLINGUIST", "PPA", "PPMO", "SCA"],
    tags: ["daniel-david", "stil", "lingvistica", "rocco", "inteligenta-emotionala", "empatie", "comunicare"],
  },
  DMA: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPA", "SCA", "ACEA"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica", "rocco", "creativitate", "comunicare", "piata"],
  },
  DVB2B: {
    consultants: ["PSYCHOLINGUIST", "PPMO", "MGA", "SOC", "ACEA"],
    tags: ["armstrong-taylor", "daniel-david", "stil", "management", "rocco", "inteligenta-emotionala", "comunicare", "piata"],
  },
  DVB2C: {
    consultants: ["PSYCHOLINGUIST", "PPA", "SOC", "PSE"],
    tags: ["daniel-david", "stil", "lingvistica", "rocco", "inteligenta-emotionala", "comunicare", "flow"],
  },
  COSO: {
    consultants: ["PPMO", "SCA", "STA", "PSYCHOLINGUIST", "ACEA", "MGA"],
    tags: ["armstrong-taylor", "pitariu", "daniel-david", "stil", "context-extern", "piata", "management", "leadership", "rocco", "inteligenta-emotionala"],
  },

  // Marketing operațional
  CSEO: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPA"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica", "rocco", "creativitate", "registru"],
  },
  DMM: {
    consultants: ["PSYCHOLINGUIST", "SOC", "STA"],
    tags: ["daniel-david", "stil", "lingvistica", "piata"],
  },
  EMAS: {
    consultants: ["PSYCHOLINGUIST", "PPA", "SOC"],
    tags: ["daniel-david", "stil", "lingvistica", "comunicare"],
  },
  SMMA: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPA"],
    tags: ["daniel-david", "slama-cazacu", "stil", "lingvistica", "rocco", "creativitate", "comunicare"],
  },
  SEBC: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPA"],
    tags: ["daniel-david", "stil", "lingvistica", "rocco", "creativitate", "comunicare"],
  },
  GDA: {
    consultants: ["PPA", "PSE", "PSYCHOLINGUIST"],
    tags: ["rocco", "creativitate", "flow", "stil"],
  },

  // Vânzări operațional
  DDA: {
    consultants: ["STA", "SCA", "PPMO"],
    tags: ["armstrong-taylor", "pitariu"],
  },
  PCA: {
    consultants: ["PSYCHOLINGUIST", "SOC", "PPMO", "ACEA"],
    tags: ["daniel-david", "stil", "comunicare", "piata"],
  },
  REVOPS: {
    consultants: ["STA", "PPMO", "SCA"],
    tags: ["armstrong-taylor", "pitariu"],
  },

  // Financiar operațional
  FPA: {
    consultants: ["STA", "ACEA"],
    tags: ["armstrong-taylor", "context-extern", "piata"],
  },
  RPA_FIN: {
    consultants: ["STA", "SCA", "ACEA"],
    tags: ["armstrong-taylor", "pitariu", "context-extern"],
  },

  // Product
  PMP_B2B: {
    consultants: ["PPMO", "STA", "PSE", "PSYCHOLINGUIST", "ACEA"],
    tags: ["armstrong-taylor", "pitariu", "stil", "piata", "rocco", "creativitate"],
  },
  PMP_B2C: {
    consultants: ["PPA", "PSE", "PSYCHOLINGUIST", "SOC", "SVHA"],
    tags: ["daniel-david", "stil", "rocco", "inteligenta-emotionala", "creativitate", "flow", "holistic"],
  },
  PMRA: {
    consultants: ["STA", "SOC", "ACEA", "SCA"],
    tags: ["armstrong-taylor", "context-extern", "piata"],
  },

  // Resurse cunoaștere (specialiști)
  NSA: {
    consultants: ["PPA", "PSE", "SCA", "SVHA"],
    tags: ["rocco", "inteligenta-emotionala", "flow", "holistic", "dezvoltare"],
  },
  PCM: {
    consultants: ["SCA", "PPA", "PSE", "PSYCHOLINGUIST"],
    tags: ["rocco", "inteligenta-emotionala", "creativitate", "bias", "metacognitie"],
  },
  PTA: {
    consultants: ["PPA", "SCA", "SVHA", "PSYCHOLINGUIST"],
    tags: ["rocco", "inteligenta-emotionala", "holistic", "empatie", "shadow"],
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

  // 1b. LECȚII ÎNVĂȚATE — prioritate maximă, separate de KB general
  const lessons = await prisma.kBEntry.findMany({
    where: { agentRole: role, status: "PERMANENT", tags: { has: "lesson-learned" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { content: true },
  }).catch(() => [])

  const lessonsSection = lessons.length > 0
    ? `⚠️ LECȚII ÎNVĂȚATE (GREȘELI ANTERIOARE — NU LE REPETA):\n${lessons.map((e: any) => e.content).join("\n---\n")}`
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

  // Resolve reportsTo from DB registry (fallback to static)
  const chain = await getEscalationChain(prisma).catch(() => ESCALATION_CHAIN)
  const reportsTo = chain[role] || ESCALATION_CHAIN[role] || "COG"

  // Company Profiler context — injectat pentru agenții client-facing și operaționali
  let profilerSection = ""
  if (CLIENT_FACING_PROFILER_ROLES.includes(role) && options._tenantId) {
    try {
      const { getAgentContext } = await import("@/lib/company-profiler")
      const profilerRole = PROFILER_ROLE_MAP[role] || "DOA"
      const ctx = await getAgentContext(options._tenantId, profilerRole as any)
      const parts = [`\n═══ COMPANY PROFILER — CONTEXT CLIENT ═══\n${ctx.companyEssence}`]
      if (ctx.deviationsToFlag.length > 0) {
        parts.push(`\nDEVIAȚII DE SEMNALAT:\n${ctx.deviationsToFlag.map(d => `- ${d}`).join("\n")}`)
      }
      if (ctx.coherenceRelevant.length > 0) {
        const relevant = ctx.coherenceRelevant.filter(c => c.status !== "COERENT")
        if (relevant.length > 0) {
          parts.push(`\nVERIFICĂRI COERENȚĂ:\n${relevant.map(c => `- ${c.pair}: ${c.gap} (scor ${c.score}/100)`).join("\n")}`)
        }
      }
      profilerSection = parts.join("\n")
    } catch {}
  }

  const combined = [lessonsSection, options.additionalContext, kbSection, culturalKB, l2Knowledge, profilerSection].filter(Boolean).join("\n\n")

  return buildAgentPrompt(role, description, {
    ...options,
    additionalContext: combined,
    _reportsToOverride: reportsTo,
  } as any)
}

// Roluri care primesc context Company Profiler automat
const CLIENT_FACING_PROFILER_ROLES = [
  "HR_COUNSELOR", "SOA", "CSSA", "CSA", "MEDIATOR", "BCA",
  "DOA", "DOAS", "COG", "COA",
]

// Mapare rol agent → rol profiler
const PROFILER_ROLE_MAP: Record<string, string> = {
  HR_COUNSELOR: "JE",
  SOA: "SOA",
  CSSA: "SOA",
  CSA: "SOA",
  MEDIATOR: "PAY_GAP",
  BCA: "BENCHMARK",
  DOA: "DOA",
  DOAS: "DOA",
  COG: "DOA",
  COA: "DOA",
}
