/**
 * pitariu-grades.ts — Algoritm Pitariu de formare a claselor salariale normalizate
 *
 * Referință: Pitariu H.D., "Proiectarea fișelor de post",
 *   Tabelul 2.8 (pag. 188) + Fig. 2.6 (pag. 188)
 *
 * Principii fundamentale:
 * 1. Clasele au LĂȚIMI CRESCĂTOARE (progresie geometrică pe punctaj)
 *    - Clasele inferioare sunt mai înguste (diferențe mai fine între posturi simple)
 *    - Clasele superioare sunt mai largi (posturi complexe, diferențe mai greu de distins)
 * 2. Salariile se SUPRAPUN între clase adiacente
 *    - Un angajat experimentat din clasa inferioară poate câștiga mai mult
 *      decât un angajat nou din clasa superioară
 * 3. Fiecare clasă are min, max și punct de mijloc
 *    - Punctele de mijloc urmează o linie de regresie
 *
 * Tabelul 2.8 — exemplu rapoarte lățimi consecutive:
 *   13, 15, 18, 21, 24, 28, 32, 37 → raport mediu ~1.15
 *
 * INTERN — logica de formare a claselor este SECRET DE SERVICIU.
 */

export interface ScorePoint {
  score: number
  salary: number
  label?: string
}

export interface PitariuGrade {
  name: string
  order: number
  scoreMin: number
  scoreMax: number
  scoreMid: number
  salaryMin: number
  salaryMax: number
  salaryMid: number
}

/** Raportul geometric observat din Tabelul 2.8 Pitariu */
const GEOMETRIC_RATIO = 1.15

/** Suprapunere între clase adiacente: 15% din lățimea salarială */
const SALARY_OVERLAP_PCT = 0.15

/**
 * Determină automat numărul de clase pe baza DISPERSIEI scorurilor.
 *
 * Pitariu (pag. 186): "distribuția grupărilor să permită o departajare
 * în funcție de gradul lor de dificultate, dar să nu fie prea mare"
 *
 * Logica:
 * - Coeficientul de variație (CV) al scorurilor indică cât de răspândite sunt
 * - CV mic (scoruri concentrate) → mai puține clase (3-5)
 * - CV mare (scoruri dispersate) → mai multe clase (7-11)
 * - Nr. posturi influențează: nu poți avea mai multe clase decât posturi distincte
 * - Rezultat impar (conveniență: clasă de mijloc clară)
 *
 * Returnează și sugestia + plaja validă pentru UI.
 */
export function autoDetectClassCount(scores: number[]): {
  suggested: number
  min: number
  max: number
  reason: string
} {
  const uniqueScores = [...new Set(scores)].sort((a, b) => a - b)
  const n = uniqueScores.length

  if (n < 3) return { suggested: 3, min: 3, max: 3, reason: "date insuficiente" }

  // Coeficient de variație
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length
  const stdDev = Math.sqrt(variance)
  const cv = mean > 0 ? stdDev / mean : 0

  // Plaja scorurilor vs. gap-uri naturale
  const range = uniqueScores[n - 1] - uniqueScores[0]
  const avgGap = range / (n - 1)
  const gaps = uniqueScores.slice(1).map((v, i) => v - uniqueScores[i])
  const maxGap = Math.max(...gaps)
  const hasNaturalClusters = maxGap > avgGap * 2.5

  // Baza: proporțional cu CV, scalat 3-11
  let base: number
  if (cv < 0.10) {
    base = 3 // Scoruri foarte concentrate
  } else if (cv < 0.20) {
    base = 5
  } else if (cv < 0.30) {
    base = 7
  } else if (cv < 0.40) {
    base = 9
  } else {
    base = 11
  }

  // Ajustare: dacă sunt clustere naturale, +2
  if (hasNaturalClusters && base < 11) {
    base += 2
  }

  // Limită: nu mai multe clase decât posturi unice
  const maxClasses = Math.min(11, Math.max(3, n - 1))
  const minClasses = 3

  // Forțare impar
  let suggested = Math.min(base, maxClasses)
  if (suggested % 2 === 0) suggested = Math.max(minClasses, suggested - 1)

  const reason = cv < 0.15
    ? "scoruri concentrate (CV=" + (cv * 100).toFixed(0) + "%)"
    : cv < 0.30
      ? "dispersie moderată (CV=" + (cv * 100).toFixed(0) + "%)"
      : "dispersie mare (CV=" + (cv * 100).toFixed(0) + "%)"

  return {
    suggested,
    min: minClasses,
    max: maxClasses % 2 === 0 ? maxClasses - 1 : maxClasses,
    reason,
  }
}

/**
 * Construiește clasele salariale conform algoritmului Pitariu.
 *
 * @param points - Lista de (scor, salariu) pentru fiecare post/angajat
 * @param numClasses - Nr. de clase (opțional, auto-detectat dacă lipsește)
 * @returns Lista de clase ordonate ascendent
 */
export function buildPitariuGrades(
  points: ScorePoint[],
  numClasses?: number,
): PitariuGrade[] {
  if (points.length < 2) return []

  const validPoints = points.filter(p => p.score > 0)
  if (validPoints.length < 2) return []

  const scores = validPoints.map(p => p.score).sort((a, b) => a - b)
  const minScore = scores[0]
  const maxScore = scores[scores.length - 1]
  const totalRange = maxScore - minScore

  if (totalRange <= 0) return []

  const detection = autoDetectClassCount(validPoints.map(p => p.score))
  const n = numClasses ?? detection.suggested
  const r = GEOMETRIC_RATIO

  // --- Pas 1: Granițe de clasă pe scoruri (progresie geometrică) ---
  // Suma seriei geometrice: S = w1 * (r^n - 1) / (r - 1)
  // => w1 = totalRange * (r - 1) / (r^n - 1)
  const rPowN = Math.pow(r, n)
  const firstWidth = totalRange * (r - 1) / (rPowN - 1)

  const boundaries: number[] = [minScore]
  for (let i = 0; i < n; i++) {
    const width = firstWidth * Math.pow(r, i)
    boundaries.push(Math.round(boundaries[i] + width))
  }
  // Corectare capăt: ultima graniță = scorul maxim
  boundaries[n] = maxScore

  // --- Pas 2: Regresie liniară scor→salariu (pe toate punctele) ---
  const withSalary = validPoints.filter(p => p.salary > 0)
  const reg = linearRegression(
    withSalary.map(p => p.score),
    withSalary.map(p => p.salary),
  )

  // --- Pas 3: Construire clase cu salariu min/max ---
  const grades: PitariuGrade[] = []

  for (let i = 0; i < n; i++) {
    const scoreMin = boundaries[i]
    const scoreMax = boundaries[i + 1]
    const scoreMid = (scoreMin + scoreMax) / 2

    // Salarii din punctele care cad în această clasă
    const classPoints = withSalary.filter(p => p.score >= scoreMin && p.score <= scoreMax)
    const classSalaries = classPoints.map(p => p.salary)

    let salaryMin: number
    let salaryMax: number

    if (classSalaries.length >= 2) {
      // Date reale suficiente
      salaryMin = Math.min(...classSalaries)
      salaryMax = Math.max(...classSalaries)
    } else if (classSalaries.length === 1) {
      // Un singur punct — construim interval simetric pe baza regresiei
      const regVal = reg.slope * scoreMid + reg.intercept
      const spread = Math.abs(regVal) * 0.15
      salaryMin = Math.min(classSalaries[0], regVal - spread)
      salaryMax = Math.max(classSalaries[0], regVal + spread)
    } else {
      // Clasă fără date — interpolare din regresie
      const regVal = reg.slope * scoreMid + reg.intercept
      const spread = Math.abs(regVal) * 0.15
      salaryMin = Math.max(0, regVal - spread)
      salaryMax = regVal + spread
    }

    grades.push({
      name: `Clasă ${i + 1}`,
      order: i + 1,
      scoreMin,
      scoreMax,
      scoreMid,
      salaryMin: Math.round(salaryMin),
      salaryMax: Math.round(salaryMax),
      salaryMid: Math.round((salaryMin + salaryMax) / 2),
    })
  }

  // --- Pas 4: Aplicare suprapunere salarială între clase adiacente ---
  // Pitariu Fig. 2.6: clasele se suprapun — maxim clasă i > minim clasă i+1
  for (let i = 0; i < grades.length - 1; i++) {
    const current = grades[i]
    const next = grades[i + 1]
    const overlapAmount = (current.salaryMax - current.salaryMin) * SALARY_OVERLAP_PCT

    // Extinde maximul clasei curente în sus
    // și minimul clasei următoare în jos
    if (current.salaryMax < next.salaryMin) {
      // Nu se suprapun natural — forțăm suprapunere
      const gap = next.salaryMin - current.salaryMax
      current.salaryMax += Math.round(gap / 2 + overlapAmount)
      next.salaryMin -= Math.round(gap / 2 + overlapAmount)
    }
    // Dacă deja se suprapun natural, lăsăm așa (e corect Pitariu)
  }

  // Recalculează mediile după ajustarea suprapunerilor
  for (const g of grades) {
    g.salaryMid = Math.round((g.salaryMin + g.salaryMax) / 2)
  }

  return grades
}

/**
 * Normalizează un scor pe X: fiecare clasă = 1 unitate vizuală.
 * Scorul este mapat liniar în interiorul clasei sale.
 */
export function normalizeScoreX(score: number, grades: PitariuGrade[]): number {
  for (let i = 0; i < grades.length; i++) {
    if (score >= grades[i].scoreMin && score <= grades[i].scoreMax) {
      const range = grades[i].scoreMax - grades[i].scoreMin
      return i + (range > 0 ? (score - grades[i].scoreMin) / range : 0.5)
    }
  }
  // Sub prima clasă
  if (score < grades[0].scoreMin) {
    const range = grades[0].scoreMax - grades[0].scoreMin
    return range > 0 ? (score - grades[0].scoreMin) / range : 0
  }
  // Peste ultima clasă
  const last = grades[grades.length - 1]
  const range = last.scoreMax - last.scoreMin
  return grades.length - 1 + (range > 0 ? (score - last.scoreMin) / range : 1)
}

/**
 * Normalizează un salariu pe Y relativ la clasa sa.
 * Returnează valoare 0-1 (0 = min clasă, 1 = max clasă).
 * Poate depăși [0,1] dacă salariul e în afara limitelor clasei.
 */
export function normalizeSalaryInGrade(
  salary: number,
  grade: PitariuGrade,
): number {
  const range = grade.salaryMax - grade.salaryMin
  if (range <= 0) return 0.5
  return (salary - grade.salaryMin) / range
}

/**
 * Construiește datele de regresie pentru cele 3 linii Pitariu.
 * Returnează puncte de-a lungul axei X normalizate.
 */
export function buildRegressionLines(grades: PitariuGrade[]): Array<{
  normX: number
  regMin: number | null
  regMax: number | null
  regMid: number | null
}> {
  if (grades.length < 2) return []

  // Regresie pe midpoint-urile claselor
  const midpoints = grades.map((g, i) => ({
    x: i + 0.5,
    yMin: g.salaryMin,
    yMax: g.salaryMax,
    yMid: g.salaryMid,
  }))

  const regMin = linearRegression(
    midpoints.map(p => p.x),
    midpoints.map(p => p.yMin),
  )
  const regMax = linearRegression(
    midpoints.map(p => p.x),
    midpoints.map(p => p.yMax),
  )
  const regMid = linearRegression(
    midpoints.map(p => p.x),
    midpoints.map(p => p.yMid),
  )

  // Punct de intersecție min↔max (tăiem liniile aici)
  const slopeDiff = regMax.slope - regMin.slope
  const intersectX = Math.abs(slopeDiff) > 0.0001
    ? (regMin.intercept - regMax.intercept) / slopeDiff
    : -Infinity

  const n = grades.length
  const steps = 31
  return Array.from({ length: steps }, (_, i) => {
    const x = -0.3 + (n + 0.6) * (i / (steps - 1))
    const yMin = regMin.slope * x + regMin.intercept
    const yMax = regMax.slope * x + regMax.intercept
    const yMid = regMid.slope * x + regMid.intercept
    const visible = x >= intersectX

    return {
      normX: Math.round(x * 100) / 100,
      regMin: visible ? Math.round(Math.min(yMin, yMax)) : null,
      regMax: visible ? Math.round(Math.max(yMin, yMax)) : null,
      regMid: visible ? Math.round(yMid) : null,
    }
  })
}

// --- Utilitar intern: regresie liniară (least squares) ---

interface RegressionResult {
  slope: number
  intercept: number
}

function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const n = xs.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }

  const sumX = xs.reduce((s, v) => s + v, 0)
  const sumY = ys.reduce((s, v) => s + v, 0)
  const sumXX = xs.reduce((s, v) => s + v * v, 0)
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0)

  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 0.001) {
    return { slope: 0, intercept: sumY / n }
  }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}
