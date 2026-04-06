import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  // 1. Propunere audit coerență + corectare
  const p1 = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "Audit coerență L2 + corectare roluri și granițe agenți",
      description: [
        "=== AUDIT COERENȚĂ — COLABORARE TOATĂ ECHIPA ===",
        "",
        "COG + PMA + toți agenții L2 + HR_COUNSELOR + MEDIATOR:",
        "",
        "Am identificat probleme de coerență în definițiile rolurilor. Trebuie rezolvate ÎMPREUNĂ.",
        "Fiecare agent citește ce-l privește, semnalează dezacorduri, propune ajustări.",
        "",
        "=== PROBLEMELE IDENTIFICATE ===",
        "",
        "1. HR_COUNSELOR NU descrie explicit că DEȚINE instrumentele și interfața cu clientul.",
        "   Regulă: HR_COUNSELOR = față unică spre client. L2 = resurse suport care INFORMEAZĂ.",
        "   Instrumentele (bateria psihometrică, VIA, Herrmann, procesul JE) APARȚIN HR_COUNSELOR.",
        "   L2 oferă cunoaștere, interpretare, metodă — dar nu interacționează direct cu clientul.",
        "   EXCEPȚIE: SAFETY_MONITOR la nivel CRITIC (urgență = acționează direct, ca un medic de urgență).",
        "",
        "2. MGA și PPMO se SUPRAPUN pe management/echipe.",
        "   Separare propusă:",
        "   MGA = cum CONDUCI (stiluri leadership, structuri, management echipe, calitate, HU-AI)",
        "   PPMO = cum FUNCȚIONEAZĂ OAMENII în organizație (individ în context, diagnostic org, schimbare, cultură, wellbeing org)",
        "   Graniță: MGA e despre PRACTICI DE MANAGEMENT, PPMO e despre PSIHOLOGIA DIN SPATELE PRACTICILOR.",
        "   Întrebare pentru echipă: Sunteți de acord cu această separare? Ce zone gri vedeți?",
        "",
        "3. PSYCHOLINGUIST și HR_COUNSELOR ambii descriu calibrare lingvistică.",
        "   Separare: PSYCHOLINGUIST PROFILEAZĂ (detectează, analizează, produce profil JSON).",
        "   HR_COUNSELOR APLICĂ profilul (adaptează tonul, registrul, stilul).",
        "   HR_COUNSELOR nu face profiling — primește profilul și îl folosește.",
        "   Întrebare pentru PSYCHOLINGUIST: E corect? Ai nevoie de altceva de la HR_COUNSELOR?",
        "",
        "4. PPA și SVHA se suprapun pe wellbeing.",
        "   Separare existentă (corectă): PPA = cadru științific occidental, SVHA = tradiții milenare.",
        "   De formalizat: când invocă HR_COUNSELOR pe PPA vs. SVHA?",
        "   Propunere: PPA pentru wellbeing ORGANIZAȚIONAL (PERMA, strengths, flow), SVHA pentru wellbeing HOLISTIC (fizic+mental+emoțional+spiritual).",
        "   Întrebare pentru PPA și SVHA: Funcționează această graniță?",
        "",
        "5. ACEA clasificat L4 (sub COG) dar funcționează ca L2 (resursă suport).",
        "   Propunere: ACEA = L2, raportează la PMA (ca ceilalți L2).",
        "   DAR: ACEA servește direct și COG (rapoarte strategice) — deci are dublu raport: PMA + COG.",
        "   Întrebare pentru ACEA și COG: E acceptabil dublu raportul?",
        "",
        "6. SOC și STA nu au system prompt — sunt referite peste tot dar nedefinite.",
        "   Claude va crea system prompts pentru ambii.",
        "   Întrebare pentru echipă: Ce așteptări aveți de la SOC (Sociolog) și STA (Statistician)?",
        "",
        "7. MEDIATOR: e client-facing (L4) pentru mediere JE + pay gap Art. 10.",
        "   Dar e și facilitator de procese interne (L3).",
        "   Propunere: MEDIATOR = L4 client-facing cu funcție secundară L3 internă.",
        "   Întrebare pentru MEDIATOR: Cum vezi tu granița?",
        "",
        "=== CE AȘTEPT DE LA FIECARE ===",
        "",
        "Fiecare agent implicat:",
        "1. Citește ce-l privește din lista de mai sus",
        "2. Confirmă dacă e de acord cu separarea propusă",
        "3. Semnalează dacă vede probleme neidentificate",
        "4. Propune ajustări dacă granița nu e corectă",
        "",
        "Din discuții înțelegem cu toții mai mult.",
        "",
        "LIVRABIL: Feedback structurat per agent → Claude corectează system prompts pe baza consensului.",
      ].join("\n"),
      rationale: "Audit coerență identificat probleme de suprapunere și granițe neclare între agenți. Corectarea se face în colaborare cu echipa.",
      changeSpec: {
        action: "COHERENCE_AUDIT",
        assignTo: ["COG", "PMA", "HR_COUNSELOR", "MEDIATOR", "PSYCHOLINGUIST", "PPMO", "MGA", "PPA", "SVHA", "SCA", "PSE", "STA", "SOC", "ACEA", "SAFETY_MONITOR"],
        deadline: "2026-04-10",
        priority: "HIGH",
      },
    },
  })
  process.stdout.write("1. " + p1.title + "\n")

  // 2. Brainstorm dezbatere coerență
  const bs = await prisma.brainstormSession.create({
    data: {
      topic: "Dezbatere coerență roluri L2 — granițe, suprapuneri, workflow-uri",
      context: JSON.stringify({
        context: "Audit coerență a identificat 7 probleme de suprapunere/granițe între agenți L2 și client-facing. Fiecare agent citește ce-l privește și contribuie cu perspectiva lui.",
        probleme: [
          "HR_COUNSELOR trebuie să dețină explicit instrumentele și interfața client",
          "MGA vs PPMO: cum CONDUCI vs cum FUNCȚIONEAZĂ oamenii",
          "PSYCHOLINGUIST profilează, HR_COUNSELOR aplică — corect?",
          "PPA (occidental) vs SVHA (holistic) — când pe care?",
          "ACEA: L2 cu dublu raport (PMA + COG)?",
          "SOC și STA nedefinite — ce așteptări avem?",
          "MEDIATOR: L4 client-facing + L3 intern — funcționează?",
        ],
        regula: "Nu există răspunsuri greșite. Semnalați orice nelămurire. Fiecare perspectivă contează.",
      }),
      level: "TACTICAL",
      status: "GENERATING",
      initiatedBy: "COG",
      participantRoles: ["COG", "PMA", "HR_COUNSELOR", "MEDIATOR", "PSYCHOLINGUIST", "PPMO", "MGA", "PPA", "SVHA", "SCA", "PSE", "STA", "SOC", "ACEA", "SAFETY_MONITOR"],
    },
  })
  process.stdout.write("2. Brainstorm dezbatere: " + bs.id + "\n")

  await prisma.$disconnect()
  process.stdout.write("\nDONE — Audit coerență + brainstorm dezbatere delegate. Toată echipa participă.\n")
}

main()
