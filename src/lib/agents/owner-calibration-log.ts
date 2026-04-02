/**
 * owner-calibration-log.ts — Logare și propagare calibrări Owner
 *
 * Orice input Owner cu flag-uri:
 * 1. Se loghează în KB (agentRole: "OWNER", tags: calibration)
 * 2. Se propagă bottom-up: COG → department heads relevanți
 * 3. Se acumulează pattern-uri — Owner-ul învață din propriile flag-uri
 *
 * Scopul NU e supravegherea Owner-ului — e ÎNVĂȚAREA organizațională.
 * Dacă Owner-ul face aceeași greșeală de 3 ori, a treia oară
 * sistemul o semnalează mai clar — pentru că a învățat din primele două.
 */

import type { PrismaClient } from "@/generated/prisma"
import type { OwnerCalibrationResult, CalibrationFlag } from "./owner-calibration"
import { ESCALATION_CHAIN } from "./escalation-chain"

// ── Logare calibrare în KB ──────────────────────────────────────────────────

export async function logOwnerCalibration(
  calibration: OwnerCalibrationResult,
  source: "cog-chat" | "proposal-decide" | "execute" | "direct",
  prisma: PrismaClient
): Promise<void> {
  if (calibration.flags.length === 0) return

  const p = prisma as any

  // 1. Loghează fiecare flag ca KB entry pe OWNER
  for (const flag of calibration.flags) {
    try {
      await p.kBEntry.create({
        data: {
          agentRole: "COG", // COG primește — e interfața cu Owner
          kbType: "SHARED_DOMAIN",
          content: `[Calibrare Owner/${source}] [${flag.layer}/${flag.severity}] ${flag.message}${flag.suggestion ? ` Sugestie: ${flag.suggestion}` : ""}. Input: "${calibration.input.substring(0, 150)}"`,
          source: "DISTILLED_INTERACTION",
          confidence: flag.severity === "CRITIC" ? 0.95 : flag.severity === "IMPORTANT" ? 0.85 : 0.70,
          status: "PERMANENT",
          tags: [
            "owner-calibration",
            flag.layer.toLowerCase(),
            flag.severity.toLowerCase(),
            source,
            ...getPatternTags(flag),
          ],
          usageCount: 0,
          validatedAt: new Date(),
        },
      })
    } catch { /* duplicate or DB error — non-blocking */ }
  }

  // 2. Propagă către ierarhie — COG informează department heads relevanți
  await propagateToHierarchy(calibration, source, p)

  // 3. Verifică pattern-uri recurente
  await checkRecurringPatterns(calibration, p)
}

// ── Extrage tag-uri din flag pentru clasificare ─────────────────────────────

function getPatternTags(flag: CalibrationFlag): string[] {
  const tags: string[] = []
  const msg = flag.message.toLowerCase()

  if (msg.includes("umbra") || msg.includes("graba") || msg.includes("distrugere") || msg.includes("apatie")) tags.push("umbra")
  if (msg.includes("gdpr") || msg.includes("date personale")) tags.push("gdpr")
  if (msg.includes("cod penal") || msg.includes("infracțiune")) tags.push("penal")
  if (msg.includes("cod muncii") || msg.includes("concediere")) tags.push("munca")
  if (msg.includes("frustrare") || msg.includes("fear-based")) tags.push("frustrare")
  if (msg.includes("deontologie") || msg.includes("secret profesional")) tags.push("deontologie")
  if (msg.includes("ai act") || msg.includes("supraveghere umană")) tags.push("ai-act")
  if (msg.includes("daniel david") || msg.includes("cultural")) tags.push("cultural")
  if (msg.includes("limbaj") || msg.includes("birocratic") || msg.includes("diacritice")) tags.push("lingvistic")

  return tags
}

// ── Propagare bottom-up prin ierarhie ───────────────────────────────────────

async function propagateToHierarchy(
  calibration: OwnerCalibrationResult,
  source: string,
  p: any
): Promise<void> {
  // Identifică departamentele afectate pe baza conținutului
  const affectedRoles = identifyAffectedRoles(calibration)

  for (const role of affectedRoles) {
    try {
      // Găsește lanțul ierarhic de la rol la COG
      const chain: string[] = [role]
      let current = role
      while (ESCALATION_CHAIN[current] && current !== "COG") {
        current = ESCALATION_CHAIN[current]
        chain.push(current)
      }

      // Creează entry informativ pentru fiecare nivel din lanț
      for (const chainRole of chain) {
        await p.kBEntry.create({
          data: {
            agentRole: chainRole,
            kbType: "SHARED_DOMAIN",
            content: `[Informare calibrare Owner] Sursa: ${source}. ${calibration.flags.map(f => `[${f.layer}] ${f.message}`).join(" | ")}`,
            source: "PROPAGATED",
            confidence: 0.60,
            status: "BUFFER", // Buffer — nu permanent, se validează sau expiră
            tags: ["owner-calibration", "propagare", source],
            usageCount: 0,
            propagatedFrom: "COG",
          },
        }).catch(() => {}) // Ignore duplicates
      }
    } catch { /* non-blocking */ }
  }
}

// ── Identifică rolurile afectate de input-ul Owner ──────────────────────────

function identifyAffectedRoles(calibration: OwnerCalibrationResult): string[] {
  const roles: string[] = []
  const input = calibration.input.toLowerCase()
  const flagMessages = calibration.flags.map(f => f.message.toLowerCase()).join(" ")

  // Pe baza conținutului, identifică cine e afectat
  if (/legal|gdpr|penal|muncii|comercial/i.test(flagMessages)) roles.push("CJA")
  if (/hr|angajat|concediere|salar/i.test(flagMessages)) roles.push("HR_COUNSELOR")
  if (/marketing|publicitate|comunicare externă/i.test(flagMessages)) roles.push("CMA")
  if (/psiholog|deontologie|evaluare psihologică/i.test(flagMessages)) roles.push("PPMO")
  if (/ai act|algoritm|automat/i.test(flagMessages)) roles.push("COA")
  if (/frustrare|cultural|daniel david/i.test(flagMessages)) roles.push("PSYCHOLINGUIST")
  if (/financiar|fiscal|evaziune|factur/i.test(flagMessages)) roles.push("COAFin")
  if (/securitate|breach|incident/i.test(flagMessages)) roles.push("SA")

  // COG primește mereu
  if (!roles.includes("COG")) roles.push("COG")

  return [...new Set(roles)]
}

// ── Verificare pattern-uri recurente ────────────────────────────────────────

async function checkRecurringPatterns(
  calibration: OwnerCalibrationResult,
  p: any
): Promise<void> {
  // Numără flag-uri similare din ultimele 30 zile
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  for (const flag of calibration.flags) {
    const patternTags = getPatternTags(flag)
    if (patternTags.length === 0) continue

    try {
      const similarCount = await p.kBEntry.count({
        where: {
          agentRole: "COG",
          tags: { hasEvery: ["owner-calibration", ...patternTags] },
          createdAt: { gte: thirtyDaysAgo },
        },
      })

      // Dacă pattern-ul apare de 3+ ori → creează entry de atenționare
      if (similarCount >= 3) {
        const patternName = patternTags.join("+")
        await p.kBEntry.create({
          data: {
            agentRole: "COG",
            kbType: "PERMANENT",
            content: `[Pattern recurent Owner] Pattern-ul "${patternName}" a apărut de ${similarCount} ori în ultimele 30 zile. Aceasta indică o tendință care merită atenție în dialogul cu Owner-ul. COG ar trebui să abordeze subiectul proactiv, cu respect și context.`,
            source: "DISTILLED_INTERACTION",
            confidence: 0.85,
            status: "PERMANENT",
            tags: ["owner-calibration", "pattern-recurent", ...patternTags],
            usageCount: 0,
            validatedAt: new Date(),
          },
        }).catch(() => {}) // Ignore if already exists
      }
    } catch { /* non-blocking */ }
  }
}
