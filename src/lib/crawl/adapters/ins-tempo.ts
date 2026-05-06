/**
 * Adaptor INS TEMPO Online — date statistice România
 *
 * Surse: http://statistici.insse.ro:8077/tempo-online/
 * API: TEMPO Online oferă API JSON pentru serii de timp
 *
 * Date extrase: populație pe vârste, ocupații, gospodării per localitate
 */

import type { CrawlAdapter, CrawlOutput } from "../engine"

// Date statice INS pentru Medgidia (recensământ 2022 — de actualizat când TEMPO API e disponibil)
// Sursa: populatia.ro (aggregator INS)
const MEDGIDIA_POPULATION = {
  total: 34612,
  male: 16578,
  female: 18034,
  ageGroups: [
    { range: "0-9", count: 3729 },
    { range: "10-19", count: 4220 },
    { range: "20-29", count: 2753 },
    { range: "30-39", count: 3870 },
    { range: "40-49", count: 4878 },
    { range: "50-59", count: 5393 },
    { range: "60-69", count: 5261 },
    { range: "70-79", count: 3030 },
    { range: "80+", count: 1478 },
  ],
  ethnicity: [
    { name: "Români", count: 23470 },
    { name: "Tătari", count: 2712 },
    { name: "Turci", count: 1909 },
    { name: "Romi", count: 691 },
  ],
  maritalStatus: {
    married: 19610,
    single: 14834,
    widowed: 3660,
    divorced: 1662,
  },
}

const adapter: CrawlAdapter = {
  name: "INS_TEMPO",

  async crawl(_config: any): Promise<CrawlOutput> {
    // Faza 1: date statice din recensământ (seed inițial)
    // Faza 2: TEMPO API real (când îl integrăm)
    // TODO: înlocuiește cu apeluri TEMPO API reale

    const territory = "MEDGIDIA"
    const year = 2022

    const territorialData: CrawlOutput["territorialData"] = []

    // Populație totală
    territorialData.push({
      territory, category: "POPULATION", key: "total",
      value: String(MEDGIDIA_POPULATION.total), numericValue: MEDGIDIA_POPULATION.total,
      unit: "persoane", periodYear: year, confidence: 1.0,
      sourceUrl: "https://populatia.ro/populatie-municipiul-medgidia-judetul-constanta/",
      latitude: 44.2481, longitude: 28.2711,
    })

    // Gen
    territorialData.push({
      territory, category: "POPULATION", subcategory: "GENDER", key: "male",
      value: String(MEDGIDIA_POPULATION.male), numericValue: MEDGIDIA_POPULATION.male,
      unit: "persoane", periodYear: year, confidence: 1.0,
    })
    territorialData.push({
      territory, category: "POPULATION", subcategory: "GENDER", key: "female",
      value: String(MEDGIDIA_POPULATION.female), numericValue: MEDGIDIA_POPULATION.female,
      unit: "persoane", periodYear: year, confidence: 1.0,
    })

    // Grupe vârstă
    for (const ag of MEDGIDIA_POPULATION.ageGroups) {
      territorialData.push({
        territory, category: "POPULATION", subcategory: "AGE_GROUPS", key: `age_${ag.range}`,
        value: String(ag.count), numericValue: ag.count,
        unit: "persoane", periodYear: year, confidence: 1.0,
      })
    }

    // Etnie
    for (const eth of MEDGIDIA_POPULATION.ethnicity) {
      territorialData.push({
        territory, category: "POPULATION", subcategory: "ETHNICITY", key: `eth_${eth.name.toLowerCase()}`,
        value: String(eth.count), numericValue: eth.count,
        unit: "persoane", periodYear: year, confidence: 1.0,
      })
    }

    // Stare civilă
    for (const [key, val] of Object.entries(MEDGIDIA_POPULATION.maritalStatus)) {
      territorialData.push({
        territory, category: "POPULATION", subcategory: "MARITAL_STATUS", key: `marital_${key}`,
        value: String(val), numericValue: val,
        unit: "persoane", periodYear: year, confidence: 1.0,
      })
    }

    return {
      territorialData,
      localEntities: [],
      metadata: {
        source: "INS_CENSUS_2022",
        note: "Date statice seed — de înlocuit cu TEMPO API",
        dataSource: "Recensământ 2022 — date statice (TEMPO API integration planificată)",
        lastUpdated: "2022-12-01",
      },
    }
  },
}

export default adapter
