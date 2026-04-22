/**
 * POST /api/v1/ai/relevance-check
 *
 * Analizează textul unei fișe de post scrisă de client și returnează:
 * - Scor relevanță per criteriu (0-100%)
 * - Ce lipsește per criteriu
 * - Scor global (media)
 * - Sugestii de completare
 *
 * Folosit în timp real pe măsură ce clientul scrie.
 * Model: Haiku (rapid + ieftin)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { title, text } = await req.json()
    if (!text || text.length < 20) {
      return NextResponse.json({
        score: 0,
        criteria: {
          education: { score: 0, hint: "Descrie ce studii/experiență necesită postul" },
          communication: { score: 0, hint: "Descrie cu cine și cum comunică persoana" },
          problemSolving: { score: 0, hint: "Descrie ce probleme rezolvă și complexitatea lor" },
          decisionMaking: { score: 0, hint: "Descrie ce decizii ia și impactul lor" },
          businessImpact: { score: 0, hint: "Descrie impactul asupra organizației" },
          workConditions: { score: 0, hint: "Descrie condițiile de lucru (birou, teren, risc)" },
        },
      })
    }

    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Analizează acest text de fișă de post și evaluează cât de completă e informația per criteriu de evaluare.

POST: ${title || "nespecificat"}
TEXT CLIENT:
${text.slice(0, 2000)}

Returnează STRICT JSON:
{
  "education": { "score": 0-100, "hint": "ce mai trebuie adăugat sau gol dacă e OK" },
  "communication": { "score": 0-100, "hint": "" },
  "problemSolving": { "score": 0-100, "hint": "" },
  "decisionMaking": { "score": 0-100, "hint": "" },
  "businessImpact": { "score": 0-100, "hint": "" },
  "workConditions": { "score": 0-100, "hint": "" }
}

Score 100 = informația e suficientă pentru evaluare pe acest criteriu.
Score 0 = nicio informație relevantă.
Hint = sugestie scurtă (max 10 cuvinte) ce mai trebuie adăugat. Gol dacă score >= 80.`
      }],
    })

    const raw = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ score: 0, criteria: {} })
    }

    const criteria = JSON.parse(jsonMatch[0])
    const scores = Object.values(criteria).map((c: any) => c.score || 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0

    return NextResponse.json({ score: avgScore, criteria })
  } catch (error) {
    console.error("[RELEVANCE-CHECK]", error)
    return NextResponse.json({ score: 0, criteria: {} }, { status: 500 })
  }
}
