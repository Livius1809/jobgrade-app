import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "Demo — Dosarul de Conformitate EU — JobGrade",
  description:
    "Vedeți dosarul complet de conformitate cu Directiva EU 2023/970: evaluare posturi, analiză pay gap, justificări, structură salarială, benchmark. Date fictive, rezultate reale.",
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
  { position: "Specialist HR", dept: "Administrativ", score: 440, grade: "G-4", salary: "8.500 RON" },
  { position: "Operator Linie", dept: "Producție", score: 300, grade: "G-3", salary: "6.200 RON" },
  { position: "Șofer Distribuție", dept: "Comercial", score: 260, grade: "G-2", salary: "5.800 RON" },
  { position: "Muncitor Depozit", dept: "Producție", score: 200, grade: "G-1", salary: "5.200 RON" },
]

const PAY_GAP_CATEGORIES = [
  { category: "Management (full-time)", women: "17.800 RON", men: "28.500 RON", gap: "37,5%", flag: "SEMNIFICATIV" as const, justification: "Director General (unic, fondator) vs Director Comercial. Diferență justificată prin senioritate (18 ani vs 6 ani) și responsabilitate decizională." },
  { category: "Producție — ingineri (full-time)", women: "9.500 RON", men: "14.500 RON", gap: "34,5%", flag: "SEMNIFICATIV" as const, justification: "Inginer Agronom vs Inginer Agronom Șef. Diferența reflectă nivelul ierarhic diferit (G-5 vs G-7) și experiență (3 ani vs 12 ani). Poziții non-comparabile conform Art. 9." },
  { category: "Comercial (full-time)", women: "9.800 RON", men: "9.800 RON", gap: "0,0%", flag: "OK" as const, justification: "—" },
  { category: "Administrativ (full-time)", women: "8.500 RON", men: "13.200 RON", gap: "35,6%", flag: "SEMNIFICATIV" as const, justification: "Specialist HR vs Contabil Șef. Funcții diferite, grade diferite (G-4 vs G-6). Nu constituie muncă de valoare egală conform evaluării JE." },
  { category: "Producție — operatori (full-time)", women: "5.200 RON", men: "6.200 RON", gap: "16,1%", flag: "ATENȚIE" as const, justification: "Muncitor Depozit vs Operator Linie. Grade diferite (G-1 vs G-3). Se recomandă analiză suplimentară pentru eventuală ajustare." },
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

/* ── Pachete pe nevoi ───────────────────────────────────────────────────── */

const PACKAGES = [
  {
    id: "conformitate-eu",
    icon: "⚖️",
    name: "Conformitate EU 2023/970",
    tagline: "Dosarul complet pentru aliniere legislativă",
    description: "Tot ce aveți nevoie pentru conformitate cu Directiva EU privind transparența salarială: evaluarea posturilor, analiza decalajelor, justificări documentate, structură salarială obiectivă.",
    color: "indigo",
    documents: [
      "Evaluare și ierarhizare posturi (toate pozițiile)",
      "Analiză pay gap pe categorii de lucrători (Art. 9)",
      "Justificări documentate pentru decalaje semnificative",
      "Structură salarială cu clase și trepte",
      "Fișe de post actualizate (toate pozițiile)",
      "Benchmark salarial vs piața din domeniu",
    ],
    variants: [
      { name: "S", positions: "1-10", employees: "până la 30", price: "5.900", credits: "845" },
      { name: "M", positions: "11-30", employees: "până la 100", price: "15.700", credits: "2.420" },
      { name: "L", positions: "31-60", employees: "până la 300", price: "29.550", credits: "4.925" },
      { name: "XL", positions: "61-150", employees: "până la 1.000", price: "69.130", credits: "12.590" },
    ],
    traditional: "17.000 — 150.000+ RON (consultanță clasică)",
    active: true,
  },
  {
    id: "structura-salariala",
    icon: "📊",
    name: "Evaluare și Structură Salarială",
    tagline: "Ordine internă fără componenta de conformitate",
    description: "Evaluarea obiectivă a posturilor, grila de salarizare, pachete salariale competitive și benchmark cu piața. Pentru companii care vor echitate internă.",
    color: "emerald",
    documents: [
      "Evaluare și ierarhizare posturi",
      "Structură salarială (clase și trepte)",
      "Pachete salariale per grad",
      "Benchmark salarial vs piață",
    ],
    variants: [
      { name: "S", positions: "1-10", employees: "până la 30", price: "4.200", credits: "595" },
      { name: "M", positions: "11-30", employees: "până la 100", price: "11.400", credits: "1.755" },
      { name: "L", positions: "31-60", employees: "până la 300", price: "21.600", credits: "3.605" },
    ],
    traditional: "12.000 — 80.000+ RON",
    active: false,
  },
  {
    id: "recrutare",
    icon: "🎯",
    name: "Recrutare și Inducție",
    tagline: "De la proiectare la integrare",
    description: "Proiectarea procesului de recrutare, gestionarea candidaților, fișe de post, documente pre-angajare și manualul noului angajat.",
    color: "sky",
    documents: [
      "Design proces de recrutare",
      "Gestionare candidați (screening + evaluare)",
      "Fișe de post (generate AI)",
      "Documente pre-angajare",
      "Manual angajat personalizat",
    ],
    variants: [
      { name: "3 poziții", positions: "3", employees: "15 candidați", price: "3.200", credits: "462" },
      { name: "6 poziții", positions: "6", employees: "30 candidați", price: "5.800", credits: "864" },
      { name: "12 poziții", positions: "12", employees: "60 candidați", price: "10.500", credits: "1.668" },
    ],
    traditional: "9.000 — 36.000+ RON",
    active: false,
  },
  {
    id: "dezvoltare",
    icon: "🌱",
    name: "Dezvoltare Organizațională",
    tagline: "Evaluare performanță și plan de creștere",
    description: "Evaluarea performanței angajaților, planul de dezvoltare HR și evaluarea comună (Art. 10) pentru organizații care investesc în oameni.",
    color: "amber",
    documents: [
      "Evaluare performanță (per lot angajați)",
      "Plan dezvoltare resurse umane",
      "Raport impact bugetar",
      "Evaluare comună (Art. 10, opțional)",
    ],
    variants: [
      { name: "S", positions: "—", employees: "până la 30", price: "3.400", credits: "490" },
      { name: "M", positions: "—", employees: "până la 100", price: "8.600", credits: "1.330" },
      { name: "L", positions: "—", employees: "până la 300", price: "18.200", credits: "2.870" },
    ],
    traditional: "15.000 — 60.000+ RON",
    active: false,
  },
]

const colorMap: Record<string, { bg: string; border: string; text: string; light: string; badge: string }> = {
  indigo: { bg: "bg-indigo-600", border: "border-indigo-200", text: "text-indigo-700", light: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-800" },
  emerald: { bg: "bg-emerald-600", border: "border-emerald-200", text: "text-emerald-700", light: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-800" },
  sky: { bg: "bg-sky-600", border: "border-sky-200", text: "text-sky-700", light: "bg-sky-50", badge: "bg-sky-100 text-sky-800" },
  amber: { bg: "bg-amber-600", border: "border-amber-200", text: "text-amber-700", light: "bg-amber-50", badge: "bg-amber-100 text-amber-800" },
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
            <a href="#pachete" className="text-slate-600 hover:text-indigo-600">Pachete</a>
            <a href="#dosar" className="text-slate-600 hover:text-indigo-600">Dosarul EU</a>
            <a href="#preturi" className="text-slate-600 hover:text-indigo-600">Variante și prețuri</a>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-medium mb-6">
            Termen: iunie 2026 — Directiva EU 2023/970 privind transparența salarială
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Dosarul complet de conformitate.{" "}
            <span className="text-indigo-600">Vedeți cum arată.</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Am generat dosarul de conformitate EU pentru o companie fictivă — <strong>{COMPANY.name}</strong> ({COMPANY.employees} angajați, {COMPANY.positions} poziții).
            Fiecare document pe care ITM-ul îl poate solicita este acoperit.
          </p>
          <div className="mt-8">
            <a href="#dosar" className="inline-flex items-center justify-center bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
              Explorează dosarul complet
            </a>
          </div>
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
              <StatBox label="Angajați" value={COMPANY.employees} />
              <StatBox label="Poziții" value={COMPANY.positions} />
              <StatBox label="Departamente" value={COMPANY.departments.length} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PACHETE — overview ═══ */}
      <section id="pachete" className="py-14 bg-slate-50/50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Pachete organizate pe nevoi</h2>
          <p className="text-center text-sm text-slate-500 mb-10 max-w-xl mx-auto">
            Nu vindem credite abstracte. Fiecare pachet rezolvă o problemă concretă și conține toate documentele necesare.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {PACKAGES.map(pkg => {
              const c = colorMap[pkg.color]
              return (
                <div key={pkg.id} className={`relative bg-white rounded-2xl border ${c.border} p-6 ${pkg.active ? "ring-2 ring-indigo-300 shadow-lg" : "shadow-sm"}`}>
                  {pkg.active && (
                    <div className="absolute -top-3 left-6 px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Dosar demo disponibil
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{pkg.icon}</span>
                    <div>
                      <h3 className="font-bold text-slate-900">{pkg.name}</h3>
                      <p className="text-xs text-slate-500">{pkg.tagline}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{pkg.description}</p>
                  <div className="space-y-1.5 mb-4">
                    {pkg.documents.map((doc, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className={`mt-0.5 ${c.text}`}>✓</span>
                        {doc}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-400">
                      De la <strong className="text-slate-700">{pkg.variants[0].price} RON</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 line-through">{pkg.traditional}</div>
                  </div>
                  {pkg.active && (
                    <a href="#dosar" className="mt-4 w-full inline-flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                      Vezi dosarul complet generat
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ DOSARUL DE CONFORMITATE EU — toate rapoartele ═══ */}
      <section id="dosar" className="py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-medium mb-4">
              ⚖️ Pachet Conformitate EU 2023/970 — Dosar complet
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Dosarul de conformitate AgroVision SRL</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
              6 documente generate automat pe baza datelor organizației. Acesta e dosarul pe care ITM-ul îl va solicita.
            </p>
          </div>

          {/* D1: JE */}
          <ReportSection
            index={1}
            title="Evaluare și ierarhizare posturi"
            subtitle="Ierarhia completă pe 6 criterii obiective — fundament pentru tot dosarul."
            docLabel="Document obligatoriu: baza evaluării conform Art. 4"
          >
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
            <InfoBox>
              Scorul reflectă complexitatea poziției pe 6 dimensiuni (Educație, Comunicare, Rezolvare probleme, Luarea deciziilor, Impact asupra afacerii, Condiții de muncă). Gradul (G-1 la G-10) permite compararea obiectivă între departamente diferite.
            </InfoBox>
          </ReportSection>

          {/* D2: Fișă post */}
          <ReportSection
            index={2}
            title="Fișe de post actualizate"
            subtitle={`Exemplu: ${JOB_DESCRIPTION.title} — generată automat din datele organizației.`}
            docLabel="Document obligatoriu: descrierea funcției conform Art. 4 alin. 2"
          >
            <div className="p-6 space-y-5">
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
            <InfoBox>
              Fiecare fișă de post conține criterii de evaluare aliniate cu ierarhia JE. Dosarul complet include fișe pentru toate cele {COMPANY.positions} poziții.
            </InfoBox>
          </ReportSection>

          {/* D3: Pay Gap */}
          <ReportSection
            index={3}
            title="Analiză decalaj salarial (Pay Gap)"
            subtitle="Conform Art. 9 — analiză pe categorii de lucrători, nu indicator global."
            docLabel="Raportare obligatorie: Art. 9, categorii definite de Art. 4"
          >
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
            <InfoBox>
              Analiza compară salarii mediane pe categorii de lucrători (poziție &times; program de lucru). Un gap peste 5% necesită justificare documentată — vezi documentul următor.
            </InfoBox>
          </ReportSection>

          {/* D4: Justificări */}
          <ReportSection
            index={4}
            title="Justificări decalaje semnificative"
            subtitle="Documentația pe care ITM-ul o solicită: cauze obiective pentru fiecare gap > 5%."
            docLabel="Sarcina probei inversată: Art. 18 alin. 2"
          >
            <div className="p-4 space-y-4">
              {PAY_GAP_CATEGORIES.filter(r => r.flag !== "OK").map((r, i) => (
                <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-5">
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
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Justificare obiectivă</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{r.justification}</p>
                  </div>
                </div>
              ))}
            </div>
            <InfoBox>
              Directiva inversează sarcina probei: angajatorul trebuie să demonstreze că diferențele salariale au cauze obiective (senioritate, competențe, responsabilitate, grad diferit). Acest document constituie proba.
            </InfoBox>
          </ReportSection>

          {/* D5: Structură salarială */}
          <ReportSection
            index={5}
            title="Structură salarială (clase și trepte)"
            subtitle="Grila de salarizare obiectivă — fundamentul echității interne."
            docLabel="Structuri salariale transparente: Art. 6"
          >
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
            <InfoBox>
              Grila definește plaja salarială pentru fiecare grad. Angajații cu același grad au aceeași plajă salarială — demonstrație de echitate. Diferențele în cadrul plajei reflectă senioritate și performanță.
            </InfoBox>
          </ReportSection>

          {/* D6: Benchmark */}
          <ReportSection
            index={6}
            title="Benchmark salarial vs piață"
            subtitle="Compararea salariilor interne cu datele de piață — competitivitatea ofertei."
            docLabel="Context suplimentar: pozitionarea față de piață (Art. 5)"
          >
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
            <InfoBox>
              Indexul compară salariul intern cu mediana pieței (P50). Sub 90% = risc de pierdere a angajaților. Peste 110% = supracost salarial. Între 90-110% = zonă competitivă.
            </InfoBox>
          </ReportSection>
        </div>
      </section>

      {/* ═══ PREȚURI VARIANTE ═══ */}
      <section id="preturi" className="py-14 bg-slate-50/50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Variante și prețuri</h2>
          <p className="text-center text-sm text-slate-500 mb-10 max-w-xl mx-auto">
            Fiecare pachet se adaptează la dimensiunea organizației. Prețul include toate documentele din dosar.
          </p>

          {PACKAGES.map(pkg => {
            const c = colorMap[pkg.color]
            return (
              <div key={pkg.id} className="mb-8">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
                  <span>{pkg.icon}</span> {pkg.name}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <thead>
                      <tr className={c.light}>
                        <th className="px-4 py-3 font-semibold text-slate-700 text-left">Varianta</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 text-center">Poziții</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 text-center">Angajați</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 text-right">Credite</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 text-right">Preț (RON)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pkg.variants.map((v, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c.badge}`}>{v.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-600">{v.positions}</td>
                          <td className="px-4 py-2.5 text-center text-slate-600">{v.employees}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500">{v.credits} cr</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-800">{v.price} RON</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Echivalent consultanță tradițională: {pkg.traditional}
                </p>
              </div>
            )
          })}

          <div className="mt-6 p-6 bg-white rounded-2xl border border-slate-200 text-center">
            <p className="text-sm text-slate-600 mb-1">
              Toate pachetele necesită <strong>abonament activ</strong> (399 RON/lună sau 3.990 RON/an).
            </p>
            <p className="text-xs text-slate-400">
              Abonamentul include: acces platformă, dashboard cu diagnostic, MVV draft, profil sectorial, consultant HR familiarizare (135 min/lună).
            </p>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
            Dosarul de conformitate poate fi generat pentru compania dumneavoastră
          </h2>
          <p className="mt-4 text-indigo-200 text-lg leading-relaxed">
            Încărcați datele organizației, iar platforma generează automat
            toate documentele necesare pentru conformitate cu Directiva EU 2023/970.
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
            Diagnostic gratuit inclus &middot; Rapoarte de referință gratuite: profil sectorial, MVV draft &middot; Fără angajament pe termen lung
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
    <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 z-10">
      <span className="text-[10px] font-bold uppercase tracking-wider">Demo</span>
      <span className="text-[9px]">Date fictive</span>
    </div>
  )
}

function ReportSection({
  index, title, subtitle, docLabel, children,
}: {
  index: number; title: string; subtitle: string; docLabel: string; children: React.ReactNode
}) {
  return (
    <div className="mb-10">
      <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DemoWatermark />
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex-shrink-0">
              {index}
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-500">{subtitle}</p>
              <p className="mt-1 text-[10px] text-indigo-600 font-medium uppercase tracking-wider">{docLabel}</p>
            </div>
          </div>
        </div>
        {/* Content */}
        {children}
      </div>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 mb-4 mt-3 p-3 bg-slate-50 rounded-lg">
      <p className="text-xs text-slate-600 leading-relaxed">
        <strong>Cum se citește:</strong> {children}
      </p>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
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
