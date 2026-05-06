/**
 * ESQ-2 Parser — extrage profilul de integritate/etica din PDF
 *
 * 16 scale centile + scor integritate global + indicatori de risc.
 * Foloseste cpuCall pentru interpretarea textului nestructurat.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import { centileToT, tScoreToLevel } from "@/lib/profiling/score-normalizer"
import type { ESQ2Result, ESQ2Scale, ParsedPDFText, ParserOptions } from "./types"

// ── Scale ESQ-2 cunoscute ──────────────────────────────────

const ESQ2_SCALES = [
  "Productivitate",
  "Acuratete",
  "Satisfactia Muncii",
  "Asertivitate",
  "Incredere in propriile forte",
  "Rezistenta emotionala",
  "Consum de Alcool",
  "Concediu Medical Neautorizat",
  "Infractiuni Rutiere",
  "Intarzieri",
  "Indolenta",
  "Sabotaj",
  "Nerespectarea Protectiei",
  "Furt",
  "Risc de Comportament Contraproductiv",
  "Sociabilitate",
]

// ── Scale cu risc invers (scor mare = risc) ────────────────

const RISK_SCALES = new Set([
  "Consum de Alcool",
  "Concediu Medical Neautorizat",
  "Infractiuni Rutiere",
  "Intarzieri",
  "Indolenta",
  "Sabotaj",
  "Nerespectarea Protectiei",
  "Furt",
  "Risc de Comportament Contraproductiv",
])

// ── Prompt de extractie ────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Esti un expert in psihometrie. Extrage scorurile din textul unui raport ESQ-2 (Employee Screening Questionnaire).

Returneaza un JSON STRICT cu structura:
{
  "subjectName": "Nume Prenume",
  "subjectCode": "cod_angajat sau null",
  "scales": [
    { "name": "Productivitate", "centile": 72 },
    { "name": "Acuratete", "centile": 58 },
    { "name": "Consum de Alcool", "centile": 15 },
    ...
  ],
  "overallIntegrityCentile": 65
}

REGULI:
- Extrage TOATE cele 16 scale cu centilele lor (0-100)
- overallIntegrityCentile = centila scorului global de integritate
- Centilele sunt valori numerice intregi 0-100
- Nu inventa scoruri — daca nu gasesti o scala, nu o include
- Raspunde DOAR cu JSON valid, fara text suplimentar`

// ── Determinare nivel risc ─────────────────────────────────

function getRiskLevel(centile: number, isRiskScale: boolean): ESQ2Scale["riskLevel"] {
  if (isRiskScale) {
    // Scale de risc: centila MARE = risc MARE
    if (centile >= 85) return "CRITICAL"
    if (centile >= 70) return "HIGH"
    if (centile >= 50) return "MODERATE"
    return "LOW"
  }
  // Scale pozitive: centila MICA = risc
  if (centile <= 15) return "CRITICAL"
  if (centile <= 30) return "HIGH"
  if (centile <= 50) return "MODERATE"
  return "LOW"
}

// ── Parser ─────────────────────────────────────────────────

export async function parseESQ2(
  pdfText: ParsedPDFText,
  options: ParserOptions = {}
): Promise<ESQ2Result> {
  const response = await cpuCall({
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extrage scorurile ESQ-2 din urmatorul text de raport PDF:\n\n${pdfText.rawText.slice(0, 8000)}`,
      },
    ],
    max_tokens: 2048,
    agentRole: "PSYCHOMETRICS_PARSER",
    operationType: "pdf-parse-esq2",
    tenantId: options.tenantId,
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0,
  })

  if (response.degraded) {
    throw new Error("CPU indisponibil — nu s-a putut parsa raportul ESQ-2")
  }

  const jsonMatch = response.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Nu s-a putut extrage JSON din raspunsul AI pentru ESQ-2")
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    subjectName: string
    subjectCode: string | null
    scales: Array<{ name: string; centile: number }>
    overallIntegrityCentile: number
  }

  // Construire scale cu T-score si nivel risc
  const scales: ESQ2Scale[] = parsed.scales.map((s) => {
    const isRisk = RISK_SCALES.has(s.name)
    const tScore = centileToT(s.centile)
    return {
      name: s.name,
      centile: s.centile,
      tScore,
      riskLevel: getRiskLevel(s.centile, isRisk),
    }
  })

  // Scor integritate global
  const overallCentile = parsed.overallIntegrityCentile ?? 50
  const overallT = centileToT(overallCentile)

  // Indicatori de risc activi (scale de risc cu centila >= 70)
  const riskIndicators = scales
    .filter((s) => RISK_SCALES.has(s.name) && s.centile >= 70)
    .map((s) => ({
      name: s.name,
      centile: s.centile,
      description: `Scor ridicat pe ${s.name} — necesita atentie`,
    }))

  return {
    instrumentId: "ESQ_2",
    subjectCode: options.subjectCode || parsed.subjectCode || "UNKNOWN",
    subjectName: options.subjectName || parsed.subjectName || "Necunoscut",
    scales,
    overallIntegrity: {
      centile: overallCentile,
      tScore: overallT,
      level: overallCentile >= 70 ? "LOW" : overallCentile >= 50 ? "MODERATE" : overallCentile >= 30 ? "HIGH" : "CRITICAL",
    },
    riskIndicators,
    parsedAt: new Date().toISOString(),
    confidence: scales.length >= 14 ? 0.90 : scales.length >= 10 ? 0.75 : 0.55,
  }
}
