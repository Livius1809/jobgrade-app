/**
 * Company Profiler — Context pentru agenți
 *
 * Fiecare agent primește exact ce are nevoie din profilul firmei.
 * Nu totul — doar ce e relevant pentru rolul lui.
 */

import type { AgentContext, AgentRole, CompanyProfile, CoherenceCheck } from "./types"

/**
 * Extrage contextul relevant pentru un agent specific
 */
export function buildAgentContext(profile: CompanyProfile, role: AgentRole): AgentContext {
  const mvv = {
    mission: profile.mvv.missionValidated || profile.mvv.missionDraft,
    vision: profile.mvv.visionValidated || profile.mvv.visionDraft,
    values: profile.mvv.valuesValidated.length > 0 ? profile.mvv.valuesValidated : profile.mvv.valuesDraft,
  }

  const base: Omit<AgentContext, "coherenceRelevant" | "deviationsToFlag" | "specificData" | "companyEssence"> = {
    role,
    tenantId: profile.tenantId,
    mvv,
    maturity: profile.mvv.maturity,
  }

  switch (role) {
    case "JE":
      return {
        ...base,
        companyEssence: buildEssence(profile, "Evaluează posturile în contextul a ceea ce face și valorizează compania."),
        coherenceRelevant: filterChecks(profile.coherence.checks, ["misiune-posturi", "valori-evaluari", "valori-fise"]),
        deviationsToFlag: extractDeviations(profile, ["misiune-posturi", "valori-evaluari"]),
        specificData: {
          industry: profile.identity.industry,
          caen: profile.identity.caenName,
        },
      }

    case "PAY_GAP":
      return {
        ...base,
        companyEssence: buildEssence(profile, "Mediază diferențele salariale în contextul valorilor și misiunii companiei."),
        coherenceRelevant: filterChecks(profile.coherence.checks, ["structura-misiune", "kpi-remunerare", "valori-evaluari"]),
        deviationsToFlag: extractDeviations(profile, ["structura-misiune", "kpi-remunerare"]),
        specificData: {
          declaredValues: mvv.values,
          hasPayGap: profile.maturityState.dataPoints.hasPayGapAnalysis,
        },
      }

    case "DOA":
      return {
        ...base,
        companyEssence: buildEssence(profile, "Auditează coerența completă: MVV ↔ fișe ↔ evaluări ↔ salarii ↔ KPI."),
        coherenceRelevant: profile.coherence.checks, // DOA vede tot
        deviationsToFlag: profile.coherence.deviations.map(d => d.gap || ""),
        specificData: {
          maturityScore: profile.maturityState.score,
          nextSteps: profile.maturityState.nextLevelRequirements,
        },
      }

    case "SOA":
      return {
        ...base,
        companyEssence: buildEssence(profile, "Interacționează cu clientul cunoscând contextul real al firmei."),
        coherenceRelevant: filterChecks(profile.coherence.checks, ["misiune-caen", "misiune-posturi"]),
        deviationsToFlag: [], // SOA nu semnalează deviații direct
        specificData: {
          maturityLevel: profile.mvv.maturity,
          unlockedServices: profile.maturityState.unlockedServices.filter(s => s.ready).map(s => s.service),
        },
      }

    case "BENCHMARK":
      return {
        ...base,
        companyEssence: buildEssence(profile, "Poziționarea pe piață reflectă viziunea și aspirația companiei."),
        coherenceRelevant: filterChecks(profile.coherence.checks, ["viziune-benchmark", "structura-misiune"]),
        deviationsToFlag: extractDeviations(profile, ["viziune-benchmark"]),
        specificData: {
          vision: mvv.vision,
          industry: profile.identity.industry,
        },
      }

    case "CULTURE":
      return {
        ...base,
        companyEssence: buildEssence(profile, "Auditul culturii organizaționale pornește de la valorile declarate vs. practicate."),
        coherenceRelevant: filterChecks(profile.coherence.checks, ["valori-fise", "valori-evaluari", "kpi-remunerare"]),
        deviationsToFlag: extractDeviations(profile, ["valori-fise", "valori-evaluari"]),
        specificData: {
          values: mvv.values,
          maturityScore: profile.maturityState.score,
        },
      }

    case "REPORT":
      return {
        ...base,
        companyEssence: buildEssence(profile, "Generează rapoarte cu secțiunile de coerență relevante nivelului clientului."),
        coherenceRelevant: profile.coherence.checks,
        deviationsToFlag: profile.coherence.deviations.map(d => d.gap || ""),
        specificData: {
          availableReportSections: profile.maturityState.unlockedServices
            .filter(s => s.ready)
            .flatMap(s => s.reportSections),
          overallCoherence: profile.coherence.overallScore,
        },
      }

    default:
      return {
        ...base,
        companyEssence: buildEssence(profile, "Context general al companiei."),
        coherenceRelevant: [],
        deviationsToFlag: [],
        specificData: {},
      }
  }
}

/**
 * Construiește esența companiei — narativ scurt pentru system prompt agent
 */
function buildEssence(profile: CompanyProfile, agentPurpose: string): string {
  const parts: string[] = []

  if (profile.identity.caenName) {
    parts.push(`Domeniu: ${profile.identity.caenName}`)
  }
  if (profile.identity.industry) {
    parts.push(`Industrie: ${profile.identity.industry}`)
  }

  const mission = profile.mvv.missionValidated || profile.mvv.missionDraft
  if (mission) {
    parts.push(`Misiune: ${mission}`)
  }

  const vision = profile.mvv.visionValidated || profile.mvv.visionDraft
  if (vision) {
    parts.push(`Viziune: ${vision}`)
  }

  const values = profile.mvv.valuesValidated.length > 0 ? profile.mvv.valuesValidated : profile.mvv.valuesDraft
  if (values.length > 0) {
    parts.push(`Valori: ${values.join(", ")}`)
  }

  parts.push(`Maturitate: ${profile.mvv.maturity} (scor ${profile.maturityState.score}/100)`)
  parts.push(`Coerență: ${profile.coherence.overallScore}/100`)
  parts.push(agentPurpose)

  return parts.join("\n")
}

function filterChecks(checks: CoherenceCheck[], pairs: string[]): CoherenceCheck[] {
  return checks.filter(c => pairs.includes(c.pair))
}

function extractDeviations(profile: CompanyProfile, pairs: string[]): string[] {
  return profile.coherence.deviations
    .filter(d => pairs.includes(d.pair))
    .map(d => d.gap)
    .filter((g): g is string => g !== null)
}
