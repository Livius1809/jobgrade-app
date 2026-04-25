/**
 * POST /api/v1/owner/contribute
 *
 * Endpoint unificat prin care Owner-ul contribuie direct la sănătatea cognitivă.
 * 7 tipuri de contribuții, fiecare afectează subfactori specifici:
 *
 *   moral_dialogue    → H. Consistență morală (dialog cu agent pe dilemă)
 *   quality_review     → C. Acuratețe decizională (evaluare calitate task)
 *   escalation_response → D. Calibrare certitudine (răspuns la escalare)
 *   phase_confirm      → E. Coerență cu faza (confirmă/corectează faza)
 *   waste_mark         → B. Rata non-deșeu (marchează task ca inutil)
 *   agent_flag         → F. Coeziune agenți (semnalează agent cu problemă)
 *   objective_adjust   → G. Velocitate obiective (ajustează prioritate)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const ContributionSchema = z.discriminatedUnion("type", [
  // H. Dialog moral cu un agent
  z.object({
    type: z.literal("moral_dialogue"),
    agentRole: z.string(),
    dilemma: z.string().min(10),
    agentResponse: z.string().optional(),
    ownerFeedback: z.string().min(5),
    wasCorrect: z.boolean(),
  }),
  // C. Evaluare calitate rezultat task
  z.object({
    type: z.literal("quality_review"),
    taskId: z.string(),
    quality: z.number().int().min(0).max(100),
    feedback: z.string().optional(),
  }),
  // D. Răspuns la escalare
  z.object({
    type: z.literal("escalation_response"),
    taskId: z.string(),
    decision: z.enum(["APPROVE", "REJECT", "REDIRECT"]),
    reason: z.string().optional(),
    redirectTo: z.string().optional(),
  }),
  // E. Confirmă/corectează faza business
  z.object({
    type: z.literal("phase_confirm"),
    detectedPhase: z.string(),
    confirmedPhase: z.enum(["PRE_LAUNCH", "LAUNCH", "TRACTION", "SCALE"]),
    reason: z.string().optional(),
  }),
  // B. Marchează task ca inutil/deșeu
  z.object({
    type: z.literal("waste_mark"),
    taskId: z.string(),
    reason: z.string().optional(),
  }),
  // F. Semnalează agent cu problemă
  z.object({
    type: z.literal("agent_flag"),
    agentRole: z.string(),
    concern: z.string().min(5),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  }),
  // G. Ajustează prioritate obiectiv
  z.object({
    type: z.literal("objective_adjust"),
    objectiveId: z.string(),
    newPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    newTargetValue: z.number().optional(),
    reason: z.string().optional(),
  }),
])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const { role } = session.user
  if (role !== "SUPER_ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Doar Owner poate contribui direct" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = ContributionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide", details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const effects: string[] = []

  try {
    switch (data.type) {
      // ═══ H. DIALOG MORAL ═══
      case "moral_dialogue": {
        // 1. Creează precedent moral (Strat 7)
        await prisma.kBEntry.create({
          data: {
            agentRole: "MORAL_CORE",
            kbType: "METHODOLOGY",
            source: "EXPERT_HUMAN",
            status: "PERMANENT",
            confidence: data.wasCorrect ? 8 : 5,
            tags: ["moral-precedent", "jurisprudence", "owner-dialogue", data.agentRole.toLowerCase()],
            content: JSON.stringify({
              dilemma: data.dilemma,
              decision: data.agentResponse || "Pendinte",
              consequence: data.ownerFeedback,
              agentRole: data.agentRole,
              ownerValidated: data.wasCorrect,
            }),
          },
        })
        effects.push("Precedent moral creat")

        // 2. Update stare cognitivă agent
        try {
          const { loadCognitiveState, saveCognitiveState, createInitialState } = await import("@/lib/agents/cognitive-state")
          let state = await loadCognitiveState(data.agentRole)
          if (!state) state = createInitialState(data.agentRole)

          if (data.wasCorrect) {
            state.current.moralConviction = Math.min(100, (state.current.moralConviction ?? 50) + 8)
            effects.push(`${data.agentRole} convingere morală +8 (răspuns corect)`)
          } else {
            state.current.moralConviction = Math.max(10, (state.current.moralConviction ?? 50) - 3)
            state.current.integratedLessons.push({
              date: new Date().toISOString().slice(0, 10),
              trigger: `Dialog moral Owner: "${data.dilemma.slice(0, 50)}"`,
              lesson: data.ownerFeedback.slice(0, 100),
              behaviorChange: "Corecție de la Owner — integrare în curs",
              validated: false,
            })
            effects.push(`${data.agentRole} lecție morală integrată (corecție Owner)`)
          }

          state.lastUpdated = new Date().toISOString()
          await saveCognitiveState(state)
        } catch {}

        break
      }

      // ═══ C. EVALUARE CALITATE ═══
      case "quality_review": {
        await prisma.agentTask.update({
          where: { id: data.taskId },
          data: {
            resultQuality: data.quality,
            reviewedBy: "OWNER",
            reviewedAt: new Date(),
            reviewNote: data.feedback || null,
          },
        })

        const task = await prisma.agentTask.findUnique({
          where: { id: data.taskId },
          select: { assignedTo: true, title: true },
        })

        if (task) {
          try {
            const { loadCognitiveState, saveCognitiveState, createInitialState } = await import("@/lib/agents/cognitive-state")
            let state = await loadCognitiveState(task.assignedTo)
            if (!state) state = createInitialState(task.assignedTo)

            if (data.quality >= 70) {
              state.current.certaintyLevel = Math.min(95, state.current.certaintyLevel + 3)
              effects.push(`${task.assignedTo} certitudine +3 (calitate ${data.quality}/100)`)
            } else {
              state.current.certaintyLevel = Math.max(10, state.current.certaintyLevel - 5)
              state.current.integratedLessons.push({
                date: new Date().toISOString().slice(0, 10),
                trigger: `Review Owner calitate ${data.quality}/100: "${task.title.slice(0, 50)}"`,
                lesson: data.feedback || "Calitate sub așteptări",
                behaviorChange: "Pendinte",
                validated: false,
              })
              effects.push(`${task.assignedTo} lecție calitate integrată`)
            }

            state.lastUpdated = new Date().toISOString()
            await saveCognitiveState(state)
          } catch {}
        }

        effects.push(`Task evaluat: ${data.quality}/100`)
        break
      }

      // ═══ D. RĂSPUNS ESCALARE ═══
      case "escalation_response": {
        const task = await prisma.agentTask.findUnique({
          where: { id: data.taskId },
          select: { assignedTo: true, title: true },
        })

        if (data.decision === "APPROVE") {
          await prisma.agentTask.update({
            where: { id: data.taskId },
            data: { status: "ASSIGNED", blockerType: null, blockerDescription: null, blockedAt: null },
          })
          effects.push("Task deblocat — Owner aprobă direcția")
        } else if (data.decision === "REJECT") {
          await prisma.agentTask.update({
            where: { id: data.taskId },
            data: { status: "CANCELLED", result: `[OWNER-REJECT] ${data.reason || "Respins de Owner"}` },
          })
          effects.push("Task anulat — Owner respinge")
        } else if (data.decision === "REDIRECT" && data.redirectTo) {
          await prisma.agentTask.update({
            where: { id: data.taskId },
            data: { assignedTo: data.redirectTo, status: "ASSIGNED", blockerType: null, blockerDescription: null, blockedAt: null },
          })
          effects.push(`Task redirecționat → ${data.redirectTo}`)
        }

        // Lecție: escalarea a fost necesară?
        if (task) {
          try {
            const { loadCognitiveState, saveCognitiveState, createInitialState } = await import("@/lib/agents/cognitive-state")
            let state = await loadCognitiveState(task.assignedTo)
            if (!state) state = createInitialState(task.assignedTo)

            state.current.integratedLessons.push({
              date: new Date().toISOString().slice(0, 10),
              trigger: `Escalare → Owner: "${task.title.slice(0, 50)}"`,
              lesson: `Owner a ${data.decision === "APPROVE" ? "aprobat" : data.decision === "REJECT" ? "respins" : "redirecționat"}. ${data.reason || ""}`.trim(),
              behaviorChange: data.decision === "APPROVE" ? "Escalarea a fost justificată — continuă să escalezi în situații similare" : "Escalarea nu era necesară — încearcă să rezolvi singur data viitoare",
              validated: true,
            })
            state.lastUpdated = new Date().toISOString()
            await saveCognitiveState(state)
          } catch {}
        }

        break
      }

      // ═══ E. CONFIRMARE FAZĂ ═══
      case "phase_confirm": {
        await prisma.systemConfig.upsert({
          where: { key: "OWNER_CONFIRMED_PHASE" },
          update: { value: JSON.stringify({ phase: data.confirmedPhase, confirmedAt: new Date().toISOString(), reason: data.reason }) },
          create: { key: "OWNER_CONFIRMED_PHASE", value: JSON.stringify({ phase: data.confirmedPhase, confirmedAt: new Date().toISOString(), reason: data.reason }) },
        })
        effects.push(`Faza confirmată: ${data.confirmedPhase}`)
        break
      }

      // ═══ B. MARCHEAZĂ DEȘEU ═══
      case "waste_mark": {
        await prisma.agentTask.update({
          where: { id: data.taskId },
          data: { status: "CANCELLED", result: `[OWNER-WASTE] ${data.reason || "Marcat ca inutil de Owner"}` },
        })
        effects.push("Task marcat ca deșeu — organism învață")
        break
      }

      // ═══ F. SEMNALARE AGENT ═══
      case "agent_flag": {
        await prisma.kBEntry.create({
          data: {
            agentRole: "COG",
            kbType: "PERMANENT",
            source: "EXPERT_HUMAN",
            status: "PERMANENT",
            confidence: data.severity === "HIGH" ? 9 : data.severity === "MEDIUM" ? 6 : 3,
            tags: ["owner-flag", "agent-concern", data.agentRole.toLowerCase()],
            content: `Owner semnalează ${data.agentRole}: ${data.concern} [Severitate: ${data.severity}]`,
          },
        })
        effects.push(`${data.agentRole} semnalat — COG va investiga`)
        break
      }

      // ═══ G. AJUSTARE OBIECTIV ═══
      case "objective_adjust": {
        const updateData: any = {}
        if (data.newPriority) updateData.priority = data.newPriority
        if (data.newTargetValue !== undefined) updateData.targetValue = data.newTargetValue

        await prisma.organizationalObjective.update({
          where: { id: data.objectiveId },
          data: updateData,
        })
        effects.push(`Obiectiv ajustat${data.newPriority ? ` → ${data.newPriority}` : ""}`)
        break
      }
    }

    return NextResponse.json({
      ok: true,
      type: data.type,
      effects,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
