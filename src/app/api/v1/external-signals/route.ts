import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { ExternalSignalCategory } from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * /api/v1/external-signals
 *
 * Ochi spre mediul extern — ingerează și citește semnale brute din surse
 * externe. Acest strat e DOAR ingestie + normalizare. Interpretarea strategică
 * (teme, severity, direction) vine ulterior prin Increment #3 — Observator
 * Strategic (COSO), care marchează `processedAt` + populează `themes`.
 *
 * Livrat: 05.04.2026, Increment #1 din roadmap-ul "Living Organization".
 *
 * POST — ingestie idempotentă. Dedup prin `fingerprint`:
 *   fingerprint = sha1(source + "|" + sourceUrl) by default, sau custom dacă
 *   apelantul îl furnizează. Rulări repetate = zero duplicate.
 *
 * GET — listare cu filtre pentru COSO și cockpit:
 *   ?category=MARKET_HR
 *   ?processed=false           (doar semnale neinterpretate încă)
 *   ?sinceHours=24             (ultimele N ore)
 *   ?source=wall-street.ro
 *   ?limit=100                 (default 100, max 500)
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// ── POST ─────────────────────────────────────────────────────────────────────

const postSchema = z.object({
  source: z.string().min(1).max(200),
  sourceUrl: z.string().url().max(2000),
  category: z.enum([
    "MARKET_HR",
    "LEGAL_REG",
    "TECH_AI",
    "CULTURAL_SOCIAL",
    "COMPETITOR",
    "MACRO_ECONOMIC",
  ]),
  title: z.string().min(1).max(1000),
  rawContent: z.string().min(1).max(50000),
  publishedAt: z.string().datetime().optional(),
  fingerprint: z.string().min(1).max(200).optional(),
})

/**
 * Normalizează un URL pentru fingerprint robust:
 *  - elimină tracking params (utm_*, fbclid, gclid, ref, mc_cid, mc_eid)
 *  - elimină fragment (#...)
 *  - elimină trailing slash
 *  - lowercase pe host
 * Scop: aceeași pagină distribuită prin canale diferite (newsletter cu UTM,
 * share pe social cu fbclid, link direct) să producă un fingerprint unic.
 */
const TRACKING_PARAM_PREFIXES = ["utm_"]
const TRACKING_PARAMS_EXACT = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "ref",
  "ref_src",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
])

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    u.hash = ""
    u.host = u.host.toLowerCase()
    const keys = Array.from(u.searchParams.keys())
    for (const k of keys) {
      const kl = k.toLowerCase()
      if (TRACKING_PARAMS_EXACT.has(kl)) {
        u.searchParams.delete(k)
        continue
      }
      if (TRACKING_PARAM_PREFIXES.some((p) => kl.startsWith(p))) {
        u.searchParams.delete(k)
      }
    }
    let s = u.toString()
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1)
    return s
  } catch {
    return raw
  }
}

function computeFingerprint(source: string, sourceUrl: string): string {
  const normalized = normalizeUrl(sourceUrl)
  return createHash("sha1").update(`${source}|${normalized}`).digest("hex")
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const input = parsed.data
  const fingerprint =
    input.fingerprint ?? computeFingerprint(input.source, input.sourceUrl)

  // Upsert idempotent pe fingerprint.
  const signal = await prisma.externalSignal.upsert({
    where: { fingerprint },
    create: {
      source: input.source,
      sourceUrl: input.sourceUrl,
      category: input.category as ExternalSignalCategory,
      title: input.title,
      rawContent: input.rawContent,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      fingerprint,
    },
    update: {
      // La re-ingestie actualizăm doar metadate care se pot schimba în sursă.
      title: input.title,
      rawContent: input.rawContent,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      updatedAt: new Date(),
    },
  })

  // Distinge create vs update folosind createdAt vs updatedAt.
  const deduplicated =
    signal.createdAt.getTime() !== signal.updatedAt.getTime()

  return NextResponse.json({ signal, deduplicated })
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const category = url.searchParams.get("category")
  const processed = url.searchParams.get("processed")
  const sinceHours = url.searchParams.get("sinceHours")
  const source = url.searchParams.get("source")
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 1),
    500,
  )

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (source) where.source = source
  if (processed === "false") where.processedAt = null
  if (processed === "true") where.processedAt = { not: null }
  if (sinceHours) {
    const hours = parseInt(sinceHours, 10)
    if (Number.isFinite(hours) && hours > 0) {
      where.capturedAt = { gte: new Date(Date.now() - hours * 60 * 60 * 1000) }
    }
  }

  const [signals, total] = await Promise.all([
    prisma.externalSignal.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      take: limit,
    }),
    prisma.externalSignal.count({ where }),
  ])

  return NextResponse.json({
    total,
    returned: signals.length,
    signals,
  })
}
