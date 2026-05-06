/**
 * Psychometric PDF Parsers — Router principal
 *
 * Rutez PDF-ul la parserul corect pe baza tipului de instrument.
 * Detectia tipului se face din metadata sau prin AI.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import { parseCPI260 } from "./cpi260-parser"
import { parseESQ2 } from "./esq2-parser"
import { parseAMI } from "./ami-parser"
import { parsePASAT2000 } from "./pasat2000-parser"
import type {
  InstrumentType,
  ParsedPDFText,
  ParserOptions,
  PsychometricResult,
} from "./types"

// Re-export types
export type {
  InstrumentType,
  ParsedPDFText,
  ParserOptions,
  PsychometricResult,
  CPI260Result,
  ESQ2Result,
  AMIResult,
  PASAT2000Result,
} from "./types"

// Re-export individual parsers
export { parseCPI260 } from "./cpi260-parser"
export { parseESQ2 } from "./esq2-parser"
export { parseAMI } from "./ami-parser"
export { parsePASAT2000 } from "./pasat2000-parser"

// ── Detectie tip instrument din text ───────────────────────

const DETECTION_SYSTEM_PROMPT = `Identifica tipul de instrument psihometric din textul extras dintr-un PDF.

Raspunde DOAR cu unul din:
- CPI_260
- ESQ_2
- AMI
- PASAT_2000
- UNKNOWN

Indicii:
- CPI 260: "California Psychological Inventory", "CPI 260", scale ca Do, Cs, Sy, Sp
- ESQ-2: "Employee Screening Questionnaire", "ESQ", centile integritate, risc
- AMI: "Achievement Motivation Inventory", "AMI", stanine, motivatie
- PASAT 2000: "PASAT", atentie, concentrare, timpi de reactie, vigilenta

Raspunde cu un SINGUR cuvant din lista de mai sus.`

/**
 * Detecteaza tipul de instrument psihometric din textul PDF
 */
export async function detectInstrumentType(
  rawText: string,
  tenantId?: string
): Promise<InstrumentType | "UNKNOWN"> {
  // Detectie rapida pe baza de cuvinte cheie (fara AI)
  const textLower = rawText.toLowerCase()

  if (textLower.includes("california psychological inventory") || textLower.includes("cpi 260") || textLower.includes("cpi260")) {
    return "CPI_260"
  }
  if (textLower.includes("employee screening questionnaire") || textLower.includes("esq-2") || textLower.includes("esq2")) {
    return "ESQ_2"
  }
  if (textLower.includes("achievement motivation inventory") || (textLower.includes("ami") && textLower.includes("stanine"))) {
    return "AMI"
  }
  if (textLower.includes("pasat") || (textLower.includes("atentie") && textLower.includes("concentrare") && textLower.includes("reactie"))) {
    return "PASAT_2000"
  }

  // Fallback: AI detection
  const response = await cpuCall({
    system: DETECTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Identifica instrumentul din primele 2000 caractere:\n\n${rawText.slice(0, 2000)}`,
      },
    ],
    max_tokens: 50,
    agentRole: "PSYCHOMETRICS_PARSER",
    operationType: "detect-instrument-type",
    tenantId,
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0,
  })

  const detected = response.text.trim().toUpperCase()

  if (["CPI_260", "ESQ_2", "AMI", "PASAT_2000"].includes(detected)) {
    return detected as InstrumentType
  }

  return "UNKNOWN"
}

/**
 * Parseaza un PDF psihometric si returneaza scoruri structurate.
 *
 * @param buffer - Buffer-ul PDF (raw bytes)
 * @param instrumentType - Tipul instrumentului (sau "auto" pentru detectie)
 * @param options - Optiuni suplimentare (subject code, gender, etc.)
 */
export async function parsePsychometricPDF(
  buffer: Buffer,
  instrumentType: InstrumentType | "auto",
  options: ParserOptions = {}
): Promise<PsychometricResult> {
  // Extragem text din PDF
  const pdfText = await extractTextFromPDF(buffer)

  // Detectie tip daca e "auto"
  let resolvedType: InstrumentType
  if (instrumentType === "auto") {
    const detected = await detectInstrumentType(pdfText.rawText, options.tenantId)
    if (detected === "UNKNOWN") {
      throw new Error(
        "Nu s-a putut identifica tipul instrumentului psihometric. " +
        "Specificati explicit tipul: CPI_260, ESQ_2, AMI sau PASAT_2000."
      )
    }
    resolvedType = detected
  } else {
    resolvedType = instrumentType
  }

  // Rutare la parser-ul corect
  switch (resolvedType) {
    case "CPI_260":
      return parseCPI260(pdfText, options)
    case "ESQ_2":
      return parseESQ2(pdfText, options)
    case "AMI":
      return parseAMI(pdfText, options)
    case "PASAT_2000":
      return parsePASAT2000(pdfText, options)
    default:
      throw new Error(`Tip instrument necunoscut: ${resolvedType}`)
  }
}

/**
 * Extrage text din buffer PDF.
 * Foloseste pdf-parse daca disponibil, altfel trimite raw la AI.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<ParsedPDFText> {
  try {
    // Incercare pdf-parse (trebuie instalat: npm install pdf-parse)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>
    const data = await pdfParse(buffer)
    return {
      rawText: data.text,
      pageCount: data.numpages,
    }
  } catch {
    // Fallback: convertim buffer la string base64 si trimitem la AI pentru extractie
    // Acest lucru e mai costisitor dar functioneaza fara dependenta pdf-parse
    const base64 = buffer.toString("base64")

    const response = await cpuCall({
      system: "Extrage tot textul vizibil din acest document PDF encodat base64. Returneaza doar textul, fara formatare.",
      messages: [
        {
          role: "user",
          content: `PDF (base64, primele 50KB):\n${base64.slice(0, 50000)}`,
        },
      ],
      max_tokens: 8000,
      agentRole: "PSYCHOMETRICS_PARSER",
      operationType: "pdf-text-extraction",
      skipObjectiveCheck: true,
      skipKBFirst: true,
      temperature: 0,
    })

    return {
      rawText: response.text,
      pageCount: 0, // necunoscut
    }
  }
}
