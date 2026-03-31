import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const entries = [
  // FUNDAMENTE
  { content: "[PPA] Psihologia pozitiva (Martin Seligman, 1998) e studiul stiintific al ceea ce face viata demna de trait. Nu e gandire pozitiva naiva — e cercetare riguroasa a conditiilor care permit indivizilor si comunitatilor sa prospereze (flourish). Complementara psihologiei clinice: nu doar repara ce e stricat ci cultiva ce e bun.", tags: ["fundament", "seligman", "definitie"], confidence: 0.95 },
  { content: "[PPA] Cele 3 vieti bune (Seligman): (1) Pleasant Life — emotii pozitive, savurare, (2) Engaged Life — stari de flow, utilizarea punctelor forte, (3) Meaningful Life — serviciu catre ceva mai mare decat sine. Cel mai satisfacator e combinatia celor 3.", tags: ["fundament", "seligman", "viata-buna"], confidence: 0.90 },
  { content: "[PPA] PERMA-V (versiunea extinsa): Positive Emotion, Engagement, Relationships, Meaning, Accomplishment + Vitality. Vitality (sanatate fizica, energie, somn, nutritie) e fundatia pe care se construiesc celelalte.", tags: ["perma", "seligman", "model"], confidence: 0.90 },

  // CHARACTER STRENGTHS
  { content: "[PPA] VIA Character Strengths (Peterson & Seligman, 2004): 24 de puncte forte universale grupate in 6 virtuti — Intelepciune, Curaj, Umanitate, Dreptate, Temperanta, Transcendenta. Fiecare persoana are 3-7 puncte forte definitorii (signature strengths).", tags: ["via", "strengths", "peterson"], confidence: 0.95 },
  { content: "[PPA] Signature Strengths: cand le folosesti zilnic — energie, sens, autenticitate. Cand nu — apatie, frustrare, dezangajare. Rolul organizatiei: creeaza contexte in care oamenii isi pot exercita punctele forte.", tags: ["via", "signature-strengths"], confidence: 0.90 },
  { content: "[PPA] Strengths-spotting: indicatori — energie vizibila, invatare rapida, performanta fara efort vizibil, pierderea notiunii timpului (flow), declaratii must (trebuie sa fac asta). Instrument esential pentru HR.", tags: ["via", "strengths-spotting", "HR"], confidence: 0.85 },

  // FLOW
  { content: "[PPA] Flow (Csikszentmihalyi, 1990): 8 conditii — provocare echilibrata cu abilitatile, obiective clare, feedback imediat, concentrare completa, pierderea auto-constiintei, distorsiunea timpului, sens de control, activitate autotelica. Designul postului poate facilita sau bloca flow-ul.", tags: ["flow", "csikszentmihalyi"], confidence: 0.90 },
  { content: "[PPA] Flow la locul de munca: blocaje — intreruperi constante, sarcini prea usoare (bore-out) sau grele (burn-out), lipsa autonomiei, feedback absent. Solutii: time blocking, job crafting, obiective clare, feedback continuu.", tags: ["flow", "workplace", "solutii"], confidence: 0.85 },

  // REZILIENTA
  { content: "[PPA] Rezilienta nu e trasatura fixa — e proces. Penn Resilience Program (Seligman & Reivich): 7 abilitati — analiza cauzala, controlul impulsurilor, optimism realist, auto-eficacitate, empatie, reaching out, detectarea capcanelor gandirii.", tags: ["rezilienta", "penn"], confidence: 0.90 },
  { content: "[PPA] Post-Traumatic Growth (Tedeschi & Calhoun): dupa adversitate, nu doar revenire ci CRESTERE. 5 domenii: relatii mai profunde, noi posibilitati, putere personala crescuta, apreciere mai mare a vietii, schimbare spirituala. Nu e automatica — necesita procesare activa.", tags: ["rezilienta", "ptg", "crestere"], confidence: 0.85 },

  // SDT
  { content: "[PPA] SDT (Deci & Ryan, 2000): 3 nevoi psihologice universale — AUTONOMIE (simt ca aleg), COMPETENTA (simt ca pot), RELATII (simt ca apartin). Cand organizatia satisface toate 3: motivatie intrinseca, angajament. Cand le frustreaza: demotivare, cynicism, burnout.", tags: ["sdt", "deci-ryan", "motivatie"], confidence: 0.95 },
  { content: "[PPA] Continuum-ul motivatiei (SDT): Amotivatie → Externa → Introjectata → Identificata → Integrata → Intrinseca. JobGrade contribuie: evaluarea corecta → competenta perceputa → motivatie mai internalizata.", tags: ["sdt", "motivatie", "continuum"], confidence: 0.85 },

  // APPRECIATIVE INQUIRY
  { content: "[PPA] Appreciative Inquiry (Cooperrider): schimbare organizationala care porneste de la ce functioneaza bine. Ciclul 4D: Discovery (ce e cel mai bun?), Dream (ce am putea fi?), Design (cum construim?), Destiny (cum sustinem?). Alternativa la abordarea deficit-focused.", tags: ["appreciative-inquiry", "cooperrider"], confidence: 0.90 },
  { content: "[PPA] Ratio pozitiv/negativ in echipe performante: ~3:1 pana la 6:1. Sub 3:1 disfunctional. Peste 11:1 toxic positivity. Nu doar pozitivitate ci balanta sanatoasa cu autenticitate.", tags: ["ratio", "echipe", "performanta"], confidence: 0.85 },

  // BROADEN-AND-BUILD
  { content: "[PPA] Broaden-and-Build (Fredrickson, 2001): emotiile pozitive LARGESC repertoriul de gandire-actiune si CONSTRUIESC resurse durabile. Bucuria → creativitate. Interes → explorare. Serenitate → integrare. Emotiile negative contracta, pozitive expandeaza.", tags: ["broaden-build", "fredrickson"], confidence: 0.90 },

  // GRATITUDINE, MINDSET, PSYCAP
  { content: "[PPA] Gratitudinea (Emmons): jurnal de gratitudine (3 lucruri bune/zi) → crestere wellbeing 25% in 10 saptamani. Gratitudinea organizationala: recunoastere publica, multumire specifica, celebrarea progresului.", tags: ["gratitudine", "emmons"], confidence: 0.85 },
  { content: "[PPA] Growth Mindset (Dweck): credinta ca abilitatile se dezvolta prin efort. Provocarile sunt oportunitati, esecul e feedback. Organizatiile cu growth mindset: inovatie, invatare din greseli, rezilienta.", tags: ["mindset", "dweck", "growth"], confidence: 0.90 },
  { content: "[PPA] PsyCap (Luthans, 2007): Capital Psihologic = HERO — Hope, Efficacy, Resilience, Optimism. Prezice performanta peste IQ si personalitate. Se poate dezvolta prin interventii scurte.", tags: ["psycap", "luthans", "hero"], confidence: 0.90 },

  // APLICARE ORGANIZATIONALA
  { content: "[PPA] Positive Organizational Scholarship (Cameron & Spreitzer): virtuozitate organizationala, energie relationala, sens colectiv. Organizatiile care prospera genereaza heliotropic effect (atractie naturala spre lumina). Legatura cu CAMPUL: organizatia atrage ce e la nivelul sau de constiinta.", tags: ["pos", "cameron", "organizatii"], confidence: 0.85 },
  { content: "[PPA] Job Crafting (Wrzesniewski & Dutton): angajatii isi redesigneaza munca — task crafting, relational crafting, cognitive crafting. Nu asteapta de la organizatie — iau initiativa. Rolul HR: creeaza spatiul pentru job crafting.", tags: ["job-crafting", "wrzesniewski"], confidence: 0.85 },
  { content: "[PPA] Psychological Safety (Edmondson): membrii echipei pot lua riscuri interpersonale fara consecinte negative. Pot pune intrebari, admite greseli, propune idei. Google Project Aristotle: psychological safety = factorul #1 al echipelor performante.", tags: ["psychological-safety", "edmondson"], confidence: 0.90 },
  { content: "[PPA] Interventii pozitive validate: (1) Jurnal gratitudine, (2) Best Possible Self, (3) Acts of Kindness, (4) Savoring, (5) Strengths date, (6) Three Good Things. Toate cu effect size moderat spre mare.", tags: ["interventii", "validate", "practica"], confidence: 0.90 },

  // CONEXIUNE CAMP
  { content: "[PPA] Conexiune psihologie pozitiva — scala Hawkins: Gratitudinea ~350, Flow ~400-500, Compasiunea ~500, Bucuria autentica ~540. Toate interventiile de psihologie pozitiva ridica nivelul de constiinta PESTE 200. E stiinta care operationalizeaza trecerea de la Forta la Putere.", tags: ["hawkins", "calibrare", "conexiune-camp"], confidence: 0.85 },
  { content: "[PPA] Psihologia pozitiva si Umbra: pozitivitatea toxica e o forma de Umbra — suprimarea emotiilor negative sub masca pozitivitatii. Psihologia pozitiva autentica INCLUDE emotiile negative — le proceseaza, le integreaza, le transcende. Nu le neaga. SCA detecteaza toxic positivity, PPA cultiva pozitivitate autentica.", tags: ["umbra", "toxic-positivity", "autenticitate"], confidence: 0.90 },
  { content: "[PPA] Rolul PPA in ecosistemul JobGrade: nu doar identificam ce e bine — CULTIVAM ce e bine si folositor. Prin instrumente validate stiintific, cream conditiile ca binele sa creasca organic in organizatii. SCA vede Umbra, PPA vede Lumina. Impreuna — harta completa.", tags: ["rol", "ecosistem", "jobgrade", "cultivare"], confidence: 0.90 },
]

async function main() {
  let created = 0
  for (const e of entries) {
    try {
      await prisma.kBEntry.create({
        data: {
          agentRole: "PPA", kbType: "METHODOLOGY", content: e.content,
          source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
          tags: [...e.tags, "positive-psychology", "field-knowledge"],
          usageCount: 0, validatedAt: new Date(),
        },
      })
      created++
    } catch { /* duplicate */ }
  }
  const total = await prisma.kBEntry.count({ where: { agentRole: "PPA", status: "PERMANENT" } })
  console.log(`PPA KB enriched: +${created} entries | Total: ${total}`)
  await prisma.$disconnect()
}
main()
