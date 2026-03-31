import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const entries = [
  // ═══ PSIHANALIZA CLASICĂ (FREUD) ═══
  { content: "[PTA] Modelul structural Freud: Id (pulsiuni, principiul placerii), Ego (mediator, principiul realitatii), Superego (constiinta morala, idealul). In organizatii: angajatul oscileaza intre dorinte (Id — salariu mare, putere), realitate (Ego — ce e posibil), si norme (Superego — ce e corect). Conflictul intern produce anxietate si mecanisme de aparare.", tags: ["freud", "structural", "id-ego-superego"], confidence: 0.90 },
  { content: "[PTA] Mecanisme de aparare (Anna Freud): refulare (uit), proiectie (atribui altora), rationalizare (justific), deplasare (redirectionez), regresie (revin la comportament imatur), negare, sublimarea (redirectionez constructiv). In context HR: managerul care 'rationalizeaza' concedierea ca 'optimizare'. Angajatul care 'proiecteaza' propria incompetenta pe colegi.", tags: ["freud", "mecanisme-aparare", "HR"], confidence: 0.90 },
  { content: "[PTA] Transferul (Freud): clientul proiecteaza pe terapeut relatii din trecut. In context organizational: angajatul trateaza seful ca pe un parinte (autoritar sau protector). HR Directorul proiecteaza pe consultant frica de autoritate. Constientizarea transferului = moment de aha.", tags: ["freud", "transfer", "proiectie"], confidence: 0.85 },
  { content: "[PTA] Actele ratate (Freud): lapsusuri, uitari, greseli care reveleaza continut inconstient. In context HR: HR Directorul care uita mereu sa raspunda la evaluarile subordonatilor — posibil evitare inconstienta a conflictului. Intrebarea utila: 'Ce crezi ca te face sa amani asta?'", tags: ["freud", "acte-ratate", "inconstient"], confidence: 0.85 },

  // ═══ PSIHOLOGIA ANALITICĂ (JUNG) ═══
  { content: "[PTA] Arhetipurile (Jung): pattern-uri universale in inconstientul colectiv. Relevante in organizatii: Persona (masca sociala — rolul afisat), Umbra (ce ascundem — ceea ce negam in noi), Anima/Animus (parte feminina/masculina), Self (totalitatea — integrarea opuselor). Umbra organizationala = ce firma ascunde sub valori declarate.", tags: ["jung", "arhetipuri", "persona", "umbra"], confidence: 0.90 },
  { content: "[PTA] Individuatia (Jung): procesul de integrare a tuturor partilor psihicului — constient + inconstient, Persona + Umbra, rational + irrational. Scopul: devenirea Sinelui complet. In organizatii: liderul care isi integreaza Umbra (recunoaste slabiciunile) devine autentic. Liderul care o neaga devine rigid si fragil.", tags: ["jung", "individuatie", "self", "leadership"], confidence: 0.90 },
  { content: "[PTA] Tipurile psihologice (Jung — baza MBTI si Hermann): Extraversie/Introversie × Gandire/Sentiment × Senzatie/Intuitie × Judecata/Perceptie. Jung NU a creat MBTI — a descris tendinte, nu tipuri fixe. Relevant: fiecare om are o functie dominanta si una inferioara (Shadow function). Stresul activeaza functia inferioara.", tags: ["jung", "tipuri", "mbti", "hermann", "functii"], confidence: 0.90 },
  { content: "[PTA] Sincronicitatea (Jung): coincidente semnificative fara cauza, dar cu sens. In context organizational: cand mai multi oameni raporteaza independent aceeasi problema — nu e coincidenta, e pattern. Sentinel-ul nostru detecteaza asta. Jung ar numi-o sincronicitate — noi o numim convergenta semnalelor.", tags: ["jung", "sincronicitate", "sentinel", "pattern"], confidence: 0.85 },
  { content: "[PTA] Complexele (Jung): grupuri de idei/emotii inconstiente cu nucleu afectiv puternic. Complex de inferioritate, de putere, matern, patern. In organizatii: managerul cu complex de putere — micro-management obsesiv. Angajatul cu complex de inferioritate — evita promovarea. Intrebarea: 'Ce te opreste sa...' deschide accesul la complex.", tags: ["jung", "complexe", "inconstient", "HR"], confidence: 0.85 },

  // ═══ TERAPII COGNITIV-COMPORTAMENTALE (CBT) ═══
  { content: "[PTA] Modelul ABC (Ellis, REBT): Activating event → Beliefs → Consequences. Nu evenimentul produce emotia ci CREDINTA despre eveniment. In context HR: 'M-au trecut la evaluare sub colegi' (A) → 'Sunt incompetent' (B) → depresie, demotivare (C). Interventia: contestarea credintei (B) nu schimbarea evenimentului.", tags: ["cbt", "ellis", "abc", "credinte"], confidence: 0.95 },
  { content: "[PTA] Distorsiuni cognitive (Beck): ganduri automate negative care deformeaza realitatea. 15 tipuri: gandire totul-sau-nimic, suprageneralizare, filtru mental, descalificarea pozitivului, salt la concluzii, catastrofizare, minimizare, rationament emotional, etichetare, personalizare. In context HR: 'Niciodata nu voi fi promovat' (suprageneralizare).", tags: ["cbt", "beck", "distorsiuni", "ganduri-automate"], confidence: 0.95 },
  { content: "[PTA] Restructurarea cognitiva (Beck): identifici gandirea distorsionata → testezi dovezile pro/contra → formulezi gandire alternativa echilibrata. Nu gandire pozitiva — gandire REALISTA. In coaching organizational: ajuti clientul sa-si testeze presupunerile. 'Ce dovezi ai ca seful te va concedia?' vs 'Ce dovezi ai ca NU?'", tags: ["cbt", "restructurare", "coaching", "intrebari"], confidence: 0.90 },
  { content: "[PTA] Experimentele comportamentale (CBT): in loc sa dezbati credinta, o TESTEZI in realitate. 'Crezi ca daca dai feedback negativ, angajatul demisioneaza? Hai sa testam — da feedback la unul si vezi ce se intampla.' In organizatii: combate evitarea prin expunere graduala. Cel mai puternic instrument de schimbare.", tags: ["cbt", "experimente", "expunere", "schimbare"], confidence: 0.85 },
  { content: "[PTA] Terapia schemelor (Young): scheme maladaptive timpurii — pattern-uri profunde formate in copilarie care se reactiveaza in viata adulta. 18 scheme in 5 domenii: deconectare/rejectare, autonomie afectata, limite afectate, orientare spre altii, hiper-vigilenta/inhibitie. In HR: managerul cu schema abandonului — nu deleaga niciodata (frica de a pierde controlul).", tags: ["cbt", "scheme", "young", "pattern-uri"], confidence: 0.85 },

  // ═══ PSIHODINAMICĂ MODERNĂ ═══
  { content: "[PTA] Teoria atasamentului (Bowlby): tipuri de atasament — securizant, anxios, evitant, dezorganizat. Se transfera in relatiile profesionale. Manager securizant: da autonomie si suport. Manager anxios: verifica constant, micro-management. Manager evitant: distant, nu ofera feedback. Tipul de atasament e PREDICTIBIL din comportamentul observat.", tags: ["bowlby", "atasament", "management", "predictie"], confidence: 0.90 },
  { content: "[PTA] Relatiile de obiect (Winnicott, Klein): cum internalizezi relatiile timpurii si le reproduci. In organizatii: CEO-ul reproduce relatia cu parintele — daca a avut parinte autoritar, va fi autoritar; daca permisiv, va fi permisiv. Organizatia devine 'familia' proiectata. Constientizarea acestui pattern e primul pas spre schimbare.", tags: ["winnicott", "klein", "relatii-obiect", "organizatie"], confidence: 0.85 },

  // ═══ ALTE ABORDĂRI RELEVANTE ═══
  { content: "[PTA] Analiza tranzactionala (Berne): 3 stari ale Eului — Parinte (norme, critici), Adult (rational, prezent), Copil (emotii, creativitate). Tranzactiile intre oameni: complementare (Parinte→Copil), incrucisate (Adult→Adult dar raspuns Copil→Parinte), ulterioare (mesaj ascuns). In organizatii: seful care vorbeste din Parintele Critic, angajatul care raspunde din Copilul Adaptat = relatie disfunctionala.", tags: ["berne", "analiza-tranzactionala", "stari-eu"], confidence: 0.90 },
  { content: "[PTA] Gestalt (Perls): focalizare pe aici-si-acum, constientizare, responsabilitate personala. Ciclul contact: senzatie → constientizare → mobilizare → actiune → contact → retragere. Intreruperi ale ciclului = blocaje. In coaching: 'Ce simti ACUM cand vorbesti despre asta?' readuce din ruminare in prezent.", tags: ["gestalt", "perls", "constientizare", "prezent"], confidence: 0.85 },
  { content: "[PTA] Terapia focalizata pe solutii (de Shazer): nu analizezi problema — construiesti solutia. Intrebarea miracol: 'Daca maine, miraculos, problema ar fi rezolvata — ce ar fi diferit?' Scaling: 'Pe o scala de 1-10, unde esti?' Exceptii: 'Cand problema NU apare, ce e diferit?' In coaching organizational: extrem de eficient, orientat actiune.", tags: ["solutii", "de-shazer", "intrebarea-miracol", "coaching"], confidence: 0.90 },
  { content: "[PTA] Logoterapia (Frankl): omul e motivat primar de cautarea SENSULUI, nu de placere (Freud) sau putere (Adler). Chiar si in suferinta, sensul exista. In organizatii: angajatul care gaseste SENS in munca e mai rezistent la burnout decat cel bine platit dar fara sens. Intrebarea: 'Ce sens are pentru tine ceea ce faci?'", tags: ["frankl", "logoterapie", "sens", "burnout"], confidence: 0.90 },

  // ═══ APLICARE LA PROFILARE + ÎNTREBĂRI ═══
  { content: "[PTA] Intrebari de profilare din perspectiva terapeutica (NU facem terapie — folosim cunoasterea pt formulare intrebari): Din CBT: 'Ce ganduri iti vin cand te gandesti la X?' Din psihodinamica: 'Cum ai gestionat situatii similare in trecut?' Din Gestalt: 'Ce simti acum?' Din solutii: 'Daca problema ar disparea, ce ai face diferit?' Din logoterapie: 'Ce sens are asta pentru tine?'", tags: ["profilare", "intrebari", "aplicare", "metoda"], confidence: 0.90 },
  { content: "[PTA] Conexiune Hawkins: mecanismele de aparare (Freud) opereaza sub 200 — frica, refulare, proiectie. Restructurarea cognitiva (Beck) ridica la 250-400 — de la reactie automata la gandire deliberata. Individuatia (Jung) vizeaza 500+ — integrarea Umbrei, Sinele complet. Logoterapia (Frankl) — cautarea sensului = 400-500 (Ratiune→Iubire).", tags: ["hawkins", "conexiune-camp", "integrare"], confidence: 0.85 },
  { content: "[PTA] Rolul PTA in ecosistem: NU face terapie. Furnizeaza CUNOASTERE terapeutica celorlalti consultanti si agentilor client-facing. SCA foloseste cunoasterea pt maparea Umbrei (Jung). PSYCHOLINGUIST pt calibrarea limbajului (analiza tranzactionala). PPA pt integrarea pozitivului cu dificilul. HR_COUNSELOR pt formularea intrebarilor care deschid (CBT, solutii). Profiler pt profilare profunda.", tags: ["rol", "ecosistem", "nu-terapie", "cunoastere"], confidence: 0.90 },
]

async function main() {
  // Copy Hawkins KB
  const hawkins = await prisma.kBEntry.findMany({
    where: { agentRole: "PSYCHOLINGUIST", tags: { has: "hawkins" }, status: "PERMANENT" },
    select: { content: true, tags: true, confidence: true },
  })
  let created = 0
  for (const e of hawkins) {
    try {
      await prisma.kBEntry.create({
        data: {
          agentRole: "PTA", kbType: "METHODOLOGY", content: e.content,
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
          agentRole: "PTA", kbType: "METHODOLOGY", content: e.content,
          source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
          tags: [...e.tags, "psihologie-terapeutica", "field-knowledge"],
          usageCount: 0, validatedAt: new Date(),
        },
      })
      created++
    } catch {}
  }

  const total = await prisma.kBEntry.count({ where: { agentRole: "PTA", status: "PERMANENT" } })
  console.log(`PTA KB seeded: +${created} entries | Total: ${total}`)
  await prisma.$disconnect()
}
main()
