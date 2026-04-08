import type { AgentRole, AgentMeta } from "./types"

// ── Agent metadata ──────────────────────────────────────────────────────────

const AGENT_META: Record<AgentRole, AgentMeta> = {
  soa: {
    role: "soa",
    label: "Ghidul tău JobGrade",
    description: "Bine ai venit! Sunt aici să te ghidez prin tot ce oferim. Întreabă-mă orice.",
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
  profiler: {
    role: "profiler",
    label: "Profiler",
    description: "Sunt aici să te ajut să descoperi ce te face unic. Hai să vorbim.",
  },
  hr_counselor: {
    role: "hr_counselor",
    label: "Consilier HR",
    description: "Sunt consilierul dumneavoastră dedicat. Cum vă pot ajuta?",
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

  // B2C — Profiler host
  { pattern: /^\/personal/,           agent: "profiler" },

  // B2B — HR Counselor host
  { pattern: /^\/b2b/,                agent: "hr_counselor" },

  // Sales / pre-login / landing (pagina principală + auth)
  { pattern: /^\/(app\/)?pricing/,    agent: "soa" },
  { pattern: /^\/(app\/)?plans/,      agent: "soa" },
  { pattern: /^\/(app\/)?onboarding/, agent: "soa" },
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
  // B2C agents have dedicated endpoints
  if (agent === "profiler") return "/api/v1/b2c/profiler/chat"
  if (agent === "hr_counselor") return "/api/v1/agents/hr-counselor/chat"
  return `/api/v1/agents/${agent}/chat`
}

/**
 * Returns display metadata for an agent.
 */
export function getAgentMeta(agent: AgentRole): AgentMeta {
  return AGENT_META[agent]
}
