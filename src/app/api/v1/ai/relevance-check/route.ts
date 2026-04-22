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
  "education": { "score": 0-100, "hint": "intrebare naturala", "options": [{"text": "varianta 1 limbaj natural", "code": "C"}, {"text": "varianta 2", "code": "E"}] },
  "communication": { "score": 0-100, "hint": "", "options": [] },
  "problemSolving": { "score": 0-100, "hint": "", "options": [] },
  "decisionMaking": { "score": 0-100, "hint": "", "options": [] },
  "businessImpact": { "score": 0-100, "hint": "", "options": [] },
  "workConditions": { "score": 0-100, "hint": "", "options": [] }
}

IMPORTANT pentru options:
- "text" = formulare naturală pe care clientul o vede și o selectează
- "code" = litera internă de scorare (A-G) — NU se afișează clientului
- Oferă 2-3 variante ordonate de la nivel scăzut la nivel înalt
- Options GOALE dacă score = 100

Score 100 = informația e suficientă.
Score 0 = nicio informație relevantă.
Score sub 100 = lipsesc detalii.
Hint = întrebare naturală + 2-3 variante concrete de răspuns din care clientul alege.
Formulează hint-ul ca ghidare cu exemple, NU ca întrebare seacă.
NU menționa criteriul sau termenul tehnic.

Exemple de hint-uri BUNE:
- "Ce pregătire necesită postul? De exemplu: studii medii cu experiență practică, studii superioare de specialitate, sau studii postuniversitare cu certificări"
- "Cu cine comunică persoana? De exemplu: doar echipa internă, clienți și parteneri externi, sau conducerea și instituții externe"
- "Ce probleme rezolvă? De exemplu: probleme de rutină cu soluții cunoscute, probleme complexe care necesită analiză, sau situații noi fără precedent"
- "Ce decizii ia? De exemplu: decizii operaționale de zi cu zi, decizii care afectează departamentul, sau decizii strategice pentru organizație"
- "Ce impact are asupra organizației? De exemplu: contribuie la executarea sarcinilor, coordonează o echipă sau un proiect, sau influențează direcția strategică"
- "În ce condiții lucrează? De exemplu: birou standard, deplasări frecvente, sau condiții speciale (zgomot, temperaturi, risc fizic)"

Hint GOLL DOAR dacă score = 100.`
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
