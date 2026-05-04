/**
 * Nomenclator COR — Clasificarea Ocupațiilor din România
 *
 * Sursa: COR 2026 actualizat la 25.03.2026 (ORD. MMFTSS/INS 66/51/2026)
 * 4260 ocupații, cod 6 cifre, importate din cor-2026.json
 *
 * Folosit la:
 * - Generare AI fișe de post → sugestie cod COR
 * - Autocomplete în portal (client caută ocupația)
 * - Mapping benchmark piață → ocupație standardizată
 * - Conformitate: contracte de muncă necesită cod COR
 */

import corData from "./cor-2026.json"

export interface COREntry {
  code: string     // 6 cifre
  name: string     // Denumirea ocupației
  group: string    // Grupa mare (1 cifră)
  groupName: string
}

// Grupe mari COR (nivel 1)
export const COR_GROUPS: Record<string, string> = {
  "1": "Legislatori, înalți funcționari și conducători",
  "2": "Specialiști în diverse domenii de activitate",
  "3": "Tehnicieni și alți specialiști din domeniul tehnic",
  "4": "Funcționari administrativi",
  "5": "Lucrători în domeniul serviciilor",
  "6": "Lucrători calificați în agricultură, silvicultură, pescuit",
  "7": "Meșteșugari și lucrători calificați",
  "8": "Operatori la instalații, mașini și asamblori",
  "9": "Ocupații elementare",
  "0": "Forțele armate",
}

// Nomenclator complet — 4260 ocupații din COR 2026
export const COR_NOMENCLATOR: COREntry[] = (corData as { code: string; name: string }[]).map(e => ({
  code: e.code,
  name: e.name,
  group: e.code[0],
  groupName: COR_GROUPS[e.code[0]] || "Necunoscut",
}))

// Index rapid pe cod (O(1) lookup)
const codeIndex = new Map<string, COREntry>()
for (const entry of COR_NOMENCLATOR) {
  codeIndex.set(entry.code, entry)
  // Index și pe primele 4 cifre (grup de bază ISCO)
  const g4 = entry.code.slice(0, 4)
  if (!codeIndex.has(g4)) codeIndex.set(g4, entry)
}

/**
 * Caută COR după text (titlu post, ocupație) — fuzzy match
 */
export function searchCOR(query: string, limit: number = 10): COREntry[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const words = q.split(/\s+/).filter(w => w.length >= 2)

  if (words.length === 0) return []

  // Scor: câte cuvinte din query apar în denumire
  const scored = COR_NOMENCLATOR
    .map(e => {
      const name = e.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      if (e.code.startsWith(q)) return { entry: e, score: 100 } // exact code match
      const matchCount = words.filter(w => name.includes(w)).length
      return { entry: e, score: matchCount }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(s => s.entry)
}

/**
 * Caută COR exact pe cod (6 cifre sau 4 cifre)
 */
export function getCORByCode(code: string): COREntry | undefined {
  return codeIndex.get(code)
}

/**
 * Sugerează cod COR pe baza titlului postului (mapping heuristic + fuzzy)
 */
export function suggestCOR(jobTitle: string): COREntry[] {
  const t = jobTitle.toLowerCase()

  // Mapping direct titlu → cod COR (cele mai frecvente)
  const TITLE_COR_MAP: Array<{ keywords: string[]; code: string }> = [
    { keywords: ["director general", "ceo", "administrator"], code: "112101" },
    { keywords: ["director financiar", "cfo"], code: "121101" },
    { keywords: ["director hr", "director resurse umane"], code: "121203" },
    { keywords: ["director marketing", "director vanzari"], code: "122101" },
    { keywords: ["director it", "cto", "director tehnic"], code: "133001" },
    { keywords: ["director comercial"], code: "122101" },
    { keywords: ["contabil", "economist"], code: "241101" },
    { keywords: ["analist financiar", "controller"], code: "241301" },
    { keywords: ["specialist hr", "specialist resurse umane"], code: "242301" },
    { keywords: ["specialist marketing", "marketing manager"], code: "243101" },
    { keywords: ["programator", "developer", "software"], code: "251201" },
    { keywords: ["analist sisteme", "business analyst"], code: "251101" },
    { keywords: ["admin sisteme", "sysadmin", "devops"], code: "252201" },
    { keywords: ["avocat", "jurist", "consilier juridic"], code: "261103" },
    { keywords: ["psiholog"], code: "263401" },
    { keywords: ["inginer mecanic"], code: "214401" },
    { keywords: ["inginer constructii", "inginer civil"], code: "214201" },
    { keywords: ["medic"], code: "221201" },
    { keywords: ["asistent medical"], code: "322101" },
    { keywords: ["farmacist"], code: "226201" },
    { keywords: ["profesor", "invatator"], code: "233001" },
    { keywords: ["secretar", "asistent manager"], code: "412001" },
    { keywords: ["operator date", "data entry"], code: "413201" },
    { keywords: ["functionar contabilitate"], code: "431101" },
    { keywords: ["functionar salarizare", "payroll"], code: "431301" },
    { keywords: ["casier"], code: "523001" },
    { keywords: ["vanzator", "consultant vanzari"], code: "521101" },
    { keywords: ["bucatar", "chef"], code: "512001" },
    { keywords: ["chelner", "ospatar"], code: "513102" },
    { keywords: ["agent paza", "bodyguard", "securitate"], code: "516401" },
    { keywords: ["electrician"], code: "741101" },
    { keywords: ["sudor"], code: "721201" },
    { keywords: ["mecanic auto"], code: "723101" },
    { keywords: ["sofer", "conducator auto"], code: "833201" },
    { keywords: ["operator cnc", "strungar", "frezor"], code: "722301" },
    { keywords: ["macaragiu"], code: "834301" },
    { keywords: ["motostivuitorist"], code: "834401" },
    { keywords: ["receptioner"], code: "422601" },
  ]

  const matches: COREntry[] = []
  for (const mapping of TITLE_COR_MAP) {
    if (mapping.keywords.some(kw => t.includes(kw))) {
      const entry = getCORByCode(mapping.code)
      if (entry) matches.push(entry)
    }
  }

  // Dacă nu găsim match direct, facem search fuzzy
  if (matches.length === 0) {
    return searchCOR(jobTitle, 5)
  }

  return matches
}
