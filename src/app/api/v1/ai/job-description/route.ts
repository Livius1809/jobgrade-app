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
  "relationships": {
    "hierarchical": {
      "reportsTo": "Titlul postului superior direct (ex: Director Departament)",
      "supervises": ["Titlurile posturilor subordonate directe (array, poate fi gol)"]
    },
    "coordination": {
      "coordinatesWith": ["Posturi/departamente cu care colaborează lateral pe proiecte sau procese comune"]
    },
    "functional": {
      "receivesInputFrom": ["De la cine primește inputuri — titluri posturi sau departamente"],
      "deliversOutputTo": ["Cui livrează outputuri — titluri posturi sau departamente"]
    },
    "representation": {
      "substitutes": ["Pe cine înlocuiește în anumite situații (concediu, delegare, urgențe) — titluri posturi"],
      "substitutedBy": ["De cine este înlocuit în absență — titluri posturi"]
    }
  },
  "missingInfo": ["Ce informații lipsesc pentru o evaluare mai precisă (array de întrebări)"],
  "standardSections": {
    "gdpr": "Obligații privind protecția datelor personale specifice acestui post (1-3 propoziții adaptate la responsabilitățile postului)",
    "ssm": "Obligații privind securitatea și sănătatea în muncă (1-3 propoziții adaptate la condițiile de lucru ale postului)",
    "psi": "Obligații privind prevenirea și stingerea incendiilor (1-2 propoziții)",
    "confidentiality": "Obligații privind păstrarea confidențialității informațiilor (1-3 propoziții adaptate la nivelul de acces al postului)",
    "internalControl": "Responsabilități de control intern — DOAR pentru posturi de management (oameni sau procese). Dacă postul nu are funcție de conducere, pune null."
  }
}

IMPORTANT:
- "responsibilities" și "requirements" sunt text CURSIV, profesional — clientul le citește ca document
- "criteriaMapping" este structura INTERNĂ — informația mapată pe cele 6 criterii de evaluare
- "standardSections" sunt secțiuni obligatorii/opționale din fișa de post — text adaptat postului, nu generic
- "standardSections.internalControl" = null dacă postul NU are funcție de conducere (oameni sau procese)
- "missingInfo" — dacă informația e insuficientă pentru un criteriu, pune întrebarea aici
- Evaluezi POSTUL (cerințele poziției), nu o persoană
- Niveluri: Educație A(minim)-G(maxim), Comunicare A-E, Rezolvare probleme A-G, Decizii A-G, Impact A(operațional)-D(strategic), Condiții A(birou)-C(risc)
- Un "Manager magazin" = Impact B-C (operațional), NU D (strategic)
- "relationships" cuprinde 4 tipuri: ierarhice (cui raportează, pe cine coordonează), de coordonare (colaborare laterală), funcționale (inputuri/outputuri), de reprezentare (pe cine înlocuiește la absență și de cine e înlocuit)
- Bazează-te pe CONȚINUT, nu pe titlu
- Textul la GDPR, SSM, PSI trebuie ADAPTAT la post, nu copy-paste generic

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

    // Sugestie cod COR automat pe baza titlului
    try {
      const { suggestCOR } = await import("@/lib/cor/nomenclator")
      const corSuggestions = suggestCOR(data.title)
      if (corSuggestions.length > 0) {
        parsed.corSuggestion = corSuggestions[0] // prima sugestie
        parsed.corAlternatives = corSuggestions.slice(1, 4) // alternative
      }
    } catch {}

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
