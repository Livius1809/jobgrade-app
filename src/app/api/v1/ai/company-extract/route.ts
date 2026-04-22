import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  website: z.string().url().optional(),
  cui: z.string().optional(),
  caenName: z.string().optional(),
  companyName: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    // Preluăm datele existente ale companiei
    const profile = await prisma.companyProfile.findUnique({
      where: { tenantId: session.user.tenantId },
      select: { cui: true, industry: true, caenName: true, caenCode: true, mission: true, vision: true },
    }).catch(() => null)

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true },
    }).catch(() => null)

    const companyName = data.companyName || tenant?.name || "Companie necunoscută"
    const caen = data.caenName || profile?.caenName || profile?.industry || ""
    const cui = data.cui || profile?.cui || ""

    // Fetch website content dacă avem URL
    let websiteContent = ""
    if (data.website) {
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
          websiteContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 3000)
        }
      } catch {}
    }

    const hasWebsite = websiteContent.length > 100
    const sourceInfo = hasWebsite
      ? `Conținut website (${data.website}):\n${websiteContent}`
      : `Nu avem website. Generează MVV bazat pe:\n- Denumire: ${companyName}\n- CAEN: ${caen}\n- CUI: ${cui}`

    const prompt = `${hasWebsite ? "Extrage" : "Generează"} misiunea, viziunea și valorile companiei "${companyName}".

${sourceInfo}

IMPORTANT:
- Misiunea = ce face compania ACUM, pentru cine, cum (1-2 propoziții)
- Viziunea = unde vrea să ajungă pe termen lung (1 propoziție)
- Valorile = principii după care operează (3-5 valori scurte)
- Descrierea = ce face compania pe scurt (2-3 propoziții)
${!hasWebsite ? "- Bazează-te pe domeniul CAEN, dimensiunea probabilă și piața din România\n- Formulează REALIST, nu aspirațional excesiv\n- NU inventa nume de produse, clienți sau certificări" : ""}
- Limba: română
- MVV-ul va fi folosit ca referință în evaluarea posturilor — trebuie să reflecte activitatea reală

Returnează **EXCLUSIV** un JSON valid:
{
  "description": "Descriere scurtă (2-3 propoziții)",
  "mission": "Misiunea companiei",
  "vision": "Viziunea companiei",
  "values": ["Valoare 1", "Valoare 2", "Valoare 3"],
  "industry": "Industria principală",
  "size": null,
  "source": "${hasWebsite ? "website" : "generated_from_caen"}"
}

Nu adăuga text în afara JSON-ului.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : ""
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ message: "Nu s-au putut genera informații." }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Date invalide.", errors: error.issues }, { status: 400 })
    }
    console.error("[AI COMPANY-EXTRACT]", error instanceof Error ? error.constructor.name : "Unknown")
    return NextResponse.json({ message: "Eroare la generare." }, { status: 500 })
  }
}
