/**
 * PASAT 2000 Parser — test atentie/concentrare
 *
 * Extrage: timpi de reactie, rate eroare, atentie sustinuta,
 * consistenta pe blocuri.
 * Foloseste cpuCall pentru interpretarea textului nestructurat.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import { centileToT } from "@/lib/profiling/score-normalizer"
import type { PASAT2000Result, PASAT2000Metric, ParsedPDFText, ParserOptions } from "./types"

// ── Prompt de extractie ────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Esti un expert in psihometrie. Extrage metricile din textul unui raport PASAT 2000 (test de atentie si concentrare).

Returneaza un JSON STRICT cu structura:
{
  "subjectName": "Nume Prenume",
  "subjectCode": "cod_angajat sau null",
  "sustainedAttention": {
    "score": 85,
    "centile": 72
  },
  "reactionTimes": {
    "mean": 420,
    "median": 395,
    "standardDeviation": 85
  },
  "errorRates": {
    "omissions": 3,
    "commissions": 2,
    "totalErrorPct": 4.2
  },
  "blocks": [
    { "block": 1, "score": 90, "reactionTime": 380 },
    { "block": 2, "score": 85, "reactionTime": 410 },
    ...
  ],
  "additionalMetrics": [
    { "name": "Vigilanta", "value": 78, "unit": "centile", "interpretation": "Peste medie" },
    ...
  ]
}

REGULI:
- Extrage TOATE datele numerice vizibile
- Timpii de reactie sunt in milisecunde (ms)
- Erorile de omisiune = stimuli nedetectati; comisiune = raspunsuri false
- Blocurile sunt segmente temporale succesive ale testului
- Nu inventa valori — include doar ce e vizibil in text
- Raspunde DOAR cu JSON valid, fara text suplimentar`

// ── Parser ─────────────────────────────────────────────────

export async function parsePASAT2000(
  pdfText: ParsedPDFText,
  options: ParserOptions = {}
): Promise<PASAT2000Result> {
  const response = await cpuCall({
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extrage metricile PASAT 2000 din urmatorul text de raport PDF:\n\n${pdfText.rawText.slice(0, 8000)}`,
      },
    ],
    max_tokens: 2048,
    agentRole: "PSYCHOMETRICS_PARSER",
    operationType: "pdf-parse-pasat2000",
    tenantId: options.tenantId,
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0,
  })

  if (response.degraded) {
    throw new Error("CPU indisponibil — nu s-a putut parsa raportul PASAT 2000")
  }

  const jsonMatch = response.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Nu s-a putut extrage JSON din raspunsul AI pentru PASAT 2000")
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    subjectName: string
    subjectCode: string | null
    sustainedAttention: { score: number; centile: number }
    reactionTimes: { mean: number; median: number; standardDeviation: number }
    errorRates: { omissions: number; commissions: number; totalErrorPct: number }
    blocks: Array<{ block: number; score: number; reactionTime: number }>
    additionalMetrics: Array<{ name: string; value: number; unit: string; interpretation: string }>
  }

  // Construire metrici aditionale
  const metrics: PASAT2000Metric[] = (parsed.additionalMetrics || []).map((m) => ({
    name: m.name,
    value: m.value,
    unit: m.unit,
    percentile: m.unit === "centile" ? m.value : null,
    interpretation: m.interpretation,
  }))

  // Adaugare metrici principale in lista
  metrics.unshift(
    {
      name: "Atentie sustinuta",
      value: parsed.sustainedAttention.score,
      unit: "scor",
      percentile: parsed.sustainedAttention.centile,
      interpretation: parsed.sustainedAttention.centile >= 70 ? "Peste medie" :
                      parsed.sustainedAttention.centile >= 30 ? "In medie" : "Sub medie",
    },
    {
      name: "Timp reactie mediu",
      value: parsed.reactionTimes.mean,
      unit: "ms",
      percentile: null,
      interpretation: parsed.reactionTimes.mean <= 350 ? "Rapid" :
                      parsed.reactionTimes.mean <= 500 ? "Normal" : "Lent",
    },
    {
      name: "Rata eroare totala",
      value: parsed.errorRates.totalErrorPct,
      unit: "%",
      percentile: null,
      interpretation: parsed.errorRates.totalErrorPct <= 3 ? "Excelent" :
                      parsed.errorRates.totalErrorPct <= 8 ? "Acceptabil" : "Problematic",
    }
  )

  const sustainedCentile = parsed.sustainedAttention.centile
  const sustainedT = centileToT(sustainedCentile)

  return {
    instrumentId: "PASAT_2000",
    subjectCode: options.subjectCode || parsed.subjectCode || "UNKNOWN",
    subjectName: options.subjectName || parsed.subjectName || "Necunoscut",
    metrics,
    sustainedAttention: {
      score: parsed.sustainedAttention.score,
      centile: sustainedCentile,
      tScore: sustainedT,
    },
    reactionTimes: {
      mean: parsed.reactionTimes.mean,
      median: parsed.reactionTimes.median,
      standardDeviation: parsed.reactionTimes.standardDeviation,
      unit: "ms",
    },
    errorRates: {
      omissions: parsed.errorRates.omissions,
      commissions: parsed.errorRates.commissions,
      totalErrorPct: parsed.errorRates.totalErrorPct,
    },
    blockConsistency: (parsed.blocks || []).map((b) => ({
      block: b.block,
      score: b.score,
      reactionTime: b.reactionTime,
    })),
    parsedAt: new Date().toISOString(),
    confidence: parsed.blocks?.length >= 3 ? 0.90 : 0.70,
  }
}
