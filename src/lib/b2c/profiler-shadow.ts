/**
 * profiler-shadow.ts — Profiler-ul ca observator invizibil
 *
 * Profiler-ul însoțește clientul pe ORICARE dintre carduri.
 * Nu e prezent în conversație — dar ascultă și acumulează.
 *
 * După fiecare interacțiune pe orice card, se apelează acest modul
 * care actualizează profilul B2C cu ce a observat.
 *
 * Fluxul:
 *   Client ↔ Călăuza (Card 1)
 *          ↓ (invizibil)
 *   profiler-shadow → actualizează B2CProfile + B2CEvolutionEntry
 *
 * Ce observă din fiecare interacțiune:
 *   - Tonul și limbajul (actualizare Herrmann estimat)
 *   - Congruența gând-vorbă-faptă (între sesiuni)
 *   - Nivel Hawkins estimat (din pattern-uri comportamentale)
 *   - VIA character strengths (din ce face și cum reacționează)
 *   - Tranziții între carduri (de unde vine, unde merge)
 *   - Progres pe spirală (se blochează? avansează? regresează?)
 */

import { cpuCall } from "@/lib/cpu/gateway"

const MODEL = "claude-sonnet-4-20250514"

export interface ShadowObservation {
  /** Cardul pe care s-a desfășurat interacțiunea */
  card: string
  /** Agentul care a vorbit cu clientul */
  agentRole: string
  /** Rezumatul interacțiunii (ultimele mesaje) */
  conversationSummary: string
  /** Mesajul clientului (ultimul) */
  lastClientMessage: string
  /** Răspunsul agentului (ultimul) */
  lastAgentResponse: string
}

export interface ProfileUpdate {
  /** Ajustări Herrmann (null = fără schimbare) */
  herrmannHint?: { dominant: string; confidence: number }
  /** Ajustare Hawkins estimat */
  hawkinsAdjustment?: number
  /** VIA strengths observate */
  viaObserved?: string[]
  /** Congruență gând-vorbă-faptă (0-1) */
  congruenceScore?: number
  /** Faza spirală sugerată */
  suggestedPhase?: "CHRYSALIS" | "BUTTERFLY" | "FLIGHT" | "LEAP"
  /** Etapa competenței sugerată (1-4) */
  suggestedStage?: number
  /** Insight liber text */
  insight?: string
  /** Progres pe spirală */
  progressSignal?: "ADVANCING" | "STABLE" | "REGRESSING" | "BLOCKED"
}

/**
 * Profiler-ul observă invizibil o interacțiune de pe orice card
 * și returnează observații pentru actualizarea profilului.
 *
 * Cost: ~$0.005 per observare (un apel Claude mic).
 * Se rulează asincron (non-blocking) după fiecare mesaj al agentului.
 */
export async function observeInteraction(
  observation: ShadowObservation,
  currentProfile: {
    herrmannA: number | null
    herrmannB: number | null
    herrmannC: number | null
    herrmannD: number | null
    hawkinsEstimate: number | null
    viaSignature: string[]
    spiralLevel: number
    spiralStage: number
  } | null
): Promise<ProfileUpdate | null> {
  try {
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 400,
      system: "",
      messages: [{
        role: "user",
        content: `Ești Profiler-ul platformei JobGrade. Observi INVIZIBIL o interacțiune între un client B2C și un agent.

INTERACȚIUNE OBSERVATĂ:
Card: ${observation.card}
Agent: ${observation.agentRole}
Clientul a spus: "${observation.lastClientMessage}"
Agentul a răspuns: "${observation.lastAgentResponse}"

PROFIL CURENT AL CLIENTULUI:
${currentProfile ? `Herrmann: A=${currentProfile.herrmannA} B=${currentProfile.herrmannB} C=${currentProfile.herrmannC} D=${currentProfile.herrmannD}
Hawkins estimat: ${currentProfile.hawkinsEstimate || "necunoscut"}
VIA signature: ${currentProfile.viaSignature.join(", ") || "neidentificate"}
Spirală: nivel ${currentProfile.spiralLevel}, etapă ${currentProfile.spiralStage}` : "Profil gol — prima observare."}

CE OBSERVI din acest schimb? Răspunde STRICT în format JSON:
{
  "herrmannHint": { "dominant": "A|B|C|D|null", "confidence": 0.0-1.0 } sau null,
  "hawkinsAdjustment": numar_pozitiv_sau_negativ sau null,
  "viaObserved": ["strength1", "strength2"] sau null,
  "congruenceScore": 0.0-1.0 sau null,
  "suggestedPhase": "CHRYSALIS|BUTTERFLY|FLIGHT|LEAP" sau null,
  "suggestedStage": 1-4 sau null,
  "insight": "observație scurtă" sau null,
  "progressSignal": "ADVANCING|STABLE|REGRESSING|BLOCKED" sau null
}

REGULI:
- Răspunde DOAR cu JSON valid, nimic altceva
- Pune null dacă nu ai suficiente date pentru o dimensiune
- hawkinsAdjustment: mic (-5 la +5), nu sari brusc
- congruenceScore: doar dacă ai dovadă clară (ex: a spus că va face ceva și a făcut)
- insight: maxim o propoziție, observație concretă
- NU presupune — observă doar ce e evident din textul dat`,
      }],
      agentRole: "PROFILER",
      operationType: "shadow-observation",
    })

    const text = cpuResult.text.trim()

    // Parse JSON — tolerant la formatting
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as ProfileUpdate
    return parsed
  } catch {
    return null
  }
}

/**
 * Aplică observația Profiler-ului pe profilul din DB.
 * Merge incremental — nu suprascrie, ci ajustează.
 */
export async function applyProfileUpdate(
  userId: string,
  update: ProfileUpdate,
  prisma: any
): Promise<void> {
  const p = prisma
  const profile = await p.b2CProfile.findUnique({ where: { userId } })
  if (!profile) return

  const data: Record<string, unknown> = {}

  // Herrmann — ajustare incrementală
  if (update.herrmannHint && update.herrmannHint.confidence > 0.3) {
    const boost = update.herrmannHint.confidence * 5 // max +5 per observare
    const dim = update.herrmannHint.dominant
    if (dim === "A" && profile.herrmannA != null) data.herrmannA = Math.min(100, profile.herrmannA + boost)
    if (dim === "B" && profile.herrmannB != null) data.herrmannB = Math.min(100, profile.herrmannB + boost)
    if (dim === "C" && profile.herrmannC != null) data.herrmannC = Math.min(100, profile.herrmannC + boost)
    if (dim === "D" && profile.herrmannD != null) data.herrmannD = Math.min(100, profile.herrmannD + boost)
    // Dacă profilul e gol, inițializează
    if (profile.herrmannA == null) {
      data.herrmannA = dim === "A" ? 40 + boost : 25
      data.herrmannB = dim === "B" ? 40 + boost : 25
      data.herrmannC = dim === "C" ? 40 + boost : 25
      data.herrmannD = dim === "D" ? 40 + boost : 25
    }
  }

  // Hawkins — ajustare incrementală (±5 max per observare)
  if (update.hawkinsAdjustment != null) {
    const adj = Math.max(-5, Math.min(5, update.hawkinsAdjustment))
    const current = profile.hawkinsEstimate || 150
    data.hawkinsEstimate = Math.max(20, Math.min(700, current + adj))
    data.hawkinsConfidence = Math.min(1, (profile.hawkinsConfidence || 0.2) + 0.02)
  }

  // VIA — acumulare (nu suprascrie)
  if (update.viaObserved?.length) {
    const current = new Set(profile.viaSignature || [])
    for (const s of update.viaObserved) current.add(s.toLowerCase())
    data.viaSignature = Array.from(current)
  }

  // Spirală — ajustare doar dacă sugerată și diferită
  if (update.suggestedStage && update.suggestedStage !== profile.spiralStage) {
    // Doar crește, nu scade (regresiile se loghează separat)
    if (update.suggestedStage > profile.spiralStage) {
      data.spiralStage = update.suggestedStage
    }
  }

  // Dialog insights — append
  if (update.insight) {
    const insights = (profile.dialogInsights as Record<string, unknown>) || {}
    const log = (insights.observations as string[]) || []
    log.push(`[${new Date().toISOString().slice(0, 10)}] ${update.insight}`)
    // Păstrează ultimele 20 de observații
    data.dialogInsights = { ...insights, observations: log.slice(-20) }
  }

  if (Object.keys(data).length > 0) {
    await p.b2CProfile.update({ where: { userId }, data })
  }
}
