/**
 * AMI Parser — Achievement Motivation Inventory
 *
 * 17 scale stanine + profil motivational global.
 * Foloseste cpuCall pentru interpretarea textului nestructurat.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import { stanineToT, tToPercentile } from "@/lib/profiling/score-normalizer"
import type { AMIResult, AMIScale, ParsedPDFText, ParserOptions } from "./types"

// ── Scale AMI cunoscute ────────────────────────────────────

const AMI_SCALES = [
  { name: "Work Confidence", abbr: "BE" },
  { name: "Dominance", abbr: "DO" },
  { name: "Engagement", abbr: "EN" },
  { name: "Eagerness to Learn", abbr: "LB" },
  { name: "Flexibility", abbr: "FX" },
  { name: "Flow", abbr: "FL" },
  { name: "Fearlessness", abbr: "FU" },
  { name: "Goal Setting", abbr: "ZS" },
  { name: "Independence", abbr: "UN" },
  { name: "Internality", abbr: "IN" },
  { name: "Compensatory Effort", abbr: "KA" },
  { name: "Competitiveness", abbr: "WE" },
  { name: "Confidence in Success", abbr: "EZ" },
  { name: "Persistence", abbr: "BE2" },
  { name: "Preference for Difficult Tasks", abbr: "SK" },
  { name: "Pride in Productivity", abbr: "LS" },
  { name: "Status Orientation", abbr: "SP" },
]

// ── Prompt de extractie ────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Esti un expert in psihometrie. Extrage scorurile din textul unui raport AMI (Achievement Motivation Inventory).

Returneaza un JSON STRICT cu structura:
{
  "subjectName": "Nume Prenume",
  "subjectCode": "cod_angajat sau null",
  "scales": [
    { "name": "Work Confidence", "abbreviation": "BE", "stanine": 7 },
    { "name": "Dominance", "abbreviation": "DO", "stanine": 5 },
    ...
  ]
}

REGULI:
- Extrage TOATE scalele cu stanine-ul lor (1-9)
- Stanine: 1-3 = scazut, 4-6 = mediu, 7-9 = ridicat
- Daca gasesti scoruri brute sau percentile fara stanine, converteste
- Nu inventa scoruri — include doar ce e vizibil in text
- Raspunde DOAR cu JSON valid, fara text suplimentar`

// ── Parser ─────────────────────────────────────────────────

export async function parseAMI(
  pdfText: ParsedPDFText,
  options: ParserOptions = {}
): Promise<AMIResult> {
  const response = await cpuCall({
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extrage scorurile AMI din urmatorul text de raport PDF:\n\n${pdfText.rawText.slice(0, 8000)}`,
      },
    ],
    max_tokens: 2048,
    agentRole: "PSYCHOMETRICS_PARSER",
    operationType: "pdf-parse-ami",
    tenantId: options.tenantId,
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0,
  })

  if (response.degraded) {
    throw new Error("CPU indisponibil — nu s-a putut parsa raportul AMI")
  }

  const jsonMatch = response.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Nu s-a putut extrage JSON din raspunsul AI pentru AMI")
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    subjectName: string
    subjectCode: string | null
    scales: Array<{ name: string; abbreviation: string; stanine: number }>
  }

  // Construire scale cu T-score si percentile
  const scales: AMIScale[] = parsed.scales.map((s) => {
    const tScore = stanineToT(s.stanine)
    return {
      name: s.name,
      abbreviation: s.abbreviation,
      stanine: s.stanine,
      tScore,
      percentile: tToPercentile(tScore),
    }
  })

  // Profil motivational global
  const avgStanine = scales.length > 0
    ? Math.round(scales.reduce((sum, s) => sum + s.stanine, 0) / scales.length)
    : 5

  const category: AMIResult["motivationProfile"]["category"] =
    avgStanine >= 8 ? "VERY_HIGH" :
    avgStanine >= 6 ? "HIGH" :
    avgStanine >= 4 ? "MODERATE" : "LOW"

  return {
    instrumentId: "AMI",
    subjectCode: options.subjectCode || parsed.subjectCode || "UNKNOWN",
    subjectName: options.subjectName || parsed.subjectName || "Necunoscut",
    scales,
    motivationProfile: {
      overall: avgStanine,
      category,
    },
    parsedAt: new Date().toISOString(),
    confidence: scales.length >= 15 ? 0.90 : scales.length >= 10 ? 0.75 : 0.55,
  }
}
