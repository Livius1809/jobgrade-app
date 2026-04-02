/**
 * owner-evolution-report.ts — Raport de evoluție Owner
 *
 * "Evoluăm împreună" — Owner-ul nu e deasupra procesului de creștere,
 * e PARTE din el. Acest raport îi oferă o oglindă — nu judecată,
 * ci conștientizare.
 *
 * Raportul se generează la fiecare 3 zile (sincronizat cu raportul
 * de evoluție al agenților) și conține:
 *
 * 1. PROFIL DECIZIONAL — tipuri de decizii, frecvență, distribuție
 * 2. ALINIERE L1 (CÂMP) — cât de aliniate sunt input-urile la BINE
 * 3. ALINIERE L2 (SUPORT) — calibrare culturală, lingvistică, profesională
 * 4. ALINIERE L3 (LEGAL) — conștiință juridică, deontologică
 * 5. PATTERN-URI RECURENTE — tendințe repetitive (Umbra Owner)
 * 6. CALITATEA COMUNICĂRII — stil, claritate, concizie, eleganță
 * 7. RELAȚIA CU ECHIPA — cum interacționează cu agenții
 * 8. EVOLUȚIE ÎN TIMP — trend pe 30/60/90 zile
 * 9. RECOMANDĂRI DE CREȘTERE — sugestii concrete, acționabile
 * 10. REFLECȚIE — întrebări generatoare pentru auto-observare
 */

import type { PrismaClient } from "@/generated/prisma"
import Anthropic from "@anthropic-ai/sdk"

const MODEL = "claude-sonnet-4-20250514"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface OwnerDimension {
  name: string
  score: number            // 0-100
  trend: "up" | "down" | "stable"
  insights: string[]       // observații concrete
  recommendation: string   // sugestie de creștere
}

export interface OwnerPattern {
  type: string
  occurrences: number
  lastSeen: string
  layer: string
  description: string
  growthSuggestion: string
}

export interface CommunicationProfile {
  avgMessageLength: number
  decisionSpeed: "rapid" | "moderat" | "deliberat"
  dominantTone: string
  clarityScore: number     // 0-100
  diacriticsUsage: number  // % mesaje cu diacritice
}

export interface OwnerEvolutionReport {
  generatedAt: string
  periodDays: number
  totalInputs: number

  // Profilul decizional
  decisionProfile: {
    totalDecisions: number
    approved: number
    rejected: number
    deferred: number
    approvalRate: number
    avgTimeToDecision: string
  }

  // Cele 10 dimensiuni
  dimensions: OwnerDimension[]
  compositeScore: number
  compositeLevel: "REFLECTIV" | "CONȘTIENT" | "ALINIAT" | "INTEGRAT" | "EXEMPLAR"

  // Pattern-uri recurente
  patterns: OwnerPattern[]

  // Profil comunicare
  communication: CommunicationProfile

  // Evoluție în timp
  evolution: {
    days30: { score: number; trend: string }
    days60: { score: number; trend: string }
    days90: { score: number; trend: string }
  }

  // Recomandări și reflecție
  recommendations: string[]
  reflectionQuestions: string[]

  // Sumar narativ (generat de Claude)
  narrativeSummary: string
}

// ── Colectare date ──────────────────────────────────────────────────────────

async function collectOwnerData(periodDays: number, p: any) {
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
  const prevStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000)

  const [
    // Calibrări logheate (KB entries pe COG cu tag owner-calibration)
    calibrationsCurrent,
    calibrationsPrev,
    // Calibrări per layer
    l1Flags,
    l2Flags,
    l3Flags,
    // Calibrări per severitate
    critice,
    importante,
    atentie,
    info,
    // Pattern-uri recurente
    patterns,
    // Propuneri decidate
    proposalsDecided,
    proposalsApproved,
    proposalsRejected,
    proposalsDeferred,
    // Total calibrări (toate timpurile, pentru trend)
    total30,
    total60,
    total90,
    // KB entries de la Owner (prin COG chat)
    ownerInteractions,
  ] = await Promise.all([
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "owner-calibration" }, createdAt: { gte: periodStart } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "owner-calibration" }, createdAt: { gte: prevStart, lt: periodStart } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "l1"] }, createdAt: { gte: periodStart } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "l2"] }, createdAt: { gte: periodStart } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "l3"] }, createdAt: { gte: periodStart } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "critic"] }, createdAt: { gte: periodStart } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "important"] }, createdAt: { gte: periodStart } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "atenție"] }, createdAt: { gte: periodStart } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "info"] }, createdAt: { gte: periodStart } } }),
    p.kBEntry.findMany({
      where: { agentRole: "COG", tags: { has: "pattern-recurent" }, createdAt: { gte: periodStart } },
      select: { content: true, tags: true, createdAt: true },
    }),
    // Propuneri
    p.orgProposal.count({ where: { ownerDecision: { not: null }, updatedAt: { gte: periodStart } } }).catch(() => 0),
    p.orgProposal.count({ where: { ownerDecision: "APPROVED", updatedAt: { gte: periodStart } } }).catch(() => 0),
    p.orgProposal.count({ where: { ownerDecision: "REJECTED", updatedAt: { gte: periodStart } } }).catch(() => 0),
    p.orgProposal.count({ where: { ownerDecision: "DEFERRED", updatedAt: { gte: periodStart } } }).catch(() => 0),
    // Trend temporal
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "owner-calibration" }, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "owner-calibration" }, createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "owner-calibration" }, createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } }),
    // Interacțiuni Owner (estimat din COG KB cu tag cog-chat)
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "cog-chat" }, createdAt: { gte: periodStart } } }).catch(() => 0),
  ])

  return {
    calibrations: { current: calibrationsCurrent, previous: calibrationsPrev },
    byLayer: { l1: l1Flags, l2: l2Flags, l3: l3Flags },
    bySeverity: { critic: critice, important: importante, atentie, info },
    patterns,
    decisions: {
      total: proposalsDecided,
      approved: proposalsApproved,
      rejected: proposalsRejected,
      deferred: proposalsDeferred,
    },
    trend: { days30: total30, days60: total60, days90: total90 },
    interactions: ownerInteractions,
  }
}

// ── Calculare dimensiuni ────────────────────────────────────────────────────

function calculateDimensions(data: Awaited<ReturnType<typeof collectOwnerData>>): OwnerDimension[] {
  const dims: OwnerDimension[] = []
  const totalFlags = data.calibrations.current
  const prevFlags = data.calibrations.previous

  // 1. PROFIL DECIZIONAL
  const decisionScore = data.decisions.total > 0
    ? Math.min(100, 60 + (data.decisions.approved / data.decisions.total) * 20 + (data.decisions.deferred > 0 ? 10 : 0) + (data.decisions.rejected > 0 ? 10 : 0))
    : 70 // Baseline fără decizii
  dims.push({
    name: "Profil decizional",
    score: Math.round(decisionScore),
    trend: data.decisions.total > 0 ? "stable" : "stable",
    insights: [
      `${data.decisions.total} decizii în perioadă (${data.decisions.approved} aprobate, ${data.decisions.rejected} respinse, ${data.decisions.deferred} amânate)`,
      data.decisions.deferred > 0 ? "Amânarea deliberată indică reflecție — pozitiv" : "Nicio amânare — decizii rapide sau puține propuneri",
      data.decisions.total > 0 ? `Rata de aprobare: ${Math.round((data.decisions.approved / data.decisions.total) * 100)}%` : "Nicio propunere procesată",
    ],
    recommendation: "Echilibrul ideal: decizii prompte dar reflectate. Amânarea nu e slăbiciune — e maturitate.",
  })

  // 2. ALINIERE L1 (CÂMP)
  const l1Score = Math.max(0, 100 - (data.byLayer.l1 * 12) - (data.bySeverity.critic * 25))
  dims.push({
    name: "Aliniere L1 — CÂMPUL",
    score: Math.min(100, Math.max(0, l1Score)),
    trend: data.byLayer.l1 < (prevFlags > 0 ? data.calibrations.previous * 0.3 : 1) ? "up" : data.byLayer.l1 > 2 ? "down" : "stable",
    insights: [
      `${data.byLayer.l1} flag-uri L1 în perioadă (moral, etică, conștiință)`,
      data.bySeverity.critic > 0 ? `⚠ ${data.bySeverity.critic} flag-uri CRITICE — necesită atenție imediată` : "Zero flag-uri critice — excelent",
      data.byLayer.l1 === 0 ? "Nicio discrepanță morală detectată — aliniere completă cu BINELE" : "Discrepanțe detectate — oportunitate de reflecție",
    ],
    recommendation: data.byLayer.l1 === 0
      ? 'Menține cursul. Alinierea cu BINELE e naturală când deciziile pornesc de la "Servește VIAȚA?"'
      : 'Înainte de fiecare decizie importantă, 10 secunde de reflecție: "Această acțiune susține VIAȚA pe toate nivelurile concentrice?"',
  })

  // 3. ALINIERE L2 (SUPORT)
  const l2Score = Math.max(0, 100 - (data.byLayer.l2 * 8))
  dims.push({
    name: "Aliniere L2 — Calibrare culturală",
    score: Math.min(100, Math.max(0, l2Score)),
    trend: data.byLayer.l2 <= 1 ? "stable" : "down",
    insights: [
      `${data.byLayer.l2} flag-uri L2 (cultural, lingvistic, profesional)`,
      data.byLayer.l2 === 0 ? "Comunicarea e cultural calibrată — fără pattern-uri problematice" : "Detectate pattern-uri de comunicare care pot fi rafinate",
    ],
    recommendation: data.byLayer.l2 === 0
      ? "Stilul de comunicare e aliniat. Continuă să folosești storytelling și validare."
      : "Recitește principiile Daniel David: validare > presiune, concret > abstract, relație > tranzacție.",
  })

  // 4. ALINIERE L3 (LEGAL)
  const l3Score = Math.max(0, 100 - (data.byLayer.l3 * 10) - (data.bySeverity.critic * 30))
  dims.push({
    name: "Aliniere L3 — Cadrul legal",
    score: Math.min(100, Math.max(0, l3Score)),
    trend: data.byLayer.l3 === 0 ? "stable" : "down",
    insights: [
      `${data.byLayer.l3} flag-uri L3 (legal, deontologic)`,
      data.bySeverity.critic > 0 ? `⚠ ${data.bySeverity.critic} flag-uri cu implicații penale/legale grave` : "Nicio implicație penală",
      data.byLayer.l3 === 0 ? "Conștiință juridică excelentă" : "Consultă CJA pe deciziile cu impact legal",
    ],
    recommendation: data.byLayer.l3 === 0
      ? "Conștiința juridică e activă. Menține obiceiul de a consulta CJA pe orice neclaritate."
      : "Regula de aur: dacă nu ești sigur pe legalitate, întreabă ÎNAINTE. CJA e partenerul tău, nu auditorul.",
  })

  // 5. PATTERN-URI RECURENTE (Umbra Owner)
  const patternCount = data.patterns.length
  const patternScore = Math.max(0, 100 - (patternCount * 20))
  dims.push({
    name: "Conștientizare pattern-uri",
    score: Math.min(100, Math.max(0, patternScore)),
    trend: patternCount === 0 ? "stable" : patternCount > 2 ? "down" : "stable",
    insights: [
      `${patternCount} pattern-uri recurente detectate`,
      ...data.patterns.slice(0, 3).map((p: any) => `Pattern: ${p.content.substring(p.content.indexOf('"') + 1, p.content.lastIndexOf('"'))}`),
    ],
    recommendation: patternCount === 0
      ? "Nicio tendință repetitivă problematică. Auto-observarea funcționează."
      : "Pattern-urile recurente sunt oportunități de creștere. Nu le reprima — observă-le și alege conștient altfel.",
  })

  // 6. CALITATE COMUNICARE
  const commScore = Math.min(100, 70 + (totalFlags === 0 ? 30 : Math.max(0, 30 - totalFlags * 5)))
  dims.push({
    name: "Calitatea comunicării",
    score: commScore,
    trend: totalFlags <= prevFlags ? "up" : "down",
    insights: [
      `${totalFlags} discrepanțe totale în perioadă (vs. ${prevFlags} perioada anterioară)`,
      totalFlags < prevFlags ? "Trend pozitiv — comunicarea se rafinează" : totalFlags > prevFlags ? "Trend de atenție — mai multe discrepanțe decât anterior" : "Stabil",
    ],
    recommendation: "Eleganța în comunicare: dacă o propoziție poate fi spusă mai simplu și mai frumos, rescrie-o.",
  })

  // 7. RELAȚIA CU ECHIPA
  const teamScore = Math.min(100, 60 + (data.interactions * 5) + (data.decisions.deferred * 10) - (data.bySeverity.critic * 15))
  dims.push({
    name: "Relația cu echipa",
    score: Math.max(0, teamScore),
    trend: "stable",
    insights: [
      `${data.interactions} interacțiuni COG Chat în perioadă`,
      data.interactions > 3 ? "Dialog activ cu echipa — pozitiv" : "Puține interacțiuni — echipa funcționează autonom sau dialogul e insuficient?",
      data.decisions.total > 0 ? "Participare activă la decizii — echipa simte prezența" : "Fără decizii pe propuneri — echipa poate simți absența",
    ],
    recommendation: "Echipa are nevoie de prezență, nu de control. Un mesaj scurt în COG Chat e mai valoros decât o directivă lungă.",
  })

  // 8. AUTENTICITATE (coerența între ce spune și ce face)
  const authScore = Math.max(0, 90 - (data.bySeverity.critic * 20) - (patternCount * 10) + (data.interactions * 3))
  dims.push({
    name: "Autenticitate",
    score: Math.min(100, Math.max(0, authScore)),
    trend: patternCount === 0 && data.bySeverity.critic === 0 ? "up" : "stable",
    insights: [
      data.bySeverity.critic === 0 && patternCount === 0 ? "Coerență completă între valori declarate și acțiuni" : "Discrepanțe între intenție și acțiune — normal, dar de observat",
      "Autenticitatea crește prin conștientizare, nu prin efort",
    ],
    recommendation: "Nu încerca să fii perfect — încearcă să fii conștient. Autenticitatea vine din a vedea clar, nu din a acționa impecabil.",
  })

  return dims
}

// ── Generare raport complet ─────────────────────────────────────────────────

export async function generateOwnerEvolutionReport(
  prisma: PrismaClient,
  periodDays: number = 3
): Promise<OwnerEvolutionReport> {
  const p = prisma as any
  const data = await collectOwnerData(periodDays, p)
  const dimensions = calculateDimensions(data)

  // Scor compozit
  const weights = [0.10, 0.20, 0.10, 0.15, 0.15, 0.10, 0.10, 0.10]
  const compositeScore = Math.round(
    dimensions.reduce((sum, dim, i) => sum + dim.score * (weights[i] || 0.1), 0)
  )

  // Nivel de maturitate Owner
  const compositeLevel: OwnerEvolutionReport["compositeLevel"] =
    compositeScore >= 90 ? "EXEMPLAR" :
    compositeScore >= 75 ? "INTEGRAT" :
    compositeScore >= 60 ? "ALINIAT" :
    compositeScore >= 40 ? "CONȘTIENT" : "REFLECTIV"

  // Pattern-uri formatate
  const patterns: OwnerPattern[] = data.patterns.map((p: any) => {
    const tags = p.tags || []
    return {
      type: tags.find((t: string) => !["owner-calibration", "pattern-recurent"].includes(t)) || "general",
      occurrences: 3, // minim 3 ca să fie pattern
      lastSeen: p.createdAt?.toISOString?.() || new Date().toISOString(),
      layer: tags.includes("l1") ? "L1" : tags.includes("l2") ? "L2" : tags.includes("l3") ? "L3" : "General",
      description: p.content.substring(0, 200),
      growthSuggestion: "Observă acest pattern fără a-l judeca. Întreabă-te: ce nevoie reală stă în spatele lui?",
    }
  })

  // Profil comunicare (estimat)
  const communication: CommunicationProfile = {
    avgMessageLength: 0, // ar necesita logarea mesajelor
    decisionSpeed: data.decisions.deferred > data.decisions.approved ? "deliberat" : data.decisions.total > 5 ? "rapid" : "moderat",
    dominantTone: data.bySeverity.critic > 0 ? "directiv" : data.interactions > 3 ? "dialogic" : "strategic",
    clarityScore: Math.max(0, 100 - data.calibrations.current * 5),
    diacriticsUsage: 80, // estimat — ar necesita analiza textelor
  }

  // Evoluție temporală
  const evolution = {
    days30: { score: Math.max(0, 100 - data.trend.days30 * 3), trend: data.trend.days30 < 5 ? "pozitiv" : "de monitorizat" },
    days60: { score: Math.max(0, 100 - data.trend.days60 * 2), trend: data.trend.days60 < 10 ? "pozitiv" : "de monitorizat" },
    days90: { score: Math.max(0, 100 - data.trend.days90 * 1.5), trend: data.trend.days90 < 15 ? "pozitiv" : "de monitorizat" },
  }

  // Recomandări personalizate
  const recommendations: string[] = []
  if (data.byLayer.l1 > 0) recommendations.push('Începe fiecare zi cu 1 minut de intenție: "Azi, deciziile mele servesc VIAȚA."')
  if (data.byLayer.l2 > 0) recommendations.push("Recitește o dată pe săptămână principiile Daniel David — calibrarea culturală e un mușchi care se antrenează.")
  if (data.byLayer.l3 > 0) recommendations.push('Stabilește un ritual: înainte de orice decizie cu impact extern, întreabă "CJA ar fi de acord?"')
  if (data.patterns.length > 0) recommendations.push("Ține un jurnal scurt (3 rânduri/zi) despre deciziile luate și motivul lor real. Pattern-urile devin vizibile în scris.")
  if (data.interactions < 2) recommendations.push("Crește dialogul cu COG la minim 2-3 interacțiuni pe perioadă. Echipa are nevoie de direcție, nu doar de aprobare.")
  if (recommendations.length === 0) recommendations.push("Continuă pe acest drum. Evoluția e un proces, nu o destinație.")

  // Întrebări de reflecție
  const reflectionQuestions = [
    "Care a fost decizia din ultima perioadă care te-a făcut cel mai mândru? De ce?",
    "A existat un moment în care ai simțit că grăbești ceva? Ce ar fi fost diferit cu 24h de gândire?",
    "Dacă echipa ta ar descrie stilul tău de conducere într-un cuvânt, care ar fi? E cuvântul pe care ți-l dorești?",
    "Ce ai învățat despre tine din această perioadă care nu știai înainte?",
    "Există o decizie pe care ai amâna-o dacă ar trebui să o iei din nou? De ce?",
  ]

  // Sumar narativ (generat de Claude)
  let narrativeSummary = ""
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `Ești consilierea internă a organizației JobGrade. Scrie un paragraf de reflecție pentru Owner (Liviu), bazat pe datele raportului de evoluție:

Scor compozit: ${compositeScore}/100 (nivel: ${compositeLevel})
Flag-uri perioadă: ${data.calibrations.current} (L1: ${data.byLayer.l1}, L2: ${data.byLayer.l2}, L3: ${data.byLayer.l3})
Critice: ${data.bySeverity.critic} | Pattern-uri recurente: ${data.patterns.length}
Decizii: ${data.decisions.total} (${data.decisions.approved}A/${data.decisions.rejected}R/${data.decisions.deferred}D)
Interacțiuni echipă: ${data.interactions}

Scrie în română cu diacritice. Tonul: cald, respectuos, constructiv — ca un prieten înțelept, nu ca un auditor.
Nu felicita gratuit — observă cu onestitate. Nu critica — invită la reflecție.
Maxim 4 propoziții. Fiecare propoziție să aibă greutate.
NU menționa scoruri numerice — vorbește despre esență, nu despre cifre.`,
      }],
    })
    narrativeSummary = response.content[0].type === "text" ? response.content[0].text : ""
  } catch {
    narrativeSummary = `Perioadă cu ${data.calibrations.current} momente de calibrare și ${data.decisions.total} decizii. Evoluția e un proces continuu — fiecare flag e o oglindă, nu o judecată.`
  }

  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    totalInputs: data.calibrations.current + data.interactions + data.decisions.total,
    decisionProfile: {
      totalDecisions: data.decisions.total,
      approved: data.decisions.approved,
      rejected: data.decisions.rejected,
      deferred: data.decisions.deferred,
      approvalRate: data.decisions.total > 0 ? Math.round((data.decisions.approved / data.decisions.total) * 100) : 0,
      avgTimeToDecision: "N/A", // ar necesita timestamp-uri detaliate
    },
    dimensions,
    compositeScore,
    compositeLevel,
    patterns,
    communication,
    evolution,
    recommendations,
    reflectionQuestions,
    narrativeSummary,
  }
}
