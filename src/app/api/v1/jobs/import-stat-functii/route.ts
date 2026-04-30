/**
 * POST /api/v1/jobs/import-stat-functii
 *
 * Import stat de funcții — extrage poziții, departamente, nivele ierarhice.
 * Acceptă: XLSX (tabelar), PDF (text), PNG/JPG (organigramă → Claude Vision).
 *
 * Contra cost (credite).
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { validateUpload } from "@/lib/security/upload-validator"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const ALLOWED = [".xlsx", ".pdf", ".png", ".jpg", ".jpeg"]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Fișierul lipsește." }, { status: 400 })

  const check = await validateUpload(file, ALLOWED)
  if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = "." + file.name.toLowerCase().split(".").pop()

  let extractedText = ""
  let isImage = false

  // ── Extragere per format ──────────────────────────────────────────

  if (ext === ".xlsx") {
    const ExcelJS = (await import("exceljs")).default
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as any)
    const ws = workbook.getWorksheet(1)
    if (!ws) return NextResponse.json({ error: "Fișierul Excel este gol." }, { status: 400 })

    const rows: string[] = []
    ws.eachRow((row, num) => {
      const cells = (row.values as any[]).slice(1).map(v => String(v ?? "").trim()).join(" | ")
      rows.push(cells)
    })
    extractedText = rows.join("\n")
  } else if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse(buffer) as any
    await parser.load()
    extractedText = await parser.getText()
  } else if ([".png", ".jpg", ".jpeg"].includes(ext)) {
    isImage = true
    // Nu extragem text — trimitem imaginea direct la Claude Vision
  }

  if (!isImage && (!extractedText || extractedText.trim().length < 10)) {
    return NextResponse.json({ error: "Nu s-a putut extrage conținut din fișier." }, { status: 400 })
  }

  // ── AI: extragere poziții ─────────────────────────────────────────

  const systemPrompt = `Ești expert HR România. Primești un stat de funcții sau o organigramă.
Extrage TOATE pozițiile/funcțiile cu departamentul și nivelul ierarhic.
Răspunde STRICT în JSON:
{
  "positions": [
    { "title": "Director General", "department": "Management", "level": "1", "reportsTo": null },
    { "title": "Director Financiar", "department": "Financiar", "level": "2", "reportsTo": "Director General" }
  ]
}
Dacă nu poți identifica departamentul sau nivelul, pune null. Extrage cât mai multe pozitii.`

  const userContent: any[] = isImage
    ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: file.type as any, data: buffer.toString("base64") } },
        { type: "text" as const, text: "Aceasta este o organigramă sau un stat de funcții. Extrage toate pozițiile cu departamentul și nivelul ierarhic." },
      ]
    : [
        { type: "text" as const, text: `Extrage pozițiile din acest stat de funcții:\n\n${extractedText.slice(0, 10000)}` },
      ]

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  })

  const aiText = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = aiText.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return NextResponse.json({ error: "Nu s-au putut extrage pozițiile. Încercați alt format.", rawText: extractedText?.slice(0, 300) }, { status: 422 })
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      success: true,
      positions: parsed.positions || [],
      fileName: file.name,
      format: isImage ? "image" : ext.replace(".", ""),
    })
  } catch {
    return NextResponse.json({ error: "Răspunsul AI nu a putut fi interpretat." }, { status: 422 })
  }
}
