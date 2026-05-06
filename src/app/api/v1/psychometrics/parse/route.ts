/**
 * /api/v1/psychometrics/parse
 *
 * POST — Upload PDF instrument psihometric, parsare structurata, salvare pe profil angajat.
 *
 * Body: multipart/form-data
 *  - file: PDF-ul raportului
 *  - instrumentType: CPI_260 | ESQ_2 | AMI | PASAT_2000 | auto
 *  - employeeCode: (optional) cod angajat
 *  - employeeName: (optional) nume angajat
 *  - gender: (optional) M | F
 *
 * Response: Scoruri structurate + salvare in profilul angajatului
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { setTenantData, getTenantData } from "@/lib/tenant-storage"
import { parsePsychometricPDF } from "@/lib/psychometrics/parsers"
import type { InstrumentType, PsychometricResult } from "@/lib/psychometrics/parsers"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Stocare rezultate parsate per tenant
interface ParsedResultsState {
  results: Array<{
    id: string
    employeeCode: string
    instrumentType: InstrumentType
    result: PsychometricResult
    uploadedAt: string
    fileName: string
  }>
}

async function getResultsState(tenantId: string): Promise<ParsedResultsState> {
  return await getTenantData<ParsedResultsState>(tenantId, "PSYCHOMETRICS_PARSED") || { results: [] }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const contentType = req.headers.get("content-type") || ""
  if (!contentType.includes("multipart")) {
    return NextResponse.json(
      { error: "Content-Type trebuie sa fie multipart/form-data" },
      { status: 400 }
    )
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const instrumentTypeRaw = (formData.get("instrumentType") as string) || "auto"
  const employeeCode = formData.get("employeeCode") as string | null
  const employeeName = formData.get("employeeName") as string | null
  const gender = formData.get("gender") as "M" | "F" | null

  if (!file) {
    return NextResponse.json({ error: "Fisierul PDF este obligatoriu" }, { status: 400 })
  }

  // Validare tip
  const validTypes = ["CPI_260", "ESQ_2", "AMI", "PASAT_2000", "auto"]
  if (!validTypes.includes(instrumentTypeRaw)) {
    return NextResponse.json(
      { error: `instrumentType invalid. Valori acceptate: ${validTypes.join(", ")}` },
      { status: 400 }
    )
  }

  // Validare fisier
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Doar fisiere PDF sunt acceptate" }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fisierul depaseste limita de 10MB" }, { status: 400 })
  }

  try {
    // Conversie File -> Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parsare
    const result = await parsePsychometricPDF(
      buffer,
      instrumentTypeRaw as InstrumentType | "auto",
      {
        subjectCode: employeeCode || undefined,
        subjectName: employeeName || undefined,
        gender: gender || undefined,
        tenantId: session.user.tenantId,
      }
    )

    // Salvare in profilul angajatului
    const state = await getResultsState(session.user.tenantId)
    const resultId = `${result.instrumentId}_${result.subjectCode}_${Date.now()}`

    state.results.push({
      id: resultId,
      employeeCode: result.subjectCode,
      instrumentType: result.instrumentId as InstrumentType,
      result,
      uploadedAt: new Date().toISOString(),
      fileName: file.name,
    })

    await setTenantData(session.user.tenantId, "PSYCHOMETRICS_PARSED", state)

    return NextResponse.json({
      ok: true,
      resultId,
      instrumentType: result.instrumentId,
      subjectCode: result.subjectCode,
      subjectName: result.subjectName,
      confidence: result.confidence,
      parsedAt: result.parsedAt,
      result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la parsarea PDF-ului"
    console.error(`[Psychometrics Parse] Error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
