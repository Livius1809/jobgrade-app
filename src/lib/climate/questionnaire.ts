/**
 * Chestionar Climat Organizational (CO)
 *
 * 40 itemi, 8 dimensiuni (7+1), scorare pe praguri variabile per dimensiune.
 * Sursa: CO.pdf + foaie_rezultate_CO.xlsx (Owner)
 */

export interface CODimension {
  id: string
  label: string
  description: string
  items: string[]
  // Praguri: [F.Slab max, Slab max, Mediu max, Intens max] — F.Intens = peste ultimul
  thresholds: [number, number, number, number]
}

export const CO_DIMENSIONS: CODimension[] = [
  {
    id: "sarcina",
    label: "Sarcina",
    description: "Modul de definire a sarcinilor si obiectivelor, atat la nivel organizational cat si individual",
    items: [
      "Cunosc și înțeleg obiectivele firmei în care lucrez",
      "Scopurile și obiectivele firmei sunt stabilite în mod precis",
      "Mă simt motivat/stimulat în munca pe care o realizez",
      "Prioritățile acestei firme sunt bine înțelese de către toți angajații",
      "În propria mea arie de activitate, obiectivele sunt clar formulate",
    ],
    thresholds: [4.0, 4.8, 5.4, 6.2],
  },
  {
    id: "structura",
    label: "Structura",
    description: "Modul de organizare a muncii, cu referire la eficienta, flexibilitate si ierarhie",
    items: [
      "Munca este bine organizată în această firmă",
      "Posturile și funcțiile care dau putere decizională ocupantului sunt corect poziționate",
      "Modul în care sarcinile sunt împărțite este flexibil și clar",
      "În permanență se caută noi modalități de a îmbunătăți modul de lucru",
      "Modul de ierarhizare și poziționare a posturilor și funcțiilor este corect",
    ],
    thresholds: [3.6, 4.4, 5.0, 5.8],
  },
  {
    id: "relatiile",
    label: "Relațiile",
    description: "Calitatea relatiilor dintre angajati, cu referire la comunicare, cooperare si gestionarea conflictelor",
    items: [
      "Șefii sunt întotdeauna receptivi la ideile noi",
      "Pot discuta cu ușurință cu colegii problemele legate de activitate",
      "Relațiile cu ceilalți membri ai colectivului sunt bune",
      "Cooperăm în mod eficient pentru îndeplinirea sarcinilor de serviciu",
      "Conflictele sunt rezolvate prin adoptarea unor soluții eficiente",
    ],
    thresholds: [4.2, 4.8, 5.6, 6.2],
  },
  {
    id: "motivatia",
    label: "Motivația",
    description: "Climatul motivational existent in firma, asigurat prin: retributie, dezvoltare, promovare, recompense",
    items: [
      "Sunt încurajat să mă specializez, să-mi dezvolt competențele",
      "Salariul pe care îl primesc este pe masura muncii pe care o desfășor",
      "În această firmă există posibilități de promovare și obținere de beneficii",
      "Încurajarea și recompensa sunt oferite pentru toate sarcinile bine îndeplinite",
      "Performanța muncii fiecărui angajat este verificată la standarde corecte",
    ],
    thresholds: [3.2, 4.0, 4.6, 5.4],
  },
  {
    id: "suportul",
    label: "Suportul",
    description: "Resursele si conditiile de munca pe care le asigura organizatia pentru realizarea sarcinilor",
    items: [
      "Șeful meu are multe idei utile atât pentru munca mea, cât și pentru dezvoltarea mea",
      "Dețin toate informațiile și resursele de care am nevoie pentru a-mi face munca",
      "În această firmă se lucrează după planuri sau planificări realiste",
      "Departamentele, diferitele servicii ale firmei cooperează pe orizontală",
      "Departamentele, diferitele servicii/secții ale firmei cooperează pe verticală",
    ],
    thresholds: [4.0, 4.6, 5.4, 6.2],
  },
  {
    id: "conducerea",
    label: "Conducerea",
    description: "Stilul de conducere eficient, sprijinind performanta individuala si colectiva",
    items: [
      "Șeful meu direct mă încurajează și mă sprijină efectiv în munca mea",
      "Modul de conducere adoptat de șeful direct este util și eficient",
      "Performanța, eficiența activității fiecărui angajat sunt permanent evaluate",
      "Echipa de conducere dă dovadă de un mod de a conduce eficient",
      "Modul de conducere a firmei ne favorizează atingerea performanței",
    ],
    thresholds: [3.8, 4.6, 5.6, 6.2],
  },
  {
    id: "schimbarea",
    label: "Schimbarea",
    description: "Atitudinea generala fata de schimbare a organizatiei reflectata in inovare, adaptabilitate, deschidere",
    items: [
      "Firma este constantă în aplicarea procedurilor de lucru și a standardelor",
      "Verificăm constant felul în care ne realizăm munca și introducem îmbunătățiri",
      "Avem libertatea de a ne schimba modul în care ne ducem la îndeplinire sarcinile",
      "Firma are capacitatea de a suporta schimbări majore",
      "Creativitatea și inițiativa sunt încurajate",
    ],
    thresholds: [3.8, 4.6, 5.4, 6.0],
  },
  {
    id: "performanta",
    label: "Performanța",
    description: "Performanta realizata de catre organizatie, evaluata in functie de obiective, costuri si eficienta",
    items: [
      "Ne atingem obiectivele stabilite în mod constant",
      "Reușim să obținem rezultate bune pentru că angajații sunt motivați",
      "Angajații sunt conștienți de importanța costurilor și caută eficiența",
      "Munca pe care o desfășor este întotdeauna necesară și eficientă",
      "Angajații se străduiesc să muncească eficient",
    ],
    thresholds: [4.2, 4.8, 5.6, 6.0],
  },
]

export type IntensityLevel = "F.SLAB" | "SLAB" | "MEDIU" | "INTENS" | "F.INTENS"

export interface DimensionResult {
  dimensionId: string
  label: string
  mean: number
  level: IntensityLevel
  scores: number[] // scoruri individuale pe 5 itemi
}

export interface COResult {
  respondentCode: string
  respondentGroup: string // PM | NPM | custom
  dimensions: DimensionResult[]
  overallMean: number
  overallLevel: IntensityLevel
}

/**
 * Interpretare scor mediu pe pragurile unei dimensiuni
 */
export function interpretScore(mean: number, thresholds: [number, number, number, number]): IntensityLevel {
  if (mean <= thresholds[0]) return "F.SLAB"
  if (mean <= thresholds[1]) return "SLAB"
  if (mean <= thresholds[2]) return "MEDIU"
  if (mean <= thresholds[3]) return "INTENS"
  return "F.INTENS"
}

/**
 * Scorare completa a unui respondent (40 scoruri → 8 dimensiuni + atitudine generala)
 */
export function scoreRespondent(
  code: string,
  group: string,
  answers: number[] // 40 scoruri (1-7), in ordinea dimensiunilor
): COResult {
  if (answers.length !== 40) {
    throw new Error(`Se asteapta 40 raspunsuri, primit ${answers.length}`)
  }

  const dimensions: DimensionResult[] = CO_DIMENSIONS.map((dim, idx) => {
    const start = idx * 5
    const scores = answers.slice(start, start + 5)
    const mean = Math.round((scores.reduce((s, v) => s + v, 0) / 5) * 10) / 10
    return {
      dimensionId: dim.id,
      label: dim.label,
      mean,
      level: interpretScore(mean, dim.thresholds),
      scores,
    }
  })

  const overallMean = Math.round(
    (dimensions.reduce((s, d) => s + d.mean, 0) / dimensions.length) * 10
  ) / 10

  // Praguri atitudine generala (din Excel R67-R68)
  const overallThresholds: [number, number, number, number] = [3.9, 4.6, 5.2, 5.8]

  return {
    respondentCode: code,
    respondentGroup: group,
    dimensions,
    overallMean,
    overallLevel: interpretScore(overallMean, overallThresholds),
  }
}

/**
 * Agregare colectiva — media pe grupuri
 */
export function aggregateResults(
  results: COResult[],
  groupBy?: string // daca specificat, filtreaza pe grup
): {
  dimensionMeans: Array<{ id: string; label: string; mean: number; level: IntensityLevel }>
  overallMean: number
  overallLevel: IntensityLevel
  respondentCount: number
} {
  const filtered = groupBy ? results.filter(r => r.respondentGroup === groupBy) : results
  if (filtered.length === 0) {
    return { dimensionMeans: [], overallMean: 0, overallLevel: "F.SLAB", respondentCount: 0 }
  }

  const dimensionMeans = CO_DIMENSIONS.map((dim, idx) => {
    const means = filtered.map(r => r.dimensions[idx]?.mean || 0)
    const mean = Math.round((means.reduce((s, v) => s + v, 0) / means.length) * 10) / 10
    return {
      id: dim.id,
      label: dim.label,
      mean,
      level: interpretScore(mean, dim.thresholds),
    }
  })

  const overallMean = Math.round(
    (dimensionMeans.reduce((s, d) => s + d.mean, 0) / dimensionMeans.length) * 10
  ) / 10

  return {
    dimensionMeans,
    overallMean,
    overallLevel: interpretScore(overallMean, [3.9, 4.6, 5.2, 5.8]),
    respondentCount: filtered.length,
  }
}
