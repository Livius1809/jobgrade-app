import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

const schema = z.object({
  website: z.string().url(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    // Fetch website content
    let websiteContent = ""
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const res = await fetch(data.website, {
        signal: controller.signal,
        headers: { "User-Agent": "JobGrade-Bot/1.0" },
      })
      clearTimeout(timeout)

      if (res.ok) {
        const html = await res.text()
        // Extrage textul din HTML (basic)
        websiteContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 3000)
      }
    } catch {
      // Ignoră erori de fetch
    }

    const prompt = `Analizează conținutul website-ului companiei și extrage informații pentru profilul companiei.

URL: ${data.website}
${websiteContent ? `\nConținut website:\n${websiteContent}` : "\n(Conținut indisponibil - folosește domeniul URL-ului pentru a deduce informații)"}

Returnează **EXCLUSIV** un JSON valid:
{
  "description": "Descriere scurtă a companiei (2-3 propoziții)",
  "mission": "Misiunea companiei dacă este menționată (sau null)",
  "vision": "Viziunea companiei dacă este menționată (sau null)",
  "industry": "Industria principală (una din: IT & Software, Producție, Retail, Servicii financiare, Sănătate, Construcții, Transport & Logistică, Educație, Telecomunicații, Alimentar, Altele)",
  "size": "Dimensiunea estimată dacă e menționată (sau null)"
}

Nu adăuga text în afara JSON-ului.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : ""

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { message: "Nu s-au putut extrage informații de pe site." },
        { status: 422 }
      )
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "URL invalid.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI COMPANY-EXTRACT]", error instanceof Error ? error.constructor.name : "Unknown")
    return NextResponse.json({ message: "Eroare la extragere." }, { status: 500 })
  }
}
