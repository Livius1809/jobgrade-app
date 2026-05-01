/**
 * Adaptor OpenStreetMap Overpass — POI-uri locale cu GPS
 *
 * Sursa: Overpass API (gratuit, fără auth)
 * Date: magazine, farmacii, școli, restaurante, benzinării, bănci, ATM-uri
 * Toate cu coordonate GPS exacte.
 *
 * Query per bounding box (Medgidia: ~44.22-44.27 lat, ~28.24-28.30 lon)
 */

import type { CrawlAdapter, CrawlOutput } from "../engine"

// Bounding box Medgidia (aproximativ)
const MEDGIDIA_BBOX = {
  south: 44.22,
  west: 28.24,
  north: 44.27,
  east: 28.30,
}

// Tipuri de POI de interes
const POI_QUERIES = [
  { osmTag: "amenity=pharmacy", type: "PHARMACY", category: "Farmacie" },
  { osmTag: "amenity=bank", type: "BANK", category: "Bancă" },
  { osmTag: "amenity=atm", type: "ATM", category: "ATM" },
  { osmTag: "amenity=restaurant", type: "RESTAURANT", category: "Restaurant" },
  { osmTag: "amenity=cafe", type: "CAFE", category: "Cafenea" },
  { osmTag: "amenity=fuel", type: "GAS_STATION", category: "Benzinărie" },
  { osmTag: "amenity=school", type: "SCHOOL", category: "Școală" },
  { osmTag: "amenity=kindergarten", type: "KINDERGARTEN", category: "Grădiniță" },
  { osmTag: "amenity=hospital", type: "HOSPITAL", category: "Spital" },
  { osmTag: "amenity=clinic", type: "CLINIC", category: "Clinică" },
  { osmTag: "amenity=dentist", type: "DENTIST", category: "Cabinet dentar" },
  { osmTag: "amenity=doctors", type: "DOCTOR", category: "Cabinet medical" },
  { osmTag: "shop=supermarket", type: "SUPERMARKET", category: "Supermarket" },
  { osmTag: "shop=convenience", type: "SHOP", category: "Magazin alimentar" },
  { osmTag: "amenity=post_office", type: "POST_OFFICE", category: "Oficiu poștal" },
  { osmTag: "amenity=place_of_worship", type: "WORSHIP", category: "Lăcaș de cult" },
]

const OVERPASS_URL = "https://overpass-api.de/api/interpreter"

const adapter: CrawlAdapter = {
  name: "OSM_OVERPASS",

  async crawl(_config: any): Promise<CrawlOutput> {
    const territory = "MEDGIDIA"
    const localEntities: CrawlOutput["localEntities"] = []
    const territorialData: CrawlOutput["territorialData"] = []
    const { south, west, north, east } = MEDGIDIA_BBOX

    // Construim query Overpass pentru toate tipurile de POI
    const tagFilters = POI_QUERIES.map(p => {
      const [k, v] = p.osmTag.split("=")
      return `node["${k}"="${v}"](${south},${west},${north},${east});`
    }).join("\n")

    const query = `[out:json][timeout:30];(\n${tagFilters}\n);out body;`

    try {
      const res = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      })

      if (!res.ok) throw new Error(`Overpass API: ${res.status}`)

      const data = await res.json()
      const elements = data.elements || []

      for (const el of elements) {
        if (!el.lat || !el.lon || !el.tags) continue

        // Determinăm tipul
        const poiType = POI_QUERIES.find(p => {
          const [k, v] = p.osmTag.split("=")
          return el.tags[k] === v
        })
        if (!poiType) continue

        const name = el.tags.name || el.tags["name:ro"] || poiType.category
        const address = [el.tags["addr:street"], el.tags["addr:housenumber"]].filter(Boolean).join(" ") || undefined

        localEntities.push({
          territory,
          type: poiType.type,
          name,
          category: poiType.category,
          address,
          latitude: el.lat,
          longitude: el.lon,
          phone: el.tags.phone || el.tags["contact:phone"] || undefined,
          website: el.tags.website || el.tags["contact:website"] || undefined,
          sourceId: `osm_${el.id}`,
          metadata: { osmId: el.id, osmTags: el.tags },
        })
      }

      // Statistici per tip
      const typeCounts: Record<string, number> = {}
      for (const le of localEntities) {
        typeCounts[le.type] = (typeCounts[le.type] || 0) + 1
      }

      for (const [type, count] of Object.entries(typeCounts)) {
        territorialData.push({
          territory, category: "INFRASTRUCTURE", subcategory: "POI_COUNTS", key: `poi_${type.toLowerCase()}`,
          value: String(count), numericValue: count, unit: "unități",
          periodYear: new Date().getFullYear(), confidence: 0.85,
          sourceUrl: "https://overpass-api.de/",
        })
      }

      return {
        territorialData,
        localEntities,
        metadata: { source: "OSM_OVERPASS", totalPOIs: localEntities.length, typeCounts },
      }
    } catch (e: any) {
      // Fallback: returnează date goale (nu blochează crawl-ul)
      console.error("[OSM_OVERPASS] Error:", e.message)
      return { territorialData: [], localEntities: [], metadata: { error: e.message } }
    }
  },
}

export default adapter
