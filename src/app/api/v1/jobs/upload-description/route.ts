/**
 * POST /api/v1/jobs/upload-description
 *
 * Primește PDF sau Word (DOC/DOCX), extrage textul,
 * îl structurează cu AI în format fișă de post.
 *
 * Flow: upload → parse → AI structurare → răspuns cu fișă structurată
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { validateUpload } from "@/lib/security/upload-validator"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { buildKBContext } from "@/lib/kb/inject"

export const dynamic = "force-dynamic"

// Extensii acceptate pentru fișe de post
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "Fișierul lipsește." }, { status: 400 })
  }

  // Validare securitate
  const check = await validateUpload(file, ALLOWED_EXTENSIONS)
  if (!check.valid) {
    return NextResponse.json({ error: check.error }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = "." + file.name.toLowerCase().split(".").pop()

  // ── Extragere text ────────────────────────────────────────────────

  let rawText = ""

  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse(buffer) as any
    await parser.load()
    rawText = await parser.getText()
  } else if (ext === ".docx" || ext === ".doc") {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    rawText = result.value
  }

  if (!rawText || rawText.trim().length < 20) {
    return NextResponse.json({
      error: "Nu s-a putut extrage text din fișier. Verificați că documentul conține text (nu imagini scanate).",
    }, { status: 400 })
  }

  // Limităm la primele 8000 caractere (suficient pentru o fișă de post)
  const trimmedText = rawText.slice(0, 8000)

  // ── Structurare AI ────────────────────────────────────────────────

  const kbContext = await buildKBContext({
    agentRole: "HR_COUNSELOR",
    context: "fișă de post extrasă din document upload",
    limit: 3,
    kbType: "METHODOLOGY",
  })

  // Company Profiler — context MVV
  let companyContext = ""
  try {
    const { getAgentContext } = await import("@/lib/company-profiler")
    const ctx = await getAgentContext(session.user.tenantId, "JE")
    companyContext = `\nCONTEXT COMPANIE:\n${ctx.companyEssence}`
  } catch {}

  const systemPrompt = [
    "Ești expert HR România. Primești textul brut extras dintr-un document (PDF/Word) care conține o fișă de post.",
    "Extrage și structurează informațiile în formatul standard JobGrade.",
    "Dacă documentul nu pare a fi o fișă de post, extrage ce poți și semnalează.",
    kbContext,
    companyContext,
  ].filter(Boolean).join("\n\n")

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: `Extrage și structurează fișa de post din textul următor. Răspunde STRICT în JSON cu structura:
{
  "title": "Titlul postului",
  "department": "Departamentul sugerat",
  "purpose": "Scopul postului (2-3 propoziții)",
  "responsibilities": "Responsabilitățile principale (text structurat)",
  "requirements": "Cerințe (studii, experiență, competențe)",
  "conditions": "Condiții de muncă (dacă sunt menționate)",
  "isJobDescription": true/false,
  "confidence": 0.0-1.0,
  "notes": "Observații dacă documentul e incomplet sau ambiguu"
}

TEXT DOCUMENT:
${trimmedText}`,
    }],
  })

  // Extragem JSON din răspuns
  const aiText = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = aiText.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return NextResponse.json({
      error: "Nu s-a putut structura documentul. Încercați să adăugați postul manual.",
      rawText: trimmedText.slice(0, 500),
    }, { status: 422 })
  }

  try {
    const structured = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      success: true,
      extracted: structured,
      rawTextLength: rawText.length,
      fileName: file.name,
    })
  } catch {
    return NextResponse.json({
      error: "Răspunsul AI nu a putut fi interpretat.",
      rawText: trimmedText.slice(0, 500),
    }, { status: 422 })
  }
}
