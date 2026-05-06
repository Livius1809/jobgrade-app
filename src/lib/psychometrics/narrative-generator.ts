/**
 * Narrative Feedback Generator — genereaza feedback uman din profil agregat
 *
 * Foloseste cpuCall() pentru a produce text narativ adaptat per rol:
 * - SUBJECT: incurajator, orientat spre crestere
 * - HR_DIRECTOR: analitic, date comparative, conformitate
 * - MANAGER: actionabil, impact echipa, plan concret
 * - CONSULTANT: tehnic, referinte instrumente, nuante metodologice
 *
 * REGULA: NU se afiseaza scoruri brute in output. Se traduc in limbaj uman.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import type { AggregatedProfile } from "./battery-aggregator"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ViewerRole = "SUBJECT" | "HR_DIRECTOR" | "MANAGER" | "CONSULTANT"

export interface NarrativeFeedback {
  /** Rezumat narativ (2-3 paragrafe) */
  summary: string
  /** Top 3-5 puncte forte cu context */
  strengths: string[]
  /** Plan de dezvoltare structurat */
  developmentPlan: Array<{
    area: string
    recommendation: string
    timeline: string
  }>
  /** Insight adaptat per rol */
  roleSpecificInsight: string
}

// ═══════════════════════════════════════════════════════════════
// ROLE-SPECIFIC PROMPTS
// ═══════════════════════════════════════════════════════════════

const ROLE_INSTRUCTIONS: Record<ViewerRole, string> = {
  SUBJECT: `Scrii pentru PERSOANA EVALUATA. Tonul este incurajator, orientat spre crestere.
Foloseste "dumneavoastra" (formal).
Evidentiaza punctele forte inainte de ariile de dezvoltare.
Reformuleaza orice punct slab ca "oportunitate de crestere".
NU folosesti etichete negative. NU mentionezi scoruri sau centile.
Planul de dezvoltare trebuie sa fie concret si realizabil.
Insight-ul specific: ce poate face persoana ACUM pentru a creste.`,

  HR_DIRECTOR: `Scrii pentru DIRECTORUL HR. Tonul este analitic si profesional.
Foloseste limbaj de specialitate HR.
Pune accent pe conformitate, risc organizational si compatibilitate cu postul.
Mentionezi implicatii pentru retentie si dezvoltare organizationala.
Planul de dezvoltare include resurse necesare (training, coaching, mentorat).
Insight-ul specific: impactul asupra echipei si recomandari de actiune HR.`,

  MANAGER: `Scrii pentru MANAGERUL DIRECT. Tonul este practic si actionabil.
Foloseste limbaj direct, fara jargon psihometric.
Pune accent pe performanta, colaborare si impactul in echipa.
Planul de dezvoltare include actiuni concrete pe care managerul le poate sustine.
Insight-ul specific: cum sa valorifice punctele forte si sa gestioneze ariile de dezvoltare in activitatea zilnica.`,

  CONSULTANT: `Scrii pentru CONSULTANTUL EXTERN. Tonul este tehnic si nuantat.
Poti folosi referinte la instrumente (CPI260, ESQ-2, AMI, PASAT) si categorii.
Evidentiaza pattern-uri cross-instrument si congruente/tensiuni.
Discuta fiabilitatea masuratorilor si limitarile.
Planul de dezvoltare include referinte metodologice.
Insight-ul specific: interpretare tehnica aprofundata si recomandari de evaluare suplimentara daca e cazul.`,
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Genereaza feedback narativ adaptat per rol din profilul agregat.
 *
 * @param profile - Profilul agregat din aggregateBattery()
 * @param viewerRole - Rolul destinatarului feedback-ului
 * @param context - Context optional (titlu post, departament)
 * @returns Feedback narativ structurat
 */
export async function generateNarrativeFeedback(
  profile: AggregatedProfile,
  viewerRole: ViewerRole,
  context?: { jobTitle?: string; departmentName?: string }
): Promise<NarrativeFeedback> {
  const roleInstruction = ROLE_INSTRUCTIONS[viewerRole]

  // Construim descrierea profilului fara scoruri brute
  const traitDescriptions = profile.integratedTraits.map(t => {
    const level = t.tScore >= 60 ? "ridicat" : t.tScore >= 45 ? "mediu" : "scazut"
    return `${t.name} (${t.category}): nivel ${level}`
  }).join("\n")

  const contextLine = context
    ? `Context: post "${context.jobTitle || "nespecificat"}", departament "${context.departmentName || "nespecificat"}".`
    : ""

  const systemPrompt = `Esti un psiholog organizational expert in evaluare psihometrica.
Genereaza feedback narativ structurat in limba ROMANA.

${roleInstruction}

REGULI OBLIGATORII:
- NU mentiona scoruri numerice, T-scores, centile sau stanine in text.
- Traduceti totul in limbaj uman accesibil.
- Fiecare paragraf trebuie sa creasca interesul cititorului.
- NU pune virgula inainte de "si" in limba romana.
- Tonul trebuie sa fie profesional dar cald, fara superlative americane ("Perfect!", "Excellent!").

Raspunde STRICT in format JSON:
{
  "summary": "2-3 paragrafe text",
  "strengths": ["punct forte 1 cu context", "punct forte 2 cu context", ...],
  "developmentPlan": [
    {"area": "...", "recommendation": "...", "timeline": "..."},
    ...
  ],
  "roleSpecificInsight": "un paragraf"
}`

  const userMessage = `Profil integrat:
${traitDescriptions}

Zone de excelenta: ${profile.strongAreas.length > 0 ? profile.strongAreas.join("; ") : "Nicio zona evidentiata"}
Arii de dezvoltare: ${profile.developmentAreas.length > 0 ? profile.developmentAreas.join("; ") : "Nicio arie evidentiata"}
Indicatori de risc: ${profile.riskFlags.length > 0 ? profile.riskFlags.join("; ") : "Fara indicatori de risc"}
Profil motivational: ${profile.motivationProfile}
Profil atentie: ${profile.attentionProfile}
Grad de pregatire global: ${profile.overallReadiness}%

${contextLine}

Genereaza feedback-ul in formatul JSON cerut.`

  const response = await cpuCall({
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 3000,
    agentRole: "NARRATIVE_GENERATOR",
    operationType: "generate-narrative-feedback",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0.4,
  })

  // Parse JSON din raspuns
  return parseNarrativeResponse(response.text, profile, viewerRole)
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE PARSER
// ═══════════════════════════════════════════════════════════════

function parseNarrativeResponse(
  responseText: string,
  profile: AggregatedProfile,
  viewerRole: ViewerRole
): NarrativeFeedback {
  try {
    // Extragem JSON-ul din raspuns (poate contine text in jur)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return fallbackNarrative(profile, viewerRole)
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string
      strengths?: string[]
      developmentPlan?: Array<{ area?: string; recommendation?: string; timeline?: string }>
      roleSpecificInsight?: string
    }

    return {
      summary: parsed.summary || fallbackSummary(profile),
      strengths: parsed.strengths || profile.strongAreas.slice(0, 5),
      developmentPlan: (parsed.developmentPlan || []).map(item => ({
        area: item.area || "Nespecificat",
        recommendation: item.recommendation || "De stabilit in sesiune de coaching",
        timeline: item.timeline || "3-6 luni",
      })),
      roleSpecificInsight: parsed.roleSpecificInsight || "",
    }
  } catch {
    return fallbackNarrative(profile, viewerRole)
  }
}

/**
 * Fallback daca AI-ul nu raspunde corect — generam narativ minimal din date.
 */
function fallbackNarrative(
  profile: AggregatedProfile,
  _viewerRole: ViewerRole
): NarrativeFeedback {
  return {
    summary: fallbackSummary(profile),
    strengths: profile.strongAreas.slice(0, 5),
    developmentPlan: profile.developmentAreas.slice(0, 3).map(area => ({
      area,
      recommendation: "Se recomanda un plan structurat de dezvoltare",
      timeline: "6 luni",
    })),
    roleSpecificInsight: profile.riskFlags.length > 0
      ? `Au fost identificati ${profile.riskFlags.length} indicatori de risc care necesita atentie.`
      : "Profilul nu evidentiaza indicatori de risc semnificativi.",
  }
}

function fallbackSummary(profile: AggregatedProfile): string {
  const parts: string[] = []
  parts.push(`Profilul integrat indica un grad de pregatire de ${profile.overallReadiness}%.`)

  if (profile.strongAreas.length > 0) {
    parts.push(`Punctele forte identificate includ: ${profile.strongAreas.slice(0, 3).join(", ")}.`)
  }
  if (profile.developmentAreas.length > 0) {
    parts.push(`Arii de dezvoltare: ${profile.developmentAreas.slice(0, 3).join(", ")}.`)
  }
  if (profile.motivationProfile !== "Neevaluat") {
    parts.push(`Profilul motivational: ${profile.motivationProfile}.`)
  }

  return parts.join(" ")
}
