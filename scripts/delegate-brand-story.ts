import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  // 1. Brainstorming departamental COCSA — povestea JobGrade
  const bs = await prisma.brainstormSession.create({
    data: {
      topic: "Povestea JobGrade — narativ unitar care atinge sufletul si mintea",
      context: JSON.stringify({
        brief_owner: [
          "JobGrade trebuie prezentat ca O POVESTE in pagina principala",
          "Landing page-urile desfasoara aceasta poveste despre evolutie comuna AI-oameni",
          "ORICE material scris cu amprenta JobGrade (website, reclama, email, comunicare agenti) trebuie sa duca gandirea clientului la ACEEASI POVESTE",
          "Povestea trebuie sa atinga SUFLETUL si MINTEA deopotriva",
          "Ancora: 'Incepem cu CINE alegi sa FII... Evoluam impreuna!'",
          "Subvariante coerente si penetrante",
          "Coerenta absoluta pe TOATE canalele",
        ],
        identitate_brand: {
          echipa: "Echipa mixta: 46 agenti AI + 2 psihologi (1 acreditat CPR psihologia muncii, atestat libera practica)",
          narativ_central: "Companie de psihologie organizationala care foloseste AI ca instrument, NU companie tech",
          sinergie: "Experienta umana (30+ ani) + precizie AI = mai mult decat suma partilor",
          filozofie: "Nu urmarim produsul ci procesul. Perfectam procesul si tragem piata spre evolutie",
          interfata: "Invizibila — clientul nu invata aplicatia, aplicatia il intelege",
          dialog: "Relevare cunoastere prin dialog. Primesti raspuns doar daca pui intrebarea potrivita",
          moral: "BINELE care sustine VIATA si se autopropaga. Profitul e consecinta, nu scop",
        },
        b2b_story: {
          client: "HR Manager/Owner companie RO, presat de Directiva EU transparenta salariala",
          problema: "Nu stie cum sa evalueze posturile corect, echitabil, conform cu legea",
          transformare: "De la haos salarial la structura clara, echitabila, demonstrabila",
          JobGrade: "Nu doar un tool — un partener care intelege, ghideaza, evolueaza cu tine",
        },
        b2c_story: {
          client: "Individ care simte ca poate mai mult dar nu stie exact ce sau cum",
          metafora: "Crisalida -> fluture -> zbor. Modelul onion: nucleu -> relatii -> profesie -> discernamant -> integrare",
          carduri: "6 carduri concentrice: Drumul catre mine, NOI, Rol profesional, Succes vs Valoare, Antreprenoriat transformational, Profiler",
          transformare: "De la 'nu stiu ca nu stiu' la 'stiu ca stiu' si apoi salt la nivelul urmator",
        },
        storytelling_tools: [
          "Hero's Journey (Campbell/Vogler) — clientul e eroul",
          "Sparkline (Duarte) — ce-este vs ce-ar-putea-fi",
          "Niemec — Positive Psychology at the Movies — viata ca film",
          "Calibrare lingvistica Daniel David — specific cultural RO",
          "Hawkins harta constiintei — nivelurile spiralei",
        ],
        cerinte_output: [
          "Povestea centrala (500-800 cuvinte) — narativul unitar",
          "Linii directoare comunicare — 10 reguli de coerenta",
          "Adaptari per canal: homepage, landing B2B, landing B2C, email, social, agenti AI",
          "Tagline principal + 5-7 subvariante coerente",
          "Tone of voice — ghid detaliat cu exemple DO/DON'T",
          "Structura homepage ca desfasurare de poveste (sectiuni cu flow narativ)",
          "Test coerenta: orice material trebuie sa raspunda la 'E aceeasi poveste?'",
        ],
        participanti: ["COCSA", "CMA", "CWA", "CDIA", "PSYCHOLINGUIST", "PPA", "ACEA", "COG"],
      }),
      level: "STRATEGIC",
      status: "GENERATING",
      initiatedBy: "COCSA",
      participantRoles: ["COCSA", "CMA", "CWA", "CDIA", "PSYCHOLINGUIST", "PPA", "ACEA", "COG"],
    },
  })
  process.stdout.write("Brainstorm poveste: " + bs.id + "\n")

  // 2. Propunere formala — implementare
  const proposal = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "Povestea JobGrade — narativ unitar + implementare pe toate canalele",
      description: [
        "COCSA + CMA + CWA + CDIA + PSYCHOLINGUIST + PPA + ACEA:",
        "",
        "TASK STRATEGIC: Concepeti povestea unitara JobGrade si implementati-o pe TOATE canalele.",
        "",
        "ANCORA: 'Incepem cu CINE alegi sa FII... Evoluam impreuna!'",
        "",
        "CERINTE:",
        "1. Povestea centrala (500-800 cuv) — narativul care leaga B2B si B2C intr-o singura viziune",
        "2. Linii directoare comunicare — 10 reguli de coerenta (orice material = aceeasi poveste)",
        "3. Structura homepage ca desfasurare narativa (nu ca lista de features)",
        "4. Landing B2B: povestea companiei care evolueaza (de la haos la echitate)",
        "5. Landing B2C: povestea individului care se descopera (crisalida -> zbor)",
        "6. Tagline principal + 5-7 subvariante penetrante, coerente",
        "7. Tone of voice ghid cu exemple DO/DONT",
        "8. Adaptari: email templates, social media, comunicare agenti AI",
        "9. Test coerenta: fiecare material trece filtrul 'E aceeasi poveste?'",
        "",
        "VALORI DE INTEGRAT:",
        "- Evolutie comuna AI-oameni (sinergie, nu inlocuire)",
        "- BINELE care sustine VIATA si se autopropaga",
        "- Interfata invizibila — aplicatia te intelege",
        "- Dialog-centric — relevare prin conversatie, nu prin meniuri",
        "- Echipa mixta: precizie AI + caldura si experienta umana",
        "- Psihologie organizationala reala (CPR), nu buzzword",
        "",
        "STORYTELLING FRAMEWORK:",
        "- Campbell Hero's Journey: clientul e eroul",
        "- Duarte Sparkline: ce-este vs ce-ar-putea-fi",
        "- Niemec: viata ca film, strengths ca superpowers",
        "- Daniel David: calibrare culturala RO",
        "",
        "LIVRABIL: Document complet + implementare concreta pe fiecare canal + test coerenta.",
      ].join("\n"),
      rationale: "Owner solicita narativ unitar care atinge sufletul si mintea, coerent pe TOATE canalele, ancorat in 'Incepem cu CINE alegi sa FII... Evoluam impreuna!'",
      changeSpec: {
        action: "BRAND_STORY",
        assignTo: ["COCSA", "CMA", "CWA", "CDIA", "PSYCHOLINGUIST", "PPA", "ACEA"],
        deadline: "2026-04-15",
        priority: "HIGH",
      },
    },
  })
  process.stdout.write("Propunere implementare: " + proposal.id + "\n")

  await prisma.$disconnect()
  process.stdout.write("\nDONE — brainstorm + propunere create. COCSA coordoneaza.\n")
}

main()
