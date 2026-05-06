/**
 * culture-guardrails.ts — Enforcement valori și cultură organizațională
 *
 * Verifică dacă o acțiune/decizie a unui agent respectă valorile declarate.
 * Injectabil în orice flow (brainstorm, propunere, negociere, decizie).
 *
 * Valorile JobGrade (din CompanyProfile demo):
 * - Inovație
 * - Calitate
 * - Transparență
 * - Colaborare
 *
 * + Principii platformă:
 * - Conformitate EU (GDPR, Directiva 2023/970, AI Act)
 * - Obiectivitate evaluare (fără bias)
 * - Respect multilingual (RO + EN)
 * - Securitate date salariale
 */

import { cpuCall } from "@/lib/cpu/gateway"

const MODEL = "claude-sonnet-4-20250514"

// ── Core Values ──────────────────────────────────────────────────────────────

export const PLATFORM_VALUES = [
  { name: "Inovație", description: "Căutăm constant soluții noi, nu repetăm ce nu funcționează" },
  { name: "Calitate", description: "Livrăm doar ce funcționează bine. Mai bine mai târziu decât prost." },
  { name: "Transparență", description: "Comunicăm deschis — inclusiv eșecurile. Fără agende ascunse." },
  { name: "Colaborare", description: "Lucrăm împreună, nu în silos. Succesul echipei > succesul individual." },
  { name: "Conformitate", description: "GDPR, Directiva EU 2023/970, AI Act — fără compromis." },
  { name: "Obiectivitate", description: "Decizii bazate pe date, fără favoritisme sau bias." },
  { name: "Respect", description: "Comunicare respectuoasă, inclusivă, multilingual." },
  { name: "Securitate", description: "Datele clienților sunt sacre. Zero toleranță la neglijență." },
]

// ── Types ────────────────────────────────────────────────────────────────────

export interface CultureCheck {
  passed: boolean
  violations: Array<{
    value: string
    description: string
    severity: "BLOCK" | "WARN" | "NOTE"
  }>
  recommendation: string
}

// ── Check an action against values ───────────────────────────────────────────

export async function checkCultureAlignment(
  agentRole: string,
  actionDescription: string,
  context?: string
): Promise<CultureCheck> {
  const valuesText = PLATFORM_VALUES.map((v, i) => `${i + 1}. ${v.name}: ${v.description}`).join("\n")

  try {
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 800,
      system: "",
      messages: [{
        role: "user",
        content: `Verifică dacă această acțiune respectă valorile organizaționale.

AGENT: ${agentRole}
ACȚIUNE: ${actionDescription}
${context ? `CONTEXT: ${context}` : ""}

VALORI ORGANIZAȚIONALE:
${valuesText}

Analizează acțiunea și identifică VIOLĂRI ale valorilor. Fii strict dar just.

Răspunde STRICT JSON:
{
  "passed": true/false,
  "violations": [
    {
      "value": "Numele valorii încălcate",
      "description": "Ce anume încalcă",
      "severity": "BLOCK (oprește acțiunea) | WARN (permite cu atenționare) | NOTE (observație)"
    }
  ],
  "recommendation": "Ce ar trebui făcut diferit (dacă sunt violări)"
}

Dacă acțiunea respectă toate valorile, passed=true și violations=[].`,
      }],
      agentRole: agentRole,
      operationType: "culture-check",
    })

    const text = cpuResult.text || "{}"
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { passed: true, violations: [], recommendation: "" }

    return JSON.parse(match[0])
  } catch {
    // Fail open — don't block action if culture check fails
    return { passed: true, violations: [], recommendation: "Culture check unavailable" }
  }
}

// ── Quick check (without API call, rule-based) ───────────────────────────────

export function quickCultureCheck(actionDescription: string): {
  flags: string[]
  pass: boolean
} {
  const flags: string[] = []
  const lower = actionDescription.toLowerCase()

  // Anti-patterns
  if (lower.includes("skip") && lower.includes("test")) flags.push("Calitate: skipping tests")
  if (lower.includes("fără") && lower.includes("review")) flags.push("Calitate: bypass review")
  if (lower.includes("ascunde") || lower.includes("hide")) flags.push("Transparență: hiding information")
  if (lower.includes("singur") && lower.includes("decid")) flags.push("Colaborare: unilateral decision")
  if (lower.includes("ignor") && (lower.includes("gdpr") || lower.includes("directiv"))) flags.push("Conformitate: ignoring regulation")
  if (lower.includes("bias") || lower.includes("favorit")) flags.push("Obiectivitate: potential bias")
  if (lower.includes("fără") && lower.includes("encrypt")) flags.push("Securitate: unencrypted data")

  return { flags, pass: flags.length === 0 }
}

// ── Format for prompt injection ──────────────────────────────────────────────

export function getCulturePromptSection(): string {
  return `\nVALORI ORGANIZAȚIONALE (respectă-le în orice decizie):
${PLATFORM_VALUES.map(v => `- ${v.name}: ${v.description}`).join("\n")}
Dacă o acțiune contrazice aceste valori, semnalează explicit.`
}
