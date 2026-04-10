/**
 * E2E Test — primul obiectiv real dat de Owner organismului JobGrade.
 *
 * Context: 10.04.2026, testăm dacă sistemul poate prelua un obiectiv concret,
 * decompune, delega, coordona și livra un rezultat în 48h FĂRĂ intervenția
 * Owner-ului în primele 12h.
 *
 * Obiectiv: "Pregătește outreach pentru 10 firme HR-tech RO — lista + profil
 * + mesaj personalizat". Zero emailuri trimise; doar material pregătit pentru
 * review Owner.
 *
 * Structură:
 *  1. Creează OrganizationalObjective (strategic, deadline +48h)
 *  2. Creează seed task pentru CCO (owner al obiectivului)
 *  3. Printează ID-uri pentru monitoring
 *  4. Apelantul declanșează ciclul proactiv separat (POST /agents/cycle)
 *
 * Rulează: npx tsx scripts/e2e-test-owner-objective.ts
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

const BUSINESS_ID = "biz_jobgrade"
const CODE = "e2e-outreach-hr-tech-ro-v1"
const DEADLINE_HOURS = 48

async function main() {
  // 1. Verifică dacă obiectivul există deja
  const existing = await p.organizationalObjective.findFirst({
    where: { code: CODE },
    select: { id: true, code: true, createdAt: true },
  })
  if (existing) {
    console.log(`[skip] Obiectivul ${CODE} există deja: ${existing.id}`)
    console.log(`       Creat la: ${existing.createdAt.toISOString()}`)
    await p.$disconnect()
    return
  }

  // 2. Creează obiectivul strategic
  const deadline = new Date(Date.now() + DEADLINE_HOURS * 60 * 60 * 1000)
  const objective = await p.organizationalObjective.create({
    data: {
      businessId: BUSINESS_ID,
      code: CODE,
      title: "E2E TEST — Outreach 10 firme HR-tech RO pentru primul client B2B",
      description: [
        "Primul test end-to-end al organismului viu JobGrade.",
        "",
        "OBIECTIV:",
        "Pregătește o campanie de outreach pentru 10 firme țintă din sectorul HR/recruiting/consulting",
        "din România, potrivit poziționării JobGrade (evaluare personal, ierarhizare joburi, MBook-uri).",
        "",
        "LIVRABIL (1 document agregat, review de Owner):",
        "  1. Lista a 10 firme cu: nume, site, decision maker (nume+poziție dacă se poate), context de ce se potrivesc",
        "  2. Pentru fiecare firmă, un mesaj de outreach personalizat (150-250 cuvinte, RO, fără superlative americane)",
        "  3. Plan follow-up (când, canal, ce spunem la no-reply)",
        "",
        "CONSTRÂNGERI:",
        "  - ZERO emailuri trimise. Doar material pregătit pentru review Owner.",
        "  - Mesaje în limba română, ton natural (vezi feedback_anglo_saxon_crossed_wires_ro).",
        "  - Fir narativ: fiecare mesaj spune POVESTE, nu înlănțuire de fraze.",
        "  - Beneficiul trebuie să fie SPECIFIC rolului decision maker (HR Dir vs CEO vs CFO).",
        "",
        "COORDONARE SUGERATĂ:",
        "  - CIA: research firme + decision makers",
        "  - MKA: context piață HR RO, tendințe, pain points",
        "  - CWA: draft mesaje (copy)",
        "  - CMA: format + fir narativ + storytelling",
        "  - SOA: unghi sales + plan follow-up",
        "  - DVB2B: validare pitch",
        "  - CCO: decompune obiectivul, deleagă, agregă, livrează la Owner",
        "",
        "DEADLINE: " + deadline.toISOString() + " (48h).",
        "",
        "ACEST TEST VALIDEAZĂ: dacă organismul poate primi un obiectiv real de la Owner",
        "și îl poate duce până la un livrabil review-abil FĂRĂ intervenția Owner-ului în primele 12h.",
      ].join("\n"),
      metricName: "firms_outreach_ready",
      metricUnit: "firme",
      targetValue: 10,
      currentValue: 0,
      direction: "INCREASE",
      status: "ACTIVE",
      priority: "HIGH",
      level: "STRATEGIC",
      startDate: new Date(),
      deadlineAt: deadline,
      ownerRoles: ["CCO", "DVB2B"],
      contributorRoles: ["CIA", "MKA", "CWA", "CMA", "SOA"],
      tags: ["e2e-test", "outreach", "b2b-first-client", "owner-initiated"],
      createdBy: "OWNER",
    },
  })

  console.log(`\n✅ Obiectiv creat: ${objective.code}`)
  console.log(`   ID: ${objective.id}`)
  console.log(`   Deadline: ${deadline.toISOString()}`)
  console.log(`   Owners: ${objective.ownerRoles.join(", ")}`)
  console.log(`   Contributors: ${objective.contributorRoles.join(", ")}\n`)

  // 3. Creează seed task pentru CCO — punctul de intrare
  const seedTask = await p.agentTask.create({
    data: {
      businessId: BUSINESS_ID,
      assignedBy: "OWNER",
      assignedTo: "CCO",
      title: "DECOMPUNE + DELEGĂ: Outreach 10 firme HR-tech RO",
      description: [
        "Owner-ul ți-a încredințat obiectivul strategic " + CODE + ".",
        "",
        "Tu (CCO) ești owner principal. Responsabilitățile tale:",
        "",
        "1. DECOMPUNE obiectivul în sub-taskuri concrete (research, draft, review, agregare).",
        "2. DELEGĂ fiecare sub-task la agentul potrivit din contributorRoles",
        "   (CIA, MKA, CWA, CMA, SOA, DVB2B). Creează AgentTask-uri legate la acest obiectiv.",
        "3. COORDONEAZĂ fluxul — urmărește rezultate, rezolvă blocaje, cere review între agenți.",
        "4. AGREGĂ rezultatele într-un livrabil unitar (un singur document).",
        "5. LIVREAZĂ la Owner prin marcarea obiectivului ca completat + creare OrgProposal",
        '   cu status="COMPLETED" și linkul către livrabil.',
        "",
        "CONSTRÂNGERI:",
        "  - Nu cere Owner-ului input în primele 12h. Dacă ești blocat, deleagă în lateral sau escaladează la COG.",
        "  - Toate sub-taskurile trebuie să aibă objectiveId setat la acest obiectiv.",
        "  - Fiecare sub-task trebuie să aibă tags: ['e2e-test', 'outreach'].",
        "",
        "DEADLINE: " + deadline.toISOString(),
        "",
        "Acest task e punctul de intrare al testului end-to-end. Orice eșec (agent care nu răspunde,",
        "loop infinit, rezultat inconsistent) este parte din test — nu încerca să-l ascunzi.",
      ].join("\n"),
      taskType: "PROCESS_EXECUTION",
      priority: "HIGH",
      objectiveId: objective.id,
      tags: ["e2e-test", "outreach", "decompose-delegate", "owner-seed"],
      deadlineAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h pentru decompunere
      estimatedMinutes: 60,
      status: "ASSIGNED",
    },
  })

  console.log(`✅ Seed task creat pentru CCO: ${seedTask.id}`)
  console.log(`   Title: ${seedTask.title}`)
  console.log(`   Deadline decompunere: ${seedTask.deadlineAt?.toISOString()}\n`)

  console.log(`──────────────────────────────────────────────────────────────`)
  console.log(`MONITORING`)
  console.log(`──────────────────────────────────────────────────────────────`)
  console.log(`Obiectiv ID:    ${objective.id}`)
  console.log(`Seed task ID:   ${seedTask.id}`)
  console.log(``)
  console.log(`Query util:`)
  console.log(`  SELECT * FROM agent_tasks WHERE "objectiveId" = '${objective.id}';`)
  console.log(``)
  console.log(`Următorul pas: POST /api/v1/agents/cycle { level: "tactical", agentRole: "CCO" }`)
  console.log(``)

  await p.$disconnect()
}

main().catch(async (e) => {
  console.error("FATAL:", e)
  try { await p.$disconnect() } catch {}
  process.exit(1)
})
