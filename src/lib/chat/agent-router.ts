import type { AgentRole, AgentMeta } from "./types"

// ── Agent metadata ──────────────────────────────────────────────────────────

const AGENT_META: Record<AgentRole, AgentMeta> = {
  soa: {
    role: "soa",
    label: "Sales & Onboarding",
    description: "Vă ghidez prin platformă și răspund la întrebări comerciale.",
  },
  cssa: {
    role: "cssa",
    label: "Customer Success",
    description: "Vă ajut să folosiți platforma la capacitate maximă.",
  },
  csa: {
    role: "csa",
    label: "Suport Clienți",
    description: "Rezolv problemele tehnice și răspund la întrebări.",
  },
}

// ── Path → Agent mapping ────────────────────────────────────────────────────

/**
 * Route rules evaluated in order. First match wins.
 * More specific paths come first.
 */
const ROUTE_RULES: Array<{ pattern: RegExp; agent: AgentRole }> = [
  // Support paths
  { pattern: /^\/(app\/)?help/,    agent: "csa" },
  { pattern: /^\/(app\/)?support/, agent: "csa" },
  { pattern: /^\/(app\/)?error/,   agent: "csa" },
  { pattern: /^\/404/,             agent: "csa" },
  { pattern: /^\/500/,             agent: "csa" },

  // Sales / pre-login / landing
  { pattern: /^\/(app\/)?pricing/,    agent: "soa" },
  { pattern: /^\/(app\/)?plans/,      agent: "soa" },
  { pattern: /^\/(app\/)?onboarding/, agent: "soa" },
  { pattern: /^\/personal/,           agent: "soa" },
  { pattern: /^\/login/,              agent: "soa" },
  { pattern: /^\/register/,           agent: "soa" },
  { pattern: /^\/$/,                  agent: "soa" },

  // App pages → Customer Success
  { pattern: /^\/(app\/)?(portal|dashboard)/, agent: "cssa" },
  { pattern: /^\/(app\/)?jobs/,               agent: "cssa" },
  { pattern: /^\/(app\/)?sessions/,           agent: "cssa" },
  { pattern: /^\/(app\/)?reports/,            agent: "cssa" },
  { pattern: /^\/(app\/)?company/,            agent: "cssa" },
  { pattern: /^\/(app\/)?compensation/,       agent: "cssa" },
  { pattern: /^\/(app\/)?ai-tools/,           agent: "cssa" },
  { pattern: /^\/(app\/)?employee-portal/,    agent: "cssa" },
  { pattern: /^\/(app\/)?settings/,           agent: "cssa" },
  { pattern: /^\/(app\/)?pay-gap/,            agent: "cssa" },
]

/**
 * Determines which agent should handle the conversation based on the current path.
 * Defaults to SOA (sales) for unmatched paths — any visitor is a potential lead.
 */
export function getAgentForPath(pathname: string): AgentRole {
  for (const rule of ROUTE_RULES) {
    if (rule.pattern.test(pathname)) {
      return rule.agent
    }
  }
  return "soa"
}

/**
 * Returns the API endpoint for a given agent role.
 */
export function getAgentEndpoint(agent: AgentRole): string {
  return `/api/v1/agents/${agent}/chat`
}

/**
 * Returns display metadata for an agent.
 */
export function getAgentMeta(agent: AgentRole): AgentMeta {
  return AGENT_META[agent]
}
