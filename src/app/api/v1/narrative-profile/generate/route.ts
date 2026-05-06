/**
 * POST /api/v1/narrative-profile/generate
 *
 * Generează un NarrativeDocument complet din:
 * - Profilul N2 (IndividualProfile)
 * - Scopul definit de individ
 *
 * Claude produce SIMULTAN:
 * - Narațiunea (cele 10 secțiuni, 3 registre)
 * - Metadata inferențială (surse, compoziție, mecanism per afirmație)
 * - Configurația simulatorului (dimensiuni, milestones)
 *
 * ⚠️ Narațiunea finală se calibrează după manuale. Schelet funcțional acum.
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { cpuCall } from "@/lib/cpu/gateway"
import type {
  NarrativeDocument,
  NarrativeSection,
  NarrativeStatement,
  InferenceBlock,
  SimulatorConfig,
  SimulatorDimension,
  NARRATIVE_SECTIONS,
} from "@/lib/cpu/profilers/narrative-profile"
import type { IndividualProfile } from "@/lib/cpu/profilers/n2-individual"

// ═══════════════════════════════════════════════════════════════
// REQUEST / RESPONSE
// ═══════════════════════════════════════════════════════════════

interface GenerateRequest {
  /** Profilul N2 complet (cu toate dimensiunile) */
  profile: IndividualProfile
  /** Scopul ales de individ */
  scope: {
    type: "JOB" | "RELATIONSHIP" | "PERSONAL_GROWTH" | "CUSTOM"
    description: string
    requirements?: Record<string, number>
  }
  /** Alias subiect (pentru narațiune) */
  subjectAlias: string
  /** Limba */
  language?: "ro" | "en"
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { profile, scope, subjectAlias, language = "ro" } = body

    if (!profile || !scope) {
      return NextResponse.json(
        { error: "Profile and scope are required" },
        { status: 400 }
      )
    }

    // ─── Build system prompt ───
    const systemPrompt = buildSystemPrompt(language)

    // ─── Build user prompt with profile data ───
    const userPrompt = buildUserPrompt(profile, scope, subjectAlias)

    // ─── Generate narrative + inference via CPU gateway ───
    const cpuResult = await cpuCall({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      agentRole: "PROFILER",
      operationType: "narrative-generate",
    })

    if (!cpuResult.text) {
      return NextResponse.json({ error: "No response generated" }, { status: 500 })
    }

    // ─── Parse structured response ───
    const narrativeDocument = parseNarrativeResponse(
      cpuResult.text,
      profile,
      scope,
      subjectAlias
    )

    return NextResponse.json(narrativeDocument)
  } catch (error) {
    console.error("[narrative-profile/generate] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate narrative profile" },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(language: string): string {
  return `Ești un specialist în construirea profilelor narative integrate din date psihometrice.

TASK: Generezi un document narativ complet (10 secțiuni) dintr-un profil psihometric integrat.

REGULI NARATIVE:
- 3 registre care alternează: CALAUZA (caldă, persoana a 2-a), OGLINDA (factuală, impersonală), POVESTE (situațională, "imaginează-ți")
- Zero jargon tehnic în narațiune — termenii se explică accesibil
- Fiecare afirmație din narațiune TREBUIE să aibă sursă identificabilă
- Tonul e profesional dar cald, fără superlative, fără flatări false
- Limba: ${language === "ro" ? "română" : "engleză"}
- NU pune virgulă înainte de "și" (regulă română)

REGULI ETICE:
- Focusul e pe DEZVOLTARE nu pe eliminare
- Gap-urile = oportunități de creștere, nu deficiențe fatale
- Harta NU e teritoriul — disclaimer obligatoriu
- NU prezenta informații care sugerează concediere

STRUCTURA OUTPUT (JSON strict):
{
  "sections": [
    {
      "id": "opening",
      "order": 1,
      "title": "De ce ești aici",
      "statements": [
        {
          "id": "s1_1",
          "register": "CALAUZA",
          "text": "...",
          "expandable": true,
          "inference": {
            "statementId": "s1_1",
            "sources": [
              {
                "instrumentId": "ami",
                "instrumentName": "AMI",
                "scaleName": "Dominanța",
                "rawScore": 7,
                "normalizedT": 60,
                "percentile": 84,
                "level": "RIDICAT",
                "referenceNorm": "Etalon RO adulți N=1300",
                "isInverse": false
              }
            ],
            "composition": "Cum interacționează sursele...",
            "mechanism": "Logica: date → concluzie...",
            "convergence": 3,
            "consultantNotes": "Atenție în feedback: ...",
            "subjectExplanation": {
              "scaleDescription": "Descriere accesibilă...",
              "position": "Te situezi pe treapta...",
              "normExplanation": "Majoritatea se află între...",
              "personalMeaning": "Asta înseamnă că..."
            }
          }
        }
      ]
    }
  ],
  "simulator": {
    "dimensions": [
      {
        "dimensionId": "empathy",
        "label": "Empatie",
        "currentValue": 40,
        "minRealistic": 40,
        "maxRealistic": 58,
        "impactOnScope": 0.3,
        "milestones": [
          {
            "targetValue": 50,
            "conditions": ["Practică ascultare activă zilnic"],
            "timeHorizon": "3-4 luni",
            "determination": "MEDIE",
            "effect": "Comunicarea devine percepută ca accesibilă"
          }
        ]
      }
    ],
    "overallCompatibility": 62
  }
}

CELE 10 SECȚIUNI (obligatorii, în ordine):
1. opening — De ce ești aici (scop + disclaimer hartă≠teritoriu)
2. who-you-are — Cine ești (portret integrat)
3. how-you-work — Cum funcționezi (pattern-uri legate de SCOP)
4. strengths — Ce te face puternic (diferențiatori)
5. blind-spots — Unde te sabotezi (tensiuni, zone oarbe)
6. scope-requirements — Scopul tău (ce cere concret, în comportamente)
7. distance — Distanța (eu vs. scop, vizual)
8. path — Drumul (plan 30-60-90 zile)
9. simulator — Simulatorul (config dimensiuni + milestones)
10. closing — Închidere (motivare, primul pas)

Returnează DOAR JSON valid, fără markdown wrapping.`
}

// ═══════════════════════════════════════════════════════════════
// USER PROMPT (cu datele efective)
// ═══════════════════════════════════════════════════════════════

function buildUserPrompt(
  profile: IndividualProfile,
  scope: GenerateRequest["scope"],
  alias: string
): string {
  return `Generează profilul narativ complet pentru:

SUBIECT: ${alias}
SCOP DEFINIT: "${scope.description}" (tip: ${scope.type})

PROFIL N2 COMPLET:
${JSON.stringify(profile, null, 2)}

${scope.requirements ? `CERINȚE SCOP (T-score per dimensiune):\n${JSON.stringify(scope.requirements, null, 2)}` : ""}

Generează cele 10 secțiuni cu narațiune + inferență per afirmație + simulator config.
Fiecare afirmație din narațiune TREBUIE legată de date concrete din profil.
Returnează JSON valid conform structurii definite.`
}

// ═══════════════════════════════════════════════════════════════
// PARSE RESPONSE
// ═══════════════════════════════════════════════════════════════

function parseNarrativeResponse(
  rawText: string,
  profile: IndividualProfile,
  scope: GenerateRequest["scope"],
  alias: string
): NarrativeDocument {
  // Clean potential markdown code block wrapping
  let jsonText = rawText.trim()
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }

  const parsed = JSON.parse(jsonText)

  const document: NarrativeDocument = {
    id: `np_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    version: 1,
    subjectId: profile.entityId,
    subjectAlias: alias,
    scope,
    sourceProfile: profile,
    sections: parsed.sections || [],
    simulator: {
      ...parsed.simulator,
      calculateCompatibility: buildCompatibilityCalculator(
        parsed.simulator?.dimensions || [],
        parsed.simulator?.overallCompatibility || 50
      ),
    },
    annexes: {
      rawScores: profile.dimensions,
      instruments: extractInstrumentSummaries(profile),
      norms: extractNormReferences(profile),
    },
  }

  return document
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function buildCompatibilityCalculator(
  dimensions: SimulatorDimension[],
  baseCompatibility: number
): (values: Record<string, number>) => number {
  return (values: Record<string, number>) => {
    let totalImpact = 0
    let totalWeight = 0

    for (const dim of dimensions) {
      const currentValue = values[dim.dimensionId] ?? dim.currentValue
      const improvement = Math.max(0, currentValue - dim.currentValue)
      const maxImprovement = dim.maxRealistic - dim.currentValue

      if (maxImprovement > 0) {
        const normalizedImprovement = improvement / maxImprovement
        totalImpact += normalizedImprovement * dim.impactOnScope
        totalWeight += dim.impactOnScope
      }
    }

    if (totalWeight === 0) return baseCompatibility

    // Max improvement can add up to (100 - baseCompatibility) * coverage
    const maxGain = (100 - baseCompatibility) * 0.8 // 80% max gain realistic
    const gain = (totalImpact / totalWeight) * maxGain

    return Math.min(100, baseCompatibility + gain)
  }
}

function extractInstrumentSummaries(profile: IndividualProfile) {
  const instruments = new Map<string, { name: string; count: number; norm: string; confidence: number }>()

  for (const dim of profile.dimensions) {
    const key = (dim as any).instrumentId || "unknown"
    if (!instruments.has(key)) {
      instruments.set(key, {
        name: (dim as any).instrumentName || key,
        count: 0,
        norm: (dim as any).referenceNorm || "",
        confidence: (dim as any).confidence || 0.8,
      })
    }
    instruments.get(key)!.count++
  }

  return Array.from(instruments.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    scalesCount: data.count,
    normReference: data.norm,
    confidence: data.confidence,
  }))
}

function extractNormReferences(profile: IndividualProfile) {
  const norms = new Map<string, { population: string; instrumentId: string }>()

  for (const dim of profile.dimensions) {
    const norm = (dim as any).referenceNorm
    if (norm && !norms.has(norm)) {
      norms.set(norm, {
        population: norm,
        instrumentId: (dim as any).instrumentId || "unknown",
      })
    }
  }

  return Array.from(norms.entries()).map(([_, data]) => ({
    instrumentId: data.instrumentId,
    population: data.population,
    sampleSize: 0, // Will be filled from manual data
  }))
}
