/**
 * seed-apa-rudica-l2.ts — Infuzare KB reală cu cunoaștere din:
 *
 * 1. Terminologia APA (American Psychological Association)
 *    Dicționarul de psihologie APA — termeni fundamentali utilizați
 *    în practica psihologică, evaluare, testare, consiliere.
 *
 * 2. "Psihologia frustrației" — Tiberiu Rudică
 *    Lucrare fundamentală despre frustrare ca fenomen psihologic:
 *    mecanisme, tipuri, reacții, toleranță la frustrare, aplicații
 *    în context organizațional și interpersonal.
 *
 * Distribuție per consilier L2:
 *   PSYCHOLINGUIST — terminologie APA în comunicare, detectare frustrare
 *   PPA — frustrare și wellbeing, toleranță, reziliență
 *   PPMO — frustrare organizațională, climat, dinamică echipă
 *   SCA — frustrare și bias, mecanisme defensive, distorsiuni
 *   PSE — frustrare în învățare, motivație, performanță
 *   SOC — frustrare socială, norme, conflict
 *   SAFETY_MONITOR — frustrare și criză, escaladare, semne de pericol
 *   HR_COUNSELOR — gestionarea frustrării client, dezamorsare
 *
 * Usage: npx tsx prisma/seed-apa-rudica-l2.ts
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
  // PSYCHOLINGUIST — Terminologie APA + detectare lingvistică a frustrării
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSYCHOLINGUIST",
    content: "[APA] Affect = stare emoțională subiectivă, de scurtă durată, asociată unui stimul (pozitiv sau negativ). Diferit de mood (dispoziție = stare de fond, mai lungă) și de emotion (emoție = reacție specifică la un eveniment identificabil). În comunicare: detectăm affect-ul din alegerea cuvintelor, ritm, punctuație. Un client care scrie propoziții scurte, fără salut = posibil affect negativ.",
    tags: ["apa", "terminologie", "affect", "emotie"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[APA] Self-efficacy (auto-eficacitate, Bandura) = convingerea individului că poate executa cu succes comportamentele necesare pentru a produce un rezultat dorit. NU e competența reală — e PERCEPȚIA competenței. Diferit de self-esteem (stimă de sine = evaluare globală a valorii proprii). În comunicare: clientul cu self-efficacy scăzut spune 'nu cred că putem', 'e prea complicat pentru noi'. Nu invalidăm — validăm dificultatea și oferim evidențe de succes.",
    tags: ["apa", "terminologie", "self-efficacy", "bandura"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[APA] Cognitive dissonance (disonanță cognitivă, Festinger) = disconfort psihologic cauzat de susținerea simultană a două credințe contradictorii. În context B2B: HR Directorul care 'știe' că grila salarială e incorectă dar 'nu poate' schimba nimic = disonanță. Nu o rezolvăm prin presiune ('trebuie să schimbi') ci prin reducerea disonanței: oferim un instrument care face schimbarea posibilă fără a admite public eroarea anterioară.",
    tags: ["apa", "terminologie", "disonanta-cognitiva", "festinger"],
    confidence: 0.90,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[Rudică] Markeri lingvistici ai frustrării în text scris: (1) Repetare obsesivă a problemei fără a căuta soluție. (2) Generalizare negativă: 'mereu', 'niciodată', 'toți', 'nimeni'. (3) Personalizare: 'mie mi se întâmplă', 'pe mine nu mă ascultă nimeni'. (4) Scădere bruscă a lungimii mesajelor (retragere). (5) Sarcasm sau ironie necaracteristică. PSYCHOLINGUIST detectează acești markeri și alertează agentul client-facing pentru adaptarea tonului.",
    tags: ["rudica", "frustrare", "markeri-lingvistici", "detectare"],
    confidence: 0.90,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[APA] Rapport = relație armonioasă și de încredere între două persoane, caracterizată prin acord mutual, înțelegere și empatie. Diferit de compliance (conformare = individul face ce i se cere, fără necesară înțelegere/acord). În comunicare: construim rapport, nu cerem compliance. Raportul se construiește prin: validare, mirroring lingvistic, ritm adaptat, ascultare activă demonstrată.",
    tags: ["apa", "terminologie", "rapport", "comunicare"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPA — Frustrare și wellbeing, toleranță, reziliență
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PPA",
    content: "[Rudică] Frustrarea = stare psihică rezultată din blocarea sau împiedicarea satisfacerii unei trebuințe, dorințe sau scopuri. NU e emoție — e STARE care generează emoții (furie, tristețe, anxietate, apatie). Trei componente: (1) trebuința nesatisfăcută, (2) obstacolul (intern sau extern), (3) reacția emoțional-comportamentală. PPA evaluează care componentă e dominantă pentru a interveni adecvat.",
    tags: ["rudica", "frustrare", "definitie", "componente"],
    confidence: 0.95,
  },
  {
    agentRole: "PPA",
    content: "[Rudică] Toleranța la frustrare = capacitatea de a suporta frustrarea fără dezorganizare comportamentală. Variază individual și situațional. Factori care cresc toleranța: (1) experiențe anterioare de depășire a obstacolelor (mastery), (2) suport social perceput, (3) sens/scop care transcende frustrarea, (4) capacitate de amânare a gratificării. PPA contribuie prin: strengths-spotting (arată ce poate), PERMA (sens), SDT (autonomie).",
    tags: ["rudica", "frustrare", "toleranta", "rezilienta"],
    confidence: 0.92,
  },
  {
    agentRole: "PPA",
    content: "[APA] Learned helplessness (neajutorare învățată, Seligman) = stare în care individul încetează să mai încerce să schimbe o situație neplăcută, după experiențe repetate de eșec. Legătura cu frustrarea: frustrarea cronică netratată → neajutorare. Diferența: frustrarea e activă (individul luptă cu obstacolul), neajutorarea e pasivă (a renunțat). PPA intervine ÎNAINTE de trecerea la neajutorare — prin experiențe mici de succes.",
    tags: ["apa", "rudica", "neajutorare-invatata", "seligman", "frustrare"],
    confidence: 0.92,
  },
  {
    agentRole: "PPA",
    content: "[Rudică] Frustrarea în context organizațional: surse tipice — (1) evaluare percepută ca incorectă, (2) lipsa recunoașterii, (3) inechitate salarială, (4) promisiuni nerespectate, (5) lipsa autonomiei. JobGrade adresează direct sursele 1, 3 și parțial 4: evaluare obiectivă → percepție de corectitudine → reducere frustrare organizațională. PPA monitorizează celelalte surse prin PERMA.",
    tags: ["rudica", "frustrare", "organizational", "surse"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPMO — Frustrare organizațională, climat, dinamică echipă
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PPMO",
    content: "[Rudică] Frustrarea colectivă în organizații: când un grup întreg experimentează frustrare (ex: restructurare, schimbare management, evaluare percepută ca nedreptă), reacțiile se amplifică prin contagiune emoțională. Fenomenul de deindividuare: în grup, indivizii acționează mai extrem decât individual. PPMO trebuie să prevină frustrarea colectivă prin: comunicare transparentă ÎNAINTE de schimbare, implicare în proces, validare emoțiilor.",
    tags: ["rudica", "frustrare", "colectiva", "contagiune"],
    confidence: 0.90,
  },
  {
    agentRole: "PPMO",
    content: "[Rudică] Reacții la frustrare organizațională (Rudică + Dollard): (1) Agresiune directă — conflict deschis, sabotaj, plângeri. (2) Agresiune deplasată — conflicte cu colegii, nu cu sursa reală. (3) Retragere — absenteism, demisie silențioasă, dezangajare. (4) Regresie — comportament sub nivelul de competență. (5) Fixație — repetarea obsesivă a aceluiași comportament ineficient. PPMO diagnostichează tipul de reacție pentru a interveni adecvat.",
    tags: ["rudica", "frustrare", "reactii", "agresiune", "retragere"],
    confidence: 0.92,
  },
  {
    agentRole: "PPMO",
    content: "[APA] Organizational justice (justiție organizațională) = percepția angajaților că sunt tratați corect. Trei dimensiuni: (1) Distributive justice — corectitudinea rezultatelor (salarii, promoții). (2) Procedural justice — corectitudinea proceselor (cum se iau deciziile). (3) Interactional justice — corectitudinea tratamentului interpersonal. Frustrarea apare când ORICARE dimensiune e percepută ca încălcată. JobGrade adresează (1) și (2) direct.",
    tags: ["apa", "rudica", "justitie-organizationala", "frustrare"],
    confidence: 0.92,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCA — Frustrare și bias, mecanisme defensive, distorsiuni
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SCA",
    content: "[Rudică] Mecanisme de apărare activate de frustrare (Freud via Rudică): (1) Raționalizare — inventăm justificări logice pentru eșec ('oricum nu voiam'). (2) Proiecție — atribuim altora propriile sentimente ('EI sunt nemulțumiți, nu eu'). (3) Negare — refuzăm să acceptăm realitatea ('nu e nicio problemă'). (4) Sublimarea — canalizăm energia frustrării în activitate constructivă (singura reacție adaptativă). SCA detectează mecanismele 1-3 și le semnalează.",
    tags: ["rudica", "frustrare", "mecanisme-aparare", "bias"],
    confidence: 0.92,
  },
  {
    agentRole: "SCA",
    content: "[APA] Confirmation bias + frustration: când suntem frustrați, bias-ul de confirmare se intensifică — căutăm selectiv dovezi care confirmă că 'lucrurile nu merg'. Evaluatorul frustrat va scora mai sever (severity bias amplificat). SCA monitorizează: dacă un evaluator dă scoruri sistematic mai mici decât media grupului, verifică dacă sursa e frustration bias, nu evaluare obiectivă.",
    tags: ["apa", "rudica", "confirmation-bias", "frustrare-bias"],
    confidence: 0.88,
  },
  {
    agentRole: "SCA",
    content: "[Rudică] Umbra frustrării organizaționale: compania declară 'suntem o familie' dar practică evaluări subiective, favoritisme, opacitate salarială. Frustrarea cronică rezultă din DISCREPANȚA între declarație și practică (Rudică: frustrare prin inadecvare a recompensei la efort). SCA cartografiază aceste discrepanțe: ce declară organizația vs. ce practică = harta Umbrei organizaționale.",
    tags: ["rudica", "frustrare", "umbra", "discrepanta"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PSE — Frustrare în învățare, motivație, performanță
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSE",
    content: "[Rudică] Frustrarea în procesul de învățare: apare când dificultatea sarcinii depășește competența percepută (zona de panică, nu zona proximei dezvoltări). Soluție Rudică: (1) Gradare — descompune sarcina complexă în pași mici reușiți. (2) Feedback imediat — nu lasă incertitudinea să devină frustrare. (3) Atribuire internă — 'poți dacă faci pașii' nu 'e ușor'. PSE proiectează onboarding-ul și training-urile cu aceste principii anti-frustrare.",
    tags: ["rudica", "frustrare", "invatare", "gradare"],
    confidence: 0.90,
  },
  {
    agentRole: "PSE",
    content: "[APA] Zone of proximal development (ZPD, Vygotsky) = zona dintre ce individul poate face singur și ce poate face cu ghidare. Legătura cu frustrarea: sub ZPD = plictiseală (sub-stimulare). În ZPD = provocare optimă (flow). Peste ZPD = frustrare (supra-stimulare). PSE calibrează dificultatea evaluării/training-ului ca să rămână în ZPD — provocatoare dar fezabilă.",
    tags: ["apa", "zpd", "vygotsky", "frustrare", "calibrare"],
    confidence: 0.90,
  },
  {
    agentRole: "PSE",
    content: "[APA] Growth mindset vs. fixed mindset (Dweck): individul cu growth mindset vede frustrarea ca semnal de învățare ('încă nu pot'). Fixed mindset vede frustrarea ca dovadă de incapacitate ('nu pot'). PSE cultivă growth mindset în interacțiunile cu clientul: 'Evaluarea posturilor e nouă pentru echipa ta. Normal că e dificil la început. Hai să lucrăm pas cu pas.' — NU 'E simplu, doar urmează instrucțiunile.'",
    tags: ["apa", "growth-mindset", "dweck", "frustrare"],
    confidence: 0.88,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOC — Frustrare socială, norme, conflict
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SOC",
    content: "[Rudică] Frustrarea prin comparație socială (Festinger + Rudică): individul se frustrează nu când are puțin, ci când are MAI PUȚIN DECÂT ALTUL în situație similară. Teoria privației relative: percepția inechității e mai puternică decât inechitatea obiectivă. Implicație directă pentru JobGrade: transparența salarială poate CREȘTE frustrarea pe termen scurt (văd diferențele) dar o REDUCE pe termen lung (diferențele se corectează).",
    tags: ["rudica", "frustrare", "comparatie-sociala", "privatie-relativa"],
    confidence: 0.92,
  },
  {
    agentRole: "SOC",
    content: "[Rudică] Frustrarea și agresiunea (Dollard et al., 1939 — teoria clasică revizuită de Rudică): frustrarea POATE conduce la agresiune dar nu NEAPĂRAT. Factori moderatori: (1) toleranța la frustrare individuală, (2) normele sociale ale grupului, (3) puterea relativă (subordonatul frustrat NU atacă șeful — deplasează agresiunea). În context RO (Daniel David): cultura evitare conflict amplifică deplasarea agresiunii — nu se exprimă direct, ci indirect (bârfă, sabotaj pasiv).",
    tags: ["rudica", "frustrare", "agresiune", "dollard", "cultura-ro"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY_MONITOR — Frustrare și criză, escaladare, semne de pericol
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SAFETY_MONITOR",
    content: "[Rudică] Pragul de toleranță la frustrare: fiecare individ are un prag dincolo de care frustrarea devine dezorganizantă. Semnele depășirii pragului: (1) comportament irațional brusc, (2) reacții emoționale disproporționate față de stimul, (3) blocaj decizional complet ('nu mai pot decide nimic'), (4) declarații de renunțare globală ('las totul'). SAFETY_MONITOR escaladează la detectarea acestor semne.",
    tags: ["rudica", "frustrare", "prag", "criza", "detectie"],
    confidence: 0.92,
  },
  {
    agentRole: "SAFETY_MONITOR",
    content: "[Rudică + APA] Frustrarea cronică → burnout: frustrarea nesoluționată pe termen lung epuizează resursele psihologice. Secvența: frustrare acută → frustrare cronică → cynicism → depersonalizare → epuizare completă (burnout, Maslach). SAFETY_MONITOR monitorizează semnele de cronificare: scădere progresivă a angajamentului, ton cinic crescând, referințe repetate la inechitate fără a căuta soluție.",
    tags: ["rudica", "apa", "frustrare-cronica", "burnout", "maslach"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HR_COUNSELOR — Gestionarea frustrării client, dezamorsare
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "HR_COUNSELOR",
    content: "[Rudică] Protocol de dezamorsare a frustrării client: (1) VALIDARE — 'Înțeleg că e frustrant.' (nu 'nu ar trebui să fii frustrat'). (2) REFORMULARE — repet ce a spus clientul în cuvintele mele (arăt că am ascultat). (3) NORMALIZARE — 'Mulți directori HR trec prin asta' (nu sunt singur). (4) CONCRETIZARE — mut din abstract ('nimic nu merge') în concret ('care e primul lucru care te deranjează?'). (5) MICRO-ACȚIUNE — propun un singur pas mic fezabil. NU propun soluția completă — asta amplifică frustrarea ('e prea mult').",
    tags: ["rudica", "frustrare", "dezamorsare", "protocol", "client"],
    confidence: 0.95,
  },
  {
    agentRole: "HR_COUNSELOR",
    content: "[APA] Empathy vs. sympathy: empathy = înțeleg ce simți din perspectiva ta, fără a prelua emoția. Sympathy = simt și EU ce simți tu (contagiune emoțională). HR_COUNSELOR practică EMPATIE, nu simpatie. 'Înțeleg frustrarea ta' (empatie) vs. 'Și pe mine mă frustrează' (simpatie). Simpatia pierde obiectivitatea. Empatia menține atât conexiunea cât și capacitatea de a ajuta.",
    tags: ["apa", "empatie", "simpatie", "frustrare", "consiliere"],
    confidence: 0.92,
  },
  {
    agentRole: "HR_COUNSELOR",
    content: "[Rudică] Ce NU faci cu un client frustrat: (1) NU minimizezi ('nu e mare lucru'). (2) NU compari ('alții au probleme mai mari'). (3) NU grăbești ('hai să trecem la soluție'). (4) NU moralizezi ('ar fi trebuit să faci asta mai devreme'). (5) NU promiți ce nu poți livra ('o rezolvăm imediat'). Fiecare din aceste reacții AMPLIFICĂ frustrarea. Regula: mai întâi omul, apoi problema.",
    tags: ["rudica", "frustrare", "interdicții", "consiliere", "erori"],
    confidence: 0.95,
  },
]

// ── Seed Execution ──────────────────────────────────────────────────────────

async function seedAPARudica() {
  const uniqueAgents = new Set(entries.map(e => e.agentRole))
  console.log(`\n📚 Seed APA + Rudică L2 — ${entries.length} entries pentru ${uniqueAgents.size} consilieri\n`)

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

  console.log(`\n✅ APA + Rudică seed complet: ${created} create, ${skipped} skip (duplicate)\n`)

  for (const role of uniqueAgents) {
    const count = entries.filter(e => e.agentRole === role).length
    const source = entries.filter(e => e.agentRole === role).map(e => e.tags[0]).filter((v, i, a) => a.indexOf(v) === i).join(" + ")
    console.log(`  ${role}: ${count} entries (${source})`)
  }

  await prisma.$disconnect()
}

seedAPARudica().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
