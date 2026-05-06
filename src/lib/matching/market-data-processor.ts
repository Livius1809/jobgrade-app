/**
 * market-data-processor.ts — Processes public job postings against 6 JG criteria
 *
 * Extracts scorable data from job posting text, identifies gaps vs candidate profile.
 * Used by auto-matcher and Card 5 (antreprenoriat).
 */

import { cpuCall } from "@/lib/cpu/gateway"
import type { CriteriaProfile } from "@/lib/b2c/matching-engine"

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProcessedJobPosting {
  sourceUrl?: string
  title: string
  company: string
  criteria: { criterion: string; extracted: string; confidence: number }[]
  gaps: { criterion: string; candidateLevel: string; jobRequirement: string; gapDescription: string }[]
}

// ── Processing ─────────────────────────────────────────────────────────────

/**
 * Processes a job posting text and compares against candidate profile.
 * Uses cpuCall to extract criteria from posting text.
 */
export async function processJobPosting(
  postingText: string,
  candidateProfile: CriteriaProfile,
): Promise<ProcessedJobPosting> {
  // 1. Extract criteria + metadata from posting text via CPU
  const extractionResult = await cpuCall({
    system: `Esti expert in analiza posturilor de munca folosind sistemul JobGrade cu 6 criterii.

Analizeaza textul unui anunt de angajare si extrage:
1. Titlul pozitiei
2. Compania (daca apare)
3. Nivelul estimat pe cele 6 criterii (A=minim, G=maxim)

Raspunde DOAR cu JSON valid:
{
  "title": "...",
  "company": "...",
  "criteria": [
    { "criterion": "Knowledge", "extracted": "A-G", "confidence": 0.0-1.0 },
    { "criterion": "Communications", "extracted": "A-G", "confidence": 0.0-1.0 },
    { "criterion": "ProblemSolving", "extracted": "A-G", "confidence": 0.0-1.0 },
    { "criterion": "DecisionMaking", "extracted": "A-G", "confidence": 0.0-1.0 },
    { "criterion": "BusinessImpact", "extracted": "A-G", "confidence": 0.0-1.0 },
    { "criterion": "WorkingConditions", "extracted": "A-G", "confidence": 0.0-1.0 }
  ]
}

Fii realist cu nivelurile. Un rol junior = A-C, senior = C-E, director = E-G.`,
    messages: [
      {
        role: "user",
        content: `Analizeaza acest anunt de angajare:\n\n${postingText.slice(0, 3000)}`,
      },
    ],
    max_tokens: 500,
    model: "claude-haiku-4-5-20251001",
    agentRole: "CAREER_COUNSELOR",
    operationType: "job-posting-analysis",
    skipObjectiveCheck: true,
  })

  let extracted: { title: string; company: string; criteria: { criterion: string; extracted: string; confidence: number }[] }
  try {
    const jsonMatch = extractionResult.text.match(/\{[\s\S]*\}/)
    extracted = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { title: "Necunoscut", company: "Necunoscut", criteria: [] }
  } catch {
    extracted = { title: "Necunoscut", company: "Necunoscut", criteria: [] }
  }

  // 2. Calculate gaps between candidate profile and job requirements
  const LEVEL_INDEX: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 }
  const gaps: ProcessedJobPosting["gaps"] = []

  const criteriaKeys = ["Knowledge", "Communications", "ProblemSolving", "DecisionMaking", "BusinessImpact", "WorkingConditions"] as const

  for (const key of criteriaKeys) {
    const candidateLevel = candidateProfile[key] || "nedeterminat"
    const jobCriterion = extracted.criteria.find((c) => c.criterion === key)
    const jobLevel = jobCriterion?.extracted || "nedeterminat"

    if (candidateLevel === "nedeterminat" || jobLevel === "nedeterminat") continue

    const candidateIdx = LEVEL_INDEX[candidateLevel.toUpperCase()] || 0
    const jobIdx = LEVEL_INDEX[jobLevel.toUpperCase()] || 0

    if (candidateIdx < jobIdx) {
      gaps.push({
        criterion: key,
        candidateLevel,
        jobRequirement: jobLevel,
        gapDescription: `Nivelul tau (${candidateLevel}) este sub cerinta postului (${jobLevel}). Diferenta: ${jobIdx - candidateIdx} nivele.`,
      })
    }
  }

  return {
    title: extracted.title,
    company: extracted.company,
    criteria: extracted.criteria,
    gaps,
  }
}
