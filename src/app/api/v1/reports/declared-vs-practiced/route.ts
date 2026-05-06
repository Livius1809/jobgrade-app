/**
 * /api/v1/reports/declared-vs-practiced
 *
 * POST — Raport declarat vs practicat
 * Compara MVV-ul declarat al companiei cu datele din audit cultural + raport 3C.
 * Foloseste cpuCall pentru analiza AI.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface GapItem {
  area: string
  declared: string
  practiced: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

interface DeclaredVsPracticedResult {
  gaps: GapItem[]
  summary: string
  recommendations: string[]
  createdAt: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Load company profile (MVV)
    const company = await prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        mission: true,
        vision: true,
        values: true,
        description: true,
        missionDraft: true,
        visionDraft: true,
        valuesDraft: true,
        mvvMaturity: true,
      },
    })

    if (!company) {
      return NextResponse.json(
        { message: "Profilul companiei nu a fost gasit." },
        { status: 404 },
      )
    }

    // Load culture audit + 3C report from tenant-storage
    const [auditData, threeCData] = await Promise.all([
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_AUDIT"),
      getTenantData<Record<string, unknown>>(tenantId, "3C_REPORT"),
    ])

    if (!auditData && !threeCData) {
      return NextResponse.json(
        {
          message:
            "Date insuficiente. Necesare: audit cultural sau raport 3C.",
        },
        { status: 400 },
      )
    }

    // Build MVV context
    const mission = company.mission || company.missionDraft || "nedefinita"
    const vision = company.vision || company.visionDraft || "nedefinita"
    const values =
      company.values.length > 0
        ? company.values
        : company.valuesDraft.length > 0
          ? company.valuesDraft
          : ["nedefinite"]

    const contextData = `## Ce declara compania (MVV)

### Misiune
${mission}

### Viziune
${vision}

### Valori
${values.join(", ")}

### Maturitate MVV: ${company.mvvMaturity}
### Descriere companie: ${company.description || "nedisponibila"}

## Ce arata datele (audit cultural + raport 3C)

### Audit cultural
${auditData ? JSON.stringify(auditData).slice(0, 2000) : "nedisponibil"}

### Raport 3C
${threeCData ? JSON.stringify(threeCData).slice(0, 2000) : "nedisponibil"}
`

    const result = await cpuCall({
      system:
        "Esti expert in analiza organizationala. Compari ce declara o companie (misiune, viziune, valori) cu ce arata datele practice (audit cultural, raport 3C). Identifici gap-uri concrete.",
      messages: [
        {
          role: "user",
          content: `${contextData}

Analizeaza diferentele intre ce declara compania si ce arata datele. Identifica gap-uri concrete.

Returneaza JSON valid:
{
  "gaps": [
    {
      "area": "domeniul gap-ului (ex: Valori, Comunicare, Leadership)",
      "declared": "ce declara compania",
      "practiced": "ce arata datele",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL"
    }
  ],
  "summary": "rezumat in 2-3 propozitii",
  "recommendations": ["recomandare 1", "recomandare 2", "recomandare 3"]
}`,
        },
      ],
      max_tokens: 3000,
      agentRole: "COA",
      operationType: "report-declared-vs-practiced",
      tenantId,
      skipObjectiveCheck: true,
    })

    if (result.degraded) {
      return NextResponse.json(
        { message: "Serviciu temporar indisponibil." },
        { status: 503 },
      )
    }

    let parsed: Omit<DeclaredVsPracticedResult, "createdAt">
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("JSON not found")
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { message: "Eroare la procesarea raspunsului AI." },
        { status: 502 },
      )
    }

    const report: DeclaredVsPracticedResult = {
      ...parsed,
      createdAt: new Date().toISOString(),
    }

    await setTenantData(tenantId, "REPORT_DECLARED_VS_PRACTICED", report)

    return NextResponse.json(report)
  } catch (error) {
    console.error("[DECLARED-VS-PRACTICED POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
