/**
 * /api/v1/compliance/roi
 *
 * Verificare ROI (Regulament Ordine Interioara) — conformitate cu Codul Muncii Art.241-246.
 *
 * POST — Upload ROI (PDF/DOCX) + analiza AI → checklist conformitate
 * GET  — Ultima analiza salvata
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Elementele obligatorii conform Codului Muncii Art.242-246 + Directiva EU 2023/970
const ROI_CHECKLIST = [
  {
    id: "art242_a",
    article: "Art.242 lit.a",
    requirement: "Reguli privind protectia, igiena si securitatea in munca",
    category: "OBLIGATORIU",
  },
  {
    id: "art242_b",
    article: "Art.242 lit.b",
    requirement: "Reguli privind respectarea principiului nediscriminarii si al inlaturarii oricarei forme de incalcare a demnitatii",
    category: "OBLIGATORIU",
  },
  {
    id: "art242_c",
    article: "Art.242 lit.c",
    requirement: "Drepturile si obligatiile angajatorului si ale salariatilor",
    category: "OBLIGATORIU",
  },
  {
    id: "art242_d",
    article: "Art.242 lit.d",
    requirement: "Procedura de solutionare a cererilor sau reclamatiilor individuale ale salariatilor",
    category: "OBLIGATORIU",
  },
  {
    id: "art242_e",
    article: "Art.242 lit.e",
    requirement: "Reguli concrete privind disciplina muncii in unitate",
    category: "OBLIGATORIU",
  },
  {
    id: "art242_f",
    article: "Art.242 lit.f",
    requirement: "Abaterile disciplinare si sanctiunile aplicabile",
    category: "OBLIGATORIU",
  },
  {
    id: "art242_g",
    article: "Art.242 lit.g",
    requirement: "Reguli referitoare la procedura disciplinara",
    category: "OBLIGATORIU",
  },
  {
    id: "art242_h",
    article: "Art.242 lit.h",
    requirement: "Modalitatile de aplicare a altor dispozitii legale sau contractuale specifice",
    category: "OBLIGATORIU",
  },
  {
    id: "art242_i",
    article: "Art.242 lit.i",
    requirement: "Criteriile si procedurile de evaluare profesionala a salariatilor",
    category: "OBLIGATORIU",
  },
  {
    id: "eu_2023_970",
    article: "Directiva EU 2023/970",
    requirement: "ABSENTA clauzei de confidentialitate a salariului — angajatorul NU mai poate impune confidentialitatea remuneratiei",
    category: "CRITIC",
  },
  {
    id: "hartuire",
    article: "L.202/2002 + OG 137/2000",
    requirement: "Procedura privind prevenirea si sanctionarea hartuirii la locul de munca (inclusiv hartuire sexuala si hartuire morala)",
    category: "OBLIGATORIU",
  },
  {
    id: "program_lucru",
    article: "Art.117-118 Codul Muncii",
    requirement: "Programul de lucru, modul de repartizare pe zile, durata pauzei de masa, munca in schimburi",
    category: "OBLIGATORIU",
  },
  {
    id: "concedii",
    article: "Art.144-158 Codul Muncii",
    requirement: "Reguli privind acordarea concediului de odihna, concedii speciale, zile libere",
    category: "OBLIGATORIU",
  },
  {
    id: "telemunca",
    article: "L.81/2018",
    requirement: "Prevederi privind telemunca / munca la distanta (daca se aplica)",
    category: "RECOMANDAT",
  },
  {
    id: "whistleblowing",
    article: "L.361/2022",
    requirement: "Canale interne de raportare a neregulilor (whistleblowing) — obligatoriu pentru >50 angajati",
    category: "RECOMANDAT",
  },
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    // Fara upload — returneaza doar checklist-ul gol (completare manuala)
    const results = ROI_CHECKLIST.map(item => ({
      ...item,
      found: false,
      aiComment: null,
      manualCheck: null,
    }))
    return NextResponse.json({ checklist: results, analyzed: false })
  }

  // Extragem text din document
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")
  const mimeType = file.type || "application/pdf"

  // Analiza AI a ROI-ului
  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: mimeType as any, data: base64 },
        },
        {
          type: "text",
          text: `Analizeaza acest Regulament de Ordine Interioara (ROI) si verifica daca contine urmatoarele elemente obligatorii. Pentru fiecare element raspunde cu JSON:

${ROI_CHECKLIST.map(item => `- "${item.id}": "${item.requirement}" (${item.article})`).join("\n")}

Raspunde STRICT in format JSON (fara alte comentarii):
{
  "results": {
    "art242_a": { "found": true/false, "comment": "detaliu scurt despre ce ai gasit sau ce lipseste" },
    "art242_b": { "found": true/false, "comment": "..." },
    ...
  },
  "criticalIssue": "daca gasesti clauza de confidentialitate salariu, mentioneaza EXPLICIT aici. Altfel null.",
  "overallScore": 0-100
}`
        },
      ],
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  let parsed: any = {}
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch {}

  const aiResults = parsed.results || {}
  const results = ROI_CHECKLIST.map(item => ({
    ...item,
    found: aiResults[item.id]?.found ?? false,
    aiComment: aiResults[item.id]?.comment ?? null,
    manualCheck: null,
  }))

  const analysis = {
    checklist: results,
    criticalIssue: parsed.criticalIssue || null,
    overallScore: parsed.overallScore || 0,
    analyzedAt: new Date().toISOString(),
    fileName: file.name,
  }

  // Salvam in SystemConfig via tenant-storage
  await setTenantData(session.user.tenantId, "ROI_ANALYSIS", analysis)

  return NextResponse.json({ ...analysis, analyzed: true })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const roiAnalysis = await getTenantData(session.user.tenantId, "ROI_ANALYSIS")

  if (!roiAnalysis) {
    // Returneaza checklist gol
    return NextResponse.json({
      checklist: ROI_CHECKLIST.map(item => ({ ...item, found: false, aiComment: null, manualCheck: null })),
      analyzed: false,
    })
  }

  return NextResponse.json({ ...roiAnalysis, analyzed: true })
}
