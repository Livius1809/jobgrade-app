/**
 * /api/v1/culture/roi
 *
 * C4 F4 — ROI Cultură
 * POST — Calculează costul financiar al gap-urilor culturale
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

const roiSchema = z.object({
  averageSalary: z.number().positive().optional(),
  turnoverRate: z.number().min(0).max(100).optional(),
  absenteeismRate: z.number().min(0).max(100).optional(),
})

// Tipuri interne
interface CostBreakdown {
  category: string
  estimatedCost: number
  evidence: string
}

interface ROIResult {
  totalAnnualCost: number
  breakdown: CostBreakdown[]
  costOfNotChanging: string
  recommendation: string
  inputsUsed: {
    averageSalary: number
    turnoverRate: number
    absenteeismRate: number
    employeeCount: number
  }
  createdAt: string
}

/**
 * POST — Calculează costul financiar al gap-urilor culturale
 * Utilizează raportul 3C + inputuri opționale (salariu mediu, turnover, absenteism)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = roiSchema.parse(body)

    // Încarcă raportul 3C (trebuie să existe pentru ROI)
    const report3C = await getTenantData<Record<string, unknown>>(tenantId, "CULTURE_3C_REPORT")

    // Încarcă date HR pentru estimări
    const employees = await prisma.employeeSalaryRecord.findMany({
      where: { tenantId },
      select: { baseSalary: true, variableComp: true },
    })

    const employeeCount = employees.length
    const calculatedAvgSalary = employeeCount > 0
      ? Math.round(employees.reduce((sum, e) => sum + e.baseSalary, 0) / employeeCount)
      : 0

    // Folosește inputurile furnizate sau calculează din date
    const avgSalary = data.averageSalary ?? calculatedAvgSalary ?? 5000
    const turnoverRate = data.turnoverRate ?? 15  // default RO: ~15%
    const absenteeismRate = data.absenteeismRate ?? 5  // default RO: ~5%

    const prompt = `Ești expert în consultanță financiară organizațională. Calculează costul FINANCIAR al gap-urilor culturale.

## Date organizaționale
- Număr angajați: ${employeeCount || "necunoscut (folosește 50 ca estimare)"}
- Salariu mediu lunar: ${avgSalary} RON
- Rată turnover: ${turnoverRate}%
- Rată absenteism: ${absenteeismRate}%
- Fond salarii anual estimat: ${(employeeCount || 50) * avgSalary * 12} RON

## Raport 3C (gap-uri culturale):
${report3C ? JSON.stringify(report3C).slice(0, 2000) : "Raport 3C nedisponibil — folosește estimări conservatoare bazate pe industria din România."}

## Categorii de cost de calculat:
1. **Cost turnover** — recrutare + training + productivitate pierdută (standard: 1.5-2x salariu/angajat plecat)
2. **Ineficiență comunicare** — ore pierdute din cauza comunicării deficitare (studii: 2-3h/săpt/angajat)
3. **Rezistență la schimbare** — proiecte întârziate, oportunități ratate
4. **Silozuri departamentale** — duplicare eforturi, lipsă sinergie
5. **Lipsă siguranță psihologică** — idei neexprimate, erori neraportate, inovație blocată

Returnează un JSON valid cu structura:
{
  "totalAnnualCost": numar_in_RON,
  "breakdown": [
    {
      "category": "numele categoriei",
      "estimatedCost": numar_in_RON,
      "evidence": "cum s-a calculat, ce date susțin"
    }
  ],
  "costOfNotChanging": "descriere narativă: ce se întâmplă pe 3-5 ani dacă nu intervii",
  "recommendation": "recomandare concretă de acțiune"
}

REGULI:
- Folosește formule standard din literatura HR (SHRM, Gallup, McKinsey)
- Toate costurile în RON
- Fii conservator — mai bine subestimezi decât supraestimezi
- Fiecare calcul trebuie explicat (evidence)
- Dacă 3C lipsește, estimează pe baza ratelor medii din România`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    })

    const aiText = response.content[0].type === "text" ? response.content[0].text : ""

    // Extrage JSON din răspunsul Claude
    let roiResult: { totalAnnualCost: number; breakdown: CostBreakdown[]; costOfNotChanging: string; recommendation: string }
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Nu s-a putut extrage JSON.")
      roiResult = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { message: "Eroare la procesarea răspunsului AI. Reîncercați." },
        { status: 502 }
      )
    }

    // Salvează rezultatul ROI pentru plan de intervenție
    const storedResult: ROIResult = {
      ...roiResult,
      inputsUsed: {
        averageSalary: avgSalary,
        turnoverRate,
        absenteeismRate,
        employeeCount: employeeCount || 50,
      },
      createdAt: new Date().toISOString(),
    }
    await setTenantData(tenantId, "CULTURE_ROI", storedResult)

    return NextResponse.json(storedResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[CULTURE ROI POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
