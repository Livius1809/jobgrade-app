/**
 * business-birth.ts — Mecanism de nastere business nou din organism-mama
 *
 * Cand totul functioneaza stabil, organism-mama poate "naste" un pui:
 * - Puiul mosteneste L1 (CAMPUL, moral core, valori) — shared
 * - Puiul mosteneste motoarele CORE (WIF, Learning, Operational, Detectie)
 * - Puiul primeste L2 nou (cunoastere de domeniu specifica)
 * - Puiul se configureaza cu L3 (legi/norme specifice pietei lui)
 * - Puiul primeste interfata I/O specifica mediului
 *
 * Procesul:
 *   1. VERIFICARE — organism-mama e suficient de stabil?
 *   2. PREGATIRE — ce mosteneste puiul, ce trebuie configurat
 *   3. NASTERE — creare Business entity + seed KB L1 + configurare agenti
 *   4. COLD START — initializare KB domeniu (L2) prin self-interview
 *   5. ACTIVARE — puiul incepe sa functioneze autonom
 */

import { prisma } from "@/lib/prisma"

// ═══ TIPURI ═══

export interface BirthReadiness {
  ready: boolean
  score: number // 0-100
  checks: Array<{ name: string; passed: boolean; detail: string }>
  blockers: string[]
}

export interface BirthConfig {
  businessName: string
  businessSlug: string
  description: string
  targetMarket: string      // "antreprenoriat", "educatie", etc.
  lifecyclePhase: "GROWTH"  // puii incep mereu in GROWTH
  l3Config: {
    jurisdiction: string    // "RO", "EU" etc
    industry: string
    specificRegulations: string[]
  }
  initialAgents: string[]   // roluri agent de creat (subset din organism-mama)
}

export interface BirthResult {
  success: boolean
  businessId?: string
  agentsCreated: number
  kbSeeded: number
  errors: string[]
}

// ═══ VERIFICARE READINESS ═══

export async function checkBirthReadiness(): Promise<BirthReadiness> {
  const checks: BirthReadiness["checks"] = []
  const blockers: string[] = []
  const p = prisma as any

  // 1. Executor ruleaza?
  const execLast = await prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_LAST_RUN" } }).catch(() => null)
  const execOk = execLast?.value ? (Date.now() - new Date(execLast.value).getTime()) < 2 * 3600000 : false
  checks.push({ name: "Executor cron", passed: execOk, detail: execOk ? "Functional" : "Nu ruleaza" })
  if (!execOk) blockers.push("Executor cron nu ruleaza")

  // 2. Maintenance ruleaza?
  const maintLast = await prisma.systemConfig.findUnique({ where: { key: "MAINTENANCE_LAST_RUN" } }).catch(() => null)
  const maintOk = maintLast?.value ? (Date.now() - new Date(maintLast.value).getTime()) < 4 * 3600000 : false
  checks.push({ name: "Maintenance cron", passed: maintOk, detail: maintOk ? "Functional" : "Nu ruleaza" })
  if (!maintOk) blockers.push("Maintenance cron nu ruleaza")

  // 3. Learning engine daily ruleaza?
  const learnLast = await prisma.systemConfig.findUnique({ where: { key: "LEARNING_ORCHESTRATOR_LAST_DAILY" } }).catch(() => null)
  const learnOk = learnLast?.value ? (Date.now() - new Date(learnLast.value).getTime()) < 25 * 3600000 : false
  checks.push({ name: "Learning engine", passed: learnOk, detail: learnOk ? "Daily functional" : "Nu a rulat daily" })

  // 4. Zero anomalii CRITICAL?
  const opLast = await prisma.systemConfig.findUnique({ where: { key: "OPERATIONAL_ENGINE_LAST" } }).catch(() => null)
  let criticalAnoms = 99
  if (opLast?.value) {
    try { criticalAnoms = JSON.parse(opLast.value).anomalyCount?.critical || 0 } catch {}
  }
  checks.push({ name: "Zero anomalii critical", passed: criticalAnoms === 0, detail: `${criticalAnoms} anomalii CRITICAL` })
  if (criticalAnoms > 0) blockers.push(`${criticalAnoms} anomalii CRITICAL active`)

  // 5. KB meta-organism injectat?
  const metaKB = await p.kBEntry?.count({ where: { tags: { hasSome: ["meta-organism"] } } }).catch(() => 0) ?? 0
  checks.push({ name: "Meta-organism KB", passed: metaKB >= 70, detail: `${metaKB} agenti cu KB meta-organism` })

  // 6. Cost sub buget?
  const budgetConfig = await prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_CRON_ENABLED" } }).catch(() => null)
  const notPaused = budgetConfig?.value !== "false"
  checks.push({ name: "Budget OK", passed: notPaused, detail: notPaused ? "Executor activ" : "Executor PAUSED (budget exceeded)" })
  if (!notPaused) blockers.push("Executor paused — budget exceeded")

  // 7. Task-uri BLOCKED = 0?
  const blocked = await prisma.agentTask.count({ where: { status: "BLOCKED" } })
  checks.push({ name: "Zero BLOCKED", passed: blocked === 0, detail: `${blocked} task-uri blocate` })

  const passed = checks.filter(c => c.passed).length
  const score = Math.round((passed / checks.length) * 100)

  return {
    ready: blockers.length === 0 && score >= 80,
    score,
    checks,
    blockers,
  }
}

// ═══ NASTERE BUSINESS ═══

export async function birthNewBusiness(config: BirthConfig): Promise<BirthResult> {
  const errors: string[] = []
  const p = prisma as any

  // 1. Verificare readiness
  const readiness = await checkBirthReadiness()
  if (!readiness.ready) {
    return { success: false, agentsCreated: 0, kbSeeded: 0, errors: [`Organism-mama nu e ready (score: ${readiness.score}). Blockers: ${readiness.blockers.join(", ")}`] }
  }

  // 2. Creare Business entity
  let businessId: string
  try {
    const biz = await p.business.create({
      data: {
        id: `biz_${config.businessSlug}`,
        name: config.businessName,
        slug: config.businessSlug,
        description: config.description,
        status: "PRE_LAUNCH",
        lifecyclePhase: config.lifecyclePhase,
        mission: "", // se completeaza prin Company Profiler
        vision: "",
        values: [],
      },
    })
    businessId = biz.id
  } catch (e: any) {
    return { success: false, agentsCreated: 0, kbSeeded: 0, errors: [`Eroare creare business: ${e.message}`] }
  }

  // 3. Seed L1 — mostenire moral core + KB CAMP
  let kbSeeded = 0
  try {
    // Copiem KB entries tagged "meta-organism" si "CAMP" de la organism-mama
    const l1Entries = await p.kBEntry?.findMany({
      where: {
        OR: [
          { tags: { hasSome: ["meta-organism"] } },
          { tags: { hasSome: ["moral-core", "CAMP", "L1"] } },
        ],
      },
      take: 100,
    }) ?? []

    // Cream o copie per business nou (marcata cu businessId)
    for (const entry of l1Entries) {
      try {
        await p.kBEntry?.create({
          data: {
            agentRole: entry.agentRole,
            kbType: entry.kbType,
            content: entry.content,
            source: "INHERITED_L1",
            confidence: entry.confidence,
            status: "PERMANENT",
            tags: [...(entry.tags || []), `business:${businessId}`, "inherited"],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        kbSeeded++
      } catch {}
    }
  } catch (e: any) {
    errors.push(`L1 seed partial: ${e.message}`)
  }

  // 4. Creare agenti minimali per business
  let agentsCreated = 0
  const minimalAgents = config.initialAgents.length > 0
    ? config.initialAgents
    : ["COG", "COA", "PMA", "SOA"] // minim viable

  for (const role of minimalAgents) {
    try {
      await p.agentDefinition?.create({
        data: {
          agentRole: `${role}_${config.businessSlug}`,
          displayName: `${role} (${config.businessName})`,
          description: `Agent ${role} pentru ${config.businessName}`,
          level: role === "COG" ? "STRATEGIC" : "TACTICAL",
          isManager: ["COG", "COA", "PMA"].includes(role),
          isActive: true,
          activityMode: "PROACTIVE_CYCLIC",
          coldStartPrompts: [],
        },
      })
      agentsCreated++
    } catch {}
  }

  // 5. Log nastere
  try {
    await prisma.systemConfig.upsert({
      where: { key: `BUSINESS_BIRTH_${config.businessSlug}` },
      update: { value: JSON.stringify({ businessId, agentsCreated, kbSeeded, birthDate: new Date().toISOString(), config }) },
      create: { key: `BUSINESS_BIRTH_${config.businessSlug}`, value: JSON.stringify({ businessId, agentsCreated, kbSeeded, birthDate: new Date().toISOString(), config }) },
    })
  } catch {}

  return {
    success: errors.length === 0,
    businessId,
    agentsCreated,
    kbSeeded,
    errors,
  }
}
