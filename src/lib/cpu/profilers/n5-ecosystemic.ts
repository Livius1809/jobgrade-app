/**
 * N5: PROFILER ECOSISTEMIC — totul cu totul
 *
 * Cel mai înalt nivel de integrare. Vede întregul ecosistem:
 * oameni + organizații + relații + teritoriu + trenduri + legislație + L1 Binele.
 *
 * Vede ce N4 nu vede:
 * - Relațiile sunt bune DAR legislația se schimbă = adaptare necesară
 * - Ecosistemul prosperă DAR depopularea va lovi în 5 ani = intervenție acum
 * - Toate firmele cresc DAR mediul se degradează = Binele nu se propagă
 *
 * Acesta e nivelul la care MOTORUL TERITORIAL operează deja.
 * N5 integrează Motor Teritorial + N1-N4 + L1 + L3 + predicții.
 *
 * Consumat de: decizii strategice Owner, naștere business-uri, rapoarte ecosistemice.
 */

import { prisma } from "@/lib/prisma"
import { analyzeTerritory } from "@/lib/crawl/territorial-analysis"
import { calculateTerritorialBalance } from "@/lib/crawl/territorial-balance"
import { generateSupplyChainMap } from "@/lib/bridge/supply-chain-map"
import { OrganizationalProfiler, type OrganizationalProfile } from "./n3-organizational"
import { RelationalProfiler, type RelationalProfile } from "./n4-relational"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface EcosystemicProfile {
  territory: string
  generatedAt: string

  /** Scoruri agregate */
  scores: {
    ecosystemVitality: number      // 0-10 — sănătatea întregului ecosistem
    economicHealth: number         // 0-10 — din Motor Teritorial
    socialCohesion: number         // 0-10 — din N4 relațional
    humanCapital: number           // 0-10 — din N2 agregat
    organizationalMaturity: number // 0-10 — din N3 agregat
    sustainabilityIndex: number    // 0-10 — Binele se auto-propagă?
  }

  /** Forțe ecosistemice (ce susține ecosistemul) */
  forces: Array<{
    force: string
    strength: number  // 0-10
    source: string    // de unde vine
  }>

  /** Vulnerabilități (ce poate destabiliza) */
  vulnerabilities: Array<{
    vulnerability: string
    severity: number  // 0-10
    timeHorizon: string  // "imediat", "1-2 ani", "3-5 ani"
    mitigation: string
  }>

  /** Auto-propagare Bine — cel mai important indicator */
  goodnessPropagation: {
    score: number  // 0-10
    mechanisms: string[]      // cum se propagă Binele
    blockers: string[]        // ce blochează propagarea
    accelerators: string[]    // ce ar accelera propagarea
  }

  /** Direcție ecosistem */
  trajectory: "ASCENDENTA" | "STABILA" | "DESCENDENTA"
  trajectoryExplanation: string

  /** Recomandări strategice (nivel Owner) */
  strategicRecommendations: string[]
}

// ═══════════════════════════════════════════════════════════════
// ECOSYSTEMIC PROFILER
// ═══════════════════════════════════════════════════════════════

export const EcosystemicProfiler = {
  /**
   * Profilul ecosistemic complet al unui teritoriu.
   * Integrează TOATE nivelurile inferioare + Motor Teritorial + L1.
   */
  async buildProfile(territory: string): Promise<EcosystemicProfile> {
    // Date teritoriale
    const [analysis, balance] = await Promise.all([
      analyzeTerritory(territory),
      calculateTerritorialBalance(territory),
    ])

    // Rețea teritorială (N4)
    const network = await RelationalProfiler.buildTerritoryNetwork(territory)

    // Organizații din teritoriu (N3 — sample)
    const tenants = await prisma.tenant.findMany({ take: 5 }) // primele 5 disponibile
    const orgProfiles: OrganizationalProfile[] = []
    for (const t of tenants) {
      try {
        orgProfiles.push(await OrganizationalProfiler.buildProfile(t.id))
      } catch { /* skip */ }
    }

    // Scoruri
    const popTotal = analysis.resources.population.total
    const economicHealth = Math.min(10, Math.max(1, 5 + balance.balancePct / 10))

    const socialCohesion = network.networkHealth.density > 0.3 ? 7 :
      network.networkHealth.density > 0.1 ? 5 : 3

    const humanCapital = popTotal > 20000 ? 6 : popTotal > 10000 ? 5 : 4
    // Ajustare din grupe vârstă (dacă avem)
    const ageData = await prisma.territorialData.findMany({
      where: { territory, subcategory: "AGE_GROUPS" },
    })
    const youngPct = ageData.length > 0
      ? ageData.filter(d => ["age_20-29", "age_30-39"].includes(d.key))
        .reduce((s, d) => s + (d.numericValue || 0), 0) / popTotal
      : 0.2

    const adjustedHumanCapital = youngPct > 0.25 ? humanCapital + 1 : youngPct < 0.12 ? humanCapital - 2 : humanCapital

    const orgMaturity = orgProfiles.length > 0
      ? orgProfiles.reduce((s, o) => s + o.organismHealth.score, 0) / orgProfiles.length
      : 5

    // Auto-propagare Bine
    const goodness = assessGoodnessPropagation(analysis, balance, network)

    // Scor global
    const ecosystemVitality = Math.round(
      (economicHealth * 0.25 +
       socialCohesion * 0.20 +
       adjustedHumanCapital * 0.20 +
       orgMaturity * 0.15 +
       goodness.score * 0.20) * 10
    ) / 10

    // Forțe
    const forces: EcosystemicProfile["forces"] = []
    if (economicHealth > 6) forces.push({ force: "Economie locală funcțională", strength: economicHealth, source: "Motor Teritorial" })
    if (socialCohesion > 6) forces.push({ force: "Coeziune socială", strength: socialCohesion, source: "N4 Relațional" })
    if (adjustedHumanCapital > 6) forces.push({ force: "Capital uman disponibil", strength: adjustedHumanCapital, source: "N2 Individual" })
    if (balance.selfSufficiency.some(s => s.direction === "EXPORTATOR")) {
      forces.push({ force: "Sectoare exportatoare — valoare generată local", strength: 7, source: "Balanță teritorială" })
    }

    // Vulnerabilități
    const vulnerabilities: EcosystemicProfile["vulnerabilities"] = []
    if (youngPct < 0.15) {
      vulnerabilities.push({
        vulnerability: "Depopulare — tinerii pleacă",
        severity: 8, timeHorizon: "3-5 ani",
        mitigation: "Crearea de oportunități locale (formare, antreprenoriat, remote work)",
      })
    }
    if (balance.balancePct < -15) {
      vulnerabilities.push({
        vulnerability: "Scurgere economică — banii pleacă din teritoriu",
        severity: 7, timeHorizon: "1-2 ani",
        mitigation: "Procesare locală, reducere import, stimulare producție",
      })
    }
    if (network.networkHealth.vulnerabilities.length > 0) {
      for (const v of network.networkHealth.vulnerabilities) {
        vulnerabilities.push({
          vulnerability: v, severity: 6, timeHorizon: "imediat",
          mitigation: "Crearea de conexiuni noi între entitățile izolate",
        })
      }
    }

    // Traiectorie
    const trajectory: EcosystemicProfile["trajectory"] =
      ecosystemVitality >= 6 && goodness.score >= 6 ? "ASCENDENTA" :
      ecosystemVitality >= 4 ? "STABILA" : "DESCENDENTA"

    const trajectoryExplanation =
      trajectory === "ASCENDENTA" ? "Ecosistemul crește și Binele se propagă — spirală virtuoasă activă" :
      trajectory === "STABILA" ? "Ecosistemul funcționează dar nu evoluează — necesită catalizatori" :
      "Ecosistemul pierde vitalitate — intervenție necesară pe vulnerabilitățile identificate"

    // Recomandări
    const strategicRecommendations: string[] = []
    if (trajectory === "DESCENDENTA") {
      strategicRecommendations.push("URGENT: stabilizare prin adresarea primei vulnerabilități")
    }
    if (goodness.blockers.length > 0) {
      strategicRecommendations.push(`Deblocare propagare Bine: ${goodness.blockers[0]}`)
    }
    if (goodness.accelerators.length > 0) {
      strategicRecommendations.push(`Accelerator recomandat: ${goodness.accelerators[0]}`)
    }
    strategicRecommendations.push("Monitorizare ecosistemică trimestrială — trendurile contează mai mult decât snapshot-urile")

    return {
      territory,
      generatedAt: new Date().toISOString(),
      scores: {
        ecosystemVitality,
        economicHealth,
        socialCohesion,
        humanCapital: Math.max(1, Math.min(10, adjustedHumanCapital)),
        organizationalMaturity: Math.round(orgMaturity * 10) / 10,
        sustainabilityIndex: goodness.score,
      },
      forces,
      vulnerabilities,
      goodnessPropagation: goodness,
      trajectory,
      trajectoryExplanation,
      strategicRecommendations,
    }
  },
}

// ═══════════════════════════════════════════════════════════════
// AUTO-PROPAGARE BINE
// ═══════════════════════════════════════════════════════════════

function assessGoodnessPropagation(
  analysis: Awaited<ReturnType<typeof analyzeTerritory>>,
  balance: Awaited<ReturnType<typeof calculateTerritorialBalance>>,
  network: RelationalProfile
): EcosystemicProfile["goodnessPropagation"] {
  let score = 5
  const mechanisms: string[] = []
  const blockers: string[] = []
  const accelerators: string[] = []

  // Economie circulară locală = Bine se reține
  const localSufficient = balance.selfSufficiency.filter(s => s.sufficiencyPct > 60).length
  if (localSufficient > 3) {
    score += 1
    mechanisms.push("Economie locală auto-suficientă pe mai multe sectoare — valoarea rămâne")
  }

  // Rețea densă = Bine se distribuie
  if (network.networkHealth.density > 0.2) {
    score += 1
    mechanisms.push("Rețea de relații funcțională — informația și valoarea circulă")
  } else {
    blockers.push("Rețea rară — entitățile nu comunică, Binele se pierde în izolare")
    accelerators.push("Platformă de punți (Bridge) care conectează cerere cu ofertă")
  }

  // Noduri izolate = Bine nu ajunge
  if (network.isolatedNodes.length > network.nodes.length * 0.3) {
    score -= 1
    blockers.push("Peste 30% entități izolate — Binele nu ajunge la toți")
  }

  // Balanță pozitivă = Bine se acumulează
  if (balance.balancePct > 0) {
    score += 1
    mechanisms.push("Balanță teritorială pozitivă — valoarea se acumulează, nu se scurge")
  } else {
    blockers.push("Balanță negativă — valoarea pleacă din teritoriu înainte să genereze Bine")
    accelerators.push("Procesare locală a resurselor — oprește scurgerea de valoare")
  }

  // Gap-uri = Bine blocat
  if (analysis.gaps.length > 3) {
    score -= 1
    blockers.push(`${analysis.gaps.length} nevoi neacoperite — suferință evitabilă`)
    accelerators.push("Adresarea gap-urilor generează Bine direct și imediat")
  }

  // Diversitate = Bine se multiplică
  const sectors = new Set(
    balance.selfSufficiency.filter(s => s.localProduction > 0).map(s => s.sector)
  )
  if (sectors.size >= 5) {
    score += 1
    mechanisms.push("Diversitate sectorială — reziliență și cross-pollination naturală")
  }

  return {
    score: Math.max(1, Math.min(10, score)),
    mechanisms,
    blockers,
    accelerators,
  }
}
