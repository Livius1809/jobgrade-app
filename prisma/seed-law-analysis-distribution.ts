/**
 * seed-law-analysis-distribution.ts — Distribuție KB din analiza lege vs. metodologie
 *
 * Sursa: docs/analiza-lege-vs-metodologie.md
 * Target agents: CJA, PMA, DOAS, STA, HR_COUNSELOR, MEDIATOR
 * 5 key insights, chunked per agent relevant
 *
 * Usage: npx tsx prisma/seed-law-analysis-distribution.ts
 */

import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SOURCE = "EXPERT_HUMAN" as const
const KB_TYPE = "SHARED_DOMAIN" as const
const STATUS = "PERMANENT" as const

// ═══════════════════════════════════════════════════════════════════════════
// 5 KEY INSIGHTS din analiza lege vs. metodologie
// Fiecare insight distribuit la agenții relevanți
// ═══════════════════════════════════════════════════════════════════════════

interface SeedEntry {
  agentRole: string
  content: string
  tags: string[]
  confidence: number
}

const entries: SeedEntry[] = [
  // ── INSIGHT 1: Maparea factorilor metodologie → cerințe lege Art. 3(1)(g) ──
  // Relevanți: CJA, PMA, DOAS, MEDIATOR

  {
    agentRole: "CJA",
    content:
      "[Lege vs Metodologie] Art. 3(1)(g) definește munca egală prin: cunoștințe, deprinderi profesionale, efort intelectual/fizic, responsabilități, condiții de muncă. Metodologia JobGrade acoperă 6 factori: Knowledge, Communications, Problem Solving, Decision Making, Business Impact, Working Conditions. Maparea: Knowledge → cunoștințe; Problem Solving + Decision Making → deprinderi profesionale + efort intelectual; Business Impact → responsabilități; Working Conditions → condiții de muncă. GAP: lipsește factor explicit de efort fizic — de integrat în Working Conditions sau separat.",
    tags: ["lege-metodologie", "art-3", "mapare-factori", "directiva-2023-970"],
    confidence: 0.92,
  },
  {
    agentRole: "PMA",
    content:
      "[Lege vs Metodologie] Mapare factori metodologie → Art. 3(1)(g): Knowledge → cunoștințe; Communications → comunicare; Problem Solving + Decision Making → deprinderi profesionale + efort intelectual; Business Impact → responsabilități; Working Conditions → condiții de muncă. Acțiune necesară: creare document explicit de mapare. GAP identificat: efortul fizic nu este factor separat — de considerat integrare în Working Conditions sau adăugare subfactor.",
    tags: ["lege-metodologie", "art-3", "mapare-factori", "backlog"],
    confidence: 0.92,
  },
  {
    agentRole: "DOAS",
    content:
      "[Lege vs Metodologie] Audit necesar: maparea între cei 6 factori compensabili ai metodologiei și criteriile Art. 3(1)(g) trebuie documentată explicit și auditată pentru completitudine. Verificare: fiecare criteriu legal (cunoștințe, deprinderi, efort, responsabilități, condiții) acoperit de cel puțin un factor. Lipsa: efort fizic ca dimensiune separată. Recomandare: recalibrare Working Conditions pentru a include explicit stresul emoțional cu pondere comparabilă munca fizică.",
    tags: ["lege-metodologie", "audit-mapare", "gap-analysis", "art-3"],
    confidence: 0.90,
  },
  {
    agentRole: "MEDIATOR",
    content:
      "[Lege vs Metodologie] La facilitarea evaluării posturilor, ancorează discuția la criteriile legale Art. 3(1)(g): cunoștințe, deprinderi profesionale, efort intelectual/fizic, responsabilități, condiții de muncă. Metodologia acoperă aceste criterii prin 6 factori. Dacă un evaluator contestă relevanța unui factor, poți arăta maparea directă pe cerințele legii. Sistemul de puncte este inerent neutru din punct de vedere al genului.",
    tags: ["lege-metodologie", "facilitare", "art-3", "mapare-factori"],
    confidence: 0.90,
  },

  // ── INSIGHT 2: GAP-uri critice — raportare gender pay gap și intervale salariale ──
  // Relevanți: CJA, PMA, STA

  {
    agentRole: "CJA",
    content:
      "[Lege vs Metodologie] GAP-uri CRITICE identificate: (1) Art. 9 — lipsa completă a raportării gender pay gap (7 categorii de date: diferența medie, mediană, pe variabile, pe cuartile, per categorie F/M). (2) Art. 5(1) — lipsa generării automate de intervale salariale pentru anunțuri de recrutare. (3) Art. 7 — lipsa raportului individual cu niveluri medii pe categorie și sex. Termene: prima raportare iunie 2027 pentru ≥250 angajați. Sancțiuni: 10.000-20.000 lei/contravenție, 20.000-30.000 lei la repetare.",
    tags: ["lege-metodologie", "gap-critic", "gender-pay-gap", "art-9", "art-5", "sanctiuni"],
    confidence: 0.95,
  },
  {
    agentRole: "PMA",
    content:
      "[Lege vs Metodologie] Funcționalități CRITICE lipsă (prioritate P1-P2): (1) Modul raportare gender pay gap — dashboard cu 7 categorii Art. 9(2), export ANES. (2) Generator interval salarial anunțuri — pe baza gradului + date piață, conform Art. 5(1). Funcționalități MARI (P3-P7): portal angajat transparență Art. 6-7, raport individual cu comparație sex, workflow evaluare comună Art. 10, alertă automată la >5%, modul integrare remunerație completă. De adăugat în backlog cu prioritizare.",
    tags: ["lege-metodologie", "gap-critic", "backlog", "prioritizare", "functionalitati"],
    confidence: 0.95,
  },
  {
    agentRole: "STA",
    content:
      "[Lege vs Metodologie] Raportare statistică obligatorie Art. 9(2) — 7 indicatori de calculat: (a) diferența medie remunerare F vs M, (b) diferența pe componente variabile, (c) diferența mediană, (d) mediană pe variabile, (e) proporția F/M cu variabile, (f) distribuția F/M pe cuartile remunerare, (g) diferența per categorie lucrători. Pragul de alertă: 5% diferență medie nejustificată → evaluare comună obligatorie Art. 10. De implementat: formulele statistice, vizualizări, export standard.",
    tags: ["lege-metodologie", "statistici", "gender-pay-gap", "art-9", "indicatori"],
    confidence: 0.93,
  },

  // ── INSIGHT 3: Evaluare comună Art. 10 — fluxul de mediere pay gap ──
  // Relevanți: CJA, MEDIATOR, HR_COUNSELOR, PMA

  {
    agentRole: "CJA",
    content:
      "[Lege vs Metodologie] Art. 10 — Evaluare comună obligatorie când diferența medie > 5% nejustificată. Pași legali: (1) analiză proporție F/M per categorie, (2) niveluri medii remunerare per sex, (3) identificare diferențe, (4) identificare motive, (5) stabilire măsuri remediere. Termen: 6 luni (prelungibil motivat). Participanți obligatorii: angajator + reprezentanți lucrători. Art. 10(7): obligația de analiză neutralitate gen a sistemelor de evaluare și clasificare posturi.",
    tags: ["lege-metodologie", "evaluare-comuna", "art-10", "pay-gap", "procedura"],
    confidence: 0.95,
  },
  {
    agentRole: "MEDIATOR",
    content:
      "[Lege vs Metodologie] Rol MEDIATOR în evaluarea comună Art. 10: facilitezi dialogul între management și reprezentanți lucrători când diferența pay gap > 5%. Procesul: prezinți datele obiectiv (gap-ul, categoriile afectate), NU acuzi managementul de discriminare, cadrezi ca problemă de sistem nu de intenție, facilitezi identificarea cauzelor (segregare ocupațională, criterii promovare, componente variabile), ghidezi spre plan remediere cu termene concrete (90 zile remediere, 6 luni evaluare).",
    tags: ["lege-metodologie", "evaluare-comuna", "art-10", "mediere", "pay-gap"],
    confidence: 0.93,
  },
  {
    agentRole: "HR_COUNSELOR",
    content:
      "[Lege vs Metodologie] Drepturi noi pentru angajați din proiectul de lege transparență salarială: (1) Dreptul de a cunoaște intervalul salarial la recrutare — Art. 5. (2) Interzicerea întrebărilor despre salariul anterior — Art. 5(3). (3) Dreptul la informare despre nivelurile medii pe categorie și sex — Art. 7, termen răspuns 30 zile. (4) Eliminarea clauzelor de confidențialitate salarială — Art. II. (5) Inversarea sarcinii probei în discriminare salarială — Art. 13(4). Sfătuiește angajații să-și cunoască drepturile.",
    tags: ["lege-metodologie", "drepturi-angajati", "transparenta", "art-5", "art-7"],
    confidence: 0.93,
  },
  {
    agentRole: "PMA",
    content:
      "[Lege vs Metodologie] Workflow evaluare comună de implementat (Art. 10): declanșare automată la diferență >5%, pași predefiniti (analiză proporție F/M → niveluri medii → diferențe → motive → măsuri), implicare reprezentanți lucrători cu role dedicate în platformă, timeline cu deadlines legale (6 luni, prelungibil), generare plan remediere cu tracking implementare. Prioritate: MARE.",
    tags: ["lege-metodologie", "workflow", "evaluare-comuna", "art-10", "backlog"],
    confidence: 0.92,
  },

  // ── INSIGHT 4: Audit de bias de gen — Art. 10(7) ──
  // Relevanți: DOAS, STA, CJA

  {
    agentRole: "DOAS",
    content:
      "[Lege vs Metodologie] Art. 10(7) obligă analiza neutralității de gen a sistemelor de evaluare și clasificare posturi. Risc identificat: factorul Working Conditions ar putea penaliza indirect posturi predominant feminine (birou, customer service) vs. masculine (teren, logistică) dacă ponderează mai mult munca fizică decât stresul emoțional. Recomandare: audit anual de bias, recalibrare Working Conditions pentru echitate stres emoțional vs. efort fizic, documentare și certificare neutralitate.",
    tags: ["lege-metodologie", "audit-bias-gen", "art-10-7", "working-conditions", "neutralitate"],
    confidence: 0.92,
  },
  {
    agentRole: "STA",
    content:
      "[Lege vs Metodologie] Audit statistic de bias de gen necesar conform Art. 10(7): analiză dacă ponderile factorilor dezavantajează sistematic posturi predominant feminine. Metodă: comparare distribuția punctajelor pe posturi majoritare-F vs. majoritare-M, test diferențe semnificative pe fiecare factor, analiză regresie pentru identificare factori cu impact disproporționat. Raportare anuală cu concluzii și recomandări de recalibrare.",
    tags: ["lege-metodologie", "audit-bias-gen", "art-10-7", "analiza-statistica"],
    confidence: 0.90,
  },
  {
    agentRole: "CJA",
    content:
      "[Lege vs Metodologie] Art. 10(7) — obligația de a avea sisteme de evaluare neutre din punct de vedere al sexului. Metodologia JobGrade nu face referire la gen (neutră la suprafață), dar nu a fost auditată formal pentru bias implicit. Recomandare: audit formal anual, documentare rezultate, certificare neutralitate. Inversarea sarcinii probei (Art. 13 alin. 4) face ca lipsa auditului formal să fie un risc juridic semnificativ — angajatorul trebuie să demonstreze că NU a discriminat.",
    tags: ["lege-metodologie", "audit-bias-gen", "art-10-7", "inversare-proba", "risc-juridic"],
    confidence: 0.95,
  },

  // ── INSIGHT 5: Oportunitate de piață și poziționare ──
  // Relevanți: PMA, DOAS, MEDIATOR

  {
    agentRole: "PMA",
    content:
      "[Lege vs Metodologie] Oportunitate first-mover: pe piața românească NU există platformă integrată evaluare posturi + raportare gender pay gap + conformitate legală. Fereastra: aprilie 2026 — companiile ≥250 angajați au nevoie de soluție cu 12+ luni înainte de prima raportare (iunie 2027). Segmente: ≥250 (raportare anuală obligatorie), 150-249 (la 3 ani), 100-149 (din 2031), sub 100 (criterii + informare angajați). Parteneriat strategic posibil cu ANES — Art. 4(4) prevede instrumente/metodologii puse la dispoziție.",
    tags: ["lege-metodologie", "oportunitate-piata", "first-mover", "segmentare", "timeline"],
    confidence: 0.90,
  },
  {
    agentRole: "DOAS",
    content:
      "[Lege vs Metodologie] Conformitate by design: fiecare funcționalitate nouă trebuie să integreze cerințele legale din start. Checklist DOAS pentru noi module: (1) acoperă articol(e) din lege? (2) generează date pentru raportarea obligatorie? (3) documentare audit trail conform Art. 19? (4) accesibil pentru lucrători conform Art. 6? (5) neutru din punct de vedere al genului conform Art. 10(7)? Registru viu: mapare continuă funcționalități → articole lege.",
    tags: ["lege-metodologie", "conformitate", "checklist", "audit-coerenta"],
    confidence: 0.90,
  },
  {
    agentRole: "MEDIATOR",
    content:
      "[Lege vs Metodologie] Context piață pentru sesiunile de mediere: legea obligă consultarea cu reprezentanții lucrătorilor la stabilirea criteriilor de remunerare (Art. 4 alin. 2). Mediatorul facilitează acest proces. Companiile care fac evaluarea posturilor ACUM, înainte de adoptarea legii, vor fi în avantaj. Argument pentru participanți reticenți: 'Nu este doar o cerință legală — este o oportunitate de a construi un sistem în care fiecare coleg este remunerat corect.'",
    tags: ["lege-metodologie", "context-piata", "consultare", "art-4", "motivare"],
    confidence: 0.88,
  },
]

async function seed() {
  console.log(
    `\nSeed Law Analysis Distribution — ${entries.length} entries to 6 agents\n`
  )

  const stats: Record<string, number> = {}
  let created = 0

  for (const entry of entries) {
    try {
      await (prisma as any).kBEntry.create({
        data: {
          agentRole: entry.agentRole,
          kbType: KB_TYPE,
          content: entry.content,
          source: SOURCE,
          confidence: entry.confidence,
          status: STATUS,
          tags: entry.tags,
          usageCount: 0,
          validatedAt: new Date(),
        },
      })
      created++
      stats[entry.agentRole] = (stats[entry.agentRole] || 0) + 1
      process.stdout.write(
        `  + ${entry.agentRole}: ${entry.content.substring(0, 60)}...\n`
      )
    } catch (err: any) {
      console.error(`  x ${entry.agentRole}: ${err.message.substring(0, 80)}`)
    }
  }

  console.log(`\nRezumat per agent:`)
  for (const [agent, count] of Object.entries(stats).sort()) {
    console.log(`  ${agent}: ${count} entries`)
  }
  console.log(`\nTotal: ${created}/${entries.length} entries create\n`)

  await prisma.$disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
