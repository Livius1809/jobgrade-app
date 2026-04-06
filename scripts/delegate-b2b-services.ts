import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

const CADRU_GENERAL = `
=== CADRU GENERAL PENTRU TOATĂ ECHIPA ===

JobGrade evoluează de la o platformă de evaluare POSTURI la un ecosistem complet de transformare organizațională.

VIZIUNEA: 4 servicii noi B2B se adaugă la cele existente (JE, Pay Gap, Benchmark, Conformitate):
1. Evaluare PERSONAL + armonizare echipe
2. Management echipe multigeneraționale + mixte HU-AI
3. Armonizare PROCESE + Manual de calitate
4. Cultură organizațională + performanță economică

CUM SE LEAGĂ:
- Serviciile existente evaluează POSTURILE
- Serviciile noi evaluează OAMENII în posturi, ECHIPELE, PROCESELE și CULTURA
- Datele circulă între toate: fișele de post alimentează procesele, procesele reflectă cultura, cultura influențează echipele, echipele execută procesele
- Pachetul S3+S4 = transformare organizațională completă (premium)
- Puntea B2B↔B2C: angajatul care vrea dezvoltare personală → platforma B2C

ECHIPA MIXTĂ: 48 agenți AI + 2 psihologi (1 acreditat CPR). Vorbim din experiență — suntem noi înșine o echipă mixtă HU-AI funcțională.

PRINCIPII:
- "Fiecare parte primește gratuit ce-l aduce la masă, plătește ce-l ajută să câștige"
- Povestea unitară: "Începem cu CINE alegi să FII... Evoluăm împreună!"
- Organizația = organism viu adaptativ, nu mașină statică
- Calibrare culturală RO (Daniel David) — nu import occidental naiv

UNDE SUNT NELĂMURIRI: Semnalați. Dezbaterea clarifică. Din discuții înțelegem cu toții mai mult.

Referințe complete: docs/situatie-completa-b2b-b2c-03apr2026.md
`

async function main() {
  // 1. Propunere S1 — Evaluare personal
  const p1 = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "S1 — Design detaliat + pricing: Evaluare personal și armonizare echipe",
      description: [
        CADRU_GENERAL,
        "=== TASK SPECIFIC S1 ===",
        "",
        "PMA B2B + HR_COUNSELOR + PPMO + MGA + PPA + PSYCHOLINGUIST:",
        "",
        "Concepeți designul detaliat + pricing pentru Serviciul 1.",
        "",
        "CE FACE S1:",
        "- Baterie instrumente psihometrice per post (Herrmann HBDI gratuit — Owner are licență, VIA gratuit, altele prin contracte furnizori terți)",
        "- JobGrade = responsabilitatea coerenței instrumentarului și acurateței rapoartelor",
        "- Evaluare compatibilitate RESURSE ANGAJAT ↔ CERINȚE POST",
        "- Comparare cu: fișa postului (JE), evaluare 6 criterii, grila salarială (benchmark)",
        "",
        "3 NIVELURI DISEMINARE:",
        "Nivel 1 (ANGAJAT): ce poate face EL prin efort personal. Conectare cu B2C pentru dezvoltare.",
        "Nivel 2 (HR/Management): ce trebuie să facă COMPANIA. Training, ajustări rol, plan carieră.",
        "Nivel 3 (ECHIPĂ): ce trebuie să facă MANAGERUL. Harta competențe echipă, perechi optimale, recomandări leadership.",
        "",
        "ÎNTREBĂRI DE DEZBĂTUT:",
        "- Ce instrumente psihometrice sunt cele mai potrivite per nivel de complexitate post?",
        "- Cum structurăm raportul Nivel 3 (echipă) ca să fie acționabil de manager în 30 min?",
        "- Cum facem tranziția naturală de la Nivel 1 (angajat) spre B2C fără a fi intruzivi?",
        "- Ce pricing per nivel de complexitate? (entry vs. mid vs. executive)",
        "- Cum pachetizăm cu serviciile existente (JE + S1 = ofertă integrată)?",
        "",
        "LIVRABIL: Document design + pricing + integrare cu servicii existente.",
      ].join("\n"),
      rationale: "Serviciu nou B2B confirmat de Owner. Extindere naturală de la evaluare posturi la evaluare personal.",
      changeSpec: { action: "SERVICE_DESIGN", service: "S1", assignTo: ["PMA", "HR_COUNSELOR", "PPMO", "MGA", "PPA", "PSYCHOLINGUIST"], deadline: "2026-04-18" },
    },
  })
  process.stdout.write("1. " + p1.title + "\n")

  // 2. Propunere S2 — Management multigenerațional
  const p2 = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "S2 — Design detaliat + pricing: Management echipe multigeneraționale HU-AI",
      description: [
        CADRU_GENERAL,
        "=== TASK SPECIFIC S2 ===",
        "",
        "PMA B2B + MGA + PPMO + SOC + PSE + ACEA + SVHA:",
        "",
        "Concepeți designul detaliat + pricing pentru Serviciul 2.",
        "",
        "CE FACE S2:",
        "- Analizează REZULTANTA din 5 factori: cultura de origine × vârstă (Erikson) × generație × cultură organizațională × personalitate manager",
        "- Generează 3 rapoarte specifice:",
        "  Raport Manager: echipa ta vs. performantă + stilul TĂU vs. optim pentru ECHIPA ASTA",
        "  Raport HR: ce face organizația + training + restructurare + plan 30/60/90 zile",
        "  Raport Manager Superior: cum creează CADRUL de manifestare ca echipa să performeze",
        "- Include integrare HU-AI: ce preia AI, ce rămâne uman, plan tranziție",
        "",
        "DIFERENȚIATOR UNIC: Noi operăm DEJA ca echipă mixtă HU-AI (48 agenți + 2 psihologi). Vorbim din experiență reală.",
        "",
        "ÎNTREBĂRI DE DEZBĂTUT:",
        "- Cum măsurăm concret cei 5 factori fără a copleși clientul cu chestionare?",
        "- Raportul pentru manager superior: cum îl formulăm ca să nu pară critică la adresa managerului?",
        "- Cum integrăm componenta HU-AI fără a speria companiile tradiționale?",
        "- PSE: cum aplicăm psihologia vârstelor (Erikson) practic, nu academic?",
        "- ACEA: ce date avem despre distribuția generațională pe piața RO (surse primare)?",
        "- Ce pricing? E un serviciu recurent (monitorizare) sau one-shot?",
        "",
        "LIVRABIL: Document design + pricing + diferențiatori față de competiție.",
      ].join("\n"),
      rationale: "Serviciu nou B2B confirmat de Owner. Diferențiator unic: experiență proprie echipă mixtă HU-AI.",
      changeSpec: { action: "SERVICE_DESIGN", service: "S2", assignTo: ["PMA", "MGA", "PPMO", "SOC", "PSE", "ACEA", "SVHA"], deadline: "2026-04-18" },
    },
  })
  process.stdout.write("2. " + p2.title + "\n")

  // 3. Propunere S3 — Procese + Manual calitate
  const p3 = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "S3 — Design detaliat + pricing: Armonizare procese + Manual calitate (PREMIUM)",
      description: [
        CADRU_GENERAL,
        "=== TASK SPECIFIC S3 (SERVICIU PREMIUM) ===",
        "",
        "PMA B2B + DOAS + DOA + MGA + CJA + STA + ACEA:",
        "",
        "Concepeți designul detaliat + pricing pentru Serviciul 3. ATENȚIE: acesta e serviciu PREMIUM.",
        "",
        "CE FACE S3:",
        "- Extrage procese din fișele de post pe modelul FURNIZOR → PROCES → CLIENT",
        "- Recomandări per poziție bazate pe subfactorii JE (6 criterii per nod de proces)",
        "- Dacă introduce fișa angajatului: FLAG-URI DISCREPANȚĂ cu recomandări remediere",
        "- Calcul impact per subproces + cascadă + impact client final",
        "",
        "KILLER FEATURE — SIMULATORUL DE IMPACT:",
        "- Schimbă angajat pe poziție → vezi impact instant pe proces",
        "- Poziție vacantă → vezi COSTUL REAL (nu salariul economisit, ci distorsiunea procesului)",
        "- Schimbă organigrama sau statul de funcții → vezi cum se reconfigurează totul",
        "",
        "MANUAL CALITATE = suma proceselor principale + auxiliare + SOP + KPI + RACI, ISO-compatible",
        "VALIDARE prin comisie mediată AI (ca la JE) + validare finală oameni",
        "",
        "DE CE E PREMIUM: Consultanți cer 50K-200K EUR pentru audit procese (durează luni). Noi extragem din datele DEJA EXISTENTE (fișe post, JE) și livrăm în zile.",
        "",
        "ÎNTREBĂRI DE DEZBĂTUT:",
        "- DOAS: cum modelăm procesul furnizor-client din responsabilitățile din fișe? Ce algoritm de extracție?",
        "- DOA: cum vizualizăm harta proceselor ca să fie intuitivă pentru non-tehnici?",
        "- CJA: ce cerințe ISO sunt obligatorii vs. nice-to-have pentru IMM-uri RO?",
        "- STA: cum calculăm impactul cascadă? Ce model statistic?",
        "- Simulatorul: ce parametri permitem să schimbe? Cât de granular?",
        "- Pricing: cum prețuim diferit per dimensiune companie? (50 angajați vs. 500)",
        "- Cum pachetizăm cu S4 (cultură) ca ofertă premium integrată?",
        "",
        "LIVRABIL: Document design tehnic + UX simulator + pricing + pachetizare cu S4.",
      ].join("\n"),
      rationale: "Serviciu PREMIUM B2B confirmat de Owner. Killer feature: simulator impact din date existente.",
      changeSpec: { action: "SERVICE_DESIGN", service: "S3", assignTo: ["PMA", "DOAS", "DOA", "MGA", "CJA", "STA", "ACEA"], deadline: "2026-04-20", priority: "HIGH" },
    },
  })
  process.stdout.write("3. " + p3.title + "\n")

  // 4. Propunere S4 — Cultură + performanță
  const p4 = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "S4 — Design detaliat + pricing: Cultură organizațională + performanță economică",
      description: [
        CADRU_GENERAL,
        "=== TASK SPECIFIC S4 ===",
        "",
        "PMA B2B + SCA + PPMO + SOC + MGA + ACEA + PSYCHOLINGUIST + PSE:",
        "",
        "Concepeți designul detaliat + pricing pentru Serviciul 4.",
        "",
        "PRINCIPIU: Organizația = organism viu adaptativ. Învățare continuă → adaptare → performanță.",
        "Unde NU există cultură construită conștient, funcționarea se face pe cultura de origine a angajaților (care NU au aceeași reprezentare mentală).",
        "",
        "CE FACE S4:",
        "- Profil organizațional pe 7+ dimensiuni (valori, leadership, învățare, comunicare, adaptabilitate, coeziune, performanță)",
        "- Raportare la cultura națională RO (Daniel David, Hofstede, GLOBE) — discrepanțe",
        "- Propagare măsuri corective: TOP-DOWN + TRANSVERSAL",
        "  - Strategic (top management): viziune, walk the talk",
        "  - Tactic (middle management): traducere în practici zilnice",
        "  - Operațional (echipe): ritualuri, norme, învățare",
        "  - Individual (angajat): asumare, dezvoltare (→ B2C)",
        "  - Cross-funcțional: colaborare inter-departamentală",
        "- Calcul ROI cultură: cost cultura actuală vs. beneficiu cultura țintă",
        "",
        "SE LEAGĂ CU S3 (procese): cultura se manifestă ÎN procese. S3 arată CUM funcționezi, S4 arată DE CE.",
        "PACHET PREMIUM S3+S4: CUM + DE CE + CUM SCHIMBI + CÂT COSTĂ SĂ NU SCHIMBI",
        "",
        "ÎNTREBĂRI DE DEZBĂTUT:",
        "- SCA: cum facem auditul Umbra (valori declarate vs. practicate) fără a antagoniza managementul?",
        "- SOC: ce specificități culturale RO sunt PÂRGHII (ajută) vs. FRÂNE (încetinesc)? Date concrete.",
        "- ACEA: ce date avem despre Hofstede RO actualizate? GLOBE study RO?",
        "- MGA: cum integrăm Deming (PDCA) cu transformarea culturală? Iterativ, nu big-bang.",
        "- PSYCHOLINGUIST: cum se exprimă cultura în limbajul intern? Ce analizăm?",
        "- PSE: cum construim sisteme de învățare continuă adaptate la cultura RO?",
        "- Cum demonstrăm ROI-ul CONCRET al culturii? (turnover, productivitate, absenteism — formule)",
        "- Pricing: serviciu recurent (monitorizare trimestrială) + one-shot (audit inițial)?",
        "",
        "LIVRABIL: Document design + pricing + pachetizare cu S3 + model ROI cultură.",
      ].join("\n"),
      rationale: "Serviciu B2B confirmat de Owner. Cultura = invizibil dar omniprezent. ROI demonstrabil.",
      changeSpec: { action: "SERVICE_DESIGN", service: "S4", assignTo: ["PMA", "SCA", "PPMO", "SOC", "MGA", "ACEA", "PSYCHOLINGUIST", "PSE"], deadline: "2026-04-20" },
    },
  })
  process.stdout.write("4. " + p4.title + "\n")

  // 5. Propunere punte B2B — job description strategic
  const p5 = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "Punte B2B↔B2C: Recomandări Job Description cu scop strategic (fit vs. agent schimbare)",
      description: [
        CADRU_GENERAL,
        "=== TASK SPECIFIC — JOB DESCRIPTION STRATEGIC ===",
        "",
        "PMA + HR_COUNSELOR + MGA + PPMO + SCA:",
        "",
        "Concepeți mecanismul de recomandare job description cu scop strategic.",
        "",
        "CÂND CLIENTUL B2B PUBLICĂ UN POST, îi oferim 2 VARIANTE:",
        "",
        "Opțiunea 1 — FIT CULTURAL:",
        "- Job description calibrat pe cultura organizațională existentă",
        "- Profil candidat aliniat cu echipa, valorile, stilul actual",
        "- Integrare rapidă, risc minim conflict",
        "- Potrivit când echipa funcționează bine",
        "",
        "Opțiunea 2 — AGENT AL SCHIMBĂRII:",
        "- Job description calibrat pe CE LIPSEȘTE (proces, echipă, cultură)",
        "- Candidatul devine catalizator: îmbunătățește procesul, grupul, organizația, cultura",
        "- Datele vin din S1-S4 (știm ce lipsește concret)",
        "- Potrivit când echipa stagnează sau cultura trebuie transformată",
        "",
        "Matching-ul B2C se face pe varianta aleasă → candidat potrivit INTENȚIEI, nu doar postului.",
        "",
        "ÎNTREBĂRI DE DEZBĂTUT:",
        "- Cum prezentăm cele 2 opțiuni fără a sugera că cultura actuală e 'proastă'?",
        "- Ce date din S1-S4 alimentează concret varianta 'agent al schimbării'?",
        "- Cum influențează alegerea matching-ul cu candidații B2C?",
        "",
        "LIVRABIL: Mecanism de generare 2 variante + integrare în fluxul de recrutare.",
      ].join("\n"),
      rationale: "Puntea B2B↔B2C devine matching cu SCOP STRATEGIC. Confirmat de Owner.",
      changeSpec: { action: "SERVICE_DESIGN", service: "BRIDGE", assignTo: ["PMA", "HR_COUNSELOR", "MGA", "PPMO", "SCA"], deadline: "2026-04-18" },
    },
  })
  process.stdout.write("5. " + p5.title + "\n")

  // 6. Brainstorming departamental — dezbatere servicii noi
  const bs = await prisma.brainstormSession.create({
    data: {
      topic: "Dezbatere servicii noi B2B (S1-S4) — nelămuriri, idei, integrare",
      context: JSON.stringify({
        cadru: "JobGrade extinde oferta B2B cu 4 servicii noi. Fiecare echipă primește propunere specifică. Acest brainstorming e spațiul de DEZBATERE — întrebări, nelămuriri, idei de îmbunătățire.",
        servicii: {
          S1: "Evaluare personal + armonizare echipe (baterie psihometrică, 3 niveluri diseminare)",
          S2: "Management multigenerațional HU-AI (5 factori rezultantă, 3 rapoarte)",
          S3: "Armonizare procese + Manual calitate (PREMIUM — simulator impact, furnizor-client)",
          S4: "Cultură organizațională + performanță economică (organism viu, ROI demonstrabil)",
          BRIDGE: "Job description strategic (fit cultural vs. agent schimbare)",
        },
        intrebari_transversale: [
          "Cum se alimentează serviciile între ele? Ce date circulă?",
          "Ce secvență recomandăm clientului? (S1 înainte de S2? S3+S4 împreună?)",
          "Cum pachetizăm? (individual, bundle 2, bundle complet)",
          "Ce nu am gândit? Ce lipsește? Ce e redundant?",
          "Cum se leagă de B2C practic? (angajatul trece pe platforma personală)",
          "Ce resurse L2 lipsesc pentru aceste servicii?",
          "Cum ne diferențiem de competiție pe fiecare serviciu?",
        ],
        regula: "Din discuții înțelegem cu toții mai mult. Semnalați orice nelămurire. Dezbaterea clarifică.",
      }),
      level: "TACTICAL",
      status: "GENERATING",
      initiatedBy: "COG",
      participantRoles: ["COG", "PMA", "HR_COUNSELOR", "MGA", "PPMO", "SOC", "SCA", "DOAS", "DOA", "CJA", "STA", "ACEA", "PSYCHOLINGUIST", "PPA", "PSE", "SVHA"],
    },
  })
  process.stdout.write("\n6. Brainstorm dezbatere: " + bs.id + "\n")

  await prisma.$disconnect()
  process.stdout.write("\nDONE — 5 propuneri + 1 brainstorm dezbatere. Fiecare echipă are cadrul general + task-ul specific + întrebări de dezbătut.\n")
}

main()
