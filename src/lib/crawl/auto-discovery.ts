/**
 * auto-discovery.ts — Descoperire autonomă de surse per teritoriu
 *
 * Primește un teritoriu (localitate + județ) și:
 * 1. Generează URL-uri candidate din pattern-uri cunoscute
 * 2. Testează accesibilitatea fiecăreia
 * 3. Clasifică tipul de date disponibile
 * 4. Creează automat CrawlSource în DB
 *
 * Când adaugi un teritoriu nou, nu mai configurezi manual —
 * crawlerul descoperă singur sursele.
 */

import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════════
// PATTERN-URI CUNOSCUTE — învățate din Medgidia, generalizabile
// ═══════════════════════════════════════════════════════════════

interface SourcePattern {
  /** Identificator pattern */
  id: string
  /** Cum se construiește URL-ul (cu placeholders) */
  urlTemplate: string
  /** Tip sursă */
  type: "HTML_SCRAPER" | "API"
  /** Frecvența recomandată */
  schedule: string
  /** Ce categorie de date oferă */
  categories: string[]
  /** Descriere */
  description: string
  /** Cum validăm că sursa e utilă (text de căutat în pagină) */
  validationKeywords: string[]
}

// Pattern-uri per nivel: local, județean, național
const LOCAL_PATTERNS: SourcePattern[] = [
  {
    id: "PRIMARIE",
    urlTemplate: "https://primaria-{localitate_slug}.ro/",
    type: "HTML_SCRAPER",
    schedule: "DAILY",
    categories: ["INFRASTRUCTURE", "ECONOMY"],
    description: "Primăria {localitate}",
    validationKeywords: ["primăria", "municipiul", "orașul", "comuna", "hotărâri", "urbanism"],
  },
  {
    id: "PRIMARIE_ALT",
    urlTemplate: "https://www.primaria{localitate_slug}.ro/",
    type: "HTML_SCRAPER",
    schedule: "DAILY",
    categories: ["INFRASTRUCTURE", "ECONOMY"],
    description: "Primăria {localitate} (alt format)",
    validationKeywords: ["primăria", "municipiul", "hotărâri"],
  },
  {
    id: "TOPFIRME_LOCAL",
    urlTemplate: "https://www.topfirme.com/judet/{judet_slug}/localitate/{localitate_slug}/",
    type: "HTML_SCRAPER",
    schedule: "WEEKLY",
    categories: ["BUSINESS", "ECONOMY"],
    description: "TopFirme — firme din {localitate}",
    validationKeywords: ["firme", "cifra de afaceri", "angajați", "profit"],
  },
  {
    id: "LISTAFIRME_LOCAL",
    urlTemplate: "https://listafirme.eu/{judet_slug}/{localitate_slug}/",
    type: "HTML_SCRAPER",
    schedule: "WEEKLY",
    categories: ["BUSINESS"],
    description: "ListaFirme — firme din {localitate}",
    validationKeywords: ["firme", "SRL", "societăți", "active"],
  },
  {
    id: "OSM_LOCAL",
    urlTemplate: "https://overpass-api.de/api/interpreter",
    type: "API",
    schedule: "WEEKLY",
    categories: ["INFRASTRUCTURE"],
    description: "OpenStreetMap POI — {localitate}",
    validationKeywords: [], // API, nu are nevoie de validare
  },
]

const COUNTY_PATTERNS: SourcePattern[] = [
  {
    id: "CJC",
    urlTemplate: "https://www.cj{judet_code}.ro/",
    type: "HTML_SCRAPER",
    schedule: "WEEKLY",
    categories: ["INFRASTRUCTURE", "ECONOMY"],
    description: "Consiliul Județean {judet}",
    validationKeywords: ["consiliul județean", "strategie", "dezvoltare", "hotărâri"],
  },
  {
    id: "DJS",
    urlTemplate: "https://{judet_slug}.insse.ro/",
    type: "HTML_SCRAPER",
    schedule: "MONTHLY",
    categories: ["POPULATION", "ECONOMY", "LABOR"],
    description: "Direcția Județeană Statistică {judet}",
    validationKeywords: ["statistică", "buletin", "indicatori", "populație"],
  },
  {
    id: "AJOFM",
    urlTemplate: "http://www.{judet_slug}.anofm.ro/",
    type: "HTML_SCRAPER",
    schedule: "DAILY",
    categories: ["LABOR"],
    description: "AJOFM {judet} — piața muncii",
    validationKeywords: ["locuri de muncă", "ocupare", "șomaj", "formare"],
  },
  {
    id: "DSP",
    urlTemplate: "https://dsp{judet_code}.ro/",
    type: "HTML_SCRAPER",
    schedule: "MONTHLY",
    categories: ["HEALTH"],
    description: "Direcția de Sănătate Publică {judet}",
    validationKeywords: ["sănătate", "medicale", "spital", "cabinete"],
  },
  {
    id: "ISJ",
    urlTemplate: "https://isj{judet_code}.ro/",
    type: "HTML_SCRAPER",
    schedule: "MONTHLY",
    categories: ["EDUCATION"],
    description: "Inspectoratul Școlar Județean {judet}",
    validationKeywords: ["școlar", "educație", "elevi", "rețea școlară"],
  },
  {
    id: "CCINA",
    urlTemplate: "https://www.ccina{judet_code}.ro/",
    type: "HTML_SCRAPER",
    schedule: "WEEKLY",
    categories: ["BUSINESS", "ECONOMY"],
    description: "Camera de Comerț {judet}",
    validationKeywords: ["cameră de comerț", "industrie", "membri", "evenimente"],
  },
]

const NATIONAL_PATTERNS: SourcePattern[] = [
  {
    id: "INS_TEMPO",
    urlTemplate: "http://statistici.insse.ro:8077/tempo-online/",
    type: "API",
    schedule: "MONTHLY",
    categories: ["POPULATION", "ECONOMY", "LABOR"],
    description: "INS TEMPO Online — date statistice naționale",
    validationKeywords: [],
  },
  {
    id: "POPULATIA_RO",
    urlTemplate: "https://populatia.ro/populatie-municipiul-{localitate_slug}-judetul-{judet_slug}/",
    type: "HTML_SCRAPER",
    schedule: "MONTHLY",
    categories: ["POPULATION"],
    description: "Populația {localitate}",
    validationKeywords: ["populație", "locuitori", "vârstă", "gen"],
  },
]

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/[îí]/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

// Coduri județe pentru URL-uri instituționale
const COUNTY_CODES: Record<string, string> = {
  constanta: "ct", bucuresti: "b", cluj: "cj", timis: "tm", iasi: "is",
  brasov: "bv", prahova: "ph", dolj: "dj", galati: "gl", arges: "ag",
  bacau: "bc", bihor: "bh", mures: "ms", sibiu: "sb", suceava: "sv",
  valcea: "vl", neamt: "nt", arad: "ar", hunedoara: "hd", buzau: "bz",
  satu_mare: "sm", maramures: "mm", alba: "ab", botosani: "bt", caras_severin: "cs",
  covasna: "cv", dambovita: "db", giurgiu: "gr", gorj: "gj", harghita: "hr",
  ialomita: "il", mehedinti: "mh", olt: "ot", salaj: "sj", tulcea: "tl",
  vaslui: "vs", vrancea: "vn", calarasi: "cl", teleorman: "tr", ilfov: "if",
}

/**
 * Testează dacă un URL e accesibil și conține keywords relevante.
 */
async function probeUrl(url: string, keywords: string[]): Promise<{ accessible: boolean; relevant: boolean; title?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "JobGrade-TerritorialEngine/1.0 (market-research)" },
      redirect: "follow",
    })

    clearTimeout(timeout)

    if (!res.ok) return { accessible: false, relevant: false }

    // Citim primele 5KB pentru validare
    const text = await res.text()
    const sample = text.slice(0, 5000).toLowerCase()

    // Extragem titlul
    const titleMatch = sample.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch?.[1]?.trim()

    // Verificăm keywords
    const relevant = keywords.length === 0 || keywords.some(kw => sample.includes(kw.toLowerCase()))

    return { accessible: true, relevant, title }
  } catch {
    return { accessible: false, relevant: false }
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTO-DISCOVERY
// ═══════════════════════════════════════════════════════════════

export interface DiscoveryResult {
  territory: string
  discovered: Array<{
    patternId: string
    name: string
    url: string
    accessible: boolean
    relevant: boolean
    title?: string
    categories: string[]
    created: boolean
  }>
  totalDiscovered: number
  totalCreated: number
  durationMs: number
}

/**
 * Descoperă automat sursele de date pentru un teritoriu.
 *
 * @param localitate — ex: "Medgidia"
 * @param judet — ex: "Constanta"
 * @param dryRun — doar descoperă, nu creează (default false)
 */
export async function discoverSources(
  localitate: string,
  judet: string,
  dryRun = false
): Promise<DiscoveryResult> {
  const t0 = Date.now()
  const territory = localitate.toUpperCase()
  const localSlug = slugify(localitate)
  const judetSlug = slugify(judet)
  const judetCode = COUNTY_CODES[judetSlug] || judetSlug.slice(0, 2)

  const results: DiscoveryResult["discovered"] = []

  const allPatterns = [...LOCAL_PATTERNS, ...COUNTY_PATTERNS, ...NATIONAL_PATTERNS]

  // Testăm fiecare pattern în paralel (max 5 simultan)
  const batchSize = 5
  for (let i = 0; i < allPatterns.length; i += batchSize) {
    const batch = allPatterns.slice(i, i + batchSize)

    const probes = await Promise.all(batch.map(async (pattern) => {
      // Construim URL-ul din template
      let url = pattern.urlTemplate
        .replace("{localitate_slug}", localSlug)
        .replace("{judet_slug}", judetSlug)
        .replace("{judet_code}", judetCode)

      const sourceName = `${pattern.id}_${territory}`

      // Skip dacă sursa există deja
      const exists = await prisma.crawlSource.findUnique({ where: { name: sourceName } })
      if (exists) {
        return {
          patternId: pattern.id,
          name: pattern.description.replace("{localitate}", localitate).replace("{judet}", judet),
          url,
          accessible: true,
          relevant: true,
          categories: pattern.categories,
          created: false,
          title: "Deja configurată",
        }
      }

      // OSM nu necesită probe — mereu disponibil
      if (pattern.id === "OSM_LOCAL") {
        let created = false
        if (!dryRun) {
          await prisma.crawlSource.create({
            data: {
              name: sourceName,
              displayName: pattern.description.replace("{localitate}", localitate),
              url,
              type: pattern.type,
              schedule: pattern.schedule,
              territory,
            },
          })
          created = true
        }
        return {
          patternId: pattern.id,
          name: pattern.description.replace("{localitate}", localitate),
          url, accessible: true, relevant: true,
          categories: pattern.categories, created,
        }
      }

      // Probe URL
      const probe = await probeUrl(url, pattern.validationKeywords)

      let created = false
      if (probe.accessible && probe.relevant && !dryRun) {
        await prisma.crawlSource.create({
          data: {
            name: sourceName,
            displayName: pattern.description.replace("{localitate}", localitate).replace("{judet}", judet),
            url,
            type: pattern.type,
            schedule: pattern.schedule,
            territory,
            config: { autoDiscovered: true, validationTitle: probe.title },
          },
        })
        created = true
      }

      return {
        patternId: pattern.id,
        name: pattern.description.replace("{localitate}", localitate).replace("{judet}", judet),
        url, accessible: probe.accessible, relevant: probe.relevant,
        title: probe.title, categories: pattern.categories, created,
      }
    }))

    results.push(...probes)
  }

  return {
    territory,
    discovered: results,
    totalDiscovered: results.filter(r => r.accessible && r.relevant).length,
    totalCreated: results.filter(r => r.created).length,
    durationMs: Date.now() - t0,
  }
}
