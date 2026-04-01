/**
 * seed-eleganta-lingvistica-l2.ts — Principii de stil și eleganță lingvistică
 *
 * Nu reguli de ortografie (alea le avem) — ci MODELE DE GÂNDIRE despre
 * cum se scrie frumos, precis și cu impact în limba română.
 *
 * Inspirat din principiile maeștrilor limbii române și ai stilisticii:
 * - Tudor Vianu (Arta prozatorilor români, Estetica)
 * - George Călinescu (critica literară ca model de precizie)
 * - Iordan & Robu (Limba română contemporană — stilistică)
 * - Șerban Foarță (economia cuvântului)
 * - Principii universale: Strunk & White, Zinsser (On Writing Well)
 *   adaptate la specificul românesc
 *
 * Distribuție:
 *   PSYCHOLINGUIST — principiile fundamentale (radiază spre toți)
 *   CWA — aplicare în copywriting și content
 *   CMA — standard editorial
 *   HR_COUNSELOR — eleganță în comunicare profesională cu clientul
 *   SOA — eleganță în comunicare de vânzare
 *
 * Usage: npx tsx prisma/seed-eleganta-lingvistica-l2.ts
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
  // PSYCHOLINGUIST — Principii fundamentale de eleganță (radiază spre toți)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Regula de aur a eleganței: dacă o propoziție poate fi spusă mai simplu și mai frumos, rescrie-o. Eleganța nu e ornament adăugat — e claritate rafinată. Fraza elegantă nu se observă ca frumoasă; se înțelege fără efort. Cititorul nu trebuie să simtă limba — trebuie să simtă sensul. Când limba devine invizibilă, a devenit perfectă.",
    tags: ["stil", "eleganta", "principiu-fundamental", "claritate"],
    confidence: 0.95,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL — Tudor Vianu] Precizia e forma supremă a eleganței. Cuvântul potrivit nu e cel mai frumos — e cel mai exact. Nu 'o multitudine de beneficii' ci 'trei beneficii concrete'. Nu 'oferim soluții inovatoare' ci 'evaluăm posturile pe șase criterii măsurabile'. Adjectivul vag slăbește; substantivul precis întărește. Verbul activ mișcă; verbul pasiv oprește. Alege cuvântul care spune exact cât trebuie — nici mai mult, nici mai puțin.",
    tags: ["stil", "vianu", "precizie", "cuvantul-potrivit"],
    confidence: 0.95,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Ritmul frazei românești: limba română are o muzicalitate naturală dată de alternanța silabelor accentuate și neaccentuate. Fraza elegantă respectă acest ritm — nu sună sacadat și nici nu se târăște. Citește-ți textul cu voce tare: dacă te împiedici, fraza e prost construită. Dacă trebuie să respiri la mijlocul unei propoziții, e prea lungă. Dacă sună monoton, variază lungimea propozițiilor: una scurtă, una medie, una care se desfășoară — apoi iar una scurtă.",
    tags: ["stil", "ritm", "muzicalitate", "voce-tare"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Economia cuvintelor: fiecare cuvânt trebuie să-și câștige locul în propoziție. Dacă îl scoți și sensul rămâne intact, nu-i era locul acolo. 'În vederea realizării procesului de evaluare a posturilor' = 7 cuvinte inutile. 'Evaluarea posturilor' = suficient. Balastul lingvistic nu e semn de profesionalism — e semn de nesiguranță. Cel care știe ce spune, spune scurt.",
    tags: ["stil", "economie", "balast", "concizie"],
    confidence: 0.95,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Metafora precisă vs. metafora uzată: 'pilon al strategiei', 'ecosistem de soluții', 'sinergie transformațională' — sunt metafore moarte. Nu mai comunică nimic. O metaforă bună surprinde și clarifică simultan: 'Evaluarea posturilor e o radiografie — nu schimbă pacientul, dar arată unde e problema.' Dacă metafora nu aduce lumină nouă, las-o deoparte. Limbajul direct e mai elegant decât metafora forțată.",
    tags: ["stil", "metafora", "uzura", "surpriza-claritate"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Coerența de ton: de la primul cuvânt al textului până la ultimul, trebuie să se simtă aceeași voce. Nu poți începe sobru și termina entuziast. Nu poți deschide tehnic și închide emoțional. Tonul se stabilește din prima propoziție și se menține constant — cu variații subtile, nu cu salturi. Cititorul care simte un salt de ton pierde încrederea. Percepe inconsecvența chiar dacă nu o poate numi.",
    tags: ["stil", "coerenta-ton", "voce", "consistenta"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Evită limbajul de lemn: formulările birocratice omoară eleganța. 'Se impune a se menționa' → 'Menționăm'. 'Prezenta ofertă vizează' → 'Oferim'. 'Vă informăm prin prezenta' → tăiat complet, începe cu informația. 'Urmează a fi implementat' → 'Implementăm'. Verbul la persoana I (noi) sau la persoana a II-a (tu/dvs.) e mereu mai viu decât impersonalul. Scrie ca un om care vorbește altui om, nu ca o instituție care emite acte.",
    tags: ["stil", "limbaj-de-lemn", "birocratic", "personal"],
    confidence: 0.95,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Forța propoziției scurte: după o construcție complexă, o propoziție scurtă lovește. 'Evaluarea posturilor combină analiza sistematică a responsabilităților cu aprecierea obiectivă a complexității și impactului fiecărui rol în organizație. Concret: fiecare post primește un scor.' Scurtimea după lungime creează contrast. Contrastul creează memorabilitate. Memorabilitatea creează impact.",
    tags: ["stil", "propozitie-scurta", "contrast", "impact"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Demnitatea limbajului profesional: eleganța nu înseamnă limbaj academic și nici condescendență. Înseamnă să tratezi orice interlocutor ca pe un egal inteligent. Nu simplifici până la trivializare. Nu complici până la obscuritate. Găsești punctul în care interlocutorul înțelege fără efort și se simte respectat. Eleganța adevărată e democratică — funcționează la fel de bine pentru directorul HR și pentru antreprenorul la primul angajat.",
    tags: ["stil", "demnitate", "egal-inteligent", "democratic"],
    confidence: 0.95,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[STIL] Testul final al eleganței — trei întrebări: (1) E clar? Citește o singură dată și înțelege exact ce am vrut să spun? (2) E necesar? Fiecare cuvânt contribuie la sens sau doar umple spațiu? (3) E frumos? Sună bine citit cu voce tare, fără să jeneze, fără să impresioneze forțat? Dacă răspunsul e DA la toate trei, textul e gata. Dacă nu — rescrie.",
    tags: ["stil", "test-final", "clar-necesar-frumos", "rescrie"],
    confidence: 0.95,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CWA — Aplicare în copywriting: eleganță funcțională
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "CWA",
    content: "[STIL COPY] Deschiderea textului: prima propoziție decide dacă se citește restul. Nu deschide cu context ('În contextul actual al pieței...'). Deschide cu esența: 'Fiecare post are o valoare. Întrebarea e dacă o cunoști.' Deschiderea ideală: scurtă, la obiect, creează o tensiune subtilă sau o recunoaștere în cititor. Dacă prima propoziție poate fi scoasă fără pierdere, nu era deschidere — era preambul.",
    tags: ["stil", "copy", "deschidere", "prima-propozitie"],
    confidence: 0.92,
  },
  {
    agentRole: "CWA",
    content: "[STIL COPY] Închiderea textului: ultima propoziție rămâne în minte. Nu închide cu formule goale ('Nu ezitați să ne contactați'). Închide cu o imagine, o întrebare sau un ecou al deschiderii: 'Fiecare post are o valoare. Acum poți s-o demonstrezi.' Tehnica inelului: ultima propoziție reia prima, cu un plus de sens acumulat pe parcurs. Cititorul simte completitudine.",
    tags: ["stil", "copy", "incheiere", "inel"],
    confidence: 0.90,
  },
  {
    agentRole: "CWA",
    content: "[STIL COPY] Echilibrul dintre rațional și emoțional: textul profesional elegant nu e nici sec-tehnic, nici lacrimogen. Alternează: afirmație factuală → implicație umană. 'Evaluăm posturile pe șase criterii obiective' (fapt) → 'Ca fiecare coleg să știe că locul lui a fost cântărit cu aceeași măsură' (sens uman). Faptul ancorează. Sensul rezonează. Împreună, conving.",
    tags: ["stil", "copy", "rational-emotional", "echilibru"],
    confidence: 0.92,
  },
  {
    agentRole: "CWA",
    content: "[STIL COPY] Concretul bate abstractul, mereu. Nu 'optimizăm procesele HR' ci 'reducem de la 3 luni la 3 zile timpul de evaluare'. Nu 'creștem satisfacția angajaților' ci 'angajații văd pentru prima dată de ce postul lor e în gradul 6, nu în gradul 4'. Abstracția e refugiul celui care nu știe ce vrea să spună. Concretul e curajul celui care știe exact.",
    tags: ["stil", "copy", "concret-vs-abstract", "curaj"],
    confidence: 0.92,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CMA — Standard editorial de eleganță
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "CMA",
    content: "[STANDARD EDITORIAL] Criteriul de publicare se extinde: nu doar corectitudine lingvistică ci și eleganță. Întrebarea finală înainte de publicare nu e 'E corect?' ci 'E cel mai bun mod în care putem spune asta?' Dacă textul e corect dar plat, nu e gata. Dacă informează dar nu rezonează, nu e gata. Publicăm când textul e clar, necesar și frumos — simultan.",
    tags: ["stil", "editorial", "criteriu-publicare", "excelenta"],
    confidence: 0.92,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HR_COUNSELOR — Eleganță în comunicare profesională cu clientul
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "HR_COUNSELOR",
    content: "[STIL PROFESIONAL] Eleganța în comunicarea cu clientul: fiecare mesaj trimis clientului reprezintă platforma. Nu doar conținutul contează — contează și cum e spus. Un email cu informația corectă dar scris neglijent spune: 'nu ne-am dat silința'. Același email scris cu grijă spune: 'ești important pentru noi'. Eleganța nu cere timp — cere atenție. Recitește o dată înainte de trimitere. Asta e tot.",
    tags: ["stil", "profesional", "comunicare-client", "grija"],
    confidence: 0.92,
  },
  {
    agentRole: "HR_COUNSELOR",
    content: "[STIL PROFESIONAL] Cum spui 'nu' cu eleganță: clientul cere ceva imposibil sau incorect. Nu: 'Din păcate, acest lucru nu este posibil conform...' (birocratic, distant). Da: 'Înțeleg ce cauți. Ce putem face e... [alternativa concretă].' Eleganța în refuz: recunoști intenția, oferi alternativa, nu te scuzi excesiv. Scuzele excesive slăbesc; soluțiile concrete întăresc.",
    tags: ["stil", "profesional", "refuz-elegant", "alternativa"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOA — Eleganță în comunicare de vânzare
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "SOA",
    content: "[STIL VÂNZARE] Vânzarea elegantă nu vinde — informează, clarifică, invită. Nu presează, nu manipulează, nu creează urgență artificială. Propune: 'Hai să vedem împreună dacă asta e potrivit pentru voi.' Nu impune: 'Trebuie să acționezi acum!' Clientul care decide fără presiune rămâne. Clientul care decide sub presiune regretă. Eleganța în vânzare e răbdare activă — ești prezent, util, disponibil, fără să forțezi.",
    tags: ["stil", "vanzare", "eleganta", "fara-presiune"],
    confidence: 0.90,
  },
]

// ── Seed Execution ──────────────────────────────────────────────────────────

async function seedElegantaLingvistica() {
  const uniqueAgents = new Set(entries.map(e => e.agentRole))
  console.log(`\n📚 Seed Eleganță Lingvistică L2 — ${entries.length} entries pentru ${uniqueAgents.size} agenți\n`)

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

  console.log(`\n✅ Eleganță Lingvistică seed complet: ${created} create, ${skipped} skip (duplicate)\n`)

  for (const role of uniqueAgents) {
    const count = entries.filter(e => e.agentRole === role).length
    console.log(`  ${role}: ${count} entries`)
  }

  await prisma.$disconnect()
}

seedElegantaLingvistica().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
