import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const entries = [
  // ═══ SOCIOLOGIE ═══
  { content: "[SOC] Structura sociala si stratificarea: societatile se organizeaza in straturi (clase, statusuri, roluri). In organizatii: ierarhia formala vs informala, puterea vizibila vs invizibila. Intelegerea structurii reale (nu doar organigramei) e esentiala pentru interventii eficiente.", tags: ["sociologie", "stratificare", "structura"], confidence: 0.90 },
  { content: "[SOC] Normele sociale: reguli nescrise care guverneaza comportamentul in grup. In organizatii: ce e ok si ce nu (dress code, ore suplimentare, cum vorbesti cu seful). Normele informale sunt mai puternice decat regulamentele formale. Cine le incalca e sanctionat social (excludere, barfa, sabotaj pasiv).", tags: ["sociologie", "norme", "informal"], confidence: 0.90 },
  { content: "[SOC] Socializarea organizationala (Van Maanen & Schein): procesul prin care noul venit invata normele, valorile, comportamentele acceptate. 6 dimensiuni: colectiva vs individuala, formala vs informala, secventiala vs aleatoare, fixa vs variabila, seriala vs disjunctiva, investitura vs devestitura.", tags: ["sociologie", "socializare", "onboarding"], confidence: 0.85 },
  { content: "[SOC] Tipologii culturale organizationale (Hofstede): 6 dimensiuni — distanta fata de putere, individualism vs colectivism, masculinitate vs feminitate, evitarea incertitudinii, orientare termen lung vs scurt, indulgenta vs restrictie. Romania: distanta mare fata de putere, colectivism moderat, evitare incertitudine mare.", tags: ["sociologie", "hofstede", "cultura", "romania"], confidence: 0.90 },
  { content: "[SOC] Capital social (Bourdieu, Putnam): retele de relatii care genereaza resurse. Bonding capital (legaturi puternice, grup inchis) vs Bridging capital (legaturi slabe, intre grupuri). Organizatiile cu bridging capital ridicat: inovatie, adaptabilitate. Cele cu doar bonding: coeziune dar insularitate.", tags: ["sociologie", "capital-social", "retele"], confidence: 0.85 },
  { content: "[SOC] Anomia (Durkheim): starea de lipsa de norme, dezorientare. In organizatii: apare in perioade de schimbare rapida, restructurari, fuziuni. Angajatii nu mai stiu ce se asteapta de la ei. Antidot: comunicare clara a noilor norme, MVV restabilit, leadership vizibil.", tags: ["sociologie", "anomie", "durkheim", "schimbare"], confidence: 0.85 },
  { content: "[SOC] Teoria conflictului (Marx, Weber, Dahrendorf): conflictul nu e disfunctional — e inerent oricarei organizatii cu resurse limitate si interese diferite. Conflictul constructiv produce inovatie. Conflictul distructiv produce fragmentare. Rolul managementului: canalizeaza conflictul, nu il suprima.", tags: ["sociologie", "conflict", "teorie"], confidence: 0.85 },
  { content: "[SOC] Mobilitatea sociala in organizatii: verticala (promovare/retrogradare), orizontala (transfer lateral), intergenerationala (copiii depasesc parintii). In companiile romanesti: mobilitatea e adesea bazata pe relatii (capital social) nu pe merit. JobGrade contribuie la meritocratizare prin evaluare obiectiva.", tags: ["sociologie", "mobilitate", "romania", "merit"], confidence: 0.85 },

  // ═══ PSIHOLOGIE SOCIALĂ ═══
  { content: "[SOC/PSoc] Influenta sociala (Cialdini): 6 principii — reciprocitate, angajament/consistenta, dovada sociala, autoritate, simpatie, raritate. Toate opereaza in organizatii: managerul foloseste autoritatea, echipa foloseste dovada sociala, HR foloseste reciprocitatea. Constientizarea lor previne manipularea.", tags: ["psihologie-sociala", "cialdini", "influenta"], confidence: 0.95 },
  { content: "[SOC/PSoc] Conformismul (Asch): indivizii se conformeaza opiniei grupului chiar cand e evident gresita. In organizatii: groupthink (Janis) — echipa decide prost pentru ca nimeni nu indrazneste sa contrazica. Antidot: avocatul diavolului deliberat, diverse perspectives, siguranta psihologica.", tags: ["psihologie-sociala", "conformism", "asch", "groupthink"], confidence: 0.95 },
  { content: "[SOC/PSoc] Obedienta fata de autoritate (Milgram): oamenii executa ordine chiar daunatoare cand vin de la autoritate perceputa. In organizatii: angajatii incalca etica la ordinul sefului. Prevenire: cod etic clar, canale de raportare anonima, cultura care permite sa spui NU.", tags: ["psihologie-sociala", "milgram", "obedienta", "autoritate"], confidence: 0.90 },
  { content: "[SOC/PSoc] Teoria identitatii sociale (Tajfel): oamenii se definesc prin apartenenta la grupuri (in-group vs out-group). In organizatii: departamentul meu vs al lor, noi vs management, vechi vs noi. Produce bias in-group (favorizare), prejudecata out-group. Solutie: obiective comune supraordonate.", tags: ["psihologie-sociala", "tajfel", "identitate", "grupuri"], confidence: 0.90 },
  { content: "[SOC/PSoc] Atribuirea (Heider, Kelley): cum explicam comportamentul altora. Eroarea fundamentala de atribuire: atribuim comportamentul altora caracterului lor (e lenes) dar al nostru circumstantelor (am avut o zi grea). In organizatii: managerii judeca angajatii pe caracter, angajatii se justifica prin context.", tags: ["psihologie-sociala", "atribuire", "eroare", "bias"], confidence: 0.90 },
  { content: "[SOC/PSoc] Disonanta cognitiva (Festinger): disconfortul cand actiunile contrazic convingerile. In organizatii: angajatul care stie ca firma nu respecta valorile declarate dar ramane — justifica (salariul e bun, nu gasesc altceva). Sau managerul care face compromisuri etice — rationalizeaza.", tags: ["psihologie-sociala", "festinger", "disonanta", "etica"], confidence: 0.90 },
  { content: "[SOC/PSoc] Stereotipuri si prejudecati (Allport): generalizari simpliste despre grupuri. In organizatii: gen (femeile nu pot fi lideri), varsta (tinerii nu au experienta, batranii nu invata), etnie. Prejudecatile implicite (incontstiente) afecteaza recrutarea, evaluarea, promovarea. Solutie: evaluare structurata, criterii obiective (JobGrade).", tags: ["psihologie-sociala", "stereotipuri", "prejudecati", "bias"], confidence: 0.90 },
  { content: "[SOC/PSoc] Efectul spectatorului (bystander effect, Darley & Latane): cu cat sunt mai multi martori, cu atat e mai putin probabil ca cineva sa intervina. In organizatii: toti vad problema dar nimeni nu actioneaza (responsabilitate difuza). Solutie: responsabilitate clara, designated person, cultura ownership.", tags: ["psihologie-sociala", "bystander", "responsabilitate"], confidence: 0.85 },
  { content: "[SOC/PSoc] Persuasiunea (Petty & Cacioppo, ELM): doua cai — centrala (argumente logice, pentru cei implicati) si periferica (cues superficiale, pentru cei neimplicati). In comunicarea HR: pentru manageri foloseste calea centrala (date, argumente). Pentru angajati noi: periferia poate fi mai eficienta (testimoniale, brand).", tags: ["psihologie-sociala", "persuasiune", "elm", "comunicare"], confidence: 0.85 },
  { content: "[SOC/PSoc] Dinamica grupurilor (Tuckman): forming (formare) → storming (conflict) → norming (normalizare) → performing (performanta) → adjourning (despartire). Fiecare etapa are nevoi diferite de leadership. In organizatii: echipele noi trec obligatoriu prin storming — nu e disfunctional, e necesar.", tags: ["psihologie-sociala", "tuckman", "echipe", "dinamica"], confidence: 0.90 },

  // ═══ APLICARE ORGANIZAȚIONALĂ ═══
  { content: "[SOC] Profilare socio-profesionala Romania: generatii active — Baby Boomers (valori traditionale, loialitate), Gen X (pragmatism, independenta), Millennials (sens, flexibilitate, feedback), Gen Z (digital native, diversitate, autenticitate). Fiecare generatie are alt contract psihologic cu organizatia.", tags: ["profil", "generatii", "romania", "HR"], confidence: 0.85 },
  { content: "[SOC] Contextul socio-cultural romanesc relevant HR: distanta mare fata de putere (seful decide, subordonatul executa), colectivism functional (rezolvam in grup dar nu ne expunem individual), evitare incertitudine (preferinta pentru reguli clare), economie duala (multinationala vs firmelet romanesti cu culturi foarte diferite).", tags: ["romania", "context", "cultural", "HR"], confidence: 0.90 },
  { content: "[SOC/PSoc] Conexiunea cu scala Hawkins: conformismul opereaza la Frica (100) — ma conformez ca sa nu fiu exclus. Obedienta la Frica/Dorinta (100-125) — execut ca sa nu pierd pozitia. Identitatea sociala la Mandrie (175) — grupul meu e superior. Trecerea peste 200: curajul de a gandii independent, de a spune NU, de a vedea beyond in-group.", tags: ["hawkins", "conexiune-camp", "conformism"], confidence: 0.85 },
  { content: "[SOC/PSoc] Rolul Psiho-Sociologului in echipa suport: intelege CONTEXTUL SOCIAL in care opereaza clientul. Un HR Director nu e doar un individ — e membru al unui board, manager al unei echipe, parte dintr-o cultura organizationala, dintr-o generatie, dintr-un context socio-economic. Interventiile noastre trebuie calibrate la toate aceste straturi.", tags: ["rol", "ecosistem", "calibrare", "context"], confidence: 0.90 },
]

async function main() {
  let created = 0
  for (const e of entries) {
    try {
      await prisma.kBEntry.create({
        data: {
          agentRole: "SOC", kbType: "METHODOLOGY", content: e.content,
          source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
          tags: [...e.tags, "psiho-sociologie", "field-knowledge"],
          usageCount: 0, validatedAt: new Date(),
        },
      })
      created++
    } catch { /* duplicate */ }
  }
  const total = await prisma.kBEntry.count({ where: { agentRole: "SOC", status: "PERMANENT" } })
  console.log(`SOC KB enriched: +${created} entries | Total: ${total}`)
  await prisma.$disconnect()
}
main()
