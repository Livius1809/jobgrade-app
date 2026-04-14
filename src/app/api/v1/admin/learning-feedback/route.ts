/**
 * POST /api/v1/admin/learning-feedback
 *
 * Înregistrează o lecție învățată în KB-ul unui agent după o corecție.
 * Folosit de Owner/Claude când corectează conținut greșit.
 *
 * Body: { agentRole, taskId, lessonType, whatWasWrong, whatIsCorrect, correctedBy }
 * sau: { agentRoles: [...], lessonType, whatWasWrong, whatIsCorrect, correctedBy } pentru bulk
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { recordLessonLearned, recordBulkLesson } from "@/lib/agents/learning-loop"
import type { LessonType } from "@/lib/agents/learning-loop"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { lessonType, whatWasWrong, whatIsCorrect, correctedBy = "OWNER" } = body

  if (!lessonType || !whatWasWrong || !whatIsCorrect) {
    return NextResponse.json(
      { error: "Missing required fields: lessonType, whatWasWrong, whatIsCorrect" },
      { status: 400 },
    )
  }

  const validTypes: LessonType[] = ["FABRICATION", "INACCURACY", "METHODOLOGY_LEAK", "TONE_VIOLATION"]
  if (!validTypes.includes(lessonType)) {
    return NextResponse.json({ error: `Invalid lessonType. Valid: ${validTypes.join(", ")}` }, { status: 400 })
  }

  // Bulk mode
  if (body.agentRoles && Array.isArray(body.agentRoles)) {
    const ids = await recordBulkLesson(
      body.agentRoles,
      lessonType,
      whatWasWrong,
      whatIsCorrect,
      correctedBy,
      body.taskId,
    )
    return NextResponse.json({ ok: true, entries: ids.length, ids })
  }

  // Single mode
  if (!body.agentRole || !body.taskId) {
    return NextResponse.json({ error: "Missing agentRole or taskId" }, { status: 400 })
  }

  const id = await recordLessonLearned({
    taskId: body.taskId,
    agentRole: body.agentRole,
    lessonType,
    whatWasWrong,
    whatIsCorrect,
    correctedBy,
  })

  return NextResponse.json({ ok: true, entryId: id })
}
