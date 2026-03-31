/**
 * Agent Skills Index
 *
 * System prompts specializate per agent, derivate din:
 * - Curs AI Silviu Popescu (agents pack: 13 agents + 8 skills)
 * - Adaptare completă pentru platforma JobGrade B2B HR România
 *
 * Utilizare: inject în system prompt la deschidere sesiune agent
 * Exemplu:
 *   const skill = getSkill("CWA", "landingPage")
 *   const systemPrompt = `${basePrompt}\n\n${skill}`
 */

import { MARKETING_SKILLS } from "./marketing-skills"
import { BUSINESS_SKILLS } from "./business-skills"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type SkillCategory = "marketing" | "business"

export interface SkillEntry {
  agentRole: string
  skillName: string
  category: SkillCategory
  content: string
}

// ── Registry ──────────────────────────────────────────────────────────────────

const ALL_SKILLS: Record<string, Record<string, string>> = {
  // Marketing
  CWA: MARKETING_SKILLS.CWA as unknown as Record<string, string>,
  CMA: MARKETING_SKILLS.CMA as unknown as Record<string, string>,
  ACA_MKT: MARKETING_SKILLS.ACA as unknown as Record<string, string>,

  // Business
  CIA: BUSINESS_SKILLS.CIA as unknown as Record<string, string>,
  SOA: BUSINESS_SKILLS.SOA as unknown as Record<string, string>,
  CJA: BUSINESS_SKILLS.CJA as unknown as Record<string, string>,
  COG: BUSINESS_SKILLS.COG as unknown as Record<string, string>,
}

// ── Funcții utilitate ─────────────────────────────────────────────────────────

export function getSkill(agentRole: string, skillName: string): string | null {
  const agentSkills = ALL_SKILLS[agentRole.toUpperCase()]
  if (!agentSkills) return null
  return agentSkills[skillName] || null
}

export function getAgentSkills(agentRole: string): string[] {
  const agentSkills = ALL_SKILLS[agentRole.toUpperCase()]
  if (!agentSkills) return []
  return Object.keys(agentSkills)
}

export function listAllSkills(): SkillEntry[] {
  const entries: SkillEntry[] = []

  for (const [agent, skills] of Object.entries(ALL_SKILLS)) {
    const category: SkillCategory = ["CWA", "CMA", "ACA_MKT"].includes(agent)
      ? "marketing"
      : "business"

    for (const [name, content] of Object.entries(skills)) {
      entries.push({
        agentRole: agent,
        skillName: name,
        category,
        content: content as string,
      })
    }
  }

  return entries
}

// Re-export for convenience
export { MARKETING_SKILLS } from "./marketing-skills"
export { BUSINESS_SKILLS } from "./business-skills"
