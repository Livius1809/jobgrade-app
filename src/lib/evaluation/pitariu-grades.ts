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

export interface PitariuStep {
  stepNumber: number
  name: string
  salary: number
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
  steps: PitariuStep[]
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
export interface ClassDetection {
  suggested: number
  min: number
  max: number
  cv: number       // coeficient de variație (0-1)
  cvPercent: number // cv * 100, rotunjit
  reason: string
}

export function autoDetectClassCount(scores: number[]): ClassDetection {
  const uniqueScores = [...new Set(scores)].sort((a, b) => a - b)
  const n = uniqueScores.length

  if (n < 3) return { suggested: 3, min: 3, max: 3, cv: 0, cvPercent: 0, reason: "date insuficiente" }

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

  // Sugestia = minimul intervalului recomandat pentru nivelul de dispersie
  // Clientul poate crește de acolo dacă dorește mai multă granularitate
  let suggested: number
  if (cv < 0.15) {
    suggested = 3  // Dispersie redusă: interval 3-5, pornim de la 3
  } else if (cv < 0.30) {
    suggested = 5  // Dispersie moderată: interval 5-7, pornim de la 5
  } else {
    suggested = 7  // Dispersie mare: interval 7-11, pornim de la 7
  }

  const minClasses = 3
  // Sugestia vine direct din dispersie — fără limită pe nr. posturi.
  // Algoritmul de formare clase funcționează cu oricâte clase.

  const reason = cv < 0.15
    ? "scoruri concentrate (CV=" + (cv * 100).toFixed(0) + "%)"
    : cv < 0.30
      ? "dispersie moderată (CV=" + (cv * 100).toFixed(0) + "%)"
      : "dispersie mare (CV=" + (cv * 100).toFixed(0) + "%)"

  return {
    suggested,
    min: minClasses,
    max: 11,
    cv,
    cvPercent: Math.round(cv * 100),
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
/**
 * Generează treptele salariale uniform distribuite în interiorul unei clase.
 *
 * @param salaryMin - Minimul clasei
 * @param salaryMax - Maximul clasei
 * @param numSteps - Nr. de trepte dorit (2-10)
 * @param classOrder - Nr. clasei (pentru naming)
 * @returns Lista de trepte cu salariul corespunzător
 */
export function buildStepsForGrade(
  salaryMin: number,
  salaryMax: number,
  numSteps: number,
  classOrder: number,
): PitariuStep[] {
  const clamped = Math.max(2, Math.min(10, numSteps))
  const steps: PitariuStep[] = []
  for (let s = 0; s < clamped; s++) {
    const salary = clamped === 1
      ? (salaryMin + salaryMax) / 2
      : salaryMin + (salaryMax - salaryMin) * (s / (clamped - 1))
    steps.push({
      stepNumber: s + 1,
      name: `C${classOrder} T${s + 1}`,
      salary: Math.round(salary),
    })
  }
  return steps
}

/**
 * Construiește clasele salariale conform algoritmului Pitariu.
 *
 * @param points - Lista de (scor, salariu) pentru fiecare post/angajat
 * @param numClasses - Nr. de clase (opțional, auto-detectat dacă lipsește)
 * @param numSteps - Nr. de trepte per clasă (opțional, default 4)
 * @returns Lista de clase ordonate ascendent
 */
export function buildPitariuGrades(
  points: ScorePoint[],
  numClasses?: number,
  numSteps: number = 4,
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

  // --- Pas 1: Granițe de clasă pe scoruri — INTERVALE EGALE ---
  // X e normalizat vizual (fiecare clasă = 1 unitate),
  // deci clasele au lățime egală pe axa punctajelor.
  const classWidth = totalRange / n
  const boundaries: number[] = []
  for (let i = 0; i <= n; i++) {
    boundaries.push(Math.round(minScore + classWidth * i))
  }
  // Corectare capete exacte
  boundaries[0] = minScore
  boundaries[n] = maxScore

  // --- Pas 2: Regresie liniară scor→salariu (pe toate punctele cu salariu) ---
  const withSalary = validPoints.filter(p => p.salary > 0)
  const reg = linearRegression(
    withSalary.map(p => p.score),
    withSalary.map(p => p.salary),
  )

  // --- Pas 3: Înălțimea dreptunghiurilor crește geometric (factor 1.15) ---
  // Pitariu Fig 2.6: progresie geometrică pe VERTICALĂ (interval salarial).
  // Clasa 1 are cea mai mică înălțime, clasa n cea mai mare.
  //
  // Calculăm înălțimea de bază (h1) astfel încât dreptunghiurile
  // să acopere corect variația reală a salariilor.
  //
  // Salariul de pe linia de regresie la mijlocul fiecărei clase = centrul dreptunghiului.
  // Înălțimea clasei i = h1 * r^(i-1)

  // Estimăm h1 din dispersia reală a salariilor
  const salaryValues = withSalary.map(p => p.salary)
  const salaryRange = salaryValues.length > 1
    ? Math.max(...salaryValues) - Math.min(...salaryValues)
    : Math.abs(reg.slope * totalRange) // fallback din pantă

  // Suma seriei geometrice a înălțimilor: S = h1 * (r^n - 1) / (r - 1)
  // Vrem ca suma vizuală să acopere ~80% din variația reală
  const rPowN = Math.pow(r, n)
  const h1 = (salaryRange * 0.8 * (r - 1)) / (rPowN - 1) / n * 2

  // --- Pas 4: Construire clase cu monotonie garantată ---
  const grades: PitariuGrade[] = []

  for (let i = 0; i < n; i++) {
    const scoreMin = boundaries[i]
    const scoreMax = boundaries[i + 1]
    const scoreMid = (scoreMin + scoreMax) / 2

    // Centrul dreptunghiului = salariul de pe linia de regresie
    const regCenter = reg.slope * scoreMid + reg.intercept

    // Înălțimea clasei i crește geometric
    const height = h1 * Math.pow(r, i)
    const halfH = height / 2

    let salaryMin = regCenter - halfH
    let salaryMax = regCenter + halfH

    // Monotonie: salaryMin și salaryMax cresc obligatoriu față de clasa anterioară
    if (i > 0) {
      const prev = grades[i - 1]
      // Minim curent >= minim anterior (crește)
      if (salaryMin < prev.salaryMin) {
        salaryMin = prev.salaryMin + height * 0.05
      }
      // Maxim curent >= maxim anterior (crește)
      if (salaryMax <= prev.salaryMax) {
        salaryMax = prev.salaryMax + height * 0.1
        // Ajustăm minimul proporțional
        salaryMin = salaryMax - height
      }
    }

    // Suprapunere naturală Pitariu: maxim clasă i > minim clasă i
    // (se întâmplă automat dacă centrele sunt suficient de apropiate)

    const roundedMin = Math.round(Math.max(0, salaryMin))
    const roundedMax = Math.round(salaryMax)

    grades.push({
      name: `Clasă ${i + 1}`,
      order: i + 1,
      scoreMin,
      scoreMax,
      scoreMid,
      salaryMin: roundedMin,
      salaryMax: roundedMax,
      salaryMid: Math.round((salaryMin + salaryMax) / 2),
      steps: buildStepsForGrade(roundedMin, roundedMax, numSteps, i + 1),
    })
  }

  // --- Pas 5: Suprapunere între clase adiacente ---
  // Pitariu Fig. 2.6: maxim clasa i > minim clasa i+1
  // Verificăm și forțăm dacă nu există natural
  for (let i = 0; i < grades.length - 1; i++) {
    const current = grades[i]
    const next = grades[i + 1]

    if (current.salaryMax < next.salaryMin) {
      // Forțăm suprapunere: extinde ambele spre zona de contact
      const gap = next.salaryMin - current.salaryMax
      const overlap = (current.salaryMax - current.salaryMin) * SALARY_OVERLAP_PCT
      current.salaryMax += Math.round(gap / 2 + overlap)
      next.salaryMin -= Math.round(gap / 2 + overlap)
      current.salaryMid = Math.round((current.salaryMin + current.salaryMax) / 2)
      next.salaryMid = Math.round((next.salaryMin + next.salaryMax) / 2)
    }
  }

  // --- Pas 6: Monotonie finală pe înălțime (h_i >= h_{i-1}) ---
  // Pitariu: clasele superioare au OBLIGATORIU interval salarial mai larg.
  // Ajustările de suprapunere pot deforma proporțiile — le corectăm.
  for (let i = 1; i < grades.length; i++) {
    const prevHeight = grades[i - 1].salaryMax - grades[i - 1].salaryMin
    const currHeight = grades[i].salaryMax - grades[i].salaryMin
    if (currHeight < prevHeight) {
      // Extindem simetric ca height-ul să fie cel puțin prevHeight * r
      const targetHeight = Math.round(prevHeight * r)
      const center = (grades[i].salaryMin + grades[i].salaryMax) / 2
      grades[i].salaryMin = Math.round(center - targetHeight / 2)
      grades[i].salaryMax = Math.round(center + targetHeight / 2)
      grades[i].salaryMid = Math.round(center)
    }
  }

  // --- Pas 7: Regenerare trepte după ajustările de suprapunere și monotonie ---
  for (const grade of grades) {
    grade.steps = buildStepsForGrade(grade.salaryMin, grade.salaryMax, numSteps, grade.order)
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
