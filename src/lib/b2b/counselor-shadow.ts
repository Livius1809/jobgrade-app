/**
 * counselor-shadow.ts — HR_Counselor ca observator invizibil B2B
 *
 * Echivalentul profiler-shadow.ts pentru partea B2B.
 *
 * HR_Counselor însoțește clientul pe TOATE procesele B2B:
 *   - Sesiuni de evaluare (cu mediatori, cu facilitatori)
 *   - Conversații cu CSSA (customer success)
 *   - Conversații cu SOA (onboarding)
 *   - Utilizare instrumente AI
 *   - Generare rapoarte
 *
 * Nu e prezent în conversație — dar observă pattern-uri:
 *   - Maturitate HR (cum evaluează, cât de profund merge)
 *   - Engagement echipă (cine participă, cât de activ)
 *   - Stil decizional (rapid vs. deliberat, autoritar vs. consultativ)
 *   - Aliniere valori declarate vs. practicate
 *   - Rezistență la schimbare (adoptă recomandările sau le ignoră)
 *
 * Datele alimentează:
 *   - ClientMemory (profilul clientului B2B)
 *   - Evolution Engine context B2B (dimensiunile organizaționale)
 *   - Recomandările CSSA pentru check-in-uri
 */

import { cpuCall } from "@/lib/cpu/gateway"

const MODEL = "claude-sonnet-4-20250514"

export interface B2BShadowObservation {
  /** Sursa interacțiunii (ce agent/proces) */
  source: string
  /** Tipul: chat, evaluare, raport, instrument AI */
  interactionType: "CHAT" | "EVALUATION" | "REPORT" | "AI_TOOL" | "BILLING"
  /** Rezumatul interacțiunii */
  summary: string
  /** Ce a spus/făcut clientul */
  clientAction: string
  /** Ce a răspuns sistemul/agentul */
  systemResponse: string
  /** TenantId */
  tenantId: string
}

export interface B2BProfileInsight {
  /** Maturitate HR estimată (0-100) */
  hrMaturity?: number
  /** Stil decizional observat */
  decisionStyle?: "rapid" | "deliberat" | "consultativ" | "autoritar"
  /** Engagement observat */
  engagementSignal?: "ACTIVE" | "PASSIVE" | "DECLINING" | "GROWING"
  /** Aliniere valori (discrepanță observată?) */
  valuesAlignment?: "ALIGNED" | "PARTIAL" | "MISALIGNED"
  /** Rezistență la schimbare */
  changeResistance?: "LOW" | "MODERATE" | "HIGH"
  /** Insight liber text */
  insight?: string
  /** Recomandare pentru CSSA (follow-up) */
  cssaRecommendation?: string
}

/**
 * HR_Counselor observă invizibil o interacțiune B2B.
 * Rulează asincron după fiecare interacțiune semnificativă.
 */
export async function observeB2BInteraction(
  observation: B2BShadowObservation,
  existingMemory: string // rezumatul ClientMemory existent
): Promise<B2BProfileInsight | null> {
  try {
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 300,
      system: "",
      messages: [{
        role: "user",
        content: `Ești HR_Counselor pe platforma JobGrade. Observi INVIZIBIL o interacțiune a unui client B2B.

INTERACȚIUNE:
Sursa: ${observation.source}
Tip: ${observation.interactionType}
Clientul: "${observation.clientAction}"
Sistem: "${observation.systemResponse}"

MEMORIE EXISTENTĂ DESPRE CLIENT:
${existingMemory || "Prima interacțiune — fără memorie anterioară."}

CE OBSERVI? Răspunde STRICT în format JSON:
{
  "hrMaturity": 0-100 sau null,
  "decisionStyle": "rapid|deliberat|consultativ|autoritar" sau null,
  "engagementSignal": "ACTIVE|PASSIVE|DECLINING|GROWING" sau null,
  "valuesAlignment": "ALIGNED|PARTIAL|MISALIGNED" sau null,
  "changeResistance": "LOW|MODERATE|HIGH" sau null,
  "insight": "observație scurtă" sau null,
  "cssaRecommendation": "sugestie follow-up pentru CSSA" sau null
}

REGULI:
- DOAR JSON valid
- null dacă nu ai suficiente date
- insight: maxim o propoziție
- cssaRecommendation: doar dacă e ceva acționabil (ex: "clientul pare blocat pe configurare, sugerează un check-in")`,
      }],
      agentRole: "HR_COUNSELOR",
      operationType: "shadow-observation",
      tenantId: observation.tenantId,
    })

    const text = cpuResult.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0]) as B2BProfileInsight
  } catch {
    return null
  }
}

/**
 * Aplică insight-ul HR_Counselor pe ClientMemory B2B.
 */
export async function applyB2BInsight(
  tenantId: string,
  insight: B2BProfileInsight,
  prisma: any
): Promise<void> {
  const p = prisma

  // Salvează ca ClientMemory
  if (insight.insight) {
    await p.clientMemory.create({
      data: {
        tenantId,
        category: "HISTORY",
        content: `[HR_COUNSELOR shadow] ${insight.insight}${insight.cssaRecommendation ? ` | CSSA: ${insight.cssaRecommendation}` : ""}`,
        source: "HR_COUNSELOR",
        importance: insight.engagementSignal === "DECLINING" ? 0.8 : 0.4,
        tags: [
          "counselor-shadow",
          insight.engagementSignal?.toLowerCase(),
          insight.decisionStyle,
          insight.changeResistance ? `resistance-${insight.changeResistance.toLowerCase()}` : null,
        ].filter(Boolean) as string[],
      },
    }).catch(() => {})
  }

  // Dacă engagement declină sau rezistență HIGH → escaladare subtilă la CSSA
  if (insight.engagementSignal === "DECLINING" || insight.changeResistance === "HIGH") {
    await p.clientMemory.create({
      data: {
        tenantId,
        category: "ALERT",
        content: `[HR_COUNSELOR] Atenție: ${insight.engagementSignal === "DECLINING" ? "engagement în declin" : "rezistență ridicată la schimbare"}. ${insight.cssaRecommendation || "Recomandare: check-in proactiv."}`,
        source: "HR_COUNSELOR",
        importance: 0.9,
        tags: ["counselor-shadow", "alert", "cssa-action-needed"],
      },
    }).catch(() => {})
  }
}
