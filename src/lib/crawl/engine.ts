/**
 * engine.ts — Motor de crawling profesional
 *
 * Shared infrastructure — deservește TOATE businessurile:
 * - JobGrade: legislație, competitori, piață HR
 * - Motor Teritorial: date localități, firme, populație
 * - edu4life: educație, instituții, programe
 *
 * Crawlerul COLECTEAZĂ date brute. Claude ANALIZEAZĂ.
 * Separare strictă: volum (crawler) vs. calitate (Claude).
 */

import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CrawlAdapter {
  name: string
  crawl(config: any): Promise<CrawlOutput>
}

export interface CrawlOutput {
  territorialData: Array<{
    territory: string
    category: string
    subcategory?: string
    key: string
    value: string
    numericValue?: number
    unit?: string
    sourceUrl?: string
    periodYear?: number
    periodMonth?: number
    latitude?: number
    longitude?: number
    confidence?: number
  }>
  localEntities: Array<{
    territory: string
    type: string
    name: string
    description?: string
    category?: string
    subcategory?: string
    address?: string
    latitude?: number
    longitude?: number
    phone?: string
    email?: string
    website?: string
    employees?: number
    revenue?: number
    sourceId?: string
    metadata?: any
  }>
  metadata?: Record<string, any>
}

export interface CrawlReport {
  sourceId: string
  sourceName: string
  status: "SUCCESS" | "PARTIAL" | "FAILED"
  recordsFound: number
  recordsNew: number
  recordsUpdated: number
  durationMs: number
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// ENGINE — orchestrare crawling
// ═══════════════════════════════════════════════════════════════

/**
 * Rulează crawling pe o sursă specifică.
 */
export async function crawlSource(sourceName: string): Promise<CrawlReport> {
  const t0 = Date.now()

  const source = await prisma.crawlSource.findUnique({ where: { name: sourceName } })
  if (!source) throw new Error(`Sursă necunoscută: ${sourceName}`)
  if (!source.enabled) return { sourceId: source.id, sourceName, status: "FAILED", recordsFound: 0, recordsNew: 0, recordsUpdated: 0, durationMs: 0, error: "Sursă dezactivată" }

  try {
    // Încarcă adaptorul
    const adapter = await loadAdapter(sourceName)
    if (!adapter) throw new Error(`Adaptor lipsă: ${sourceName}`)

    // Execută crawl
    const output = await adapter.crawl(source.config || {})

    // Salvează datele teritoriale
    let recordsNew = 0
    let recordsUpdated = 0

    for (const td of output.territorialData) {
      const existing = await prisma.territorialData.findUnique({
        where: {
          territory_category_key_periodYear: {
            territory: td.territory,
            category: td.category,
            key: td.key,
            periodYear: td.periodYear || new Date().getFullYear(),
          },
        },
      })

      if (existing) {
        // Update doar dacă valoarea s-a schimbat
        if (existing.value !== td.value) {
          await prisma.territorialData.update({
            where: { id: existing.id },
            data: {
              value: td.value,
              numericValue: td.numericValue,
              source: sourceName,
              sourceUrl: td.sourceUrl,
              confidence: td.confidence || 1.0,
              updatedAt: new Date(),
            },
          })
          recordsUpdated++
        }
      } else {
        await prisma.territorialData.create({
          data: {
            territory: td.territory,
            category: td.category,
            subcategory: td.subcategory,
            key: td.key,
            value: td.value,
            numericValue: td.numericValue,
            unit: td.unit,
            source: sourceName,
            sourceUrl: td.sourceUrl,
            periodYear: td.periodYear || new Date().getFullYear(),
            periodMonth: td.periodMonth,
            latitude: td.latitude,
            longitude: td.longitude,
            confidence: td.confidence || 1.0,
          },
        })
        recordsNew++
      }
    }

    // Salvează entitățile locale
    for (const le of output.localEntities) {
      const existing = le.sourceId
        ? await prisma.localEntity.findUnique({
            where: {
              territory_type_sourceId: {
                territory: le.territory,
                type: le.type,
                sourceId: le.sourceId,
              },
            },
          })
        : null

      if (existing) {
        await prisma.localEntity.update({
          where: { id: existing.id },
          data: {
            name: le.name,
            description: le.description,
            category: le.category,
            address: le.address,
            latitude: le.latitude,
            longitude: le.longitude,
            employees: le.employees,
            revenue: le.revenue,
            metadata: le.metadata || undefined,
            updatedAt: new Date(),
          },
        })
        recordsUpdated++
      } else {
        await prisma.localEntity.create({
          data: {
            territory: le.territory,
            type: le.type,
            name: le.name,
            description: le.description,
            category: le.category,
            subcategory: le.subcategory,
            address: le.address,
            latitude: le.latitude,
            longitude: le.longitude,
            phone: le.phone,
            email: le.email,
            website: le.website,
            employees: le.employees,
            revenue: le.revenue,
            source: sourceName,
            sourceId: le.sourceId,
            metadata: le.metadata || undefined,
          },
        })
        recordsNew++
      }
    }

    const durationMs = Date.now() - t0
    const totalRecords = output.territorialData.length + output.localEntities.length

    // Salvează rezultatul crawl
    await prisma.crawlResult.create({
      data: {
        sourceId: source.id,
        status: "SUCCESS",
        recordsFound: totalRecords,
        recordsNew,
        recordsUpdated,
        durationMs,
        metadata: output.metadata || undefined,
      },
    })

    // Actualizează sursa
    await prisma.crawlSource.update({
      where: { id: source.id },
      data: {
        lastCrawlAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
        totalCrawls: { increment: 1 },
        totalRecords: { increment: recordsNew },
      },
    })

    return { sourceId: source.id, sourceName, status: "SUCCESS", recordsFound: totalRecords, recordsNew, recordsUpdated, durationMs }
  } catch (e: any) {
    const durationMs = Date.now() - t0

    await prisma.crawlResult.create({
      data: { sourceId: source.id, status: "FAILED", durationMs, error: e.message?.slice(0, 500) },
    })

    await prisma.crawlSource.update({
      where: { id: source.id },
      data: { lastCrawlAt: new Date(), lastError: e.message?.slice(0, 500), totalCrawls: { increment: 1 } },
    })

    return { sourceId: source.id, sourceName, status: "FAILED", recordsFound: 0, recordsNew: 0, recordsUpdated: 0, durationMs, error: e.message }
  }
}

/**
 * Rulează crawling pe TOATE sursele active care sunt due (conform schedule).
 */
export async function crawlAllDue(): Promise<CrawlReport[]> {
  const sources = await prisma.crawlSource.findMany({ where: { enabled: true } })
  const reports: CrawlReport[] = []

  for (const source of sources) {
    // Verifică dacă e timpul (simplu: lastCrawlAt + interval > now)
    const isDue = !source.lastCrawlAt || isScheduleDue(source.schedule, source.lastCrawlAt)
    if (!isDue) continue

    const report = await crawlSource(source.name)
    reports.push(report)

    console.log(`[CRAWL] ${source.name}: ${report.status} — ${report.recordsNew} new, ${report.recordsUpdated} updated (${report.durationMs}ms)`)
  }

  return reports
}

/**
 * Verificare simplă dacă un cron schedule e due.
 * Format: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY"
 */
function isScheduleDue(schedule: string, lastRun: Date): boolean {
  const elapsed = Date.now() - lastRun.getTime()
  switch (schedule.toUpperCase()) {
    case "HOURLY": return elapsed > 3600000
    case "DAILY": return elapsed > 86400000
    case "WEEKLY": return elapsed > 604800000
    case "MONTHLY": return elapsed > 2592000000
    default: return elapsed > 86400000 // default daily
  }
}

/**
 * Încarcă adaptorul per sursă (lazy import).
 */
async function loadAdapter(name: string): Promise<CrawlAdapter | null> {
  try {
    switch (name) {
      case "INS_TEMPO": return (await import("./adapters/ins-tempo")).default
      case "TOPFIRME": return (await import("./adapters/topfirme")).default
      case "PRIMARIE_MEDGIDIA": return (await import("./adapters/primarie-medgidia")).default
      case "AJOFM_CONSTANTA": return (await import("./adapters/ajofm")).default
      case "OSM_OVERPASS": return (await import("./adapters/osm-overpass")).default
      default: return null
    }
  } catch {
    return null
  }
}
