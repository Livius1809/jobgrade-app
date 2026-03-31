import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const entries = [
  // ═══ PSIHOLOGIA VÂRSTELOR / DEZVOLTARE ═══
  { content: "[PSE] Psihologia varstelor (developmental psychology): fiecare etapa de viata are nevoi de invatare specifice. Copilarie: achizitie fundamentala. Adolescenta: identitate si explorare. Adult tanar (20-35): competenta profesionala. Adult matur (35-55): expertiza si mentoring. Senior (55+): transmitere si sens. In organizatii: fiecare angajat e intr-o etapa — programele de dezvoltare trebuie calibrate.", tags: ["varste", "dezvoltare", "etape"], confidence: 0.90 },
  { content: "[PSE] Dezvoltarea cognitiva (Piaget aplicat la adulti): gandirea formala (abstracta, ipotetica) nu e stadiul final. Adultii dezvolta gandire post-formala — tolereaza contradictii, integreaza perspective multiple, gandire dialectica. Implicatie: training-ul pentru seniori ≠ training pentru juniori. Seniorii au nevoie de complexitate, nu simplificare.", tags: ["piaget", "cognitiv", "adulti", "post-formal"], confidence: 0.85 },
  { content: "[PSE] Etapele psihosociale (Erikson): 8 stadii, fiecare cu o criza de rezolvat. Relevante pentru organizatii: Identitate vs Confuzie (20-25, noul angajat), Intimitate vs Izolare (25-35, relatii profesionale), Generativitate vs Stagnare (35-55, mentoring, legacy), Integritate vs Disperare (55+, sens, transmitere). Crizele nerezolvate afecteaza performanta.", tags: ["erikson", "stadii", "crize", "HR"], confidence: 0.90 },
  { content: "[PSE] Dezvoltarea morala (Kohlberg): 3 niveluri — pre-conventional (reguli din frica de pedeapsa), conventional (reguli din conformism social), post-conventional (principii universale). In organizatii: angajatul pre-conventional respecta regulile doar cand e supravegheat. Cel conventional le respecta pentru ca asa face toata lumea. Cel post-conventional actioneaza din principii chiar contra regulilor injuste.", tags: ["kohlberg", "moral", "dezvoltare", "etica"], confidence: 0.90 },
  { content: "[PSE] Dezvoltarea adultului (Levinson, Seasons of Life): tranzitii previzibile — Early Adult Transition (17-22), Entry Life Structure (22-28), Age 30 Transition, Mid-Life Transition (40-45). Fiecare tranzitie e o oportunitate de crestere sau de criza. HR-ul care intelege tranzitiile poate preveni pierderea talentelor.", tags: ["levinson", "tranzitii", "adult", "HR"], confidence: 0.85 },

  // ═══ TEORII ALE ÎNVĂȚĂRII ═══
  { content: "[PSE] Behaviorism (Skinner): invatarea prin intarire (recompensa/pedeapsa). In organizatii: bonusuri, penalizari, recognition programs. Limitat: produce conformitate, nu creativitate. Eficient pentru abilitati procedurale, ineficient pentru gandire critica.", tags: ["behaviorism", "skinner", "invatare"], confidence: 0.85 },
  { content: "[PSE] Cognitivism (Bruner, Ausubel): invatarea ca procesare de informatie. Schema mentala, organizatori avansati, invatare prin descoperire. In organizatii: structurarea training-ului de la simplu la complex, conectarea cu ce stie deja angajatul, invatare activa nu pasiva.", tags: ["cognitivism", "bruner", "ausubel", "training"], confidence: 0.85 },
  { content: "[PSE] Constructivism (Vygotsky): cunoasterea se construieste social, prin interactiune. Zona proximei dezvoltari (ZPD) — distanta intre ce pot singur si ce pot cu ajutor. In organizatii: mentoring-ul functioneaza exact in ZPD. Prea usor = plictiseala. Prea greu = frustrare. ZPD = flow.", tags: ["constructivism", "vygotsky", "zpd", "mentoring"], confidence: 0.90 },
  { content: "[PSE] Invatarea experientiala (Kolb): ciclul — Experienta Concreta → Observatie Reflectiva → Conceptualizare Abstracta → Experimentare Activa. 4 stiluri de invatare: Divergent, Asimilator, Convergent, Acomodator. Training-ul eficient parcurge tot ciclul, nu doar prezentare (conceptualizare).", tags: ["kolb", "experiential", "ciclul", "stiluri"], confidence: 0.90 },
  { content: "[PSE] Invatarea sociala (Bandura): invatam observand pe altii (modelare). Auto-eficacitatea (self-efficacy): credinta ca pot reusi. In organizatii: liderii sunt modele — comportamentul lor e training-ul real. Un lider care incalca valorile anuleaza orice program de training formal.", tags: ["bandura", "modelare", "auto-eficacitate"], confidence: 0.90 },
  { content: "[PSE] Invatarea transformativa (Mezirow): schimbarea perspectivelor fundamentale (frames of reference). Nu adaugi cunoastere — transformi modul de a vedea lumea. Momentul aha = transformare de perspectiva. In organizatii: programele de leadership development la nivel inalt vizeaza transformare, nu informare.", tags: ["mezirow", "transformativa", "perspectiva", "leadership"], confidence: 0.90 },
  { content: "[PSE] Taxonomia Bloom (revizuita): 6 niveluri cognitive — Reamintire → Intelegere → Aplicare → Analizare → Evaluare → Creare. Training-ul organizational se opreste adesea la Reamintire/Intelegere. Performanta reala necesita minim Aplicare. Inovatia necesita Creare. Designul instructional trebuie sa urce pe scara.", tags: ["bloom", "taxonomie", "niveluri", "design"], confidence: 0.90 },

  // ═══ ANDRAGOGIE (EDUCAȚIA ADULȚILOR) ═══
  { content: "[PSE] Andragogia (Knowles): educatia adultilor difera fundamental de pedagogie. 6 principii: (1) adultii au nevoie sa stie DE CE invata, (2) self-concept — se vad ca auto-directivi, (3) experienta anterioara e resursa, (4) readiness — invata cand au nevoie, (5) orientare spre probleme nu spre continut, (6) motivatie intrinseca predominanta.", tags: ["andragogie", "knowles", "principii", "adulti"], confidence: 0.95 },
  { content: "[PSE] Implicatii andragogice pentru training organizational: (1) explica relevanta inainte de continut, (2) da control asupra procesului de invatare, (3) valorifica experienta participantilor, (4) livreaza just-in-time nu just-in-case, (5) centreaza pe probleme reale nu pe teorie, (6) apeleaza la motivatia intrinseca nu la obligatie.", tags: ["andragogie", "training", "implicatii", "practic"], confidence: 0.90 },
  { content: "[PSE] Self-directed learning (Tough, Knowles): adultii prefera sa-si dirijeze propria invatare. 70-20-10 model: 70% invatare din experienta (on-the-job), 20% din relatii (mentoring, feedback), 10% din formare formala (cursuri, training). Implicatie: investitia in training formal = doar 10% din invatare. Restul vine din design-ul mediului de lucru.", tags: ["self-directed", "70-20-10", "informal", "design"], confidence: 0.90 },

  // ═══ DESIGN INSTRUCȚIONAL ═══
  { content: "[PSE] ADDIE (modelul design instrucional): Analysis → Design → Development → Implementation → Evaluation. Fiecare program de training ar trebui sa parcurga aceste etape. Cele mai frecvente greseli: sari peste Analysis (nu stii ce nevoie rezolvi) si Evaluation (nu stii daca a functionat).", tags: ["addie", "design-instructional", "model"], confidence: 0.85 },
  { content: "[PSE] Modelul Kirkpatrick (evaluare training): 4 niveluri — (1) Reactie (le-a placut?), (2) Invatare (au invatat?), (3) Comportament (aplica?), (4) Rezultate (impact business?). Majoritatea organizatiilor masoara doar nivelul 1 (satisfactie). ROI-ul real e la nivelul 4.", tags: ["kirkpatrick", "evaluare", "roi", "training"], confidence: 0.90 },
  { content: "[PSE] Microlearning: module scurte (5-15 min), focusate, accesibile on-demand. Bazat pe curba uitarii (Ebbinghaus) — fara repetitie, 80% se pierde in 30 zile. Spaced repetition (repetitie esalonata) creste retentia de la 20% la 80%. Implicatie: mai bine 10 module de 5 min decat 1 sesiune de 50 min.", tags: ["microlearning", "ebbinghaus", "repetitie", "retentie"], confidence: 0.85 },

  // ═══ MOTIVAȚIA ÎNVĂȚĂRII ═══
  { content: "[PSE] Motivatia invatarii la adulti: intrinseca (curiozitate, sens, competenta) vs extrinseca (certificare, promovare, obligatie). Invatarea intrinsec motivata: retentie mai buna, transfer mai bun, satisfactie. Invatarea prin obligatie: retentie slaba, resentiment, compliance fara internalizare.", tags: ["motivatie", "invatare", "intrinseca", "adulti"], confidence: 0.90 },
  { content: "[PSE] Teoria autodeterminarii aplicata la invatare (Deci & Ryan): (1) Autonomie — ofer optiuni, nu impun, (2) Competenta — nivel potrivit, feedback constructiv, progres vizibil, (3) Relationare — invatare sociala, comunitate de practica. Cand toate 3 sunt prezente: angajatul invata cu placere.", tags: ["sdt", "invatare", "autonomie", "competenta"], confidence: 0.85 },

  // ═══ TRANSFER DE CUNOAȘTERE ═══
  { content: "[PSE] Transferul cunoasterii (Baldwin & Ford): doar 10-20% din ce se invata in training se aplica la locul de munca. Bariere: lipsa suportului managerial, lipsa oportunitatilor de practica, cultura care nu valorizeaza invatarea. Facilitatori: suport post-training, coaching, proiecte aplicative, comunitate de practica.", tags: ["transfer", "baldwin", "ford", "bariere"], confidence: 0.90 },
  { content: "[PSE] Comunitatea de practica (Wenger): grup de oameni care impartasesc o preocupare si invata impreuna prin interactiune regulata. In organizatii: grupuri cross-departamentale pe teme specifice. Nu sunt impuse — se formeaza organic. Rolul organizatiei: facilitare, nu control.", tags: ["comunitate-practica", "wenger", "informal"], confidence: 0.85 },

  // ═══ EVALUAREA COMPETENȚELOR ═══
  { content: "[PSE] Competenta = cunoastere + abilitati + atitudini aplicate in context. Nu e suficient sa stii (cunoastere) sau sa poti (abilitati) — trebuie sa vrei si sa faci (atitudini + actiune). Evaluarea trebuie sa masoare performanta in context real, nu doar cunoastere declarativa (teste).", tags: ["competenta", "evaluare", "model"], confidence: 0.90 },
  { content: "[PSE] Assessment center: metoda complexa de evaluare — simulari, studii de caz, exercitii de grup, interviuri structurate. Predictivitate ridicata pentru performanta in rol. Cost mare dar ROI ridicat pentru selectie si dezvoltare la nivel managerial.", tags: ["assessment-center", "evaluare", "selectie"], confidence: 0.85 },

  // ═══ CONEXIUNE CÂMP ═══
  { content: "[PSE] Conexiune Hawkins — educatia: sub 200 (Forta), invatarea vine din frica de pedeapsa sau dorinta de recompensa — superficiala. Peste 200 (Putere), invatarea vine din curiozitate si sens — profunda si durabila. Invatarea transformativa (Mezirow) = trecerea de la un nivel de constiinta la altul pe scala Hawkins.", tags: ["hawkins", "conexiune-camp", "transformare"], confidence: 0.85 },
  { content: "[PSE] Rolul PSE in ecosistemul JobGrade: calibreaza PROCESELE DE INVATARE la nivel organizational. Cum se face onboarding-ul, cum se livreaza training-ul, cum se evalueaza competentele, cum se faciliteaza dezvoltarea — toate trebuie aliniate cu principiile stiintelor educatiei si cu BINELE.", tags: ["rol", "ecosistem", "jobgrade"], confidence: 0.90 },
]

async function main() {
  // Seed Hawkins KB first
  const hawkins = await prisma.kBEntry.findMany({
    where: { agentRole: "PSYCHOLINGUIST", tags: { has: "hawkins" } },
    select: { content: true, tags: true, confidence: true },
  })
  let created = 0
  for (const e of hawkins) {
    try {
      await prisma.kBEntry.create({
        data: {
          agentRole: "PSE", kbType: "METHODOLOGY", content: e.content,
          source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
          tags: e.tags, usageCount: 0, validatedAt: new Date(),
        },
      })
      created++
    } catch {}
  }

  // Seed domain-specific
  for (const e of entries) {
    try {
      await prisma.kBEntry.create({
        data: {
          agentRole: "PSE", kbType: "METHODOLOGY", content: e.content,
          source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
          tags: [...e.tags, "stiintele-educatiei", "field-knowledge"],
          usageCount: 0, validatedAt: new Date(),
        },
      })
      created++
    } catch {}
  }

  const total = await prisma.kBEntry.count({ where: { agentRole: "PSE", status: "PERMANENT" } })
  console.log(`PSE KB seeded: +${created} entries | Total: ${total}`)
  await prisma.$disconnect()
}
main()
