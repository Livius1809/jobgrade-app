import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Termeni și condiții",
  description:
    "Termenii și condițiile de utilizare a platformei JobGrade. Ce drepturi și obligații avem fiecare.",
}

const LAST_UPDATED = "16 aprilie 2026"

const NAV = [
  { id: "definitii", label: "Definiții" },
  { id: "acceptare", label: "Acceptarea termenilor" },
  { id: "servicii", label: "Serviciile platformei" },
  { id: "cont", label: "Cont și autentificare" },
  { id: "plati", label: "Plăți, abonamente, credite" },
  { id: "obligatii-client", label: "Obligațiile clientului" },
  { id: "obligatii-noi", label: "Obligațiile noastre" },
  { id: "ai", label: "Utilizarea AI" },
  { id: "proprietate", label: "Proprietate intelectuală" },
  { id: "raspundere", label: "Limitarea răspunderii" },
  { id: "incetare", label: "Încetarea contractului" },
  { id: "modificari", label: "Modificarea termenilor" },
  { id: "litigii", label: "Soluționarea litigiilor" },
  { id: "contact", label: "Contact" },
] as const

function H({ id, n, children }: { id: string; n: number; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl md:text-3xl font-semibold text-indigo-dark mt-16 mb-6 scroll-mt-24 flex items-baseline gap-3">
      <span className="text-indigo/40 font-normal text-lg">{n}.</span>
      {children}
    </h2>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 header-glass">
        <div className="flex items-center justify-between px-6 h-16" style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/logo.svg" alt="JobGrade" width={32} height={32} className="transition-transform duration-500 group-hover:rotate-45" />
            <span className="text-lg font-semibold text-indigo-dark">JobGrade</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors">Acasă</Link>
            <Link href="/login" className="text-sm font-medium text-text-warm hover:text-coral transition-colors">Intră în platformă</Link>
          </nav>
        </div>
      </header>

      <main className="px-6 py-10" style={{ maxWidth: "56rem", margin: "0 auto" }}>
        <div className="mb-12">
          <p className="text-xs text-text-micro uppercase tracking-wider mb-2">
            Contract B2B — Codul Civil + Codul Fiscal RO
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-indigo-dark leading-tight mb-4">
            Termeni și condiții
          </h1>
          <p className="text-lg text-text-warm leading-relaxed mb-3">
            Acești termeni reglementează relația dintre dumneavoastră
            (clientul-companie) și Psihobusiness Consulting SRL (operatorul
            JobGrade). Sunt redactați clar, fără capcane.
          </p>
          <p className="text-sm text-text-secondary">Ultima actualizare: {LAST_UPDATED}</p>
        </div>

        <nav className="mb-12 rounded-xl border border-border bg-warm-bg p-6">
          <p className="text-sm font-semibold text-indigo-dark mb-3">Cuprins</p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NAV.map((it, i) => (
              <li key={it.id}>
                <a href={`#${it.id}`} className="text-sm text-indigo hover:text-indigo-dark transition-colors">
                  <span className="text-text-micro mr-1.5">{i + 1}.</span>
                  {it.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <H id="definitii" n={1}>Definiții</H>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li><strong>JobGrade / Operatorul:</strong> platforma SaaS oferită de Psihobusiness Consulting SRL, CUI RO15790994</li>
          <li><strong>Client:</strong> persoană juridică (companie) care creează un cont și utilizează serviciile</li>
          <li><strong>Utilizator:</strong> persoană fizică autorizată de Client să acceseze contul (HR Director, manager, facilitator)</li>
          <li><strong>Servicii:</strong> evaluare posturi, structură salarială, pay gap, recrutare, dezvoltare organizațională, generare documente</li>
          <li><strong>Credite:</strong> unitate de consum a serviciilor, achiziționate prin abonament sau pachete suplimentare</li>
          <li><strong>Conținut Client:</strong> orice date, documente, fișe, salarii, evaluări încărcate sau generate de Client în platformă</li>
        </ul>

        <H id="acceptare" n={2}>Acceptarea termenilor</H>
        <p className="text-text-warm leading-relaxed mb-4">
          Prin crearea contului și/sau utilizarea platformei, Clientul
          confirmă că a citit, înțeles și acceptat acești termeni, precum
          și <Link href="/privacy" className="text-indigo hover:underline">Politica de confidențialitate</Link> și <Link href="/cookies" className="text-indigo hover:underline">Politica de cookies</Link>.
        </p>
        <p className="text-text-warm leading-relaxed mb-6">
          Persoana care creează contul în numele Clientului declară pe
          propria răspundere că este autorizată să angajeze juridic
          Clientul. Pentru companiile cu reprezentare statutară colectivă,
          este responsabilitatea Clientului să asigure mandatul intern.
        </p>

        <H id="servicii" n={3}>Serviciile platformei</H>
        <p className="text-text-warm leading-relaxed mb-4">
          JobGrade oferă, fără limitare:
        </p>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Evaluare și ierarhizare a posturilor de lucru pe 6 criterii (metodologie Connex GSM)</li>
          <li>Structuri salariale pe clase și trepte (algoritm Pitariu)</li>
          <li>Analiză decalaj salarial conformă Directivei UE 2023/970</li>
          <li>Recrutare, angajare și inducție (proces + documente)</li>
          <li>Dezvoltare organizațională (cultură, procese, multigenerațional)</li>
          <li>Asistență AI prin Consultant HR pentru întrebări profesionale</li>
        </ul>
        <p className="text-text-warm leading-relaxed mb-6">
          Lista serviciilor active poate evolua. Modificările semnificative
          sunt comunicate cu minim 30 de zile înainte. Disponibilitatea
          unui serviciu pentru un Client poate depinde de datele furnizate
          (ex. fișe de post, stat de funcții) și de soldul de credite.
        </p>

        <H id="cont" n={4}>Cont și autentificare</H>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Crearea contului este gratuită; utilizarea serviciilor poate necesita abonament și/sau credite</li>
          <li>Clientul este responsabil pentru securitatea credențialelor (parolă, sesiuni active)</li>
          <li>Clientul notifică imediat Operatorul în caz de utilizare neautorizată a contului (<a href="mailto:contact@jobgrade.ro" className="text-indigo hover:underline">contact@jobgrade.ro</a>)</li>
          <li>Operatorul poate suspenda contul în caz de breșă de securitate suspectată sau neplată</li>
        </ul>

        <H id="plati" n={5}>Plăți, abonamente, credite</H>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li><strong>Abonament:</strong> taxă lunară fixă pentru acces platformă + cota inclusă de credite</li>
          <li><strong>Credite suplimentare:</strong> achiziționate la cerere, fără expirare cât timp contul e activ</li>
          <li><strong>Modalitate plată:</strong> card (procesat de Stripe), conform termenilor lor PCI-DSS</li>
          <li><strong>Facturare:</strong> automată, lunară, prin email cu PDF</li>
          <li><strong>TVA:</strong> aplicat conform legislației RO (Psihobusiness e plătitor TVA, CIF RO15790994)</li>
          <li><strong>Rambursări:</strong> creditele neutilizate pot fi rambursate la încetare, proporțional, în termen de 30 zile</li>
          <li><strong>Întârzieri plată:</strong> după 15 zile, accesul la servicii poate fi suspendat; după 60 zile, contul poate fi închis</li>
        </ul>

        <H id="obligatii-client" n={6}>Obligațiile Clientului</H>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Furnizarea datelor reale și actualizate (denumire, CUI, adresă)</li>
          <li>Utilizarea serviciilor în scopuri legale și conform regulamentelor interne</li>
          <li>Respectarea drepturilor proprilor angajați (informare, consultare, conform Codului Muncii)</li>
          <li>Asigurarea bazei legale pentru încărcarea datelor angajaților (consimțământ sau interes legitim)</li>
          <li>Neutilizarea platformei pentru activități ilegale, discriminatorii sau dăunătoare</li>
          <li>Respectarea drepturilor de proprietate intelectuală ale Operatorului</li>
        </ul>

        <H id="obligatii-noi" n={7}>Obligațiile noastre</H>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Furnizarea serviciilor cu disponibilitate țintă 99% lunar (excluzând mentenanță planificată)</li>
          <li>Securizarea datelor conform Art. 32 GDPR (criptare, backup, control acces)</li>
          <li>Notificare incidente de securitate în 72h (Art. 33 GDPR)</li>
          <li>Suport tehnic prin email <a href="mailto:contact@jobgrade.ro" className="text-indigo hover:underline">contact@jobgrade.ro</a> (răspuns în zile lucrătoare)</li>
          <li>Informare prealabilă (30 zile) pentru schimbări semnificative ale termenilor sau prețurilor</li>
        </ul>

        <H id="ai" n={8}>Utilizarea inteligenței artificiale</H>
        <p className="text-text-warm leading-relaxed mb-4">
          JobGrade folosește modele AI (Claude de la Anthropic) pentru
          asistență la evaluare, generare conținut și consultanță.
          Detalii complete în pagina <Link href="/transparenta-ai" className="text-indigo hover:underline">Transparență AI</Link>.
        </p>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>AI-ul propune; deciziile finale aparțin Clientului</li>
          <li>Niciun raport sau evaluare AI nu se folosește singură pentru decizii cu impact asupra angajaților fără validare umană (conformă Art. 22 GDPR și Art. 14 AI Act)</li>
          <li>Operatorul nu garantează acuratețea absolută a output-ului AI; Clientul are responsabilitatea de validare</li>
          <li>Anthropic nu antrenează modele pe datele Clientului (confirmat contractual)</li>
        </ul>

        <H id="proprietate" n={9}>Proprietate intelectuală</H>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li><strong>Platforma JobGrade</strong> (cod, design, metodologii proprii) — proprietatea Operatorului</li>
          <li><strong>Conținutul Clientului</strong> (fișe, salarii, evaluări) — proprietatea Clientului</li>
          <li><strong>Rapoartele generate</strong> sunt proprietatea Clientului, dar pot fi utilizate de Operator agregat și anonimizat pentru îmbunătățirea serviciilor și statistici sectoriale</li>
          <li>Marca <strong>JobGrade</strong> este înregistrată; folosirea ei externă necesită acord scris</li>
        </ul>

        <H id="raspundere" n={10}>Limitarea răspunderii</H>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 mb-6">
          <p className="text-sm text-amber-900 leading-relaxed">
            Operatorul răspunde pentru daune directe cauzate de neîndeplinirea
            culpabilă a obligațiilor sale, în limita sumei plătite de Client
            în ultimele 12 luni înainte de eveniment.
          </p>
        </div>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Operatorul nu răspunde pentru daune indirecte, de imagine, profit nerealizat sau pierderi de date cauzate de Client</li>
          <li>Nu răspunde pentru consecințele utilizării incorecte a platformei sau a output-urilor AI fără validare umană</li>
          <li>Nu răspunde pentru indisponibilități cauzate de furnizori terți (Vercel, Neon, Anthropic, Stripe) sau forță majoră</li>
        </ul>

        <H id="incetare" n={11}>Încetarea contractului</H>
        <p className="text-text-warm leading-relaxed mb-4">
          Oricare parte poate înceta contractul cu notificare scrisă (email)
          cu 30 zile înainte. Situații speciale:
        </p>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Operatorul poate înceta imediat în caz de utilizare ilegală sau neplată &gt; 60 zile</li>
          <li>Clientul poate cere ștergerea totală a datelor (Art. 17 GDPR), conform Politicii de confidențialitate</li>
          <li>Datele financiare (facturare) sunt păstrate 10 ani conform Codului Fiscal</li>
          <li>Creditele neutilizate sunt rambursate proporțional în 30 zile</li>
        </ul>

        <H id="modificari" n={12}>Modificarea termenilor</H>
        <p className="text-text-warm leading-relaxed mb-6">
          Operatorul poate actualiza acești termeni. Modificările
          semnificative sunt comunicate cu minim 30 zile înainte prin email.
          Continuarea utilizării platformei după intrarea în vigoare
          constituie acceptare. Versiunile anterioare sunt arhivate la
          cerere (<a href="mailto:contact@jobgrade.ro" className="text-indigo hover:underline">contact@jobgrade.ro</a>).
        </p>

        <H id="litigii" n={13}>Soluționarea litigiilor</H>
        <p className="text-text-warm leading-relaxed mb-4">
          Părțile vor încerca soluționarea amiabilă în 30 zile. Dacă
          medierea eșuează:
        </p>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Litigiile se supun legislației din România</li>
          <li>Competența instanțelor: judecătoria/tribunalul de la sediul Operatorului (Ilfov)</li>
          <li>Pentru aspecte GDPR: ANSPDCP (<a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="text-indigo hover:underline">www.dataprotection.ro</a>)</li>
          <li>Pentru aspecte muncii: ITM teritorial</li>
        </ul>

        <H id="contact" n={14}>Contact</H>
        <div className="rounded-xl border border-border bg-warm-bg p-5 mb-6">
          <p className="text-sm text-text-warm leading-relaxed">
            <strong className="text-indigo-dark">Psihobusiness Consulting SRL</strong><br />
            CUI: RO15790994 · Sediu: Str. Viitorului nr. 20, Roșu, Ilfov<br />
            Email: <a href="mailto:contact@jobgrade.ro" className="text-indigo hover:underline">contact@jobgrade.ro</a><br />
            DPO: <a href="mailto:dpo@jobgrade.ro" className="text-indigo hover:underline">dpo@jobgrade.ro</a>
          </p>
        </div>

        <div className="mt-16 pt-8 border-t border-border/50">
          <p className="text-xs text-text-micro leading-relaxed">
            Acest document constituie un contract civil între părți.
            Pentru aspecte ne-acoperite explicit se aplică Codul Civil
            român, Codul Fiscal, Codul Muncii și legislația europeană
            (GDPR, AI Act, Directiva 2023/970).
          </p>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 px-6 mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary/50" style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <span>JobGrade · Psihobusiness Consulting SRL</span>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:text-indigo">Confidențialitate</Link>
            <Link href="/cookies" className="hover:text-indigo">Cookies</Link>
            <Link href="/transparenta-ai" className="hover:text-indigo">Transparență AI</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
