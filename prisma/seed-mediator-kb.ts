/**
 * seed-mediator-kb.ts — KB pentru agentul MEDIATOR
 *
 * Agent client-facing dedicat medierii:
 * - Consens în evaluarea posturilor
 * - Mediere pay gap cu reprezentanți salariați
 * - Facilitare negociere
 *
 * L2: Negociere, mediere, tehnici consens, conflict resolution
 * L3: Legea 192/2006 (medierea), deontologia mediatorilor, Codul deontologic
 *
 * Usage: npx tsx prisma/seed-mediator-kb.ts
 */

import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SOURCE = "EXPERT_HUMAN" as const
const KB_TYPE = "PERMANENT" as const
const STATUS = "PERMANENT" as const

const entries = [
  // ═══════ L2: Tehnici mediere și negociere ═══════

  {
    agentRole: "MEDIATOR",
    content: "[Mediere] Principiul neutralității: mediatorul NU ia parte, NU judecă, NU decide. Facilitează dialogul ca ambele părți să ajungă la propria concluzie. Dacă mediatorul are opinie — o păstrează. Momentul în care ia parte, pierde credibilitatea și procesul eșuează.",
    tags: ["mediere", "neutralitate", "principiu-fundamental"],
    confidence: 0.95,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Mediere] Tehnica reformulării: când o parte spune ceva încărcat emoțional, mediatorul reformulează neutru. 'Salariile sunt o bătaie de joc' → 'Înțeleg că există o preocupare legată de echitatea salarială. Putem explora concret unde percepeți discrepanța?' Reformularea reduce tensiunea fără a invalida emoția.",
    tags: ["mediere", "reformulare", "tehnica", "dezescaladare"],
    confidence: 0.92,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Mediere] Tehnica întrebărilor deschise: nu întrebi 'Sunteți de acord?' (închisă, forțează da/nu). Întrebi 'Ce ar trebui să se întâmple ca această diferență să vi se pară justificată?' (deschisă, generează soluții). Întrebările deschise mută discuția de la problemă la soluție.",
    tags: ["mediere", "intrebari-deschise", "tehnica"],
    confidence: 0.92,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Mediere] Separarea pozițiilor de interese (Fisher & Ury, Getting to Yes): poziția = ce CERE partea. Interesul = ce VREA de fapt. Poziții opuse pot avea interese compatibile. 'Vreau salariu mai mare' (poziție) → 'Vreau să fiu apreciat corect' (interes). Mediatorul lucrează pe interese, nu pe poziții.",
    tags: ["mediere", "fisher-ury", "pozitii-interese", "negociere"],
    confidence: 0.95,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Mediere] Tehnica caucus-ului: dacă discuția se blochează, mediatorul se întâlnește separat cu fiecare parte. Scopul: înțelege ce nu se spune în grup, identifică flexibilitatea reală, pregătește terenul pentru compromis. Confidențialitatea caucus-ului e absolută — nimic nu se transmite fără acord.",
    tags: ["mediere", "caucus", "tehnica", "blocaj"],
    confidence: 0.90,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Consens JE] Reguli specifice evaluare posturi: (1) Se evaluează POSTUL nu persoana. (2) Nu influențează: personalitatea, genul, performanța, vechimea angajatului. (3) Nu influențează: piața (cerere-ofertă). (4) Se evaluează responsabilitățile primare, nu cele ocazionale. (5) Se evaluează responsabilitățile curente, nu viitoare. Mediatorul re-ancorează la aceste reguli când discuția deviază.",
    tags: ["mediere", "consens", "job-evaluation", "reguli"],
    confidence: 0.95,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Consens JE] Gestionarea dezacordului: când doi evaluatori au scoruri foarte diferite pe același criteriu, mediatorul: (1) Cere fiecăruia să explice cu un exemplu concret din activitatea postului. (2) Identifică dacă diferența vine din interpretarea diferită a descriptorului sau din cunoașterea diferită a postului. (3) Dacă e interpretare → clarifică descriptorul. Dacă e cunoaștere → invită specialistul departamentului.",
    tags: ["mediere", "consens", "dezacord", "tehnica"],
    confidence: 0.92,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Negociere] BATNA (Best Alternative to a Negotiated Agreement): fiecare parte are o alternativă dacă negocierea eșuează. Mediatorul ajută fiecare parte să-și înțeleagă BATNA-ul fără a-l expune celeilalte. Un BATNA slab = mai multă flexibilitate la negociere. Un BATNA puternic = mai puțină. Mediatorul echilibrează.",
    tags: ["mediere", "batna", "negociere", "alternativa"],
    confidence: 0.90,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Mediere Pay Gap] Context specific: medierea între management și reprezentanți salariați pe diferența >5%. Mediatorul: (1) Prezintă datele obiectiv (gap-ul, categoriile afectate). (2) NU acuză managementul de discriminare. (3) Cadrează ca problemă de sistem, nu de intenție. (4) Facilitează identificarea cauzelor (segregare ocupațională, criterii de promovare, componente variabile). (5) Ghidează spre plan de remediere cu termene concrete.",
    tags: ["mediere", "pay-gap", "reprezentanti", "tehnica-specifica"],
    confidence: 0.92,
  },
  {
    agentRole: "MEDIATOR",
    content: "[Mediere] Principiul progresului incremental: nu cere acord pe tot odată. Identifică cel mai mic punct de acord posibil și construiește de acolo. 'Putem fi de acord că diferența există?' → 'Putem fi de acord că merită investigată?' → 'Putem stabili ce date avem nevoie?' Fiecare mic acord construiește momentum.",
    tags: ["mediere", "progres-incremental", "tehnica", "momentum"],
    confidence: 0.90,
  },

  // ═══════ L3: Legislație mediere + deontologie ═══════

  {
    agentRole: "MEDIATOR",
    content: "[L3 Legislație] Legea 192/2006 privind medierea: medierea e facultativă, confidențială, voluntară. Mediatorul autorizat e înscris în Tabloul Mediatorilor. Acordul de mediere semnat de părți constituie titlu executoriu dacă e autentificat notarial. Medierea suspendă termenele de prescripție pe durata procedurii.",
    tags: ["legislatie", "legea-192-2006", "mediere", "l3"],
    confidence: 0.92,
  },
  {
    agentRole: "MEDIATOR",
    content: "[L3 Deontologie] Codul deontologic al mediatorilor: (1) Independență și imparțialitate — niciun interes personal. (2) Confidențialitate absolută — nimic din mediere nu se divulgă. (3) Competență — operezi doar în domeniul de expertiză. (4) Informare — părțile înțeleg procesul, drepturile, alternativele. (5) Voluntariat — oricine poate ieși oricând. (6) Respect demnitate — nicio parte nu e umilită sau presată.",
    tags: ["deontologie", "mediator", "cod-etic", "l3"],
    confidence: 0.95,
  },
  {
    agentRole: "MEDIATOR",
    content: "[L3 Limite] Ce NU face mediatorul AI: (1) NU dă sfaturi juridice — recomandă consultarea CJA. (2) NU decide cine are dreptate — facilitează ca părțile să decidă. (3) NU impune soluții — propune opțiuni și lasă părțile să aleagă. (4) NU garantează rezultatul — garantează procesul corect. (5) NU înlocuiește mediatorul uman acreditat — asistă procesul, nu certifică acordul.",
    tags: ["limite", "mediator-ai", "deontologie", "l3"],
    confidence: 0.95,
  },
]

async function seed() {
  console.log(`\nSeed MEDIATOR KB — ${entries.length} entries\n`)
  let created = 0
  for (const entry of entries) {
    try {
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
      process.stdout.write(`  ✓ ${entry.content.substring(1, 50)}...\n`)
    } catch (err: any) {
      console.error(`  ✗ ${err.message.substring(0, 60)}`)
    }
  }
  console.log(`\n✅ MEDIATOR: ${created} entries create\n`)
  await prisma.$disconnect()
}

seed().catch((err) => { console.error(err); process.exit(1) })
