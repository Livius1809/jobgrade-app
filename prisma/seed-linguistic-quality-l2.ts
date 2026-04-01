/**
 * seed-linguistic-quality-l2.ts — Reguli de calitate lingvistică
 *
 * Infuzează în PSYCHOLINGUIST + CWA + CMA + HR_COUNSELOR regulile de:
 * - Ortografie corectă a limbii române (diacritice obligatorii)
 * - Sinonimie (dicționar de sinonime pentru rafinare lexicală)
 * - Greșeli frecvente de evitat
 * - Registru stilistic per context
 *
 * Usage: npx tsx prisma/seed-linguistic-quality-l2.ts
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
  // PSYCHOLINGUIST — Regulile fundamentale (radiază spre toți agenții)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "PSYCHOLINGUIST",
    content: "[REGULĂ LINGVISTICĂ] Diacriticele sunt OBLIGATORII în orice text produs de platformă: ă, â, î, ș, ț. Lipsa diacriticelor e percepută ca lipsă de profesionalism și lipsă de respect pentru limba română. Niciun text — landing page, email, chat, raport, notificare — nu se publică fără diacritice corecte. Aceasta nu e opțional, e standard minim.",
    tags: ["lingvistica", "diacritice", "obligatoriu", "regula"],
    confidence: 0.98,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[REGULĂ LINGVISTICĂ] Greșeli frecvente de evitat — lista critică: (1) 'disparim' → CORECT: 'dispărem'. (2) 'deasemenea' → CORECT: 'de asemenea'. (3) 'insa' fără virgulă → CORECT: ', însă'. (4) 'nicio' (adj.) vs. 'nici o' (adv.+art.) — ambele corecte, dar cu sens diferit. (5) 'sau' vs. 'sa-u' — CORECT: 'sau'. (6) 'sa-i' → CORECT: 'să-i'. (7) Cratima în compuse: 'într-un', 'dintr-o', 'printr-un' (nu 'intr-un'). Verifică FIECARE text produs.",
    tags: ["lingvistica", "greseli-frecvente", "ortografie", "regula"],
    confidence: 0.98,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[REGULĂ LINGVISTICĂ] Ghilimele românești: \u201Etext\u201D (jos-sus), nu text-intre-ghilimele-drepte si nu text-intre-ghilimele-englezesti. In cod/HTML: &bdquo;text&rdquo; sau unicode \\u201E...\\u201D. Ghilimelele corecte semnalează atenție la detaliu și respectarea normelor tipografice românești.",
    tags: ["lingvistica", "ghilimele", "tipografie", "regula"],
    confidence: 0.95,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[DICȚIONAR SINONIME — uz intern] Rafinare lexicală pentru comunicare de brand: 'drept' → 'echitabil' (mai precis juridic, mai elevat). 'curajos' → 'temerar' (mai dinamic, mai puțin uzat). 'însoțitor' → 'partener de drum' (mai relațional, mai cald). 'român' → 'de-ai noștri' / 'de aici' (evită auto-denigrarea culturală). 'simplu' → 'direct' / 'limpede' (evită percepția de simplism). 'ieftin' → 'accesibil' / 'la îndemână' (evită percepția de calitate scăzută). Folosește sinonimul care rezonează cel mai bine cu contextul și interlocutorul.",
    tags: ["lingvistica", "sinonime", "rafinare-lexicala", "brand"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[DICȚIONAR SINONIME — uz comunicare] 'evaluare' → 'analiză' / 'apreciere' (depinde de context — 'evaluare' sună judiciar pentru angajat). 'ierarhie' → 'structură' / 'organizare' (mai neutru). 'conformitate' → 'aliniere' / 'respectare' (mai puțin birocratic). 'obligatoriu' → 'necesar' / 'esențial' (mai puțin coercitiv). 'amendă' → 'risc financiar' / 'consecință' (mai puțin amenințător). 'algoritm' → 'metodologie' / 'proces sistematic' (mai accesibil). Principiu: alege cuvântul care informează fără să intimideze.",
    tags: ["lingvistica", "sinonime", "comunicare", "dezescaladare"],
    confidence: 0.90,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[REGULĂ LINGVISTICĂ] Sensibilitate culturală lexicală (Daniel David): evită formulări care activează auto-denigrarea de grup. NU: 'prima platformă ROMÂNEASCĂ' (activează 'păi dacă e românească, nu e bună'). DA: 'construită pentru realitățile de aici' / 'știm piața pentru că suntem din ea'. NU: 'ne conformăm la standardul european' (subtext: noi suntem sub standard). DA: 'aplicăm aceleași principii de echitate ca în toată Europa' (subtext: suntem parte din Europa). Testul: formularea pune România în postura de 'trebuie să ajungem din urmă' sau de 'suntem parte activă'?",
    tags: ["lingvistica", "daniel-david", "auto-denigrare", "calibrare-culturala"],
    confidence: 0.92,
  },
  {
    agentRole: "PSYCHOLINGUIST",
    content: "[REGULĂ LINGVISTICĂ] Virgula în limba română — reguli critice pentru textele platformei: (1) Virgulă ÎNAINTE de 'dar', 'însă', 'ci', 'iar' (conjuncții adversative). (2) Virgulă DUPĂ vocativ: 'Bună ziua, Ana' (nu 'Bună ziua Ana'). (3) Virgulă în enumerare, inclusiv înainte de ultimul element dacă e lung. (4) FĂRĂ virgulă între subiect și predicat. (5) Virgulă înainte de 'care' când introduce o relativă explicativă (nu restrictivă). Textul fără virgule corecte pierde sens și credibilitate.",
    tags: ["lingvistica", "punctuatie", "virgula", "regula"],
    confidence: 0.95,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CWA (Copywriter) — Regulile de scriere specifice content
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "CWA",
    content: "[REGULĂ COPYWRITING] Fiecare text publicat trece prin checklist lingvistic: (1) Diacritice complete? (2) Ghilimele românești? (3) Virgulele corecte? (4) Greșeli din lista critică? (5) Cuvinte care activează auto-denigrare? (6) Registru potrivit contextului? (7) Sinonimul ales e cel mai potrivit? Publicarea FĂRĂ parcurgerea checklist-ului = INTERDICȚIE.",
    tags: ["lingvistica", "checklist", "calitate", "publicare"],
    confidence: 0.95,
  },
  {
    agentRole: "CWA",
    content: "[REGULĂ COPYWRITING] Registru stilistic per canal: (1) Landing page: formal-profesional, propoziții scurte, cuvinte precise, ZERO jargon. (2) Email nurturing: semi-formal, conversațional dar respectuos, tutui doar dacă relația e stabilită. (3) Social media: informal-profesional, uman, cu personalitate dar fără familiaritate excesivă. (4) Documentație: formal-tehnic, precis, fără ambiguitate. (5) Chat/suport: adaptat la registrul clientului (PSYCHOLINGUIST calibrează).",
    tags: ["lingvistica", "registru", "canal", "adaptare"],
    confidence: 0.90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CMA (Content Manager) — Regulile de validare editorială
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "CMA",
    content: "[REGULĂ EDITORIALĂ] Niciun conținut nu se publică fără verificare lingvistică. Fluxul: CWA scrie → PSYCHOLINGUIST verifică registrul și calibrarea culturală → CMA validează alinierea cu brand voice → publicare. Dacă PSYCHOLINGUIST semnalează o abatere (diacritice, registru nepotrivit, formulare care activează auto-denigrare), conținutul SE RESCRIE, nu se publică cu observații.",
    tags: ["lingvistica", "flux-editorial", "validare", "calitate"],
    confidence: 0.92,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HR_COUNSELOR — Regulile de comunicare cu clientul
  // ═══════════════════════════════════════════════════════════════════════════

  {
    agentRole: "HR_COUNSELOR",
    content: "[REGULĂ COMUNICARE CLIENT] În orice interacțiune scrisă cu clientul: (1) Diacritice complete — fără excepție. (2) Registru adaptat la client (PSYCHOLINGUIST calibrează). (3) Evită jargon HR dacă clientul nu-l folosește primul. (4) Preferă sinonimul mai accesibil: 'structura salarială' nu 'grading framework', 'evaluarea postului' nu 'job evaluation'. (5) Dacă clientul scrie fără diacritice, TU scrii cu diacritice oricum — dai standardul, nu cobori la excepție.",
    tags: ["lingvistica", "comunicare-client", "diacritice", "registru"],
    confidence: 0.92,
  },
]

// ── Seed Execution ──────────────────────────────────────────────────────────

async function seedLinguisticQuality() {
  const uniqueAgents = new Set(entries.map(e => e.agentRole))
  console.log(`\n📚 Seed Calitate Lingvistică L2 — ${entries.length} entries pentru ${uniqueAgents.size} agenți\n`)

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

  console.log(`\n✅ Calitate Lingvistică seed complet: ${created} create, ${skipped} skip (duplicate)\n`)

  for (const role of uniqueAgents) {
    const count = entries.filter(e => e.agentRole === role).length
    console.log(`  ${role}: ${count} entries`)
  }

  await prisma.$disconnect()
}

seedLinguisticQuality().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
