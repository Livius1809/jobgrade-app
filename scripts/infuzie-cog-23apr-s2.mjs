/**
 * Infuzie COG — Sesiunea 2, 23.04.2026
 * Bloc 3+4 evaluare comisie + 9 task-uri implementare
 */
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9zuVxY2XmZbe@ep-odd-water-alccgot0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const entries = [
  // ── COG — decizii tehnice sesiune ──
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S2] Implementare completă Bloc 3 (Discuție de grup) și Bloc 4 (Validare post-consens) din fluxul evaluare comisie Varianta B.

BLOC 3 — Discuția de grup:
- Model DiscussionComment cu threading (parentId), suport AI mediator (isAi, userId null), runde
- API group-data: date complete participanți × criterii × pre-scoruri × voturi × consens %
- GroupDiscussionView: layout split stânga (criterii+progress) / dreapta (tablou voturi+discuție)
- Polling live la 10s pentru actualizare voturilor, 8s pentru comentarii
- Progress bar per criteriu + general; marcaj CONSENS la 100%
- 7 principii consens din metodologie afișate permanent (toggle)

BLOC 4 — Validare post-consens:
- Model MemberValidation: preScore vs consensus, accept individual sau batch
- Auto-close: când toți membrii validează → sesiune trece la OWNER_VALIDATION
- initPostConsensusValidation() în je-process-engine: creează recorduri doar unde scorurile diferă`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["bloc3", "bloc4", "evaluare-comisie", "implementare", "23apr2026-s2"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S2] AI Mediator — diferențiator principal platformă.

ARHITECTURĂ:
- Endpoint /ai-mediate: Claude analizează pre-scorări individuale + voturi curente + comentarii + patterns TRANSVERSALE
- Patterns transversale: cum scorează fiecare evaluator pe ACELAȘI criteriu pe TOATE posturile din sesiune
- Prompt structurat pe 3 tipuri de rundă: R1 (divergențe+întrebări), R2 (compromis pe baza argumentelor), R3+ (sinteză finală)
- 3 runde incluse în pachet, din runda 4+ pe credite (AI_MEDIATION_ROUND: 2 credite)
- Rezultatul se salvează ca DiscussionComment cu isAi=true
- AI propune ABORDĂRI nu soluții; nu impune; identifică inconsistențe

DIFERENȚIATOR: niciun competitor (Hay/Mercer) nu are mediere care învață din comportamentul evaluatorilor.`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["ai-mediator", "diferentiator", "pricing", "23apr2026-s2"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S2] AI Ghidaj la scorare (Bloc 2) — mini-consens AI ↔ reprezentant.

- Endpoint /ai-suggest: Claude analizează fișa postului vs descriptori criteriu
- Returnează: suggestedCode (literă) + reasoning (2-3 propoziții) + highlights (fragmente relevante din fișa postului)
- Buton "Sugestie AI" per criteriu în EvaluationForm
- Card sugestie mov cu reasoning + highlights + buton "Adoptă" (setează automat litera)
- Fără cost credite — inclus în pachetul de evaluare
- Subfactor descriptors complet injectați în prompt`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["ai-suggest", "bloc2", "evaluare", "23apr2026-s2"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S2] Jurnal proces complet + Export PDF.

JURNAL (API /journal):
- 6 categorii structurate: Setup | Pre-scorare | Discuție grup | Voturi | Mediere AI | Validare
- Totalizatoare per categorie
- Tab-uri navigabile în componentă SessionJournal

EXPORT PDF (API /journal/export-pdf):
- React-PDF, 2 pagini A4
- Secțiuni: membri, posturi, evaluări, discuții, voturi, decizii facilitator, validări
- Footer cu paginare
- Descărcabil din interfață`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["jurnal-proces", "export-pdf", "23apr2026-s2"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S2] Formular configurare comisie (Bloc 1) complet.

FUNCȚIONALITĂȚI ADĂUGATE:
- Formular adăugare membru NOU: prenume, nume, email, funcție, telefon
- Invitare automată via /api/v1/users/invite
- Selectare/deselectare membri cu detalii (funcție, departament, email)
- Mesaj invitație personalizabil cu preview email
- Bifă obligatorie "Inițiază sesiunea" cu explicare pași complet
- Email onboarding personalizat: pași proces + principii consens + deadline
- Reminder automat (cron endpoint): trimite doar dacă deadline <= 3 zile, doar membrilor care nu au terminat`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["bloc1", "configurare-comisie", "onboarding", "reminder", "23apr2026-s2"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S2] Dashboard admin progres + ReportPanel complet.

DASHBOARD ADMIN (API /admin-progress):
- Per-member: progres evaluare (submitted/total), status 5 nivele (completed/ready/in_progress/started/not_started)
- Deadline proximity alert (roșu/amber/albastru)
- Status validare post-consens per membru
- Polling automat la 30s
- Integrat în pagina sesiune (vizibil doar admin/owner/facilitator)

REPORT PANEL (portal):
- Lista sesiuni finalizate cu status (Finalizat/Validat/Validare Owner)
- Butoane export: PDF, Excel, JSON, XML (cu cost credite)
- Link-uri: vizualizare ierarhie, raport complet, jurnal proces
- Link validare în curs pentru sesiuni OWNER_VALIDATION`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["dashboard-admin", "report-panel", "monitoring", "23apr2026-s2"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S2] Cartuș informativ la finalizare scorare (Bloc 2).

La trimiterea evaluării individuale, membrul vede:
1. CE AI FĂCUT: tabel sumar cu literele alese per criteriu, confirmare trimitere
2. CE URMEAZĂ: 3 pași (discuție grup, pornire de la varianta ta, AI mediator)
3. PRINCIPII CONSENS: 5 reguli (fapte+logică, nu evita conflictul, diversitate, nu mentalitate câștig-pierdere)
Buton "Înapoi la sesiune" — nu se face redirect automat (membrul citește mai întâi).`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["cartus-informativ", "bloc2", "ux", "23apr2026-s2"],
  },

  // ── COA — decizii arhitecturale ──
  {
    agentRole: "COA",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S2] Arhitectura nouă componente evaluare comisie.

RUTE NOI:
- /sessions/[id]/discussion/[sjId] — pagina discuție de grup
- /sessions/[id]/validate — pagina validare post-consens
- /sessions/[id]/journal — pagina jurnal proces

API ROUTES NOI (10):
- consensus/[sjId]/discussion (GET/POST comentarii)
- consensus/[sjId]/group-data (date complete pentru tablou)
- consensus/[sjId]/ai-mediate (mediere AI Claude)
- jobs/[sjId]/ai-suggest (sugestie AI per criteriu)
- post-consensus (GET comparație + POST accept)
- journal (GET structurat) + journal/export-pdf
- admin-progress (progres per-membru)
- cron/evaluation-reminders (reminder automat)

MODELE PRISMA NOI:
- DiscussionComment: threading (parentId), AI (isAi, userId null), runde
- MemberValidation: preScore, consensus, accepted, acceptedAt
- Vote.round: tracking runde de mediere`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["arhitectura", "rute", "api", "schema", "23apr2026-s2"],
  },
]

async function main() {
  console.log(`Infuzie COG+COA: ${entries.length} entries...`)

  for (const entry of entries) {
    await prisma.kBEntry.create({
      data: {
        agentRole: entry.agentRole,
        kbType: entry.kbType,
        content: entry.content,
        source: entry.source,
        confidence: entry.confidence,
        status: entry.status,
        tags: entry.tags,
      },
    })
    console.log(`  ✓ ${entry.agentRole}: ${entry.tags[0]}`)
  }

  console.log(`\nInfuzie completă: ${entries.length} entries persistate.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
