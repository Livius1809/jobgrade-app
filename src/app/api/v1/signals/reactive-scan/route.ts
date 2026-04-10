import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60
export const dynamic = "force-dynamic"

/**
 * POST /api/v1/signals/reactive-scan
 *
 * Signal → Task pipeline (livrat 10.04.2026, închide GAP din E2E test #1).
 *
 * Flow:
 *  1. Scan ExternalSignal cu processedAt=null (limit configurable)
 *  2. Pentru fiecare signal: map category → rol executor + descriere task
 *  3. Creează AgentTask ASSIGNED linked la primul obiectiv activ al rolului
 *  4. Marchează signal.processedAt = now + adaugă tema "reactive:{taskId}"
 *  5. Task va fi executat de task-executor cron (FLUX-057) în max 30 min
 *
 * Body: {
 *   limit?: number (default 10, max 50)
 *   categories?: string[] (default ALL)
 *   dryRun?: boolean (default false)
 * }
 *
 * Auth: x-internal-key
 */

const schema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  categories: z
    .array(
      z.enum([
        "MARKET_HR",
        "LEGAL_REG",
        "TECH_AI",
        "CULTURAL_SOCIAL",
        "COMPETITOR",
        "MACRO_ECONOMIC",
      ]),
    )
    .optional(),
  dryRun: z.boolean().optional().default(false),
})

// Maparea category → rol + descriere task. Primary role = ownerRoles[0] al
// obiectivului implicit. Dacă rolul nu are obiectiv activ, fallback la COG.
const CATEGORY_MAP: Record<
  string,
  { primaryRole: string; taskType: string; priority: string; titlePrefix: string }
> = {
  LEGAL_REG: {
    primaryRole: "CIA",
    taskType: "INVESTIGATION",
    priority: "HIGH",
    titlePrefix: "REACT LEGAL",
  },
  MARKET_HR: {
    primaryRole: "MKA",
    taskType: "DATA_ANALYSIS",
    priority: "HIGH",
    titlePrefix: "REACT PIAȚĂ HR",
  },
  TECH_AI: {
    primaryRole: "CIA",
    taskType: "INVESTIGATION",
    priority: "MEDIUM",
    titlePrefix: "REACT TECH/AI",
  },
  COMPETITOR: {
    primaryRole: "CIA",
    taskType: "INVESTIGATION",
    priority: "HIGH",
    titlePrefix: "REACT COMPETITOR",
  },
  CULTURAL_SOCIAL: {
    primaryRole: "MKA",
    taskType: "DATA_ANALYSIS",
    priority: "MEDIUM",
    titlePrefix: "REACT SOCIAL",
  },
  MACRO_ECONOMIC: {
    primaryRole: "COG",
    taskType: "DATA_ANALYSIS",
    priority: "MEDIUM",
    titlePrefix: "REACT MACRO",
  },
}

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

async function findObjectiveForRole(role: string): Promise<string | null> {
  const suffix = `--${role.toLowerCase()}`
  let obj = await (prisma as any).organizationalObjective.findFirst({
    where: { completedAt: null, code: { endsWith: suffix } },
    select: { id: true },
  })
  if (!obj) {
    obj = await (prisma as any).organizationalObjective.findFirst({
      where: { completedAt: null, ownerRoles: { has: role } },
      orderBy: { code: "asc" },
      select: { id: true },
    })
  }
  if (!obj) {
    obj = await (prisma as any).organizationalObjective.findFirst({
      where: { completedAt: null, contributorRoles: { has: role } },
      orderBy: { code: "asc" },
      select: { id: true },
    })
  }
  return obj?.id || null
}

export async function POST(req: NextRequest) {
  const startTs = Date.now()
  console.log(`[reactive-scan] POST entry`)

  if (!verifyInternalAuth(req)) {
    console.warn(`[reactive-scan] unauthorized request`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.warn(`[reactive-scan] invalid_input: ${JSON.stringify(parsed.error.flatten())}`)
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { limit = 10, categories, dryRun } = parsed.data
  try {

  // Query semnale neprocessate
  const where: any = { processedAt: null }
  if (categories && categories.length > 0) where.category = { in: categories }

  const signals = await (prisma as any).externalSignal.findMany({
    where,
    orderBy: { capturedAt: "desc" }, // cele mai recente primele
    take: limit,
    select: {
      id: true,
      source: true,
      sourceUrl: true,
      category: true,
      title: true,
      rawContent: true,
      capturedAt: true,
      publishedAt: true,
    },
  })

  console.log(`[reactive-scan] signals found=${signals.length} dryRun=${dryRun}`)

  // Cache obiective per rol (evită lookup repetat)
  const objectiveCache = new Map<string, string | null>()

  const tasksCreated: Array<{ signalId: string; taskId: string; role: string; category: string }> = []
  const skipped: Array<{ signalId: string; reason: string }> = []

  for (const s of signals) {
    const mapping = CATEGORY_MAP[s.category]
    if (!mapping) {
      skipped.push({ signalId: s.id, reason: `no_mapping_for_category:${s.category}` })
      continue
    }

    let objectiveId = objectiveCache.get(mapping.primaryRole)
    if (objectiveId === undefined) {
      objectiveId = await findObjectiveForRole(mapping.primaryRole)
      objectiveCache.set(mapping.primaryRole, objectiveId)
    }

    if (!objectiveId) {
      skipped.push({
        signalId: s.id,
        reason: `no_active_objective_for_role:${mapping.primaryRole}`,
      })
      continue
    }

    if (dryRun) {
      tasksCreated.push({
        signalId: s.id,
        taskId: "DRY-RUN",
        role: mapping.primaryRole,
        category: s.category,
      })
      continue
    }

    // Creează task
    const deadline = new Date(
      Date.now() + (mapping.priority === "HIGH" ? 48 : 72) * 60 * 60 * 1000,
    )
    const task = await (prisma as any).agentTask.create({
      data: {
        businessId: "biz_jobgrade",
        assignedBy: "COSO",
        assignedTo: mapping.primaryRole,
        title: `${mapping.titlePrefix}: ${s.title.slice(0, 100)}`,
        description: [
          `Semnal extern detectat în categoria ${s.category}.`,
          ``,
          `**Sursă:** ${s.source}`,
          `**URL:** ${s.sourceUrl}`,
          `**Capturat:** ${s.capturedAt}`,
          s.publishedAt ? `**Publicat:** ${s.publishedAt}` : null,
          ``,
          `**Titlu:** ${s.title}`,
          ``,
          `**Conținut raw:**`,
          s.rawContent.slice(0, 2000),
          s.rawContent.length > 2000 ? `... [truncated din ${s.rawContent.length} chars]` : "",
          ``,
          `---`,
          ``,
          `**SARCINA TA:**`,
          `1. Analizează impactul acestui semnal asupra JobGrade și obiectivului tău principal.`,
          `2. Identifică dacă necesită acțiune imediată, monitorizare, sau poate fi ignorat cu motivație.`,
          `3. Dacă necesită acțiune, propune un plan concret (cine face ce, până când).`,
          `4. Output: raport scurt structurat — relevanță (1-10), impact estimat, plan de acțiune.`,
          ``,
          `Dacă ai nevoie de informații suplimentare despre semnal, folosește web_search.`,
        ].filter(Boolean).join("\n"),
        taskType: mapping.taskType as any,
        priority: mapping.priority as any,
        objectiveId,
        tags: ["signal-reactive", `signal:${s.id}`, `category:${s.category}`, "auto-generated"],
        deadlineAt: deadline,
        estimatedMinutes: 30,
        status: "ASSIGNED",
      },
    })

    // Marchează signal processed
    await (prisma as any).externalSignal.update({
      where: { id: s.id },
      data: {
        processedAt: new Date(),
        themes: [...(s.themes || []), `reactive:${task.id}`],
      },
    })

    tasksCreated.push({
      signalId: s.id,
      taskId: task.id,
      role: mapping.primaryRole,
      category: s.category,
    })
    console.log(
      `[reactive-scan] signal=${s.id.slice(0, 12)} category=${s.category} → task=${task.id.slice(0, 12)} role=${mapping.primaryRole}`,
    )
  }

  const summary = {
    scanned: signals.length,
    tasksCreated: tasksCreated.length,
    skipped: skipped.length,
    durationMs: Date.now() - startTs,
    dryRun,
  }
  console.log(`[reactive-scan] done ${JSON.stringify(summary)}`)

    return NextResponse.json({
      summary,
      tasksCreated,
      skipped,
    })
  } catch (e: any) {
    console.error(`[reactive-scan] fatal error: ${e.message}`, e.stack)
    return NextResponse.json(
      { error: "scan_failed", details: e.message },
      { status: 500 },
    )
  }
}
