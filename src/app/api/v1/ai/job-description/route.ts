import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { buildKBContext } from "@/lib/kb/inject"

const schema = z.object({
  title: z.string().min(3),
  department: z.string().optional(),
  rawText: z.string().optional(), // text extras din PDF/Word upload
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    const kbContext = await buildKBContext({
      agentRole: "HR_COUNSELOR",
      context: `fișă de post evaluare criterii ${data.title}${data.department ? ` ${data.department}` : ""}`,
      limit: 3,
      kbType: "METHODOLOGY",
    })

    // Company Profiler — context MVV + coerență pentru generarea fișei
    let companyContext = ""
    if (session.user.tenantId) {
      try {
        const { getAgentContext } = await import("@/lib/company-profiler")
        const ctx = await getAgentContext(session.user.tenantId, "JE")
        companyContext = `\nCONTEXT COMPANIE (aliniază fișa cu misiunea și valorile):\n${ctx.companyEssence}`
        if (ctx.deviationsToFlag.length > 0) {
          companyContext += `\nATENȚIE — deviații identificate:\n${ctx.deviationsToFlag.map(d => `- ${d}`).join("\n")}`
        }
      } catch {}
    }

    const systemPrompt = [
      "Ești expert în HR din România, specializat în redactarea fișelor de post și evaluarea posturilor.",
      "Fișa de post trebuie să conțină informație structurată pe 6 criterii de evaluare, chiar dacă o prezinți cursiv.",
      kbContext,
      companyContext,
    ].filter(Boolean).join("\n\n")

    const isFromUpload = !!data.rawText
    const sourceText = isFromUpload
      ? `Am primit următorul text extras dintr-un document existent:\n\n${(data.rawText || "").slice(0, 3000)}\n\nExtrage și structurează informația.`
      : `Generează de la zero o fișă de post pentru: "${data.title}"${data.department ? ` din departamentul ${data.department}` : ""}.`

    const prompt = `${sourceText}

Returnează **EXCLUSIV** un JSON valid cu structura:
{
  "purpose": "Scopul rolului în 1-2 propoziții",
  "responsibilities": "Responsabilitățile principale (text cursiv, profesional)",
  "requirements": "Cerințele și calificările necesare (text cursiv)",
  "criteriaMapping": {
    "education": {
      "level": "A-G",
      "summary": "Ce nivel de educație/experiență necesită postul și de ce",
      "evidence": "Elemente concrete din fișă care susțin nivelul"
    },
    "communication": {
      "level": "A-E",
      "summary": "Ce nivel de comunicare necesită și de ce",
      "evidence": "Elemente concrete"
    },
    "problemSolving": {
      "level": "A-G",
      "summary": "Complexitatea problemelor de rezolvat",
      "evidence": "Elemente concrete"
    },
    "decisionMaking": {
      "level": "A-G",
      "summary": "Nivelul decizional și impactul deciziilor",
      "evidence": "Elemente concrete"
    },
    "businessImpact": {
      "level": "A-D",
      "summary": "Impactul direct asupra afacerii",
      "evidence": "Elemente concrete"
    },
    "workConditions": {
      "level": "A-C",
      "summary": "Condițiile de lucru (fizice, psihice, risc)",
      "evidence": "Elemente concrete"
    }
  },
  "missingInfo": ["Ce informații lipsesc pentru o evaluare mai precisă (array de întrebări)"]
}

IMPORTANT:
- "responsibilities" și "requirements" sunt text CURSIV, profesional — clientul le citește ca document
- "criteriaMapping" este structura INTERNĂ — informația mapată pe cele 6 criterii de evaluare
- "missingInfo" — dacă informația e insuficientă pentru un criteriu, pune întrebarea aici
- Evaluezi POSTUL (cerințele poziției), nu o persoană
- Niveluri: Educație A(minim)-G(maxim), Comunicare A-E, Rezolvare probleme A-G, Decizii A-G, Impact A(operațional)-D(strategic), Condiții A(birou)-C(risc)
- Un "Manager magazin" = Impact B-C (operațional), NU D (strategic)
- Bazează-te pe CONȚINUT, nu pe titlu

Nu adăuga text în afara JSON-ului.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : ""

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ message: "Eroare la parsarea răspunsului AI." }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // JD generată = cunoaștere despre structura posturilor per industrie
    try {
      const { learnFromReport } = await import("@/lib/learning-hooks")
      await learnFromReport("JOB_DESCRIPTION", session.user.tenantId, `JD generata: ${data.title}${data.department ? ` (${data.department})` : ""} — ${JSON.stringify(parsed.criteriaMapping || {}).slice(0, 300)}`)
    } catch {}

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI JOB-DESC]", error instanceof Error ? error.constructor.name : "Unknown")
    return NextResponse.json({ message: "Eroare la generare AI." }, { status: 500 })
  }
}
