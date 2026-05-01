import { prisma } from "../src/lib/prisma"

async function main() {
  // Seed sursele dacă nu există
  const sources = [
    { name: "INS_TEMPO", displayName: "INS TEMPO Online", url: "http://statistici.insse.ro:8077/tempo-online/", type: "API", schedule: "MONTHLY", territory: "MEDGIDIA" },
    { name: "TOPFIRME", displayName: "TopFirme", url: "https://www.topfirme.com/judet/constanta/localitate/medgidia/", type: "HTML_SCRAPER", schedule: "WEEKLY", territory: "MEDGIDIA" },
    { name: "PRIMARIE_MEDGIDIA", displayName: "Primaria Medgidia", url: "https://primaria-medgidia.ro/", type: "HTML_SCRAPER", schedule: "DAILY", territory: "MEDGIDIA" },
    { name: "AJOFM_CONSTANTA", displayName: "AJOFM Constanta", url: "http://www.constanta.anofm.ro/", type: "HTML_SCRAPER", schedule: "DAILY", territory: "MEDGIDIA" },
    { name: "OSM_OVERPASS", displayName: "OpenStreetMap POI", url: "https://overpass-api.de/api/interpreter", type: "API", schedule: "WEEKLY", territory: "MEDGIDIA" },
  ]

  for (const src of sources) {
    await prisma.crawlSource.upsert({ where: { name: src.name }, update: src, create: src })
    console.log("✓", src.name)
  }

  const count = await prisma.crawlSource.count()
  console.log(`\n${count} surse configurate`)

  // Rulăm primul crawl
  const { crawlAllDue } = await import("../src/lib/crawl/engine")
  console.log("\nRulare crawl...\n")
  const reports = await crawlAllDue()

  for (const r of reports) {
    console.log(`[${r.status}] ${r.sourceName}: ${r.recordsNew} new, ${r.recordsUpdated} updated (${r.durationMs}ms)`)
    if (r.error) console.log(`  ERROR: ${r.error.slice(0, 100)}`)
  }

  // Statistici
  const tdCount = await prisma.territorialData.count()
  const leCount = await prisma.localEntity.count()
  console.log(`\nTotal: ${tdCount} date teritoriale, ${leCount} entități locale`)
}

main().catch(e => console.error("FATAL:", e.message)).finally(() => process.exit())
