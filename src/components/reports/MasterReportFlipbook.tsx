"use client"

import React, { useState, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import type { MasterReportData, MasterJobEvaluation } from "@/lib/reports/master-report-data"
import { buildPitariuGrades, autoDetectClassCount, type ClassDetection } from "@/lib/evaluation/pitariu-grades"

const SalaryGradeChart = dynamic(() => import("@/components/sessions/SalaryGradeChart"), { ssr: false })
const ClassCountSelector = dynamic(() => import("@/components/sessions/ClassCountSelector"), { ssr: false })

// ─── Tipuri ────────────────────────────────────────────────────────────────

type Theme = "sobru" | "modern"

interface Props {
  data: MasterReportData
  initialTheme?: Theme
  onOpenSimulator?: (section: string) => void
  /** JE modificat de simulator (scoruri recalculate, clasament reordonat) */
  modifiedJE?: MasterJobEvaluation[]
}

// ─── Teme ──────────────────────────────────────────────────────────────────

const themes: Record<Theme, {
  heading: string
  subheading: string
  body: string
  accent: string
  card: string
  badge: string
  pageBg: string
  tableHead: string
  tableRow: string
  coverBg: string
  lockOverlay: string
  separator: string
}> = {
  sobru: {
    heading: "text-slate-900 font-serif text-2xl font-bold",
    subheading: "text-slate-700 font-serif text-base font-semibold",
    body: "text-slate-600 text-sm leading-relaxed",
    accent: "text-indigo-700",
    card: "border border-slate-200 rounded-lg p-5 bg-white",
    badge: "text-[11px] font-medium px-2.5 py-0.5 rounded",
    pageBg: "bg-white",
    tableHead: "bg-slate-50 text-slate-700 text-xs font-semibold",
    tableRow: "border-b border-slate-100 text-sm",
    coverBg: "bg-gradient-to-br from-slate-800 to-slate-900",
    lockOverlay: "bg-slate-100/80 backdrop-blur-sm",
    separator: "border-slate-200",
  },
  modern: {
    heading: "text-slate-900 text-2xl font-black tracking-tight",
    subheading: "text-indigo-600 text-base font-bold",
    body: "text-slate-600 text-sm leading-relaxed",
    accent: "text-indigo-500",
    card: "border border-indigo-100 rounded-xl p-5 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm",
    badge: "text-[11px] font-bold px-2.5 py-1 rounded-full",
    pageBg: "bg-white",
    tableHead: "bg-indigo-50 text-indigo-800 text-xs font-bold",
    tableRow: "border-b border-indigo-50 text-sm",
    coverBg: "bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900",
    lockOverlay: "bg-gradient-to-br from-indigo-50/90 to-violet-50/90 backdrop-blur-sm",
    separator: "border-indigo-100",
  },
}

// ─── Section IDs pentru navigare cuprins ──────────────────────────────────

const SECTION_IDS = {
  cover: "section-cover",
  toc: "section-toc",
  je: "section-je",
  salary: "section-salary",
  payGap: "section-paygap",
  benchmark: "section-benchmark",
  development: "section-development",
  annexInputs: "section-annex-inputs",
  annexLegal: "section-annex-legal",
} as const

// ─── Page wrapper — simulare pagină A4 ────────────────────────────────────

function PageSheet({ children, id, pageNum, totalPages }: {
  children: React.ReactNode
  id?: string
  pageNum?: number
  totalPages?: number
}) {
  return (
    <section
      id={id}
      className="bg-white rounded-lg shadow-lg border border-slate-100 px-12 py-10 relative"
      style={{ minHeight: "60vh" }}
    >
      {children}
      {pageNum != null && totalPages != null && (
        <div className="absolute bottom-4 left-12 right-12 flex justify-between text-[10px] text-slate-300 border-t border-slate-100 pt-3 mt-8">
          <span>JobGrade.ro — Document confidențial</span>
          <span>Pagina {pageNum} din {totalPages}</span>
        </div>
      )}
    </section>
  )
}

// ─── Componente secțiuni ──────────────────────────────────────────────────

function CoverSection({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  return (
    <PageSheet id={SECTION_IDS.cover}>
      <div className={`${t.coverBg} rounded-lg -mx-12 -mt-10 px-12 pt-16 pb-16 mb-0 relative`}>
        {data.isDemo && (
          <div className="absolute top-6 right-6 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full rotate-12 shadow-lg">
            DEMO
          </div>
        )}
        <div className="text-center text-white space-y-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
            <span className="text-4xl">📊</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-3">Raport Master</h1>
            <p className="text-white/70 text-base font-medium">Analiza completă a structurii organizaționale și salariale</p>
            <p className="text-white/40 text-sm mt-2">Evaluare · Ierarhizare · Conformitate · Recomandări</p>
          </div>
          <div className="border-t border-white/20 pt-8 space-y-2">
            <p className="text-2xl font-semibold">{data.company.name}</p>
            <p className="text-white/50 text-sm">CUI: {data.company.cui}</p>
            <p className="text-white/50 text-sm">{data.company.industry}</p>
          </div>
          <div className="flex gap-8 justify-center text-white/70 text-sm">
            <span>{data.company.employees} angajați</span>
            <span>{data.company.positions} posturi evaluate</span>
            <span>{data.company.departments.length} departamente</span>
          </div>
          <p className="text-white/30 text-xs pt-4">
            Generat: {new Date(data.generatedAt).toLocaleDateString("ro-RO")} · JobGrade.ro · Document confidențial
          </p>
        </div>
      </div>
    </PageSheet>
  )
}

function TOCSection({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const sections = [
    {
      layer: "BAZA", icon: "🏗️", title: "Ordine internă", anchor: SECTION_IDS.je,
      items: ["Evaluarea și ierarhizarea posturilor pe baza criteriilor obiective"],
      unlocked: data.layers.baza.unlocked,
    },
    {
      layer: "LAYER 1", icon: "⚖️", title: "Conformitate", anchor: SECTION_IDS.salary,
      items: [
        "Structură salarială — clase și trepte de salarizare",
        "Analiză decalaj salarial conform Art. 9, Directiva EU 2023/970",
      ],
      unlocked: data.layers.layer1.unlocked,
    },
    {
      layer: "LAYER 2", icon: "🎯", title: "Competitivitate", anchor: SECTION_IDS.benchmark,
      items: ["Salariile organizației vs. benchmark de piață (industrie, regiune)"],
      unlocked: data.layers.layer2.unlocked,
    },
    {
      layer: "LAYER 3", icon: "🌱", title: "Dezvoltare", anchor: SECTION_IDS.development,
      items: ["Servicii de dezvoltare organizațională bazate pe date"],
      unlocked: data.layers.layer3.unlocked,
    },
    {
      layer: "ANEXE", icon: "📎", title: "Anexe", anchor: SECTION_IDS.annexInputs,
      items: ["Datele prelucrate · Metodologia · Cadrul legislativ · Glosar"],
      unlocked: true,
    },
  ]

  return (
    <PageSheet id={SECTION_IDS.toc} pageNum={2} totalPages={9}>
      <h2 className={t.heading}>Cuprins</h2>
      <p className={`${t.body} mt-3 mb-8`}>
        Prezentul raport sintetizează rezultatele analizei realizate asupra structurii organizaționale
        și salariale a companiei <strong>{data.company.name}</strong>. Fiecare strat se construiește
        pe cel anterior, asigurând o abordare coerentă și fundamentată.
      </p>
      <div className="space-y-4">
        {sections.map(s => (
          <a
            key={s.layer}
            href={`#${s.anchor}`}
            className={`${t.card} block ${!s.unlocked ? "opacity-50 pointer-events-none" : "hover:shadow-md transition-shadow"}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`${t.badge} ${s.unlocked ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                {s.layer}
              </span>
              <h3 className={t.subheading}>{s.title}</h3>
              {!s.unlocked && <span className="text-sm text-slate-400 ml-auto">🔒</span>}
            </div>
            <ul className="mt-2 ml-10 space-y-1">
              {s.items.map(item => (
                <li key={item} className={`${t.body} flex items-center gap-2`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.unlocked ? "bg-emerald-400" : "bg-slate-300"}`} />
                  {item}
                </li>
              ))}
            </ul>
          </a>
        ))}
      </div>
    </PageSheet>
  )
}

function LockedOverlay({ layerName, t }: { layerName: string; t: typeof themes.sobru }) {
  return (
    <div className={`absolute inset-0 ${t.lockOverlay} flex items-center justify-center z-10 rounded-lg`}>
      <div className="text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <p className="text-slate-700 font-semibold">{layerName}</p>
        <p className="text-slate-500 text-sm">Activați acest strat pentru a vedea conținutul complet</p>
        <button className="mt-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
          Activează acum
        </button>
      </div>
    </div>
  )
}

function JESection({ data, t, onOpenSimulator, modifiedJE }: { data: MasterReportData; t: typeof themes.sobru; onOpenSimulator?: (section: string) => void; modifiedJE?: MasterJobEvaluation[] }) {
  const je = modifiedJE || data.layers.baza.jobEvaluations

  // Agregare litere 6→4 criterii legale
  function getLegalLetters(j: typeof je[0]) {
    if (!j.letters) return null
    return {
      cunostinte: `${j.letters.Knowledge}·${j.letters.Communications}`,
      efort: j.letters.ProblemSolving,
      responsabilitati: `${j.letters.DecisionMaking}·${j.letters.BusinessImpact}`,
      conditii: j.letters.WorkingConditions,
    }
  }

  const hasLetters = je.some(j => j.letters)

  return (
    <PageSheet id={SECTION_IDS.je} pageNum={3} totalPages={9}>
      <div className="relative">
        {!data.layers.baza.unlocked && <LockedOverlay layerName="BAZA — Ordine internă" t={t} />}
        <div className="flex items-center gap-3 mb-2">
          <span className={`${t.badge} bg-slate-100 text-slate-600`}>BAZA</span>
          <h2 className={t.heading}>Evaluare și ierarhizare posturi</h2>
        </div>

        <div className={`${t.body} mb-6 space-y-3`}>
          <p>
            Evaluarea posturilor a fost realizată prin metoda analitică a punctajelor, conform recomandărilor
            Organizației Internaționale a Muncii (ILO, 2008) și cerințelor
            <strong> Directivei (UE) 2023/970, Art. 4</strong> — care impune utilizarea unor criterii
            obiective și neutre din perspectiva genului.
          </p>
          <p>
            Fiecare post a fost evaluat pe <strong>4 criterii</strong> definite la Art. 3(1)(g) al Directivei:
            cunoștințe și deprinderi profesionale, efort intelectual și/sau fizic, responsabilități
            și condiții de muncă. Nivelul de complexitate per criteriu este exprimat prin litere
            (A = minim → G = maxim).
          </p>
        </div>

        {hasLetters && (
          <div className="mb-4 grid grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="font-semibold text-slate-700">Cunoștințe</p>
              <p className="text-slate-400 mt-0.5">Ce trebuie să știi și să poți</p>
              <p className="text-[10px] text-slate-300 mt-1">2 scale: educație · comunicare</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="font-semibold text-slate-700">Efort</p>
              <p className="text-slate-400 mt-0.5">Complexitatea problemelor</p>
              <p className="text-[10px] text-slate-300 mt-1">1 scală</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="font-semibold text-slate-700">Responsabilități</p>
              <p className="text-slate-400 mt-0.5">Ce decizi și ce impact are</p>
              <p className="text-[10px] text-slate-300 mt-1">2 scale: decizie · impact</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="font-semibold text-slate-700">Condiții</p>
              <p className="text-slate-400 mt-0.5">Mediul de lucru</p>
              <p className="text-[10px] text-slate-300 mt-1">1 scală</p>
            </div>
          </div>
        )}

        <table className="w-full text-left">
          <thead>
            <tr className={t.tableHead}>
              <th className="px-3 py-3 rounded-tl-lg">#</th>
              <th className="px-3 py-3">Poziție</th>
              <th className="px-3 py-3">Dept.</th>
              {hasLetters && (
                <>
                  <th className="px-3 py-3 text-center" title="Cunoștințe și deprinderi profesionale">Cunoșt.</th>
                  <th className="px-3 py-3 text-center" title="Efort intelectual și/sau fizic">Efort</th>
                  <th className="px-3 py-3 text-center" title="Responsabilități">Resp.</th>
                  <th className="px-3 py-3 text-center" title="Condiții de muncă">Cond.</th>
                </>
              )}
              <th className="px-3 py-3 text-right rounded-tr-lg">Scor</th>
            </tr>
          </thead>
          <tbody>
            {je.map((j, i) => {
              const legal = getLegalLetters(j)
              return (
                <tr key={i} className={t.tableRow}>
                  <td className="px-3 py-3 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{j.position}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs">{j.department}</td>
                  {legal && (
                    <>
                      <td className="px-3 py-3 text-center font-mono text-sm text-indigo-600">{legal.cunostinte}</td>
                      <td className="px-3 py-3 text-center font-mono text-sm text-indigo-600">{legal.efort}</td>
                      <td className="px-3 py-3 text-center font-mono text-sm text-indigo-600">{legal.responsabilitati}</td>
                      <td className="px-3 py-3 text-center font-mono text-sm text-indigo-600">{legal.conditii}</td>
                    </>
                  )}
                  <td className="px-3 py-3 text-right font-mono">{j.score}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Buton simulator */}
        {onOpenSimulator && (
          <button
            onClick={() => onOpenSimulator("je")}
            className="mt-6 w-full py-3 rounded-lg border-2 border-dashed border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
          >
            <span>🔧</span> Deschide simulatorul — modifică evaluarea criteriilor
          </button>
        )}

        <div className={`mt-6 p-4 rounded-lg bg-slate-50 border border-slate-100`}>
          <p className="text-xs text-slate-500">
            <strong>Concluzie:</strong> Ierarhia reflectă complexitatea reală a fiecărui post, independent de
            persoana care îl ocupă. Acest clasament constituie fundamentul pe care se construiește
            structura salarială — clasele și treptele de salarizare se obțin într-o etapă ulterioară,
            după încărcarea statului de funcții și normalizarea seriei de scoruri și salarii.
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Ref: Directiva (UE) 2023/970, Art. 4; ILO, „Guide to gender-neutral job evaluation" (2008).
          </p>
        </div>
      </div>
    </PageSheet>
  )
}

function SalaryGradesSection({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const je = data.layers.baza.jobEvaluations

  // Construim punctele scor+salariu din datele JE
  const salaryPoints = useMemo(() =>
    je.filter(j => j.salary && j.salary !== "—")
      .map(j => ({
        score: j.score,
        salary: parseInt(j.salary.replace(/[^\d]/g, "")),
        label: j.position,
      })),
  [je])

  const hasSalaryData = salaryPoints.length >= 2

  // Auto-detect nr clase
  const classDetection = useMemo<ClassDetection | null>(() => {
    if (!hasSalaryData) return null
    return autoDetectClassCount(salaryPoints.map(p => p.score))
  }, [salaryPoints, hasSalaryData])

  const [userClassCount, setUserClassCount] = useState<number | null>(null)
  const effectiveClassCount = userClassCount ?? classDetection?.suggested ?? 5

  const [userStepCount, setUserStepCount] = useState<number | null>(null)
  const effectiveStepCount = userStepCount ?? 4

  // Construim clasele Pitariu
  const pitariuGrades = useMemo(() => {
    if (!hasSalaryData) return null
    const computed = buildPitariuGrades(salaryPoints, effectiveClassCount, effectiveStepCount)
    return computed.length > 0 ? computed : null
  }, [salaryPoints, effectiveClassCount, effectiveStepCount, hasSalaryData])

  // Datele pentru grafic
  const gradeData = useMemo(() =>
    pitariuGrades?.map(g => ({
      name: g.name,
      scoreMin: g.scoreMin,
      scoreMax: g.scoreMax,
      salaryMin: g.salaryMin,
      salaryMax: g.salaryMax,
    })) ?? [],
  [pitariuGrades])

  const colors = ["border-l-indigo-500", "border-l-violet-500", "border-l-fuchsia-500", "border-l-orange-400", "border-l-emerald-500"]
  const bgColors = ["bg-indigo-50/30", "bg-violet-50/30", "bg-fuchsia-50/30", "bg-orange-50/30", "bg-emerald-50/30"]

  return (
    <PageSheet id={SECTION_IDS.salary} pageNum={4} totalPages={9}>
      <div className="relative">
        {!data.layers.layer1.unlocked && <LockedOverlay layerName="LAYER 1 — Conformitate" t={t} />}
        <div className="flex items-center gap-3 mb-2">
          <span className={`${t.badge} bg-indigo-100 text-indigo-700`}>LAYER 1</span>
          <h2 className={t.heading}>Structură salarială</h2>
        </div>

        <div className={`${t.body} mb-6 space-y-3`}>
          <p>
            Structura salarială a fost construită pe baza rezultatelor evaluării posturilor,
            prin metoda claselor salariale cu progresie geometrică. Fiecare clasă grupează posturi cu
            complexitate similară și definește un interval salarial minim–maxim.
          </p>
          <p>
            Conform <strong>Art. 4 alin. (4) din Directiva (UE) 2023/970</strong>, structurile de remunerare
            trebuie să fie transparente și bazate pe criterii obiective. Treptele din cadrul fiecărei clase
            permit avansarea salarială corelată cu evoluția profesională — performanță, vechime, nivel de instruire.
          </p>
        </div>

        {/* Selector clase și trepte */}
        {classDetection && (
          <ClassCountSelector
            classDetection={classDetection}
            effectiveClassCount={effectiveClassCount}
            userClassCount={userClassCount}
            onClassCountChange={setUserClassCount}
            effectiveStepCount={effectiveStepCount}
            userStepCount={userStepCount}
            onStepCountChange={setUserStepCount}
          />
        )}

        {/* Grafic Pitariu */}
        {gradeData.length > 0 && (
          <div className="my-6">
            <SalaryGradeChart
              grades={gradeData}
              salaryPoints={salaryPoints}
            />
          </div>
        )}

        {/* Tabel clase */}
        {pitariuGrades && pitariuGrades.length > 0 && (
          <table className="w-full text-left mb-6">
            <thead>
              <tr className={t.tableHead}>
                <th className="px-4 py-3 rounded-tl-lg">Clasă</th>
                <th className="px-4 py-3 text-right">Minim</th>
                <th className="px-4 py-3 text-right">Median</th>
                <th className="px-4 py-3 text-right">Maxim</th>
                <th className="px-4 py-3 rounded-tr-lg">Posturi încadrate</th>
              </tr>
            </thead>
            <tbody>
              {pitariuGrades.map((g, i) => {
                const positionsInGrade = je
                  .filter(j => j.score >= g.scoreMin && j.score <= g.scoreMax)
                  .map(j => j.position)
                  .join(", ") || "—"
                return (
                  <tr key={i} className={t.tableRow}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{g.name}</td>
                    <td className="px-4 py-3 text-right font-mono">{g.salaryMin.toLocaleString("ro-RO")}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{Math.round((g.salaryMin + g.salaryMax) / 2).toLocaleString("ro-RO")}</td>
                    <td className="px-4 py-3 text-right font-mono">{g.salaryMax.toLocaleString("ro-RO")}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{positionsInGrade}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Carduri detaliate per clasă cu trepte */}
        {pitariuGrades && pitariuGrades.some(g => g.steps.length > 0) && (
          <>
            <p className={`${t.body} mb-4`}>
              <strong>Detaliere per clasă</strong> — treptele de salarizare din cadrul fiecărei clase.
              Avansarea între trepte se face corelat cu evoluția profesională (performanță, vechime, instruire).
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {pitariuGrades.filter(g => g.steps.length > 0).map((g, i) => {
                const jobsInGrade = je.filter(j => j.score >= g.scoreMin && j.score <= g.scoreMax)
                return (
                  <div key={g.name} className={`rounded-lg border border-slate-200 border-l-4 ${colors[i % 5]} ${bgColors[i % 5]} p-4`}>
                    <p className="text-xs font-bold text-slate-900 mb-1">{g.name}</p>
                    <p className="text-[10px] text-slate-400 mb-3">Punctaj: {g.scoreMin}–{g.scoreMax} · Salariu: {g.salaryMin.toLocaleString("ro-RO")}–{g.salaryMax.toLocaleString("ro-RO")} RON</p>
                    <div className="space-y-1">
                      {g.steps.map(s => (
                        <div key={s.stepNumber} className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-white border border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">{s.stepNumber}</span>
                            <span className="text-slate-600">{s.name}</span>
                          </div>
                          <span className="font-semibold text-slate-800">{s.salary.toLocaleString("ro-RO")} RON</span>
                        </div>
                      ))}
                    </div>
                    {jobsInGrade.length > 0 && (
                      <p className="mt-2 pt-2 border-t border-slate-200/50 text-[9px] text-slate-400">
                        {jobsInGrade.map(j => j.position).join(", ")}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className={`mt-8 p-4 rounded-lg bg-slate-50 border border-slate-100`}>
          <p className="text-xs text-slate-500">
            <strong>Recomandare:</strong> Dacă un angajat se află pe ultima treaptă a clasei de salarizare,
            se recomandă elaborarea unui Plan de carieră în vederea retenției acestuia.
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Ref: Directiva (UE) 2023/970, Art. 4(4); Legea nr. 53/2003 (Codul Muncii), Art. 159–163.
          </p>
        </div>
      </div>
    </PageSheet>
  )
}

function PayGapSection({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const pg = data.layers.layer1.payGapCategories
  const flagColors = {
    OK: "bg-emerald-100 text-emerald-700",
    "ATENȚIE": "bg-amber-100 text-amber-700",
    SEMNIFICATIV: "bg-red-100 text-red-700",
  }

  return (
    <PageSheet id={SECTION_IDS.payGap} pageNum={5} totalPages={9}>
      <div className="relative">
        {!data.layers.layer1.unlocked && <LockedOverlay layerName="LAYER 1 — Conformitate" t={t} />}
        <div className="flex items-center gap-3 mb-2">
          <span className={`${t.badge} bg-indigo-100 text-indigo-700`}>LAYER 1</span>
          <h2 className={t.heading}>Analiză decalaj salarial</h2>
        </div>

        <div className={`${t.body} mb-6 space-y-3`}>
          <p>
            Analiza decalajului salarial a fost realizată conform <strong>Art. 9 al Directivei (UE) 2023/970</strong>.
            Comparația se face exclusiv între angajații de gen diferit care ocupă <strong>aceeași poziție</strong> și
            lucrează cu <strong>aceeași normă de lucru</strong>.
          </p>
          <p>
            Un decalaj de peste <strong>5%</strong> care nu poate fi justificat prin criterii obiective (vechime,
            performanță) necesită documentare și eventual măsuri corective.
          </p>
        </div>

        <div className="space-y-4">
          {pg.map((c, i) => (
            <div key={i} className={t.card}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-800">{c.category}</h3>
                <span className={`${t.badge} ${flagColors[c.flag]}`}>{c.flag}</span>
              </div>
              <div className="flex gap-8 text-sm">
                <span className="text-pink-600">♀ {c.women}</span>
                <span className="text-blue-600">♂ {c.men}</span>
                <span className="font-semibold text-slate-700">Δ {c.gap}</span>
              </div>
              {c.flag !== "OK" && (
                <p className="mt-3 text-xs text-slate-500 italic">{c.justification}</p>
              )}
            </div>
          ))}
        </div>

        <div className={`mt-8 p-4 rounded-lg bg-slate-50 border border-slate-100`}>
          <p className="text-xs text-slate-500">
            <strong>Concluzie:</strong> Decalajele identificate au fost analizate și justificate pe baza
            diferențelor obiective de complexitate, experiență și nivel ierarhic. Categoriile marcate
            „ATENȚIE" necesită monitorizare periodică.
          </p>
        </div>
      </div>
    </PageSheet>
  )
}

function BenchmarkSection({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const bm = data.layers.layer2.benchmarks

  function getPositionColor(status: string) {
    switch (status) {
      case "Sub P25": return "bg-red-100 text-red-700"
      case "P25–P50": return "bg-amber-100 text-amber-700"
      case "P50–P75": return "bg-emerald-100 text-emerald-700"
      case "Peste P75": return "bg-blue-100 text-blue-700"
      default: return "bg-slate-100 text-slate-600"
    }
  }

  return (
    <PageSheet id={SECTION_IDS.benchmark} pageNum={6} totalPages={9}>
      <div className="relative">
        {!data.layers.layer2.unlocked && <LockedOverlay layerName="LAYER 2 — Competitivitate" t={t} />}
        <div className="flex items-center gap-3 mb-2">
          <span className={`${t.badge} bg-violet-100 text-violet-700`}>LAYER 2</span>
          <h2 className={t.heading}>Salariile organizației vs. Benchmark de piață</h2>
        </div>

        <div className={`${t.body} mb-6 space-y-3`}>
          <p>
            Salariile din cadrul organizației au fost comparate cu datele de piață relevante (industrie,
            regiune, județe limitrofe). Datele de piață provin din surse agregate (INS TEMPO, studii
            salariale, portaluri de recrutare) și descriu distribuția salariilor pe piață sub formă
            de percentile.
          </p>
          <p>
            Salariile de piață se înscriu într-o <strong>distribuție normală</strong> (curba lui Gauss):
            P25 reprezintă pragul inferior al zonei medii, P50 (mediana) este centrul distribuției,
            iar P75 reprezintă pragul superior. <strong>Compa-ratio</strong> (salariul intern / mediana
            pieței × 100) indică unde se poziționează organizația față de centrul distribuției.
          </p>
        </div>

        {/* Legendă vizuală distribuție */}
        <div className="mb-4 flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Sub P25 — risc fluctuație</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> P25–P50 — sub mediană</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> P50–P75 — competitiv</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> Peste P75 — peste piață</span>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className={t.tableHead}>
              <th className="px-4 py-3 rounded-tl-lg">Poziție</th>
              <th className="px-4 py-3 text-right">Salariu intern</th>
              <th className="px-4 py-3 text-right">P25</th>
              <th className="px-4 py-3 text-right">Mediană (P50)</th>
              <th className="px-4 py-3 text-right">P75</th>
              <th className="px-4 py-3 text-right">Compa-ratio</th>
              <th className="px-4 py-3 rounded-tr-lg">Poziționare</th>
            </tr>
          </thead>
          <tbody>
            {bm.map((b, i) => (
              <tr key={i} className={t.tableRow}>
                <td className="px-4 py-3 font-medium text-slate-800">{b.position}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{b.internal}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{b.marketP25}</td>
                <td className="px-4 py-3 text-right font-mono text-sm">{b.marketP50}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{b.marketP75}</td>
                <td className="px-4 py-3 text-right font-mono">{b.index}</td>
                <td className="px-4 py-3">
                  <span className={`${t.badge} ${getPositionColor(b.status)}`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={`mt-8 p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2`}>
          <p className="text-xs text-slate-500">
            <strong>Interpretare:</strong> Un compa-ratio de 100% înseamnă aliniere perfectă cu mediana pieței.
            Valorile sub 85% semnalează un risc crescut de fluctuație a personalului — salariul nu este
            competitiv. Valorile peste 110% pot indica o supracompensare care merită evaluată în raport cu
            performanța și strategia de retenție a organizației.
          </p>
          <p className="text-xs text-slate-500">
            <strong>Recomandare:</strong> Pentru pozițiile situate sub P25, se recomandă ajustarea salarială
            treptată sau îmbunătățirea pachetului total de compensații. Pozițiile în zona P50–P75 sunt
            competitiv poziționate și susțin retenția.
          </p>
          <p className="text-[11px] text-slate-400">
            Surse date piață: INS TEMPO, studii salariale sectoriale, portaluri de recrutare. Actualizare trimestrială.
          </p>
        </div>
      </div>
    </PageSheet>
  )
}

function DevelopmentSection({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const available = data.layers.layer3.available
  return (
    <PageSheet id={SECTION_IDS.development} pageNum={7} totalPages={9}>
      <div className="relative">
        {!data.layers.layer3.unlocked && <LockedOverlay layerName="LAYER 3 — Dezvoltare" t={t} />}
        <div className="flex items-center gap-3 mb-2">
          <span className={`${t.badge} bg-emerald-100 text-emerald-700`}>LAYER 3</span>
          <h2 className={t.heading}>Dezvoltare organizațională</h2>
        </div>

        <div className={`${t.body} mb-8 space-y-3`}>
          <p>
            Pe baza evaluării și a structurii salariale construite în straturile anterioare, sunt disponibile
            servicii de dezvoltare organizațională care valorifică datele deja colectate.
          </p>
          <p>
            Aceste servicii se construiesc organic pe fundamentul creat — fiecare beneficiază de
            contextualizarea oferită de evaluarea posturilor, structura salarială și analiza de piață,
            reducând semnificativ timpul de implementare și crescând relevanța recomandărilor.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {available.map((svc, i) => (
            <div key={i} className={t.card}>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-700">{svc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageSheet>
  )
}

function AnnexInputsSection({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  return (
    <PageSheet id={SECTION_IDS.annexInputs} pageNum={8} totalPages={9}>
      <h2 className={t.heading}>Anexe — Datele analizei</h2>
      <p className={`${t.body} mt-3 mb-6`}>
        Transparența procesului este esențială. Mai jos este prezentat parcursul complet al analizei:
        datele furnizate de organizația dumneavoastră, procesele de prelucrare și modul în care s-au
        obținut rezultatele din acest raport.
      </p>

      <div className="space-y-5">
        <div className={t.card}>
          <h3 className={t.subheading}>A. Datele furnizate de organizație</h3>
          <ul className={`${t.body} mt-3 space-y-2`}>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span><strong>Profilul organizației</strong> — denumire, CUI, domeniu de activitate, structura departamentală ({data.company.departments.length} departamente)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span><strong>Nomenclatorul de posturi</strong> — {data.company.positions} posturi unice, fiecare cu denumire, departament și subordonare</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span><strong>Statul de funcții</strong> — {data.company.employees} angajați cu salariul brut de încadrare</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span><strong>Evaluarea criteriilor</strong> — pentru fiecare post, echipa a selectat nivelul de complexitate pe 6 criterii obiective, cu asistență AI</span>
            </li>
          </ul>
        </div>

        <div className={t.card}>
          <h3 className={t.subheading}>B. Procesele de prelucrare</h3>
          <ul className={`${t.body} mt-3 space-y-2`}>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">①</span>
              <span><strong>Scorare analitică</strong> — fiecare criteriu a fost cuantificat conform grilei de evaluare validate, generând un scor total per post</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">②</span>
              <span><strong>Ierarhizare</strong> — posturile au fost ordonate descrescător după scor, reflectând complexitatea reală</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">③</span>
              <span><strong>Construcția claselor salariale</strong> — pe baza dispersiei scorurilor și salariilor, au fost generate clase cu intervale și trepte de salarizare</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">④</span>
              <span><strong>Analiza decalajelor</strong> — salariile au fost comparate F/M pe aceeași poziție și normă, conform Art. 9 din Directiva EU 2023/970</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">⑤</span>
              <span><strong>Benchmark de piață</strong> — nivelurile interne au fost comparate cu percentilele de piață pentru industria și regiunea relevantă</span>
            </li>
          </ul>
        </div>

        <div className={t.card}>
          <h3 className={t.subheading}>C. Validare și calitate</h3>
          <p className={`${t.body} mt-3`}>
            Rezultatele au fost generate cu asistență AI și validate de echipa
            dumneavoastră înainte de finalizare. Metodologia este conformă cu standardele ILO și
            cu cerințele Directivei (UE) 2023/970 privind transparența salarială.
          </p>
        </div>
      </div>
    </PageSheet>
  )
}

function AnnexLegalSection({ t }: { t: typeof themes.sobru }) {
  return (
    <PageSheet id={SECTION_IDS.annexLegal} pageNum={9} totalPages={9}>
      <h2 className={t.heading}>Anexe — Cadru legislativ și metodologic</h2>
      <div className="mt-6 space-y-5">
        <div className={t.card}>
          <h3 className={t.subheading}>D. Cadru legislativ</h3>
          <ul className={`${t.body} mt-3 space-y-2`}>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">§</span>
              <span><strong>Directiva (UE) 2023/970</strong> — privind consolidarea aplicării principiului egalității de remunerare între femei și bărbați pentru aceeași muncă sau pentru o muncă de aceeași valoare, prin transparență salarială</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">§</span>
              <span><strong>Legea nr. 53/2003</strong> — Codul Muncii, republicat, cu modificările și completările ulterioare (Art. 159–163 privind salariul)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">§</span>
              <span><strong>OUG nr. 137/2000</strong> — privind prevenirea și sancționarea tuturor formelor de discriminare, republicată</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">§</span>
              <span><strong>Legea nr. 202/2002</strong> — privind egalitatea de șanse și de tratament între femei și bărbați, republicată</span>
            </li>
          </ul>
        </div>
        <div className={t.card}>
          <h3 className={t.subheading}>E. Metodologie</h3>
          <ul className={`${t.body} mt-3 space-y-2`}>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Evaluare analitică bazată pe 6 criterii neutre din perspectiva genului (conform ILO, „Guide to gender-neutral job evaluation", 2008)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Clase salariale cu progresie geometrică și trepte de salarizare (metodologie validată)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Calcul decalaj salarial conform Art. 9, Directiva (UE) 2023/970 — comparație pe categorii de muncă de valoare egală</span>
            </li>
          </ul>
        </div>
        <div className={t.card}>
          <h3 className={t.subheading}>F. Glosar</h3>
          <ul className={`${t.body} mt-3 space-y-2`}>
            <li><strong>Clasă salarială</strong> — interval de punctaj care grupează posturi cu complexitate similară, cu limite salariale minim/maxim asociate</li>
            <li><strong>Treaptă de salarizare</strong> — nivel salarial în cadrul unei clase; avansarea reflectă evoluția profesională (performanță, vechime, instruire)</li>
            <li><strong>Scor de evaluare</strong> — punctajul total rezultat din evaluarea analitică pe cele 6 criterii</li>
            <li><strong>Index de competitivitate</strong> — raportul dintre salariul intern și mediana de piață (P50)</li>
            <li><strong>Pay gap</strong> — diferența procentuală dintre medianele salariale pe gen, calculată per categorie de muncă echivalentă</li>
          </ul>
        </div>
      </div>
    </PageSheet>
  )
}

// ─── Componentul principal ─────────────────────────────────────────────────

export default function MasterReportFlipbook({ data, initialTheme = "sobru", onOpenSimulator, modifiedJE }: Props) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const t = themes[theme]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toolbar sticky */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 mb-8 rounded-b-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 font-medium">Format:</label>
          <button
            onClick={() => setTheme("sobru")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              theme === "sobru" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Profesional
          </button>
          <button
            onClick={() => setTheme("modern")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              theme === "modern" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Modern
          </button>
        </div>

        {/* Mini TOC navigation */}
        <div className="flex items-center gap-1">
          {[
            { icon: "📋", id: SECTION_IDS.cover, label: "Copertă" },
            { icon: "📑", id: SECTION_IDS.toc, label: "Cuprins" },
            { icon: "📊", id: SECTION_IDS.je, label: "Evaluare" },
            { icon: "💰", id: SECTION_IDS.salary, label: "Clase" },
            { icon: "⚖️", id: SECTION_IDS.payGap, label: "Pay gap" },
            { icon: "🎯", id: SECTION_IDS.benchmark, label: "Benchmark" },
            { icon: "🌱", id: SECTION_IDS.development, label: "Dezvoltare" },
            { icon: "📎", id: SECTION_IDS.annexInputs, label: "Anexe" },
            { icon: "§", id: SECTION_IDS.annexLegal, label: "Legislație" },
          ].map(nav => (
            <a
              key={nav.id}
              href={`#${nav.id}`}
              className="w-7 h-7 rounded text-xs flex items-center justify-center hover:bg-slate-100 transition-colors"
              title={nav.label}
            >
              {nav.icon}
            </a>
          ))}
        </div>
      </div>

      {/* Pagini — scroll vertical, fiecare ca o foaie separată */}
      <div className="space-y-8 pb-16">
        <CoverSection data={data} t={t} />
        <TOCSection data={data} t={t} />
        <JESection data={data} t={t} onOpenSimulator={onOpenSimulator} modifiedJE={modifiedJE} />
        <SalaryGradesSection data={data} t={t} />
        <PayGapSection data={data} t={t} />
        <BenchmarkSection data={data} t={t} />
        <DevelopmentSection data={data} t={t} />
        <AnnexInputsSection data={data} t={t} />
        <AnnexLegalSection t={t} />
      </div>
    </div>
  )
}
