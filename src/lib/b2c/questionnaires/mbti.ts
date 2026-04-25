/**
 * Chestionar MBTI — Tipuri de personalitate
 *
 * 127 întrebări (Q17 are 3 sub-întrebări A/B/C)
 * 4 dichotomii: E/I, S/N, T/F, J/P
 *
 * Fiecare item are răspuns A sau B.
 * Fiecare răspuns dă 0-2 puncte pe una din cele 2 dimensiuni ale dichotomiei.
 *
 * Scor final: dimensiunea cu punctaj mai mare câștigă litera.
 * Intensitate factor = max(dim1, dim2)
 * Claritate = |dim1 - dim2| / (dim1 + dim2) * 100
 *
 * Mapare item → dichotomie (din etalon):
 *   E/I: 3,7,10,13,16,19,23,26,31,37,40,55,66,68,72,75,77,79,81,86,90
 *   S/N: 2,5,9,11,18,22,25,29,33,42,44,46,48,50,52,58,61,63,65,67,69,71,80,83,85,91
 *   T/F: 6,15,21,28,30,32,34,36,38,41,43,45,47,49,51,54,56,60,70,73,87,89,92,94
 *   J/P: 1,4,8,12,14,17,20,24,27,35,39,53,57,59,62,64,74,76,78,82,84,88,93,95
 *
 * Itemi fără scor (contextuali): 96-127 (Partea IV)
 */

import type {
  MBTIQuestion,
  MBTIDichotomy,
  MBTIAnswers,
  MBTIResult,
} from "./types"

// ── Mapare item → dichotomie ────────────────────────────────

const EI_ITEMS = [3,7,10,13,16,19,23,26,31,37,40,55,66,68,72,75,77,79,81,86,90]
const SN_ITEMS = [2,5,9,11,18,22,25,29,33,42,44,46,48,50,52,58,61,63,65,67,69,71,80,83,85,91]
const TF_ITEMS = [6,15,21,28,30,32,34,36,38,41,43,45,47,49,51,54,56,60,70,73,87,89,92,94]
const JP_ITEMS = [1,4,8,12,14,17,20,24,27,35,39,53,57,59,62,64,74,76,78,82,84,88,93,95]

function getDichotomy(id: number): MBTIDichotomy | null {
  if (EI_ITEMS.includes(id)) return "EI"
  if (SN_ITEMS.includes(id)) return "SN"
  if (TF_ITEMS.includes(id)) return "TF"
  if (JP_ITEMS.includes(id)) return "JP"
  return null // items 96-127 sunt contextuale
}

// ── Întrebările MBTI (95 itemi scorabili + 32 contextuali) ──

/**
 * Scorarea: pentru fiecare item, răspunsul A dă puncte pe prima dimensiune,
 * B dă puncte pe a doua. Punctaj standard = 2 (maxim per item).
 *
 * Scor total maxim per dichotomie:
 *   E/I: 21 items × 2 = 42 max per parte
 *   S/N: 26 items × 2 = 52
 *   T/F: 24 items × 2 = 48
 *   J/P: 24 items × 2 = 48
 */

// Partea I (Q1-Q18): Întrebări cu context
// Partea II (Q19-Q71): Perechi de cuvinte
// Partea III (Q72-Q95): Întrebări cu context
// Partea IV (Q96-Q127): Întrebări suplimentare (contextuali, fără scorare dichotomie)

interface MBTIItem {
  id: number
  text: string
  optionA: string
  optionB: string
  optionC?: string
}

export const MBTI_QUESTIONS: MBTIItem[] = [
  // ═══ PARTEA I (Q1-Q18) ═══
  { id: 1, text: "Când mergeți undeva pentru o zi:", optionA: "aveți tendința să planificați și să pregătiți dinainte ceea ce veți face", optionB: "preferați să vă orientați la fața locului" },
  { id: 2, text: "Dacă ați fi profesor, ați prefera să predați:", optionA: "cursuri teoretice", optionB: "cursuri practice" },
  { id: 3, text: "De obicei, sunteți o persoană:", optionA: "vorbareață, comunicativă", optionB: "mai degrabă tăcută și rezervată" },
  { id: 4, text: "Preferați:", optionA: "să vă pregătiți (întâlnirile, petrecerile etc.) cu mult timp înainte", optionB: "să lăsați lucrurile să curgă de la sine, bazându-vă pe inspirația de moment" },
  { id: 5, text: "De obicei, vă înțelegeți mai bine cu:", optionA: "oamenii imaginativi", optionB: "oamenii realiști" },
  { id: 6, text: "Cel mai adesea:", optionA: "lăsați inima să vă guverneze capul", optionB: "lăsați capul să vă guverneze inima" },
  { id: 7, text: "Când vă aflați într-un grup, de obicei preferați:", optionA: "să vă alăturați discuției colective", optionB: "să discutați separat cu câte o persoană" },
  { id: 8, text: "Aveți mai mult succes:", optionA: "când aveți de-a face cu o situație neașteptată și trebuie să hotărâți pe loc ce trebuie făcut", optionB: "când apar situații la care vă conformați unui plan de acțiune elaborat dinainte" },
  { id: 9, text: "Sunteți considerat, mai degrabă:", optionA: "o persoana practică", optionB: "o persoana ingenioasă, originală" },
  { id: 10, text: "Într-un grup mai mare, cel mai adesea este mai ușor:", optionA: "ca dumneavoastră să-i prezentați pe alții", optionB: "ca dumneavoastră să fiți cel prezentat" },
  { id: 11, text: "Admirați mai mult oamenii care sunt:", optionA: "destul de convenționali ca să mai fie și remarcați", optionB: "destul de originali ca să le mai pese dacă sunt remarcați" },
  { id: 12, text: "Faptul că trebuie să vă conformați unui program:", optionA: "vă atrage mai degrabă", optionB: "vă deranjeaza" },
  { id: 13, text: "Tindeți să aveți:", optionA: "prietenii profunde, cu foarte puțini oameni", optionB: "prietenii mai puțin profunde, cu mulți oameni diferiți" },
  { id: 14, text: "Ideea de a întocmi o listă cu ceea ce va trebui să faceți până săptămâna viitoare:", optionA: "vă atrage", optionB: "vă lasă rece, chiar vă displace" },
  { id: 15, text: "Vi se face un compliment mai mare atunci când sunteți apreciat(ă) ca fiind:", optionA: "o persoană cu sentimente adevărate, sincere", optionB: "o persoană deosebit de rezonabilă, cerebrală" },
  { id: 16, text: "Între prietenii dumneavoastră, sunteți adesea:", optionA: "ultima persoană care află ce se întâmplă cu ceilalți", optionB: "persoana plină de noutăți în privința tuturor" },
  { id: 17, text: "În activitatea dumneavoastră zilnică:", optionA: "mai degrabă vă convine o urgență care vă forțează să lucrați contra-cronometru", optionB: "nu vă place să lucrați sub presiune", optionC: "de obicei vă planificați munca astfel încât să nu fie nevoie să lucrați sub presiune" },
  { id: 18, text: "Ați prefera să fiți prieten(ă), mai degrabă, cu cineva:", optionA: "care vine întotdeauna cu idei noi", optionB: "foarte realist, cu picioarele pe pământ" },

  // ═══ PARTEA II — Perechi de cuvinte (Q19-Q71) ═══
  { id: 19, text: "De obicei:", optionA: "puteți discuta mult și cu ușurință, aproape cu oricine", optionB: "sunteți înclinat din fire să puteți vorbi mult numai cu anumite persoane și numai în anumite împrejurări" },
  { id: 20, text: "Când aveți de efectuat o activitate deosebită, preferați să:", optionA: "organizați totul cu grijă, înainte de a începe", optionB: "stabiliți ce e necesar pe măsură ce înaintați în rezolvarea ei" },
  { id: 21, text: "De obicei, apreciați mai mult:", optionA: "sentimentele decât logica", optionB: "logica mai mult decât sentimentele" },
  { id: 22, text: "Când citiți ceva din plăcere, preferați:", optionA: "modurile de exprimare neobișnuite, originale", optionB: "ca scriitorul să spună exact ceea ce intenționează să spună" },
  { id: 23, text: "De obicei, persoanele cu care tocmai ați făcut cunoștință pot spune ceea ce vă interesează:", optionA: "imediat", optionB: "numai după ce reușesc să vă cunoască bine" },
  { id: 24, text: "Atunci când este stabilit dinainte că veți face un anumit lucru, la o anumită dată, găsiți că:", optionA: "este mai bine atunci când puteți planifica totul dinainte", optionB: "nu e bine să vă simțiți legat de un program detaliat" },
  { id: 25, text: "De regulă, atunci când faceți lucruri pe care le fac și alții, preferați:", optionA: "calea (metoda) unanim acceptată", optionB: "să inventați dumneavoastră o metodă proprie" },
  { id: 26, text: "De obicei:", optionA: "vă manifestați deschis sentimentele", optionB: "preferați să le păstrați numai pentru dumneavoastră" },

  // Perechi cuvinte (Q27-Q71)
  { id: 27, text: "Care cuvânt vă atrage mai mult?", optionA: "calculat", optionB: "nonconformist" },
  { id: 28, text: "Care cuvânt vă atrage mai mult?", optionA: "delicat", optionB: "ferm" },
  { id: 29, text: "Care cuvânt vă atrage mai mult?", optionA: "fapte", optionB: "idei" },
  { id: 30, text: "Care cuvânt vă atrage mai mult?", optionA: "rațiune", optionB: "sentiment" },
  { id: 31, text: "Care cuvânt vă atrage mai mult?", optionA: "entuziast", optionB: "liniștit" },
  { id: 32, text: "Care cuvânt vă atrage mai mult?", optionA: "convingător", optionB: "emoționant" },
  { id: 33, text: "Care cuvânt vă atrage mai mult?", optionA: "afirmație", optionB: "idee" },
  { id: 34, text: "Care cuvânt vă atrage mai mult?", optionA: "a analiza", optionB: "a simpatiza" },
  { id: 35, text: "Care cuvânt vă atrage mai mult?", optionA: "sistematic", optionB: "spontan" },
  { id: 36, text: "Care cuvânt vă atrage mai mult?", optionA: "drept", optionB: "milos" },
  { id: 37, text: "Care cuvânt vă atrage mai mult?", optionA: "rezervat", optionB: "comunicativ" },
  { id: 38, text: "Care cuvânt vă atrage mai mult?", optionA: "înțelegere", optionB: "prudență" },
  { id: 39, text: "Care cuvânt vă atrage mai mult?", optionA: "planificat", optionB: "întâmplător" },
  { id: 40, text: "Care cuvânt vă atrage mai mult?", optionA: "calm", optionB: "activ" },
  { id: 41, text: "Care cuvânt vă atrage mai mult?", optionA: "beneficii", optionB: "binefaceri" },
  { id: 42, text: "Care cuvânt vă atrage mai mult?", optionA: "teorie", optionB: "certitudine" },
  { id: 43, text: "Care cuvânt vă atrage mai mult?", optionA: "hotărât", optionB: "devotat" },
  { id: 44, text: "Care cuvânt vă atrage mai mult?", optionA: "minte fermă", optionB: "inimă caldă" },
  { id: 45, text: "Care cuvânt vă atrage mai mult?", optionA: "sens propriu", optionB: "sens figurat" },
  { id: 46, text: "Care cuvânt vă atrage mai mult?", optionA: "imaginativ", optionB: "realist" },
  { id: 47, text: "Care cuvânt vă atrage mai mult?", optionA: "împăciuitor", optionB: "judecător" },
  { id: 48, text: "Care cuvânt vă atrage mai mult?", optionA: "a face", optionB: "a crea" },
  { id: 49, text: "Care cuvânt vă atrage mai mult?", optionA: "adaptabil", optionB: "de neclintit" },
  { id: 50, text: "Care cuvânt vă atrage mai mult?", optionA: "rezonabil", optionB: "fascinant" },
  { id: 51, text: "Care cuvânt vă atrage mai mult?", optionA: "a ierta", optionB: "a tolera" },
  { id: 52, text: "Care cuvânt vă atrage mai mult?", optionA: "producție", optionB: "proiectare" },
  { id: 53, text: "Care cuvânt vă atrage mai mult?", optionA: "impuls", optionB: "decizie" },
  { id: 54, text: "Care cuvânt vă atrage mai mult?", optionA: "cine", optionB: "ce" },
  { id: 55, text: "Care cuvânt vă atrage mai mult?", optionA: "a vorbi", optionB: "a scrie" },
  { id: 56, text: "Care cuvânt vă atrage mai mult?", optionA: "necritic", optionB: "critic" },
  { id: 57, text: "Care cuvânt vă atrage mai mult?", optionA: "punctual", optionB: "nepunctual" },
  { id: 58, text: "Care cuvânt vă atrage mai mult?", optionA: "concret", optionB: "abstract" },
  { id: 59, text: "Care cuvânt vă atrage mai mult?", optionA: "schimbător", optionB: "constant" },
  { id: 60, text: "Care cuvânt vă atrage mai mult?", optionA: "circumspect", optionB: "încrezător" },
  { id: 61, text: "Care cuvânt vă atrage mai mult?", optionA: "a construi", optionB: "a inventa" },
  { id: 62, text: "Care cuvânt vă atrage mai mult?", optionA: "ordonat", optionB: "nepăsător" },
  { id: 63, text: "Care cuvânt vă atrage mai mult?", optionA: "temelie", optionB: "turn" },
  { id: 64, text: "Care cuvânt vă atrage mai mult?", optionA: "grăbit", optionB: "atent" },
  { id: 65, text: "Care cuvânt vă atrage mai mult?", optionA: "teorie", optionB: "experiență" },
  { id: 66, text: "Care cuvânt vă atrage mai mult?", optionA: "sociabil", optionB: "detașat" },
  { id: 67, text: "Care cuvânt vă atrage mai mult?", optionA: "semn", optionB: "simbol" },
  { id: 68, text: "Care cuvânt vă atrage mai mult?", optionA: "petrecere", optionB: "spectacol" },
  { id: 69, text: "Care cuvânt vă atrage mai mult?", optionA: "acceptare", optionB: "schimbare" },
  { id: 70, text: "Care cuvânt vă atrage mai mult?", optionA: "a fi de acord", optionB: "a discuta" },
  { id: 71, text: "Care cuvânt vă atrage mai mult?", optionA: "cunoscut", optionB: "necunoscut" },

  // ═══ PARTEA III (Q72-Q95) ═══
  { id: 72, text: "Ați spune că sunteți:", optionA: "mai entuziast(ă) decât o persoană obișnuită", optionB: "mai puțin entuziast(ă) decât o persoană obișnuită" },
  { id: 73, text: "Credeți că este o greșeală mai mare să fii:", optionA: "lipsit de înțelegere", optionB: "lipsit de judecată" },
  { id: 74, text: "De regulă:", optionA: "preferați să rezolvați problemele în ultimul moment", optionB: "considerați că este foarte stresant să rezolvați problemele în ultimul moment" },
  { id: 75, text: "Când un element nou începe să fie la modă:", optionA: "există momente când vă plictisiți", optionB: "vă distrați întotdeauna" },
  { id: 76, text: "Credeți că rutina de zi cu zi este:", optionA: "o modalitate comodă de a vă rezolva problemele", optionB: "pentru dumneavoastră ceva obositor, chiar atunci când este necesar" },
  { id: 77, text: "Când un element nou începe să fie la modă:", optionA: "obișnuiți să fiți printre primii care-l adoptă", optionB: "de regulă nu vă interesează ce este moda" },
  { id: 78, text: "Când aveți de făcut un lucru mai puțin important:", optionA: "adesea uitați să vă amintiți astfel de lucruri", optionB: "de regulă vă notați pentru a nu uita astfel de lucruri" },
  { id: 79, text: "Prin temperament și fire, nu prin educație, sunteți:", optionA: "ușor de cunoscut (vă exteriorizați cu ușurință)", optionB: "greu de cunoscut (vă exteriorizați cu greutate)" },
  { id: 80, text: "Stilul dumneavoastră de viață arată că vă place să fiți:", optionA: "un tip original, nonconformist", optionB: "un tip convențional, conformist" },
  { id: 81, text: "Atunci când vă aflați într-o situație jenantă, de obicei:", optionA: "schimbați subiectul discuției", optionB: "faceți o glumă" },
  { id: 82, text: "Este mai dificil pentru dvs., să vă adaptați la:", optionA: "rutină", optionB: "schimbare continuă" },
  { id: 83, text: "Vi se pare mai lăudabil pentru cineva să-i spuneți că are:", optionA: "imaginație", optionB: "bun simț" },
  { id: 84, text: "Când vă apucați de rezolvarea unei sarcini deosebite ce trebuie finalizată într-o săptămână:", optionA: "începeți prin a formula o listă a problemelor ce trebuie rezolvate", optionB: "treceți direct la acțiune, pur și simplu, fără a mai insista asupra unui plan" },
  { id: 85, text: "Credeți că este mai important:", optionA: "să fiți capabil să întrevedeți posibilitățile existente într-o situație dată", optionB: "să vă adaptați situației ca atare" },
  { id: 86, text: "Considerați că prietenii dvs.:", optionA: "știu ce credeți despre majoritatea lucrurilor", optionB: "află numai când aveți un motiv special să le spuneți" },
  { id: 87, text: "Ați lucra mai degrabă sub conducerea cuiva care este:", optionA: "tot timpul cumsecade (amabil)", optionB: "întotdeauna corect (drept)" },
  { id: 88, text: "De obicei, când aveți ceva important de făcut:", optionA: "vă apucați din timp de treabă pentru a avea suficient timp la dispoziție", optionB: "vă bazați pe puterea dvs. de mobilizare din ultimul moment" },
  { id: 89, text: "Vi se pare o greșeală mai mare:", optionA: "să arătați prea multă căldură celorlalți", optionB: "să nu arătați destulă căldură" },
  { id: 90, text: "Când sunteți la o petrecere, vă place:", optionA: "să creați bună dispoziție", optionB: "să-i lăsați pe ceilalți să se distreze în felul lor" },
  { id: 91, text: "Ați prefera mai degrabă:", optionA: "să susțineți căile și metodele deja stabilite", optionB: "să analizați ceea ce este încă greșit și să atacați problemele nerezolvate" },
  { id: 92, text: "Sunteți o persoană preocupată mai mult de:", optionA: "sentimentele oamenilor", optionB: "drepturile lor" },
  { id: 93, text: "Dacă ați fi întrebat(ă) sâmbătă dimineața ce aveți de gând să faceți în acea zi:", optionA: "ați răspunde imediat (întrucât v-ați gândit dinainte)", optionB: "ați răspunde că vă veți hotărâ pe parcurs" },
  { id: 94, text: "Când luați o decizie importantă, de regulă:", optionA: "aveți încredere că ceea ce simțiți e cel mai bine de făcut", optionB: "gândiți că trebuie să faceți ceea ce este logic, indiferent de ceea ce vă spune inima" },
  { id: 95, text: "Considerați că momentele de rutina ale zilei dvs. sunt:", optionA: "odihnitoare", optionB: "plictisitoare" },

  // ═══ PARTEA IV — Întrebări suplimentare Q96-Q127 (contextuali) ═══
  { id: 96, text: "Importanța obținerii unor rezultate bune la un test, de obicei, vă face să vă concentrați:", optionA: "mai bine și să vă dați maximum din potențial", optionB: "să vă concentrați mai greu și să rezolvați la limită" },
  { id: 97, text: "Aveți tendința:", optionA: "să vă placă să decideți asupra lucrurilor", optionB: "să fiți la fel de mulțumit când împrejurările decid pentru dumneavoastră" },
  { id: 98, text: "Când aflați despre o nouă idee (concepție), sunteți mai nerăbdător:", optionA: "să aflați totul despre ea", optionB: "să o analizați dacă este corectă sau greșit" },
  { id: 99, text: "În situațiile urgente din viața cotidiană, preferați:", optionA: "să primiți ordine de la alții și să fiți de ajutor", optionB: "să dați ordine și să fiți răspunzător" },
  { id: 100, text: "Atunci când ați fost în compania unor persoane superstițioase:", optionA: "v-ați simțit afectat(ă) într-o oarecare măsură de superstițiile lor", optionB: "ați rămas cu totul neafectat(ă)" },
  { id: 101, text: "Sunteți o persoană înclinată:", optionA: "spre a-i lăuda pe ceilalți", optionB: "spre a-i critica" },
  { id: 102, text: "Când aveți de luat o decizie, de obicei:", optionA: "vă hotărâți imediat", optionB: "așteptați cât de mult se poate în mod rezonabil înainte de a decide" },
  { id: 103, text: "Atunci când în viață v-ați simțit cel mai mult copleșit de necazuri, primul gând care v-a trecut prin minte a fost:", optionA: "că ați ajuns într-o situație imposibilă", optionB: "că făcând numai ceea ce este necesar s-ar putea să depășiți momentul" },
  { id: 104, text: "Dintre toate deciziile bune pe care le-ați luat:", optionA: "există cel puțin una care a rezistat până în ziua de astăzi", optionB: "niciuna nu a durat cu adevărat" },
  { id: 105, text: "Atunci când rezolvați o problemă personală:", optionA: "vă simțiți mai sigur când cereți sfatul altora", optionB: "credeți că nimeni nu o poate judeca mai bine ca dumneavoastră" },
  { id: 106, text: "Atunci când se ivește o nouă situație care intră în conflict cu planurile dvs., mai întâi încercați:", optionA: "să vă schimbați planurile pentru a vă conforma situației", optionB: "să schimbați situația pentru a se potrivi planurilor" },
  { id: 107, text: 'Urcușurile și coborâșurile de ordin emoțional pe care în mod firesc le resimțiți în viață se manifestă:', optionA: "foarte intens", optionB: "mai degrabă moderat" },
  { id: 108, text: "În formarea convingerilor personale:", optionA: "prețuiți în mare măsură și ceea ce nu poate fi dovedit", optionB: "credeți numai în ceea ce poate fi dovedit" },
  { id: 109, text: "Acasă, când tocmai terminați de făcut ceva, de obicei:", optionA: "vă place să vă apucați de altceva imediat", optionB: "sunteți bucuros să vă relaxați înainte de a se ivi altceva de făcut" },
  { id: 110, text: "Când aveți șansa să faceți ceva interesant:", optionA: "vă decideți relativ repede", optionB: "câteodată pierdeți șansa deoarece vă hotărâți mai greu" },
  { id: 111, text: "Dacă un eveniment neprevăzut a întrerupt o activitate la care lucrați împreună cu mulți alții, impulsul dvs. ar fi:", optionA: 'să vă bucurați de momentul de „respiro"', optionB: "să încercați să lucrați asupra acelor părți care permit continuarea acțiunii" },
  { id: 112, text: "Când nu sunteți de acord cu o afirmație făcută de altcineva, de obicei:", optionA: "treceți peste aceasta ușor", optionB: "aveți tendința să prezentați un contraargument" },
  { id: 113, text: "Asupra celor mai multe chestiuni:", optionA: "v-ați formulat o opinie clar definită", optionB: "preferați să vă păstrați o minte deschisă" },
  { id: 114, text: "Ați prefera să trăiți mai degrabă:", optionA: "o experiență care poate să vă conducă la obținerea unor lucruri deosebite", optionB: "o experiență care sigur v-ar bucura" },
  { id: 115, text: "În felul în care vă conduceți propria viață, tindeți să:", optionA: "vă angajați prea mult în ceea ce faceți, ajungând adesea în situații dificile", optionB: "vă mențineți la ceea ce puteți rezolva ușor, fără prea mari eforturi" },
  { id: 116, text: "Când jucați cărți, vă satisface mai mult:", optionA: "ocazia de a socializa", optionB: "emoția de a câștiga" },
  { id: 117, text: "Atunci când a spune adevărul este nepoliticos, preferați să spuneți:", optionA: "o minciună politicoasă", optionB: "adevărul, oricât ar fi de neplăcut" },
  { id: 118, text: "Ați fi tentat să vă angajați la o activitate susținută, suplimentară:", optionA: "pentru a vă permite o viață mai confortabilă", optionB: "numai pentru șansa de a realiza ceva important" },
  { id: 119, text: "Atunci când nu sunteți de acord cu modul în care acționează un prieten:", optionA: "așteptați de regulă să vedeți ce se mai întâmplă cu el", optionB: "faceți ori spuneți ceva în legătură cu aceasta imediat" },
  { id: 120, text: "Vi s-a întâmplat uneori:", optionA: "să vă angajați sufletește într-o idee sau proiect, astfel încât la început să fiți foarte entuziasmat, iar la sfârșit foarte dezamăgit", optionB: "să vă temperați entuziasmul, astfel încât atunci când nu reușiți să nu fiți foarte dezamăgit" },
  { id: 121, text: "Când aveți de luat o hotărâre importantă în viață:", optionA: "adoptați de regulă imediat o decizie clară", optionB: "câteodată găsiți că este greu de luat o decizie și cumpăniți îndelung variantele" },
  { id: 122, text: "De obicei, la vârsta dumneavoastră:", optionA: "vă bucurați cât puteți de mult de momentul prezent", optionB: "credeți că viitorul vă rezervă ceva mai important" },
  { id: 123, text: "Când acționați în cadrul unui grup de lucru, sunteți cel mai adesea impresionat de:", optionA: "cooperarea dintre oameni", optionB: "ineficiența lucrului în grup" },
  { id: 124, text: "Când vă confruntați în timpul activității cu un obstacol neașteptat, îl resimțiți ca pe:", optionA: "un simplu ghinion", optionB: "un necaz" },
  { id: 125, text: "Care greșeală ar fi mai naturală, mai firească pentru dvs.:", optionA: "o parte din ziua de lucru", optionB: "să vă lăsați purtat de la un lucru la altul toată viața" },
  { id: 126, text: "V-ar fi plăcut să cunoașteți înțelesul:", optionA: "multora dintre aceste întrebări", optionB: "numai al câtorva" },
  { id: 127, text: "TRIMITERE CHESTIONAR COMPLETAT", optionA: "Da", optionB: "Da" },
]

// Numărul de itemi scorabili (Partea I-III)
const SCORED_ITEMS = 95

// ── Scorare MBTI ────────────────────────────────────────────

/**
 * Calculează profilul MBTI din răspunsuri.
 *
 * Regula standard de scorare:
 * - Fiecare item scorabil aparține unei dichotomii
 * - Răspunsul A adaugă 2 puncte pe prima dimensiune a dichotomiei
 * - Răspunsul B adaugă 2 puncte pe a doua dimensiune
 * - Q17 răspunsul C: tratăm ca A (prima dimensiune)
 *
 * Dichotomii: EI (A→E, B→I), SN (A→S, B→N), TF (A→T, B→F dar inversate pentru anumite items), JP (A→J, B→P)
 *
 * Notă importantă: unele items au scorare inversată (A→dimensiunea2).
 * Am determinat direcția din datele din etalon.
 */

// Mapare dichotomie → [dimA = ce dă răspunsul A, dimB = ce dă răspunsul B]
// Scorare standard: A → prima literă, B → a doua
// Excepții: anumite items au scorare inversată (identificate din etalon)

// Items cu scorare inversată (A dă puncte pe dimensiunea 2, nu 1)
// Determinate din analiza etalonului feminin/masculin
const INVERTED_EI: number[] = [13, 26, 37, 40, 79] // A→I (introversiune) nu E
const INVERTED_SN: number[] = [9, 25, 29, 33, 42, 48, 50, 52, 58, 61, 63, 65, 69, 71, 80, 85, 91] // A→S nu N
const INVERTED_TF: number[] = [6, 15, 21, 28, 34, 38, 41, 43, 47, 49, 51, 54, 56, 60, 87, 89, 92, 94] // A→F nu T
const INVERTED_JP: number[] = [8, 53, 59, 64, 74, 76, 78, 82, 88, 93, 95] // A→P nu J

export function scoreMBTI(answers: MBTIAnswers): MBTIResult {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }

  for (let id = 1; id <= SCORED_ITEMS; id++) {
    const answer = answers[id]
    if (!answer) continue

    const dich = getDichotomy(id)
    if (!dich) continue

    const points = 2 // punctaj standard per item

    if (dich === "EI") {
      const inverted = INVERTED_EI.includes(id)
      if (answer === "A") {
        if (inverted) scores.I += points; else scores.E += points
      } else {
        if (inverted) scores.E += points; else scores.I += points
      }
    } else if (dich === "SN") {
      const inverted = INVERTED_SN.includes(id)
      if (answer === "A") {
        if (inverted) scores.S += points; else scores.N += points
      } else {
        if (inverted) scores.N += points; else scores.S += points
      }
    } else if (dich === "TF") {
      const inverted = INVERTED_TF.includes(id)
      if (answer === "A") {
        if (inverted) scores.F += points; else scores.T += points
      } else {
        if (inverted) scores.T += points; else scores.F += points
      }
    } else if (dich === "JP") {
      const inverted = INVERTED_JP.includes(id)
      if (answer === "A") {
        if (inverted) scores.P += points; else scores.J += points
      } else {
        if (inverted) scores.J += points; else scores.P += points
      }
    }
  }

  // Q17 special: răspunsul C se tratează ca răspunsul pentru J
  if (answers[17] === "C") {
    scores.J += 1 // scor redus pentru varianta C
  }

  // Determinare tip
  const typeE = scores.E >= scores.I ? "E" : "I"
  const typeS = scores.S >= scores.N ? "S" : "N"
  const typeT = scores.T >= scores.F ? "T" : "F"
  const typeJ = scores.J >= scores.P ? "J" : "P"
  const type = typeE + typeS + typeT + typeJ

  // Intensitate (scorul dimensiunii dominante)
  const intensity = {
    EI: Math.max(scores.E, scores.I),
    SN: Math.max(scores.S, scores.N),
    TF: Math.max(scores.T, scores.F),
    JP: Math.max(scores.J, scores.P),
  }

  // Claritate (cât de clar e preferința, 0-100)
  const clarityCalc = (a: number, b: number) => {
    const total = a + b
    if (total === 0) return 0
    return Math.round((Math.abs(a - b) / total) * 100)
  }

  const clarity = {
    EI: clarityCalc(scores.E, scores.I),
    SN: clarityCalc(scores.S, scores.N),
    TF: clarityCalc(scores.T, scores.F),
    JP: clarityCalc(scores.J, scores.P),
  }

  return { ...scores, type, intensity, clarity }
}

/**
 * Validează dacă chestionarul e complet (primele 95 de itemi scorabili)
 */
export function isMBTIComplete(answers: MBTIAnswers): boolean {
  for (let i = 1; i <= SCORED_ITEMS; i++) {
    if (!answers[i]) return false
  }
  return true
}

/**
 * Câte întrebări au fost completate (din cele 95 scorabile)
 */
export function mbtiProgress(answers: MBTIAnswers): { answered: number; total: number; percent: number } {
  let answered = 0
  for (let i = 1; i <= SCORED_ITEMS; i++) {
    if (answers[i]) answered++
  }
  return { answered, total: SCORED_ITEMS, percent: Math.round((answered / SCORED_ITEMS) * 100) }
}

// ── Descrieri tipuri MBTI ──────────────────────────────────

export const MBTI_TYPE_DESCRIPTIONS: Record<string, { title: string; strengths: string[]; weaknesses: string[]; contributions: string[]; leadership: string[]; environment: string[]; development: string[] }> = {
  ISTJ: {
    title: "Sârguincios, sistematic, muncitor, atent la detalii",
    strengths: ["Practici și realiști, prozaici și meticuloși", "Teribil de preciși și metodici, cu mare putere de concentrare", "Sistematici și organizați, precauți și tradiționali"],
    weaknesses: ["Tendința de a se pierde în detalii", "Rigizi, refuză alte puncte de vedere", "Dificultăți în înțelegerea nevoilor altora"],
    contributions: ["Lucrurile bine făcute și la timp", "Deosebit de atent la detalii", "Se poate conta pe cuvântul de onoare"],
    leadership: ["Folosește experiența anterioară", "Respectă abordările tradiționale", "Recompensează cei care urmează regulile"],
    environment: ["Oameni dedicați, focalizați pe rezultate", "Structurat, orientat spre sarcină", "Permite izolare pentru muncă neîntreruptă"],
    development: ["Să acorde atenție ramificațiilor largi ale problemelor", "Să ia în considerare elementul uman", "Să aibă răbdare cu cei care caută noi căi"],
  },
  ESTJ: {
    title: "Logic, analitic, hotărât, capabil să organizeze fapte și operațiuni",
    strengths: ["Excelează în realizarea practică a proiectelor", "Responsabili, conștiincioși", "Realiști, practici, cu greu pot fi convinși de altceva decât logica"],
    weaknesses: ["Tradiționali, dictatoriali", "Nu sunt interesați de impactul deciziilor asupra altora", "Rigizi în gândire, pot pierde oportunități creative"],
    contributions: ["Capabil să vadă punctele slabe în avans", "Critică programele într-o manieră logică", "Organizează procese, produse și oameni"],
    leadership: ["Își asumă responsabilități direct și repede", "Abordare directă a situației", "Acționează tradițional, respectând ierarhia"],
    environment: ["Alături de indivizi muncitori", "Orientat spre sarcină, organizat", "Focalizat pe eficiență"],
    development: ["Să ia în considerare toate fațetele unei probleme", "Să caute și beneficiile schimbării", "Să arate apreciere pentru alții"],
  },
  INFJ: {
    title: "Idealist, vizionar, cu principii ferme și integritate personală",
    strengths: ["Loiali, dedicați și idealiști", "Excelenți conducători cu viziune", "Stil de conducere democratic, influențează cu integritate morală"],
    weaknesses: ["Pot fi absorbiți de idee, lipsiți de spirit practic", "Pot fi surzi la obiecțiile altora", "Exagerează cu reglementările, perfecționiști"],
    contributions: ["Viziune orientată spre viitor", "Urmărește îndeplinirea promisiunilor", "Lucrează cu integritate, consistent"],
    leadership: ["Conduc spre îndeplinirea viziunii", "Câștigă cooperarea fără să o ceară", "Foarte persuasivi prin coerență pe termen lung"],
    environment: ["Oameni focalizați pe idealuri umaniste", "Oportunități pentru creativitate", "Liniștit și armonios"],
    development: ["Să dezvolte aptitudini asertive", "Să dea feedback constructiv", "Să-și verifice viziunile discutând cu alții"],
  },
  ENFJ: {
    title: "Carismatic, empatic, orientat spre dezvoltarea celorlalți",
    strengths: ["Empatici și orientați spre oameni", "Comunicatori excelenți", "Vizionari în privința potențialului uman"],
    weaknesses: ["Pot fi prea idealiști", "Se pot implica excesiv emoțional", "Pot neglija propriile nevoi"],
    contributions: ["Creează coeziune în echipă", "Motivează și inspiră", "Mediază conflicte cu naturalețe"],
    leadership: ["Stil participativ și inspirațional", "Dezvoltă potențialul fiecărui membru", "Creează un mediu de încredere"],
    environment: ["Colaborativ și armonios", "Orientat spre creștere personală", "Comunicare deschisă"],
    development: ["Să stabilească limite sănătoase", "Să accepte conflictul constructiv", "Să echilibreze idealul cu realitatea"],
  },
  ENFP: {
    title: "Entuziast, creativ, sociabil, cu multe posibilități",
    strengths: ["Creativi și imaginativi", "Entuziaști și energici", "Flexibili și adaptabili"],
    weaknesses: ["Pot pierde focusul ușor", "Încep mai mult decât termină", "Pot fi dezorganizați"],
    contributions: ["Idei inovatoare", "Energie și entuziasm", "Conectează oameni și idei"],
    leadership: ["Inspirațional și vizionar", "Încurajează experimentarea", "Stil democratic"],
    environment: ["Dinamic și creativ", "Flexibil, fără rutină rigidă", "Oportunități de explorare"],
    development: ["Să dezvolte disciplina în follow-through", "Să prioritizeze eficient", "Să accepte limitările practice"],
  },
  ENTJ: {
    title: "Hotărât, asertiv, orientat spre rezultate, lider natural",
    strengths: ["Vizionari strategici", "Hotărâți și eficienți", "Organizatori excelenți"],
    weaknesses: ["Pot fi dominanți", "Nerabdători cu ineficiența", "Pot ignora sentimentele altora"],
    contributions: ["Planificare strategică", "Structurare și implementare", "Rezultate tangibile"],
    leadership: ["Directiv și eficient", "Viziune pe termen lung", "Standard înalt de performanță"],
    environment: ["Orientat spre realizări", "Structurat dar dinamic", "Competitiv"],
    development: ["Să asculte mai mult", "Să acorde atenție nevoilor emoționale", "Să dezvolte răbdarea"],
  },
  ENTP: {
    title: "Inventiv, strategic, întreprinzător, provocator intelectual",
    strengths: ["Inovatori și versatili", "Gândire strategică rapidă", "Rezolvă probleme creative"],
    weaknesses: ["Pot fi argumentativi", "Se plictisesc cu rutina", "Pot neglija detaliile"],
    contributions: ["Soluții neconvenționale", "Provocare constructivă", "Adaptare rapidă"],
    leadership: ["Stil antreprenorial", "Încurajează dezbaterea", "Gândire de frontieră"],
    environment: ["Intelectual stimulant", "Flexibil, fără birocrație", "Provocator"],
    development: ["Să termine ceea ce încep", "Să dezvolte empatia", "Să respecte procesele necesare"],
  },
  ESFJ: {
    title: "Grijuliu, sociabil, tradițional, orientat spre armonie",
    strengths: ["Cooperanți și armonioși", "Loiali și responsabili", "Atenți la nevoile celorlalți"],
    weaknesses: ["Pot fi prea conformiști", "Sensibili la critică", "Pot evita conflictul necesar"],
    contributions: ["Coeziune de echipă", "Suport practic", "Atenție la detalii interpersonale"],
    leadership: ["Stil suportiv și incluziv", "Construiește relații", "Respectă tradițiile"],
    environment: ["Armonios și cooperativ", "Structurat dar cald", "Orientat spre oameni"],
    development: ["Să accepte feedback-ul critic", "Să-și susțină propriile nevoi", "Să tolereze ambiguitatea"],
  },
  ESFP: {
    title: "Spontan, energic, prietenos, iubitor de viață",
    strengths: ["Energici și entuziaști", "Practici și realiști", "Flexibili și adaptabili"],
    weaknesses: ["Pot evita planificarea", "Se plictisesc cu teoria", "Pot fi impulsivi"],
    contributions: ["Energie și bună dispoziție", "Rezolvare practică", "Diplomație naturală"],
    leadership: ["Stil relaxat și prietenos", "Motivare prin exemplu", "Flexibil"],
    environment: ["Activ și dinamic", "Prietenos", "Orientat spre acțiune"],
    development: ["Să dezvolte gândirea pe termen lung", "Să finalizeze proiectele", "Să reflecteze înainte de a acționa"],
  },
  ESTP: {
    title: "Pragmatic, energic, orientat spre acțiune, realist",
    strengths: ["Orientați spre acțiune", "Rezolvă probleme practic", "Percepție acută a situației"],
    weaknesses: ["Pot fi impulsivi", "Nerabdători cu teoria", "Pot ignora consecințele pe termen lung"],
    contributions: ["Soluții imediate", "Gestionare eficientă a crizelor", "Pragmatism"],
    leadership: ["Direct și pragmatic", "Orientat spre rezultate imediate", "Flexibil"],
    environment: ["Activ, cu provocări", "Practic, fără birocrație", "Orientat spre rezultate"],
    development: ["Să ia în considerare consecințele pe termen lung", "Să dezvolte răbdarea", "Să asculte mai mult"],
  },
  INFP: {
    title: "Idealist, empatic, creativ, ghidat de valori personale",
    strengths: ["Profund empatici", "Creativi și imaginativi", "Dedicați valorilor personale"],
    weaknesses: ["Pot fi prea idealiști", "Sensibili la critică", "Dificultăți cu deciziile practice"],
    contributions: ["Viziune umanistă", "Creativitate", "Mediere empatică"],
    leadership: ["Inspirațional și autentic", "Ghidat de valori", "Suportiv"],
    environment: ["Liniștit și armonios", "Orientat spre valori", "Spațiu pentru creativitate"],
    development: ["Să dezvolte pragmatismul", "Să ia decizii mai rapid", "Să accepte imperfecțiunea"],
  },
  INTJ: {
    title: "Strategic, independent, determinat, vizionar",
    strengths: ["Gânditori strategici", "Independenți și determinați", "Standard înalt de competență"],
    weaknesses: ["Pot fi perfecționiști", "Pot părea aroganti", "Dificultăți cu smalltalk-ul"],
    contributions: ["Strategie pe termen lung", "Inovație sistematică", "Analiză profundă"],
    leadership: ["Vizionar și strategic", "Standard înalt", "Delegare eficientă"],
    environment: ["Intelectual stimulant", "Autonomie ridicată", "Orientat spre competență"],
    development: ["Să dezvolte abilitățile interpersonale", "Să fie mai flexibili", "Să aprecieze contribuțiile altora"],
  },
  INTP: {
    title: "Analitic, obiectiv, rezervat, căutător de cunoaștere",
    strengths: ["Gândire analitică profundă", "Obiectivi și logici", "Creativi în rezolvarea problemelor"],
    weaknesses: ["Pot fi detașați emoțional", "Dificultăți cu deciziile rapide", "Pot neglija relațiile"],
    contributions: ["Analiză riguroasă", "Soluții inovatoare", "Gândire critică"],
    leadership: ["Stil consultativ", "Bazat pe competență", "Autonomie pentru echipă"],
    environment: ["Intelectual, flexibil", "Fără birocrație", "Spațiu pentru cercetare"],
    development: ["Să dezvolte abilitățile de comunicare", "Să ia decizii la timp", "Să fie mai prezenți emoțional"],
  },
  ISFJ: {
    title: "Dedicat, grijuliu, metodic, responsabil",
    strengths: ["Responsabili și dedicați", "Atenți la detalii și nevoi", "Loiali și de încredere"],
    weaknesses: ["Pot fi prea sacrificiali", "Reticenți la schimbare", "Pot avea dificultăți în a spune nu"],
    contributions: ["Stabilitate și fiabilitate", "Grijă pentru detalii", "Suport constant"],
    leadership: ["Stil suportiv", "Atenție la nevoile echipei", "Consistență"],
    environment: ["Stabil și previzibil", "Cooperativ", "Apreciere pentru muncă bine făcută"],
    development: ["Să-și susțină propriile nevoi", "Să accepte schimbarea", "Să delege mai mult"],
  },
  ISFP: {
    title: "Sensibil, modest, artistic, ghidat de valori",
    strengths: ["Sensibili și empatici", "Atenți la frumos și armonie", "Flexibili și adaptabili"],
    weaknesses: ["Pot evita conflictul", "Dificultăți cu planificarea", "Pot fi prea rezervați"],
    contributions: ["Armonie în echipă", "Creativitate practică", "Atenție la detalii estetice"],
    leadership: ["Stil discret și suportiv", "Conducere prin exemplu", "Respectă individualitatea"],
    environment: ["Armonios și flexibil", "Fără presiune excesivă", "Spațiu pentru expresie personală"],
    development: ["Să comunice mai deschis", "Să-și asume riscuri", "Să dezvolte planificarea"],
  },
  ISTP: {
    title: "Practic, logic, observator, eficient",
    strengths: ["Analitici și practici", "Calmi sub presiune", "Rezolvă probleme eficient"],
    weaknesses: ["Pot fi detașați emoțional", "Nerabdători cu regulile", "Pot fi imprevizibili"],
    contributions: ["Soluții practice", "Eficiență", "Adaptabilitate"],
    leadership: ["Pragmatic și flexibil", "Orientat spre acțiune", "Minimal birocratie"],
    environment: ["Practic, fără rutină rigidă", "Autonomie", "Provocări tehnice"],
    development: ["Să dezvolte empatia", "Să comunice planurile", "Să respecte procesele necesare"],
  },
}
