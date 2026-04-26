/**
 * POST /api/v1/admin/exec
 *
 * Endpoint sigur pentru operațiuni administrative pe DB-ul REAL (prod).
 * Elimină problema dev-vs-prod: scripturile locale apelează acest endpoint
 * pe https://jobgrade.ro, care folosește DB-ul de prod automat.
 *
 * Operațiuni suportate:
 *   - kb-seed: inserare KB entries
 *   - create-task: creare task agent
 *   - create-agent: creare agent definition
 *   - update-agent: update cold start prompts etc.
 *   - create-notification: notificare Owner
 *   - raw-query: query SQL readonly (SELECT only)
 *
 * Auth: x-internal-key OBLIGATORIU
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function verifyAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { operation, data } = body

  if (!operation) {
    return NextResponse.json({ error: "operation obligatoriu" }, { status: 400 })
  }

  const p = prisma as any

  try {
    switch (operation) {
      case "kb-seed": {
        // data: { entries: [{ agentRole, kbType, content, tags, confidence, source }] }
        const entries = data.entries || []
        let created = 0, skipped = 0
        for (const entry of entries) {
          const exists = await p.kBEntry.findFirst({
            where: { agentRole: entry.agentRole, content: entry.content, status: "PERMANENT" },
          })
          if (exists) { skipped++; continue }
          await p.kBEntry.create({
            data: {
              agentRole: entry.agentRole,
              kbType: entry.kbType || "SHARED_DOMAIN",
              content: entry.content,
              tags: entry.tags || [],
              confidence: entry.confidence || 0.75,
              source: entry.source || "EXPERT_HUMAN",
              status: "PERMANENT",
              usageCount: 0,
              validatedAt: new Date(),
            },
          })
          created++
        }
        return NextResponse.json({ ok: true, operation, created, skipped })
      }

      case "create-task": {
        // data: { businessId, assignedBy, assignedTo, title, description, taskType, priority, tags }
        const task = await p.agentTask.create({ data: {
          businessId: data.businessId || "biz_jobgrade",
          assignedBy: data.assignedBy || "OWNER",
          assignedTo: data.assignedTo,
          title: data.title,
          description: data.description || "",
          taskType: data.taskType || "PROCESS_EXECUTION",
          priority: data.priority || "NECESAR",
          status: "ASSIGNED",
          tags: data.tags || [],
        }})
        return NextResponse.json({ ok: true, operation, taskId: task.id })
      }

      case "create-tasks-batch": {
        // data: { tasks: [{ assignedBy, assignedTo, title, description, taskType, priority, tags }] }
        let created = 0
        for (const t of data.tasks || []) {
          await p.agentTask.create({ data: {
            businessId: t.businessId || "biz_jobgrade",
            assignedBy: t.assignedBy || "OWNER",
            assignedTo: t.assignedTo,
            title: t.title,
            description: t.description || "",
            taskType: t.taskType || "PROCESS_EXECUTION",
            priority: t.priority || "NECESAR",
            status: "ASSIGNED",
            tags: t.tags || [],
          }})
          created++
        }
        return NextResponse.json({ ok: true, operation, created })
      }

      case "create-agent": {
        // data: { agentRole, displayName, description, level, isManager, activityMode, coldStartPrompts }
        const exists = await p.agentDefinition.findFirst({ where: { agentRole: data.agentRole } })
        if (exists) return NextResponse.json({ ok: true, operation, action: "already-exists" })
        await p.agentDefinition.create({ data: {
          agentRole: data.agentRole,
          displayName: data.displayName,
          description: data.description,
          level: data.level || "OPERATIONAL",
          isManager: data.isManager || false,
          isActive: true,
          coldStartDescription: data.description,
          coldStartPrompts: data.coldStartPrompts || [],
          createdBy: "OWNER",
          activityMode: data.activityMode || "REACTIVE_TRIGGERED",
        }})
        return NextResponse.json({ ok: true, operation, action: "created" })
      }

      case "update-agent": {
        // data: { agentRole, fields: { coldStartPrompts?, description?, ... } }
        await p.agentDefinition.update({
          where: { agentRole: data.agentRole },
          data: data.fields,
        })
        return NextResponse.json({ ok: true, operation, action: "updated" })
      }

      case "create-notification": {
        // data: { title, body, sourceRole, requestKind, requestData }
        const owner = await p.user.findFirst({
          where: { role: { in: ["OWNER", "SUPER_ADMIN"] } },
          select: { id: true },
        })
        if (!owner) return NextResponse.json({ error: "Owner not found" }, { status: 500 })
        await p.notification.create({ data: {
          userId: owner.id,
          type: "REPORT_GENERATED",
          title: data.title,
          body: data.body,
          read: false,
          sourceRole: data.sourceRole || "SYSTEM",
          requestKind: data.requestKind || "INFORMATION",
          requestData: data.requestData ? JSON.stringify(data.requestData) : null,
        }})
        return NextResponse.json({ ok: true, operation, action: "notified" })
      }

      case "read-query": {
        // data: { sql: "SELECT ..." } — READONLY, no mutations allowed
        const sql = (data.sql || "").trim()
        if (!sql.toUpperCase().startsWith("SELECT")) {
          return NextResponse.json({ error: "Doar SELECT permis" }, { status: 400 })
        }
        const result = await p.$queryRawUnsafe(sql)
        return NextResponse.json({ ok: true, operation, rows: result })
      }

      default:
        return NextResponse.json({ error: `Operațiune necunoscută: ${operation}` }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message, operation }, { status: 500 })
  }
}
