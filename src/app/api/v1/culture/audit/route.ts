/**
 * /api/v1/culture/audit
 *
 * C4 F2 — Audit cultural AI pe 7 dimensiuni
 * POST — Analiză cu calibrare opțională pe specificul cultural românesc
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

const auditSchema = z.object({
  calibrateRO: z.boolean().optional().default(false),
})

// Cele 7 dimensiuni culturale analizate
const CULTURE_DIMENSIONS = [
  "Leadership",
  "Comunicare",
  "Învățare",
  "Adaptare",
  "Coeziune",
  "Performanță",
  "Inovație",
] as const

interface DimensionResult {
  name: string
  score: number       // 0-100
  evidence: string
  calibrationNote?: string
}

interface AuditResult {
  dimensions: DimensionResult[]
  overallScore: number
  culturalProfile: string
  calibratedRO: boolean
  createdAt: string
}

/**
 * POST — Audit cultural AI pe 7 dimensiuni
 * Opțional: calibrare pe specificul cultural românesc (Hofstede + Daniel David)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = auditSchema.parse(body)

    // Încarcă toate datele disponibile pentru audit
    const [company, departments, jobs, employees, climateState] = await Promise.all([
      // Profilul companiei (MVV, industrie, dimensiune)
      prisma.companyProfile.findFirst({
        where: { tenantId },
      }),
      // Departamente
      prisma.department.findMany({
        where: { tenantId, isActive: true },
        select: { name: true },
      }),
      // Joburi active
      prisma.job.findMany({
        where: { tenantId, isActive: true },
        select: { title: true, status: true },
      }),
      // Angajați (date agregate)
      prisma.employeeSalaryRecord.findMany({
        where: { tenantId },
        select: {
          department: true,
          baseSalary: true,
          gender: true,
          periodYear: true,
        },
      }),
      // Rezultate climat organizațional (din tenant storage)
      getTenantData<Record<string, unknown>>(tenantId, "CLIMATE_CO"),
    ])

    // Calculează metrici HR agregate
    const totalEmployees = employees.length
    const avgSalary = totalEmployees > 0
      ? employees.reduce((sum, e) => sum + e.baseSalary, 0) / totalEmployees
      : 0
    const genderDistribution = employees.reduce(
      (acc, e) => {
        acc[e.gender] = (acc[e.gender] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Context pentru Claude
    const contextData = `## Date organizaționale disponibile

### Profil companie
- Industrie: ${company?.industry ?? "nedisponibil"}
- Dimensiune: ${company?.size ?? "nedisponibil"}
- Misiune: ${company?.mission ?? "nedeclarată"}
- Viziune: ${company?.vision ?? "nedeclarată"}
- Valori: ${company?.values?.join(", ") ?? "nedeclarate"}
- Maturitate MVV: ${company?.mvvMaturity ?? "IMPLICIT"}
- Scor coerență MVV: ${company?.mvvCoherenceScore ?? "necalculat"}

### Structură
- Departamente: ${departments.map(d => d.name).join(", ") || "—"}
- Poziții active: ${jobs.length}
- Angajați (salary records): ${totalEmployees}
- Salariu mediu: ${Math.round(avgSalary)} RON
- Distribuție gen: ${JSON.stringify(genderDistribution)}

### Climat organizațional
${climateState ? `Date climat disponibile: ${JSON.stringify(climateState).slice(0, 1000)}` : "Chestionar climat necompletat încă."}
`

    // Secțiunea de calibrare RO
    const calibrationContext = data.calibrateRO
      ? `

## CALIBRARE CULTURALĂ ROMÂNEASCĂ (OBLIGATORIE)

Aplică aceste filtre de calibrare pe fiecare dimensiune:

### Hofstede — Dimensiuni culturale România:
- **Power Distance (PDI): 90** — distanță foarte mare față de autoritate; ierarhie pronunțată
- **Individualism (IDV): 30** — societate colectivistă; grupul primează
- **Masculinity (MAS): 42** — moderată spre feminină; echilibru competiție/cooperare
- **Uncertainty Avoidance (UAI): 90** — evitare foarte mare a incertitudinii; proceduri, reguli
- **Long Term Orientation (LTO): 52** — moderată; pragmatism dar și tradiție
- **Indulgence (IVR): 20** — societate restrictivă; controlul impulsurilor

### Daniel David — Profilul cognitiv românesc:
- Tendința spre fatalism și externalizarea responsabilității
- Discrepanță între valorile declarate și comportamentul real
- Rezistență pasivă la schimbare (nu activă)
- Creativitate individuală ridicată, dar conformism social
- Relații informale puternice care compensează structurile formale slabe
- „Descurcăreț" — adaptare situațională, nu strategică

Pentru fiecare dimensiune, adaugă o notă de calibrare care explică CUM specificul cultural românesc influențează scorul și interpretarea.`
      : ""

    const prompt = `Ești expert în audit cultural organizațional. Analizează cultura organizației pe 7 dimensiuni fundamentale.

${contextData}
${calibrationContext}

Analizează cele 7 dimensiuni: ${CULTURE_DIMENSIONS.join(", ")}.

Returnează un JSON valid cu structura:
{
  "dimensions": [
    {
      "name": "numele dimensiunii",
      "score": 0-100,
      "evidence": "evidențe concrete din datele disponibile"${data.calibrateRO ? `,
      "calibrationNote": "nota de calibrare pe specificul cultural românesc"` : ""}
    }
  ],
  "overallScore": 0-100,
  "culturalProfile": "descriere sintetică a profilului cultural (2-3 paragrafe)"
}

REGULI:
- Scorurile reflectă REALITATEA din date, nu aspirații
- Dacă datele sunt insuficiente pentru o dimensiune, scorul este conservator (40-50) cu explicație
- Evidențele citează date concrete, nu generalizări
- Profilul cultural este narativ, nu bullet points`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    })

    const aiText = response.content[0].type === "text" ? response.content[0].text : ""

    // Extrage JSON din răspunsul Claude
    let auditResult: { dimensions: DimensionResult[]; overallScore: number; culturalProfile: string }
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Nu s-a putut extrage JSON din răspunsul AI.")
      auditResult = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { message: "Eroare la procesarea răspunsului AI. Reîncercați." },
        { status: 502 }
      )
    }

    // Salvează rezultatul auditului în SystemConfig pentru utilizare ulterioară (3C Report, etc.)
    const storedResult: AuditResult = {
      ...auditResult,
      calibratedRO: data.calibrateRO,
      createdAt: new Date().toISOString(),
    }
    await setTenantData(tenantId, "CULTURE_AUDIT", storedResult)

    return NextResponse.json(storedResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[CULTURE AUDIT POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
