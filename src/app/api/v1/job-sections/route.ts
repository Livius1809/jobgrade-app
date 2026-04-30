/**
 * /api/v1/job-sections — Secțiuni custom fișe de post
 *
 * Clientul definește categorii cu label-uri proprii (ex: "Mediu de lucru", "Relații funcționale").
 * Platforma le învață și le propune altor clienți din aceeași industrie.
 *
 * GET  — Secțiuni standard + custom per tenant
 * POST — Adaugă secțiune custom
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

// Secțiuni standard (hardcoded)
const STANDARD_SECTIONS = [
  { id: "gdpr", label: "GDPR — Protecția datelor personale", required: true, description: "Obligații conform Regulamentului 679/2016" },
  { id: "ssm", label: "SSM — Securitate și sănătate în muncă", required: true, description: "Conform Legii 319/2006" },
  { id: "psi", label: "PSI — Prevenire și stingere incendii", required: true, description: "Conform normelor ISU" },
  { id: "confidentiality", label: "Confidențialitate", required: true, description: "Păstrarea secretului profesional și al datelor companiei" },
  { id: "internalControl", label: "Control intern", required: false, description: "Doar pentru funcții de conducere — oameni sau procese" },
]

// Secțiuni custom frecvente (sugerate din experiență platformă)
// Sugestii — NU include: Mediu de lucru (e criteriu evaluare), Relații funcționale (deduse automat din atribuții la C3)
const SUGGESTED_CUSTOM_SECTIONS = [
  "Program de lucru",
  "Deplasări și delegații",
  "Echipamente și resurse alocate",
  "Cerințe speciale (permis, atestat, autorizație)",
  "Oportunități de dezvoltare profesională",
  "Limbi străine necesare",
  "Competențe digitale",
  "Regulament de ordine interioară (ROI)",
  "Cod de conduită",
  "Cod de etică",
  "Reguli privind egalitatea de șanse",
  "Prevenirea și combaterea hărțuirii",
  "Contract colectiv de muncă — prevederi specifice",
]

interface CustomSection {
  id: string
  label: string
  content: string // text introdus de client
  createdAt: string
}

interface TenantSections {
  custom: CustomSection[]
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const tenantData = await getTenantData<TenantSections>(session.user.tenantId, "JOB_CUSTOM_SECTIONS")

  // Colectăm label-urile custom din TOȚI tenanții (pentru sugestii anonimizate)
  // În producție: cache-uit, nu la fiecare request
  const customLabels = (tenantData?.custom || []).map(c => c.label)

  return NextResponse.json({
    standard: STANDARD_SECTIONS,
    custom: tenantData?.custom || [],
    suggestions: SUGGESTED_CUSTOM_SECTIONS.filter(s => !customLabels.includes(s)),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const { label, content } = await req.json()
  if (!label) return NextResponse.json({ error: "label obligatoriu" }, { status: 400 })

  const tenantData = await getTenantData<TenantSections>(session.user.tenantId, "JOB_CUSTOM_SECTIONS") || { custom: [] }

  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  tenantData.custom.push({ id, label, content: content || "", createdAt: new Date().toISOString() })

  await setTenantData(session.user.tenantId, "JOB_CUSTOM_SECTIONS", tenantData)

  // Learning: secțiune custom = cunoaștere despre ce contează pentru clienți
  try {
    const { learnFromClientInput } = await import("@/lib/learning-hooks")
    await learnFromClientInput(session.user.tenantId, "JOB_CUSTOM_SECTION", `Secțiune nouă fișa de post: "${label}" — ${(content || "").slice(0, 200)}`)
  } catch {}

  return NextResponse.json({ ok: true, id, label })
}
