/**
 * Company Profiler — Portabilitate GDPR
 *
 * Art. 20 (Portabilitate): La ștergere cont, clientul primește
 * tot ce a rulat — rapoarte, jurnal, KB — criptat, reimportabil.
 *
 * Art. 15 (Acces): Clientul vede ce știm despre FIRMĂ,
 * NU despre persoanele care au interacționat cu platforma.
 *
 * Art. 17 (Ștergere): KB client + profil + jurnal.
 * Pachetul descărcat rămâne la client.
 *
 * Principiu: Fără memorie, o ia de la zero.
 * Cu pachet criptat, reia de unde a rămas.
 */

import { prisma } from "@/lib/prisma"
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto"

// ── Tipuri ──────────────────────────────────────────────────────────

interface PortabilityPackage {
  version: "1.0"
  exportedAt: string
  tenantId: string
  /** Date firmă (Art. 15 — ce oferim la cerere acces) */
  company: CompanyData
  /** Rapoarte generate */
  reports: ReportData[]
  /** KB client complet */
  knowledgeBase: KBData[]
  /** Jurnal activități */
  journal: JournalEntry[]
  /** Profiler state — maturitate, coerență, evoluție */
  profilerState: ProfilerState
  /** MVV complet */
  mvv: MVVData
}

interface CompanyData {
  name: string | null
  cui: string | null
  caenCode: string | null
  caenName: string | null
  industry: string | null
  description: string | null
  mission: string | null
  vision: string | null
  values: string[]
}

interface ReportData {
  type: string
  sourceId: string
  generatedAt: string
  content: string // JSON stringified
}

interface KBData {
  agentRole: string
  content: string
  tags: string[]
  confidence: number
}

interface JournalEntry {
  date: string
  type: string
  description: string
  credits: number
}

interface ProfilerState {
  maturity: string
  maturityScore: number
  coherenceScore: number
  snapshots: Array<{
    level: string
    score: number
    coherenceScore: number
    takenAt: string
  }>
}

interface MVVData {
  mission: string | null
  missionDraft: string | null
  vision: string | null
  visionDraft: string | null
  values: string[]
  valuesDraft: string[]
  maturity: string
  validatedAt: string | null
}

// ── Encryption ──────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm"

function deriveKey(tenantId: string, secret: string): Buffer {
  return createHash("sha256").update(`${tenantId}:${secret}`).digest()
}

/**
 * Criptează pachetul cu o cheie derivată din tenantId + secret
 */
export function encryptPackage(data: PortabilityPackage, tenantId: string, secret: string): {
  encrypted: string
  iv: string
  authTag: string
} {
  const key = deriveKey(tenantId, secret)
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const json = JSON.stringify(data)
  let encrypted = cipher.update(json, "utf8", "base64")
  encrypted += cipher.final("base64")

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  }
}

/**
 * Decriptează pachetul
 */
export function decryptPackage(
  encrypted: string,
  iv: string,
  authTag: string,
  tenantId: string,
  secret: string,
): PortabilityPackage {
  const key = deriveKey(tenantId, secret)
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(authTag, "base64"))

  let decrypted = decipher.update(encrypted, "base64", "utf8")
  decrypted += decipher.final("utf8")

  return JSON.parse(decrypted) as PortabilityPackage
}

// ── Export ───────────────────────────────────────────────────────────

/**
 * Construiește pachetul complet de portabilitate.
 * EXCLUDE: date persoane (evaluatori, admin, owner).
 * INCLUDE: date firmă, rapoarte, KB, jurnal, stare profiler.
 */
export async function buildPortabilityPackage(tenantId: string): Promise<PortabilityPackage> {
  const [profile, reports, kbEntries, transactions, snapshots] = await Promise.all([
    // Profil companie (fără date persoane)
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        mission: true, vision: true, values: true, description: true,
        industry: true, cui: true, caenCode: true, caenName: true,
        missionDraft: true, visionDraft: true, valuesDraft: true,
        mvvMaturity: true, mvvValidatedAt: true,
        mvvCoherenceScore: true,
        tenant: { select: { name: true } },
      },
    }),

    // Rapoarte generate (conținut, nu cine le-a generat)
    prisma.aiGeneration.findMany({
      where: { tenantId },
      select: { type: true, sourceId: true, output: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }).catch(() => []),

    // KB client (fără atribuire persoane)
    prisma.kBEntry.findMany({
      where: {
        // KB-uri legate de tenant (via client memory sau procese)
        OR: [
          { tags: { has: tenantId } },
          { agentRole: { in: ["SOA", "HR_COUNSELOR", "CSSA", "CSA", "DOA", "MEDIATOR"] } },
        ],
        status: "PERMANENT",
      },
      select: { agentRole: true, content: true, tags: true, confidence: true },
      take: 500,
    }).catch(() => []),

    // Tranzacții credite (jurnal)
    prisma.creditTransaction.findMany({
      where: { tenantId },
      select: { type: true, amount: true, description: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }).catch(() => []),

    // Snapshots evoluție
    prisma.companyProfileSnapshot.findMany({
      where: { tenantId },
      orderBy: { takenAt: "asc" },
      select: { maturityLevel: true, maturityScore: true, coherenceScore: true, takenAt: true },
    }).catch(() => []),
  ])

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    tenantId,
    company: {
      name: profile?.tenant?.name || null,
      cui: profile?.cui || null,
      caenCode: profile?.caenCode || null,
      caenName: profile?.caenName || null,
      industry: profile?.industry || null,
      description: profile?.description || null,
      mission: profile?.mission || null,
      vision: profile?.vision || null,
      values: (profile?.values || []) as string[],
    },
    reports: (reports as any[]).map(r => ({
      type: r.type,
      sourceId: r.sourceId || "",
      generatedAt: r.createdAt.toISOString(),
      content: r.output,
    })),
    knowledgeBase: (kbEntries as any[]).map(e => ({
      agentRole: e.agentRole,
      content: e.content,
      tags: e.tags,
      confidence: e.confidence,
    })),
    journal: (transactions as any[]).map(t => ({
      date: t.createdAt.toISOString(),
      type: t.type,
      description: t.description,
      credits: Math.abs(t.amount),
    })),
    profilerState: {
      maturity: (profile as any)?.mvvMaturity || "IMPLICIT",
      maturityScore: 0, // din ultimul snapshot
      coherenceScore: (profile as any)?.mvvCoherenceScore || 0,
      snapshots: (snapshots as any[]).map(s => ({
        level: s.maturityLevel,
        score: s.maturityScore,
        coherenceScore: s.coherenceScore,
        takenAt: s.takenAt.toISOString(),
      })),
    },
    mvv: {
      mission: profile?.mission || null,
      missionDraft: profile?.missionDraft || null,
      vision: profile?.vision || null,
      visionDraft: profile?.visionDraft || null,
      values: (profile?.values || []) as string[],
      valuesDraft: (profile?.valuesDraft || []) as string[],
      maturity: (profile as any)?.mvvMaturity || "IMPLICIT",
      validatedAt: (profile as any)?.mvvValidatedAt?.toISOString() || null,
    },
  }
}

// ── Import (reactivare) ─────────────────────────────────────────────

/**
 * Reîncarcă un pachet de portabilitate într-un tenant (nou sau existent).
 * Restaurează: profil companie, MVV, KB, stare profiler.
 * NU restaurează: rapoarte (sunt arhivă), persoane, credite.
 */
export async function importPortabilityPackage(
  tenantId: string,
  pkg: PortabilityPackage,
): Promise<{ restored: string[] }> {
  const restored: string[] = []

  // 1. Restaurare profil companie
  await prisma.companyProfile.upsert({
    where: { tenantId },
    update: {
      mission: pkg.mvv.mission,
      vision: pkg.mvv.vision,
      values: pkg.mvv.values,
      description: pkg.company.description,
      industry: pkg.company.industry,
      cui: pkg.company.cui,
      caenCode: pkg.company.caenCode,
      caenName: pkg.company.caenName,
      missionDraft: pkg.mvv.missionDraft,
      visionDraft: pkg.mvv.visionDraft,
      valuesDraft: pkg.mvv.valuesDraft,
      mvvMaturity: pkg.mvv.maturity,
    },
    create: {
      tenantId,
      mission: pkg.mvv.mission,
      vision: pkg.mvv.vision,
      values: pkg.mvv.values,
      description: pkg.company.description,
      industry: pkg.company.industry,
      cui: pkg.company.cui,
      caenCode: pkg.company.caenCode,
      caenName: pkg.company.caenName,
      missionDraft: pkg.mvv.missionDraft,
      visionDraft: pkg.mvv.visionDraft,
      valuesDraft: pkg.mvv.valuesDraft,
      mvvMaturity: pkg.mvv.maturity,
    },
  })
  restored.push("Profil companie + MVV")

  // 2. Restaurare KB (dacă nu există deja)
  if (pkg.knowledgeBase.length > 0) {
    let kbCount = 0
    for (const entry of pkg.knowledgeBase) {
      try {
        await prisma.kBEntry.create({
          data: {
            agentRole: entry.agentRole,
            content: entry.content,
            kbType: "PERMANENT",
            tags: [...entry.tags, "imported", tenantId],
            confidence: entry.confidence,
            status: "PERMANENT",
            source: "EXPERT_HUMAN", // imported from portability package
          },
        })
        kbCount++
      } catch {
        // Duplicate sau eroare — skip
      }
    }
    if (kbCount > 0) restored.push(`${kbCount} KB entries`)
  }

  // 3. Restaurare snapshots evoluție
  if (pkg.profilerState.snapshots.length > 0) {
    let snapCount = 0
    for (const snap of pkg.profilerState.snapshots) {
      try {
        await prisma.companyProfileSnapshot.create({
          data: {
            tenantId,
            maturityLevel: snap.level,
            maturityScore: snap.score,
            coherenceScore: snap.coherenceScore,
            dataPoints: {},
            takenAt: new Date(snap.takenAt),
          },
        })
        snapCount++
      } catch {}
    }
    if (snapCount > 0) restored.push(`${snapCount} snapshots evoluție`)
  }

  // 4. Tracking per CUI — câte reveniri, când, ce a restaurat
  if (pkg.company.cui) {
    await trackCUIReturn(pkg.company.cui, tenantId, pkg.exportedAt, restored)
  }

  // 5. Jurnal import (log că s-a făcut import)
  await prisma.creditTransaction.create({
    data: {
      tenantId,
      type: "USAGE",
      amount: 0,
      description: `[PORTABILITY_IMPORT] Pachet importat din ${pkg.exportedAt}. Restaurat: ${restored.join(", ")}`,
    },
  }).catch(() => {})
  restored.push("Jurnal import logat")

  // 6. Invalidare cache profiler
  const { invalidateProfileCache } = await import("./engine")
  invalidateProfileCache(tenantId)

  return { restored }
}

/**
 * Tracking CUI la prima apariție sau la actualizare profil.
 * Detectează dacă CUI-ul a mai fost folosit de alt tenant.
 */
export async function trackCUIPresence(cui: string, tenantId: string): Promise<void> {
  try {
    const others = await prisma.companyProfile.findMany({
      where: { cui, tenantId: { not: tenantId } },
      select: { tenantId: true, createdAt: true },
    })

    if (others.length > 0) {
      // CUI-ul a mai fost văzut — altă firmă cu același CUI (revenire sau duplicat)
      await prisma.kBEntry.create({
        data: {
          agentRole: "COG",
          kbType: "PERMANENT",
          content: [
            `[CUI_SEEN] CUI ${cui} asociat la tenant ${tenantId}, dar a mai fost văzut la: ${others.map(o => o.tenantId).join(", ")}.`,
            `Posibilă revenire (fără import pachet) sau cont duplicat.`,
            `Total conturi cu acest CUI: ${others.length + 1}`,
          ].join("\n"),
          tags: ["cui-tracking", "retenție", cui],
          confidence: 1,
          status: "PERMANENT",
          source: "DISTILLED_INTERACTION",
        },
      }).catch(() => {})
    }
  } catch {}
}

/**
 * Tracking per CUI — comportament firmă la nivel de identitate fiscală.
 * CUI-ul e identitatea reală, nu contul.
 * Dacă revine cu alt cont dar același CUI, știm cine e.
 * Ajută la: adaptare pachete, înțelegere comportament, retenție.
 */
async function trackCUIReturn(
  cui: string,
  tenantId: string,
  originalExportDate: string,
  restoredItems: string[],
): Promise<void> {
  try {
    // Verificăm dacă CUI-ul a mai fost văzut
    const existing = await prisma.companyProfile.findMany({
      where: { cui },
      select: { tenantId: true, createdAt: true },
    })

    const returnCount = existing.length // câte conturi au folosit acest CUI

    // Salvăm în KB intern (neaccesibil clientului)
    await prisma.kBEntry.create({
      data: {
        agentRole: "COG",
        kbType: "PERMANENT",
        content: [
          `[CUI_RETURN] CUI ${cui} a revenit (revenire #${returnCount}).`,
          `Tenant nou: ${tenantId}`,
          `Export original: ${originalExportDate}`,
          `Restaurat: ${restoredItems.join(", ")}`,
          `Conturi asociate: ${existing.map(e => e.tenantId).join(", ")}`,
        ].join("\n"),
        tags: ["cui-tracking", "portability", "retenție", cui],
        confidence: 1,
        status: "PERMANENT",
        source: "DISTILLED_INTERACTION",
      },
    }).catch(() => {})
  } catch {}
}

// ── Art. 15: Acces date ─────────────────────────────────────────────

/**
 * Returnează CE ȘTIM DESPRE FIRMĂ (Art. 15 GDPR).
 * EXCLUDE: date despre persoane (evaluatori, admin, owner, angajați).
 * Clientul vede doar date organizaționale.
 */
export async function getCompanyDataForAccess(tenantId: string): Promise<{
  company: CompanyData
  mvv: MVVData
  maturity: { level: string; score: number; coherenceScore: number }
  services: string[]
  reportsCount: number
  kbEntriesCount: number
  journalEntriesCount: number
}> {
  const [profile, reportsCount, kbCount, journalCount] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        mission: true, vision: true, values: true, description: true,
        industry: true, cui: true, caenCode: true, caenName: true,
        missionDraft: true, visionDraft: true, valuesDraft: true,
        mvvMaturity: true, mvvValidatedAt: true, mvvCoherenceScore: true,
        tenant: { select: { name: true } },
      },
    }),
    prisma.aiGeneration.count({ where: { tenantId } }).catch(() => 0),
    prisma.kBEntry.count({ where: { tags: { has: tenantId } } }).catch(() => 0),
    prisma.creditTransaction.count({ where: { tenantId } }).catch(() => 0),
  ])

  const { computeMaturityState } = await import("./maturity")
  const { getCompanyProfile } = await import("./engine")
  const fullProfile = await getCompanyProfile(tenantId).catch(() => null)

  return {
    company: {
      name: profile?.tenant?.name || null,
      cui: profile?.cui || null,
      caenCode: profile?.caenCode || null,
      caenName: profile?.caenName || null,
      industry: profile?.industry || null,
      description: profile?.description || null,
      mission: profile?.mission || null,
      vision: profile?.vision || null,
      values: (profile?.values || []) as string[],
    },
    mvv: {
      mission: profile?.mission || null,
      missionDraft: profile?.missionDraft || null,
      vision: profile?.vision || null,
      visionDraft: profile?.visionDraft || null,
      values: (profile?.values || []) as string[],
      valuesDraft: (profile?.valuesDraft || []) as string[],
      maturity: (profile as any)?.mvvMaturity || "IMPLICIT",
      validatedAt: (profile as any)?.mvvValidatedAt?.toISOString() || null,
    },
    maturity: {
      level: fullProfile?.mvv.maturity || "IMPLICIT",
      score: fullProfile?.maturityState.score || 0,
      coherenceScore: fullProfile?.coherence.overallScore || 0,
    },
    services: fullProfile?.maturityState.unlockedServices.filter(s => s.ready).map(s => s.service) || [],
    reportsCount,
    kbEntriesCount: kbCount,
    journalEntriesCount: journalCount,
  }
}
