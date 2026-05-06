/**
 * FMC Pipeline N1 → N2 → N3
 *
 * Rulează profilarea pe datele ingestate OFFLINE (fără DB).
 * Produce raport integrat per persoană + sinteză organizațională.
 */

import * as fs from "fs"
import * as path from "path"
import {
  tScoreToLevel,
  type NormalizedScore,
} from "../../src/lib/profiling/score-normalizer"

// ── Load data ──────────────────────────────────────────

const OUTPUT_DIR = path.resolve(__dirname, "output")
const profilesRaw = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, "fmc-profiles.json"), "utf-8"))

// ── N1: Dimensional Profiles ──────────────────────────────

interface DimensionalProfile {
  dimensionId: string
  entityId: string
  scores: Record<string, number> // scale → T-score normalizat
  rawResult: any
  confidence: number
}

interface N2Profile {
  entityId: string
  name: string
  sex: string
  age: number
  dimensions: DimensionalProfile[]
  completeness: number
  synthesis: {
    cognitiveStyle: { dominant: string; description: string }
    personalityType: { type: string; description: string }
    leadershipPotential: "RIDICAT" | "MEDIU" | "SCAZUT"
    integrityLevel: "RIDICATA" | "MEDIE" | "DE_MONITORIZAT"
    motivationLevel: "RIDICAT" | "MEDIU" | "SCAZUT"
    cuboidType: string
    cuboidLevel: number
  }
  strengths: Array<{ instrument: string; scale: string; tScore: number; interpretation: string }>
  risks: Array<{ instrument: string; scale: string; tScore: number; interpretation: string }>
  congruences: Array<{ finding: string; valence: "POZITIVA" | "NEGATIVA" }>
  tensions: Array<{ tension: string; developmentOpportunity: string }>
}

function buildN1(profile: any): DimensionalProfile[] {
  const dimensions: DimensionalProfile[] = []

  // LEADERSHIP (CPI260)
  const cpiScores: Record<string, number> = {}
  for (const [code, t] of Object.entries(profile.cpi)) {
    cpiScores[code] = t as number
  }
  dimensions.push({
    dimensionId: "LEADERSHIP",
    entityId: profile.code,
    scores: cpiScores,
    rawResult: { cuboid: profile.cpiCuboid },
    confidence: 0.95,
  })

  // MOTIVATION (AMI)
  const amiScores: Record<string, number> = {}
  for (const [code, stanine] of Object.entries(profile.ami)) {
    // stanine → T-score
    amiScores[code] = 50 + ((stanine as number) - 5) * 5
  }
  dimensions.push({
    dimensionId: "MOTIVATION",
    entityId: profile.code,
    scores: amiScores,
    rawResult: profile.ami,
    confidence: 0.9,
  })

  // INTEGRITY (ESQ-2)
  const esqScores: Record<string, number> = {}
  for (const ns of profile.normalized.filter((s: NormalizedScore) => s.instrumentId === "esq2")) {
    esqScores[ns.scaleName] = ns.normalizedT
  }
  dimensions.push({
    dimensionId: "INTEGRITY",
    entityId: profile.code,
    scores: esqScores,
    rawResult: profile.esq,
    confidence: 0.92,
  })

  // COGNITIVE_STYLE (HBDI)
  dimensions.push({
    dimensionId: "COGNITIVE_STYLE",
    entityId: profile.code,
    scores: {
      A: 30 + (profile.hbdi.A / 100) * 40,
      B: 30 + (profile.hbdi.B / 100) * 40,
      C: 30 + (profile.hbdi.C / 100) * 40,
      D: 30 + (profile.hbdi.D / 100) * 40,
    },
    rawResult: profile.hbdi,
    confidence: 0.75,
  })

  // PERSONALITY_TYPE (MBTI)
  dimensions.push({
    dimensionId: "PERSONALITY_TYPE",
    entityId: profile.code,
    scores: profile.mbti.scores,
    rawResult: { type: profile.mbti.type },
    confidence: 0.85,
  })

  // CLIMATE (CO)
  if (profile.co && Object.keys(profile.co).length > 0) {
    const coScores: Record<string, number> = {}
    for (const ns of profile.normalized.filter((s: NormalizedScore) => s.instrumentId === "co")) {
      coScores[ns.scaleName] = ns.normalizedT
    }
    dimensions.push({
      dimensionId: "CLIMATE",
      entityId: profile.code,
      scores: coScores,
      rawResult: profile.co,
      confidence: 0.8,
    })
  }

  return dimensions
}

// ── N2: Individual Profile ──────────────────────────────

function buildN2(profile: any, dimensions: DimensionalProfile[]): N2Profile {
  const normalized: NormalizedScore[] = profile.normalized

  // Sinteză stil cognitiv
  const hbdi = profile.hbdi
  const maxQuad = Object.entries(hbdi).sort(([, a], [, b]) => (b as number) - (a as number))[0]
  const quadNames: Record<string, string> = {
    A: "Analitic — gândire logică, fapte, date",
    B: "Organizat — structură, proces, detalii",
    C: "Relațional — empatie, comunicare, echipă",
    D: "Vizionar — imaginație, sinteză, inovație",
  }

  // Leadership (din CPI: media LP + MP + DO)
  const leadershipScales = ["LP", "MP", "DO"]
  const leadershipT = leadershipScales
    .map((s) => profile.cpi[s])
    .filter((v: number) => v)
  const leadershipMean = leadershipT.length > 0
    ? leadershipT.reduce((s: number, v: number) => s + v, 0) / leadershipT.length
    : 50

  // Integritate (din ESQ: Recomandare Generală)
  const integrityScore = profile.esq["Recomandare Generala de Angajare"] || 50
  const integrityT = normalized.find((s) => s.scaleName === "Recomandare Generala de Angajare")?.normalizedT || 50

  // Motivație (media AMI stanine)
  const amiValues = Object.values(profile.ami) as number[]
  const amiMean = amiValues.length > 0 ? amiValues.reduce((s, v) => s + v, 0) / amiValues.length : 5
  const motivationT = 50 + (amiMean - 5) * 5

  // Puncte forte (T > 60)
  const strengths = normalized
    .filter((s) => {
      // ESQ risk scales: T scăzut = bine (nu le raportăm ca puncte forte)
      if (s.instrumentId === "esq2" && s.normalizedT < 40) return false
      return s.normalizedT > 60
    })
    .sort((a, b) => b.normalizedT - a.normalizedT)
    .slice(0, 10)
    .map((s) => ({
      instrument: s.instrumentName,
      scale: s.scaleName,
      tScore: s.normalizedT,
      interpretation: `${s.level} — scor ${s.rawScore} (${s.referenceNorm})`,
    }))

  // Riscuri / arii de perfecționare (T < 40, excluzând ESQ inversele care sunt bune)
  const INVERSE_ESQ = [
    "Consum de Alcool", "Concediu Medical", "Infractiuni", "Intarzieri",
    "Indolenta", "Sabotaj", "Nerespectarea", "Furt", "Risc de Comportament",
  ]
  const risks = normalized
    .filter((s) => {
      if (s.normalizedT >= 40) return false
      // ESQ risk: T scăzut = BUN, nu risc
      if (s.instrumentId === "esq2" && INVERSE_ESQ.some((inv) => s.scaleName.includes(inv))) return false
      return true
    })
    .sort((a, b) => a.normalizedT - b.normalizedT)
    .slice(0, 10)
    .map((s) => ({
      instrument: s.instrumentName,
      scale: s.scaleName,
      tScore: s.normalizedT,
      interpretation: `${s.level} — scor ${s.rawScore} (${s.referenceNorm})`,
    }))

  // Scalele CPI cu interpretare inversă unde T mare = problemă
  const CPI_INVERSE = ["HOS", "ANX", "NAR"]
  for (const code of CPI_INVERSE) {
    const t = profile.cpi[code]
    if (t && t > 60) {
      const scaleNames: Record<string, string> = { HOS: "Ostilitate", ANX: "Anxietate", NAR: "Narcisism" }
      risks.push({
        instrument: "CPI 260",
        scale: scaleNames[code] || code,
        tScore: t,
        interpretation: `RIDICAT pe scală inversă — indicator de risc (T=${t})`,
      })
    }
  }

  // Congruențe
  const congruences: N2Profile["congruences"] = []

  // Herrmann C dominant + MBTI F (Feeling) = congruență relațională
  if (hbdi.C > 70 && profile.mbti.type.includes("F")) {
    congruences.push({
      finding: "Profil relațional congruent: Herrmann C (interpersonal) + MBTI F (afectiv)",
      valence: "POZITIVA",
    })
  }

  // Herrmann A dominant + MBTI T (Thinking) = congruență analitică
  if (hbdi.A > 70 && profile.mbti.type.includes("T")) {
    congruences.push({
      finding: "Profil analitic congruent: Herrmann A (logic) + MBTI T (rațional)",
      valence: "POZITIVA",
    })
  }

  // CPI Autocontrol ridicat + AMI Autodisciplină ridicat = congruență
  if ((profile.cpi.SC || 0) > 55 && (profile.ami.SK || 0) >= 6) {
    congruences.push({
      finding: "Autodisciplină confirmată cross-instrument: CPI SC + AMI SK",
      valence: "POZITIVA",
    })
  }

  // ESQ integritate excelentă + CPI GI ridicat = congruență
  if (integrityScore > 80 && (profile.cpi.GI || 0) > 55) {
    congruences.push({
      finding: "Integritate validată: ESQ Recomandare înaltă + CPI Impresie bună înaltă",
      valence: "POZITIVA",
    })
  }

  // Tensiuni
  const tensions: N2Profile["tensions"] = []

  // CPI Ostilitate ridicată + AMI Dominanță ridicată = risc
  if ((profile.cpi.HOS || 0) > 60 && (profile.ami.DO || 0) >= 7) {
    tensions.push({
      tension: "Ostilitate (CPI) + Dominanță puternică (AMI) — risc de agresivitate în conducere",
      developmentOpportunity: "Coaching pe gestionarea conflictelor și comunicare asertivă non-agresivă",
    })
  }

  // CPI Leadership scăzut + AMI Dominanță ridicată = conflict intern
  if ((profile.cpi.LP || 0) < 45 && (profile.ami.DO || 0) >= 7) {
    tensions.push({
      tension: "Dorință de dominanță (AMI) dar potențial leadership scăzut (CPI LP) — frustrare latentă",
      developmentOpportunity: "Dezvoltare competențe de leadership pentru a canaliza constructiv dominanța",
    })
  }

  // Motivație ridicată + Flexibilitate scăzută = rigidul ambițios
  if (motivationT > 55 && (profile.cpi.FX || 50) < 40) {
    tensions.push({
      tension: "Motivație ridicată dar flexibilitate scăzută — rezistență la schimbare combinată cu ambiție",
      developmentOpportunity: "Expunere progresivă la sarcini nestructurate, coaching pe adaptabilitate",
    })
  }

  // MBTI Introversie puternică + CPI Prezență socială scăzută = barieră carieră
  if (profile.mbti.type.startsWith("I") && (profile.cpi.SP || 50) < 40) {
    tensions.push({
      tension: "Introversie puternică + prezență socială scăzută — vizibilitate limitată în organizație",
      developmentOpportunity: "Dezvoltare canal de influență prin competență (nu prin sociabilitate)",
    })
  }

  return {
    entityId: profile.code,
    name: profile.name,
    sex: profile.sex,
    age: profile.age,
    dimensions,
    completeness: calculateCompleteness(profile),
    synthesis: {
      cognitiveStyle: { dominant: maxQuad[0], description: quadNames[maxQuad[0]] },
      personalityType: { type: profile.mbti.type, description: getMBTIDescription(profile.mbti.type) },
      leadershipPotential: leadershipMean >= 55 ? "RIDICAT" : leadershipMean >= 45 ? "MEDIU" : "SCAZUT",
      integrityLevel: integrityT >= 60 ? "RIDICATA" : integrityT >= 45 ? "MEDIE" : "DE_MONITORIZAT",
      motivationLevel: motivationT >= 55 ? "RIDICAT" : motivationT >= 45 ? "MEDIU" : "SCAZUT",
      cuboidType: profile.cpiCuboid.type,
      cuboidLevel: profile.cpiCuboid.level,
    },
    strengths,
    risks,
    congruences,
    tensions,
  }
}

function calculateCompleteness(profile: any): number {
  let total = 0
  let filled = 0

  total += 35 // CPI scales
  filled += Object.keys(profile.cpi).length

  total += 14 // AMI scales
  filled += Object.keys(profile.ami).length

  total += 15 // ESQ dims
  filled += Object.keys(profile.esq).length

  total += 4 // HBDI cadrane
  filled += profile.hbdi.A > 0 ? 4 : 0

  total += 4 // MBTI axe
  filled += profile.mbti.type !== "XXXX" ? 4 : 0

  total += 8 // CO dims
  filled += Object.keys(profile.co).length

  return Math.round((filled / total) * 100) / 100
}

function getMBTIDescription(type: string): string {
  const descriptions: Record<string, string> = {
    ISTJ: "Inspectorul — responsabil, minuțios, de încredere, loial",
    ISFJ: "Protectorul — empatic, loial, conștiincios, dedicat",
    INFJ: "Avocatul — vizionar, idealist, empatic, strategic",
    INTJ: "Arhitectul — strategic, independent, determinat, analitic",
    ISTP: "Meșterul — practic, analitic, adaptabil, observator",
    ISFP: "Aventurierul — sensibil, creativ, flexibil, loial",
    INFP: "Mediatorul — idealist, empatic, creativ, dedicat valorilor",
    INTP: "Logicianul — analitic, inventiv, obiectiv, autonom",
    ESTP: "Antreprenorul — energic, pragmatic, adaptabil, observator",
    ESFP: "Animatorul — sociabil, spontan, energic, practic",
    ENFP: "Campionul — entuziast, creativ, sociabil, optimist",
    ENTP: "Dezbătătorul — inventiv, strategic, comunicativ, argumentativ",
    ESTJ: "Executivul — organizat, responsabil, decisiv, eficient",
    ESFJ: "Consulul — empatic, conștiincios, loial, cooperant",
    ENFJ: "Protagonistul — carismatic, empatic, inspirator, organizat",
    ENTJ: "Comandantul — decisiv, strategic, eficient, ambițios",
  }
  return descriptions[type] || type
}

// ── N3: Organizational Profile ──────────────────────────

interface N3Profile {
  entityId: string
  entityName: string
  headcount: number
  profiles: N2Profile[]
  organizationalSynthesis: {
    dominantCognitiveStyle: string
    dominantPersonalityTypes: string[]
    cuboidDistribution: Record<string, number>
    leadershipPool: { ridicat: number; mediu: number; scazut: number }
    integrityOverview: { ridicata: number; medie: number; deMonitorizat: number }
    motivationMean: number
    climatePerception: Record<string, number> // dim → media grupului
  }
  groupStrengths: string[]
  groupRisks: string[]
  teamComposition: {
    herrmannBalance: { A: number; B: number; C: number; D: number }
    mbtiDistribution: Record<string, number>
  }
}

function buildN3(n2Profiles: N2Profile[], rawProfiles: any[]): N3Profile {
  // Distribuție stil cognitiv
  const herrmannTotals = { A: 0, B: 0, C: 0, D: 0 }
  const mbtiDist: Record<string, number> = {}
  const cuboidDist: Record<string, number> = {}
  const leadershipPool = { ridicat: 0, mediu: 0, scazut: 0 }
  const integrityPool = { ridicata: 0, medie: 0, deMonitorizat: 0 }
  let motivationSum = 0

  for (const p of n2Profiles) {
    // Herrmann
    const raw = rawProfiles.find((r) => r.code === p.entityId)
    if (raw?.hbdi) {
      herrmannTotals.A += raw.hbdi.A
      herrmannTotals.B += raw.hbdi.B
      herrmannTotals.C += raw.hbdi.C
      herrmannTotals.D += raw.hbdi.D
    }

    // MBTI
    mbtiDist[p.synthesis.personalityType.type] = (mbtiDist[p.synthesis.personalityType.type] || 0) + 1

    // Cuboid
    cuboidDist[p.synthesis.cuboidType] = (cuboidDist[p.synthesis.cuboidType] || 0) + 1

    // Leadership
    leadershipPool[p.synthesis.leadershipPotential === "RIDICAT" ? "ridicat" : p.synthesis.leadershipPotential === "MEDIU" ? "mediu" : "scazut"]++

    // Integritate
    integrityPool[p.synthesis.integrityLevel === "RIDICATA" ? "ridicata" : p.synthesis.integrityLevel === "MEDIE" ? "medie" : "deMonitorizat"]++

    // Motivație
    const amiValues = Object.values(raw?.ami || {}) as number[]
    motivationSum += amiValues.length > 0 ? amiValues.reduce((s, v) => s + v, 0) / amiValues.length : 5
  }

  // Media Herrmann
  const n = n2Profiles.length
  const herrmannMean = {
    A: Math.round(herrmannTotals.A / n),
    B: Math.round(herrmannTotals.B / n),
    C: Math.round(herrmannTotals.C / n),
    D: Math.round(herrmannTotals.D / n),
  }

  // Stil cognitiv dominant la nivel de grup
  const maxH = Object.entries(herrmannMean).sort(([, a], [, b]) => b - a)[0]

  // Media CO pe grup
  const coMeans: Record<string, number[]> = {}
  for (const raw of rawProfiles) {
    if (raw.co) {
      for (const [dim, val] of Object.entries(raw.co)) {
        if (!coMeans[dim]) coMeans[dim] = []
        coMeans[dim].push(val as number)
      }
    }
  }
  const climatePerception: Record<string, number> = {}
  for (const [dim, vals] of Object.entries(coMeans)) {
    climatePerception[dim] = Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
  }

  // Puncte forte și riscuri la nivel de grup
  const groupStrengths: string[] = []
  const groupRisks: string[] = []

  // Dacă 75%+ au integritate ridicată = punct forte org
  if (integrityPool.ridicata / n >= 0.75) groupStrengths.push("Integritate generalizată — baza de încredere solidă")
  if (motivationSum / n >= 6) groupStrengths.push("Motivație generală ridicată")
  if (herrmannMean.B > 60) groupStrengths.push("Echipă cu capacitate organizatorică puternică (Herrmann B)")
  if (herrmannMean.C > 60) groupStrengths.push("Echipă cu competență relațională ridicată (Herrmann C)")

  // Riscuri
  if (leadershipPool.scazut / n > 0.5) groupRisks.push("Deficit de leadership — peste 50% au potențial scăzut")
  if (integrityPool.deMonitorizat > 0) groupRisks.push(`${integrityPool.deMonitorizat} persoană(e) cu integritate de monitorizat`)
  if (herrmannMean.D < 40) groupRisks.push("Capacitate vizionară scăzută la nivel de grup — risc de stagnare")
  if (Object.keys(mbtiDist).length < 4) groupRisks.push("Diversitate de personalitate redusă — risc de gândire de grup")

  // CO sub prag
  for (const [dim, mean] of Object.entries(climatePerception)) {
    if (mean < 4.5) groupRisks.push(`CO: ${dim} perceput slab (media ${mean}/7)`)
  }

  return {
    entityId: "FMC_ORG",
    entityName: "FMC — Frontier Management Consulting",
    headcount: n,
    profiles: n2Profiles,
    organizationalSynthesis: {
      dominantCognitiveStyle: `${maxH[0]} (media ${maxH[1]})`,
      dominantPersonalityTypes: Object.entries(mbtiDist).sort(([, a], [, b]) => b - a).slice(0, 3).map(([t, c]) => `${t} (${c})`),
      cuboidDistribution: cuboidDist,
      leadershipPool,
      integrityOverview: integrityPool,
      motivationMean: Math.round((motivationSum / n) * 10) / 10,
      climatePerception,
    },
    groupStrengths,
    groupRisks,
    teamComposition: {
      herrmannBalance: herrmannMean,
      mbtiDistribution: mbtiDist,
    },
  }
}

// ── Main ──────────────────────────────────────────────────

function main() {
  console.log("🧠 Pipeline N1 → N2 → N3")
  console.log(`📊 Input: ${profilesRaw.length} profiluri`)
  console.log("")

  // N1
  console.log("═══ N1: Profilare Dimensională ═══")
  const allN1: Array<{ name: string; dims: DimensionalProfile[] }> = []
  for (const profile of profilesRaw) {
    const dims = buildN1(profile)
    allN1.push({ name: profile.name, dims })
    console.log(`  ${profile.name}: ${dims.length} dimensiuni (${dims.map((d) => d.dimensionId).join(", ")})`)
  }

  // N2
  console.log("\n═══ N2: Profilare Individuală (Sinteză) ═══")
  const n2Profiles: N2Profile[] = []
  for (let i = 0; i < profilesRaw.length; i++) {
    const n2 = buildN2(profilesRaw[i], allN1[i].dims)
    n2Profiles.push(n2)
    console.log(`  ${n2.name} [${n2.synthesis.personalityType.type}/${n2.synthesis.cuboidType}/${n2.synthesis.cognitiveStyle.dominant}]:`)
    console.log(`    Leadership=${n2.synthesis.leadershipPotential} | Integritate=${n2.synthesis.integrityLevel} | Motivație=${n2.synthesis.motivationLevel}`)
    console.log(`    Puncte forte: ${n2.strengths.length} | Riscuri: ${n2.risks.length} | Congruențe: ${n2.congruences.length} | Tensiuni: ${n2.tensions.length}`)
    if (n2.tensions.length > 0) {
      n2.tensions.forEach((t) => console.log(`      ⚡ ${t.tension}`))
    }
  }

  // N3
  console.log("\n═══ N3: Profilare Organizațională ═══")
  const n3 = buildN3(n2Profiles, profilesRaw)
  console.log(`  Organizație: ${n3.entityName} (${n3.headcount} persoane)`)
  console.log(`  Stil cognitiv dominant: ${n3.organizationalSynthesis.dominantCognitiveStyle}`)
  console.log(`  Tipuri personalitate frecvente: ${n3.organizationalSynthesis.dominantPersonalityTypes.join(", ")}`)
  console.log(`  Distribuție Cuboid: ${JSON.stringify(n3.organizationalSynthesis.cuboidDistribution)}`)
  console.log(`  Leadership: ${JSON.stringify(n3.organizationalSynthesis.leadershipPool)}`)
  console.log(`  Integritate: ${JSON.stringify(n3.organizationalSynthesis.integrityOverview)}`)
  console.log(`  Motivație medie (stanine): ${n3.organizationalSynthesis.motivationMean}`)
  console.log(`  \n  Climat Organizațional (medie grup):`)
  for (const [dim, val] of Object.entries(n3.organizationalSynthesis.climatePerception)) {
    const bar = "█".repeat(Math.round(val)) + "░".repeat(7 - Math.round(val))
    console.log(`    ${dim.padEnd(25)} ${bar} ${val}/7`)
  }
  console.log(`\n  ✓ Puncte forte grup: ${n3.groupStrengths.length}`)
  n3.groupStrengths.forEach((s) => console.log(`    + ${s}`))
  console.log(`  ⚠ Riscuri grup: ${n3.groupRisks.length}`)
  n3.groupRisks.forEach((r) => console.log(`    - ${r}`))
  console.log(`\n  Herrmann Balance: A=${n3.teamComposition.herrmannBalance.A} B=${n3.teamComposition.herrmannBalance.B} C=${n3.teamComposition.herrmannBalance.C} D=${n3.teamComposition.herrmannBalance.D}`)

  // Salvare
  const n2Path = path.join(OUTPUT_DIR, "n2-profiles.json")
  fs.writeFileSync(n2Path, JSON.stringify(n2Profiles, null, 2), "utf-8")

  const n3Path = path.join(OUTPUT_DIR, "n3-organizational.json")
  fs.writeFileSync(n3Path, JSON.stringify(n3, null, 2), "utf-8")

  // Salvare raport text per persoană
  for (const n2 of n2Profiles) {
    const reportPath = path.join(OUTPUT_DIR, `report_${n2.entityId}.txt`)
    const report = generateTextReport(n2)
    fs.writeFileSync(reportPath, report, "utf-8")
  }

  console.log(`\n✅ Output salvat:`)
  console.log(`   ${n2Path}`)
  console.log(`   ${n3Path}`)
  console.log(`   + ${n2Profiles.length} rapoarte text individuale`)
}

function generateTextReport(n2: N2Profile): string {
  const lines: string[] = []
  lines.push(`═══════════════════════════════════════════════════════════════`)
  lines.push(`PROFIL INTEGRAT — ${n2.name}`)
  lines.push(`═══════════════════════════════════════════════════════════════`)
  lines.push(`Sex: ${n2.sex} | Vârstă: ${n2.age} | Completitudine: ${Math.round(n2.completeness * 100)}%`)
  lines.push(``)
  lines.push(`── SINTEZĂ ──`)
  lines.push(`Tip personalitate: ${n2.synthesis.personalityType.type} — ${n2.synthesis.personalityType.description}`)
  lines.push(`Stil cognitiv: ${n2.synthesis.cognitiveStyle.dominant} — ${n2.synthesis.cognitiveStyle.description}`)
  lines.push(`Model Cuboid CPI: Tip ${n2.synthesis.cuboidType.toUpperCase()}, Nivel integrare ${n2.synthesis.cuboidLevel}`)
  lines.push(`Leadership: ${n2.synthesis.leadershipPotential}`)
  lines.push(`Integritate: ${n2.synthesis.integrityLevel}`)
  lines.push(`Motivație: ${n2.synthesis.motivationLevel}`)
  lines.push(``)
  lines.push(`── PUNCTE FORTE (scoruri > T60) ──`)
  for (const s of n2.strengths) {
    lines.push(`  ★ ${s.instrument} / ${s.scale}: T=${s.tScore}`)
  }
  lines.push(``)
  lines.push(`── ARII DE PERFECȚIONARE / RISCURI ──`)
  for (const r of n2.risks) {
    lines.push(`  ▼ ${r.instrument} / ${r.scale}: T=${r.tScore} — ${r.interpretation}`)
  }
  lines.push(``)
  if (n2.congruences.length > 0) {
    lines.push(`── CONGRUENȚE ──`)
    for (const c of n2.congruences) {
      lines.push(`  ↔ ${c.finding}`)
    }
    lines.push(``)
  }
  if (n2.tensions.length > 0) {
    lines.push(`── TENSIUNI / OPORTUNITĂȚI DE DEZVOLTARE ──`)
    for (const t of n2.tensions) {
      lines.push(`  ⚡ ${t.tension}`)
      lines.push(`    → ${t.developmentOpportunity}`)
    }
    lines.push(``)
  }
  return lines.join("\n")
}

main()
