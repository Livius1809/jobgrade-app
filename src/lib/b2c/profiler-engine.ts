/**
 * B2C Profiler Engine — Nucleul inteligenței B2C
 *
 * Echivalentul Company Profiler-ului, dar pentru individ.
 * Nu ce declară persoana, ci ce face — agregat din toate interacțiunile.
 *
 * Un singur apel: getUserProfile(userId) → tot ce trebuie.
 *
 * Alimentează:
 * - Călăuza (Card 1) — cine ești
 * - Consilier Dezvoltare (Card 2) — cum te raportezi la alții
 * - Consilier Carieră (Card 3) — unde te situezi profesional
 * - Coach (Card 4) — succes vs. valoare
 * - Mentor Antreprenorial (Card 5) — potențial antreprenorial
 * - Profiler Shadow — observator invizibil pe toate cardurile
 *
 * Pattern identic cu Company Profiler:
 *   getCompanyProfile(tenantId)  → B2B
 *   getUserProfile(userId)       → B2C
 */

import { prisma } from "@/lib/prisma"

// ── Tipuri ───────────────────────────────────────────────────

export interface UserProfile {
  userId: string
  alias: string

  // Identitate
  identity: {
    age: number | null
    gender: string | null
    lastJobTitle: string | null
    hasCurrentJob: boolean | null
    locale: string
  }

  // Herrmann HBDI (cadrane cognitive)
  herrmann: {
    A: number | null  // Analitic
    B: number | null  // Secvențial
    C: number | null  // Interpersonal
    D: number | null  // Imaginativ
    dominant: string | null
    profile: string | null // ex: "AB" (analitic-secvențial)
  }

  // Hawkins (nivel conștiință)
  hawkins: {
    estimate: number | null
    confidence: number | null
    level: string | null // "sub-200" | "200-350" | "350-500" | "500+"
  }

  // VIA Character Strengths
  via: {
    signature: string[]
    undeveloped: string[]
  }

  // Maturitate (echivalent MaturityLevel B2B)
  maturity: {
    level: UserMaturityLevel
    score: number  // 0-100
    spiralLevel: number
    dataPoints: UserDataPoints
    nextSteps: string[]
  }

  // Carduri
  cards: CardStatus[]

  // Evoluție (echivalent EvolutionTrajectory B2B)
  evolution: {
    totalEntries: number
    recentEntries: Array<{
      title: string
      card: string
      type: string
      phase: string
      createdAt: string
    }>
    trend: "ASCENDING" | "PLATEAU" | "DESCENDING" | "JUST_STARTED"
  }

  // Profesional (din Card 3)
  professional: {
    hasCV: boolean
    cvExtracted: Record<string, unknown> | null
    criteriaEstimate: Record<string, string> | null
    matchesAvailable: number
  }

  // Context pentru agenți (ce trebuie să știe fără să arate)
  agentContext: string
}

export type UserMaturityLevel = "NEWCOMER" | "EXPLORING" | "GROWING" | "EVOLVING" | "INTEGRATED"

export interface UserDataPoints {
  hasProfile: boolean
  hasHermann: boolean
  hasHawkins: boolean
  hasVIA: boolean
  hasCV: boolean
  cardsActive: number
  cardsCompleted: number
  evolutionEntries: number
  sessionsCount: number
  journalEntries: number
}

export interface CardStatus {
  card: string
  title: string
  status: string
  phase: string
  stage: number
  communityReady: boolean
  hasCV?: boolean
}

// ── Cache ────────────────────────────────────────────────────

const profileCache = new Map<string, { profile: UserProfile; at: number }>()
const CACHE_TTL = 60_000

// ── Engine ───────────────────────────────────────────────────

export async function getUserProfile(userId: string, forceRefresh = false): Promise<UserProfile> {
  if (!forceRefresh) {
    const cached = profileCache.get(userId)
    if (cached && Date.now() - cached.at < CACHE_TTL) return cached.profile
  }

  const [user, profile, cards, evolutionEntries, sessions, journal] = await Promise.all([
    prisma.b2CUser.findUnique({
      where: { id: userId },
      select: {
        id: true, alias: true, age: true, gender: true,
        lastJobTitle: true, hasCurrentJob: true, locale: true,
      },
    }),
    prisma.b2CProfile.findUnique({
      where: { userId },
    }),
    prisma.b2CCardProgress.findMany({
      where: { userId },
      orderBy: { card: "asc" },
    }),
    prisma.b2CEvolutionEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.b2CSession.count({ where: { userId } }),
    prisma.b2CJournalEntry.count({ where: { userId } }).catch(() => 0),
  ])

  if (!user) throw new Error(`B2C user ${userId} nu există`)

  // Herrmann
  const herrmannA = profile?.herrmannA ?? null
  const herrmannB = profile?.herrmannB ?? null
  const herrmannC = profile?.herrmannC ?? null
  const herrmannD = profile?.herrmannD ?? null

  let herrmannDominant: string | null = null
  let herrmannProfile: string | null = null
  if (herrmannA !== null && herrmannB !== null && herrmannC !== null && herrmannD !== null) {
    const scores = { A: herrmannA, B: herrmannB, C: herrmannC, D: herrmannD }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
    herrmannDominant = sorted[0][0]
    herrmannProfile = sorted.filter(([, v]) => v >= 60).map(([k]) => k).join("") || sorted[0][0]
  }

  // Hawkins
  let hawkinsLevel: string | null = null
  if (profile?.hawkinsEstimate) {
    const h = profile.hawkinsEstimate
    hawkinsLevel = h < 200 ? "sub-200" : h < 350 ? "200-350" : h < 500 ? "350-500" : "500+"
  }

  // Data points
  const card3 = cards.find(c => c.card === "CARD_3")
  const dataPoints: UserDataPoints = {
    hasProfile: !!profile,
    hasHermann: herrmannA !== null,
    hasHawkins: profile?.hawkinsEstimate !== null && profile?.hawkinsEstimate !== undefined,
    hasVIA: (profile?.viaSignature?.length || 0) > 0,
    hasCV: !!card3?.cvFileUrl,
    cardsActive: cards.filter(c => c.status === "ACTIVE").length,
    cardsCompleted: cards.filter(c => c.status === "COMPLETED").length,
    evolutionEntries: evolutionEntries.length,
    sessionsCount: sessions,
    journalEntries: journal,
  }

  // Maturity
  const maturityScore = calculateMaturityScore(dataPoints)
  const maturityLevel = maturityScore >= 80 ? "INTEGRATED"
    : maturityScore >= 60 ? "EVOLVING"
    : maturityScore >= 40 ? "GROWING"
    : maturityScore >= 20 ? "EXPLORING"
    : "NEWCOMER"

  // Evolution trend
  let trend: UserProfile["evolution"]["trend"] = "JUST_STARTED"
  if (evolutionEntries.length >= 5) {
    const recentCount = evolutionEntries.filter(e =>
      new Date(e.createdAt).getTime() > Date.now() - 7 * 86400000
    ).length
    const olderCount = evolutionEntries.filter(e => {
      const t = new Date(e.createdAt).getTime()
      return t > Date.now() - 14 * 86400000 && t <= Date.now() - 7 * 86400000
    }).length

    trend = recentCount > olderCount ? "ASCENDING"
      : recentCount < olderCount ? "DESCENDING"
      : "PLATEAU"
  }

  // Professional
  const cvExtracted = card3?.cvExtractedData as Record<string, unknown> | null
  const criteriaEstimate = cvExtracted?.criteriaEstimate as Record<string, string> | null

  // Posturi disponibile pentru matching
  const matchesAvailable = await prisma.job.count({
    where: { isActive: true, status: "ACTIVE" },
  })

  // Next steps
  const nextSteps: string[] = []
  if (!dataPoints.hasProfile) nextSteps.push("Completează profilul de bază")
  if (!dataPoints.hasCV) nextSteps.push("Încarcă CV-ul în Card 3")
  if (dataPoints.cardsActive < 2) nextSteps.push("Activează un card nou")
  if (dataPoints.evolutionEntries < 3) nextSteps.push("Continuă dialogul cu călăuza")
  if (!dataPoints.hasHermann) nextSteps.push("Completează chestionarul cognitiv")

  // Agent context (invizibil)
  const agentContext = buildAgentContext(user, profile, cards, evolutionEntries, dataPoints)

  const result: UserProfile = {
    userId,
    alias: user.alias,
    identity: {
      age: user.age, gender: user.gender,
      lastJobTitle: user.lastJobTitle, hasCurrentJob: user.hasCurrentJob,
      locale: user.locale,
    },
    herrmann: {
      A: herrmannA, B: herrmannB, C: herrmannC, D: herrmannD,
      dominant: herrmannDominant, profile: herrmannProfile,
    },
    hawkins: {
      estimate: profile?.hawkinsEstimate ?? null,
      confidence: profile?.hawkinsConfidence ?? null,
      level: hawkinsLevel,
    },
    via: {
      signature: profile?.viaSignature || [],
      undeveloped: profile?.viaUndeveloped || [],
    },
    maturity: {
      level: maturityLevel, score: maturityScore,
      spiralLevel: profile?.spiralLevel || 1,
      dataPoints, nextSteps,
    },
    cards: cards.map(c => ({
      card: c.card,
      title: CARD_TITLES[c.card] || c.card,
      status: c.status, phase: c.phase, stage: c.stage,
      communityReady: c.communityReady,
      hasCV: c.card === "CARD_3" ? !!c.cvFileUrl : undefined,
    })),
    evolution: {
      totalEntries: evolutionEntries.length,
      recentEntries: evolutionEntries.slice(0, 5).map(e => ({
        title: e.title, card: e.card, type: e.type,
        phase: e.phase, createdAt: e.createdAt.toISOString(),
      })),
      trend,
    },
    professional: {
      hasCV: !!card3?.cvFileUrl,
      cvExtracted: cvExtracted,
      criteriaEstimate,
      matchesAvailable,
    },
    agentContext,
  }

  profileCache.set(userId, { profile: result, at: Date.now() })
  return result
}

// ── Maturity score ───────────────────────────────────────────

function calculateMaturityScore(dp: UserDataPoints): number {
  let score = 0
  if (dp.hasProfile) score += 10
  if (dp.hasHermann) score += 15
  if (dp.hasHawkins) score += 10
  if (dp.hasVIA) score += 10
  if (dp.hasCV) score += 15
  score += Math.min(15, dp.cardsActive * 3)
  score += Math.min(10, dp.cardsCompleted * 5)
  score += Math.min(10, dp.evolutionEntries * 1)
  score += Math.min(5, dp.sessionsCount * 1)
  return Math.min(100, score)
}

// ── Agent context (invizibil — nu se arată clientului) ───────

function buildAgentContext(
  user: any, profile: any, cards: any[], evolution: any[], dp: UserDataPoints,
): string {
  const parts: string[] = []

  parts.push(`Alias: ${user.alias}`)
  if (user.age) parts.push(`Vârstă: ${user.age}`)
  if (user.lastJobTitle) parts.push(`Ultimul rol: ${user.lastJobTitle}`)
  if (user.hasCurrentJob !== null) parts.push(`Job curent: ${user.hasCurrentJob ? "da" : "nu"}`)

  if (profile?.herrmannA !== null) {
    parts.push(`Herrmann: A=${profile.herrmannA} B=${profile.herrmannB} C=${profile.herrmannC} D=${profile.herrmannD}`)
  }
  if (profile?.hawkinsEstimate) parts.push(`Hawkins estimat: ${profile.hawkinsEstimate}`)
  if (profile?.viaSignature?.length > 0) parts.push(`VIA top: ${profile.viaSignature.join(", ")}`)

  const activeCards = cards.filter((c: any) => c.status === "ACTIVE").map((c: any) => c.card)
  parts.push(`Carduri active: ${activeCards.join(", ") || "niciuna"}`)
  parts.push(`Evoluții: ${evolution.length} momente înregistrate`)
  parts.push(`Maturitate: ${dp.hasCV ? "are CV" : "fără CV"}, ${dp.cardsActive} carduri active`)

  return parts.join("\n")
}

// ── Card titles ──────────────────────────────────────────────

const CARD_TITLES: Record<string, string> = {
  CARD_1: "Drumul către mine",
  CARD_2: "Eu și ceilalți",
  CARD_3: "Îmi asum un rol profesional",
  CARD_4: "Oameni de succes / Oameni de valoare",
  CARD_5: "Antreprenoriat transformațional",
  CARD_6: "Profiler",
}
