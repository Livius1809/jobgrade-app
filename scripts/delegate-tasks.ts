/**
 * delegate-tasks.ts — Delegare task-uri la structura de agenți
 * Rulat: npx tsx scripts/delegate-tasks.ts
 */

import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const p = prisma as any

  // ── 1. Propuneri delegare ──────────────────────────────────────────────────

  const proposals = [
    {
      proposalType: "MODIFY_OBJECTIVES",
      proposedBy: "CLAUDE",
      title: "Cercetare piață RO — status și actualizare",
      description: `RDA + CIA: Actualizați statusul cercetării de piață RO pentru HR SaaS/Job Evaluation.
Identificați: competitori actuali, dimensiune piață, trend-uri, gap-uri pe care JobGrade le acoperă.
Raportați COG cu recomandări de poziționare.`,
      rationale: "Owner solicită status cercetare piață — delegare conform model operațional N2",
      changeSpec: { action: "RESEARCH", assignTo: ["RDA", "CIA"], deadline: "2026-04-10" },
    },
    {
      proposalType: "MODIFY_OBJECTIVES",
      proposedBy: "CLAUDE",
      title: "Plan de marketing B2B — elaborare completă",
      description: `MKA + ACA + CMA: Elaborați planul de marketing B2B complet.
Include: segmentare audiență, poziționare, canale (LinkedIn, email, webinare, content), calendar editorial, KPI-uri, buget estimat.
Integrați identitatea de brand actualizată (echipă mixtă AI+psihologi).
Referință: docs/pricing-strategy-guide.md, docs/brief-creativ-comercial-3-pagini.md`,
      rationale: "Owner solicită plan marketing B2B — delegare la echipa marketing",
      changeSpec: { action: "PLAN", assignTo: ["MKA", "ACA", "CMA"], deadline: "2026-04-15" },
    },
    {
      proposalType: "MODIFY_OBJECTIVES",
      proposedBy: "CLAUDE",
      title: "Actualizare identitate de brand — echipa mixtă AI+Oameni",
      description: `CMA + CWA + CDIA: Actualizați identitatea de brand JobGrade reflectând noua realitate:
- Echipa mixtă: 46 agenți AI + 2 psihologi angajați (1 acreditat CPR psihologia muncii)
- Sinergie: experiență umană (30+ ani psihologie organizațională) + precizie AI
- Narațiune: companie de psihologie organizațională care folosește AI ca instrument
- NU: companie tech care pune AI pe domeniu sensibil
- Propuneți: tagline actualizat, messaging framework, tone of voice, diferențiatori cheie
- Referință: docs/brand-identity-revizuita-post-infuzare.md`,
      rationale: "Structura s-a schimbat fundamental — brand-ul trebuie să reflecte echipa mixtă",
      changeSpec: { action: "REBRAND", assignTo: ["CMA", "CWA", "CDIA"], deadline: "2026-04-12" },
    },
    {
      proposalType: "MODIFY_OBJECTIVES",
      proposedBy: "CLAUDE",
      title: "Concepere conținut complet per pagină platformă",
      description: `CWA + DOA + PSYCHOLINGUIST: Concepeți conținutul text+structură pentru FIECARE pagină:
- Homepage (filozofia întâlnirii)
- Portal B2B (/portal — servicii + chat)
- Portal B2C (/personal — spirala învățării)
- Portal Owner (/owner — KPI, echipă, documente)
- Login/Register (centrat, simplu)
- Landing page: testimoniale, pricing (3 pachete), despre noi, echipa mixtă
- Pagini funcționale: jobs, sessions, reports, compensation, pay-gap
Principiu: SUPER SIMPLU. Clientul nu gândește "unde e?". Calibrare lingvistică RO (Daniel David).
Dialog-centric: butonul "Cum găsesc ce mă interesează?" pe fiecare pagină.`,
      rationale: "Owner solicită conținut complet, simplu, calibrat per pagină",
      changeSpec: { action: "CONTENT", assignTo: ["CWA", "DOA", "PSYCHOLINGUIST"], deadline: "2026-04-15" },
    },
    {
      proposalType: "MODIFY_OBJECTIVES",
      proposedBy: "CLAUDE",
      title: "Design layout-uri platformă — simplitate absolută",
      description: `DOA + DOAS + FDA: Concepeți layout-urile UX complete:
- Amplasare obiecte pe pagini — flow utilizator optim
- Design rapoarte (PDF + ecran) — clar, profesional, elegant
- Dashboard-uri — KPI vizibili, acțiuni la 1-2 click-uri
- Principiu: ZERO FRICȚIUNE. Clientul găsește orice în max 2 click-uri.
- Butonul "Cum găsesc ce mă interesează?" floating pe fiecare pagină
- Mobile-first, responsive, centrat pe 72rem
- Referință: design actual centrat (fără sidebar)`,
      rationale: "Owner solicită UX optimizat — simplitate absolută în navigare",
      changeSpec: { action: "DESIGN", assignTo: ["DOA", "DOAS", "FDA"], deadline: "2026-04-15" },
    },
  ]

  console.log("Creez", proposals.length, "propuneri delegare...\n")

  for (const task of proposals) {
    const proposal = await p.orgProposal.create({
      data: {
        proposalType: task.proposalType,
        status: "DRAFT",
        proposedBy: task.proposedBy,
        title: task.title,
        description: task.description,
        rationale: task.rationale,
        changeSpec: task.changeSpec,
      },
    })
    console.log("  ✅", proposal.title)
  }

  // ── 2. Brainstorming session ───────────────────────────────────────────────

  console.log("\nCreez sesiune brainstorming COG...\n")

  const bs = await p.brainstormSession.create({
    data: {
      topic: "Evoluția JobGrade Q2-Q4 2026 — idei de diferențiere și creștere",
      context: JSON.stringify({
        schimbari_recente: [
          "Echipa mixtă: 46 agenți AI + 2 psihologi (1 CPR acreditat)",
          "SVHA: vindecare holistică (Yoga, Tao, TCM, Ayurveda)",
          "Dialog-centric engine: context din TOATE interacțiunile, butonul 'Cum găsesc ce mă interesează?'",
          "Stripe billing live (3 pachete RON)",
          "Benchmark engine (10 surse publice)",
          "JE Process Engine end-to-end (18K linii)",
          "Pay Gap complet (Art. 9 + Art. 10 + deadline monitor)",
          "AI Act Art. 14 acoperit de psiholog CPR",
          "GDPR complet (4 documente)",
        ],
        intrebari_provocatoare: [
          "Cum ne diferențiem de competitori care nu au psihologi reali?",
          "Cum monetizăm sinergia AI+uman mai bine?",
          "Ce funcționalități B2C ar crea cel mai mare WOW?",
          "Cum facem ca spirala învățării să fie addictive (pozitiv)?",
          "Ce parteneriate strategice ar accelera creșterea?",
          "Cum folosim SVHA (holistic) ca diferențiator unic pe piață?",
        ],
        reguli: "Gândiți liber, provocator, wild cards binevenite. Nu cenzurați idei.",
      }),
      level: "STRATEGIC",
      status: "CREATED",
      initiatedBy: "COG",
    },
  })
  console.log("  ✅ Brainstorm session:", bs.id, "—", bs.topic)

  console.log("\n══════════════════════════════════════════════")
  console.log("DONE — 5 propuneri + 1 brainstorm create.")
  console.log("FLUX-030 (approval pipeline, cron 4h) le va procesa automat.")
  console.log("COG le va review-ui, apoi Owner decide.")
  console.log("══════════════════════════════════════════════\n")

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("Eroare:", e.message)
  process.exit(1)
})
