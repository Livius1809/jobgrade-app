/**
 * /api/v1/compensation/variable
 *
 * Pachete salariale variabil C3 (Competitivitate): configurare componente
 * variabile per grad salarial (bonus, comision, beneficii).
 *
 * POST — Configureaza compensatie variabila per grad
 * GET  — Lista configuratii compensatie variabila per tenant, grupate pe grad
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema validare input
const VariableCompComponentSchema = z.object({
  name: z.string().min(1, "Numele componentei este obligatoriu"),
  type: z.enum(["BONUS", "COMMISSION", "BENEFIT"]),
  targetPct: z.number().min(0).max(100),
  frequency: z.string().min(1, "Frecventa este obligatorie"),
  criteria: z.string().min(1, "Criteriile sunt obligatorii"),
})

const VariableCompInputSchema = z.object({
  gradeId: z.string().min(1, "gradeId este obligatoriu"),
  components: z.array(VariableCompComponentSchema).min(1, "Cel putin o componenta este obligatorie"),
})

// Tipuri pentru structura compensatiei variabile
interface VariableCompConfig {
  gradeId: string
  gradeName: string | null
  components: Array<{
    name: string
    type: "BONUS" | "COMMISSION" | "BENEFIT"
    targetPct: number
    frequency: string
    criteria: string
  }>
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Cheie SystemConfig pentru compensatie variabila per grad
function variableCompKey(tenantId: string, gradeId: string): string {
  return `VARIABLE_COMP_${tenantId}_${gradeId}`
}

// POST — Configureaza compensatie variabila per grad
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user

    const body = await req.json()
    const parsed = VariableCompInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { gradeId, components } = parsed.data

    // Verificam ca gradul exista si apartine tenant-ului
    const grade = await prisma.salaryGrade.findFirst({
      where: { id: gradeId, tenantId },
    })
    if (!grade) {
      return NextResponse.json({ error: "Gradul salarial nu a fost gasit" }, { status: 404 })
    }

    // Construim structura
    const now = new Date().toISOString()
    const key = variableCompKey(tenantId, gradeId)

    // Verificam daca exista deja (pentru a pastra createdAt)
    const existing = await prisma.systemConfig.findUnique({ where: { key } })
    let createdAt = now
    if (existing) {
      try {
        const existingData = JSON.parse(existing.value) as VariableCompConfig
        createdAt = existingData.createdAt
      } catch { /* pastreaza now */ }
    }

    const config: VariableCompConfig = {
      gradeId,
      gradeName: grade.name,
      components,
      createdAt,
      updatedAt: now,
      createdBy: session.user.id,
    }

    // Upsert in SystemConfig
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: JSON.stringify(config) },
      create: { key, value: JSON.stringify(config) },
    })

    // Calculam totalul procentual tinta
    const totalTargetPct = components.reduce((sum, c) => sum + c.targetPct, 0)

    return NextResponse.json({
      ok: true,
      key,
      config,
      stats: {
        totalComponents: components.length,
        totalTargetPct,
        byType: {
          BONUS: components.filter(c => c.type === "BONUS").length,
          COMMISSION: components.filter(c => c.type === "COMMISSION").length,
          BENEFIT: components.filter(c => c.type === "BENEFIT").length,
        },
      },
    })
  } catch (error) {
    console.error("[COMPENSATION/VARIABLE POST]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}

// GET — Lista configuratii compensatie variabila per tenant, grupate pe grad
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user
    const prefix = `VARIABLE_COMP_${tenantId}_`

    // Cautam toate configuratiile de compensatie variabila ale tenant-ului
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: prefix } },
      orderBy: { key: "asc" },
    })

    const variableConfigs: VariableCompConfig[] = configs
      .map(c => {
        try {
          return JSON.parse(c.value) as VariableCompConfig
        } catch {
          return null
        }
      })
      .filter(Boolean) as VariableCompConfig[]

    // Grupare pe grad
    const byGrade: Record<string, VariableCompConfig> = {}
    for (const vc of variableConfigs) {
      byGrade[vc.gradeId] = vc
    }

    // Statistici agregate
    const totalComponents = variableConfigs.reduce((sum, vc) => sum + vc.components.length, 0)

    return NextResponse.json({
      configs: variableConfigs,
      byGrade,
      stats: {
        totalGrades: variableConfigs.length,
        totalComponents,
        gradesWithBonus: variableConfigs.filter(vc => vc.components.some(c => c.type === "BONUS")).length,
        gradesWithCommission: variableConfigs.filter(vc => vc.components.some(c => c.type === "COMMISSION")).length,
        gradesWithBenefit: variableConfigs.filter(vc => vc.components.some(c => c.type === "BENEFIT")).length,
      },
    })
  } catch (error) {
    console.error("[COMPENSATION/VARIABLE GET]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}
