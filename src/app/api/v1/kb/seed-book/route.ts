/**
 * POST /api/v1/kb/seed-book
 *
 * Infuzează KB entries dintr-o sursă de carte (seed pre-definit).
 * Nu generează via Claude — entries sunt deja formulate.
 *
 * Body: { book: "rocco-creativitate-ei", dryRun?: boolean }
 * Response: { book, entriesCreated, byRole: Record<string, number> }
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import ROCCO_SEED_ENTRIES from "@/lib/kb/seeds/rocco-creativitate-ei"
import PSEC_SEED_ENTRIES from "@/lib/kb/seeds/psiho-socio-economist"
import SSED_SEED_ENTRIES from "@/lib/kb/seeds/specialist-stiinte-educatie"
import JDM_SEED_ENTRIES from "@/lib/kb/seeds/jurist-dreptul-muncii"
import AET_SEED_ENTRIES from "@/lib/kb/seeds/analist-economic-teritorial"
import SDO_SEED_ENTRIES from "@/lib/kb/seeds/specialist-dezvoltare-organizationala"

export const dynamic = "force-dynamic"

// Each seed file defines its own local KBSeedEntry — structurally identical but TS sees them as different types.
// Use a common shape to unify them.
interface SeedEntry {
  agentRole: string
  kbType: string
  content: string
  tags: string[]
  confidence: number
  source: string
}

const AVAILABLE_BOOKS: Record<string, SeedEntry[]> = {
  "rocco-creativitate-ei": ROCCO_SEED_ENTRIES as SeedEntry[],
  "psiho-socio-economist": PSEC_SEED_ENTRIES as SeedEntry[],
  "specialist-stiinte-educatie": SSED_SEED_ENTRIES as SeedEntry[],
  "jurist-dreptul-muncii": JDM_SEED_ENTRIES as SeedEntry[],
  "analist-economic-teritorial": AET_SEED_ENTRIES as SeedEntry[],
  "specialist-dezvoltare-organizationala": SDO_SEED_ENTRIES as SeedEntry[],
}

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const book = body.book as string
  const dryRun = body.dryRun === true

  if (!book || !AVAILABLE_BOOKS[book]) {
    return NextResponse.json({
      error: `Carte necunoscută. Disponibile: ${Object.keys(AVAILABLE_BOOKS).join(", ")}`,
    }, { status: 400 })
  }

  const entries = AVAILABLE_BOOKS[book]
  const byRole: Record<string, number> = {}
  let created = 0
  let skipped = 0

  for (const entry of entries) {
    byRole[entry.agentRole] = (byRole[entry.agentRole] || 0) + 1

    if (dryRun) {
      created++
      continue
    }

    // Verifică dacă nu există deja un entry identic (evitare duplicare)
    const existing = await prisma.kBEntry.findFirst({
      where: {
        agentRole: entry.agentRole,
        content: entry.content,
        status: "PERMANENT",
      },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.kBEntry.create({
      data: {
        agentRole: entry.agentRole,
        kbType: entry.kbType as any,
        content: entry.content,
        tags: entry.tags,
        confidence: entry.confidence,
        source: entry.source as any,
        status: "PERMANENT",
        usageCount: 0,
        validatedAt: new Date(),
      },
    })
    created++
  }

  return NextResponse.json({
    book,
    dryRun,
    totalEntries: entries.length,
    entriesCreated: created,
    entriesSkipped: skipped,
    byRole,
  })
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    availableBooks: Object.keys(AVAILABLE_BOOKS).map(key => ({
      key,
      entries: AVAILABLE_BOOKS[key].length,
      roles: [...new Set(AVAILABLE_BOOKS[key].map(e => e.agentRole))],
    })),
  })
}
