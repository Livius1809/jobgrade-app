import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  // 1. ACEA + CIA — Monitorizare legislativă continuă
  const p1 = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "Monitorizare legislativa continua — transparenta salariala + AI Act + altele",
      description: [
        "ACEA + CIA + CJA:",
        "",
        "TASK PERMANENT: Tineti-ne la curent cu evolutia legislatiei care ne afecteaza.",
        "Aceasta NU e o sarcina punctuala — e un mandat CONTINUU.",
        "",
        "=== 1. LEGEA TRANSPARENTEI SALARIALE (transpunere Directiva EU 2023/970) ===",
        "",
        "Investigati si raportati (SURSE PRIMARE DOAR):",
        "- Stadiul actual al proiectului de lege in Parlamentul Romaniei",
        "- A trecut de Camera Deputatilor? Senat? Comisii?",
        "- Cand se estimeaza promulgarea de catre Presedinte?",
        "- Cand va fi publicata in Monitorul Oficial? (de ATUNCI produce efecte)",
        "- Are NORME DE APLICARE? Cine le elaboreaza? Termen?",
        "- Ce INSTITUTII vor veghea la aplicarea ei? (ITM? CNCD? altele?)",
        "- Ce contin NORMELE DE CONTROL? Ce verifica inspectorii?",
        "- Ce SANCTIUNI prevede pentru neconformitate?",
        "- Exista GHIDURI de aplicare emise de institutii? (MMSS, ITM)",
        "- Exista DEZBATERI PUBLICE in curs? Unde? Cine participa?",
        "",
        "Surse: cdep.ro, senat.ro, legislatie.just.ro, monitoruloficial.ro, mmuncii.ro, itm.gov.ro",
        "",
        "=== 2. AI ACT — IMPLEMENTARE IN ROMANIA ===",
        "",
        "Investigati si raportati (SURSE PRIMARE DOAR):",
        "",
        "A) Structura interministeriala infiintata in 2024:",
        "- Ce structura este? (OUG 155/2024 — cadrul national AI)",
        "- Cine face parte? Ce ministere?",
        "- Ce mandat are? Ce a produs pana acum?",
        "- Are un calendar de lucru public?",
        "- A emis ghiduri, recomandari, interpretari?",
        "",
        "B) Orizont de finalizare:",
        "- Cand devine AI Act pe deplin aplicabil in Romania? (2 august 2026 — confirmat?)",
        "- Exista etape intermediare inainte de august 2026?",
        "- Ce obligatii sunt deja active? (ex: practici interzise Art. 5 — de la 2 feb 2025)",
        "",
        "C) Audit si conformitate:",
        "- CINE va face auditul AI Act in Romania? Ce autoritate?",
        "- Exista deja auditori acreditati? Unde? Cat costa?",
        "- Ce STANDARDE de audit se aplica? (ISO? Standarde UE specifice?)",
        "- Exista o lista de auditori recunoscuti?",
        "",
        "D) Implementare practica:",
        "- Cum se va implementa concret pentru companii romanesti?",
        "- Ce documente trebuie pregatite?",
        "- Exista REGISTRU de sisteme AI cu risc ridicat? Cine il gestioneaza?",
        "- Ce experienta au alte tari UE? (comparatie cu Germania, Franta, etc.)",
        "",
        "Surse: eur-lex.europa.eu, gov.ro, sgg.gov.ro, ancom.ro, adr.gov.ro, mcid.gov.ro",
        "NU surse de presa. NU opinii. FAPTE + DOCUMENTE OFICIALE.",
        "",
        "=== 3. ALTE LEGISLATII RELEVANTE — MONITORIZARE CONTINUA ===",
        "",
        "Urmariti si semnalati orice evolutie pe:",
        "- GDPR: decizii ANSPDCP, interpretari EDPB, jurisprudenta CJUE",
        "- NIS2 (securitate cibernetica): transpunere RO, termen, obligatii",
        "- ePrivacy (cookies, comunicari electronice): stadiu UE",
        "- Codul Muncii: modificari in discutie",
        "- Legislatie profesii reglementate (CPR, CECCAR): modificari",
        "- Directiva raspundere AI: stadiu UE, timeline transpunere",
        "",
        "=== FORMAT RAPORTARE ===",
        "",
        "Pentru fiecare legislatie monitorizata, raportul trebuie sa contina:",
        "1. STADIU ACTUAL — cu sursa si data informatiei",
        "2. TIMELINE — ce urmeaza si cand",
        "3. IMPACT PE JOBGRADE — ce trebuie sa facem noi concret",
        "4. ACTIUNI RECOMANDATE — prioritizate",
        "5. NIVEL INCREDERE — CERT / PROBABIL / POSIBIL / SPECULATIV",
        "",
        "Frecventa: RAPORT INITIAL in 7 zile, apoi ACTUALIZARI la fiecare 2 saptamani.",
        "ALERTE IMEDIATE la orice modificare legislativa cu impact direct.",
        "",
        "LIVRABIL INITIAL: Raport complet pe cele 2 subiecte principale (transparenta salariala + AI Act) + punct de vedere ACEA+CIA+CJA.",
      ].join("\n"),
      rationale: "Owner solicita monitorizare legislativa continua cu accent pe transparenta salariala si AI Act implementare Romania. Surse primare exclusiv.",
      changeSpec: {
        action: "LEGISLATIVE_MONITORING",
        assignTo: ["ACEA", "CIA", "CJA"],
        deadline: "2026-04-10",
        recurrence: "biweekly",
        priority: "HIGH",
      },
    },
  })
  process.stdout.write("1. " + p1.title + "\n")

  await prisma.$disconnect()
  process.stdout.write("\nDONE — mandat monitorizare legislativa delegat la ACEA + CIA + CJA\n")
}

main()
