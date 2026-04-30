/**
 * /api/v1/compliance/roi
 *
 * Verificare ROI (Regulament Ordine Interioara) — conformitate cu Codul Muncii Art.241-246
 * + verificare clauze ilegale de confidentialitate salariu (Directiva EU 2023/970 Art.7).
 *
 * POST — Analiza AI a textului ROI:
 *   - JSON body { roiText } → verificare tintita clauza confidentialitate salariu
 *   - FormData { file }    → analiza completa checklist (legacy)
 * GET  — Ultima analiza salvata
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

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

// ─────────────────────────────────────────────────────────────────
// Verificare tintita: clauza confidentialitate salariu (Feature 2)
// ─────────────────────────────────────────────────────────────────
async function checkSalaryConfidentialityClause(roiText: string) {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `Esti un expert in dreptul muncii din Romania si legislatie europeana.

Analizeaza urmatorul text din Regulamentul de Ordine Interioara (ROI) si identifica daca exista o clauza de confidentialitate a salariului (interzicerea angajatilor de a discuta/divulga salariul).

Conform Directivei EU 2023/970, Art.7 (transparenta salariala), angajatorii NU mai au voie sa impuna confidentialitatea remuneratiei. Orice clauza care interzice angajatilor sa discute salariul sau care prevede sanctiuni pentru divulgarea salariului este ILEGALA.

Textul ROI de analizat:
---
${roiText}
---

Raspunde STRICT in format JSON (fara alte comentarii):
{
  "hasViolation": true/false,
  "violatingClause": "textul exact al clauzei ilegale (daca exista) sau null",
  "explanation": "explicatie clara in romana de ce este/nu este o incalcare",
  "suggestedReplacement": "text de inlocuire sugerat (daca hasViolation=true) sau null",
  "otherIssues": ["alte probleme de conformitate gasite in text (daca exista)"]
}`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // fallback daca parsarea JSON esueaza
  }

  return {
    hasViolation: false,
    violatingClause: null,
    explanation: "Nu s-a putut analiza textul. Verificati manual.",
    suggestedReplacement: null,
    otherIssues: [],
  }
}

// ─────────────────────────────────────────────────────────────────
// Analiza completa ROI cu upload fisier (legacy)
// ─────────────────────────────────────────────────────────────────
async function analyzeFullROI(file: File, tenantId: string, userId: string) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")
  const mimeType = file.type || "application/pdf"

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: mimeType as "application/pdf", data: base64 },
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
  let parsed: Record<string, unknown> = {}
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch { /* fallback la obiect gol */ }

  const aiResults = (parsed.results || {}) as Record<string, { found?: boolean; comment?: string }>
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

  // Salvam analiza completa in tenant storage
  await setTenantData(tenantId, "ROI_ANALYSIS", analysis)

  return { ...analysis, analyzed: true }
}

// POST — Doua moduri de utilizare:
//   1. JSON { roiText } → verificare tintita clauza confidentialitate salariu
//   2. FormData { file } → analiza completa checklist ROI
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const contentType = req.headers.get("content-type") || ""

  // Mod 1: JSON body — verificare tintita clauza confidentialitate
  if (contentType.includes("application/json")) {
    const body = await req.json()
    const { roiText } = body

    if (!roiText || typeof roiText !== "string" || roiText.trim().length < 50) {
      return NextResponse.json(
        { error: "roiText obligatoriu (minim 50 caractere)" },
        { status: 400 }
      )
    }

    const result = await checkSalaryConfidentialityClause(roiText)

    // Salvam rezultatul verificarii tintite
    await setTenantData(session.user.tenantId, "ROI_SALARY_CHECK", {
      ...result,
      checkedAt: new Date().toISOString(),
      textLength: roiText.length,
    })

    return NextResponse.json(result)
  }

  // Mod 2: FormData — analiza completa ROI (legacy, upload fisier)
  if (contentType.includes("multipart/form-data")) {
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

    const analysis = await analyzeFullROI(file, session.user.tenantId, session.user.id)
    return NextResponse.json(analysis)
  }

  return NextResponse.json(
    { error: "Content-Type invalid. Folositi application/json sau multipart/form-data." },
    { status: 400 }
  )
}

// GET — Ultima analiza salvata (checklist complet sau verificare tintita)
export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const roiAnalysis = await getTenantData(session.user.tenantId, "ROI_ANALYSIS")
  const salaryCheck = await getTenantData(session.user.tenantId, "ROI_SALARY_CHECK")

  if (!roiAnalysis && !salaryCheck) {
    // Returneaza checklist gol
    return NextResponse.json({
      checklist: ROI_CHECKLIST.map(item => ({ ...item, found: false, aiComment: null, manualCheck: null })),
      analyzed: false,
      salaryCheck: null,
    })
  }

  return NextResponse.json({
    ...(roiAnalysis ? { ...roiAnalysis as object, analyzed: true } : { analyzed: false }),
    salaryCheck: salaryCheck || null,
  })
}
