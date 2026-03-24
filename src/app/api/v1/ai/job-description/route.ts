import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

const schema = z.object({
  title: z.string().min(3),
  department: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    const prompt = `Ești expert în HR din România. Generează o fișă de post în română pentru poziția: "${data.title}"${data.department ? ` din departamentul ${data.department}` : ""}.

Returnează **EXCLUSIV** un JSON valid cu structura:
{
  "purpose": "Scopul rolului în 1-2 propoziții",
  "responsibilities": "Lista cu responsabilitățile principale, separate prin newline, fiecare pe un rând nou",
  "requirements": "Lista cu cerințele și calificările necesare, separate prin newline"
}

Nu adăuga text în afara JSON-ului.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : ""

    // Extrage JSON-ul din răspuns
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ message: "Eroare la parsarea răspunsului AI." }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI JOB-DESC]", error)
    return NextResponse.json({ message: "Eroare la generare AI." }, { status: 500 })
  }
}
