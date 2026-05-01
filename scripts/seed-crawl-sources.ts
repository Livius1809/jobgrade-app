/**
 * Seed surse crawling — configurare inițială
 *
 * Rulează: npx tsx scripts/seed-crawl-sources.ts
 * Apoi: npx tsx scripts/run-crawl.ts (pentru primul crawl)
 */

require("dotenv").config()

const API = process.env.API_BASE || "https://jobgrade.ro"
const KEY = process.env.INTERNAL_API_KEY || "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": KEY },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}

async function main() {
  console.log("\n  Seed surse crawling\n")

  // Creăm direct în DB prin Prisma (nu prin API — sursele nu au endpoint CRUD încă)
  const { PrismaClient } = require("../src/generated/prisma")
  const prisma = new PrismaClient()

  const sources = [
    {
      name: "INS_TEMPO",
      displayName: "INS TEMPO Online — Date statistice",
      url: "http://statistici.insse.ro:8077/tempo-online/",
      type: "API",
      schedule: "MONTHLY",
      territory: "MEDGIDIA",
      config: { note: "Faza 1: date statice seed. Faza 2: API real TEMPO." },
    },
    {
      name: "TOPFIRME",
      displayName: "TopFirme — Firme per localitate",
      url: "https://www.topfirme.com/judet/constanta/localitate/medgidia/",
      type: "HTML_SCRAPER",
      schedule: "WEEKLY",
      territory: "MEDGIDIA",
      config: { note: "Faza 1: date seed. Faza 2: scraper real." },
    },
    {
      name: "PRIMARIE_MEDGIDIA",
      displayName: "Primăria Municipiului Medgidia",
      url: "https://primaria-medgidia.ro/",
      type: "HTML_SCRAPER",
      schedule: "DAILY",
      territory: "MEDGIDIA",
      config: { sections: ["urbanism", "anunturi", "cariera", "achizitii"] },
    },
    {
      name: "AJOFM_CONSTANTA",
      displayName: "AJOFM Constanța — Piața muncii",
      url: "http://www.constanta.anofm.ro/",
      type: "HTML_SCRAPER",
      schedule: "DAILY",
      territory: "MEDGIDIA",
      config: { mediereUrl: "https://mediere.anofm.ro/app/module/mediere/jobs" },
    },
    {
      name: "OSM_OVERPASS",
      displayName: "OpenStreetMap — POI-uri locale cu GPS",
      url: "https://overpass-api.de/api/interpreter",
      type: "API",
      schedule: "WEEKLY",
      territory: "MEDGIDIA",
      config: { bbox: { south: 44.22, west: 28.24, north: 44.27, east: 28.30 } },
    },
  ]

  for (const src of sources) {
    try {
      await prisma.crawlSource.upsert({
        where: { name: src.name },
        update: { displayName: src.displayName, url: src.url, type: src.type, schedule: src.schedule, territory: src.territory, config: src.config },
        create: src,
      })
      console.log(`  ✓ ${src.name} — ${src.displayName}`)
    } catch (e: any) {
      console.log(`  ✗ ${src.name}: ${e.message?.slice(0, 80)}`)
    }
  }

  await prisma.$disconnect()
  console.log(`\n  ${sources.length} surse configurate.\n`)
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
