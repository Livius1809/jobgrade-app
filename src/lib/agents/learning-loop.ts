/**
 * learning-loop.ts — Feedback negativ → KB agent
 *
 * Când Owner sau Claude corectează un task (conținut greșit, cifre inventate etc.),
 * se creează automat o regulă în KB-ul agentului care a greșit.
 * Agentul "învață" din greșeală — la următoarea execuție va vedea regula în context.
 *
 * Tipuri de lecții:
 *   - FABRICATION: a inventat cifre, testimoniale, certificări
 *   - INACCURACY: informație incorectă (sursă greșită, cifre greșite)
 *   - METHODOLOGY_LEAK: a expus metodologie proprietară
 *   - TONE_VIOLATION: ton nepotrivit, englezisme, superlative
 */

import { prisma } from "@/lib/prisma"

export type LessonType = "FABRICATION" | "INACCURACY" | "METHODOLOGY_LEAK" | "TONE_VIOLATION"

export interface LearningFeedback {
  taskId: string
  agentRole: string
  lessonType: LessonType
  whatWasWrong: string
  whatIsCorrect: string
  correctedBy: "OWNER" | "CLAUDE" | "COG"
}

/**
 * Creează o lecție în KB-ul agentului care a greșit.
 * Lecția e permanentă și tagată "lesson-learned" — prompt builder-ul o include în context.
 */
export async function recordLessonLearned(feedback: LearningFeedback): Promise<string> {
  const p = prisma as any

  const content = [
    `[LECȚIE ÎNVĂȚATĂ — ${feedback.lessonType}]`,
    ``,
    `CE AM GREȘIT: ${feedback.whatWasWrong}`,
    ``,
    `CE E CORECT: ${feedback.whatIsCorrect}`,
    ``,
    `REGULĂ: Nu repet această greșeală. Verific sursele înainte de a produce conținut.`,
    ``,
    `Corectat de: ${feedback.correctedBy} | Task: ${feedback.taskId} | Data: ${new Date().toISOString().split("T")[0]}`,
  ].join("\n")

  const entry = await p.kBEntry.create({
    data: {
      agentRole: feedback.agentRole,
      kbType: "PERMANENT",
      content,
      source: "DISTILLED_INTERACTION",
      confidence: 1.0,
      status: "PERMANENT",
      tags: [
        "lesson-learned",
        `lesson-type:${feedback.lessonType.toLowerCase()}`,
        `corrected-by:${feedback.correctedBy.toLowerCase()}`,
        `task:${feedback.taskId}`,
      ],
      usageCount: 0,
      validatedAt: new Date(),
    },
  })

  return entry.id
}

/**
 * Înregistrează lecții pentru toți agenții implicați într-un incident.
 * Folosit când mai mulți agenți au produs aceeași greșeală (ex: MB-R1 audit).
 */
export async function recordBulkLesson(
  agentRoles: string[],
  lessonType: LessonType,
  whatWasWrong: string,
  whatIsCorrect: string,
  correctedBy: "OWNER" | "CLAUDE" | "COG",
  referenceTaskId?: string,
): Promise<string[]> {
  const ids: string[] = []
  for (const role of agentRoles) {
    const id = await recordLessonLearned({
      taskId: referenceTaskId || "bulk-correction",
      agentRole: role,
      lessonType,
      whatWasWrong,
      whatIsCorrect,
      correctedBy,
    })
    ids.push(id)
  }
  return ids
}
