/**
 * API Route — Evaluare Comună (Art. 10, Directiva UE 2023/970)
 *
 * POST: Acțiuni workflow (trigger, add-participant, create-plan, check-deadlines, re-evaluate, journal)
 * GET:  Listare evaluări comune pentru tenant
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import {
  triggerJointAssessment,
  addParticipant,
  generateRemediationPlan,
  checkDeadlines,
  reEvaluateGap,
  getAssessmentJournal,
} from "@/lib/payroll/joint-assessment-workflow"

export const maxDuration = 60

// ── GET — Listare evaluări comune ──────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { tenantId } = session.user
    const db = prisma as any

    const assessments = await db.jointPayAssessment.findMany({
      where: { tenantId },
      include: { report: { select: { reportYear: true } } },
      orderBy: { triggeredAt: "desc" },
    })

    // Îmbogățim cu date din workflow
    const enriched = assessments.map((a: any) => {
      const data = a.actionPlan as any
      return {
        id: a.id,
        tenantId: a.tenantId,
        triggeredAt: a.triggeredAt,
        triggerReason: a.triggerReason,
        statusPrisma: a.status,
        workflowStatus: data?.workflowStatus ?? a.status,
        categorie: data?.categorie ?? "—",
        tipCategorie: data?.tipCategorie ?? "—",
        gapInițial: data?.gapInițial ?? null,
        gapActual: data?.gapActual ?? null,
        termenLimită: data?.termenLimită ?? a.dueDate,
        numărParticipanți: data?.participanți?.length ?? 0,
        arePlanRemediere: !!data?.planRemediere,
        reportYear: a.report?.reportYear ?? null,
      }
    })

    return NextResponse.json({ assessments: enriched })
  } catch (error) {
    console.error("[JOINT-ASSESSMENT GET]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}

// ── POST — Acțiuni workflow ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { role, tenantId, id: userId } = session.user
    if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const body = await req.json()
    const { action, ...params } = body

    if (!action) {
      return NextResponse.json(
        { message: "Câmpul action este obligatoriu." },
        { status: 422 }
      )
    }

    const db = prisma as any

    switch (action) {
      // ── Declanșare evaluare comună ──
      case "trigger": {
        const { category, categoryType, gapPercent } = params

        if (!category || !categoryType || gapPercent == null) {
          return NextResponse.json(
            {
              message:
                "Parametri lipsă: category, categoryType, gapPercent sunt obligatorii.",
            },
            { status: 422 }
          )
        }

        if (Math.abs(gapPercent) <= 5) {
          return NextResponse.json(
            {
              message: `Gap-ul de ${gapPercent}% nu depășește pragul de 5%. Art. 10 nu se aplică.`,
            },
            { status: 422 }
          )
        }

        const assessment = await triggerJointAssessment(
          tenantId,
          category,
          categoryType,
          gapPercent,
          db
        )

        return NextResponse.json(
          {
            message: `Evaluare comună declanșată pentru "${category}" (gap: ${gapPercent}%).`,
            assessment,
          },
          { status: 201 }
        )
      }

      // ── Adăugare participant ──
      case "add-participant": {
        const { assessmentId, name, email, participantRole } = params

        if (!assessmentId || !name || !email || !participantRole) {
          return NextResponse.json(
            {
              message:
                "Parametri lipsă: assessmentId, name, email, participantRole sunt obligatorii.",
            },
            { status: 422 }
          )
        }

        if (!["MANAGEMENT", "WORKER_REP", "FACILITATOR"].includes(participantRole)) {
          return NextResponse.json(
            {
              message:
                "Rol invalid. Roluri acceptate: MANAGEMENT, WORKER_REP, FACILITATOR.",
            },
            { status: 422 }
          )
        }

        // Verificăm că evaluarea aparține tenant-ului
        const existing = await db.jointPayAssessment.findFirst({
          where: { id: assessmentId, tenantId },
        })
        if (!existing) {
          return NextResponse.json(
            { message: "Evaluare negăsită sau nu aparține organizației." },
            { status: 404 }
          )
        }

        const updated = await addParticipant(
          assessmentId,
          { name, email, role: participantRole },
          userId,
          db
        )

        return NextResponse.json({
          message: `Participant ${name} adăugat cu succes.`,
          assessment: updated,
        })
      }

      // ── Creare plan de remediere ──
      case "create-plan": {
        const { assessmentId, causes, actions: planActions } = params

        if (
          !assessmentId ||
          !Array.isArray(causes) ||
          causes.length === 0 ||
          !Array.isArray(planActions) ||
          planActions.length === 0
        ) {
          return NextResponse.json(
            {
              message:
                "Parametri lipsă: assessmentId, causes (array), actions (array) sunt obligatorii.",
            },
            { status: 422 }
          )
        }

        // Validăm structura acțiunilor
        for (const act of planActions) {
          if (!act.descriere || !act.responsabil || !act.termenLimita) {
            return NextResponse.json(
              {
                message:
                  "Fiecare acțiune trebuie să conțină: descriere, responsabil, termenLimita.",
              },
              { status: 422 }
            )
          }
        }

        // Verificăm că evaluarea aparține tenant-ului
        const existingPlan = await db.jointPayAssessment.findFirst({
          where: { id: assessmentId, tenantId },
        })
        if (!existingPlan) {
          return NextResponse.json(
            { message: "Evaluare negăsită sau nu aparține organizației." },
            { status: 404 }
          )
        }

        const updated = await generateRemediationPlan(
          assessmentId,
          causes,
          planActions,
          userId,
          db
        )

        return NextResponse.json({
          message: `Plan de remediere creat cu ${planActions.length} acțiuni.`,
          assessment: updated,
        })
      }

      // ── Verificare termene ──
      case "check-deadlines": {
        const alerts = await checkDeadlines(tenantId, db)

        return NextResponse.json({
          message: `${alerts.length} alertă(e) de termen identificate.`,
          alerts,
        })
      }

      // ── Re-evaluare gap ──
      case "re-evaluate": {
        const { assessmentId: reEvalId } = params

        if (!reEvalId) {
          return NextResponse.json(
            { message: "Parametru lipsă: assessmentId este obligatoriu." },
            { status: 422 }
          )
        }

        const existingReEval = await db.jointPayAssessment.findFirst({
          where: { id: reEvalId, tenantId },
        })
        if (!existingReEval) {
          return NextResponse.json(
            { message: "Evaluare negăsită sau nu aparține organizației." },
            { status: 404 }
          )
        }

        const result = await reEvaluateGap(reEvalId, db)

        return NextResponse.json({
          message: result.remediat
            ? `Gap remediat! Noua valoare: ${result.gapNou}% (sub 5%).`
            : `Gap-ul este acum ${result.gapNou}% — încă peste pragul de 5%. Monitorizarea continuă.`,
          gapNou: result.gapNou,
          remediat: result.remediat,
          assessment: result.assessment,
        })
      }

      // ── Jurnal complet ──
      case "journal": {
        const { assessmentId: journalId } = params

        if (!journalId) {
          return NextResponse.json(
            { message: "Parametru lipsă: assessmentId este obligatoriu." },
            { status: 422 }
          )
        }

        const existingJournal = await db.jointPayAssessment.findFirst({
          where: { id: journalId, tenantId },
        })
        if (!existingJournal) {
          return NextResponse.json(
            { message: "Evaluare negăsită sau nu aparține organizației." },
            { status: 404 }
          )
        }

        const journal = await getAssessmentJournal(journalId, db)

        return NextResponse.json({ journal })
      }

      default:
        return NextResponse.json(
          {
            message: `Acțiune necunoscută: "${action}". Acțiuni valide: trigger, add-participant, create-plan, check-deadlines, re-evaluate, journal.`,
          },
          { status: 422 }
        )
    }
  } catch (error: any) {
    console.error("[JOINT-ASSESSMENT POST]", error)

    // Returnăm mesaje descriptive din workflow
    if (error?.message) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
