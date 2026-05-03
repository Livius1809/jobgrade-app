/**
 * Adaptor ONRC / TopFirme / ListaFirme — firme per CAEN per localitate
 *
 * Extrage: număr firme, CAEN-uri, cifre de afaceri, angajați
 * Sursă primară: topfirme.com (API gratuit, scraping)
 * Sursă secundară: listafirme.eu (backup)
 *
 * Output: LocalEntity (BUSINESS) + TerritorialData (BUSINESS, ECONOMY)
 */

import type { CrawlAdapter, CrawlOutput } from "../engine"

interface FirmData {
  name: string
  cui: string
  caen: string
  caenName: string
  employees: number
  revenue: number // RON
  address: string
  status: string  // ACTIVA, INACTIVA, RADIATA
}

const adapter: CrawlAdapter = {
  name: "ONRC_FIRME",

  async crawl(config: any): Promise<CrawlOutput> {
    const territory = config?.territory || "MEDGIDIA"
    const county = config?.county || "CONSTANTA"

    const territorialData: CrawlOutput["territorialData"] = []
    const localEntities: CrawlOutput["localEntities"] = []

    // Încercăm topfirme.com API
    const firms = await fetchFirmsFromTopFirme(territory, county)

    if (firms.length === 0) {
      return {
        territorialData,
        localEntities,
        metadata: { source: "ONRC_FIRME", note: "Zero firme găsite — verificați teritoriul", territory },
      }
    }

    // Agregări
    const activeFirms = firms.filter(f => f.status === "ACTIVA")
    const totalEmployees = activeFirms.reduce((s, f) => s + f.employees, 0)
    const totalRevenue = activeFirms.reduce((s, f) => s + f.revenue, 0)

    // Firme per CAEN (primele 2 cifre = sector)
    const byCaen2: Record<string, { count: number; employees: number; revenue: number; name: string }> = {}
    const byCaen4: Record<string, { count: number; employees: number; revenue: number; name: string }> = {}

    for (const firm of activeFirms) {
      const caen2 = firm.caen.substring(0, 2)
      const caen4 = firm.caen.substring(0, 4)

      if (!byCaen2[caen2]) byCaen2[caen2] = { count: 0, employees: 0, revenue: 0, name: getCaen2Name(caen2) }
      byCaen2[caen2].count++
      byCaen2[caen2].employees += firm.employees
      byCaen2[caen2].revenue += firm.revenue

      if (!byCaen4[caen4]) byCaen4[caen4] = { count: 0, employees: 0, revenue: 0, name: firm.caenName }
      byCaen4[caen4].count++
      byCaen4[caen4].employees += firm.employees
      byCaen4[caen4].revenue += firm.revenue
    }

    // TerritorialData — agregate
    territorialData.push({
      territory, category: "BUSINESS", key: "firms_total",
      value: String(activeFirms.length), numericValue: activeFirms.length,
      unit: "firme", periodYear: new Date().getFullYear(), confidence: 0.9,
      sourceUrl: `https://www.topfirme.com/oras/${territory.toLowerCase()}/`,
    })

    territorialData.push({
      territory, category: "BUSINESS", key: "employees_total",
      value: String(totalEmployees), numericValue: totalEmployees,
      unit: "angajați", periodYear: new Date().getFullYear(), confidence: 0.8,
    })

    territorialData.push({
      territory, category: "ECONOMY", key: "revenue_total",
      value: String(totalRevenue), numericValue: totalRevenue,
      unit: "RON", periodYear: new Date().getFullYear(), confidence: 0.8,
    })

    // Per CAEN sector (2 cifre)
    const sortedSectors = Object.entries(byCaen2).sort((a, b) => b[1].count - a[1].count)
    for (const [caen, data] of sortedSectors) {
      territorialData.push({
        territory, category: "ECONOMY", subcategory: "SECTORS", key: `caen_${caen}`,
        value: JSON.stringify({ name: data.name, count: data.count, employees: data.employees, revenue: data.revenue }),
        numericValue: data.count,
        unit: "firme", periodYear: new Date().getFullYear(), confidence: 0.9,
      })
    }

    // Per CAEN detaliat (4 cifre) — pentru scoring nișe
    for (const [caen, data] of Object.entries(byCaen4)) {
      territorialData.push({
        territory, category: "BUSINESS", subcategory: "CAEN_DETAIL", key: `caen_${caen}`,
        value: JSON.stringify({ name: data.name, count: data.count, employees: data.employees }),
        numericValue: data.count,
        unit: "firme", periodYear: new Date().getFullYear(), confidence: 0.9,
      })
    }

    // LocalEntity per firmă (top 100 după angajați)
    const topFirms = activeFirms
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 100)

    for (const firm of topFirms) {
      localEntities.push({
        territory,
        type: "BUSINESS",
        name: firm.name,
        category: firm.caen,
        subcategory: firm.caenName,
        address: firm.address,
        employees: firm.employees,
        revenue: firm.revenue,
        source: "topfirme.com",
        sourceId: firm.cui,
        isActive: true,
      })
    }

    return {
      territorialData,
      localEntities,
      metadata: {
        source: "ONRC_FIRME",
        territory,
        totalFirms: activeFirms.length,
        totalEmployees,
        totalRevenue,
        sectors: sortedSectors.length,
        topSector: sortedSectors[0]?.[1]?.name || "N/A",
      },
    }
  },
}

async function fetchFirmsFromTopFirme(territory: string, county: string): Promise<FirmData[]> {
  // TopFirme scraping — paginat
  // URL: https://www.topfirme.com/oras/{teritoriu}/
  // Extrage: nume, CUI, CAEN, angajați, CA

  try {
    const url = `https://www.topfirme.com/oras/${territory.toLowerCase()}/`
    const response = await fetch(url, {
      headers: { "User-Agent": "JobGrade-CrawlEngine/1.0 (+https://jobgrade.ro)" },
    })

    if (!response.ok) return []

    const html = await response.text()
    return parseTopFirmeHtml(html)
  } catch {
    return []
  }
}

function parseTopFirmeHtml(html: string): FirmData[] {
  // Parser simplificat — extrage firmele din HTML
  // TopFirme listează: Nume | CUI | CAEN | Angajați | Cifra afaceri
  const firms: FirmData[] = []

  // Pattern-uri de extragere (adaptat la structura topfirme)
  const firmBlocks = html.match(/<div class="firm[^"]*"[^>]*>[\s\S]*?<\/div>/g) || []

  for (const block of firmBlocks) {
    const nameMatch = block.match(/class="name[^"]*"[^>]*>([^<]+)</)
    const cuiMatch = block.match(/CUI[:\s]*(\d+)/)
    const caenMatch = block.match(/CAEN[:\s]*(\d{4})/)
    const empMatch = block.match(/(\d+)\s*angaja[tț]i/i)
    const revMatch = block.match(/([\d.,]+)\s*(RON|lei)/i)

    if (nameMatch) {
      firms.push({
        name: nameMatch[1].trim(),
        cui: cuiMatch?.[1] || "",
        caen: caenMatch?.[1] || "0000",
        caenName: "",
        employees: parseInt(empMatch?.[1] || "0"),
        revenue: parseFloat((revMatch?.[1] || "0").replace(/\./g, "").replace(",", ".")),
        address: territory,
        status: "ACTIVA",
      })
    }
  }

  return firms
}

function getCaen2Name(caen2: string): string {
  const names: Record<string, string> = {
    "01": "Agricultură", "02": "Silvicultură", "03": "Pescuit",
    "05": "Extracție cărbune", "06": "Extracție petrol/gaze",
    "10": "Industrie alimentară", "11": "Fabricare băuturi",
    "13": "Textile", "14": "Confecții", "15": "Pielărie",
    "16": "Prelucrare lemn", "17": "Hârtie", "18": "Tipografii",
    "20": "Chimice", "22": "Cauciuc/plastic", "23": "Minerale nemetalice",
    "24": "Metalurgie", "25": "Produse metalice", "27": "Echipamente electrice",
    "28": "Mașini/utilaje", "29": "Autovehicule", "31": "Mobilă",
    "33": "Reparații mașini", "35": "Energie", "36": "Apă/canalizare",
    "38": "Deșeuri", "41": "Construcții clădiri", "42": "Inginerie civilă",
    "43": "Lucrări specialitate", "45": "Comerț auto", "46": "Comerț en-gros",
    "47": "Comerț en-detail", "49": "Transport terestru", "52": "Depozitare",
    "55": "Hoteluri", "56": "Restaurante", "58": "Edituri",
    "61": "Telecomunicații", "62": "IT servicii", "63": "Servicii informații",
    "64": "Financiar", "65": "Asigurări", "66": "Auxiliare financiare",
    "68": "Imobiliare", "69": "Contabilitate/juridic", "70": "Consultanță management",
    "71": "Arhitectură/inginerie", "72": "Cercetare-dezvoltare",
    "73": "Publicitate", "74": "Alte activități profesionale",
    "77": "Închiriere", "78": "Recrutare", "79": "Turism agenții",
    "80": "Pază", "81": "Întreținere clădiri", "82": "Activități suport",
    "84": "Administrație publică", "85": "Educație", "86": "Sănătate",
    "87": "Asistență socială rezidențială", "88": "Asistență socială non-rezidențială",
    "90": "Activități creative", "91": "Biblioteci/muzee", "93": "Sport/recreere",
    "94": "Asociații/organizații", "95": "Reparații bunuri", "96": "Alte servicii",
  }
  return names[caen2] || `Sector CAEN ${caen2}`
}

export default adapter
