import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "Demo — Rapoarte de referință — JobGrade",
  description:
    "Vedeți ce obțineți cu JobGrade: rapoarte reale de evaluare posturi, analiză pay gap, structuri salariale. Date fictive, rezultate concrete.",
}

/* ── Date fictive AgroVision SRL ────────────────────────────────────────── */

const COMPANY = {
  name: "AgroVision SRL",
  cui: "RO12345678",
  industry: "Agricultură și producție alimentară",
  employees: 45,
  positions: 12,
  departments: ["Management", "Producție", "Comercial", "Administrativ"],
}

const JE_RESULTS = [
  { position: "Director General", dept: "Management", score: 920, grade: "G-10", salary: "28.500 RON" },
  { position: "Director Producție", dept: "Management", score: 780, grade: "G-8", salary: "18.200 RON" },
  { position: "Director Comercial", dept: "Comercial", score: 760, grade: "G-8", salary: "17.800 RON" },
  { position: "Inginer Agronom Șef", dept: "Producție", score: 680, grade: "G-7", salary: "14.500 RON" },
  { position: "Contabil Șef", dept: "Administrativ", score: 620, grade: "G-6", salary: "13.200 RON" },
  { position: "Specialist Vânzări", dept: "Comercial", score: 480, grade: "G-5", salary: "9.800 RON" },
  { position: "Inginer Agronom", dept: "Producție", score: 460, grade: "G-5", salary: "9.500 RON" },
  { position: "Tehnician Laborator", dept: "Producție", score: 380, grade: "G-4", salary: "7.800 RON" },
  { position: "Operator Linie", dept: "Producție", score: 300, grade: "G-3", salary: "6.200 RON" },
  { position: "Specialist HR", dept: "Administrativ", score: 440, grade: "G-4", salary: "8.500 RON" },
  { position: "Șofer Distribuție", dept: "Comercial", score: 260, grade: "G-2", salary: "5.800 RON" },
  { position: "Muncitor Depozit", dept: "Producție", score: 200, grade: "G-1", salary: "5.200 RON" },
]

const PAY_GAP_CATEGORIES = [
  { category: "Management (full-time)", women: "17.800 RON", men: "28.500 RON", gap: "37,5%", flag: "SEMNIFICATIV", justification: "Director General (unic, fondator) vs Director Comercial. Diferență justificată prin senioritate (18 ani vs 6 ani) și responsabilitate decizională." },
  { category: "Producție — ingineri (full-time)", women: "9.500 RON", men: "14.500 RON", gap: "34,5%", flag: "SEMNIFICATIV", justification: "Inginer Agronom vs Inginer Agronom Șef. Diferența reflectă nivelul ierarhic diferit (G-5 vs G-7) și experiență (3 ani vs 12 ani). Poziții non-comparabile conform Art. 9." },
  { category: "Comercial (full-time)", women: "9.800 RON", men: "9.800 RON", gap: "0,0%", flag: "OK", justification: "—" },
  { category: "Administrativ (full-time)", women: "8.500 RON", men: "13.200 RON", gap: "35,6%", flag: "SEMNIFICATIV", justification: "Specialist HR vs Contabil Șef. Funcții diferite, grade diferite (G-4 vs G-6). Nu constituie muncă de valoare egală conform evaluării JE." },
  { category: "Producție — operatori (full-time)", women: "5.200 RON", men: "6.200 RON", gap: "16,1%", flag: "ATENȚIE", justification: "Muncitor Depozit vs Operator Linie. Grade diferite (G-1 vs G-3). Se recomandă analiză suplimentară pentru eventuală ajustare." },
]

const SALARY_GRADES = [
  { grade: "G-1", min: "4.800", mid: "5.400", max: "6.000", positions: "Muncitor Depozit" },
  { grade: "G-2", min: "5.200", mid: "5.900", max: "6.600", positions: "Șofer Distribuție" },
  { grade: "G-3", min: "5.700", mid: "6.500", max: "7.300", positions: "Operator Linie" },
  { grade: "G-4", min: "7.000", mid: "8.200", max: "9.400", positions: "Tehnician Laborator, Specialist HR" },
  { grade: "G-5", min: "8.500", mid: "9.800", max: "11.100", positions: "Specialist Vânzări, Inginer Agronom" },
  { grade: "G-6", min: "11.500", mid: "13.200", max: "14.900", positions: "Contabil Șef" },
  { grade: "G-7", min: "12.800", mid: "14.500", max: "16.200", positions: "Inginer Agronom Șef" },
  { grade: "G-8", min: "15.500", mid: "18.000", max: "20.500", positions: "Director Producție, Director Comercial" },
  { grade: "G-10", min: "24.000", mid: "28.500", max: "33.000", positions: "Director General" },
]

const BENCHMARK_DATA = [
  { position: "Director General", internal: "28.500", market_p25: "22.000", market_p50: "30.000", market_p75: "42.000", index: "95%", status: "Competitiv" },
  { position: "Director Producție", internal: "18.200", market_p25: "15.000", market_p50: "19.500", market_p75: "26.000", index: "93%", status: "Competitiv" },
  { position: "Inginer Agronom Șef", internal: "14.500", market_p25: "12.000", market_p50: "15.800", market_p75: "20.000", index: "92%", status: "Competitiv" },
  { position: "Contabil Șef", internal: "13.200", market_p25: "11.000", market_p50: "14.000", market_p75: "18.000", index: "94%", status: "Competitiv" },
  { position: "Specialist Vânzări", internal: "9.800", market_p25: "7.500", market_p50: "9.200", market_p75: "12.000", index: "107%", status: "Peste piață" },
  { position: "Operator Linie", internal: "6.200", market_p25: "5.500", market_p50: "6.800", market_p75: "8.000", index: "91%", status: "Sub piață" },
  { position: "Muncitor Depozit", internal: "5.200", market_p25: "4.800", market_p50: "5.600", market_p75: "6.500", index: "93%", status: "Competitiv" },
]

const JOB_DESCRIPTION = {
  title: "Inginer Agronom",
  department: "Producție",
  grade: "G-5",
  reports_to: "Inginer Agronom Șef",
  purpose: "Asigură monitorizarea și optimizarea proceselor de producție agricolă, contribuind la creșterea randamentului și conformitatea cu standardele de calitate.",
  responsibilities: [
    "Planifică și coordonează activitățile de cultivare conform calendarului agricol",
    "Monitorizează starea culturilor și recomandă tratamente fitosanitare",
    "Analizează parametrii de sol și apă, propune măsuri de îmbunătățire",
    "Întocmește rapoarte tehnice privind producția și randamentele",
    "Colaborează cu echipa de laborator pentru controlul calității",
    "Asigură conformitatea cu normele de protecția mediului",
  ],
  criteria: {
    education: { level: "Licență în agricultură / agronomie", score: 3 },
    communication: { level: "Comunică cu echipa de producție și management", score: 2 },
    problem_solving: { level: "Probleme tehnice cu variabile multiple", score: 3 },
    decision_making: { level: "Decizii operaționale cu impact pe recoltă", score: 2 },
    business_impact: { level: "Impact direct pe productivitate", score: 3 },
    work_conditions: { level: "Teren + laborator, expunere la intemperii", score: 3 },
  },
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#je" className="text-slate-600 hover:text-indigo-600">Evaluare posturi</a>
            <a href="#pay-gap" className="text-slate-600 hover:text-indigo-600">Pay Gap</a>
            <a href="#salary" className="text-slate-600 hover:text-indigo-600">Structură salarială</a>
            <a href="#benchmark" className="text-slate-600 hover:text-indigo-600">Benchmark</a>
            <Link href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Activează contul
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50/30" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-6">
            <span>📊</span> Rapoarte de referință — date fictive, rezultate reale
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Vedeți ce obțineți cu{" "}
            <span className="text-indigo-600">JobGrade</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Am generat rapoarte complete pentru o companie fictivă — <strong>{COMPANY.name}</strong> ({COMPANY.employees} angajați, {COMPANY.positions} poziții).
            Explorați fiecare raport ca să înțelegeți ce valoare primiți.
          </p>
        </div>
      </section>

      {/* Company Card */}
      <section className="max-w-5xl mx-auto px-6 -mt-4 mb-12">
        <div className="relative bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 p-6">
          <DemoWatermark />
          <div className="flex flex-wrap gap-6 items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{COMPANY.name}</h3>
              <p className="text-sm text-slate-500">{COMPANY.industry} &middot; CUI {COMPANY.cui}</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Stat label="Angajați" value={COMPANY.employees} />
              <Stat label="Poziții" value={COMPANY.positions} />
              <Stat label="Departamente" value={COMPANY.departments.length} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ R1: EVALUARE POSTURI (JE) ═══ */}
      <ReportSection id="je" index={1} title="Evaluare și ierarhizare posturi" subtitle="Ierarhia completă a pozițiilor, cu scoruri și grade atribuite pe baza a 6 criterii obiective.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-indigo-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Poziție</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Departament</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">Scor</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">Grad</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Salariu actual</th>
              </tr>
            </thead>
            <tbody>
              {JE_RESULTS.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.position}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.dept}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-7 rounded bg-indigo-100 text-indigo-800 font-bold text-xs">{r.score}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center justify-center px-2 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px]">{r.grade}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{r.salary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-indigo-50/50 rounded-lg">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Cum se citește:</strong> Scorul reflectă complexitatea poziției pe 6 dimensiuni (Educație, Comunicare, Rezolvare probleme, Luarea deciziilor, Impact asupra afacerii, Condiții de muncă). Gradul (G-1 la G-10) permite compararea obiectivă între departamente diferite. Două poziții cu același grad ar trebui să aibă salarii comparabile.
          </p>
        </div>
      </ReportSection>

      {/* ═══ R2: FIȘĂ POST AI ═══ */}
      <ReportSection id="job-desc" index={2} title="Fișă de post generată AI" subtitle={`Exemplu: ${JOB_DESCRIPTION.title} — generată automat din datele organizației.`} bg="bg-slate-50/50">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <Tag label="Departament" value={JOB_DESCRIPTION.department} />
            <Tag label="Grad" value={JOB_DESCRIPTION.grade} />
            <Tag label="Raportează la" value={JOB_DESCRIPTION.reports_to} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Scopul poziției</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{JOB_DESCRIPTION.purpose}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Responsabilități principale</h4>
            <ul className="space-y-1.5">
              {JOB_DESCRIPTION.responsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">●</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Criterii de evaluare</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(JOB_DESCRIPTION.criteria).map(([key, val]) => (
                <div key={key} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">{key.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-700 mt-1">{val.level}</p>
                  <div className="flex gap-0.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className={`w-4 h-1.5 rounded-full ${n <= val.score ? "bg-indigo-500" : "bg-slate-200"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ReportSection>

      {/* ═══ R3: PAY GAP ═══ */}
      <ReportSection id="pay-gap" index={3} title="Analiză decalaj salarial (Pay Gap)" subtitle="Conform Art. 9, Directiva EU 2023/970 — analiză pe categorii de lucrători, nu indicator global.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-amber-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Categorie lucrători</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Median F</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Median M</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">Gap</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {PAY_GAP_CATEGORIES.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.category}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{r.women}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{r.men}</td>
                  <td className="px-4 py-2.5 text-center font-bold">
                    <span className={r.flag === "OK" ? "text-emerald-700" : r.flag === "ATENȚIE" ? "text-amber-700" : "text-red-700"}>
                      {r.gap}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.flag === "OK" ? "bg-emerald-100 text-emerald-800" :
                      r.flag === "ATENȚIE" ? "bg-amber-100 text-amber-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {r.flag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-amber-50/50 rounded-lg">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Cum se citește:</strong> Analiza compară salarii mediane pe categorii de lucrători (poziție &times; program de lucru), nu un indicator global. Un gap &gt; 5% marchează &ldquo;SEMNIFICATIV&rdquo; — nu înseamnă automat discriminare, dar necesită justificare documentată.
          </p>
        </div>
      </ReportSection>

      {/* ═══ R4: JUSTIFICARE PAY GAP ═══ */}
      <ReportSection id="justification" index={4} title="Justificare decalaj semnificativ" subtitle="Raport de argumentare pentru fiecare categorie cu gap > 5% — documentul pe care ITM-ul îl va solicita." bg="bg-slate-50/50">
        <div className="space-y-4">
          {PAY_GAP_CATEGORIES.filter(r => r.flag !== "OK").map((r, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 text-sm">{r.category}</h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  r.flag === "ATENȚIE" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                }`}>
                  Gap: {r.gap}
                </span>
              </div>
              <div className="flex gap-6 mb-3 text-xs text-slate-500">
                <span>Median femei: <strong className="text-slate-700">{r.women}</strong></span>
                <span>Median bărbați: <strong className="text-slate-700">{r.men}</strong></span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Justificare obiectivă</p>
                <p className="text-sm text-slate-700 leading-relaxed">{r.justification}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-indigo-50/50 rounded-lg">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>De ce contează:</strong> Directiva EU 2023/970 inversează sarcina probei — angajatorul trebuie să demonstreze că diferențele salariale au cauze obiective (senioritate, competențe, responsabilitate). Acest raport constituie documentația justificativă.
          </p>
        </div>
      </ReportSection>

      {/* ═══ R5: STRUCTURĂ SALARIALĂ ═══ */}
      <ReportSection id="salary" index={5} title="Structură salarială (clase și trepte)" subtitle="Grila de salarizare cu minim, median și maxim per grad — fundament pentru echitate internă.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Grad</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Minim (RON)</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Median (RON)</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Maxim (RON)</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Poziții</th>
              </tr>
            </thead>
            <tbody>
              {SALARY_GRADES.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center justify-center px-2 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px]">{r.grade}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.min}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{r.mid}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.max}</td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{r.positions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-emerald-50/50 rounded-lg">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Cum se folosește:</strong> Grila definește plaja salarială pentru fiecare grad. Un angajat cu salariul sub minim e sub-remunerat pentru complexitatea postului. Unul peste maxim e supra-remunerat — sau merită promovat la gradul următor.
          </p>
        </div>
      </ReportSection>

      {/* ═══ R6: BENCHMARK ═══ */}
      <ReportSection id="benchmark" index={6} title="Benchmark salarial vs piață" subtitle="Compararea salariilor interne cu datele de piață — percentilele 25, 50 și 75." bg="bg-slate-50/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Poziție</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Intern</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">P25</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">P50</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">P75</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">Index</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_DATA.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.position}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{r.internal}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{r.market_p25}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.market_p50}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{r.market_p75}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-slate-700">{r.index}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === "Competitiv" ? "bg-emerald-100 text-emerald-800" :
                      r.status === "Peste piață" ? "bg-sky-100 text-sky-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-sky-50/50 rounded-lg">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Cum se citește:</strong> Indexul compară salariul intern cu mediana pieței (P50). Sub 90% = risc de pierdere a angajaților. Peste 110% = supracost salarial. Între 90-110% = zonă competitivă.
          </p>
        </div>
      </ReportSection>

      {/* ═══ CTA ═══ */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
            Aceste rapoarte pot fi generate pentru compania dumneavoastră
          </h2>
          <p className="mt-4 text-indigo-200 text-lg leading-relaxed">
            Încărcați datele organizației, iar platforma generează automat
            evaluarea posturilor, structura salarială, analiza pay gap și
            documentația conformă cu Directiva EU 2023/970.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Activează contul — 399 RON/lună
            </Link>
            <Link
              href="/b2b/je"
              className="inline-flex items-center justify-center border-2 border-indigo-300 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-indigo-700 transition-colors"
            >
              Află mai multe despre servicii
            </Link>
          </div>
          <p className="mt-6 text-sm text-indigo-300">
            Include 50 credite/lună &middot; Rapoarte gratuite: profil sectorial, MVV draft &middot; Fără angajament pe termen lung
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:text-white transition-colors">Acasă</Link>
            <Link href="/b2b/je" className="hover:text-white transition-colors">Servicii</Link>
            <Link href="/termeni" className="hover:text-white transition-colors">Termeni</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Confidențialitate</Link>
            <Link href="/transparenta-ai" className="hover:text-white transition-colors">Transparență AI</Link>
          </div>
          <p className="text-xs">&copy; {new Date().getFullYear()} Psihobusiness Consulting SRL. Toate drepturile rezervate.</p>
        </div>
      </footer>
    </div>
  )
}

/* ── Componente auxiliare ────────────────────────────────────────────────── */

function DemoWatermark() {
  return (
    <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800">
      <span className="text-[10px] font-bold uppercase tracking-wider">Demo</span>
      <span className="text-[9px]">Date fictive</span>
    </div>
  )
}

function ReportSection({
  id, index, title, subtitle, children, bg = "",
}: {
  id: string; index: number; title: string; subtitle: string; children: React.ReactNode; bg?: string
}) {
  return (
    <section id={id} className={`py-14 ${bg}`}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative">
          <DemoWatermark />
          <div className="mb-6">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mr-2">
              {index}
            </span>
            <h2 className="inline text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">{subtitle}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-indigo-700">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  )
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}:</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  )
}
