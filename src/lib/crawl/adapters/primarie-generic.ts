/**
 * Adaptor generic Primărie — funcționează pe orice UAT
 *
 * Extrage de pe site-ul primăriei:
 * - Date demografice (dacă publicate)
 * - Infrastructură (utilități, drumuri, rețele)
 * - Strategii de dezvoltare (PDF-uri)
 * - HCL-uri recente
 * - Proiecte în derulare
 * - Informații contact
 *
 * Config: { territory, url, county }
 * URL discovery: auto-discovery.ts generează URL-urile probabile
 */

import type { CrawlAdapter, CrawlOutput } from "../engine"

interface PrimarieConfig {
  territory: string
  url: string
  county?: string
  latitude?: number
  longitude?: number
}

const adapter: CrawlAdapter = {
  name: "PRIMARIE_GENERIC",

  async crawl(config: any): Promise<CrawlOutput> {
    const c = config as PrimarieConfig
    if (!c?.territory || !c?.url) {
      return {
        territorialData: [], localEntities: [],
        metadata: { error: "Config necesită territory și url" },
      }
    }

    const territory = c.territory.toUpperCase()
    const territorialData: CrawlOutput["territorialData"] = []
    const localEntities: CrawlOutput["localEntities"] = []

    try {
      const html = await fetchPage(c.url)
      if (!html) {
        return { territorialData, localEntities, metadata: { source: "PRIMARIE_GENERIC", error: "Nu s-a putut accesa site-ul", url: c.url } }
      }

      // Extragere date infrastructură
      const infra = extractInfrastructure(html, territory)
      territorialData.push(...infra)

      // Extragere proiecte
      const projects = extractProjects(html, territory)
      territorialData.push(...projects)

      // Extragere servicii publice
      const services = extractPublicServices(html, territory, c.latitude, c.longitude)
      localEntities.push(...services)

      // Extragere date contact
      const contact = extractContact(html, territory)
      if (contact) {
        territorialData.push({
          territory, category: "INFRASTRUCTURE", key: "primarie_contact",
          value: JSON.stringify(contact), numericValue: null,
          unit: "contact", periodYear: new Date().getFullYear(), confidence: 1.0,
          sourceUrl: c.url,
        })
      }

      // Verificare pagini comune
      const subPages = ["/transparenta", "/hcl", "/proiecte", "/servicii", "/informatii-publice"]
      for (const page of subPages) {
        try {
          const subHtml = await fetchPage(`${c.url.replace(/\/$/, "")}${page}`)
          if (subHtml && subHtml.length > 1000) {
            const subInfra = extractInfrastructure(subHtml, territory)
            // Evită duplicate
            for (const item of subInfra) {
              if (!territorialData.some(t => t.key === item.key)) {
                territorialData.push(item)
              }
            }
          }
        } catch {
          // Pagina nu există — ignorăm
        }
      }

    } catch (error) {
      return {
        territorialData, localEntities,
        metadata: { source: "PRIMARIE_GENERIC", error: String(error), url: c.url },
      }
    }

    return {
      territorialData,
      localEntities,
      metadata: {
        source: "PRIMARIE_GENERIC",
        territory,
        url: c.url,
        dataPoints: territorialData.length,
        entities: localEntities.length,
      },
    }
  },
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "JobGrade-CrawlEngine/1.0 (+https://jobgrade.ro)" },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

function extractInfrastructure(html: string, territory: string): CrawlOutput["territorialData"] {
  const data: CrawlOutput["territorialData"] = []
  const lower = html.toLowerCase()

  // Detectare utilități din conținut
  const infraChecks: Array<{ keyword: string[]; key: string; label: string }> = [
    { keyword: ["apă curentă", "retea apa", "alimentare cu apă"], key: "has_water_supply", label: "Rețea apă curentă" },
    { keyword: ["canalizare", "rețea canalizare"], key: "has_sewage", label: "Rețea canalizare" },
    { keyword: ["gaz natural", "gaze naturale", "retea gaz"], key: "has_natural_gas", label: "Rețea gaz natural" },
    { keyword: ["internet", "fibră optică", "broadband"], key: "has_internet", label: "Internet/fibră" },
    { keyword: ["autostrad", "drum național", "drum european"], key: "has_highway_access", label: "Acces autostradă/DN" },
    { keyword: ["gară", "cale ferată", "cfr"], key: "has_railway", label: "Gară/cale ferată" },
    { keyword: ["spital", "centru medical"], key: "has_hospital", label: "Spital/centru medical" },
    { keyword: ["liceu", "colegiu", "școală"], key: "has_high_school", label: "Liceu/colegiu" },
    { keyword: ["grădiniță", "creșă"], key: "has_kindergarten", label: "Grădiniță/creșă" },
    { keyword: ["piață agroalimentară", "piața centrală"], key: "has_market", label: "Piață agroalimentară" },
    { keyword: ["zonă industrială", "parc industrial"], key: "has_industrial_zone", label: "Zonă/parc industrial" },
    { keyword: ["stație epurare"], key: "has_water_treatment", label: "Stație epurare" },
    { keyword: ["parc fotovoltaic", "energie solară"], key: "has_solar", label: "Energie solară" },
    { keyword: ["parc eolian", "energie eoliană"], key: "has_wind", label: "Energie eoliană" },
  ]

  for (const check of infraChecks) {
    const found = check.keyword.some(kw => lower.includes(kw))
    if (found) {
      data.push({
        territory, category: "INFRASTRUCTURE", key: check.key,
        value: "true", numericValue: 1,
        unit: "boolean", periodYear: new Date().getFullYear(), confidence: 0.7,
      })
    }
  }

  // Extragere suprafață teritoriu (dacă menționată)
  const surfaceMatch = html.match(/suprafață[ăa]?\s*(?:de\s*)?([\d.,]+)\s*(km|ha|hectare)/i)
  if (surfaceMatch) {
    const value = parseFloat(surfaceMatch[1].replace(",", "."))
    const unit = surfaceMatch[2].toLowerCase().includes("km") ? "km²" : "ha"
    data.push({
      territory, category: "INFRASTRUCTURE", key: "surface_area",
      value: String(value), numericValue: value,
      unit, periodYear: new Date().getFullYear(), confidence: 0.8,
    })
  }

  // Extragere populație (dacă menționată pe site)
  const popMatch = html.match(/popula[tț]i[ea]\s*(?:de\s*)?([\d.,]+)\s*(?:locuitori|persoane)/i)
  if (popMatch) {
    const pop = parseInt(popMatch[1].replace(/[.,]/g, ""))
    if (pop > 100 && pop < 10000000) {
      data.push({
        territory, category: "POPULATION", key: "population_site",
        value: String(pop), numericValue: pop,
        unit: "locuitori", periodYear: new Date().getFullYear(), confidence: 0.6,
        subcategory: "PRIMARIE_STATED",
      })
    }
  }

  return data
}

function extractProjects(html: string, territory: string): CrawlOutput["territorialData"] {
  const data: CrawlOutput["territorialData"] = []

  // Detectare proiecte europene / investiții
  const euPatterns = ["fonduri europene", "proiect pnrr", "proiect por", "finanțare nerambursabilă", "fonduri structurale"]
  const hasEU = euPatterns.some(p => html.toLowerCase().includes(p))

  if (hasEU) {
    data.push({
      territory, category: "INFRASTRUCTURE", subcategory: "PROJECTS", key: "has_eu_projects",
      value: "true", numericValue: 1,
      unit: "boolean", periodYear: new Date().getFullYear(), confidence: 0.7,
    })
  }

  return data
}

function extractPublicServices(
  html: string,
  territory: string,
  lat?: number,
  lng?: number
): CrawlOutput["localEntities"] {
  const entities: CrawlOutput["localEntities"] = []

  // Primăria însăși
  entities.push({
    territory,
    type: "SERVICE",
    name: `Primăria ${territory.charAt(0) + territory.slice(1).toLowerCase()}`,
    category: "ADMINISTRATIE",
    subcategory: "Primărie",
    source: "primarie-website",
    sourceId: `PRIMARIE_${territory}`,
    isActive: true,
    latitude: lat,
    longitude: lng,
  })

  return entities
}

function extractContact(html: string, territory: string): Record<string, string> | null {
  const contact: Record<string, string> = {}

  const phoneMatch = html.match(/(?:tel|telefon|phone)[^0-9]*(0\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/i)
  if (phoneMatch) contact.phone = phoneMatch[1]

  const emailMatch = html.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (emailMatch) contact.email = emailMatch[1]

  return Object.keys(contact).length > 0 ? contact : null
}

export default adapter
