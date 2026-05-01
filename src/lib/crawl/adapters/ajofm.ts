/**
 * Adaptor AJOFM/ANOFM — piața muncii
 *
 * Sursa: constanta.anofm.ro + mediere.anofm.ro
 * Date: locuri muncă disponibile, șomaj, formare profesională
 *
 * Faza 1: date seed
 * Faza 2: scraper mediere.anofm.ro (API disponibil)
 */

import type { CrawlAdapter, CrawlOutput } from "../engine"

const adapter: CrawlAdapter = {
  name: "AJOFM_CONSTANTA",

  async crawl(_config: any): Promise<CrawlOutput> {
    const territory = "MEDGIDIA"
    const year = 2025

    const territorialData: CrawlOutput["territorialData"] = []

    // Date piață muncii (seed — de înlocuit cu scraper real)
    territorialData.push(
      { territory, category: "LABOR", key: "ajofm_office", value: "Str. Republicii 60B", periodYear: year, confidence: 1.0, sourceUrl: "http://www.constanta.anofm.ro/" },
      { territory, category: "LABOR", key: "jobs_available_county", value: "7742", numericValue: 7742, unit: "locuri muncă", periodYear: year, confidence: 0.7, sourceUrl: "https://mediere.anofm.ro/app/module/mediere/jobs" },
      { territory, category: "LABOR", key: "services_available", value: JSON.stringify(["informare profesională", "consiliere carieră", "mediere muncă", "formare profesională"]), periodYear: year, confidence: 1.0 },
    )

    // TODO Faza 2: crawl mediere.anofm.ro pentru locuri muncă specifice Medgidia
    // URL: https://mediere.anofm.ro/app/module/mediere/jobs?judet=CT&localitate=MEDGIDIA
    // Parse: titlu job, angajator, nr posturi, cerințe, salariu

    return { territorialData, localEntities: [], metadata: { source: "AJOFM_SEED_2025", note: "Date seed — Faza 2: scraper mediere.anofm.ro" } }
  },
}

export default adapter
