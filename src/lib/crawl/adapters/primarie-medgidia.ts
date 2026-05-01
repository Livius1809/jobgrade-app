/**
 * Adaptor Primăria Medgidia — date locale oficiale
 *
 * Sursa: primaria-medgidia.ro
 * Date: infrastructură, proiecte, documente strategice
 */

import type { CrawlAdapter, CrawlOutput } from "../engine"

const adapter: CrawlAdapter = {
  name: "PRIMARIE_MEDGIDIA",

  async crawl(_config: any): Promise<CrawlOutput> {
    const territory = "MEDGIDIA"
    const year = 2025

    const territorialData: CrawlOutput["territorialData"] = []
    const localEntities: CrawlOutput["localEntities"] = []

    // Infrastructură cunoscută
    territorialData.push(
      { territory, category: "INFRASTRUCTURE", key: "has_hospital", value: "true", numericValue: 1, periodYear: year, confidence: 1.0, sourceUrl: "https://spitalmedgidia.ro/" },
      { territory, category: "INFRASTRUCTURE", key: "has_industrial_park", value: "planned_2025", periodYear: year, confidence: 0.8, sourceUrl: "https://www.constructiibursa.ro/in-cursul-acestui-an-va-demara-constructia-parcului-industrial-de-la-medgidia-202541" },
      { territory, category: "INFRASTRUCTURE", key: "has_mall", value: "in_construction", periodYear: year, confidence: 0.9 },
      { territory, category: "INFRASTRUCTURE", key: "ajofm_office", value: "true", numericValue: 1, periodYear: year, confidence: 1.0 },
      { territory, category: "INFRASTRUCTURE", key: "wind_energy_potential", value: "high", periodYear: year, confidence: 0.8 },
      { territory, category: "INFRASTRUCTURE", key: "irrigation_system", value: "true", periodYear: year, confidence: 0.9 },
      { territory, category: "INFRASTRUCTURE", subcategory: "STRATEGIC_DOCS", key: "sidu_2021_2030", value: "https://primaria-medgidia.ro/wp-content/uploads/2025/08/SIDU-Medgidia-2021%E2%80%932030-Actualizare-2025.pdf", periodYear: year, confidence: 1.0 },
      { territory, category: "INFRASTRUCTURE", subcategory: "STRATEGIC_DOCS", key: "pug", value: "https://primaria-medgidia.ro/plan-urbanistic-general/", periodYear: year, confidence: 1.0 },
      { territory, category: "INFRASTRUCTURE", subcategory: "STRATEGIC_DOCS", key: "pmud_2021_2027", value: "Plan Mobilitate Urbană Durabilă", periodYear: year, confidence: 1.0 },
    )

    // Entități locale
    localEntities.push(
      { territory, type: "HOSPITAL", name: "Spitalul Municipal Medgidia", address: "Str. Ion Creangă, nr. 18", phone: "0241 810 690", website: "https://spitalmedgidia.ro/", sourceId: "SPITAL_MEDGIDIA", latitude: 44.2481, longitude: 28.2711 },
      { territory, type: "GOVERNMENT", name: "Primăria Municipiului Medgidia", website: "https://primaria-medgidia.ro/", sourceId: "PRIMARIA_MEDGIDIA" },
      { territory, type: "GOVERNMENT", name: "AJOFM Constanța — Punct de lucru Medgidia", address: "Str. Republicii, nr. 60B", sourceId: "AJOFM_MEDGIDIA" },
      { territory, type: "SCHOOL", name: "Liceul Teoretic Nicolae Bălcescu", sourceId: "LICEU_BALCESCU_MEDGIDIA" },
      { territory, type: "SCHOOL", name: "Școala Gimnazială Mircea Dragomirescu", sourceId: "SCOALA_DRAGOMIRESCU" },
      { territory, type: "SCHOOL", name: "Școala Gimnazială Spiru Haret", sourceId: "SCOALA_HARET" },
      { territory, type: "SCHOOL", name: "Grădinița cu Program Prelungit Ion Creangă", sourceId: "GRADINITA_CREANGA" },
      { territory, type: "SCHOOL", name: "Grădinița cu Program Prelungit Lucian Grigorescu", sourceId: "GRADINITA_GRIGORESCU" },
    )

    return { territorialData, localEntities, metadata: { source: "PRIMARIE_MEDGIDIA_2025", note: "Date mixte: seed + crawl site" } }
  },
}

export default adapter
