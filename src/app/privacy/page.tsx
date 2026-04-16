import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Politica de confidențialitate",
  description:
    "Cum prelucrează JobGrade datele dumneavoastră personale, ce drepturi aveți și cum le puteți exercita. Conformă GDPR (Regulamentul UE 2016/679).",
}

const LAST_UPDATED = "16 aprilie 2026"

const NAV = [
  { id: "cine-suntem", label: "Cine suntem" },
  { id: "date-colectate", label: "Ce date colectăm" },
  { id: "scop", label: "De ce le colectăm" },
  { id: "baza-legala", label: "Baza legală" },
  { id: "terti", label: "Cui le partajăm" },
  { id: "retentie", label: "Cât timp le păstrăm" },
  { id: "drepturi", label: "Drepturile dumneavoastră" },
  { id: "transfer", label: "Transfer în afara UE" },
  { id: "securitate", label: "Securitate" },
  { id: "modificari", label: "Modificări ale politicii" },
  { id: "contact", label: "Contact" },
] as const

function H({ id, n, children }: { id: string; n: number; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-2xl md:text-3xl font-semibold text-indigo-dark mt-16 mb-6 scroll-mt-24 flex items-baseline gap-3"
    >
      <span className="text-indigo/40 font-normal text-lg">{n}.</span>
      {children}
    </h2>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 mb-4">
      <h4 className="font-semibold text-indigo-dark mb-2">{title}</h4>
      <div className="text-text-warm text-sm leading-relaxed">{children}</div>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-slate-600 hover:text-indigo-600">Acasă</Link>
            <Link href="/login" className="text-slate-600 hover:text-indigo-600">Intră în platformă</Link>
          </nav>
        </div>
      </header>

      <main className="px-6 py-10" style={{ maxWidth: "56rem", margin: "0 auto" }}>
        <div className="mb-12">
          <p className="text-xs text-text-micro uppercase tracking-wider mb-2">
            Conformă Regulamentului UE 2016/679 (GDPR)
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-indigo-dark leading-tight mb-4">
            Politica de confidențialitate
          </h1>
          <p className="text-lg text-text-warm leading-relaxed mb-3">
            Vă explicăm clar ce date colectăm, de ce, cât timp le păstrăm și
            ce drepturi aveți. Fără jargon juridic inutil.
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

        <H id="cine-suntem" n={1}>Cine suntem</H>
        <p className="text-text-warm leading-relaxed mb-4">
          Platforma <strong>JobGrade</strong> este operată de:
        </p>
        <Card title="Psihobusiness Consulting SRL">
          <ul className="space-y-1">
            <li>CUI: RO15790994</li>
            <li>Sediul social: Str. Viitorului nr. 20, Roșu, Ilfov, cod poștal 077042</li>
            <li>Email: <a href="mailto:contact@jobgrade.ro" className="text-indigo hover:underline">contact@jobgrade.ro</a></li>
            <li>Website: <a href="https://jobgrade.ro" className="text-indigo hover:underline">https://jobgrade.ro</a></li>
          </ul>
        </Card>
        <p className="text-text-warm leading-relaxed">
          JobGrade este o platformă SaaS dedicată companiilor din România,
          care oferă servicii de evaluare și ierarhizare a posturilor,
          analiză salarială și conformitate cu Directiva UE 2023/970 privind
          transparența salarială.
        </p>

        <H id="date-colectate" n={2}>Ce date colectăm</H>
        <h3 className="text-lg font-semibold text-indigo-dark mt-6 mb-3">2.1. Date pe care ni le furnizați direct</h3>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li><strong>Cont:</strong> email, prenume, nume, funcție (opțional), parolă (stocată exclusiv ca hash, nu o vedem și nu o putem recupera)</li>
          <li><strong>Profil companie:</strong> denumire, CUI, Reg. Comerțului, adresă, județ, COD CAEN, industrie, dimensiune, website, misiune, viziune, valori (opțional)</li>
          <li><strong>Date salariale:</strong> cod angajat (intern, fără nume sau CNP), titlu post, departament, salariu bază, sporuri, beneficii, gen, vechime, studii — datele sunt importate <strong>pseudonimizat</strong></li>
          <li><strong>Cereri Art. 7 transparență salarială:</strong> email angajat solicitant + detalii cerere</li>
        </ul>

        <h3 className="text-lg font-semibold text-indigo-dark mt-6 mb-3">2.2. Date generate prin utilizarea platformei</h3>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Scoruri pe cele 6 criterii de evaluare, justificări, voturi, decizii</li>
          <li>Conversații cu asistentul AI (prompturi + răspunsuri)</li>
          <li>Rapoarte generate (ierarhizare, grade, pay gap, KPI)</li>
        </ul>

        <h3 className="text-lg font-semibold text-indigo-dark mt-6 mb-3">2.3. Date colectate automat</h3>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-4 list-disc pl-6">
          <li>Cookie de sesiune (necesar pentru autentificare)</li>
          <li>Token JWT (pentru menținerea sesiunii)</li>
          <li>Loguri tehnice (IP, agent browser) — pentru securitate</li>
        </ul>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 mb-6">
          <p className="text-sm text-emerald-800">
            <strong>Nu folosim:</strong> cookies de marketing, Google Analytics,
            Facebook Pixel sau alte instrumente de tracking terțe.
          </p>
        </div>

        <H id="scop" n={3}>De ce colectăm aceste date</H>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-warm-bg border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Scop</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">De ce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Cont și autentificare</td><td className="px-3 py-2 text-text-warm">Ca să accesați platforma</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Evaluare posturi</td><td className="px-3 py-2 text-text-warm">Serviciul principal</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Analiză structură salarială</td><td className="px-3 py-2 text-text-warm">Calcul grade și disparități</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Pay gap UE 2023/970</td><td className="px-3 py-2 text-text-warm">Obligație legală</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Cereri Art. 7</td><td className="px-3 py-2 text-text-warm">Drept legal angajați</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Analize AI</td><td className="px-3 py-2 text-text-warm">Generare conținut, KPI</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Notificări</td><td className="px-3 py-2 text-text-warm">Evenimente importante</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Facturare</td><td className="px-3 py-2 text-text-warm">Procesare plăți (Stripe)</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Securitate</td><td className="px-3 py-2 text-text-warm">Prevenire acces neautorizat</td></tr>
            </tbody>
          </table>
        </div>

        <H id="baza-legala" n={4}>Baza legală</H>
        <p className="text-text-warm leading-relaxed mb-4">
          Conform Art. 6 GDPR, prelucrăm datele dumneavoastră în baza:
        </p>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li><strong>Executării contractului</strong> (Art. 6.1.b) — pentru livrarea serviciilor JobGrade</li>
          <li><strong>Obligației legale</strong> (Art. 6.1.c) — conformitate UE 2023/970, Codul Muncii, GDPR, AI Act</li>
          <li><strong>Interesului legitim</strong> (Art. 6.1.f) — securitate, îmbunătățire produs, protecție anti-fraudă</li>
          <li><strong>Consimțământului</strong> (Art. 6.1.a) — pentru comunicări opționale (newsletter, etc.)</li>
        </ul>

        <H id="terti" n={5}>Cui partajăm datele</H>
        <p className="text-text-warm leading-relaxed mb-4">
          Datele dumneavoastră sunt prelucrate de noi și de un set restrâns
          de sub-procesatori, fiecare cu acord DPA Art. 28 GDPR semnat:
        </p>
        <div className="grid gap-3 mb-6">
          {[
            { name: "Vercel", purpose: "Hosting platformă și funcții server (UE)" },
            { name: "Neon.tech", purpose: "Bază de date PostgreSQL (Frankfurt, UE)" },
            { name: "Anthropic", purpose: "Procesare prompturi AI (Claude). SUA — vezi secțiunea Transfer" },
            { name: "Resend", purpose: "Trimitere email-uri tranzacționale" },
            { name: "Stripe", purpose: "Procesare plăți (PCI-DSS Level 1)" },
            { name: "ntfy.sh", purpose: "Notificări push interne (Owner)" },
          ].map((t) => (
            <div key={t.name} className="flex items-start gap-3 rounded-lg border border-border/60 bg-surface px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-indigo mt-2 shrink-0" />
              <div>
                <span className="font-medium text-indigo-dark text-sm">{t.name}</span>
                <span className="text-text-secondary text-sm"> — {t.purpose}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-coral/20 bg-coral/5 p-5 mb-6">
          <p className="text-sm font-semibold text-coral-dark mb-2">Ce nu facem</p>
          <ul className="text-sm text-text-warm space-y-1.5">
            <li>Nu vindem date personale către terți</li>
            <li>Nu antrenăm modele AI pe datele clienților</li>
            <li>Nu partajăm date pentru marketing terț</li>
          </ul>
        </div>

        <H id="retentie" n={6}>Cât timp păstrăm datele</H>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-warm-bg border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Categorie</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Termen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Cont activ</td><td className="px-3 py-2 text-text-warm">Pe durata utilizării</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Cont inactiv</td><td className="px-3 py-2 text-text-warm">36 luni de la ultima activitate, cu notificare la 24 luni</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Date evaluare B2B</td><td className="px-3 py-2 text-text-warm">Durata contractului + 5 ani</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Date facturare</td><td className="px-3 py-2 text-text-warm">10 ani (Codul Fiscal)</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Loguri securitate</td><td className="px-3 py-2 text-text-warm">12 luni</td></tr>
              <tr><td className="px-3 py-2 font-medium text-indigo-dark">Audit trail GDPR</td><td className="px-3 py-2 text-text-warm">10 ani</td></tr>
            </tbody>
          </table>
        </div>

        <H id="drepturi" n={7}>Drepturile dumneavoastră</H>
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {[
            { t: "Dreptul de acces", d: "Solicitați o copie a tuturor datelor pe care le deținem despre dumneavoastră (Art. 15)" },
            { t: "Dreptul la rectificare", d: "Corectați date inexacte sau incomplete (Art. 16)" },
            { t: "Dreptul la ștergere", d: `Cereți ștergerea datelor (Art. 17 — „dreptul de a fi uitat")` },
            { t: "Dreptul la restricționare", d: "Limitați prelucrarea în anumite cazuri (Art. 18)" },
            { t: "Dreptul la portabilitate", d: "Primiți datele într-un format structurat, lizibil mașinii (Art. 20)" },
            { t: "Dreptul la opoziție", d: "Vă opuneți prelucrării bazate pe interes legitim (Art. 21)" },
            { t: "Drept Art. 22", d: "Nu fiți supus unei decizii bazate exclusiv pe prelucrare automată" },
            { t: "Dreptul la plângere ANSPDCP", d: "Sesizați autoritatea de supraveghere (www.dataprotection.ro)" },
          ].map((r) => (
            <div key={r.t} className="rounded-lg border border-border/60 bg-surface px-4 py-3">
              <p className="font-medium text-indigo-dark text-sm mb-1">{r.t}</p>
              <p className="text-sm text-text-secondary">{r.d}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-warm-bg p-5 mb-6">
          <p className="text-sm font-semibold text-indigo-dark mb-2">Cum vă exercitați drepturile</p>
          <p className="text-sm text-text-warm">
            Trimiteți o cerere la <a href="mailto:dpo@jobgrade.ro" className="text-indigo hover:underline">dpo@jobgrade.ro</a>{" "}
            cu o descriere clară a solicitării. Răspundem în maximum 30 de zile,
            gratuit (cu excepția cererilor manifest nefondate sau excesive).
          </p>
        </div>

        <H id="transfer" n={8}>Transfer în afara UE</H>
        <p className="text-text-warm leading-relaxed mb-4">
          Singurul transfer de date personale în afara UE este către{" "}
          <strong>Anthropic</strong> (SUA), pentru procesarea prompturilor AI.
        </p>
        <Card title="Măsuri de protecție pentru transferul Anthropic">
          <ul className="space-y-1.5">
            <li><strong>Standard Contractual Clauses (SCC)</strong> aprobate de Comisia Europeană</li>
            <li><strong>Data Privacy Framework (DPF)</strong> — Anthropic certificat pentru transfer EU→US</li>
            <li><strong>Zero retenție:</strong> Anthropic nu antrenează modele pe datele noastre</li>
            <li><strong>By design:</strong> nu trimitem date personale directe în prompturi (CNP, nume, salarii brute) — doar agregate sau date de post fără identificatori</li>
            <li><strong>Audit trimestrial</strong> al fluxurilor de date trimise</li>
          </ul>
        </Card>

        <H id="securitate" n={9}>Securitate</H>
        <p className="text-text-warm leading-relaxed mb-4">
          Aplicăm măsuri tehnice și organizatorice conform Art. 32 GDPR:
        </p>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li>Criptare în tranzit (TLS 1.3) și în repaus (AES-256)</li>
          <li>Hash bcrypt pentru parole (cost factor 12)</li>
          <li>Token JWT cu validare la fiecare cerere contra bazei de date</li>
          <li>Acces restricționat pe principiul „need to know"</li>
          <li>Backup-uri zilnice criptate, retenție 30 zile</li>
          <li>Loguri audit pentru toate accesele administrative</li>
          <li>Reacție incidente conform Art. 33 — notificare ANSPDCP în 72h</li>
        </ul>

        <H id="modificari" n={10}>Modificări ale politicii</H>
        <p className="text-text-warm leading-relaxed mb-6">
          Ne rezervăm dreptul de a actualiza această politică. La modificări
          semnificative, vă notificăm prin email cu minim 30 de zile înainte
          de intrarea în vigoare. Versiunea curentă e mereu disponibilă la
          jobgrade.ro/privacy, iar versiunile anterioare sunt arhivate la
          cerere.
        </p>

        <H id="contact" n={11}>Contact</H>
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card title="Operator de date">
            <ul className="space-y-1">
              <li>Psihobusiness Consulting SRL</li>
              <li><a href="mailto:contact@jobgrade.ro" className="text-indigo hover:underline">contact@jobgrade.ro</a></li>
            </ul>
          </Card>
          <Card title="Responsabil Protecția Datelor">
            <a href="mailto:dpo@jobgrade.ro" className="text-indigo hover:underline">dpo@jobgrade.ro</a>
          </Card>
          <Card title="Autoritate supraveghere">
            <ul className="space-y-1">
              <li><a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="text-indigo hover:underline">www.dataprotection.ro</a></li>
              <li><a href="mailto:anspdcp@dataprotection.ro" className="text-indigo hover:underline">anspdcp@dataprotection.ro</a></li>
            </ul>
          </Card>
        </div>

        <div className="mt-16 pt-8 border-t border-border/50">
          <p className="text-xs text-text-micro leading-relaxed">
            Document redactat conform Regulamentului (UE) 2016/679 (GDPR) și
            Legii nr. 190/2018 privind aplicarea în România.
          </p>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <p className="text-sm">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs">
            <Link href="/termeni" className="hover:text-white transition-colors">Termeni și condiții</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookie-uri</Link>
            <Link href="/transparenta-ai" className="hover:text-white transition-colors">Transparență AI</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
