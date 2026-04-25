/**
 * POST /api/v1/b2c/card-3/chat — Consilier Carieră AI
 *
 * Comportament non-directiv (explorativ):
 * - Nu dă sfaturi directe — explorează cu clientul
 * - "Ce te atrage la postul ăsta?" nu "Ar trebui să aplici la X"
 * - Continuă dialogul din contextul Profiler (nu reia de la zero)
 * - Context invizibil (regula de aur)
 * - Facilitare matură din starea cognitivă
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 30

const MODEL = "claude-sonnet-4-20250514"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, message, history } = body

  if (!userId || !message?.trim()) {
    return NextResponse.json({ error: "userId + message necesare" }, { status: 400 })
  }

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  // Context: profil profesional extras
  const card = await prisma.b2CCardProgress.findFirst({
    where: { userId, card: "CARD_3" },
    select: { cvExtractedData: true, questionnaireData: true, phase: true },
  })

  const profile = card?.cvExtractedData as Record<string, unknown> | null
  const questionnaire = card?.questionnaireData as Record<string, unknown> | null

  // Facilitare matură din starea cognitivă
  let facilitationGuidance = ""
  try {
    const { loadCognitiveState } = await import("@/lib/agents/cognitive-state")
    const { buildFacilitationProfile } = await import("@/lib/agents/facilitation-maturity")
    const state = await loadCognitiveState("CAREER_COUNSELOR")
    const prof = buildFacilitationProfile(state)
    facilitationGuidance = prof.promptInjection
  } catch {}

  const systemPrompt = `Ești Consilierul de Carieră din platforma JobGrade.

ROLUL TĂU:
Ghidezi clientul să-și descopere valoarea profesională și să-și găsească locul potrivit.
Nu dai sfaturi directe. Explorezi împreună cu clientul.

COMPORTAMENT NON-DIRECTIV:
- NU: "Ar trebui să aplici la X" sau "Postul Y e potrivit pentru tine"
- DA: "Ce te atrage la acest tip de rol?" sau "Cum ar arăta o zi de lucru ideală?"
- NU: "Din experiența mea..." (contra-transfer)
- DA: "Hai să explorăm asta — ce înseamnă pentru tine...?"
- Când clientul cere un sfat direct, reformulezi: "Ce variante vezi tu?"
- Când clientul e confuz, simplifici: "Dacă ar fi doar două opțiuni, care ar fi?"

REGULA DE AUR: Contextul e INVIZIBIL.
Ai acces la profilul profesional al clientului dar NU transpare.
Nu spui "Văd că ai experiență în..." — construiești pe ce știi fără să arăți că știi.

${profile ? `CONTEXT INVIZIBIL (NU menționa direct):
- Rol: ${profile.title || "nedefinit"}
- Experiență: ${profile.experience || "nedefinită"}
- Competențe: ${profile.requirements || "nedefinite"}
- Educație: ${profile.education || "nedefinită"}` : "Clientul nu a încărcat CV — explorezi fără presupuneri."}

${questionnaire ? `PREFERINȚE (INVIZIBIL):
- Nivel: ${questionnaire.experienceLevel || "?"}
- Tip contract: ${questionnaire.contractType || "?"}
- Relocare: ${questionnaire.relocation || "?"}
- Zonă: ${questionnaire.geography || "?"}` : ""}

FAZA CURENTĂ: ${card?.phase || "CHRYSALIS"}
${card?.phase === "CHRYSALIS" ? "Clientul e la început — ajută-l să-și clarifice ce vrea." : ""}
${card?.phase === "BUTTERFLY" ? "Clientul începe să înțeleagă — aprofundează, nu grăbi." : ""}
${card?.phase === "FLIGHT" ? "Clientul e pregătit — ghidează-l spre acțiune concretă." : ""}

${facilitationGuidance}

LIMBĂ: Română, natural, fără jargon HR.
TON: Cald dar profesionist. Ca un prieten care se pricepe.
LUNGIME: 2-3 paragrafe maxim. Nu monologa.`

  const historyMessages = (history || []).map((h: any) => ({
    role: h.role === "user" ? "user" as const : "assistant" as const,
    content: h.content,
  }))

  const client = new Anthropic()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: systemPrompt,
    messages: [...historyMessages, { role: "user", content: message.trim() }],
  })

  const answer = response.content[0].type === "text" ? response.content[0].text : ""

  // Update stare cognitivă Consilier Carieră
  try {
    const { updateStateAfterExecution } = await import("@/lib/agents/cognitive-state")
    await updateStateAfterExecution("CAREER_COUNSELOR", {
      taskId: `chat-${Date.now()}`,
      taskTitle: `Conversație B2C carieră: "${message.trim().slice(0, 30)}"`,
      succeeded: true,
      costUSD: 0.015,
      wasFirstAttempt: true,
      taskType: "CLIENT_INTERACTION",
    })
  } catch {}

  return NextResponse.json({ answer })
}
