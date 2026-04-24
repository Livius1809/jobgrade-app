/**
 * fw-router.ts — Flying Wheels Router
 *
 * Determină agentul potrivit pe baza:
 * 1. Pathname (unde e clientul)
 * 2. Conținut întrebare (ce întreabă)
 * 3. Context (B2B vs B2C, layer cumpărat)
 *
 * Flying Wheels nu expune niciodată agentul delegat — clientul vede un singur chat.
 */

export type FWAgentTarget =
  | "fw_self"         // FW răspunde singur (navigare, ghidaj general)
  | "soa"             // Sales & Onboarding
  | "cssa"            // Customer Success
  | "csa"             // Suport tehnic
  | "hr_counselor"    // Consilier HR (evaluare posturi)
  | "profiler_front"  // Profiler FrontDesk (B2C)
  | "card_agent"      // Agent per card B2C

export interface RoutingDecision {
  target: FWAgentTarget
  confidence: number
  reason: string
  agentEndpoint: string | null
}

// ── Clasificare pe conținut ─────────────────────────────────────────────

interface ContentPattern {
  patterns: RegExp[]
  target: FWAgentTarget
  reason: string
}

const CONTENT_PATTERNS: ContentPattern[] = [
  // SOA — pricing, cumpărare, servicii, contract
  {
    patterns: [
      /pret|pric|cost|tarif|abonament|plat[aă]|factur/i,
      /cump[aă]r|achizi[tț]i|comand|upgr/i,
      /pachet|modul|layer|credit/i,
      /ofert[aă]|contract|demo|trial/i,
      /c[aâ]t cost[aă]|c[aâ]te minute/i,
    ],
    target: "soa",
    reason: "Întrebare despre pricing/servicii",
  },
  // HR_COUNSELOR — evaluare, criterii, sesiuni, consens
  {
    patterns: [
      /evalua|criteriu|criteriile|scor|punctaj/i,
      /sesiune|comisi[ea]|consens|vot/i,
      /ierarhiz|clasific|grad|rang/i,
      /knowledge|communication|problem solving|decision/i,
      /facilitator|mediator|mediere/i,
      /fi[sș][aă] post|responsabilit/i,
    ],
    target: "hr_counselor",
    reason: "Întrebare despre evaluare/sesiuni",
  },
  // CSA — probleme tehnice, erori, nu funcționează
  {
    patterns: [
      /nu func[tț]ion|eroare|bug|problem[aă] tehnic/i,
      /nu pot|nu merge|blocat|crash/i,
      /parol[aă]|autentific|login|cont/i,
      /import|upload|desc[aă]rc|export/i,
    ],
    target: "csa",
    reason: "Întrebare de suport tehnic",
  },
  // CSSA — date companie, progres, rapoarte, pay gap, conformitate
  {
    patterns: [
      /raport|pdf|export/i,
      /pay.?gap|decalaj|salarial|transparen/i,
      /conformitate|directiv|art\.\s?\d|eu 2023/i,
      /angaja[tț]|salar|gril[aă]|treapt/i,
      /justific|benchmark|compar/i,
    ],
    target: "cssa",
    reason: "Întrebare despre date/rapoarte/conformitate",
  },
  // Profiler B2C — dezvoltare personală, card-uri
  {
    patterns: [
      /card|modul personal|dezvoltare personal/i,
      /cine sunt|autocu|reflex|introspec/i,
      /herrmann|hawkins|spiral|crisalid/i,
      /carier[aă]|cv|antrepreno/i,
      /comunitat|relat|valoare|virtu/i,
    ],
    target: "profiler_front",
    reason: "Întrebare B2C / dezvoltare personală",
  },
]

// ── Router principal ────────────────────────────────────────────────────

/**
 * Determină agentul potrivit pentru o întrebare.
 */
export function routeQuestion(
  message: string,
  pathname: string,
  isB2C: boolean
): RoutingDecision {
  // 1. Dacă e traseu B2C explicit
  if (isB2C || pathname.startsWith("/personal")) {
    // Verifică dacă e întrebare specifică unui card
    const cardMatch = pathname.match(/\/personal\/card-(\d)/)
    if (cardMatch) {
      return {
        target: "card_agent",
        confidence: 0.9,
        reason: `Card ${cardMatch[1]} activ`,
        agentEndpoint: `/api/v1/b2c/calauza/chat`,
      }
    }

    return {
      target: "profiler_front",
      confidence: 0.85,
      reason: "Traseu B2C",
      agentEndpoint: "/api/v1/b2c/profiler/chat",
    }
  }

  // 2. Clasificare pe conținut (B2B)
  for (const cp of CONTENT_PATTERNS) {
    for (const pattern of cp.patterns) {
      if (pattern.test(message)) {
        return {
          target: cp.target,
          confidence: 0.8,
          reason: cp.reason,
          agentEndpoint: getEndpoint(cp.target),
        }
      }
    }
  }

  // 3. Fallback pe pathname
  const pathTarget = getTargetFromPath(pathname)
  if (pathTarget !== "fw_self") {
    return {
      target: pathTarget,
      confidence: 0.6,
      reason: `Context pagină: ${pathname}`,
      agentEndpoint: getEndpoint(pathTarget),
    }
  }

  // 4. Default: FW răspunde singur (ghidaj general)
  return {
    target: "fw_self",
    confidence: 0.5,
    reason: "Ghidaj general platformă",
    agentEndpoint: null,
  }
}

function getTargetFromPath(pathname: string): FWAgentTarget {
  if (/^\/(app\/)?(pricing|plans|onboarding|register|login)/.test(pathname)) return "soa"
  if (/^\/(app\/)?(help|support)/.test(pathname)) return "csa"
  if (/^\/(app\/)?sessions/.test(pathname)) return "hr_counselor"
  if (/^\/(app\/)?(pay-gap|employee-portal)/.test(pathname)) return "cssa"
  if (/^\/(app\/)?(portal|jobs|reports|company|settings)/.test(pathname)) return "cssa"
  if (/^\/personal/.test(pathname)) return "profiler_front"
  return "fw_self"
}

function getEndpoint(target: FWAgentTarget): string | null {
  switch (target) {
    case "soa": return "/api/v1/agents/soa/chat"
    case "cssa": return "/api/v1/agents/cssa/chat"
    case "csa": return "/api/v1/agents/csa/chat"
    case "hr_counselor": return "/api/v1/agents/hr-counselor/chat"
    case "profiler_front": return "/api/v1/b2c/profiler/chat"
    case "card_agent": return "/api/v1/b2c/calauza/chat"
    case "fw_self": return null
    default: return null
  }
}
