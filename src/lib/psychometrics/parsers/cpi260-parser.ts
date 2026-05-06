/**
 * CPI 260 Parser — extrage 35 scale din PDF raport CPI260
 *
 * Scale:
 * - 3 structurale (v1, v2, v3)
 * - 20 folk (Dominance, Capacity for Status, Sociability, etc.)
 * - 7 special purpose
 * - 5 WORK
 *
 * Foloseste cpuCall pentru interpretarea textului nestructurat.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import type { CPI260Result, CPI260Scale, ParsedPDFText, ParserOptions } from "./types"

// ── Scale CPI 260 cunoscute ────────────────────────────────

const STRUCTURAL_SCALES = ["v1", "v2", "v3"]

const FOLK_SCALES = [
  { name: "Dominance", abbr: "Do" },
  { name: "Capacity for Status", abbr: "Cs" },
  { name: "Sociability", abbr: "Sy" },
  { name: "Social Presence", abbr: "Sp" },
  { name: "Self-acceptance", abbr: "Sa" },
  { name: "Independence", abbr: "In" },
  { name: "Empathy", abbr: "Em" },
  { name: "Responsibility", abbr: "Re" },
  { name: "Socialization", abbr: "So" },
  { name: "Self-control", abbr: "Sc" },
  { name: "Good Impression", abbr: "Gi" },
  { name: "Communality", abbr: "Cm" },
  { name: "Well-being", abbr: "Wb" },
  { name: "Tolerance", abbr: "To" },
  { name: "Achievement via Conformance", abbr: "Ac" },
  { name: "Achievement via Independence", abbr: "Ai" },
  { name: "Intellectual Efficiency", abbr: "Ie" },
  { name: "Psychological-mindedness", abbr: "Py" },
  { name: "Flexibility", abbr: "Fx" },
  { name: "Femininity/Masculinity", abbr: "F/M" },
]

const SPECIAL_PURPOSE_SCALES = [
  { name: "Managerial Potential", abbr: "Mp" },
  { name: "Work Orientation", abbr: "Wo" },
  { name: "Creative Temperament", abbr: "Ct" },
  { name: "Leadership", abbr: "Lp" },
  { name: "Amicability", abbr: "Ami" },
  { name: "Law Enforcement Orientation", abbr: "Leo" },
  { name: "Tough-mindedness", abbr: "Tm" },
]

const WORK_SCALES = [
  { name: "Work Confidence", abbr: "WC" },
  { name: "Work Efficiency", abbr: "WE" },
  { name: "Work Dedication", abbr: "WD" },
  { name: "Work Maturity", abbr: "WM" },
  { name: "Work Orientation Total", abbr: "WO" },
]

// ── Prompt de extractie ────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Esti un expert in psihometrie. Extrage scorurile din textul unui raport CPI 260.

Returneaza un JSON STRICT cu structura:
{
  "subjectName": "Nume Prenume",
  "subjectCode": "cod_angajat sau null",
  "gender": "M" sau "F",
  "cuboidType": "alpha/beta/gamma/delta sau null",
  "scales": [
    { "name": "Dominance", "abbreviation": "Do", "category": "FOLK", "rawScore": null, "tScore": 55, "percentile": 69 },
    ...
  ]
}

CATEGORII VALIDE: STRUCTURAL, FOLK, SPECIAL_PURPOSE, WORK

REGULI:
- Extrage TOATE scalele vizibile in text
- tScore e obligatoriu (T-score standard, media 50, SD 10)
- percentile: calculeaza din T-score daca nu e explicit
- rawScore: null daca nu e vizibil
- Nu inventa scoruri — daca nu gasesti o scala, nu o include
- Raspunde DOAR cu JSON valid, fara text suplimentar`

// ── Parser ─────────────────────────────────────────────────

export async function parseCPI260(
  pdfText: ParsedPDFText,
  options: ParserOptions = {}
): Promise<CPI260Result> {
  const response = await cpuCall({
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extrage scorurile CPI 260 din urmatorul text de raport PDF:\n\n${pdfText.rawText.slice(0, 12000)}`,
      },
    ],
    max_tokens: 4096,
    agentRole: "PSYCHOMETRICS_PARSER",
    operationType: "pdf-parse-cpi260",
    tenantId: options.tenantId,
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0,
  })

  if (response.degraded) {
    throw new Error("CPU indisponibil — nu s-a putut parsa raportul CPI260")
  }

  // Parse JSON din raspuns
  const jsonMatch = response.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Nu s-a putut extrage JSON din raspunsul AI pentru CPI260")
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    subjectName: string
    subjectCode: string | null
    gender: "M" | "F"
    cuboidType: string | null
    scales: Array<{
      name: string
      abbreviation: string
      category: string
      rawScore: number | null
      tScore: number
      percentile: number
    }>
  }

  // Clasificare scale pe categorii
  const categorize = (category: string): CPI260Scale[] =>
    parsed.scales
      .filter((s) => s.category === category)
      .map((s) => ({
        name: s.name,
        abbreviation: s.abbreviation,
        category: s.category as CPI260Scale["category"],
        rawScore: s.rawScore,
        tScore: s.tScore,
        percentile: s.percentile,
      }))

  const structuralScales = categorize("STRUCTURAL")
  const folkScales = categorize("FOLK")
  const specialPurposeScales = categorize("SPECIAL_PURPOSE")
  const workScales = categorize("WORK")

  const allScales = [...structuralScales, ...folkScales, ...specialPurposeScales, ...workScales]

  return {
    instrumentId: "CPI_260",
    subjectCode: options.subjectCode || parsed.subjectCode || "UNKNOWN",
    subjectName: options.subjectName || parsed.subjectName || "Necunoscut",
    gender: options.gender || parsed.gender || "F",
    structuralScales,
    folkScales,
    specialPurposeScales,
    workScales,
    allScales,
    cuboidType: parsed.cuboidType,
    parsedAt: new Date().toISOString(),
    confidence: allScales.length >= 30 ? 0.95 : allScales.length >= 20 ? 0.80 : 0.60,
  }
}
