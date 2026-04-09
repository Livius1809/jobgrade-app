/**
 * seed-production.ts — Unified production seed script
 *
 * Runs all seed functions in correct dependency order:
 *   1. Criteria + Subfactors (zero dependencies)
 *   2. CriteriaMapping (depends on Criterion)
 *   3. Business entity (zero dependencies)
 *   4. Agent Definitions + Relationships (zero dependencies)
 *   5. KB cold-start entries (depends on agent roles existing)
 *
 * Idempotent: uses upsert where possible.
 * Each step: try/catch with logging, continues on error.
 *
 * Run: npx tsx prisma/seed-production.ts
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: Criteria + Subfactors
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCriteriaAndSubfactors() {
  console.log("\n── Step 1: Criteria + Subfactors ──");

  const criteriaData = [
    {
      name: "Educație / Experiență",
      description:
        "Reflectă ce trebuie să știe un individ pentru a-și îndeplini atribuțiile satisfăcător și cu competență. Evaluează ce tip de educație/experiență este necesară pentru a îndeplini responsabilitățile poziției și a atinge obiectivele.",
      category: "Cunoștințe",
      order: 1,
      subfactors: [
        { code: "A", points: 16, order: 1, description: "Liceu nefinalizat sau echivalent / Fără experiență. Aceste poziții urmează instrucțiuni detaliate. Sunt necesare aptitudini de citire, scriere, matematică." },
        { code: "B", points: 32, order: 2, description: "Liceu absolvit sau echivalent / 6-12 luni experiență. Aceste poziții urmează instrucțiuni și înțeleg proceduri." },
        { code: "C", points: 48, order: 3, description: "Liceu absolvit sau echivalent (plus cursuri de specialitate) / 1-2 ani experiență. Aceste poziții urmează procedurile generale ale biroului și responsabilitățile variate aparținând propriului domeniu de expertiză." },
        { code: "D", points: 64, order: 4, description: "Absolvent învățământ superior (colegiu) sau echivalent / 2-3 ani experiență. Aceste poziții urmează proceduri cu grad de complexitate moderat și repartizări de activități. Necesită înțelegerea nivelului profesional de bază și sunt orientate tactic." },
        { code: "E", points: 80, order: 5, description: "Studii superioare nefinalizate sau echivalent / 4-6 ani experiență. Aceste poziții sunt destinate profesioniștilor experimentați sau managerilor de departamente." },
        { code: "F", points: 96, order: 6, description: "Studii superioare nefinalizate sau echivalent / 8-10 ani experiență. Aceste poziții sunt destinate pozițiilor de management și sunt orientate strategic în aria responsabilităților." },
        { code: "G", points: 112, order: 7, description: "Studii superioare absolvite / peste 10 ani experiență. Aceste poziții sunt de conducere superioară cu impact strategic major asupra organizației." },
      ],
    },
    {
      name: "Comunicare",
      description:
        "Complexitatea și importanța abilităților de comunicare internă și externă necesare în exercitarea rolului.",
      category: "Relații",
      order: 2,
      subfactors: [
        { code: "A", points: 17, order: 1, description: "Abilități conversaționale și de scriere (bază). Comunicare de bază în cadrul echipei directe. Schimb de informații simple, urmărire de instrucțiuni scrise." },
        { code: "B", points: 34, order: 2, description: "Abilități conversaționale și de scriere (moderate). Comunicare cu colegi din departamente diferite. Redactare de documente interne, rapoarte de rutină." },
        { code: "C", points: 51, order: 3, description: "Abilități de persuasiune. Capacitatea de a convinge, influența sau negocia cu colegi sau parteneri externi în situații obișnuite." },
        { code: "D", points: 68, order: 4, description: "Abilități de comunicare dezvoltate. Comunicare complexă cu multiple audiențe interne și externe. Prezentări, negocieri de nivel mediu, reprezentare echipă." },
        { code: "E", points: 85, order: 5, description: "Abilități de comunicare critică. Comunicare strategică cu impact direct asupra afacerii. Negocieri majore, reprezentare organizațională la nivel înalt, comunicare de criză." },
      ],
    },
    {
      name: "Rezolvarea problemelor",
      description:
        "Complexitatea problemelor întâlnite și gradul de creativitate/analiză necesar pentru soluționarea lor.",
      category: "Cognitive",
      order: 3,
      subfactors: [
        { code: "A", points: 16, order: 1, description: "Cerințe reduse pentru abilitate analitică. Sarcini de rutină cu soluții predefinite, fără necesitate de analiză." },
        { code: "B", points: 32, order: 2, description: "Oarecare abilitate analitică. Situații ușor variate față de rutină, necesitând o minimă judecată." },
        { code: "C", points: 48, order: 3, description: "Abilitate analitică moderată. Probleme cu variabile multiple în aria de competență, necesitând analiză și interpretare." },
        { code: "D", points: 64, order: 4, description: "Probleme diferite în aria de competență. Situații complexe și variate, necesitând judecată profesională și creativitate." },
        { code: "E", points: 80, order: 5, description: "Probleme diferite. Probleme complexe care depășesc limitele unui singur domeniu, necesitând abordare interdisciplinară." },
        { code: "F", points: 96, order: 6, description: "Probleme foarte diferite. Situații ambigue cu precedente limitate, necesitând inovație și gândire strategică." },
        { code: "G", points: 112, order: 7, description: "Probleme strategice. Provocări organizaționale majore fără precedent, cu impact pe termen lung asupra companiei." },
      ],
    },
    {
      name: "Luarea deciziilor",
      description:
        "Nivelul de autonomie și impactul deciziilor luate în exercitarea rolului.",
      category: "Responsabilitate",
      order: 4,
      subfactors: [
        { code: "A", points: 16, order: 1, description: "Câteva decizii simple. Execută instrucțiuni clare, deciziile sunt limitate la alegeri simple și bine definite." },
        { code: "B", points: 32, order: 2, description: "Decizii de rutină. Decizii operaționale repetitive în cadrul procedurilor stabilite." },
        { code: "C", points: 48, order: 3, description: "Decizii standard. Decizii în situații uzuale, cu aplicarea judecății profesionale în cadrul ghidurilor existente." },
        { code: "D", points: 64, order: 4, description: "Decizii independente. Autonomie semnificativă în luarea deciziilor operaționale și tactice fără aprobare superioară." },
        { code: "E", points: 80, order: 5, description: "Decizii complexe. Decizii cu impact major asupra echipei sau departamentului, cu consecințe semnificative." },
        { code: "F", points: 96, order: 6, description: "Multe decizii complexe. Decizii multiple cu impact cross-departamental și consecințe financiare importante." },
        { code: "G", points: 112, order: 7, description: "Decizii strategice. Decizii cu impact major asupra direcției și performanței întregii organizații." },
      ],
    },
    {
      name: "Impact asupra afacerii",
      description:
        "Măsura în care rolul contribuie direct la rezultatele financiare și strategice ale companiei.",
      category: "Responsabilitate",
      order: 5,
      subfactors: [
        { code: "A", points: 28, order: 1, description: "Impact limitat. Contribuție indirectă, rolul susține activitățile altora fără impact direct măsurabil." },
        { code: "B", points: 56, order: 2, description: "Impact minor. Contribuție la rezultatele echipei sau departamentului, cu impact financiar redus." },
        { code: "C", points: 84, order: 3, description: "Impact de influențare. Rolul influențează semnificativ rezultatele unui departament sau ale unor proiecte importante." },
        { code: "D", points: 112, order: 4, description: "Impact direct. Rolul are responsabilitate directă și majoră asupra performanței financiare și strategice a organizației." },
      ],
    },
    {
      name: "Condiții de lucru",
      description:
        "Natura mediului de lucru, riscurile fizice sau psihologice asociate rolului și cerințele de disponibilitate.",
      category: "Condiții",
      order: 6,
      subfactors: [
        { code: "A", points: 9, order: 1, description: "Minimale. Mediu de lucru standard de birou, fără riscuri fizice sau psihologice deosebite, program regulat." },
        { code: "B", points: 18, order: 2, description: "Moderate. Expunere ocazională la condiții neplăcute, deplasări sau program extins ocazional." },
        { code: "C", points: 27, order: 3, description: "Considerabile. Expunere frecventă la condiții dificile, risc fizic sau psihologic ridicat, disponibilitate extinsă." },
      ],
    },
  ];

  let criteriaCount = 0;
  let subfactorCount = 0;

  for (const crit of criteriaData) {
    const criterion = await prisma.criterion.upsert({
      where: { name: crit.name },
      update: {
        description: crit.description,
        category: crit.category,
        order: crit.order,
      },
      create: {
        name: crit.name,
        description: crit.description,
        category: crit.category,
        order: crit.order,
        isActive: true,
      },
    });
    criteriaCount++;

    for (const sf of crit.subfactors) {
      await prisma.subfactor.upsert({
        where: {
          criterionId_code: {
            criterionId: criterion.id,
            code: sf.code,
          },
        },
        update: {
          description: sf.description,
          points: sf.points,
          order: sf.order,
        },
        create: {
          criterionId: criterion.id,
          code: sf.code,
          description: sf.description,
          points: sf.points,
          order: sf.order,
        },
      });
      subfactorCount++;
    }
  }

  const totalMax = criteriaData.reduce(
    (sum, c) => sum + Math.max(...c.subfactors.map((s) => s.points)),
    0
  );
  console.log(`   ${criteriaCount} criteria, ${subfactorCount} subfactors (max ${totalMax} pts)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: CriteriaMapping (6 mappings: JobGrade factor -> Legal criterion)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCriteriaMappings() {
  console.log("\n── Step 2: CriteriaMapping ──");

  const mappings = [
    {
      jobgradeFactor: "educationTrainingLevel",
      legalCriterion: "CUNOSTINTE_DEPRINDERI" as const,
      description: "Educație / Experiență -> Cunoștințe și deprinderi (conform Legii transparenței salariale)",
    },
    {
      jobgradeFactor: "communicationComplexity",
      legalCriterion: "CUNOSTINTE_DEPRINDERI" as const,
      description: "Comunicare -> Cunoștințe și deprinderi (abilități de comunicare ca parte a competențelor)",
    },
    {
      jobgradeFactor: "problemSolvingScope",
      legalCriterion: "EFORT_INTELECTUAL_FIZIC" as const,
      description: "Rezolvarea problemelor -> Efort intelectual/fizic (complexitatea analizei și creativității)",
    },
    {
      jobgradeFactor: "decisionMakingImpact",
      legalCriterion: "RESPONSABILITATI" as const,
      description: "Luarea deciziilor -> Responsabilități (autonomie și impact al deciziilor)",
    },
    {
      jobgradeFactor: "businessImpactScope",
      legalCriterion: "RESPONSABILITATI" as const,
      description: "Impact asupra afacerii -> Responsabilități (contribuție la rezultate financiare și strategice)",
    },
    {
      jobgradeFactor: "workingConditionsRisk",
      legalCriterion: "CONDITII_MUNCA" as const,
      description: "Condiții de lucru -> Condiții de muncă (mediu, riscuri, disponibilitate)",
    },
  ];

  let count = 0;
  for (const m of mappings) {
    await (prisma as any).criteriaMapping.upsert({
      where: {
        legalCriterion_jobgradeFactor: {
          legalCriterion: m.legalCriterion,
          jobgradeFactor: m.jobgradeFactor,
        },
      },
      update: { description: m.description },
      create: {
        legalCriterion: m.legalCriterion,
        jobgradeFactor: m.jobgradeFactor,
        description: m.description,
      },
    });
    count++;
  }

  console.log(`   ${count} criteria mappings upserted`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: Business entity
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBusiness() {
  console.log("\n── Step 3: Business entity ──");

  await (prisma as any).business.upsert({
    where: { code: "jobgrade" },
    update: {
      name: "Psihobusiness Consulting SRL",
      lifecyclePhase: "GROWTH",
      status: "ACTIVE",
    },
    create: {
      id: "biz_jobgrade",
      code: "jobgrade",
      name: "Psihobusiness Consulting SRL",
      description: "Platforma JobGrade — evaluare și ierarhizare posturi, transparență salarială, organism viu.",
      status: "ACTIVE",
      lifecyclePhase: "GROWTH",
      mvvStatement: "Perfecționăm procesul și tragem piața spre evoluție.",
    },
  });

  console.log(`   Business "jobgrade" (Psihobusiness Consulting SRL) upserted`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4: Agent Definitions + Relationships
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAgentRegistry() {
  console.log("\n── Step 4: Agent Definitions + Relationships ──");

  // Dynamic imports to avoid issues if files don't exist
  const { MANAGER_CONFIGS } = await import("../src/lib/agents/manager-configs");
  const { ESCALATION_CHAIN } = await import("../src/lib/agents/escalation-chain");
  const { SELF_INTERVIEW_PROMPTS } = await import("../src/lib/kb/cold-start");
  const { PROPAGATION_RULES } = await import("../src/lib/kb/propagate");

  // Collect all unique roles
  const allRoles = new Set<string>();
  for (const [child, parent] of Object.entries(ESCALATION_CHAIN)) {
    allRoles.add(child);
    if (parent !== "OWNER") allRoles.add(parent as string);
  }
  for (const mc of MANAGER_CONFIGS) {
    allRoles.add(mc.agentRole);
    for (const sub of mc.subordinates) allRoles.add(sub);
  }
  for (const role of Object.keys(SELF_INTERVIEW_PROMPTS)) {
    allRoles.add(role);
  }

  // Infer level
  function inferLevel(role: string): "STRATEGIC" | "TACTICAL" | "OPERATIONAL" {
    const mc = MANAGER_CONFIGS.find((m: any) => m.agentRole === role);
    if (mc) return mc.level.toUpperCase() as "STRATEGIC" | "TACTICAL" | "OPERATIONAL";
    const parent = (ESCALATION_CHAIN as Record<string, string>)[role];
    if (!parent) return "OPERATIONAL";
    const parentMc = MANAGER_CONFIGS.find((m: any) => m.agentRole === parent);
    if (parentMc?.level === "strategic") return "TACTICAL";
    if (parentMc?.level === "tactical") return "OPERATIONAL";
    return "OPERATIONAL";
  }

  const managerMap = new Map(MANAGER_CONFIGS.map((m: any) => [m.agentRole, m]));
  let created = 0;
  let updated = 0;

  for (const role of allRoles) {
    const mc = managerMap.get(role) as any;
    const prompt = (SELF_INTERVIEW_PROMPTS as Record<string, any>)[role];
    const propTargets = (PROPAGATION_RULES as Record<string, any>)[role] || null;

    const data = {
      displayName: mc?.role || prompt?.description?.split(" — ")[0] || role,
      description: mc?.description || prompt?.description || `Agent ${role}`,
      level: inferLevel(role),
      isManager: !!mc,
      isActive: true,
      cycleIntervalHours: mc?.cycleIntervalHours || null,
      objectives: mc?.objectives || [],
      thresholds: mc?.thresholds ? (mc.thresholds as any) : null,
      coldStartDescription: prompt?.description || null,
      coldStartPrompts: prompt?.prompts || [],
      propagationTargets: propTargets ? (propTargets as any) : null,
      createdBy: "SYSTEM",
    };

    const existing = await (prisma as any).agentDefinition.findUnique({
      where: { agentRole: role },
    });

    if (existing) {
      await (prisma as any).agentDefinition.update({
        where: { agentRole: role },
        data,
      });
      updated++;
    } else {
      await (prisma as any).agentDefinition.create({
        data: { agentRole: role, ...data },
      });
      created++;
    }
  }

  console.log(`   AgentDefinition: ${created} created, ${updated} updated`);

  // Agent Relationships
  let relCreated = 0;
  let relSkipped = 0;

  for (const [childRole, parentRole] of Object.entries(ESCALATION_CHAIN)) {
    if (parentRole === "OWNER") continue;

    try {
      await (prisma as any).agentRelationship.upsert({
        where: {
          parentRole_childRole: { parentRole: parentRole as string, childRole },
        },
        update: { isActive: true, relationType: "REPORTS_TO" },
        create: {
          parentRole: parentRole as string,
          childRole,
          relationType: "REPORTS_TO",
          isActive: true,
        },
      });
      relCreated++;
    } catch (e: any) {
      console.warn(`   Warning: Relationship ${childRole} -> ${parentRole}: ${e.message}`);
      relSkipped++;
    }
  }

  console.log(`   AgentRelationship: ${relCreated} created/updated, ${relSkipped} skipped`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5: KB Cold-Start Entries (static, NOT via Claude API)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedKBColdStart() {
  console.log("\n── Step 5: KB Cold-Start (static entries from seed files) ──");
  console.log("   Note: Individual KB seed files should be run separately:");
  console.log("     npx tsx prisma/seed-final-agents.ts");
  console.log("     npx tsx prisma/seed-kb.ts");
  console.log("     npx tsx prisma/seed-mediator-kb.ts");
  console.log("     npx tsx prisma/seed-pse.ts");
  console.log("     npx tsx prisma/seed-pta.ts");
  console.log("     npx tsx prisma/seed-ppa.ts");
  console.log("     npx tsx prisma/seed-soc.ts");
  console.log("     ... (see docs/seed-data-inventory.md for full list)");
  console.log("   Skipping KB entries in unified seed (run individually as needed).");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN — Run all steps in order
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("=== PRODUCTION SEED — START ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Step 1: Criteria + Subfactors
  try {
    await seedCriteriaAndSubfactors();
    console.log("   [OK] Step 1 complete");
  } catch (e: any) {
    console.error(`   [FAIL] Step 1 — Criteria: ${e.message}`);
  }

  // Step 2: CriteriaMapping
  try {
    await seedCriteriaMappings();
    console.log("   [OK] Step 2 complete");
  } catch (e: any) {
    console.error(`   [FAIL] Step 2 — CriteriaMapping: ${e.message}`);
  }

  // Step 3: Business entity
  try {
    await seedBusiness();
    console.log("   [OK] Step 3 complete");
  } catch (e: any) {
    console.error(`   [FAIL] Step 3 — Business: ${e.message}`);
  }

  // Step 4: Agent Definitions + Relationships
  try {
    await seedAgentRegistry();
    console.log("   [OK] Step 4 complete");
  } catch (e: any) {
    console.error(`   [FAIL] Step 4 — Agent Registry: ${e.message}`);
  }

  // Step 5: KB Cold-Start (informational only)
  try {
    await seedKBColdStart();
    console.log("   [OK] Step 5 complete (informational)");
  } catch (e: any) {
    console.error(`   [FAIL] Step 5 — KB Cold-Start: ${e.message}`);
  }

  console.log("\n=== PRODUCTION SEED — DONE ===");
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
