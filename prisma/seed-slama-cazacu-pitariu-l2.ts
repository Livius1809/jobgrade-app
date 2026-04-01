/**
 * seed-slama-cazacu-pitariu-l2.ts — Infuzare KB reală cu cunoaștere din:
 *
 * 1. "Psiholingvistica, o știință a comunicării" — Tatiana Slama-Cazacu
 *    Fondatoarea psiholingvisticii românești. Lucrarea fundamentală despre
 *    comunicare ca proces dinamic, sintaxa mixtă, competența pragmatică,
 *    bariere comunicaționale, relația gândire-limbaj.
 *
 * 2. "Proiectarea fișelor de post, evaluarea posturilor de muncă și a
 *    personalului" — Horia D. Pitariu
 *    Autoritatea română în evaluarea posturilor. Metodologie point-factor,
 *    psihometrie aplicată HR, validitate/fidelitate evaluări, erori de
 *    evaluare, adaptare metode occidentale la context RO.
 *
 * Distribuție per consilier L2:
 *   PSYCHOLINGUIST — Slama-Cazacu: comunicare, sintaxă mixtă, pragmatică
 *   SOC            — Slama-Cazacu: dimensiunea socială a limbajului
 *   SCA            — Pitariu: biasuri evaluare + Slama-Cazacu: distorsiuni comunicare
 *   PPA            — Pitariu: dezvoltare personal prin evaluare corectă
 *   PSE            — Pitariu: competențe, training needs + Slama-Cazacu: învățare prin limbaj
 *   PPMO           — Pitariu: cultura evaluării în organizații RO
 *   STA            — Pitariu: psihometrie, validitate, fidelitate, analiză statistică
 *
 * Usage: npx tsx prisma/seed-slama-cazacu-pitariu-l2.ts
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
  // PSYCHOLINGUIST — Slama-Cazacu: comunicare, sintaxă mixtă, pragmatică
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Slama-Cazacu] Comunicarea NU e transfer liniar de informație (modelul Shannon-Weaver e insuficient). E proces DINAMIC, bidirecțional, în care sensul se CONSTRUIEȘTE în interacțiune — nu se transmite preformat. Implicație pentru agenții AI: răspunsul nu e livrare de informație ci co-construcție de sens cu interlocutorul. Fiecare mesaj al clientului reconfigurează contextul.",
    tags: ["slama-cazacu", "comunicare", "proces-dinamic", "co-constructie"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Slama-Cazacu] SINTAXA MIXTĂ — conceptul central: comunicarea reală combină simultan canal verbal (cuvinte), paraverbal (ton, ritm, pauze) și nonverbal (gesturi, mimică, postură). În text scris, canalul paraverbal și nonverbal NU dispar — se transpun în: punctuație, formatare, emoji, lungime mesaj, timp de răspuns, alegere lexicală. PSYCHOLINGUIST trebuie să 'citească' aceste echivalente textuale ale sintaxei mixte.",
    tags: ["slama-cazacu", "sintaxa-mixta", "paraverbal", "nonverbal-text"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Slama-Cazacu] Competența pragmatică = capacitatea de a folosi limba ADECVAT în CONTEXT. Nu e suficient să fie gramatical corect — trebuie să fie pragmatic potrivit. Un răspuns perfect tehnic dar pragmatic inadecvat (prea formal, prea lung, ton nepotrivit) eșuează comunicativ. PSYCHOLINGUIST evaluează nu CE spune agentul ci CUM spune în raport cu contextul specific al interlocutorului.",
    tags: ["slama-cazacu", "competenta-pragmatica", "adecvare", "context"],
    confidence: 0.90,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Slama-Cazacu] Barierele comunicării: (1) Bariere de limbaj — terminologie necunoscută, jargon excesiv. (2) Bariere psihologice — prejudecăți, stări emoționale, rezistență. (3) Bariere de context — cadru inadecvat, zgomot informațional, timing greșit. (4) Bariere culturale — coduri diferite, referințe necomune. PSYCHOLINGUIST detectează care barieră e activă și adaptează calibrarea.",
    tags: ["slama-cazacu", "bariere", "diagnostic", "adaptare"],
    confidence: 0.90,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Slama-Cazacu] Relația gândire-limbaj: limbajul nu doar EXPRIMĂ gândirea — o STRUCTUREAZĂ. Modul în care formulăm o problemă determină cum o gândim și ce soluții vedem. Implicație operațională: când reformulăm mesajul pentru client, nu doar traducem — RESTRUCTURĂM cadrul cognitiv. 'Evaluarea posturilor' vs. 'înțelegerea valorii fiecărui rol' — aceeași operațiune, cadru cognitiv diferit.",
    tags: ["slama-cazacu", "gandire-limbaj", "reframing", "cadru-cognitiv"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Slama-Cazacu] Redundanța funcțională: în comunicare, repetarea nu e defect — e mecanism de asigurare a înțelegerii. Mesajul important trebuie spus de mai multe ori, în forme diferite (parafrazare, exemplu, rezumat). Mesajele unice, neredundate, se pierd. Calibrare: ideea cheie se repetă de 3 ori — o dată direct, o dată prin exemplu, o dată prin implicație.",
    tags: ["slama-cazacu", "redundanta", "repetitie", "intelegere"],
    confidence: 0.88,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Slama-Cazacu] Feedback-ul comunicativ: interlocutorul semnalează continuu dacă înțelege sau nu — prin întrebări, reformulări, confirmare, tăcere, schimbare de subiect. În comunicarea scrisă: răspuns scurt = posibil neînțelegere sau dezinteres. Întrebare repetată = mesajul anterior nu a fost clar. Schimbare bruscă de registru = disconfort. PSYCHOLINGUIST monitorizează aceste semnale și alertează.",
    tags: ["slama-cazacu", "feedback-comunicativ", "semnale", "monitorizare"],
    confidence: 0.88,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Slama-Cazacu] Polisemia contextuală: același cuvânt are sensuri diferite în contexte diferite. 'Evaluare' pentru un HR Director = proces formal de clasificare posturi. 'Evaluare' pentru un angajat = judecare personală, posibilă amenințare. PSYCHOLINGUIST trebuie să detecteze din context care sens operează și să calibreze comunicarea celorlalți agenți pentru a evita ambiguitatea cu impact negativ.",
    tags: ["slama-cazacu", "polisemie", "context", "ambiguitate"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOC — Slama-Cazacu: dimensiunea socială a limbajului
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SOC",
    content: "[Slama-Cazacu] Limbajul e fenomen SOCIAL — nu individual. Sensul cuvintelor e negociat colectiv, nu fixat de dicționar. Într-o organizație, termenii capătă sensuri locale: 'performanță', 'echitate', 'evaluare' înseamnă lucruri diferite în culturi organizaționale diferite. SOC evaluează lexiconul organizațional al clientului ÎNAINTE de a calibra comunicarea — ce înseamnă EVALUARE pentru EI?",
    tags: ["slama-cazacu", "limbaj-social", "lexicon-organizational", "sens-local"],
    confidence: 0.88,
  },
  {
    agentRole: "SOC",
    content: "[Slama-Cazacu] Variațiile sociolectale: limba diferă pe axe sociale — vârstă, educație, profesie, urban/rural, clasă socială. Un HR Director vorbește alt sociolect decât un CEO antreprenor. Comunicarea eficientă necesită adaptare la sociolectul interlocutorului, nu standardizare. SOC furnizează profilul sociolingvistic per segment de client pentru calibrarea celorlalți agenți.",
    tags: ["slama-cazacu", "sociolect", "variatie", "profil-client"],
    confidence: 0.85,
  },
  {
    agentRole: "SOC",
    content: "[Slama-Cazacu] Normele de politețe lingvistică sunt social construite și cultural variabile. În România, norma include: deferanță inițială (Dumneavoastră), prudență în afirmații categorice ('ar putea fi', 'probabil'), evitarea contrazicerii directe ('o perspectivă interesantă, dar...' vs. 'greșiți'). Agenții AI care nu respectă aceste norme sunt percepuți ca 'roboți' sau 'nepoliticoși', indiferent de calitatea informației.",
    tags: ["slama-cazacu", "politete", "norme-lingvistice", "perceptie"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCA — Pitariu: erori de evaluare + Slama-Cazacu: distorsiuni comunicare
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SCA",
    content: "[Pitariu] Eroarea de indulgență/severitate: evaluatorii tind sistematic să acorde scoruri fie prea mari (indulgență — 'nu vreau să supăr pe nimeni') fie prea mici (severitate — 'trebuie să fiu exigent'). Detectare: distribuția scorurilor e deplasată semnificativ la stânga sau dreapta față de normal. Corecție: calibrare pre-evaluare cu exemple ancorate, nu post-hoc.",
    tags: ["pitariu", "eroare-evaluare", "indulgenta", "severitate"],
    confidence: 0.92,
  },
  {
    agentRole: "SCA",
    content: "[Pitariu] Efectul de halo/horn în evaluarea posturilor: un aspect pozitiv (halo) sau negativ (horn) al postului influențează evaluarea tuturor celorlalte dimensiuni. Exemplu: un post cu condiții de muncă dificile (horn) primește scoruri mai mici și pe 'Educație' sau 'Impact afaceri' — deși sunt independente. Detectare SCA: corelații anormal de mari între criterii care ar trebui să fie independente.",
    tags: ["pitariu", "halo", "horn", "corelatie-artificiala"],
    confidence: 0.92,
  },
  {
    agentRole: "SCA",
    content: "[Pitariu] Eroarea de tendință centrală: evaluatorii evită extremele scalei, concentrându-se pe scoruri medii. Cauze: incertitudine, evitare conflict, lipsă cunoaștere aprofundată a postului. În context RO (Daniel David: evitare conflict + dezirabilitate socială), tendința centrală e AMPLIFICATĂ cultural. Detectare: varianță anormal de mică pe distribuția scorurilor. Corecție: distribuție forțată sau scale cu mai puțini pași.",
    tags: ["pitariu", "tendinta-centrala", "varianta", "cultural-amplificat"],
    confidence: 0.92,
  },
  {
    agentRole: "SCA",
    content: "[Pitariu] Eroarea de contrast/similaritate: evaluatorul compară postul cu SINE (similaritate — 'e ca mine, deci e bun') sau cu postul ANTERIOR (contrast — după un post complex, următorul pare simplu). Detectare: secvența de evaluare influențează scorurile (primele și ultimele diferă sistematic de cele din mijloc). Corecție: randomizarea ordinii de evaluare a posturilor.",
    tags: ["pitariu", "contrast", "similaritate", "ordine-evaluare"],
    confidence: 0.90,
  },
  {
    agentRole: "SCA",
    content: "[Slama-Cazacu] Distorsiuni comunicative: (1) Filtrajul — mesajul se simplifică pe măsură ce trece prin intermediari, pierde nuanțe. (2) Selectivitatea perceptuală — receptorul aude ce vrea/se teme să audă. (3) Supraîncărcarea — prea multă informație = nicio informație procesată corect. (4) Lipsa feedbackului — emitatorul presupune că a fost înțeles fără verificare. SCA monitorizează aceste distorsiuni în comunicarea inter-agent și cu clientul.",
    tags: ["slama-cazacu", "distorsiuni-comunicative", "filtraj", "selectivitate"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STA — Pitariu: psihometrie, validitate, fidelitate, statistică evaluare
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "STA",
    content: "[Pitariu] Validitatea evaluării posturilor: de conținut (criteriile acoperă esența postului?), de construct (măsurăm ce pretindem?), de criteriu (rezultatele corelează cu performanța reală?). Metodologia JobGrade (6 criterii fixe) are validitate de conținut prin standardizare — dar validitatea de criteriu trebuie verificată empiric per organizație. STA recomandă: corelează scorurile evaluării cu indicatorii de performanță existenți.",
    tags: ["pitariu", "validitate", "psihometrie", "criterii"],
    confidence: 0.92,
  },
  {
    agentRole: "STA",
    content: "[Pitariu] Fidelitatea (reliability) evaluării: test-retest (stabilitate temporală), inter-evaluatori (acord între evaluatori), consistență internă (alpha Cronbach). Indicele de acord inter-evaluatori e CRITIC pentru consensul JobGrade. Formula: coeficient kappa Cohen pentru date ordinale. Prag acceptabil: κ ≥ 0.61 (acord substanțial). Sub 0.40 = acord slab — necesită recalibrare.",
    tags: ["pitariu", "fidelitate", "kappa", "inter-evaluatori"],
    confidence: 0.92,
  },
  {
    agentRole: "STA",
    content: "[Pitariu] Analiza posturilor (job analysis) — fundament al evaluării: observație directă, chestionar structurat, interviu cu deținătorul postului, analiza incidentelor critice, jurnalul de activitate. Fișa de post derivată din analiză trebuie să conțină: scop, responsabilități principale (5-8), competențe necesare, cerințe fizice/mentale, relații ierarhice. JobGrade evaluează pe baza fișelor — deci calitatea evaluării depinde de calitatea fișei.",
    tags: ["pitariu", "analiza-posturilor", "fisa-post", "metode"],
    confidence: 0.92,
  },
  {
    agentRole: "STA",
    content: "[Pitariu] Metoda factorilor și punctelor (point-factor) — cea mai riguroasă pentru evaluarea posturilor: (1) definire factori (criterii), (2) definire niveluri per factor cu descriptori anuali, (3) atribuire ponderi relative factorilor, (4) scorare fiecare post pe fiecare factor, (5) calcul scor total ponderat, (6) ierarhizare și grupare în clase salariale. Metodologia JobGrade (6 criterii × subfactori × 5 niveluri) e o implementare point-factor.",
    tags: ["pitariu", "point-factor", "metodologie", "scorare"],
    confidence: 0.95,
  },
  {
    agentRole: "STA",
    content: "[Pitariu] Clasele salariale (grade bands): nu orice diferență de punctaj justifică o clasă separată. Testul statistic: diferența între scoruri trebuie să fie SEMNIFICATIVĂ (nu doar aritmetică). Recomandare: distribuția naturală a scorurilor determină intervalele — nu imposiția arbitrară a N grade. STA verifică: sunt clusterele de posturi statistic distincte sau artificiale?",
    tags: ["pitariu", "clase-salariale", "semnificatie", "clustering"],
    confidence: 0.90,
  },
  {
    agentRole: "STA",
    content: "[Pitariu] Ponderea factorilor (criteriilor): nu toți factorii contează la fel. Ponderea reflectă importanța relativă a fiecărui factor pentru organizație. Metodă empirică: compararea perechilor (paired comparison) între factori de către un comitet. Metodă analitică: regresia multiplă pe scoruri existente. JobGrade folosește ponderi egale implicit — STA recomandă validare: ponderile egale sunt adecvate pentru tipul de organizație?",
    tags: ["pitariu", "ponderi", "factori", "validare"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPMO — Pitariu: cultura evaluării în organizații RO
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PPMO",
    content: "[Pitariu] Implementarea evaluării posturilor în organizații românești necesită PREGĂTIRE CULTURALĂ. Rezistența tipică: 'știm noi ce face fiecare', 'nu avem nevoie de birocație', 'e o modă vestică'. Strategia Pitariu: (1) implicarea managementului de vârf ca sponsor, (2) comitet de evaluare cu reprezentanți din toate departamentele, (3) transparența criteriilor ÎNAINTE de evaluare, (4) comunicarea beneficiilor concrete, nu abstracte.",
    tags: ["pitariu", "implementare", "rezistenta", "pregatire-culturala"],
    confidence: 0.90,
  },
  {
    agentRole: "PPMO",
    content: "[Pitariu] Comitetul de evaluare: 5-9 membri, reprezentativi pe departamente, instruiți în metodologie, cu acces la fișele de post. Evaluarea se face pe POST nu pe PERSOANĂ — cel mai frecvent eroare în RO: 'Ion e bun deci postul lui e important.' Separarea post-persoană necesită re-ancorare repetată pe parcursul sesiunilor. PPMO instruiește: 'Evaluați postul ca și cum ar fi vacant — ce cere el, nu cine îl ocupă.'",
    tags: ["pitariu", "comitet", "post-vs-persoana", "instruire"],
    confidence: 0.92,
  },
  {
    agentRole: "PPMO",
    content: "[Pitariu] Evaluarea personalului vs. evaluarea posturilor — confuzia nr. 1 în RO. Evaluarea posturilor = ierarhizarea ROLURILOR (toate pozițiile de 'contabil' au același grad, indiferent cine le ocupă). Evaluarea personalului = performanța INDIVIDULUI în rol. JobGrade face evaluare de POSTURI. PPMO trebuie să clarifice această distincție la FIECARE onboarding client — altfel, tot procesul e perceput ca judecare a angajaților.",
    tags: ["pitariu", "evaluare-post-vs-personal", "confuzie", "clarificare"],
    confidence: 0.95,
  },
  {
    agentRole: "PPMO",
    content: "[Pitariu] Efectul politic al evaluării posturilor: ierarhia rezultată poate contrazice ierarhia informală (un post 'favorizat' de management primește grad mai mic decât așteptat). Rezolvare: rezultatele sunt OBIECTIVE, dar comunicarea lor necesită empatie și context. Nu 'postul tău e mai puțin important' ci 'criteriile obiective arată un profil de complexitate diferit'. PPMO consiliază managementul pe COMUNICAREA rezultatelor, nu pe modificarea lor.",
    tags: ["pitariu", "politic", "ierarhie-informala", "comunicare-rezultate"],
    confidence: 0.90,
  },
  {
    agentRole: "PPMO",
    content: "[Pitariu] Actualizarea evaluărilor: posturile NU sunt statice — responsabilitățile evoluează. Recomandare Pitariu: re-evaluare la fiecare schimbare semnificativă (reorganizare, fuziune, tehnologie nouă) sau cel puțin anual. JobGrade facilitează: re-import fișe actualizate → re-scorare → comparație cu ierarhia anterioară. PPMO planifică ciclurile de re-evaluare cu clientul.",
    tags: ["pitariu", "actualizare", "cicluri", "dinamica-posturi"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPA — Pitariu: dezvoltare personal prin evaluare corectă
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PPA",
    content: "[Pitariu] Evaluarea corectă a posturilor contribuie la wellbeing organizațional prin mecanism de percepție a echității (teoria echității Adams): când angajații percep că raportul input/output (muncă/salariu) e ECHITABIL comparativ cu alții, satisfacția crește semnificativ. Evaluarea obiectivă elimină percepția de favoritism — principalul destructor de wellbeing organizațional în RO.",
    tags: ["pitariu", "echitate", "adams", "wellbeing"],
    confidence: 0.90,
  },
  {
    agentRole: "PPA",
    content: "[Pitariu] Fișa de post clară contribuie la autonomia percepută (SDT): angajatul știe ce se așteaptă de la el, unde îi sunt limitele, unde are libertate decizională. Ambiguitatea de rol = anxietate = scădere wellbeing. JobGrade, prin evaluarea pe 6 criterii, clarifică implicit ce e important în fiecare rol — oferind angajatului un cadru clar de competență percepută.",
    tags: ["pitariu", "fisa-post", "autonomie", "claritate-rol"],
    confidence: 0.88,
  },
  {
    agentRole: "PPA",
    content: "[Pitariu] Transparența claselor salariale (conform și Directivei EU 2023/970) reduce anxietatea salarială: angajatul nu mai trebuie să ghicească dacă e plătit corect — VEDE grila. Studii Pitariu: organizațiile cu grile transparente au turnover cu 15-25% mai mic decât cele cu salarii opace. PPA reframe: transparența nu e vulnerabilitate ci investiție în stabilitate echipă.",
    tags: ["pitariu", "transparenta", "anxietate-salariala", "retentie"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PSE — Pitariu: competențe, training needs + Slama-Cazacu: învățare
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSE",
    content: "[Pitariu] Analiza nevoilor de instruire (Training Needs Analysis) derivă din evaluarea posturilor: comparația între competențele cerute de post (din fișa evaluată) și competențele actuale ale deținătorului = GAP DE COMPETENȚE. Acest gap e baza pentru design-ul instrucțional (ADDIE). JobGrade identifică implicit gap-urile prin cele 6 criterii — PSE le traduce în parcursuri de dezvoltare.",
    tags: ["pitariu", "training-needs", "gap-competente", "addie"],
    confidence: 0.90,
  },
  {
    agentRole: "PSE",
    content: "[Pitariu] Descriptori comportamentali pe niveluri (BARS — Behaviorally Anchored Rating Scales): fiecare nivel pe fiecare criteriu e descris prin comportamente observabile. Nu 'comunicare bună' ci 'susține prezentări pentru audiențe de 50+ persoane cu structură clară și Q&A'. PSE folosește descriptorii BARS ca obiective de învățare concrete — trecerea de la nivelul 2 la nivelul 3 devine parcurs de dezvoltare măsurabil.",
    tags: ["pitariu", "bars", "descriptori", "obiective-invatare"],
    confidence: 0.90,
  },
  {
    agentRole: "PSE",
    content: "[Slama-Cazacu] Învățarea prin limbaj: limbajul nu e doar vehicul al cunoașterii — e instrument de structurare a gândirii. Când un adult (angajat) verbalizează ce face ('descrie-mi o zi tipică'), procesul de verbalizare CLARIFICĂ și pentru el însuși ce face. Implicație PSE: interviurile pentru analiza posturilor nu sunt doar extragere de informație — sunt INSTRUMENTE DE ÎNVĂȚARE pentru deținătorul postului.",
    tags: ["slama-cazacu", "invatare-limbaj", "verbalizare", "clarificare"],
    confidence: 0.85,
  },
  {
    agentRole: "PSE",
    content: "[Slama-Cazacu] Metalimbajul — capacitatea de a vorbi DESPRE limbaj. În context HR: capacitatea de a discuta DESPRE criterii, DESPRE evaluare, DESPRE competențe (nu doar a le exercita). Training-ul evaluatorilor (PSE responsabilitate) necesită dezvoltarea metalimbajului HR: evaluatorii trebuie să poată ARTICULA de ce au ales un anumit nivel, nu doar să îl intuiască.",
    tags: ["slama-cazacu", "metalimbaj", "articulare", "training-evaluatori"],
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY_MONITOR — Pitariu: riscuri etice în evaluare
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SAFETY_MONITOR",
    content: "[Pitariu] Risc etic major în evaluarea posturilor: discriminarea indirectă. Criterii aparent neutre pot penaliza sistematic anumite categorii: 'condiții fizice grele' penalizează posturi ocupate predominant de femei, 'disponibilitate program extins' penalizează părinți. Directiva EU 2023/970 cere verificare: criteriile sunt neutre din perspectiva genului? SAFETY_MONITOR alertează când distribuția scorurilor arată corelații cu genul.",
    tags: ["pitariu", "discriminare-indirecta", "gen", "directiva-eu"],
    confidence: 0.92,
  },
  {
    agentRole: "SAFETY_MONITOR",
    content: "[Pitariu] Evaluarea posturilor poate genera ANXIETATE ORGANIZAȚIONALĂ dacă e comunicată prost: angajații percep 'ni se evaluează posturile' ca 'ni se pregătesc concedierile'. SAFETY_MONITOR monitorizează semnale de anxietate organizațională la clienți în timpul procesului de evaluare și alertează echipa pentru intervenție de comunicare.",
    tags: ["pitariu", "anxietate-organizationala", "comunicare", "preventie"],
    confidence: 0.88,
  },
]

// ── Seed Execution ──────────────────────────────────────────────────────────

async function seedSlamaCazacuPitariu() {
  const uniqueAgents = new Set(entries.map(e => e.agentRole))
  console.log(`\n📚 Seed Slama-Cazacu + Pitariu L2 — ${entries.length} entries pentru ${uniqueAgents.size} consilieri\n`)

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

  console.log(`\n✅ Slama-Cazacu + Pitariu L2 seed complet: ${created} create, ${skipped} skip (duplicate)\n`)

  for (const role of uniqueAgents) {
    const count = entries.filter(e => e.agentRole === role).length
    const source = entries.filter(e => e.agentRole === role).map(e => e.tags[0]).filter((v, i, a) => a.indexOf(v) === i).join(" + ")
    console.log(`  ${role}: ${count} entries (${source})`)
  }

  await prisma.$disconnect()
}

seedSlamaCazacuPitariu().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
