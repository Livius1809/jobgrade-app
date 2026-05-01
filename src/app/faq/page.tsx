import Link from "next/link"
import Image from "next/image"

export const metadata = {
  title: "Întrebări frecvente — JobGrade",
  description: "Răspunsuri la întrebările frecvente despre platformă, date, conformitate și servicii.",
}

const FAQ_SECTIONS = [
  {
    title: "Despre platformă",
    items: [
      {
        q: "Ce face JobGrade?",
        a: "JobGrade oferă servicii de consultanță în aspecte ce țin de proiectarea, evaluarea și funcționarea structurilor din companii, în raport cu stabilirea și realizarea obiectivelor lor de afaceri. De asemenea, oferă resurse suport persoanelor pentru asumarea adecvată a rolurilor pe care și le doresc.",
      },
      {
        q: "Pentru ce tip de organizații este potrivit?",
        a: "Pentru orice organizație cu cel puțin 2 posturi distincte — de la firme mici la corporații. Platforma se adaptează automat la dimensiunea organizației.",
      },
      {
        q: "Pot testa platforma înainte să plătesc?",
        a: "Da. Diagnosticul organizațional de bază este gratuit, fără cont și fără obligații. Introduceți datele companiei și primiți o analiză inițială, calendarul obligațiilor legale aplicabile și un scor de structură organizațională.",
      },
      {
        q: "Cum funcționează creditele?",
        a: "Creditele sunt moneda platformei. Fiecare serviciu (evaluare post, raport, simulare) are un cost în credite. Cumpărați pachete de credite — cu cât pachetul e mai mare, cu atât prețul per credit scade. Creditele nu expiră niciodată.",
      },
      {
        q: "Pot schimba abonamentul?",
        a: "Da, oricând. Dacă organizația crește, treceți la un abonament superior (upgrade instant). Dacă scade, treceți la unul inferior (de luna viitoare) — diferența se poate converti în credite.",
      },
      {
        q: "Dacă adaug posturi noi, plătesc de la zero?",
        a: "Nu. Plătiți doar pentru diferența nouă. Evaluările existente se păstrează intact. La fel și dacă restructurați — plătiți doar ce se schimbă.",
      },
    ],
  },
  {
    title: "Protecția datelor",
    items: [
      {
        q: "Ce date colectăm și de ce?",
        a: "Colectăm datele necesare pentru serviciile solicitate: structura organizațională (departamente, posturi), date salariale agregate (pentru pay gap), și date de utilizare a platformei. Nu colectăm date personale ale angajaților dumneavoastră decât în măsura în care le furnizați voluntar pentru analize specifice (ex: import stat de plată pentru analiza decalajului salarial).",
      },
      {
        q: "Cine are acces la datele noastre?",
        a: "Doar echipa autorizată a Psihobusiness Consulting SRL (operatorul platformei) și doar în scopul prestării serviciilor. Nu vindem, nu partajăm și nu folosim datele dumneavoastră în alte scopuri. Fiecare client are un spațiu izolat — datele unei organizații nu sunt accesibile altei organizații.",
      },
      {
        q: "Unde sunt stocate datele?",
        a: "Toate datele sunt stocate în Uniunea Europeană, pe infrastructură certificată. Utilizăm exclusiv furnizori conformi GDPR.",
      },
      {
        q: "Folosiți inteligență artificială? Ce se întâmplă cu datele noastre?",
        a: "Da, utilizăm AI pentru generarea fișelor de post, evaluări și rapoarte. Datele sunt procesate exclusiv pentru generarea răspunsului solicitat, fără a fi reținute, fără a fi folosite pentru antrenament și fără a fi partajate cu terți. Am realizat o evaluare de impact conform cerințelor aplicabile. Detalii complete în Politica de confidențialitate.",
      },
      {
        q: "Cât timp păstrați datele?",
        a: "Durata contractului plus: 3 ani pentru date de cont (prescripție comercială), 5 ani pentru evaluări (legislația muncii), 10 ani pentru date de facturare (Codul Fiscal). Conversațiile chat se șterg după 6 luni. Datele agregate anonime (minimum 5 persoane per categorie) pot fi reținute fără limită — nu sunt date personale.",
      },
      {
        q: "Ce se întâmplă cu datele la reziliere?",
        a: "La terminarea contractului, aveți dreptul să descărcați toate datele dumneavoastră (export complet). După expirarea termenelor de retenție legale, datele sunt șterse definitiv. Datele agregate anonime rămân doar ca statistici de piață.",
      },
      {
        q: "Ce drepturi am conform GDPR?",
        a: "Dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție. Solicitările se adresează responsabilului cu protecția datelor la dpo@jobgrade.ro și se rezolvă în maximum 30 de zile.",
      },
    ],
  },
  {
    title: "Conformitate și legislație",
    items: [
      {
        q: "Ce este Directiva EU 2023/970?",
        a: "Este directiva europeană privind transparența salarială, care impune companiilor să asigure remunerare egală pentru muncă egală sau de valoare egală. Companiile cu peste 100 de angajați trebuie să raporteze decalajele salariale pe gen. România urmează să transpună directiva în legislația națională.",
      },
      {
        q: "Cum ne ajută JobGrade cu conformitatea?",
        a: "Platforma evaluează posturile pe criterii obiective conform legislației (cunoștințe și competențe, responsabilitate, efort și condiții de muncă), construiește clase salariale transparente, identifică decalaje salariale nejustificate și generează rapoartele necesare pentru conformitate. Calendarul de obligații legale vă arată ce termene aveți de respectat.",
      },
      {
        q: "Evaluarea este obiectivă?",
        a: "Evaluarea se face pe 4 criterii conform legislației europene: cunoștințe și competențe, responsabilitate, efort și condiții de muncă. Se evaluează postul (cerințele poziției), nu persoana care îl ocupă. Procesul poate fi complet asistat de AI sau cu participarea unei comisii de evaluare.",
      },
      {
        q: "Platforma respectă AI Act?",
        a: "Da. Sistemele AI utilizate în procesele HR sunt clasificate ca risc înalt conform Anexei III a Regulamentului AI Act. Asigurăm: supraveghere umană (Art. 14), transparență (utilizatorii știu că interacționează cu AI), documentație tehnică, și evaluarea riscurilor. Posturile de tip AI sau mixt (om + AI) activează automat verificări de conformitate suplimentare.",
      },
    ],
  },
  {
    title: "Servicii și facturare",
    items: [
      {
        q: "Ce include abonamentul?",
        a: "Accesul la portal, găzduirea securizată a datelor, suport tehnic, minute de consultanță HR gratuite (funcție de abonament) și actualizări legislative automate. Serviciile specifice (evaluări, rapoarte, simulări) se plătesc separat cu credite.",
      },
      {
        q: "Cum se face facturarea?",
        a: "Psihobusiness Consulting SRL (CIF RO15790994) este plătitoare de TVA. Abonamentul se facturează lunar sau anual. Pachetele de credite se facturează la achiziție. Toate facturile sunt emise electronic conform legislației în vigoare.",
      },
      {
        q: "Trebuie să semnez un contract?",
        a: "Da. Înainte de activarea contului, semnăm un contract de prestări servicii și un acord de prelucrare date (DPA). Contractul standard este disponibil pentru consultare după înregistrare.",
      },
      {
        q: "Ce personal operează platforma?",
        a: "Platforma este operată de personal specializat acreditat în psihologia muncii, transporturilor și serviciilor, cu formare psihanalitică. Procesele sunt supervizate de profesioniști cu experiență relevantă în evaluarea posturilor și consultanță organizațională.",
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/favicon.svg" alt="JobGrade" width={28} height={28} />
            <span className="text-base font-semibold text-slate-800">JobGrade</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/b2b/abonamente" className="text-slate-600 hover:text-indigo-600">Prețuri</Link>
            <Link href="/b2b/sandbox" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
              Diagnostic gratuit
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">Întrebări frecvente</h1>
          <p className="mt-3 text-slate-600">
            Răspunsuri directe despre platformă, protecția datelor, conformitate și servicii.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <main className="max-w-3xl mx-auto px-6 pb-20">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title} className="mt-12">
            <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-6">
              {section.title}
            </h2>
            <div className="space-y-5">
              {section.items.map((item) => (
                <div key={item.q} className="border-b border-slate-100 pb-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">{item.q}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Contact */}
        <section className="mt-16 bg-slate-50 rounded-xl p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Nu ați găsit răspunsul?</h2>
          <p className="text-sm text-slate-600 mb-4">
            Echipa noastră vă stă la dispoziție pentru orice întrebare suplimentară.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <a href="mailto:contact@jobgrade.ro" className="text-indigo-600 font-medium hover:underline">
              contact@jobgrade.ro
            </a>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <a href="mailto:dpo@jobgrade.ro" className="text-slate-500 hover:underline">
              Protecția datelor: dpo@jobgrade.ro
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <p className="text-xs">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-white">Confidențialitate</Link>
            <Link href="/termeni" className="hover:text-white">Termeni și condiții</Link>
            <Link href="/transparenta-ai" className="hover:text-white">Transparența AI</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
