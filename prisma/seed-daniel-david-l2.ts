/**
 * seed-daniel-david-l2.ts — Infuzare KB reală cu cunoaștere din
 * "Psihologia poporului român" (Daniel David, 2015)
 *
 * Distribuție per consilier L2, pe domeniul fiecăruia:
 *   PSYCHOLINGUIST — pattern-uri comunicare, registru, adaptare limbaj
 *   SOC            — dimensiuni culturale, norme sociale, profil colectivist
 *   SCA            — biasuri cognitive, distorsiuni, catastrofizare, Umbra culturală
 *   PPA            — profil emoțional, auto-eficacitate, motivație, wellbeing
 *   PSE            — stiluri învățare, andragogie în context RO, transfer cunoaștere
 *   PPMO           — cultura organizațională RO, distanță putere, relații ierarhice
 *   SAFETY_MONITOR — vulnerabilități psihologice, praguri criză în context cultural RO
 *
 * Usage: npx tsx prisma/seed-daniel-david-l2.ts
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

const SOURCE = "EXPERT_CURATED" as const
const KB_TYPE = "PERMANENT" as const
const STATUS = "PERMANENT" as const

const entries: KBEntry[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // PSYCHOLINGUIST — Pattern-uri comunicare, registru, adaptare limbaj RO
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Daniel David] Comunicarea românească e predominant indirectă — mesajul important e sugerat, nu spus frontal. Contextul contează mai mult decât conținutul explicit. Într-o interacțiune B2B, construiește cadrul (context, relație, empatie) ÎNAINTE de a livra mesajul principal. Directitatea excesivă e percepută ca lipsă de respect sau agresivitate.",
    tags: ["daniel-david", "comunicare", "indirectitate", "context-RO"],
    confidence: 0.90,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Daniel David] Formalitatea în comunicarea RO e un gradient dinamic: primul contact = formal-profesional (Dumneavoastră, formule de politețe, titlu). După stabilirea încrederii (2-3 interacțiuni), tonul se relaxează rapid spre semi-formal. Trecerea la TU semnalează acceptare, nu lipsă de respect. PSYCHOLINGUIST trebuie să detecteze acest moment și să îl semnaleze celorlalți agenți.",
    tags: ["daniel-david", "formalitate", "gradient", "registru"],
    confidence: 0.88,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Daniel David] Umorul auto-deprecativ (nu despre client!) este semn de inteligență și accesibilitate în cultura RO. 'Suntem și noi de-al vostru' — dezarmează, construiește raport, reduce distanța percepută. Dar profesionalismul rămâne dominant — umorul e condiment, nu fel principal. Excesul de seriozitate e suspectat ca rigiditate instituțională.",
    tags: ["daniel-david", "umor", "raport", "accesibilitate"],
    confidence: 0.85,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Daniel David] Storytelling-ul e modul natural de persuasiune în cultura RO. Românii răspund puternic la povești concrete și exemple din viața reală. Abstractul e suspectat ('teorie'), concretul e de încredere ('s-a întâmplat la firma X'). Calibrare: în loc de 'algoritmul nostru optimizează evaluarea', spune 'o companie din Cluj cu 200 de angajați a redus diferențele salariale cu 23% în 3 luni'.",
    tags: ["daniel-david", "storytelling", "persuasiune", "concret"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Daniel David] Dezirabilitatea socială e ridicată în România — dorința de a părea bine, de a fi aprobat, teama de judecată publică. Implicație pentru comunicare: NU pune clientul în poziție de vulnerabilitate. NU cere testimoniale care expun probleme interne. Mesajul corect: 'Datele tale sunt ale tale. Nimeni nu vede ce nu vrei să fie văzut.' Confidențialitatea e argument de vânzare mai puternic decât features.",
    tags: ["daniel-david", "dezirabilitate-sociala", "confidentialitate", "comunicare"],
    confidence: 0.88,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Daniel David] Code-switching RO-EN în context corporate: frecvent în IT și multinaționale, rar în IMM-uri românești. Markeri de detectare: dacă clientul folosește termeni EN ('deadline', 'KPI', 'benchmark') natural = profil multinațional, comunicare semi-EN acceptabilă. Dacă folosește exclusiv RO = profil local, orice termen EN necesar se explică. Calibrare greșită → pierdere credibilitate ('vorbește ca un consultant străin').",
    tags: ["daniel-david", "code-switching", "RO-EN", "profil-client"],
    confidence: 0.85,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Daniel David] Recunoașterea scepticismului e mai eficientă decât ignorarea lui. Formula: 'Știm că ai mai auzit promisiuni de AI care rezolvă tot. Noi nu promitem magie — promitem metodologie.' Acest pattern (recunoaște + diferențiază) funcționează pentru că validează experiența clientului în loc să o invalideze. În cultura RO, a fi auzit = a fi respectat.",
    tags: ["daniel-david", "scepticism", "validare", "pattern-comunicare"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOC — Dimensiuni culturale, norme sociale, profil colectivist
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SOC",
    content: "[Daniel David / Hofstede] România: colectivism moderat (scor 30 individualism). Grupul de referință (familie, echipă, comunitate) e important, dar aspirațiile individualiste cresc în urban. Comunicarea B2B trebuie să echilibreze: apelul la grup ('compania ta', 'echipa voastră', 'colegii tăi') cu empowerment individual ('tu decizi', 'tu transformi'). Exces de individualism = perceput ca egoism. Exces de colectivism = perceput ca lipsă de inițiativă.",
    tags: ["daniel-david", "hofstede", "colectivism", "individualism"],
    confidence: 0.92,
  },
  {
    agentRole: "SOC",
    content: "[Daniel David / Hofstede] Distanța mare față de putere în România (scor ~90). Respectul pentru autoritate e înrădăcinat, dar coexistă cu neîncredere profundă în instituții (stat, justiție, administrație). Paradox funcțional: românul respectă autoritatea expertă dar suspectează autoritatea birocratică. JobGrade trebuie să se poziționeze ca EXPERT DE ÎNCREDERE, nu ca instituție. Comunicarea e personală, nu corporatistă.",
    tags: ["daniel-david", "hofstede", "distanta-putere", "autoritate"],
    confidence: 0.90,
  },
  {
    agentRole: "SOC",
    content: "[Daniel David / Hofstede] Evitarea incertitudinii foarte ridicată în România (scor ~90). Anxietate în fața necunoscutului, preferință pentru reguli clare, teamă de risc. Implicație directă: oferă CERTITUDINE — pași clari, garanții, conformitate, securitate. 'Vei ști exact ce faci la fiecare pas' e mesaj mai puternic decât 'descoperă posibilitățile'. Ambiguitatea e anxiogenă, nu stimulantă.",
    tags: ["daniel-david", "hofstede", "incertitudine", "certitudine"],
    confidence: 0.92,
  },
  {
    agentRole: "SOC",
    content: "[Daniel David / Hofstede] Orientare predominant pe termen scurt în România (scor ~52). Pragmatism, rezultate imediate, scepticism față de planuri pe 10 ani. Comunicare eficientă: beneficii imediate + deadline-uri concrete. 'Rezultate în 24h', 'Conformitate din prima zi' — nu 'viziune pe 5 ani'. Planurile de lungă durată se comunică doar după ce credibilitatea pe termen scurt e demonstrată.",
    tags: ["daniel-david", "hofstede", "termen-scurt", "pragmatism"],
    confidence: 0.88,
  },
  {
    agentRole: "SOC",
    content: "[Daniel David] Încrederea în România vine prin recomandare personală (rețea de încredere), nu prin publicitate. Word-of-mouth > orice campanie. Testimonialele și referral-urile sunt mai puternice decât orice banner. Construim încredere prin relație, nu prin reclamă. Decizia de cumpărare e influențată mai mult de relație decât de features: 'Cumpăr de la cine am încredere.'",
    tags: ["daniel-david", "incredere", "word-of-mouth", "retea"],
    confidence: 0.90,
  },
  {
    agentRole: "SOC",
    content: "[Daniel David] Sensibilitate extremă la nedreptate și la tratament inechitabil — 'De ce EL da și EU nu?' Echitatea e valoare profundă românească, nu doar principiu HR. JobGrade rezolvă exact asta — evaluare obiectivă, criterii identice, fără favoritism. Mesajul 'Fiecare angajat evaluat cu aceleași criterii. Fără favoritism.' rezonează profund cultural.",
    tags: ["daniel-david", "echitate", "nedreptate", "valoare-culturala"],
    confidence: 0.92,
  },
  {
    agentRole: "SOC",
    content: "[Daniel David] Masculinitate moderată spre scăzut (scor ~42 Hofstede). Competiția e prezentă dar moderată de valorile relaționale. Succesul se măsoară și prin relații, nu doar prin bani. Nu vindem doar ROI — vindem și relația, încrederea, echitatea. 'Nu doar numere corecte — oameni tratați corect' rezonează mai bine decât 'maximizează eficiența HR'.",
    tags: ["daniel-david", "hofstede", "masculinitate", "relational"],
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCA — Biasuri cognitive, distorsiuni, catastrofizare, Umbra culturală
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SCA",
    content: "[Daniel David] Catastrofizare ridicată la români — tendința de a anticipa cel mai rău scenariu. 'Ce se întâmplă dacă nu merge?' Aceasta NU trebuie exploatată (ar fi UMBRA — manipulare prin frică). Trebuie RECUNOSCUTĂ: 'Înțelegem că e mult de procesat' + oferită rețea de siguranță: 'De aceea am construit pași simpli.' Comunicarea fear-based exploatează catastrofizarea — comunicarea values-based o calmează.",
    tags: ["daniel-david", "catastrofizare", "bias", "umbra-culturala"],
    confidence: 0.92,
  },
  {
    agentRole: "SCA",
    content: "[Daniel David] Locus extern al controlului — tendință românească de a atribui rezultatele factorilor externi: 'Depinde de legi', 'Depinde de piață', 'Nu depinde de mine.' Distorsiune cognitivă activă: NU i se vorbește ca și cum are control total, NU se spune 'Doar depinde de tine.' Se RECUNOSC constrângerile externe, apoi se arată UNDE ARE CONTROL: 'Legea se schimbă, da. Dar cum te pregătești — asta depinde de tine. Noi te ajutăm.'",
    tags: ["daniel-david", "locus-extern", "control", "distorsiune"],
    confidence: 0.90,
  },
  {
    agentRole: "SCA",
    content: "[Daniel David] Dezirabilitatea socială crescută = dorința de a părea bine, teamă de judecată. Umbra acesteia: evitarea feedback-ului negativ, ascunderea problemelor, raportare cosmetizată. În evaluarea posturilor: evaluatorii pot scora mai uniform (central tendency bias) de teamă să nu fie percepuți ca 'răi' sau 'nedrepți'. SCA trebuie să detecteze: distribuții anormal de aglomerate în jurul mediei = posibil bias dezirabilitate socială.",
    tags: ["daniel-david", "dezirabilitate-sociala", "bias-evaluare", "central-tendency"],
    confidence: 0.90,
  },
  {
    agentRole: "SCA",
    content: "[Daniel David] Auto-eficacitate scăzută la nivel de grup — 'Noi nu putem', 'La noi nu merge', 'România e diferită.' Aceasta NU e lene, e distorsiune cognitivă cu rădăcini istorice (experiența eșecurilor colective repetate). NU se invalidează experiența lor. NU se spune 'E simplu' (invalidează dificultatea percepută). Se validează dificultatea, apoi se arată că soluția e SPECIFICĂ contextului lor: 'Am construit JobGrade pentru realitățile din România, nu am tradus o soluție vestică.'",
    tags: ["daniel-david", "auto-eficacitate", "distorsiune", "validare"],
    confidence: 0.92,
  },
  {
    agentRole: "SCA",
    content: "[Daniel David] Scepticism funcțional + speranță persistentă — coexistă. 'Am mai auzit promisiuni' + 'Poate de data asta e diferit.' Umbra: companiile care exploatează speranța fără a livra (scam-ul HR tech). Anti-Umbra noastră: recunoaștem scepticismul direct, nu îl ocolim. Nu suprapromitem. Demonstrăm prin fapte, nu prin declarații. Credibilitatea se construiește prin rezultate mici livrate, nu prin viziuni mari promise.",
    tags: ["daniel-david", "scepticism", "speranta", "credibilitate"],
    confidence: 0.88,
  },
  {
    agentRole: "SCA",
    content: "[Daniel David] Umbra culturală organizațională românească: diferența dintre valorile declarate și cele practicate. Companiile RO declară 'oamenii sunt cea mai importantă resursă' dar practică evaluări subiective, favoritisme, opacitate salarială. JobGrade expune această Umbra constructiv: evaluare obiectivă = oglinda care arată realitatea vs. discursul. SCA monitorizează dacă și noi cădem în aceeași Umbra (declarăm BINE, practicăm altceva).",
    tags: ["daniel-david", "umbra-organizationala", "declarativ-vs-practic", "auto-monitorizare"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPA — Profil emoțional, auto-eficacitate, motivație, wellbeing
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PPA",
    content: "[Daniel David] Auto-eficacitate scăzută la nivel de grup în România. Implicație pentru wellbeing organizațional: angajații români tind să subestimeze impactul propriilor acțiuni asupra organizației. Intervenție PPA: programe de strengths-spotting care arată concret ce POATE fiecare individ, bazat pe evidențe din evaluarea posturilor. Auto-eficacitatea crește prin experiențe de succes mici și repetate, nu prin discursuri motivaționale.",
    tags: ["daniel-david", "auto-eficacitate", "wellbeing", "strengths"],
    confidence: 0.88,
  },
  {
    agentRole: "PPA",
    content: "[Daniel David] Profilul emoțional românesc: coexistența fatalismului ('Așa a fost să fie') cu reziliența surprinzătoare ('Ne descurcăm noi cumva'). Descurcăreala (resourcefulness) e punct forte cultural autentic — nu trebuie patologizată ci canalizată. PPA reframing: 'descurcăreala ta e un punct forte real. Cu instrumente potrivite, devine și mai puternică.'",
    tags: ["daniel-david", "rezilienta", "descurcarela", "strengths-culturale"],
    confidence: 0.88,
  },
  {
    agentRole: "PPA",
    content: "[Daniel David] Motivația intrinsecă în context RO: relațiile și echitatea sunt motivatori mai puternici decât banii sau statusul. SDT aplicat: AUTONOMIA se construiește prin transparență (angajatul știe de ce e evaluat cu X, nu doar CÂT). COMPETENȚA crește când evaluarea e obiectivă (știe pe ce se bazează). RELAȚIILE se consolidează când procesul e perceput ca DREPT.",
    tags: ["daniel-david", "motivatie", "sdt", "echitate"],
    confidence: 0.88,
  },
  {
    agentRole: "PPA",
    content: "[Daniel David] Burnout-ul în cultura românească are o componentă specifică: sentimentul de nedreptate ('Muncesc la fel dar câștig mai puțin'). Studii arată că percepția inechității salariale e predictor mai puternic al burnout-ului decât volumul de muncă. JobGrade contribuie direct la prevenția burnout prin transparentizarea evaluării și reducerea percepției de nedreptate.",
    tags: ["daniel-david", "burnout", "inechitate", "preventie"],
    confidence: 0.85,
  },
  {
    agentRole: "PPA",
    content: "[Daniel David] Pragmatismul funcțional românesc: 'Merge?' e mai important decât 'E frumos?'. Rezultatele contează, nu estetica. Implicație PPA: intervențiile de wellbeing trebuie să fie PRACTICE, nu teoretice. Nu 'workshop de mindfulness' ci 'evaluarea posturilor corectă reduce conflictele salariale cu X%'. Wellbeing-ul se vinde prin efect concret, nu prin concept abstract.",
    tags: ["daniel-david", "pragmatism", "wellbeing-practic", "efect-concret"],
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PSE — Stiluri învățare, andragogie în context RO, transfer cunoaștere
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSE",
    content: "[Daniel David] Sistemul educațional RO produce un profil specific: memorare > înțelegere, teorie > practică, răspuns corect > gândire critică. Implicație pentru training-uri B2B: adulții români vin cu obișnuința de a fi 'învățați' (pasiv), nu de a 'învăța' (activ). Andragogia (Knowles) trebuie adaptată: tranziția de la pasivitate la participare activă se face GRADUAL, cu exerciții practice imediate, nu cu lecturi.",
    tags: ["daniel-david", "educatie", "andragogie", "stil-invatare"],
    confidence: 0.88,
  },
  {
    agentRole: "PSE",
    content: "[Daniel David] Transferul cunoașterii în context RO: adulții români învață mai bine din EXEMPLE CONCRETE și STUDII DE CAZ decât din principii abstracte. Bloom aplicat: nu începe cu teoria (nivelul 'amintire'), ci cu un exemplu practic (nivelul 'aplicare'), apoi extrage principiul (nivelul 'analiză'). Inversarea taxonomiei — de la practic la teoretic — funcționează mai bine cultural.",
    tags: ["daniel-david", "bloom", "transfer", "exemplu-concret"],
    confidence: 0.88,
  },
  {
    agentRole: "PSE",
    content: "[Daniel David] Rezistența la nou (evitare incertitudine ridicată) afectează adoptarea de instrumente noi. Onboarding-ul B2B trebuie să reducă anxietatea prin: (1) demonstrație live înainte de acces, (2) pași clari și numerotați ('Pasul 1 din 4'), (3) posibilitate de revenire ('poți modifica oricând'), (4) suport uman disponibil ('echipa noastră e la un click'). Fiecare pas reduce anxietatea = crește adoptarea.",
    tags: ["daniel-david", "onboarding", "anxietate", "adoptie"],
    confidence: 0.88,
  },
  {
    agentRole: "PSE",
    content: "[Daniel David] Distanța față de putere în învățare: românii nu contestă ușor expertul ('profesorul are dreptate'). Avantaj: recomandările platformei sunt acceptate cu mai puțină rezistență decât în culturile cu distanță mică. Pericol: dacă platforma greșește, utilizatorul nu corectează — acceptă. PSE trebuie să construiască mecanisme de feedback ușor ('Nu pare corect? Spune-ne') pentru a compensa deferanța culturală.",
    tags: ["daniel-david", "distanta-putere", "invatare", "feedback"],
    confidence: 0.85,
  },
  {
    agentRole: "PSE",
    content: "[Daniel David] Kirkpatrick Nivel 3 (transfer în practică) e provocarea majoră în RO. Training-ul e perceput ca 'eveniment' nu ca 'proces'. După training, revenire la obiceiuri vechi. Soluție PSE: micro-learning integrat în workflow (nu separat), nudge-uri periodice, reinforcement prin practică imediată. JobGrade poate integra micro-learning în fluxul de evaluare: 'De ce ai ales nivelul 3? Iată ce înseamnă concret.'",
    tags: ["daniel-david", "kirkpatrick", "transfer", "micro-learning"],
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPMO — Cultura organizațională RO, distanță putere, relații ierarhice
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PPMO",
    content: "[Daniel David] Cultura organizațională românească tipică: ierarhie rigidă, comunicare top-down, decizii centralizate la vârf, evitarea conflictului deschis, loialitate față de persoana (șeful) mai mult decât față de organizație. Acest profil înseamnă că introducerea evaluării obiective a posturilor poate fi percepută ca AMENINȚARE de către managerii care beneficiază de subiectivitate. PPMO trebuie să anticipeze rezistența.",
    tags: ["daniel-david", "cultura-organizationala", "ierarhie", "rezistenta"],
    confidence: 0.90,
  },
  {
    agentRole: "PPMO",
    content: "[Daniel David] Relația lider-echipă în România: paternalistă. Liderul e 'tatăl' echipei — protector dar și controlant. Evaluarea obiectivă reduce puterea discreționară a liderului. Strategie PPMO: poziționează evaluarea obiectivă ca INSTRUMENT AL LIDERULUI ('te ajută să demonstrezi că deciziile tale sunt corecte'), nu ca AMENINȚARE ('te verificăm'). Liderul trebuie să simtă că câștigă control, nu că pierde.",
    tags: ["daniel-david", "leadership", "paternalism", "pozitionare"],
    confidence: 0.88,
  },
  {
    agentRole: "PPMO",
    content: "[Daniel David] Dinamica echipelor multigeneraționale în RO: Gen X (45-60 ani) — loialitate, stabilitate, ierarhie respectată. Millennials (30-44 ani) — performanță, transparență, feedback frecvent. Gen Z (18-29 ani) — sens, flexibilitate, autenticitate. Evaluarea posturilor e percepută diferit: Gen X = amenințare ('se schimbă regulile'), Millennials = oportunitate ('în sfârșit obiectivitate'), Gen Z = așteptare ('de ce nu exista deja?'). Comunicarea trebuie calibrată per generație.",
    tags: ["daniel-david", "multigenerational", "perceptie", "calibrare"],
    confidence: 0.85,
  },
  {
    agentRole: "PPMO",
    content: "[Daniel David] Evitarea conflictului deschis în cultura organizațională RO. Conflictele se rezolvă 'pe sub masă', prin alianțe informale, nu prin confruntare directă. Implicație pentru evaluarea posturilor: dezacordurile în comitetul de evaluare nu se exprimă deschis — evaluatorii votează 'la mijloc' (central tendency) pentru a evita conflictul. Mecanismul de consens al JobGrade (3 etape, recalibrare, facilitator) e SPECIAL CONSTRUIT pentru această realitate.",
    tags: ["daniel-david", "conflict", "consens", "evaluare-posturi"],
    confidence: 0.90,
  },
  {
    agentRole: "PPMO",
    content: "[Daniel David] Neîncrederea instituțională se transferă și în interiorul organizațiilor: angajații nu au încredere că evaluarea va fi folosită corect. 'O să ne evalueze ca să ne dea afară.' PPMO trebuie să consilieze organizația-client: TRANSPARENȚA procesului e la fel de importantă ca procesul însuși. Angajații trebuie să vadă criteriile ÎNAINTE de evaluare, nu doar rezultatele DUPĂ.",
    tags: ["daniel-david", "neincredere", "transparenta", "proces"],
    confidence: 0.88,
  },
  {
    agentRole: "PPMO",
    content: "[Daniel David] Relația cu munca în România: pragmatism funcțional. Munca e necesitate, nu identitate (diferit de cultura anglo-saxonă). 'Trăiesc ca să trăiesc, muncesc ca să pot trăi.' Implicație: beneficiile JobGrade se comunică în termeni de EFECT CONCRET asupra vieții ('salarii corecte = angajați care nu pleacă = echipă stabilă'), nu în termeni de 'excelență organizațională' (concept abstract, suspiciat).",
    tags: ["daniel-david", "relatie-munca", "pragmatism", "comunicare-efect"],
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY_MONITOR — Vulnerabilități psihologice, praguri criză, context RO
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SAFETY_MONITOR",
    content: "[Daniel David] Catastrofizarea ridicată în cultura RO înseamnă că pragul de activare a anxietății e mai scăzut. Mesaje care în alte culturi sunt informative (ex: 'Directiva EU schimbă regulile') pot declanșa răspunsuri disproporționate în context RO (panică, blocaj decizional). SAFETY_MONITOR trebuie să calibreze nivelul alertă: MODERAT în loc de RIDICAT pentru situații care în alt context cultural ar fi neutre.",
    tags: ["daniel-david", "catastrofizare", "prag-alerta", "calibrare"],
    confidence: 0.88,
  },
  {
    agentRole: "SAFETY_MONITOR",
    content: "[Daniel David] Semnale de criză în context cultural RO: pasivitatea bruscă ('Nu mai contează') e semnal mai puternic decât agitația. Cultura suportă mai mult exprimarea rezignării decât a furiei. Un client care trece de la implicare activă la tăcere/scurtare răspunsuri = posibil semnal de criză, nu 'a rezolvat problema'. SAFETY_MONITOR trebuie să inverseze prioritatea: tăcerea e mai îngrijorătoare decât protestul.",
    tags: ["daniel-david", "semnal-criza", "pasivitate", "tacere"],
    confidence: 0.85,
  },
  {
    agentRole: "SAFETY_MONITOR",
    content: "[Daniel David] Stigma sănătății mintale rămâne ridicată în România. Un client în dificultate NU va cere ajutor direct. Nu va spune 'Am nevoie de suport psihologic.' Va spune 'Sunt obosit', 'Nu mai am chef', 'E prea mult.' SAFETY_MONITOR trebuie să detecteze limbajul indirect al distresului, nu să aștepte cereri explicite de ajutor. Exit-ul elegant trebuie să nu eticheteze ('Nu e nimic rău, te înțelegem').",
    tags: ["daniel-david", "stigma", "sanatate-mintala", "detectare-indirecta"],
    confidence: 0.88,
  },
]

// ── Seed Execution ──────────────────────────────────────────────────────────

async function seedDanielDavid() {
  console.log(`\n📚 Seed Daniel David L2 — ${entries.length} entries pentru ${new Set(entries.map(e => e.agentRole)).size} consilieri\n`)

  let created = 0
  let skipped = 0

  for (const entry of entries) {
    try {
      // Check for duplicate (same agent + similar content)
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
      process.stdout.write(`  ✓ ${entry.agentRole}: ${entry.content.substring(15, 60)}...\n`)
    } catch (err: any) {
      console.error(`  ✗ ${entry.agentRole}: ${err.message}`)
    }
  }

  console.log(`\n✅ Daniel David L2 seed complet: ${created} create, ${skipped} skip (duplicate)\n`)

  // Summary per agent
  const summary = new Map<string, number>()
  for (const e of entries) {
    summary.set(e.agentRole, (summary.get(e.agentRole) || 0) + 1)
  }
  for (const [role, count] of summary) {
    console.log(`  ${role}: ${count} entries`)
  }

  await prisma.$disconnect()
}

seedDanielDavid().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
