/**
 * seed-armstrong-taylor-l2.ts — Infuzare KB reală cu cunoaștere din:
 *
 * "Armstrong's Handbook of Human Resource Management Practice" (16th ed.)
 * Michael Armstrong & Stephen Taylor
 *
 * Biblia HR — referința globală pentru practici HRM. Acoperă:
 * - Job design, analysis, evaluation (Part 4)
 * - Reward management, pay structures, grading (Part 5)
 * - Employee relations, engagement, wellbeing (Part 7)
 * - People resourcing, talent management (Part 3)
 * - Learning & development (Part 6)
 * - Organizational behavior, culture, change (Part 2)
 * - HR strategy, analytics, ethics (Part 1)
 *
 * Distribuție per consilier L2 pe domeniu:
 *   STA            — job evaluation methods, pay analytics, grading statistics
 *   PPMO           — OB, culture, engagement, change management
 *   PPA            — wellbeing, motivation, psychological contract, engagement
 *   PSE            — L&D, competency frameworks, talent development
 *   SCA            — bias in evaluation, equal pay, fairness perception
 *   SOC            — employee relations, voice, diversity, social context
 *   PSYCHOLINGUIST — employee communication, consultation, feedback
 *   SAFETY_MONITOR — health & safety, stress, harassment, ethics
 *
 * Usage: npx tsx prisma/seed-armstrong-taylor-l2.ts
 */

import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

interface KBEntry {
  agentRole: string
  content: string
  tags: string[]
  confidence: number
}

const SOURCE = "EXPERT_HUMAN" as const
const KB_TYPE = "PERMANENT" as const
const STATUS = "PERMANENT" as const

const entries: KBEntry[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // STA — Job evaluation methods, pay analytics, grading, reward structures
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "STA",
    content: "[Armstrong & Taylor] Job evaluation: proces sistematic de stabilire a valorii relative a posturilor într-o organizație pentru a fundamenta o structură de plată internă echitabilă. Două familii de metode: (1) Non-analitice — ranking, paired comparison, job classification (rapide dar subiective). (2) Analitice — point-factor, factor comparison, proprietare (riguroase, defensibile legal). JobGrade folosește point-factor analitic — cel mai defensibil juridic conform Directivei EU 2023/970.",
    tags: ["armstrong-taylor", "job-evaluation", "metode", "clasificare"],
    confidence: 0.95,
  },
  {
    agentRole: "STA",
    content: "[Armstrong & Taylor] Point-factor method: (1) Selectează factori compensabili (3-12, tipic 5-7). (2) Definește niveluri per factor cu descriptori ancorați comportamental. (3) Atribuie puncte per nivel. (4) Evaluează fiecare post pe fiecare factor. (5) Calculează scor total. (6) Grupează scorurile în grade/benzi salariale. Avantaje: transparent, repetabil, defensibil legal. Dezavantaje: consum timp, risc de rigiditate dacă factorii nu se actualizează.",
    tags: ["armstrong-taylor", "point-factor", "implementare", "avantaje-dezavantaje"],
    confidence: 0.95,
  },
  {
    agentRole: "STA",
    content: "[Armstrong & Taylor] Grade structures: (1) Narrow-graded (10-18 grade înguste) — diferențiere fină dar complexitate administrativă. (2) Broad-banded (4-6 benzi largi) — flexibilitate dar pierdere granularitate. (3) Career family (familii de posturi cu niveluri) — cel mai modern, combină flexibilitate cu claritate. (4) Job family (similar dar per funcție). Recomandare Armstrong: alegerea depinde de dimensiune, maturitate HR, cultură. IMM-uri RO: 6-10 grade e optim.",
    tags: ["armstrong-taylor", "grade-structures", "broad-banding", "career-family"],
    confidence: 0.92,
  },
  {
    agentRole: "STA",
    content: "[Armstrong & Taylor] Market pricing vs. job evaluation internă: nu sunt opuse — se completează. Job evaluation stabilește ECHITATEA INTERNĂ (postul A e mai complex ca B). Market pricing stabilește COMPETITIVITATEA EXTERNĂ (postul A se plătește cu X pe piață). Grila salarială finală integrează ambele: ierarhia internă oferă structura, datele de piață oferă nivelurile. JobGrade face echitatea internă — datele de piață se integrează ulterior.",
    tags: ["armstrong-taylor", "market-pricing", "echitate-interna", "competitivitate-externa"],
    confidence: 0.92,
  },
  {
    agentRole: "STA",
    content: "[Armstrong & Taylor] Equal pay analytics: analiza statistică pentru detectarea diferențelor salariale nejustificate pe bază de gen, vârstă, etnie. Metoda: regresia multiplă controlând pentru factori legitimi (grad, experiență, performanță). Dacă diferența reziduală rămâne semnificativă = discriminare potențială. Directiva EU 2023/970 cere exact acest tip de analiză. STA oferă metodologia statistică, CJA interpretarea legală.",
    tags: ["armstrong-taylor", "equal-pay", "regresie", "discriminare"],
    confidence: 0.92,
  },
  {
    agentRole: "STA",
    content: "[Armstrong & Taylor] Compa-ratio = salariul actual / punctul mediu al gradului × 100. Sub 80% = subdplătit semnificativ. 80-120% = în bandă normală. Peste 120% = supaplătit sau grad greșit. Range penetration = (salariu - minim) / (maxim - minim) × 100. Ambele metrici sunt esențiale pentru audit pay gap și pentru comunicarea rezultatelor evaluării către management.",
    tags: ["armstrong-taylor", "compa-ratio", "range-penetration", "metrici-salariale"],
    confidence: 0.90,
  },
  {
    agentRole: "STA",
    content: "[Armstrong & Taylor] Hay Group Method (cea mai răspândită metodă proprietară de evaluare posturi): 3 factori — Know-how (cunoștințe + abilități), Problem Solving (complexitate gândire), Accountability (responsabilitate + impact). Profile shape: short (accountability > know-how, posturi executive) vs flat (echilibrate) vs long (know-how > accountability, posturi tehnice). JobGrade cu 6 criterii oferă granularitate mai mare decât Hay cu 3.",
    tags: ["armstrong-taylor", "hay-method", "know-how", "accountability"],
    confidence: 0.92,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPMO — Organizational behavior, culture, engagement, change management
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PPMO",
    content: "[Armstrong & Taylor] Psychological contract: setul nescris de așteptări reciproce între angajat și angajator. Transacțional (bani pentru muncă) vs. relațional (loialitate, dezvoltare, sens). Încălcarea contractului psihologic (perceperea inechității, promisiuni nerespectate) generează dezangajare, cynicism, turnover. Evaluarea corectă a posturilor CONSOLIDEAZĂ contractul psihologic: demonstrează că organizația își îndeplinește promisiunea de echitate.",
    tags: ["armstrong-taylor", "psychological-contract", "echitate", "dezangajare"],
    confidence: 0.90,
  },
  {
    agentRole: "PPMO",
    content: "[Armstrong & Taylor] Employee engagement (Kahn, 1990): stare în care angajații se investesc fizic, cognitiv și emoțional în rol. Trei condiții: (1) Meaningfulness — munca contează. (2) Safety — pot fi autentici fără teamă. (3) Availability — au resurse fizice/emoționale. Evaluarea corectă contribuie la meaningfulness (rolul meu e recunoscut) și safety (regulile sunt clare, nu arbitrare).",
    tags: ["armstrong-taylor", "engagement", "kahn", "conditii"],
    confidence: 0.90,
  },
  {
    agentRole: "PPMO",
    content: "[Armstrong & Taylor] Managementul schimbării (Change Management) — implementarea evaluării posturilor E un proiect de schimbare organizațională. Modelul Kotter: (1) Create urgency (Directiva EU), (2) Build coalition (comitet evaluare), (3) Form vision (echitate transparentă), (4) Communicate (constant, pe toate nivelurile), (5) Empower action (instruire evaluatori), (6) Quick wins (primele posturi evaluate rapid), (7) Build on change, (8) Anchor in culture.",
    tags: ["armstrong-taylor", "change-management", "kotter", "implementare"],
    confidence: 0.90,
  },
  {
    agentRole: "PPMO",
    content: "[Armstrong & Taylor] Organizational culture (Schein): 3 niveluri — (1) Artifacts (ce se vede: organigramă, grile, procese), (2) Espoused values (ce se declară: echitate, transparență), (3) Basic assumptions (ce se trăiește: 'aici contează relațiile, nu procedurile'). Evaluarea posturilor poate fi respinsă dacă contrazice nivelul 3 (basic assumptions). PPMO diagnostichează nivelul 3 ÎNAINTE de implementare.",
    tags: ["armstrong-taylor", "culture", "schein", "niveluri"],
    confidence: 0.88,
  },
  {
    agentRole: "PPMO",
    content: "[Armstrong & Taylor] Total reward: compensarea nu e doar salariul. Include: salariu bază + beneficii + dezvoltare + mediu de lucru + echilibru viață-muncă. Evaluarea posturilor stabilește fundamentul (salariul bază), dar PPMO consiliează organizația să gândească total reward. Un post cu grad mic dar beneficii excelente poate fi mai atractiv decât unul cu grad mare dar mediu toxic.",
    tags: ["armstrong-taylor", "total-reward", "compensare", "beneficii"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPA — Wellbeing, motivation, psychological contract, positive practices
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PPA",
    content: "[Armstrong & Taylor] Employee wellbeing: dimensiuni — fizic (sănătate, ergonomie), psihologic (stres, burnout, anxietate), social (relații, incluziune), financiar (securitate salarială, echitate). Evaluarea corectă a posturilor contribuie direct la wellbeing financiar (salariul reflectă complexitatea reală) și psihologic (reduce incertitudinea și percepția de inechitate).",
    tags: ["armstrong-taylor", "wellbeing", "dimensiuni", "evaluare-contribuie"],
    confidence: 0.88,
  },
  {
    agentRole: "PPA",
    content: "[Armstrong & Taylor] Teoria echității (Adams): angajații compară raportul input/outcome propriu cu al altora. Dacă percep inechitate: (1) Reduc inputul (fac mai puțin), (2) Cer mai mult output (negociază salariu), (3) Distorsionează cognitiv ('el are relații'), (4) Pleacă. Evaluarea obiectivă a posturilor adresează (3) — elimină distorsiunea cognitivă demonstrând fundamentarea obiectivă a diferențelor salariale.",
    tags: ["armstrong-taylor", "equity-theory", "adams", "comportament-inechitate"],
    confidence: 0.92,
  },
  {
    agentRole: "PPA",
    content: "[Armstrong & Taylor] Motivația intrinsecă vs. extrinsecă (Herzberg two-factor): factorii de igienă (salariu, condiții, securitate) NU motivează — dar absența lor DEMOTIVEAZĂ. Factorii motivatori (realizare, recunoaștere, responsabilitate, dezvoltare) generează satisfacție. Evaluarea corectă e factor de igienă (elimină demotivarea din inechitate), nu factor motivator. PPA trebuie să comunice: evaluarea nu motivează direct — dar absența ei demotivează profund.",
    tags: ["armstrong-taylor", "herzberg", "igienă", "motivator"],
    confidence: 0.90,
  },
  {
    agentRole: "PPA",
    content: "[Armstrong & Taylor] Job design și motivație: modelul Hackman-Oldham — 5 caracteristici care generează motivație intrinsecă: (1) Skill variety — folosesc mai multe abilități. (2) Task identity — completez o sarcină întreagă. (3) Task significance — munca mea contează. (4) Autonomy — decid cum fac. (5) Feedback — știu cum m-am descurcat. Evaluarea pe 6 criterii a JobGrade captează indirect aceste dimensiuni — PPA le poate explicita clientului.",
    tags: ["armstrong-taylor", "hackman-oldham", "job-design", "motivatie-intrinseca"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PSE — Learning & development, competency frameworks, talent management
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSE",
    content: "[Armstrong & Taylor] Competency framework: set structurat de competențe (cunoștințe, abilități, comportamente) necesare pentru performanță în rol. Tipuri: (1) Core competencies (pentru toată organizația). (2) Functional/technical (per familie de joburi). (3) Managerial/leadership (per nivel ierarhic). Cele 6 criterii JobGrade (Educație, Comunicare, Rezolvare probleme, Luarea deciziilor, Impact afaceri, Condiții muncă) formează un competency framework implicit.",
    tags: ["armstrong-taylor", "competency-framework", "tipuri", "criterii-jobgrade"],
    confidence: 0.90,
  },
  {
    agentRole: "PSE",
    content: "[Armstrong & Taylor] 70:20:10 model (Lombardo & Eichinger): 70% din învățare vine din experiența la locul de muncă (on-the-job), 20% din interacțiuni sociale (mentorat, feedback, colaborare), 10% din training formal (cursuri, citit). Implicație PSE: programele de dezvoltare bazate pe gap-urile din evaluarea posturilor trebuie să fie predominant experiențiale, nu doar training-uri formale.",
    tags: ["armstrong-taylor", "70-20-10", "invatare-experientiala", "dezvoltare"],
    confidence: 0.88,
  },
  {
    agentRole: "PSE",
    content: "[Armstrong & Taylor] Succession planning: identificarea și dezvoltarea talentelor pentru roluri cheie viitoare. Evaluarea posturilor oferă HARTA — care roluri sunt critice (grad mare, impact mare). Analiza competențelor oferă GAP-UL — cine e pregătit vs. cine nu. PSE integrează ambele: 'pentru postul de grad 8 avem nevoie de competențe X, Y, Z — candidatul intern are X și Y, lipsește Z — plan de dezvoltare Z.'",
    tags: ["armstrong-taylor", "succession-planning", "talent", "gap-analysis"],
    confidence: 0.88,
  },
  {
    agentRole: "PSE",
    content: "[Armstrong & Taylor] Performance management cycle: (1) Plan (set objectives), (2) Act (execute + support), (3) Monitor (track progress), (4) Review (evaluate). Evaluarea posturilor informează pasul 1 (obiectivele derivă din responsabilitățile evaluate) și pasul 4 (evaluarea individului se raportează la cerințele postului, nu la impresii). PSE conectează ciclul de performanță cu evaluarea posturilor.",
    tags: ["armstrong-taylor", "performance-management", "ciclu", "obiective"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCA — Bias in evaluation, equal pay, fairness perception
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SCA",
    content: "[Armstrong & Taylor] Equal pay: principiul 'muncă egală, plată egală' (equal pay for equal work) + 'muncă de valoare egală, plată egală' (equal pay for work of equal value). Diferența e crucială: chiar dacă posturile au titluri diferite, dacă evaluarea analitică arată VALOARE EGALĂ, salariile trebuie să fie comparabile. Metoda point-factor e singurul instrument considerat suficient de tribunale pentru a demonstra valoare egală/diferită.",
    tags: ["armstrong-taylor", "equal-pay", "valoare-egala", "tribunal"],
    confidence: 0.92,
  },
  {
    agentRole: "SCA",
    content: "[Armstrong & Taylor] Gender pay gap: diferența medie/mediană între remunerația bărbaților și femeilor. Mean gap: influențat de outlieri (CEO masculin cu salariu enorm). Median gap: mai robust, preferabil. Directiva EU 2023/970 cere raportarea AMBELOR. SCA verifică: gap-ul apare din (a) segregare ocupațională (femeile în posturi cu grad mai mic), (b) discriminare directă (același grad, salariu diferit), sau (c) factori structurali (part-time, întreruperi carieră).",
    tags: ["armstrong-taylor", "gender-pay-gap", "mean-median", "cauze"],
    confidence: 0.92,
  },
  {
    agentRole: "SCA",
    content: "[Armstrong & Taylor] Felt-fair pay: percepția angajatului că salariul e corect, independent de nivelul absolut. Un salariu obiectiv bun poate fi PERCEIVED ca incorect dacă: (a) procesul de stabilire e opac, (b) colegul cu rol similar câștigă mai mult, (c) managerul nu poate explica diferența. Evaluarea posturilor transparentă crește felt-fair pay prin EXPLICABILITATE — chiar dacă nu crește salariul.",
    tags: ["armstrong-taylor", "felt-fair", "perceptie", "explicabilitate"],
    confidence: 0.90,
  },
  {
    agentRole: "SCA",
    content: "[Armstrong & Taylor] Procedural justice vs. distributive justice: angajații acceptă rezultate nefavorabile (grad mai mic) dacă percep că PROCESUL a fost corect (procedural justice). Elementele: (1) Voice — am fost consultat. (2) Consistency — aceleași reguli pentru toți. (3) Accuracy — informațiile au fost corecte. (4) Bias suppression — fără favoritism. (5) Correctability — pot contesta. (6) Ethicality — e moral. Mecanismul de consens JobGrade (3 etape) adresează toate 6.",
    tags: ["armstrong-taylor", "procedural-justice", "distributive-justice", "acceptare"],
    confidence: 0.92,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOC — Employee relations, voice, diversity, social context
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SOC",
    content: "[Armstrong & Taylor] Employee voice: mecanismele prin care angajații influențează deciziile organizației. Direct voice: sondaje, sugestii, focus groups. Representative voice: sindicate, consilii de angajați, comitete. Evaluarea posturilor cu comitet reprezentativ (cum face JobGrade) e FORMĂ DE VOICE — angajații participă prin reprezentanți la stabilirea ierarhiei. Participarea crește acceptarea rezultatelor.",
    tags: ["armstrong-taylor", "employee-voice", "participare", "acceptare"],
    confidence: 0.88,
  },
  {
    agentRole: "SOC",
    content: "[Armstrong & Taylor] Diversity & inclusion în evaluarea posturilor: criteriile trebuie testate pe bias implicit. Factori aparent neutri pot fi discriminatori indirect: 'supervizare echipă mare' favorizează posturi tradițional masculine, 'empatie și comunicare' favorizează posturi tradițional feminine. Soluția: verificare statistică a impactului diferențiat (adverse impact analysis) + revizuire periodică a descriptorilor.",
    tags: ["armstrong-taylor", "diversity", "inclusion", "adverse-impact"],
    confidence: 0.90,
  },
  {
    agentRole: "SOC",
    content: "[Armstrong & Taylor] Relațiile industriale în Europa continentală (inclusiv RO): modelul social-parteneriat — angajator + sindicate + stat. Evaluarea posturilor se face în dialog social, nu unilateral. Directiva EU 2023/970 cere consultarea reprezentanților angajaților în procesul de evaluare. SOC consiliază: implicarea sindicatului/comitetului de angajați NU e opțională — e cerință legală și factor de legitimare.",
    tags: ["armstrong-taylor", "relatii-industriale", "social-parteneriat", "sindicat"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PSYCHOLINGUIST — Employee communication, consultation, feedback
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Armstrong & Taylor] Comunicarea rezultatelor evaluării: principiul EXPLICABILITĂȚII — orice angajat are dreptul să înțeleagă DE CE postul lui e în gradul X. Comunicarea nu e doar informare ('ești grad 5') ci narativ explicativ ('criteriul Rezolvare probleme = nivel 3 pentru că...') Fără narativ, evaluarea e percepută ca verdict arbitrar. Cu narativ, e percepută ca proces transparent.",
    tags: ["armstrong-taylor", "comunicare-rezultate", "explicabilitate", "narativ"],
    confidence: 0.90,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Armstrong & Taylor] Consultarea în procesul de evaluare: angajații/managerii trebuie CONSULTAȚI (nu doar informați) pe: (1) fișele de post înainte de evaluare (sunt corecte?), (2) criteriile de evaluare (sunt relevante?), (3) rezultatele preliminare (par corecte?). Consultarea nu e slăbiciune — e validare. Limbajul consultării: 'Ce ne scapă?' e mai puternic decât 'Aveți comentarii?'",
    tags: ["armstrong-taylor", "consultare", "validare", "limbaj"],
    confidence: 0.88,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Armstrong & Taylor] Managementul așteptărilor: evaluarea posturilor NU promite creșteri salariale — promite ECHITATE. Comunicarea trebuie să seteze explicit: 'Evaluarea stabilește ierarhia corectă a posturilor. Salariile se aliniază ulterior, în funcție de buget și piață.' Confuzia evaluare=mărire salariu = cea mai frecventă sursă de dezamăgire post-implementare.",
    tags: ["armstrong-taylor", "asteptari", "echitate-vs-marire", "comunicare-preventiva"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY_MONITOR — Health & safety, stress, harassment, ethics
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SAFETY_MONITOR",
    content: "[Armstrong & Taylor] Stresul la locul de muncă (model Karasek): combinația demand high + control low = strain (stres patologic). Posturi evaluate cu 'Condiții muncă' = nivel mare + 'Luarea deciziilor' = nivel mic = profil de risc pentru stres. SAFETY_MONITOR poate folosi scorurile JobGrade ca predictor de risc ocupațional — alertând organizația asupra posturilor cu profil stresogen.",
    tags: ["armstrong-taylor", "stres", "karasek", "predictor-risc"],
    confidence: 0.88,
  },
  {
    agentRole: "SAFETY_MONITOR",
    content: "[Armstrong & Taylor] Etica în HR: (1) Respectul pentru persoană (nu doar resursă). (2) Echitatea procedurală (proces corect). (3) Transparența (fără agende ascunse). (4) Buna credință (promisiunile se țin). Evaluarea posturilor testează TOATE: respectul (postul e evaluat corect), echitatea (aceleași criterii), transparența (criteriile sunt publice), buna credință (rezultatele se aplică, nu se ignoră selectiv).",
    tags: ["armstrong-taylor", "etica-HR", "principii", "evaluare-test"],
    confidence: 0.88,
  },
]

// ── Seed Execution ──────────────────────────────────────────────────────────

async function seedArmstrongTaylor() {
  const uniqueAgents = new Set(entries.map(e => e.agentRole))
  console.log(`\n📚 Seed Armstrong & Taylor L2 — ${entries.length} entries pentru ${uniqueAgents.size} consilieri\n`)

  let created = 0
  let skipped = 0

  for (const entry of entries) {
    try {
      const existing = await (prisma as any).kBEntry.findFirst({
        where: {
          agentRole: entry.agentRole,
          content: { contains: entry.content.substring(0, 50) },
          status: STATUS,
        },
      })

      if (existing) {
        skipped++
        continue
      }

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
      const preview = entry.content.substring(entry.content.indexOf(']') + 2, entry.content.indexOf(']') + 55)
      process.stdout.write(`  ✓ ${entry.agentRole}: ${preview}...\n`)
    } catch (err: any) {
      console.error(`  ✗ ${entry.agentRole}: ${err.message}`)
    }
  }

  console.log(`\n✅ Armstrong & Taylor L2 seed complet: ${created} create, ${skipped} skip (duplicate)\n`)

  for (const role of uniqueAgents) {
    const count = entries.filter(e => e.agentRole === role).length
    console.log(`  ${role}: ${count} entries`)
  }

  await prisma.$disconnect()
}

seedArmstrongTaylor().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
