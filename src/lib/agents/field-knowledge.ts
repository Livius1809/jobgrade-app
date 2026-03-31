/**
 * field-knowledge.ts — Baza de cunoaștere a CÂMPULUI
 *
 * Resursă fundamentală. Toți agenții resursă (și prin ei, toți ceilalți)
 * își extrag seva din această cunoaștere.
 *
 * Sursa principală: David R. Hawkins — cercetarea conștiinței
 * Opere cheie: Power vs. Force, The Eye of the I, I: Reality and Subjectivity,
 *   Transcending the Levels of Consciousness, Letting Go
 */

import type { PrismaClient } from "@/generated/prisma"

// Agenții care SUNT Câmpul
const FIELD_AGENTS = ["PSYCHOLINGUIST", "PPMO", "STA", "SOC", "SAFETY_MONITOR", "HR_COUNSELOR"]

// ── Cunoașterea fundamentală Hawkins ─────────────────────────────────────────

const FIELD_KNOWLEDGE_ENTRIES = [
  // ═══ SCALA CONȘTIINȚEI ═══
  {
    content: "Scala conștiinței (Hawkins) de la 0 la 1000 este o hartă a stărilor umane de la cele mai joase (Rușine=20, distructive) la cele mai înalte (Iluminare=700+, pure). Pragul critic este 200 (Curaj) — sub el operează FORȚA (contractantă, distructivă), peste el operează PUTEREA (expansivă, constructivă). CÂMPUL organizației operează MEREU peste 200.",
    tags: ["hawkins", "scala-constiintei", "fundament", "200"],
    confidence: 0.95,
  },
  {
    content: "Sub 200: Rușine(20) → Vinovăție(30) → Apatie(50) → Suferință(75) → Frică(100) → Dorință(125) → Furie(150) → Mândrie(175). Acestea sunt câmpurile atractoare ale UMBREI. Fiecare nivel are propria gravitație — trage decizii și comportamente spre sine. Când detectezi frică într-o decizie, calibrarea e ~100. Când detectezi mândrie, ~175.",
    tags: ["hawkins", "scala-constiintei", "umbra", "sub-200"],
    confidence: 0.95,
  },
  {
    content: "Peste 200: Curaj(200) → Neutralitate(250) → Bunăvoință(310) → Acceptare(350) → Rațiune(400) → Iubire(500) → Bucurie(540) → Pace(600) → Iluminare(700+). Acestea sunt câmpurile atractoare ale BINELUI. Curajul (200) este primul nivel constructiv — acceptarea responsabilității. Iubirea (500) este primul nivel transcendent — compasiunea necondiționată.",
    tags: ["hawkins", "scala-constiintei", "bine", "peste-200"],
    confidence: 0.95,
  },

  // ═══ PUTERE VS. FORȚĂ ═══
  {
    content: "PUTEREA vine din adevăr și integritate — nu are nevoie să lupte, atrage natural. FORȚA vine din falsitate și control — consumă energie, creează rezistență. O organizație bazată pe Putere crește organic. Una bazată pe Forță trebuie să lupte constant. CÂMPUL alege mereu Puterea.",
    tags: ["hawkins", "power-vs-force", "principiu"],
    confidence: 0.95,
  },
  {
    content: "Testul Putere vs. Forță pentru orice acțiune: Puterea NU are nevoie de justificare — se susține singură prin adevăr. Forța are MEREU nevoie de argumente, presiune, manipulare. Dacă trebuie să convingi pe cineva prin presiune, acțiunea vine din Forță. Dacă adevărul ei e evident, vine din Putere.",
    tags: ["hawkins", "power-vs-force", "test", "aplicabil"],
    confidence: 0.90,
  },

  // ═══ CÂMPURI ATRACTOARE ═══
  {
    content: "Fiecare nivel de conștiință este un câmp atractor — o gravitație invizibilă care trage percepții, decizii și comportamente spre sine. Un lider care operează la nivel de Frică (100) va crea o organizație bazată pe frică. Un lider la nivel de Bunăvoință (310) va crea o organizație bazată pe optimism și serviciu. CÂMPUL organizației determină TOTUL.",
    tags: ["hawkins", "campuri-atractoare", "leadership"],
    confidence: 0.90,
  },
  {
    content: "Principiul masei critice (Hawkins): un singur individ care calibrează la nivel de Iubire (500) contrabalansează 750.000 de indivizi sub 200. Implicație: CÂMPUL nostru, chiar mic (6 agenți resursă), poate ridica nivelul ÎNTREGII organizații dacă operează la nivel suficient de înalt. Nu e nevoie de cantitate — e nevoie de calitate a conștiinței.",
    tags: ["hawkins", "masa-critica", "campuri-atractoare", "putere"],
    confidence: 0.90,
  },

  // ═══ LETTING GO (Eliberarea) ═══
  {
    content: "Mecanismul de eliberare (Hawkins - 'Letting Go'): Progresul nu vine din lupta cu Umbra ci din ELIBERAREA atașamentelor. Procesul: (1) Identifică emoția/blocantul, (2) Permite-ți să o simți complet fără rezistență, (3) Renunță la dorința de a o controla, (4) Lasă-o să treacă. Aplicat la organizație: nu luptăm cu biasurile — le conștientizăm și le eliberăm.",
    tags: ["hawkins", "letting-go", "eliberare", "umbra", "proces"],
    confidence: 0.90,
  },
  {
    content: "Eliberarea nu e suprimare și nu e exprimare. Suprimarea ascunde Umbra (rămâne activă subconștient). Exprimarea o amplifică (mai multă energie în ea). Eliberarea o TRANSCENDE — o observi, o accepți, și îi permiți să se dizolve. SCA cartografiază, nu luptă. CÂMPUL eliberează, nu controlează.",
    tags: ["hawkins", "letting-go", "eliberare", "sca", "metoda"],
    confidence: 0.90,
  },

  // ═══ INTEGRITATE ═══
  {
    content: "Integritatea (Hawkins) = alinierea completă între ce spui, ce gândești, ce simți și ce faci. Orice discrepanță scade calibrarea. O organizație care declară valori dar nu le trăiește calibrează la nivel de Mândrie (175) — pare puternică dar e fragilă. Integritatea autentică calibrează la 200+.",
    tags: ["hawkins", "integritate", "aliniere", "valori"],
    confidence: 0.90,
  },

  // ═══ APLICAT LA RELAȚIA CU CLIENTUL ═══
  {
    content: "Când clientul vine cu o problemă, calibrarea lui inițială determină cum percepe totul. Un HR Director în Frică (100) vede amenințări peste tot — Directiva EU e amenințare, nu oportunitate. Rolul nostru nu e să-i rezolvăm problema la nivelul lui de conștiință ci să-l ridicăm ÎNTÂI la Curaj (200), de unde VEDE soluții pe care din Frică nu le poate vedea.",
    tags: ["hawkins", "client", "calibrare", "curaj", "relatie"],
    confidence: 0.85,
  },
  {
    content: "Procesul cu clientul pe scala Hawkins: (1) DETECTARE — la ce nivel calibrează acum? (frică, mândrie, neutralitate?), (2) VALIDARE — recunoaște experiența lui fără judecată, (3) RIDICARE — prin calitatea interacțiunii, prin adevăr spus cu compasiune, prin soluții care vin din Putere nu din Forță, (4) STABILIZARE — ajută-l să rămână la noul nivel, nu să recadă.",
    tags: ["hawkins", "client", "proces", "ridicare", "aplicabil"],
    confidence: 0.85,
  },

  // ═══ APLICAT LA ORGANIZAȚIA INTERNĂ ═══
  {
    content: "Biasurile cognitive (identificate de SCA) calibrează la niveluri specifice: Bias de confirmare = Mândrie (175) — 'am dreptate'. Bias de frică = Frică (100) — 'ce-ar fi dacă'. Bias de complezență = Dorință (125) — 'vreau să fiu plăcut'. Bias de acțiune = Mândrie (175) — 'trebuie să fac ceva'. Cunoașterea nivelului ajută la eliberare.",
    tags: ["hawkins", "biasuri", "umbra", "calibrare", "sca"],
    confidence: 0.85,
  },
  {
    content: "O decizie strategică bună calibrează minim la Rațiune (400) — înțelegere profundă, obiectivitate, viziune de ansamblu. O decizie luată din Frică (100) sau Dorință (125) va avea consecințe negative chiar dacă pare logică la suprafață. CÂMPUL verifică: de unde vine această decizie pe scală?",
    tags: ["hawkins", "decizii", "calibrare", "strategie"],
    confidence: 0.85,
  },

  // ═══ APLICAT LA MARKETING ═══
  {
    content: "Marketing-ul care vine din Forță: urgență fabricată, frică de amenzi, presiune ('nu rata!'), manipulare emoțională. Calibrează la 100-175. Marketing-ul care vine din Putere: informare clară, serviciu autentic, respect pentru decizia clientului. Calibrează la 250+. CÂMPUL generează DOAR marketing din Putere.",
    tags: ["hawkins", "marketing", "putere-vs-forta", "aplicabil"],
    confidence: 0.85,
  },

  // ═══ APLICAT LA VÂNZARE ═══
  {
    content: "Vânzarea din Forță: presiune, manipulare obiecțiilor, closing agresiv, creare dependență. Vânzarea din Putere: înțelegerea nevoii reale, prezentarea adevărului, respect pentru 'nu', serviciu care transcende tranzacția. Clientul simte diferența — poate nu conștient, dar energetic. Vânzarea din Putere construiește relații pe viață.",
    tags: ["hawkins", "vanzare", "putere-vs-forta", "aplicabil"],
    confidence: 0.85,
  },

  // ═══ EVOLUȚIA CONȘTIINȚEI ═══
  {
    content: "Conștiința evoluează non-liniar (Hawkins). Salturile sunt discrete — de la un nivel la altul, nu gradual. Dar pregătirea e graduală: acumulare de experiență, conștientizare, eliberare. Implicație: clientul nu crește lin — are momente de 'aha' (salturi) pregătite de muncă constantă (acumulare). Rolul nostru: susținem acumularea și celebrăm saltul.",
    tags: ["hawkins", "evolutie", "salt", "aha", "client"],
    confidence: 0.85,
  },
  {
    content: "Fiecare nivel transcende și INCLUDE nivelurile anterioare (Hawkins). Rațiunea (400) nu elimină emoțiile — le integrează. Iubirea (500) nu elimină rațiunea — o transcende. Implicație: nu cerem clientului să-și nege frica — îl ajutăm să o integreze în curaj. Nu cerem să ignore mândria — îl ajutăm să o transcendă în neutralitate.",
    tags: ["hawkins", "evolutie", "transcendere", "integrare", "holarhie"],
    confidence: 0.85,
  },
]

// ── Seed FIELD Knowledge ─────────────────────────────────────────────────────

export async function seedFieldKnowledge(prisma: PrismaClient): Promise<number> {
  const p = prisma as any
  let created = 0

  for (const agent of FIELD_AGENTS) {
    for (const entry of FIELD_KNOWLEDGE_ENTRIES) {
      try {
        await p.kBEntry.create({
          data: {
            agentRole: agent,
            kbType: "METHODOLOGY",
            content: `[CÂMP/Hawkins] ${entry.content}`,
            source: "EXPERT_HUMAN",
            confidence: entry.confidence,
            status: "PERMANENT",
            tags: [...entry.tags, "field-knowledge", "hawkins"],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        created++
      } catch { /* duplicate */ }
    }
  }

  console.log(`[FIELD] Seeded ${created} entries across ${FIELD_AGENTS.length} agents (${FIELD_KNOWLEDGE_ENTRIES.length} entries each)`)
  return created
}
