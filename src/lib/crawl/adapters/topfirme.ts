/**
 * Adaptor TopFirme — date firme per localitate
 *
 * Sursa: topfirme.com (agregator ONRC/ANAF)
 * Date: firme, cifră afaceri, angajați, CAEN per localitate
 *
 * Faza 1: date statice seed (din cercetare manuală)
 * Faza 2: scraper HTML real
 */

import type { CrawlAdapter, CrawlOutput } from "../engine"

const MEDGIDIA_FIRMS = {
  total: 3435,
  totalEmployees: 3981,
  totalRevenue: 1600000000, // 1.6 mld lei
  totalProfit: 183100000, // 183.1 mil lei
  topFirms: [
    { name: "AGRO INVEST VALEA DACILOR SRL", revenue: 248700000, employees: 50, caen: "4621", category: "Comerț cereale" },
    { name: "STERK PLAST SRL", revenue: 148500000, employees: 441, caen: "2229", category: "Fabricare produse plastic" },
    { name: "FOIȘOR COM SRL", revenue: 127400000, employees: 221, caen: "4711", category: "Comerț amănunt" },
    { name: "E.N.B. S.R.L.", revenue: 73400000, employees: 40, caen: "4671", category: "Comerț combustibili" },
    { name: "STAVROS GRUP SRL", revenue: 46600000, employees: 30, caen: "4711", category: "Comerț amănunt" },
    { name: "DIRDATES PRODUCT SRL", revenue: 20000000, employees: 87, caen: "1071", category: "Panificație" },
    { name: "ECOFRIEND RECYCLING SRL", revenue: 15000000, employees: 86, caen: "3832", category: "Reciclare" },
    { name: "GEKGUARD SECURITY SRL", revenue: 12000000, employees: 82, caen: "8010", category: "Securitate" },
  ],
  topSectors: [
    { caen: "4621", name: "Comerț cereale", revenue: 294300000 },
    { caen: "4711", name: "Comerț amănunt nespecializat", revenue: 236000000 },
    { caen: "2229", name: "Fabricare produse plastic", revenue: 148500000 },
    { caen: "4941", name: "Transport rutier marfă", revenue: 50000000 },
    { caen: "4932", name: "Transport taxi", revenue: 15000000 },
  ],
}

const adapter: CrawlAdapter = {
  name: "TOPFIRME",

  async crawl(_config: any): Promise<CrawlOutput> {
    const territory = "MEDGIDIA"
    const year = 2024

    const territorialData: CrawlOutput["territorialData"] = []
    const localEntities: CrawlOutput["localEntities"] = []

    // Date agregate
    territorialData.push(
      { territory, category: "BUSINESS", key: "firms_total", value: String(MEDGIDIA_FIRMS.total), numericValue: MEDGIDIA_FIRMS.total, unit: "firme", periodYear: year, confidence: 0.95, sourceUrl: "https://www.topfirme.com/judet/constanta/localitate/medgidia/" },
      { territory, category: "BUSINESS", key: "employees_total", value: String(MEDGIDIA_FIRMS.totalEmployees), numericValue: MEDGIDIA_FIRMS.totalEmployees, unit: "angajați", periodYear: year, confidence: 0.95 },
      { territory, category: "ECONOMY", key: "revenue_total", value: String(MEDGIDIA_FIRMS.totalRevenue), numericValue: MEDGIDIA_FIRMS.totalRevenue, unit: "RON", periodYear: year, confidence: 0.9 },
      { territory, category: "ECONOMY", key: "profit_total", value: String(MEDGIDIA_FIRMS.totalProfit), numericValue: MEDGIDIA_FIRMS.totalProfit, unit: "RON", periodYear: year, confidence: 0.9 },
      { territory, category: "BUSINESS", key: "avg_employees_per_firm", value: "1.16", numericValue: 1.16, unit: "angajați/firmă", periodYear: year, confidence: 0.95 },
    )

    // Sectoare economice
    for (const sector of MEDGIDIA_FIRMS.topSectors) {
      territorialData.push({
        territory, category: "ECONOMY", subcategory: "SECTORS", key: `sector_${sector.caen}`,
        value: JSON.stringify({ caen: sector.caen, name: sector.name, revenue: sector.revenue }),
        numericValue: sector.revenue, unit: "RON", periodYear: year, confidence: 0.9,
      })
    }

    // Top firme ca entități locale
    for (const firm of MEDGIDIA_FIRMS.topFirms) {
      localEntities.push({
        territory, type: "BUSINESS", name: firm.name,
        category: firm.caen, subcategory: firm.category,
        employees: firm.employees, revenue: firm.revenue,
        sourceId: firm.name, // TODO: CUI real
        metadata: { caen: firm.caen, topFirm: true },
      })
    }

    return { territorialData, localEntities, metadata: { source: "TOPFIRME_2024", note: "Date seed — de înlocuit cu scraper real" } }
  },
}

export default adapter
