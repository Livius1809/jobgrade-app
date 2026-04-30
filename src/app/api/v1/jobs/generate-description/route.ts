/**
 * POST /api/v1/jobs/generate-description
 *
 * AI generează text pentru fișa postului bazat pe răspunsurile clientului
 * la întrebările ghidului per criteriu.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const MODEL = "claude-haiku-4-5-20251001"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const { jobTitle, criterionName, answers, fieldTarget } = await request.json()

  if (!jobTitle || !criterionName || !answers) {
    return NextResponse.json({ error: "Date incomplete" }, { status: 400 })
  }

  const fieldLabels: Record<string, string> = {
    description: "descrierea postului",
    responsibilities: "responsabilitățile postului",
    requirements: "cerințele postului",
  }

  // Company Profiler — context MVV pentru alinierea textului
  let companyHint = ""
  if (session.user.tenantId) {
    try {
      const { getAgentContext } = await import("@/lib/company-profiler")
      const ctx = await getAgentContext(session.user.tenantId, "JE")
      const mvvParts = []
      if (ctx.mvv.mission) mvvParts.push(`Misiune: ${ctx.mvv.mission}`)
      if (ctx.mvv.values.length > 0) mvvParts.push(`Valori: ${ctx.mvv.values.join(", ")}`)
      if (mvvParts.length > 0) companyHint = `\nContext companie (aliniază textul cu valorile organizației):\n${mvvParts.join("\n")}\n`
    } catch {}
  }

  const prompt = `Ești expert HR. Scrie un paragraf pentru ${fieldLabels[fieldTarget] || "fișa postului"} al poziției "${jobTitle}", bazat pe informațiile de mai jos.
${companyHint}
Criteriul evaluat: ${criterionName}
Informații de la client: ${answers}

Reguli:
- Scrie în limba română, profesional dar accesibil
- Maxim 3-4 propoziții concise
- Folosește formulări specifice, nu generice
- Nu inventa informații — bazează-te strict pe ce a spus clientul
- Textul trebuie să reflecte nivelul real al postului (operațional vs strategic)
- Formulează ca pentru o fișă de post oficială

Răspunde DOAR cu textul paragrafului, fără explicații suplimentare.`

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    })

    const suggestion = response.content[0].type === "text" ? response.content[0].text.trim() : ""

    return NextResponse.json({ suggestion })
  } catch (error: any) {
    console.error("[GENERATE-DESC]", error)
    return NextResponse.json({ error: "Eroare la generare" }, { status: 500 })
  }
}
