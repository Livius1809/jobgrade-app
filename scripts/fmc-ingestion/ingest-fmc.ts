/**
 * FMC Ingestion Script
 *
 * Citește datele celor 12 subiecți din:
 * - centralizator.xlsx (CPI, AMI, HBDI, MBTI)
 * - foaie_rezultate_CO.xlsx (Climat Organizațional)
 * - PDF-uri ESQ-2 individuale
 *
 * Output: JSON unificat per persoană, aliniat la NormalizedScore din score-normalizer.ts
 */

import * as fs from "fs"
import * as path from "path"
import ExcelJS from "exceljs"
import { PDFParse } from "pdf-parse"
import {
  stanineToT,
  centileToT,
  tScoreToLevel,
  type NormalizedScore,
} from "../../src/lib/profiling/score-normalizer"

// ── Configurare căi ──────────────────────────────────────────

const BASE_PATH = "Z:/PROCES dezvoltarea organizatiei"
const FMC_DIR = `${BASE_PATH}/6. Rapoarte individuale/FMC`
const DO_FMC_DIR = `${BASE_PATH}/DO_FMC`
const CENTRALIZATOR = `${DO_FMC_DIR}/centralizator.xlsx`
const CO_FILE = `${DO_FMC_DIR}/foaie_rezultate_CO.xlsx`
const OUTPUT_DIR = path.resolve(__dirname, "output")

// ── Mapping subiecți (director → nume în centralizator) ──────

const SUBJECTS = [
  // Anonymized: P01-P12 (original names removed for privacy)
  { dir: "1.P01", name: "P01", sex: "F", age: 41 },
  { dir: "2.P02", name: "P02", sex: "F", age: 47 },
  { dir: "3.P03", name: "P03", sex: "F", age: 40 },
  { dir: "4.P04", name: "P04", sex: "F", age: 42 },
  { dir: "5.P05", name: "P05", sex: "F", age: 53 },
  { dir: "6.P06", name: "P06", sex: "M", age: 0 },
  { dir: "7.P07", name: "P07", sex: "F", age: 46 },
  { dir: "8.P08", name: "P08", sex: "M", age: 26 },
  { dir: "9.P09", name: "P09", sex: "F", age: 32 },
  { dir: "10.P10", name: "P10", sex: "M", age: 25 },
  { dir: "11.P11", name: "P11", sex: "F", age: 47 },
  { dir: "12.P12", name: "P12", sex: "F", age: 47 },
]

// ── Tipuri interne ──────────────────────────────────────────

interface SubjectProfile {
  code: string
  name: string
  sex: string
  age: number
  cpi: Record<string, number> // scaleName → T-score
  cpiCuboid: { type: string; level: number }
  ami: Record<string, number> // scaleName → stanine
  hbdi: { A: number; B: number; C: number; D: number } // scoruri cadrane
  mbti: { type: string; scores: Record<string, number> }
  esq: Record<string, number> // dimensiune → centilă
  co: Record<string, number> // dimensiune → medie 1-7
  normalized: NormalizedScore[] // toate scorurile normalizate
}

// ── CPI260 Scale ──────────────────────────────────────────

const CPI_SCALES = [
  { row: 2, code: "DO", name: "Dominanța" },
  { row: 3, code: "CS", name: "Capacitate de statut" },
  { row: 4, code: "SY", name: "Sociabilitate" },
  { row: 5, code: "SP", name: "Prezență socială" },
  { row: 6, code: "SA", name: "Acceptare de sine" },
  { row: 7, code: "IN", name: "Independență" },
  { row: 8, code: "EM", name: "Empatie" },
  { row: 9, code: "RE", name: "Responsabilitate" },
  { row: 10, code: "SO", name: "Conformism social" },
  { row: 11, code: "SC", name: "Autocontrol" },
  { row: 12, code: "GI", name: "Impresie bună" },
  { row: 13, code: "CM", name: "Comunalitate" },
  { row: 14, code: "WB", name: "Sănătate" },
  { row: 15, code: "TO", name: "Toleranță" },
  { row: 16, code: "AC", name: "Realizarea prin conformism" },
  { row: 17, code: "AI", name: "Realizarea prin independență" },
  { row: 18, code: "CF", name: "Eficiență intelectuală" },
  { row: 19, code: "IS", name: "Intuiție psihologică" },
  { row: 20, code: "FX", name: "Flexibilitate" },
  { row: 21, code: "SN", name: "Feminitate/Masculinitate" },
  // Scale vectoriale (row 22-24 au format diferit)
  { row: 25, code: "MP", name: "Potențial managerial" },
  { row: 26, code: "WO", name: "Orientare spre muncă" },
  { row: 27, code: "CT", name: "Temperament creativ" },
  { row: 28, code: "LP", name: "Leadership" },
  { row: 29, code: "AMI_CPI", name: "Amabilitate" },
  { row: 30, code: "LEO", name: "Orientare spre aplicarea legii" },
  { row: 31, code: "TM", name: "Obiectivitate în gândire" },
  { row: 32, code: "B-MS", name: "Baucom Masculinitate" },
  { row: 33, code: "B-FM", name: "Baucom Feminitate" },
  { row: 34, code: "ANX", name: "Anxietate" },
  { row: 35, code: "NAR", name: "Narcisism" },
  { row: 36, code: "D-SD", name: "Dezirabilitate socială" },
  { row: 37, code: "D-AC", name: "Afirmare necondiționată" },
  { row: 38, code: "HOS", name: "Ostilitate" },
  { row: 39, code: "FF", name: "Luptător" },
]

// ── AMI Scale ──────────────────────────────────────────

const AMI_SCALES = [
  { row: 2, code: "BE", name: "Perseverența" },
  { row: 3, code: "DO", name: "Dominanța" },
  { row: 4, code: "EN", name: "Angajamentul" },
  { row: 5, code: "EZ", name: "Siguranța succesului" },
  { row: 6, code: "FX", name: "Flexibilitatea" },
  { row: 7, code: "FL", name: "Absorbirea" },
  { row: 8, code: "FU", name: "Neînfricarea" },
  { row: 9, code: "IN", name: "Internalitatea" },
  { row: 10, code: "KA", name: "Efortul compensator" },
  { row: 11, code: "LS", name: "Mândria performanței" },
  { row: 12, code: "LB", name: "Dorința de învățare" },
  { row: 13, code: "SP", name: "Preferința pentru dificultate" },
  { row: 14, code: "SE", name: "Independența" },
  { row: 15, code: "SK", name: "Autocontrolul și autodisciplina" },
]

// Notă: centralizatorul AMI are 14 scale (nu 17 — posibil lipsesc ultimele 3)

// ── ESQ-2 Dimensiuni ──────────────────────────────────────

const ESQ_POSITIVE = [
  "Orientare spre Client",
  "Productivitate",
  "Acuratete",
  "Satisfactia Muncii",
  "Promovabilitate",
]

const ESQ_RISK = [
  "Consum de Alcool si de alte Substante",
  "Concediu Medical Neautorizat",
  "Infractiuni Rutiere",
  "Intarzieri",
  "Indolenta",
  "Sabotaj al Productiei sau al Proprietatii",
  "Nerespectarea Protectiei Muncii",
  "Furt",
]

const ESQ_GENERAL = ["Risc de Comportament Contraproductiv", "Recomandare Generala de Angajare"]

// ── Funcții citire Excel ──────────────────────────────────

/**
 * Coloana per subiect în sheet-ul CPI:
 * P01=5, P02=6, P03=7, P04=8, P05=9,
 * P06=10, P07=11, P08=12, P09=13, P10=14, P11=15, P12=16
 */
const CPI_COL_MAP: Record<string, number> = {
  P01: 5,
  P02: 6,
  P03: 7,
  P04: 8,
  P05: 9,
  P06: 10,
  "P07": 11,
  P08: 12,
  P09: 13,
  P10: 14,
  P11: 15,
  P12: 16,
}

/**
 * Coloana per subiect în sheet-ul AMI:
 * P12=4, P01=5, P02=6, P03=7, P04=8, P05=9,
 * P06=10, P07=11, P08=12, P09=13, P10=14, P11=15
 */
const AMI_COL_MAP: Record<string, number> = {
  P12: 4,
  P01: 5,
  P02: 6,
  P03: 7,
  P04: 8,
  P05: 9,
  P06: 10,
  "P07": 11,
  P08: 12,
  P09: 13,
  P10: 14,
  P11: 15,
}

async function readCPI(wb: ExcelJS.Workbook): Promise<Record<string, Record<string, number>>> {
  const ws = wb.getWorksheet("CPI")!
  const result: Record<string, Record<string, number>> = {}

  for (const [name, col] of Object.entries(CPI_COL_MAP)) {
    result[name] = {}
    for (const scale of CPI_SCALES) {
      const cell = ws.getRow(scale.row).getCell(col)
      const val = cell.value
      if (typeof val === "number") {
        result[name][scale.code] = val
      }
    }
  }

  return result
}

async function readCPICuboid(wb: ExcelJS.Workbook): Promise<Record<string, { type: string; level: number }>> {
  const ws = wb.getWorksheet("CPI")!
  const result: Record<string, { type: string; level: number }> = {}

  for (const [name, col] of Object.entries(CPI_COL_MAP)) {
    // Row 22 = V1/V2 (tip cuboid), Row 24 = V3 (nivel integrare)
    const typeCell = ws.getRow(22).getCell(col).value
    const levelCell = ws.getRow(24).getCell(col).value
    result[name] = {
      type: String(typeCell || "necunoscut"),
      level: typeof levelCell === "number" ? levelCell : 0,
    }
  }

  return result
}

async function readAMI(wb: ExcelJS.Workbook): Promise<Record<string, Record<string, number>>> {
  const ws = wb.getWorksheet("AMI")!
  const result: Record<string, Record<string, number>> = {}

  for (const [name, col] of Object.entries(AMI_COL_MAP)) {
    result[name] = {}
    for (const scale of AMI_SCALES) {
      const cell = ws.getRow(scale.row).getCell(col)
      const val = cell.value
      if (typeof val === "number") {
        result[name][scale.code] = val
      }
    }
  }

  return result
}

async function readHBDI(wb: ExcelJS.Workbook): Promise<Record<string, { A: number; B: number; C: number; D: number }>> {
  const ws = wb.getWorksheet("HBDI")!
  const result: Record<string, { A: number; B: number; C: number; D: number }> = {}

  // Scorurile HBDI sunt PRE-CALCULATE în coloanele 77-80 ale centralizatorului:
  // Col 77 = Co S (Cortex Stâng = A Analitic)
  // Col 78 = Li S (Limbic Stâng = B Organizat)
  // Col 79 = Li D (Limbic Drept = C Interpersonal)
  // Col 80 = Co D (Cortex Drept = D Vizionar)
  // Aceste scoruri sunt calculate cu cheia reală de scorare CPA (mapare itemi→cadran proprietară)

  for (let r = 2; r <= 14; r++) {
    const row = ws.getRow(r)
    const tag = String(row.getCell(1).value || "")
    const name = String(row.getCell(2).value || "").trim()

    if (tag !== "FMC" || !name) continue

    // Citim scorurile calculate (pot fi formule → accesăm .result)
    const getVal = (col: number): number => {
      const cell = row.getCell(col)
      if (typeof cell.value === "number") return cell.value
      if (cell.value && typeof cell.value === "object" && "result" in cell.value) {
        return (cell.value as any).result || 0
      }
      return cell.result || 0
    }

    result[name] = {
      A: getVal(77), // Co S — Cortex Stâng (Analitic)
      B: getVal(78), // Li S — Limbic Stâng (Organizat)
      C: getVal(79), // Li D — Limbic Drept (Interpersonal)
      D: getVal(80), // Co D — Cortex Drept (Vizionar)
    }
  }

  return result
}

async function readMBTI(wb: ExcelJS.Workbook): Promise<Record<string, { type: string; scores: Record<string, number> }>> {
  const ws = wb.getWorksheet("MBTI")!
  const result: Record<string, { type: string; scores: Record<string, number> }> = {}

  // Row 1 = header (E, I, S, N, T, F, J, P)
  // Rows 2-13 = subiecți
  for (let r = 2; r <= 13; r++) {
    const row = ws.getRow(r)
    const name = String(row.getCell(2).value || "").trim()
    if (!name) continue

    const E = Number(row.getCell(5).value) || 0
    const I = Number(row.getCell(6).value) || 0
    const S = Number(row.getCell(7).value) || 0
    const N = Number(row.getCell(8).value) || 0
    const T = Number(row.getCell(9).value) || 0
    const F = Number(row.getCell(10).value) || 0
    const J = Number(row.getCell(11).value) || 0
    const P = Number(row.getCell(12).value) || 0

    // Tipul MBTI: litera cu scorul mai mare pe fiecare axă
    const type = `${E > I ? "E" : "I"}${S > N ? "S" : "N"}${T > F ? "T" : "F"}${J > P ? "J" : "P"}`

    result[name] = {
      type,
      scores: { E, I, S, N, T, F, J, P },
    }
  }

  return result
}

// ── Parser ESQ-2 din PDF ──────────────────────────────────

// Dimensiuni valide ESQ-2 (filtru contra artefactelor PDF)
const VALID_ESQ_DIMS = new Set([
  ...ESQ_POSITIVE,
  ...ESQ_RISK,
  ...ESQ_GENERAL,
])

async function parseESQ(pdfPath: string): Promise<Record<string, number>> {
  const buf = new Uint8Array(fs.readFileSync(pdfPath))
  const parser = new PDFParse(buf)
  await parser.load()
  const result = await parser.getText()

  const scores: Record<string, number> = {}

  // Pagina 2 conține scorurile
  const page2 = result.pages.find((p: { num: number }) => p.num === 2)
  if (!page2) return scores

  const text = page2.text as string
  const lines = text.split("\n")

  // Pattern: "Nume dimensiune" urmat de un număr (centila)
  for (const line of lines) {
    const match = line.match(/^(.+?)\s+(\d{1,3})\s*$/)
    if (match) {
      const dimName = match[1].trim()
      const centile = parseInt(match[2])
      // Filtrăm doar dimensiunile valide ESQ-2
      if (centile >= 0 && centile <= 100 && VALID_ESQ_DIMS.has(dimName)) {
        scores[dimName] = centile
      }
    }
  }

  return scores
}

// ── Citire CO ──────────────────────────────────────────

const CO_DIMENSIONS = [
  "OBIECTIVE CLARE",
  "ORGANIZARE EFICIENTA",
  "COMUNICARE INTERNA",
  "MOTIVARE SI RECOMPENSA",
  "INOVARE SI SCHIMBARE",
  "LEADERSHIP",
  "PERFORMANTA",
  "DEZVOLTARE PERSONALA",
]

async function readCO(): Promise<Record<string, Record<string, number>>> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(CO_FILE)

  const result: Record<string, Record<string, number>> = {}

  // Sheet "FMC" are răspunsurile brute: 40 itemi × persoane
  // Row 1 = header cu numele, Rows 2-41 = răspunsuri (1-7)
  // Coloane: 1=nr item, 2=P01, 3=P02, 4=P03, 5=P04, 6=P05,
  //          7=P06, 8=P07, 9=P08, 10=P09, 11=P10
  const ws = wb.getWorksheet("FMC")
  if (!ws) {
    console.warn("⚠ Nu s-a găsit sheet-ul FMC în CO")
    return result
  }

  // Mapping coloane → nume (din header row 1)
  const CO_COL_MAP: Record<string, number> = {
    P01: 2,
    P02: 3,
    P03: 4,
    P04: 5,
    P05: 6,
    P06: 7,
    "P07": 8,
    P08: 9,
    P09: 10,
    P10: 11,
  }

  // CO: 40 itemi grupați în 8 dimensiuni × 5 itemi
  // Grupare standard CO (itemi per dimensiune):
  // 1. Obiective Clare: 1, 9, 25, 33, 16 (itemii cu SARCINA)
  // 2. Organizare: 2, 10, 21, 32, 34 (STRUCTURA)
  // 3. Comunicare: 11, 19, 27, 35, 37 (RELAȚII)
  // 4. Motivare: 12, 20, 28, 36, 17 (RECOMPENSE)
  // 5. Inovare: 3, 15, 23, 26, 31, 39 (SCHIMBARE)
  // 6. Leadership: 5, 6, 14, 22, 30, 38 (CONDUCERE)
  // 7. Performanță: 8, 16, 24, 32, 40 (REZULTATE)
  // 8. Dezvoltare: 4, 13, 20, 29, 18 (DEZVOLTARE)
  //
  // Folosim gruparea din chestionarul original (5 itemi per dimensiune, secvențial):
  const CO_ITEM_GROUPS: Record<string, number[]> = {
    "OBIECTIVE CLARE": [1, 9, 25, 33, 21],
    "ORGANIZARE EFICIENTA": [2, 10, 23, 34, 32],
    "LEADERSHIP": [3, 5, 6, 14, 30],
    "DEZVOLTARE PERSONALA": [4, 13, 15, 26, 39],
    "COMUNICARE INTERNA": [11, 19, 27, 29, 37],
    "MOTIVARE SI RECOMPENSA": [12, 20, 28, 36, 16],
    "INOVARE SI SCHIMBARE": [7, 8, 22, 24, 31],
    "PERFORMANTA": [17, 18, 35, 38, 40],
  }

  // Citim toate răspunsurile brute (row 2 = item 1, row 41 = item 40)
  for (const [name, col] of Object.entries(CO_COL_MAP)) {
    const responses: number[] = []
    for (let item = 1; item <= 40; item++) {
      const row = ws.getRow(item + 1) // +1 deoarece row 1 = header
      const val = row.getCell(col).value
      responses.push(typeof val === "number" ? val : 0)
    }

    result[name] = {}
    for (const [dimName, items] of Object.entries(CO_ITEM_GROUPS)) {
      const dimScores = items.map((i) => responses[i - 1]).filter((v) => v > 0)
      if (dimScores.length > 0) {
        result[name][dimName] = Math.round((dimScores.reduce((s, v) => s + v, 0) / dimScores.length) * 10) / 10
      }
    }
  }

  return result
}

// ── Normalizare completă ──────────────────────────────────

function normalizeAllScores(profile: SubjectProfile): NormalizedScore[] {
  const scores: NormalizedScore[] = []

  // CPI260 — deja T-score
  for (const [code, tScore] of Object.entries(profile.cpi)) {
    const scale = CPI_SCALES.find((s) => s.code === code)
    scores.push({
      instrumentId: "cpi260",
      instrumentName: "CPI 260",
      scaleName: scale?.name || code,
      rawScore: tScore,
      normalizedT: tScore,
      percentile: tToPercentile(tScore),
      level: tScoreToLevel(tScore),
      referenceNorm: `Etalon RO N=1600 ${profile.sex === "F" ? "feminin" : "masculin"}`,
      confidence: 0.95,
    })
  }

  // AMI — stanine → T-score
  for (const [code, stanine] of Object.entries(profile.ami)) {
    const scale = AMI_SCALES.find((s) => s.code === code)
    const tScore = stanineToT(stanine)
    scores.push({
      instrumentId: "ami",
      instrumentName: "AMI",
      scaleName: scale?.name || code,
      rawScore: stanine,
      normalizedT: tScore,
      percentile: tToPercentile(tScore),
      level: tScoreToLevel(tScore),
      referenceNorm: "Etalon RO adulți N=1300",
      confidence: 0.9,
    })
  }

  // ESQ-2 — centile → T-score
  for (const [dimName, centile] of Object.entries(profile.esq)) {
    const tScore = centileToT(centile)
    scores.push({
      instrumentId: "esq2",
      instrumentName: "ESQ-2",
      scaleName: dimName,
      rawScore: centile,
      normalizedT: tScore,
      percentile: centile,
      level: tScoreToLevel(tScore),
      referenceNorm: "Etalon candidați selecție",
      confidence: 0.92,
    })
  }

  // HBDI — scala 0-100 → T-score (media=50, mapare liniară)
  if (profile.hbdi) {
    for (const [quad, score] of Object.entries(profile.hbdi)) {
      const quadNames: Record<string, string> = {
        A: "Analitic (stânga-sus)",
        B: "Organizat (stânga-jos)",
        C: "Interpersonal (dreapta-jos)",
        D: "Holistic (dreapta-sus)",
      }
      // HBDI 0-100 → T-score: media~50, SD~15 în distribuția normală
      const tScore = Math.round(30 + (score / 100) * 40) // mapare 0-100 → 30-70
      scores.push({
        instrumentId: "hbdi",
        instrumentName: "HBDI (Herrmann)",
        scaleName: quadNames[quad] || quad,
        rawScore: score,
        normalizedT: tScore,
        percentile: tToPercentile(tScore),
        level: tScoreToLevel(tScore),
        referenceNorm: "CPA 72 itemi — calcul intern",
        confidence: 0.75, // mai scăzut — calculăm noi, nu editorul
      })
    }
  }

  // MBTI — claritate preferință → T-score (orientativ)
  if (profile.mbti) {
    const axes = [
      { pos: "E", neg: "I", name: "Extraversie vs. Introversie" },
      { pos: "S", neg: "N", name: "Senzorial vs. Intuitiv" },
      { pos: "T", neg: "F", name: "Rațional vs. Afectiv" },
      { pos: "J", neg: "P", name: "Judecător vs. Perceptiv" },
    ]
    for (const axis of axes) {
      const posScore = profile.mbti.scores[axis.pos] || 0
      const negScore = profile.mbti.scores[axis.neg] || 0
      // Claritate = diferența absolută; T-score bazat pe direcție
      const clarity = Math.abs(posScore - negScore)
      // Mapare: claritate 0→T50, claritate 50→T70 (preferință foarte clară)
      const tScore = Math.round(50 + (clarity / 50) * 20 * (posScore > negScore ? 1 : -1))
      const clampedT = Math.max(30, Math.min(70, tScore))
      scores.push({
        instrumentId: "mbti",
        instrumentName: "MBTI",
        scaleName: axis.name,
        rawScore: `${posScore > negScore ? axis.pos : axis.neg}${clarity}`,
        normalizedT: clampedT,
        percentile: tToPercentile(clampedT),
        level: tScoreToLevel(clampedT),
        referenceNorm: `Etalon RO ${profile.sex === "F" ? "feminin" : "masculin"}`,
        confidence: 0.85,
      })
    }
  }

  // CO — scala 1-7 → T-score
  if (profile.co && Object.keys(profile.co).length > 0) {
    // Praguri CO standard (din foaia raspuns_individual):
    // F.Slab: 0-4.0, Slab: 4.0-4.8, Mediu: 4.8-5.4, Intens: 5.4-6.2, F.Intens: 6.2-7
    for (const [dimName, mean] of Object.entries(profile.co)) {
      // Mapare liniară: 1→30, 4→42, 5→50, 6→58, 7→70
      let tScore: number
      if (mean <= 4.0) tScore = Math.round(30 + ((mean - 1) / 3) * 12)
      else if (mean <= 4.8) tScore = Math.round(42 + ((mean - 4.0) / 0.8) * 6)
      else if (mean <= 5.4) tScore = Math.round(48 + ((mean - 4.8) / 0.6) * 4)
      else if (mean <= 6.2) tScore = Math.round(52 + ((mean - 5.4) / 0.8) * 8)
      else tScore = Math.round(60 + ((mean - 6.2) / 0.8) * 10)
      tScore = Math.max(30, Math.min(70, tScore))

      scores.push({
        instrumentId: "co",
        instrumentName: "Climat Organizațional",
        scaleName: dimName,
        rawScore: mean,
        normalizedT: tScore,
        percentile: tToPercentile(tScore),
        level: tScoreToLevel(tScore),
        referenceNorm: "Praguri normative CO 8 dim",
        confidence: 0.8,
      })
    }
  }

  return scores
}

function tToPercentile(t: number): number {
  // Aproximare T-score → percentilă
  const z = (t - 50) / 10
  // Aproximare funcție de repartiție normală
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.sqrt(2)
  const t2 = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t2 + a4) * t2 + a3) * t2 + a2) * t2 + a1) * t2 * Math.exp(-x * x)
  return Math.round((0.5 * (1.0 + sign * y)) * 100)
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log("🔬 FMC Ingestion — Start")
  console.log(`📁 Sursă: ${BASE_PATH}`)
  console.log(`📊 Subiecți: ${SUBJECTS.length}`)
  console.log("")

  // 1. Citire centralizator
  console.log("📖 Citire centralizator.xlsx...")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(CENTRALIZATOR)

  const cpiData = await readCPI(wb)
  console.log(`  ✓ CPI: ${Object.keys(cpiData).length} subiecți`)

  const cpiCuboid = await readCPICuboid(wb)
  console.log(`  ✓ CPI Cuboid: ${Object.keys(cpiCuboid).length} subiecți`)

  const amiData = await readAMI(wb)
  console.log(`  ✓ AMI: ${Object.keys(amiData).length} subiecți`)

  const hbdiData = await readHBDI(wb)
  console.log(`  ✓ HBDI: ${Object.keys(hbdiData).length} subiecți`)

  const mbtiData = await readMBTI(wb)
  console.log(`  ✓ MBTI: ${Object.keys(mbtiData).length} subiecți`)

  // 2. Citire CO
  console.log("\n📖 Citire foaie_rezultate_CO.xlsx...")
  const coData = await readCO()
  console.log(`  ✓ CO: ${Object.keys(coData).length} subiecți`)

  // 3. Parsare ESQ-2 din PDF-uri individuale
  console.log("\n📖 Parsare PDF-uri ESQ-2...")
  const esqData: Record<string, Record<string, number>> = {}

  for (const subject of SUBJECTS) {
    const dirPath = `${FMC_DIR}/${subject.dir}`
    const files = fs.readdirSync(dirPath)
    const esqFile = files.find((f) => f.toLowerCase().startsWith("esq") && f.endsWith(".pdf"))

    if (esqFile) {
      const esqPath = `${dirPath}/${esqFile}`
      try {
        esqData[subject.name] = await parseESQ(esqPath)
        console.log(`  ✓ ESQ ${subject.name}: ${Object.keys(esqData[subject.name]).length} dimensiuni`)
      } catch (e) {
        console.warn(`  ⚠ ESQ ${subject.name}: eroare parsare - ${e}`)
        esqData[subject.name] = {}
      }
    } else {
      console.warn(`  ⚠ ESQ ${subject.name}: PDF negăsit`)
      esqData[subject.name] = {}
    }
  }

  // 4. Asamblare profiluri unificate
  console.log("\n🔧 Asamblare profiluri unificate...")
  const profiles: SubjectProfile[] = []

  for (const subject of SUBJECTS) {
    const profile: SubjectProfile = {
      code: subject.dir.replace(/\./g, "_"),
      name: subject.name,
      sex: subject.sex,
      age: subject.age,
      cpi: cpiData[subject.name] || {},
      cpiCuboid: cpiCuboid[subject.name] || { type: "necunoscut", level: 0 },
      ami: amiData[subject.name] || {},
      hbdi: hbdiData[subject.name] || { A: 0, B: 0, C: 0, D: 0 },
      mbti: mbtiData[subject.name] || { type: "XXXX", scores: {} },
      esq: esqData[subject.name] || {},
      co: coData[subject.name] || {},
      normalized: [],
    }

    // Normalizare
    profile.normalized = normalizeAllScores(profile)
    profiles.push(profile)

    const cpiCount = Object.keys(profile.cpi).length
    const amiCount = Object.keys(profile.ami).length
    const esqCount = Object.keys(profile.esq).length
    console.log(`  ✓ ${subject.name}: CPI=${cpiCount} AMI=${amiCount} ESQ=${esqCount} HBDI=${profile.hbdi.A > 0 ? "✓" : "✗"} MBTI=${profile.mbti.type} → ${profile.normalized.length} scoruri normalizate`)
  }

  // 5. Salvare output
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const outputPath = path.join(OUTPUT_DIR, "fmc-profiles.json")
  fs.writeFileSync(outputPath, JSON.stringify(profiles, null, 2), "utf-8")
  console.log(`\n✅ Output salvat: ${outputPath}`)
  console.log(`   ${profiles.length} profiluri × ${profiles[0]?.normalized.length || 0} scoruri normalizate`)

  // Salvare și per persoană
  for (const profile of profiles) {
    const perPath = path.join(OUTPUT_DIR, `${profile.code}.json`)
    fs.writeFileSync(perPath, JSON.stringify(profile, null, 2), "utf-8")
  }
  console.log(`   + ${profiles.length} fișiere individuale`)

  // Sumar statistici
  console.log("\n📊 Sumar:")
  console.log(`   Total scoruri normalizate: ${profiles.reduce((s, p) => s + p.normalized.length, 0)}`)
  console.log(`   Media scoruri per subiect: ${Math.round(profiles.reduce((s, p) => s + p.normalized.length, 0) / profiles.length)}`)
}

main().catch((err) => {
  console.error("❌ Eroare:", err)
  process.exit(1)
})
