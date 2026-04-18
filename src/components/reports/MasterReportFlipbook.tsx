"use client"

import React, { useRef, useState, useCallback, forwardRef } from "react"
import HTMLFlipBook from "react-pageflip"
import type { MasterReportData } from "@/lib/reports/master-report-data"

// ─── Tipuri ────────────────────────────────────────────────────────────────

type Theme = "sobru" | "magazine"

interface Props {
  data: MasterReportData
  initialTheme?: Theme
}

// ─── Page wrapper (react-pageflip necesită forwardRef pe children) ──────

const Page = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string; pageNum?: number; totalPages?: number }>(
  function Page({ children, className = "", pageNum, totalPages }, ref) {
    return (
      <div ref={ref} className={`bg-white overflow-hidden relative ${className}`}>
        {children}
        {pageNum != null && totalPages != null && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-between px-5 text-[9px] text-slate-300">
            <span>JobGrade.ro</span>
            <span>{pageNum} / {totalPages}</span>
          </div>
        )}
      </div>
    )
  }
)

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
}> = {
  sobru: {
    heading: "text-slate-900 font-serif text-xl font-bold",
    subheading: "text-slate-700 font-serif text-sm font-semibold",
    body: "text-slate-600 text-xs leading-relaxed",
    accent: "text-indigo-700",
    card: "border border-slate-200 rounded-lg p-3 bg-white",
    badge: "text-[10px] font-medium px-2 py-0.5 rounded",
    pageBg: "bg-white p-5",
    tableHead: "bg-slate-50 text-slate-700 text-xs font-semibold",
    tableRow: "border-b border-slate-100 text-sm",
    coverBg: "bg-gradient-to-br from-slate-800 to-slate-900",
    lockOverlay: "bg-slate-100/80 backdrop-blur-sm",
  },
  magazine: {
    heading: "text-slate-900 text-xl font-black tracking-tight",
    subheading: "text-indigo-600 text-sm font-bold",
    body: "text-slate-600 text-xs leading-relaxed",
    accent: "text-indigo-500",
    card: "border border-indigo-100 rounded-xl p-3 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm",
    badge: "text-[10px] font-bold px-2.5 py-1 rounded-full",
    pageBg: "bg-gradient-to-b from-white to-slate-50/50 p-5",
    tableHead: "bg-indigo-50 text-indigo-800 text-xs font-bold",
    tableRow: "border-b border-indigo-50 text-sm",
    coverBg: "bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900",
    lockOverlay: "bg-gradient-to-br from-indigo-50/90 to-violet-50/90 backdrop-blur-sm",
  },
}

// ─── ID-uri pagini pentru hyperlink-uri cuprins ───────────────────────────

const PAGE_IDS = {
  cover: 0,
  toc: 1,
  je: 2,
  salary: 3,
  payGap: 4,
  benchmark: 5,
  development: 6,
  annexInputs: 7,
  annexLegal: 8,
} as const

// ─── Componente pagini ─────────────────────────────────────────────────────

function CoverPage({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  return (
    <div className={`${t.coverBg} h-full flex flex-col items-center justify-center text-white p-8`}>
      {data.isDemo && (
        <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full rotate-12 shadow-lg">
          DEMO
        </div>
      )}
      <div className="text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
          <span className="text-3xl">📊</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">Raport Master</h1>
          <p className="text-white/70 text-sm font-medium">Analiza completă a structurii organizaționale și salariale</p>
          <p className="text-white/40 text-xs mt-1">Evaluare · Ierarhizare · Conformitate · Recomandări</p>
        </div>
        <div className="border-t border-white/20 pt-6 space-y-1">
          <p className="text-xl font-semibold">{data.company.name}</p>
          <p className="text-white/50 text-sm">CUI: {data.company.cui}</p>
          <p className="text-white/50 text-sm">{data.company.industry}</p>
        </div>
        <div className="flex gap-6 justify-center text-white/70 text-xs">
          <span>{data.company.employees} angajați</span>
          <span>{data.company.positions} posturi evaluate</span>
          <span>{data.company.departments.length} departamente</span>
        </div>
      </div>
      <div className="absolute bottom-6 text-center">
        <p className="text-white/30 text-[10px]">
          Generat: {new Date(data.generatedAt).toLocaleDateString("ro-RO")} · JobGrade.ro
        </p>
        <p className="text-white/20 text-[9px] mt-1">
          Document confidențial — uz intern
        </p>
      </div>
    </div>
  )
}

function TOCPage({ data, t, onNavigate }: { data: MasterReportData; t: typeof themes.sobru; onNavigate: (page: number) => void }) {
  const sections = [
    {
      layer: "BAZA", icon: "🏗️", title: "Ordine internă", page: PAGE_IDS.je,
      items: ["Evaluarea și ierarhizarea posturilor pe baza criteriilor obiective"],
      unlocked: data.layers.baza.unlocked,
    },
    {
      layer: "LAYER 1", icon: "⚖️", title: "Conformitate", page: PAGE_IDS.salary,
      items: [
        "Structură salarială — clase și trepte de salarizare",
        "Analiză decalaj salarial conform Art. 9, Directiva EU 2023/970",
        "Justificări pentru decalaje semnificative",
      ],
      unlocked: data.layers.layer1.unlocked,
    },
    {
      layer: "LAYER 2", icon: "🎯", title: "Competitivitate", page: PAGE_IDS.benchmark,
      items: ["Benchmark salarial — poziționare față de piața relevantă"],
      unlocked: data.layers.layer2.unlocked,
    },
    {
      layer: "LAYER 3", icon: "🌱", title: "Dezvoltare", page: PAGE_IDS.development,
      items: ["Servicii de dezvoltare organizațională bazate pe date"],
      unlocked: data.layers.layer3.unlocked,
    },
    {
      layer: "ANEXE", icon: "📎", title: "Anexe", page: PAGE_IDS.annexInputs,
      items: ["Datele prelucrate · Metodologia · Cadrul legislativ · Glosar"],
      unlocked: true,
    },
  ]

  return (
    <div className={`${t.pageBg} h-full`}>
      <h2 className={t.heading}>Cuprins</h2>
      <p className={`${t.body} mt-1 mb-3`}>
        Prezentul raport sintetizează rezultatele analizei asupra structurii organizaționale
        și salariale a companiei <strong>{data.company.name}</strong>.
      </p>
      <div className="space-y-2">
        {sections.map(s => (
          <button
            key={s.layer}
            onClick={() => s.unlocked && onNavigate(s.page)}
            className={`${t.card} ${!s.unlocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md transition-shadow"} w-full text-left`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{s.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`${t.badge} ${s.unlocked ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                    {s.layer}
                  </span>
                  <h3 className={t.subheading}>{s.title}</h3>
                  {!s.unlocked && <span className="text-xs text-slate-400 ml-auto">🔒</span>}
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {s.items.map(item => (
                    <li key={item} className={`${t.body} flex items-center gap-2`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.unlocked ? "bg-emerald-400" : "bg-slate-300"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function LockedOverlay({ layerName, t }: { layerName: string; t: typeof themes.sobru }) {
  return (
    <div className={`absolute inset-0 ${t.lockOverlay} flex items-center justify-center z-10 rounded-lg`}>
      <div className="text-center space-y-3">
        <div className="text-4xl">🔒</div>
        <p className="text-slate-700 font-semibold text-sm">{layerName}</p>
        <p className="text-slate-500 text-xs">Activați acest strat pentru a vedea conținutul complet</p>
        <button className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
          Activează acum
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   BAZA — Evaluare și ierarhizare posturi
   Regula: Clasele NU apar aici. Doar poziție, departament, scor, salariu.
   ═══════════════════════════════════════════════════════════════════════════ */

function JEPage({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const je = data.layers.baza.jobEvaluations
  return (
    <div className={`${t.pageBg} h-full relative`}>
      {!data.layers.baza.unlocked && <LockedOverlay layerName="BAZA — Ordine internă" t={t} />}
      <div className="flex items-center gap-2 mb-1">
        <span className={`${t.badge} bg-slate-100 text-slate-600`}>BAZA</span>
        <h2 className={t.heading}>Evaluare și ierarhizare posturi</h2>
      </div>

      <div className={`${t.body} mb-2 space-y-1`}>
        <p>
          Evaluarea posturilor a fost realizată prin metoda analitică a punctajelor, conform recomandărilor
          Organizației Internaționale a Muncii (ILO, 2008) și cerințelor
          <strong> Directivei (UE) 2023/970, Art. 4</strong> — care impune utilizarea unor criterii
          obiective și neutre din perspectiva genului.
        </p>
        <p>
          Au fost aplicate <strong>6 criterii de evaluare</strong> (educație, comunicare, rezolvare de probleme,
          luarea deciziilor, impact asupra afacerii, condiții de muncă), fiecare cu subfactori
          și niveluri graduale. Scorurile agregate determină ierarhia prezentată mai jos.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className={t.tableHead}>
              <th className="px-2 py-1.5 rounded-tl-lg">#</th>
              <th className="px-2 py-1.5">Poziție</th>
              <th className="px-2 py-1.5">Departament</th>
              <th className="px-2 py-1.5 text-right rounded-tr-lg">Scor</th>
            </tr>
          </thead>
          <tbody>
            {je.map((j, i) => (
              <tr key={i} className={t.tableRow}>
                <td className="px-2 py-1.5 text-xs text-slate-400">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium text-slate-800">{j.position}</td>
                <td className="px-2 py-1.5 text-slate-500">{j.department}</td>
                <td className="px-2 py-1.5 text-right font-mono text-sm">{j.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 space-y-1">
        <p className="text-[10px] text-slate-400">
          <strong>Concluzie:</strong> Ierarhia reflectă complexitatea reală a fiecărui post, independent de
          persoana care îl ocupă. Acest clasament constituie fundamentul pe care se construiește
          structura salarială — clasele și treptele de salarizare se obțin într-o etapă ulterioară,
          după încărcarea statului de funcții și normalizarea seriei de scoruri și salarii.
        </p>
        <p className="text-[10px] text-slate-400">
          Ref: Directiva (UE) 2023/970, Art. 4; ILO, „Guide to gender-neutral job evaluation" (2008).
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LAYER 1 — Structură salarială (clase + trepte)
   Regula: Aici apar clasele și treptele, NU în secțiunea de evaluare.
   ═══════════════════════════════════════════════════════════════════════════ */

function SalaryGradesPage({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const sg = data.layers.layer1.salaryGrades
  return (
    <div className={`${t.pageBg} h-full relative`}>
      {!data.layers.layer1.unlocked && <LockedOverlay layerName="LAYER 1 — Conformitate" t={t} />}
      <div className="flex items-center gap-2 mb-1">
        <span className={`${t.badge} bg-indigo-100 text-indigo-700`}>LAYER 1</span>
        <h2 className={t.heading}>Structură salarială</h2>
      </div>

      <div className={`${t.body} mb-2 space-y-1`}>
        <p>
          Structura salarială prezentată mai jos a fost construită pe baza rezultatelor evaluării posturilor,
          prin metoda claselor salariale cu progresie geometrică. Fiecare clasă grupează posturi cu
          complexitate similară și definește un interval salarial minim–maxim.
        </p>
        <p>
          Conform <strong>Art. 4 alin. (4) din Directiva (UE) 2023/970</strong>, structurile de remunerare
          trebuie să fie transparente și bazate pe criterii obiective. Treptele din cadrul fiecărei clase
          permit avansarea salarială corelată cu evoluția profesională — performanță, vechime, nivel de instruire.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className={t.tableHead}>
              <th className="px-2 py-1.5 rounded-tl-lg">Clasă</th>
              <th className="px-2 py-1.5 text-right">Minim</th>
              <th className="px-2 py-1.5 text-right">Median</th>
              <th className="px-2 py-1.5 text-right">Maxim</th>
              <th className="px-2 py-1.5">Posturi</th>
              <th className="px-2 py-1.5 rounded-tr-lg">Trepte</th>
            </tr>
          </thead>
          <tbody>
            {sg.map((g, i) => (
              <tr key={i} className={t.tableRow}>
                <td className="px-2 py-1.5 font-semibold text-slate-800">{g.grade}</td>
                <td className="px-2 py-1.5 text-right font-mono text-sm">{g.min}</td>
                <td className="px-2 py-1.5 text-right font-mono text-sm font-semibold">{g.mid}</td>
                <td className="px-2 py-1.5 text-right font-mono text-sm">{g.max}</td>
                <td className="px-2 py-1.5 text-xs text-slate-500 max-w-[200px] truncate">{g.positions}</td>
                <td className="px-2 py-1.5 text-xs text-slate-500">{g.steps.length} trepte</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 space-y-1">
        <p className="text-[10px] text-slate-400">
          <strong>Recomandare:</strong> Dacă un angajat se află pe ultima treaptă a clasei de salarizare,
          se recomandă elaborarea unui Plan de carieră în vederea retenției acestuia.
        </p>
        <p className="text-[10px] text-slate-400">
          Ref: Directiva (UE) 2023/970, Art. 4(4); Legea nr. 53/2003 (Codul Muncii), Art. 159–163.
        </p>
      </div>
    </div>
  )
}

function PayGapPage({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const pg = data.layers.layer1.payGapCategories
  const flagColors = {
    OK: "bg-emerald-100 text-emerald-700",
    "ATENȚIE": "bg-amber-100 text-amber-700",
    SEMNIFICATIV: "bg-red-100 text-red-700",
  }

  return (
    <div className={`${t.pageBg} h-full relative`}>
      {!data.layers.layer1.unlocked && <LockedOverlay layerName="LAYER 1 — Conformitate" t={t} />}
      <div className="flex items-center gap-2 mb-1">
        <span className={`${t.badge} bg-indigo-100 text-indigo-700`}>LAYER 1</span>
        <h2 className={t.heading}>Analiză decalaj salarial</h2>
      </div>

      <div className={`${t.body} mb-2 space-y-1`}>
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

      <div className="space-y-2">
        {pg.map((c, i) => (
          <div key={i} className={t.card}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-800">{c.category}</h3>
              <span className={`${t.badge} ${flagColors[c.flag]}`}>{c.flag}</span>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-pink-600">♀ {c.women}</span>
              <span className="text-blue-600">♂ {c.men}</span>
              <span className="font-semibold text-slate-700">Δ {c.gap}</span>
            </div>
            {c.flag !== "OK" && (
              <p className="mt-2 text-xs text-slate-500 italic">{c.justification}</p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10px] text-slate-400">
        <strong>Concluzie:</strong> Decalajele identificate au fost analizate și justificate pe baza
        diferențelor obiective de complexitate, experiență și nivel ierarhic. Categoriile marcate
        „ATENȚIE" necesită monitorizare periodică.
      </p>
    </div>
  )
}

function BenchmarkPage({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const bm = data.layers.layer2.benchmarks
  return (
    <div className={`${t.pageBg} h-full relative`}>
      {!data.layers.layer2.unlocked && <LockedOverlay layerName="LAYER 2 — Competitivitate" t={t} />}
      <div className="flex items-center gap-2 mb-1">
        <span className={`${t.badge} bg-violet-100 text-violet-700`}>LAYER 2</span>
        <h2 className={t.heading}>Benchmark salarial vs. piață</h2>
      </div>

      <div className={`${t.body} mb-2 space-y-1`}>
        <p>
          Competitivitatea salarială a fost evaluată prin compararea nivelurilor interne cu percentilele
          de piață (P25, P50, P75) pentru pozițiile echivalente din industria relevantă.
        </p>
        <p>
          Indicele de competitivitate (raport salariu intern / mediană piață) oferă o imagine clară a
          poziționării organizației. Un indice sub 90% semnalează risc de fluctuație, iar unul peste 110%
          poate indica o supracompensare care necesită evaluare.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className={t.tableHead}>
              <th className="px-2 py-1.5 rounded-tl-lg">Poziție</th>
              <th className="px-2 py-1.5 text-right">Intern</th>
              <th className="px-2 py-1.5 text-right">P25</th>
              <th className="px-2 py-1.5 text-right">P50</th>
              <th className="px-2 py-1.5 text-right">P75</th>
              <th className="px-2 py-1.5 text-right">Index</th>
              <th className="px-2 py-1.5 rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {bm.map((b, i) => (
              <tr key={i} className={t.tableRow}>
                <td className="px-2 py-1.5 font-medium text-slate-800">{b.position}</td>
                <td className="px-2 py-1.5 text-right font-mono text-sm font-semibold">{b.internal}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs text-slate-400">{b.marketP25}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{b.marketP50}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs text-slate-400">{b.marketP75}</td>
                <td className="px-2 py-1.5 text-right font-mono text-sm">{b.index}</td>
                <td className="px-2 py-1.5">
                  <span className={`${t.badge} ${
                    b.status === "Competitiv" ? "bg-emerald-100 text-emerald-700"
                    : b.status === "Peste piață" ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                  }`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[10px] text-slate-400">
        <strong>Recomandare:</strong> Pentru pozițiile cu index sub 90%, se recomandă ajustarea salarială
        treptată sau îmbunătățirea pachetului total de compensații (beneficii, dezvoltare profesională)
        pentru a reduce riscul de fluctuație.
      </p>
    </div>
  )
}

function DevelopmentPage({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  const available = data.layers.layer3.available
  return (
    <div className={`${t.pageBg} h-full relative`}>
      {!data.layers.layer3.unlocked && <LockedOverlay layerName="LAYER 3 — Dezvoltare" t={t} />}
      <div className="flex items-center gap-2 mb-1">
        <span className={`${t.badge} bg-emerald-100 text-emerald-700`}>LAYER 3</span>
        <h2 className={t.heading}>Dezvoltare organizațională</h2>
      </div>

      <div className={`${t.body} mb-2 space-y-1`}>
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

      <div className="grid grid-cols-2 gap-3">
        {available.map((svc, i) => (
          <div key={i} className={t.card}>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 text-sm font-bold">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-slate-700">{svc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANEXE — Date prelucrate (inputuri client + procese)
   „Ce ați introdus, ce am prelucrat, cum s-au obținut rezultatele"
   ═══════════════════════════════════════════════════════════════════════════ */

function AnnexInputsPage({ data, t }: { data: MasterReportData; t: typeof themes.sobru }) {
  return (
    <div className={`${t.pageBg} h-full`}>
      <h2 className={t.heading}>Anexe — Datele analizei</h2>
      <p className={`${t.body} mt-1 mb-2`}>
        Mai jos este prezentat parcursul complet al analizei: datele furnizate de organizație,
        procesele de prelucrare și modul în care s-au obținut rezultatele.
      </p>

      <div className="space-y-2">
        {/* A. Ce a introdus clientul */}
        <div className={t.card}>
          <h3 className={t.subheading}>A. Datele furnizate de organizație</h3>
          <p className={`${t.body} mt-1 mb-1`}>
            Datele introduse de echipa dumneavoastră în platformă:
          </p>
          <ul className={`${t.body} space-y-0.5`}>
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

        {/* B. Ce am prelucrat */}
        <div className={t.card}>
          <h3 className={t.subheading}>B. Procesele de prelucrare</h3>
          <p className={`${t.body} mt-1 mb-1`}>
            Etapele de analiză parcurse:
          </p>
          <ul className={`${t.body} space-y-0.5`}>
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
              <span><strong>Analiza decalajelor</strong> — salariile au fost comparate pe categorii echivalente, conform cerințelor Art. 9 din Directiva EU 2023/970</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">⑤</span>
              <span><strong>Benchmark de piață</strong> — nivelurile interne au fost comparate cu percentilele de piață pentru industria și regiunea relevantă</span>
            </li>
          </ul>
        </div>

        {/* C. Validarea */}
        <div className={t.card}>
          <h3 className={t.subheading}>C. Validare și calitate</h3>
          <p className={`${t.body} mt-1`}>
            Rezultatele au fost generate asistatic de inteligența artificială și validate de echipa
            dumneavoastră înainte de finalizare. Metodologia este conformă cu standardele ILO și
            cu cerințele Directivei (UE) 2023/970 privind transparența salarială.
          </p>
        </div>
      </div>
    </div>
  )
}

function AnnexLegalPage({ t }: { t: typeof themes.sobru }) {
  return (
    <div className={`${t.pageBg} h-full`}>
      <h2 className={t.heading}>Anexe — Cadru legislativ și metodologic</h2>
      <div className="mt-2 space-y-2">
        <div className={t.card}>
          <h3 className={t.subheading}>D. Cadru legislativ</h3>
          <ul className={`${t.body} mt-1 space-y-0.5`}>
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
          <ul className={`${t.body} mt-1 space-y-0.5`}>
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
          <ul className={`${t.body} mt-1 space-y-0.5`}>
            <li><strong>Clasă salarială</strong> — interval de punctaj care grupează posturi cu complexitate similară, cu limite salariale minim/maxim asociate</li>
            <li><strong>Treaptă de salarizare</strong> — nivel salarial în cadrul unei clase; avansarea reflectă evoluția profesională (performanță, vechime, instruire)</li>
            <li><strong>Scor de evaluare</strong> — punctajul total rezultat din evaluarea analitică pe cele 6 criterii</li>
            <li><strong>Index de competitivitate</strong> — raportul dintre salariul intern și mediana de piață (P50)</li>
            <li><strong>Pay gap</strong> — diferența procentuală dintre medianele salariale pe gen, calculată per categorie de muncă echivalentă</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ─── Componentul principal ─────────────────────────────────────────────────

export default function MasterReportFlipbook({ data, initialTheme = "sobru" }: Props) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [currentPage, setCurrentPage] = useState(0)
  const bookRef = useRef<any>(null)
  const t = themes[theme]

  const totalPages = 9 // copertă, cuprins, JE, clase, pay gap, benchmark, dezvoltare, anexe date, anexe legal

  const onFlip = useCallback((e: { data: number }) => {
    setCurrentPage(e.data)
  }, [])

  const goToPage = useCallback((page: number) => {
    bookRef.current?.pageFlip()?.turnToPage(page)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Format:</label>
          <button
            onClick={() => setTheme("sobru")}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              theme === "sobru" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Profesional
          </button>
          <button
            onClick={() => setTheme("magazine")}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              theme === "magazine" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Magazine
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
            disabled={currentPage <= 0}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-sm transition-colors"
          >
            ‹
          </button>
          <span className="text-xs text-slate-500 tabular-nums w-16 text-center">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => bookRef.current?.pageFlip()?.flipNext()}
            disabled={currentPage >= totalPages - 1}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-sm transition-colors"
          >
            ›
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Mini TOC */}
        <div className="flex gap-1">
          {["📋", "📑", "📊", "💰", "⚖️", "🎯", "🌱", "📎", "§"].map((icon, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                currentPage === i ? "bg-indigo-100 ring-1 ring-indigo-300" : "hover:bg-slate-100"
              }`}
              title={["Copertă", "Cuprins", "Evaluare posturi", "Clase salariale", "Decalaj salarial", "Benchmark", "Dezvoltare", "Anexe — Date", "Anexe — Legislație"][i]}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Flipbook */}
      <HTMLFlipBook
        ref={bookRef}
        width={700}
        height={900}
        size="stretch"
        minWidth={400}
        maxWidth={1200}
        minHeight={520}
        maxHeight={1500}
        showCover={true}
        mobileScrollSupport={true}
        onFlip={onFlip}
        className="shadow-2xl rounded-lg"
        style={{}}
        drawShadow={true}
        flippingTime={600}
        usePortrait={true}
        startZIndex={0}
        autoSize={true}
        maxShadowOpacity={0.5}
        clickEventForward={true}
        useMouseEvents={true}
        swipeDistance={30}
        showPageCorners={true}
        disableFlipByClick={false}
        startPage={0}
      >
        <Page><CoverPage data={data} t={t} /></Page>
        <Page pageNum={2} totalPages={totalPages}><TOCPage data={data} t={t} onNavigate={goToPage} /></Page>
        <Page pageNum={3} totalPages={totalPages}><JEPage data={data} t={t} /></Page>
        <Page pageNum={4} totalPages={totalPages}><SalaryGradesPage data={data} t={t} /></Page>
        <Page pageNum={5} totalPages={totalPages}><PayGapPage data={data} t={t} /></Page>
        <Page pageNum={6} totalPages={totalPages}><BenchmarkPage data={data} t={t} /></Page>
        <Page pageNum={7} totalPages={totalPages}><DevelopmentPage data={data} t={t} /></Page>
        <Page pageNum={8} totalPages={totalPages}><AnnexInputsPage data={data} t={t} /></Page>
        <Page pageNum={9} totalPages={totalPages}><AnnexLegalPage t={t} /></Page>
      </HTMLFlipBook>
    </div>
  )
}
