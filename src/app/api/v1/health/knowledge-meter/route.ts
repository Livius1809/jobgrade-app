/**
 * GET /api/v1/health/knowledge-meter
 *
 * Contor de cunoaștere — tezaurul AI de Continuitate.
 * Arată ce știe organismul, pe ce business, pe ce card C1-C4,
 * per agent, per tip de cunoaștere, cu acoperire %.
 *
 * Cu fiecare business adăugat, tezaurul crește.
 * AI de continuitate devine consultant din ce în ce mai evoluat.
 */

import { NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Mapare agenți → card de business (C1-C4) + cross-business
const AGENT_CARD_MAP: Record<string, string> = {
  // C1 — Organizare (fișe post, evaluare, ierarhizare)
  HR_COUNSELOR: "C1", JE_ENGINE: "C1", MEDIATOR: "C1",
  DOAS: "C1",       // Director Operațiuni — structură organizațională
  DOA: "C1",        // Director Organizare — organigrame, stat funcții
  PSE: "C1",        // Psiholog Evaluare — baterii psihometrice
  PPA: "C1",        // Psiholog Psihometrician — instrumente profilare

  // C2 — Conformitate (grilă salarială, pay gap, legislație)
  CJA: "C2", LEGAL: "C2",
  CAA: "C2",        // Compliance & Audit Agent
  DPO: "C2",        // Data Protection Officer
  RPA_FIN: "C2",    // Raportare Financiară — conformitate fiscală
  COAFin: "C2",     // Cost Optimization — buget/conformitate
  CCO: "C2",        // Chief Compliance Officer

  // C3 — Competitivitate (KPI, benchmark, sociogramă, procese)
  CIA: "C3", CCIA: "C3", PMA: "C3", DMA: "C3",
  BDA: "C3",        // Business Development Agent
  RDA: "C3",        // Research & Development Agent
  SCA: "C3",        // Supply Chain Agent — procese
  PCM: "C3",        // Process Continuous Improvement
  PCA: "C3",        // Process Control Agent
  BCA: "C3",        // Business Continuity Agent
  FPA: "C3",        // Financial Planning Agent

  // C4 — Dezvoltare (cultură, 3C, ROI, intervenții)
  COCSA: "C4", PSYCHOLINGUIST: "C4", SAFETY_MONITOR: "C4",
  ACEA: "C4",       // Adaptive Culture Evolution Agent
  EVOLUTION_ENGINE: "C4", // Motor evoluție
  ACA: "C4",        // Agent Calibrare Adaptivă
  SOC: "C4",        // Sociolog Organizațional
  GDA: "C4",        // Growth & Development Agent
  NSA: "C4",        // Neuro-Science Agent

  // Management / Cross-business
  COG: "MANAGEMENT", COA: "MANAGEMENT", CFO: "MANAGEMENT",
  PPMO: "MANAGEMENT",  // Project Portfolio Management
  STA: "MANAGEMENT",   // Strategic Agent
  OWNER: "MANAGEMENT", // Owner direct
  "COG|PMA": "MANAGEMENT",

  // Marketing & Vânzări
  MKA: "MARKETING", CMA: "MARKETING", CWA: "MARKETING",
  SMMA: "MARKETING",   // Social Media Marketing Agent
  CSEO: "MARKETING",   // SEO Agent
  EMAS: "MARKETING",   // Email Marketing Agent
  DMM: "MARKETING",    // Digital Marketing Manager
  MGA: "MARKETING",    // Marketing Growth Agent
  PMP_B2B: "MARKETING", // Product Marketing B2B
  "SOA|CWA": "MARKETING",

  // Client-facing
  SOA: "CLIENT", CSSA: "CLIENT", CSA: "CLIENT",
  CSM: "CLIENT",       // Customer Success Manager
  "Support Lead": "CLIENT",
  "CDIA|CSA": "CLIENT",
  "CSA|CDIA": "CLIENT",
  "CSA|COG": "CLIENT",

  // B2C
  CALAUZA: "B2C", PROFILER: "B2C", CAREER_COUNSELOR: "B2C",
  DVB2C: "B2C",       // Development B2C
  PMP_B2C: "B2C",     // Product Marketing B2C
  SEBC: "B2C",        // Service Excellence B2C

  // Produs & Dezvoltare
  EMA: "PRODUCT",     // Engineering Manager Agent
  DVB2B: "PRODUCT",   // Development B2B
  DTE: "PRODUCT",     // Dev Team Engineering
  REVOPS: "PRODUCT",  // Revenue Operations
  "Technical Writer": "PRODUCT",
  PMRA: "PRODUCT",    // Product Manager Release Agent
  DEA: "PRODUCT",     // Developer Experience Agent

  // Quality Assurance
  QLA: "QUALITY", SQA: "QUALITY", QAA: "QUALITY",

  // Infrastructură & Securitate
  TDA: "INFRA", SA: "INFRA", SVHA: "INFRA", COSO: "INFRA",
  DPA: "INFRA",       // DevOps / Platform Agent
  ISA: "INFRA",       // Information Security Agent
  MOA: "INFRA",       // Monitoring & Alerting
  IRA: "INFRA",       // Incident Response Agent
  // MDA apare și ca Maintenance Dev Agent — mapat la DATA (prioritar)
  FDA: "INFRA",       // Full-stack Dev Agent
  "DevOps/Ops": "INFRA",
  "DATA_ARCHITECT": "INFRA",
  "BDA|TDA": "INFRA",
  "CFO|DDA": "INFRA",

  // Data & Analytics
  CDIA: "DATA",       // Chief Data & Intelligence Agent
  DDA: "DATA",        // Data & Decisions Agent
  MAA: "DATA",        // Machine Analytics Agent
  PTA: "DATA",        // Predictive & Trends Agent
  MDA: "DATA",        // Market Data Agent (alias — context decide)

  // System
  SYSTEM: "SYSTEM",
}

// Acoperire target per card (câte entries = 100%)
const COVERAGE_TARGETS: Record<string, number> = {
  C1: 1200,
  C2: 1000,
  C3: 900,
  C4: 800,
  MANAGEMENT: 500,
  MARKETING: 400,
  CLIENT: 600,
  B2C: 500,
  PRODUCT: 400,
  QUALITY: 300,
  INFRA: 300,
  DATA: 300,
  SYSTEM: 100,
  OTHER: 200,
}

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  // ═══ Statistici globale ═══
  const [totalPermanent, totalBuffer, totalArchived, totalWithEmbedding] = await Promise.all([
    prisma.kBEntry.count({ where: { status: "PERMANENT" } }),
    prisma.kBEntry.count({ where: { status: "BUFFER" } }),
    prisma.kBEntry.count({ where: { status: "ARCHIVED" } }),
    prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT count(*) FROM kb_entries WHERE status = 'PERMANENT' AND embedding IS NOT NULL`
    ),
  ])

  const embeddingCoverage = totalPermanent > 0
    ? Math.round((Number(totalWithEmbedding[0].count) / totalPermanent) * 100)
    : 0

  // ═══ Per agent ═══
  const perAgent = await prisma.$queryRaw<
    Array<{ agentRole: string; count: bigint; avg_confidence: number; avg_usage: number }>
  >`
    SELECT "agentRole",
           count(*) as count,
           ROUND(AVG(confidence)::numeric, 3) as avg_confidence,
           ROUND(AVG("usageCount")::numeric, 1) as avg_usage
    FROM kb_entries
    WHERE status = 'PERMANENT'
    GROUP BY "agentRole"
    ORDER BY count DESC
  `

  // ═══ Per kbType ═══
  const perType = await prisma.$queryRaw<
    Array<{ kbType: string; count: bigint }>
  >`
    SELECT "kbType"::text, count(*)
    FROM kb_entries
    WHERE status = 'PERMANENT'
    GROUP BY "kbType"
    ORDER BY count DESC
  `

  // ═══ Per source ═══
  const perSource = await prisma.$queryRaw<
    Array<{ source: string; count: bigint }>
  >`
    SELECT source::text, count(*)
    FROM kb_entries
    WHERE status = 'PERMANENT'
    GROUP BY source
    ORDER BY count DESC
  `

  // ═══ Agregare pe carduri C1-C4 + categorii ═══
  const cardStats: Record<string, { entries: number; agents: string[]; avgConfidence: number; coverage: number }> = {}

  for (const row of perAgent) {
    const card = AGENT_CARD_MAP[row.agentRole] || "OTHER"
    if (!cardStats[card]) {
      cardStats[card] = { entries: 0, agents: [], avgConfidence: 0, coverage: 0 }
    }
    const count = Number(row.count)
    cardStats[card].entries += count
    cardStats[card].agents.push(row.agentRole)
    // Medie ponderată
    cardStats[card].avgConfidence =
      (cardStats[card].avgConfidence * (cardStats[card].entries - count) + Number(row.avg_confidence) * count)
      / cardStats[card].entries
  }

  // Calculează acoperire %
  for (const [card, stats] of Object.entries(cardStats)) {
    const target = COVERAGE_TARGETS[card] || 500
    stats.coverage = Math.min(100, Math.round((stats.entries / target) * 100))
    stats.avgConfidence = Math.round(stats.avgConfidence * 1000) / 1000
  }

  // ═══ Creștere recentă (ultimele 7 zile) ═══
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600000)
  const recentEntries = await prisma.kBEntry.count({
    where: { status: "PERMANENT", createdAt: { gte: weekAgo } },
  })
  const recentBuffers = await prisma.kBBuffer.count({
    where: { createdAt: { gte: weekAgo } },
  })

  // ═══ Top 5 agenți cu cele mai multe entries ═══
  const topAgents = perAgent.slice(0, 5).map(a => ({
    agent: a.agentRole,
    entries: Number(a.count),
    confidence: Number(a.avg_confidence),
    avgUsage: Number(a.avg_usage),
    card: AGENT_CARD_MAP[a.agentRole] || "OTHER",
  }))

  // ═══ Maturitate globală ═══
  const totalTarget = Object.values(COVERAGE_TARGETS).reduce((a, b) => a + b, 0)
  const maturityPct = Math.min(100, Math.round((totalPermanent / totalTarget) * 100))

  // Nivel maturitate
  let maturityLevel: string
  if (maturityPct >= 90) maturityLevel = "AUTONOM"
  else if (maturityPct >= 70) maturityLevel = "AVANSAT"
  else if (maturityPct >= 45) maturityLevel = "INTERMEDIAR"
  else if (maturityPct >= 20) maturityLevel = "INCEPUT"
  else maturityLevel = "EMBRIONAR"

  // ═══ Estimare autonomie — cât % din cereri poate servi KB fără Claude ═══
  // Bazat pe entries cu confidence > 0.8 și embedding present
  const highConfidenceWithEmbedding = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT count(*) FROM kb_entries WHERE status = 'PERMANENT' AND embedding IS NOT NULL AND confidence >= 0.8`
  )
  const autonomyPct = totalPermanent > 0
    ? Math.round((Number(highConfidenceWithEmbedding[0].count) / totalPermanent) * 100)
    : 0

  return NextResponse.json({
    timestamp: new Date().toISOString(),

    // Rezumat global
    global: {
      totalPermanent,
      totalBuffer,
      totalArchived,
      embeddingCoverage: `${embeddingCoverage}%`,
      maturityPct,
      maturityLevel,
      autonomyPct: `${autonomyPct}%`,
      estimatedClaudeDependency: `${100 - autonomyPct}%`,
    },

    // Per card C1-C4 + categorii
    cards: Object.entries(cardStats)
      .sort((a, b) => b[1].entries - a[1].entries)
      .map(([card, stats]) => ({
        card,
        entries: stats.entries,
        agents: stats.agents,
        avgConfidence: stats.avgConfidence,
        coverage: `${stats.coverage}%`,
        bar: progressBar(stats.coverage),
      })),

    // Per tip cunoaștere
    byType: perType.map(t => ({ type: t.kbType, entries: Number(t.count) })),

    // Per sursă
    bySource: perSource.map(s => ({ source: s.source, entries: Number(s.count) })),

    // Top 5 agenți
    topAgents,

    // Creștere recentă
    growth: {
      last7days: {
        newPermanent: recentEntries,
        newBuffers: recentBuffers,
        dailyAvg: Math.round(recentEntries / 7),
      },
    },

    // Legendă
    legend: {
      C1: "Organizare internă (fișe post, evaluare, ierarhizare, psihometrie)",
      C2: "Conformitate (grilă salarială, pay gap, legislație, audit, DPO)",
      C3: "Competitivitate (KPI, benchmark, sociogramă, procese, business dev)",
      C4: "Dezvoltare (cultură, 3C, ROI, intervenții, neuro, evoluție)",
      MANAGEMENT: "Strategie, coordonare organism, portfolio, owner",
      MARKETING: "Marketing digital, SEO, email, social media, growth",
      CLIENT: "Interacțiune directă cu clientul (sales, success, support)",
      B2C: "Dezvoltare personală (călăuze, profiler, carieră)",
      PRODUCT: "Produs și dezvoltare (engineering, releases, DevExp)",
      QUALITY: "Testare, asigurare calitate, quality gates",
      INFRA: "Infrastructură, securitate, monitoring, incident response",
      DATA: "Date și analiză (intelligence, predictive, market data)",
      SYSTEM: "Procese interne sistem (cron, migrări, seeds)",
      maturityLevels: "EMBRIONAR → INCEPUT → INTERMEDIAR → AVANSAT → AUTONOM",
    },
  })
}

function progressBar(pct: number): string {
  const filled = Math.round(pct / 10)
  const empty = 10 - filled
  return "█".repeat(filled) + "░".repeat(empty) + ` ${pct}%`
}
