/**
 * /api/v1/culture/manual
 *
 * C4 — Generare manual cultura organizationala
 * POST — Manual AI pe baza: audit cultural + raport 3C + plan interventii
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface CultureManualResult {
  sections: Array<{
    title: string
    content: string
    order: number
  }>
  generatedAt: string
  basedOn: {
    auditDate: string | null
    report3CDate: string | null
    interventionDate: string | null
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Load all required data
    const [company, cultureAudit, report3C, interventionPlan] = await Promise.all([
      prisma.companyProfile.findFirst({ where: { tenantId } }),
      getTenantData<{ dimensions?: Array<{ name: string; score: number; evidence: string }>; overallScore?: number; culturalProfile?: string; createdAt?: string }>(tenantId, "CULTURE_AUDIT"),
      getTenantData<{ report?: string; createdAt?: string }>(tenantId, "3C_REPORT"),
      getTenantData<{ actions?: Array<{ action: string; status: string; priority: string }>; createdAt?: string }>(tenantId, "INTERVENTION_PLAN"),
    ])

    if (!cultureAudit || !report3C || !interventionPlan) {
      return NextResponse.json(
        { message: "Date insuficiente. Necesare: audit cultural, raport 3C si plan de interventie." },
        { status: 400 }
      )
    }

    const contextData = `## Date pentru manual cultura organizationala

### Profil companie
- Industrie: ${company?.industry ?? "nedisponibil"}
- Misiune: ${company?.mission ?? "nedeclarata"}
- Viziune: ${company?.vision ?? "nedeclarata"}
- Valori: ${company?.values?.join(", ") ?? "nedeclarate"}

### Audit Cultural (scor general: ${cultureAudit.overallScore ?? "N/A"})
${cultureAudit.dimensions?.map(d => `- ${d.name}: ${d.score}/100 — ${d.evidence}`).join("\n") ?? ""}
Profil cultural: ${cultureAudit.culturalProfile ?? ""}

### Raport 3C
${typeof report3C.report === "string" ? report3C.report.slice(0, 2000) : JSON.stringify(report3C).slice(0, 2000)}

### Plan Interventie
${interventionPlan.actions?.map(a => `- [${a.status}] ${a.action} (prioritate: ${a.priority})`).join("\n") ?? ""}
`

    const result = await cpuCall({
      system: `Esti consultant organizational expert in cultura organizationala. Genereaza un manual de cultura complet, structurat pe sectiuni clare, scris profesionist dar accesibil. NU mentiona surse academice, autori sau metodologii. Prezinta ca observatii proprii de consultanta.`,
      messages: [
        {
          role: "user",
          content: `${contextData}

Genereaza un MANUAL DE CULTURA ORGANIZATIONALA complet cu urmatoarele sectiuni:
1. Identitate culturala (cine suntem, ce ne defineste)
2. Valorile in practica (cum se manifesta valorile in comportament zilnic)
3. Norme si asteptari comportamentale (ce e acceptabil, ce nu)
4. Stilul de leadership (cum conduc liderii aici)
5. Comunicare si colaborare (cum interactionam)
6. Invatare si dezvoltare (cum crestem)
7. Adaptare si inovatie (cum raspundem la schimbare)
8. Plan de actiune cultural (interventii prioritare)

Returneaza JSON:
{
  "sections": [
    { "title": "...", "content": "continut detaliat (min 200 cuvinte per sectiune)", "order": 1 }
  ]
}`,
        },
      ],
      max_tokens: 6000,
      agentRole: "COCSA",
      operationType: "culture-manual-generation",
      tenantId,
      skipObjectiveCheck: true,
    })

    if (result.degraded) {
      return NextResponse.json({ message: "Serviciu temporar indisponibil." }, { status: 503 })
    }

    let parsed: { sections: Array<{ title: string; content: string; order: number }> }
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("JSON not found")
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ message: "Eroare la procesarea raspunsului AI." }, { status: 502 })
    }

    const manual: CultureManualResult = {
      sections: parsed.sections,
      generatedAt: new Date().toISOString(),
      basedOn: {
        auditDate: cultureAudit.createdAt ?? null,
        report3CDate: report3C.createdAt ?? null,
        interventionDate: interventionPlan.createdAt ?? null,
      },
    }

    await setTenantData(tenantId, "CULTURE_MANUAL", manual)
    return NextResponse.json(manual)
  } catch (error) {
    console.error("[CULTURE MANUAL POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
