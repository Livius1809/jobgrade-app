/**
 * je-process-engine.ts — Motorul complet de evaluare a posturilor (Job Evaluation)
 *
 * Acoperă tot ciclul de viață al unei sesiuni de evaluare:
 *   Sprint 5: Pre-scoring (evaluare individuală asincronă)
 *   Sprint 6: Benchmark selection + Slotting
 *   Sprint 7: Owner validation (ajustare din MVV)
 *   Sprint 8: Finalizare + jurnal complet
 *
 * REGULI CRITICE:
 *   - Literele (A-G) sunt vizibile evaluatorilor
 *   - Punctele sunt SECRET DE SERVICIU — nu se expun niciodată
 *   - Gradul se calculează exclusiv din puncte, în backend
 *   - Toate operațiile sunt tenant-scoped
 */

import {
  SCORING_TABLE,
  CriterionKey,
  calculateTotalPoints,
  getGradeFromPoints,
  GRADE_THRESHOLDS,
} from "./scoring-table"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { buildAgentPromptWithKB } from "@/lib/agents/agent-prompt-builder"

// ═══════════════════════════════════════════════════════════════════════════════
// TIPURI
// ═══════════════════════════════════════════════════════════════════════════════

export interface PreScoreInput {
  /** Litere per criteriu: { Knowledge: "D", Communications: "C", ... } */
  [criterionKey: string]: string
}

export interface RevealedScore {
  criterionId: string
  criterionName: string
  evaluators: Array<{
    userId: string
    userName: string
    letter: string
  }>
  consensusLetter: string | null
  needsMediation: boolean
  maxDivergence: number
}

export interface BenchmarkSuggestion {
  jobId: string
  jobTitle: string
  department: string
  reasoning: string
}

export interface SlottingSuggestion {
  suggestedGrade: number
  suggestedGradeLabel: string
  mostSimilarBenchmarkId: string
  mostSimilarBenchmarkTitle: string
  reasoning: string
  letterScores: Record<string, string>
}

export interface HierarchyEntry {
  jobId: string
  jobTitle: string
  department: string
  grade: number
  gradeLabel: string
  letters: Record<string, string>
  totalPoints: number // doar intern, nu se expune în API
  isBenchmark: boolean
  isSlotted: boolean
  adjustedByOwner: boolean
}

export interface AdjustmentImpact {
  jobId: string
  jobTitle: string
  currentGrade: number
  newGrade: number
  positionsAbove: Array<{ jobId: string; jobTitle: string; grade: number }>
  positionsBelow: Array<{ jobId: string; jobTitle: string; grade: number }>
  affectedInSameGrade: Array<{ jobId: string; jobTitle: string }>
}

export interface JournalEntry {
  timestamp: Date
  action: string
  actorId: string
  actorName: string
  details: Record<string, unknown>
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITĂȚI INTERNE
// ═══════════════════════════════════════════════════════════════════════════════

/** Mapare: nume criteriu din SCORING_TABLE → ID din tabelul criteria */
const CRITERION_KEY_MAP: Record<string, string> = {
  Knowledge: "Knowledge",
  Communications: "Communications",
  ProblemSolving: "ProblemSolving",
  DecisionMaking: "DecisionMaking",
  BusinessImpact: "BusinessImpact",
  WorkingConditions: "WorkingConditions",
}

/**
 * Mapare: nume criterii seed-uite în română (afișate user-ului) →
 * cheia din SCORING_TABLE (internă, engleză).
 * Fix 10.04.2026: engine-ul popula letters cu chei românești, iar
 * calculateTotalPoints căuta chei engleze → total 0, grade 8 degenerat.
 */
const CRITERION_NAME_TO_KEY: Record<string, string> = {
  "Educație / Experiență": "Knowledge",
  "Comunicare": "Communications",
  "Rezolvarea problemelor": "ProblemSolving",
  "Luarea deciziilor": "DecisionMaking",
  "Impact asupra afacerii": "BusinessImpact",
  "Condiții de lucru": "WorkingConditions",
  // Aliasuri comune
  "Educatie / Experienta": "Knowledge",
  "Educație": "Knowledge",
  "Rezolvare probleme": "ProblemSolving",
  "Decizie": "DecisionMaking",
  "Impact": "BusinessImpact",
  "Condiții muncă": "WorkingConditions",
}

/** Normalizează cheia unui criteriu: dacă e română, mapează la engleză. */
function normalizeCriterionKey(name: string): string {
  if (CRITERION_NAME_TO_KEY[name]) return CRITERION_NAME_TO_KEY[name]
  // Fallback: dacă numele e deja o cheie valid engleză, returnează-l ca atare
  return name
}

/** Ordinul literelor pentru calcul divergență */
const LETTER_ORDER: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7,
}

function letterDivergence(a: string, b: string): number {
  return Math.abs((LETTER_ORDER[a] ?? 0) - (LETTER_ORDER[b] ?? 0))
}

/** Verifică dacă sesiunea aparține tenant-ului curent */
async function getSessionForTenant(
  sessionId: string,
  tenantId: string,
  prisma: any,
  includeRelations: Record<string, unknown> = {}
) {
  const session = await (prisma as any).evaluationSession.findFirst({
    where: { id: sessionId, tenantId },
    include: {
      sessionJobs: { include: { job: { include: { department: true } }, assignments: true } },
      participants: { include: { user: true } },
      ...includeRelations,
    },
  })
  if (!session) throw new Error("Sesiunea nu a fost găsită sau nu aparține organizației tale.")
  return session
}

/** Adaugă o intrare în jurnal (stocat ca AiGeneration de tip SESSION_ANALYSIS) */
async function addJournalEntry(
  sessionId: string,
  tenantId: string,
  action: string,
  actorId: string,
  details: Record<string, unknown>,
  prisma: any
) {
  await (prisma as any).aiGeneration.create({
    data: {
      tenantId,
      type: "SESSION_ANALYSIS",
      sourceId: sessionId,
      sourceType: "journal",
      prompt: action,
      output: JSON.stringify({
        timestamp: new Date().toISOString(),
        action,
        actorId,
        details,
      }),
      model: "system",
      tokensUsed: 0,
      credits: 0, // Journal entry — audit trail intern, zero credite
    },
  })
}

/** Obține criteriile din baza de date, cu subfactori */
async function getCriteriaWithSubfactors(prisma: any) {
  return await (prisma as any).criterion.findMany({
    where: { isActive: true },
    include: { subfactors: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  })
}

/** Extrage literele din evaluările unui job pentru un evaluator */
function extractLettersFromEvaluations(
  evaluations: any[],
  criteria: any[]
): Record<string, string> {
  const letters: Record<string, string> = {}
  for (const ev of evaluations) {
    const criterion = criteria.find((c: any) => c.id === ev.criterionId)
    if (!criterion) continue
    const subfactor = criterion.subfactors.find((s: any) => s.id === ev.subfactorId)
    if (!subfactor) continue
    letters[criterion.name] = subfactor.code
  }
  return letters
}

/** Calculează gradul pe baza literelor */
function gradeFromLetters(letters: Record<string, string>): { grade: number; label: string; points: number } {
  const points = calculateTotalPoints(letters as Record<CriterionKey, string>)
  const { grade, label } = getGradeFromPoints(points)
  return { grade, label, points }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 5: PRE-SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 1. Tranziționează sesiunea la PRE_SCORING.
 *    Creează assignment-uri: fiecare evaluator primește joburile din departamentul său.
 *    Evaluatorii fără departament primesc toate joburile.
 */
export async function startPreScoring(sessionId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionJobs: { include: { job: true } },
      participants: { include: { user: { include: { department: true } } } },
    },
  })

  if (!session) throw new Error("Sesiunea nu există.")
  if (session.status !== "DRAFT" && session.status !== "BENCHMARK_SELECTION") {
    throw new Error(`Nu se poate trece la PRE_SCORING din starea ${session.status}.`)
  }

  if (session.sessionJobs.length === 0) {
    throw new Error("Sesiunea nu are joburi adăugate.")
  }
  if (session.participants.length === 0) {
    throw new Error("Sesiunea nu are participanți.")
  }

  // Creează assignment-uri
  const assignments: Array<{ sessionJobId: string; userId: string }> = []

  for (const sj of session.sessionJobs) {
    for (const p of session.participants) {
      const userDeptId = p.user.departmentId
      const jobDeptId = sj.job.departmentId

      // Assign dacă: evaluatorul e din același departament SAU nu are departament (evaluator general)
      if (!userDeptId || userDeptId === jobDeptId) {
        assignments.push({ sessionJobId: sj.id, userId: p.userId })
      }
    }
  }

  // Dacă niciun evaluator nu se potrivește pe un job, assign toți evaluatorii
  for (const sj of session.sessionJobs) {
    const hasAssignment = assignments.some(a => a.sessionJobId === sj.id)
    if (!hasAssignment) {
      for (const p of session.participants) {
        assignments.push({ sessionJobId: sj.id, userId: p.userId })
      }
    }
  }

  // Upsert assignments (skipDuplicates)
  await (prisma as any).jobAssignment.createMany({
    data: assignments,
    skipDuplicates: true,
  })

  // Tranziție status
  const updated = await (prisma as any).evaluationSession.update({
    where: { id: sessionId },
    data: { status: "PRE_SCORING" },
  })

  await addJournalEntry(sessionId, session.tenantId, "PRE_SCORING_STARTED", "system", {
    totalJobs: session.sessionJobs.length,
    totalParticipants: session.participants.length,
    totalAssignments: assignments.length,
  }, prisma)

  return {
    status: updated.status,
    assignmentsCreated: assignments.length,
    message: `Pre-scoring-ul a început. ${assignments.length} atribuiri create.`,
  }
}

/**
 * 2. Stochează pre-scorul individual al unui evaluator pentru un job.
 *    scores: { Knowledge: "D", Communications: "C", ProblemSolving: "E", ... }
 */
export async function submitPreScore(
  sessionId: string,
  userId: string,
  jobId: string,
  scores: Record<string, string>,
  prisma: any
) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) throw new Error("Sesiunea nu există.")
  if (session.status !== "PRE_SCORING") {
    throw new Error("Sesiunea nu este în faza de pre-scoring.")
  }

  // Găsește SessionJob
  const sessionJob = await (prisma as any).sessionJob.findFirst({
    where: { sessionId, jobId },
  })
  if (!sessionJob) throw new Error("Jobul nu face parte din această sesiune.")

  // Găsește assignment
  const assignment = await (prisma as any).jobAssignment.findFirst({
    where: { sessionJobId: sessionJob.id, userId },
  })
  if (!assignment) throw new Error("Nu ești atribuit la acest job.")
  if (assignment.submittedAt) throw new Error("Ai trimis deja evaluarea pentru acest job.")

  // Obține criteriile cu subfactorii
  const criteria = await getCriteriaWithSubfactors(prisma)

  // Validare: toate cele 6 criterii trebuie să fie prezente
  const requiredCriteria = Object.keys(SCORING_TABLE)
  for (const key of requiredCriteria) {
    if (!scores[key]) {
      throw new Error(`Criteriul "${key}" lipsește din evaluare.`)
    }
    const table = SCORING_TABLE[key as CriterionKey]
    if (!(scores[key] in table)) {
      throw new Error(`Litera "${scores[key]}" nu este validă pentru criteriul "${key}".`)
    }
  }

  // Creează evaluările per criteriu
  const evaluationData = []
  for (const [criterionKey, letter] of Object.entries(scores)) {
    const criterion = criteria.find((c: any) => c.name === criterionKey)
    if (!criterion) continue

    const subfactor = criterion.subfactors.find((s: any) => s.code === letter)
    if (!subfactor) {
      throw new Error(`Subfactorul "${letter}" nu există pentru criteriul "${criterionKey}".`)
    }

    evaluationData.push({
      sessionId,
      assignmentId: assignment.id,
      criterionId: criterion.id,
      subfactorId: subfactor.id,
    })
  }

  // Upsert evaluări (overwrite dacă există)
  for (const ev of evaluationData) {
    await (prisma as any).evaluation.upsert({
      where: {
        assignmentId_criterionId: {
          assignmentId: ev.assignmentId,
          criterionId: ev.criterionId,
        },
      },
      update: { subfactorId: ev.subfactorId },
      create: ev,
    })
  }

  // Marchează assignment ca completat
  await (prisma as any).jobAssignment.update({
    where: { id: assignment.id },
    data: { submittedAt: new Date() },
  })

  await addJournalEntry(sessionId, session.tenantId, "PRE_SCORE_SUBMITTED", userId, {
    jobId,
    scores,
  }, prisma)

  return {
    message: "Evaluarea a fost înregistrată cu succes.",
    jobId,
    scores,
  }
}

/**
 * 3. Statusul pre-scoring-ului: cine a evaluat, cine nu, % complet.
 */
export async function getPreScoringStatus(sessionId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionJobs: {
        include: {
          job: { select: { id: true, title: true, departmentId: true } },
          assignments: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      },
      participants: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  })

  if (!session) throw new Error("Sesiunea nu există.")

  const jobStatuses = session.sessionJobs.map((sj: any) => {
    const total = sj.assignments.length
    const completed = sj.assignments.filter((a: any) => a.submittedAt !== null).length
    const pending = sj.assignments
      .filter((a: any) => a.submittedAt === null)
      .map((a: any) => ({
        userId: a.user.id,
        name: `${a.user.firstName} ${a.user.lastName}`,
        email: a.user.email,
      }))

    return {
      jobId: sj.job.id,
      jobTitle: sj.job.title,
      totalEvaluators: total,
      completedCount: completed,
      pendingCount: total - completed,
      pendingEvaluators: pending,
      isComplete: completed === total && total > 0,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  const totalAssignments = jobStatuses.reduce((s: number, j: any) => s + j.totalEvaluators, 0)
  const completedAssignments = jobStatuses.reduce((s: number, j: any) => s + j.completedCount, 0)

  return {
    sessionId,
    status: session.status,
    overallPercentComplete: totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0,
    totalAssignments,
    completedAssignments,
    jobs: jobStatuses,
  }
}

/**
 * 4. Revelă scorurile pentru un job — compară evaluările individuale.
 *    Returnează per criteriu: litera fiecărui evaluator, dacă e consens sau mediere.
 *    Divergență ±2 sau mai mare = mediere necesară.
 */
export async function revealScores(sessionId: string, jobId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  const sessionJob = await (prisma as any).sessionJob.findFirst({
    where: { sessionId, jobId },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          evaluations: true,
        },
      },
    },
  })
  if (!sessionJob) throw new Error("Jobul nu face parte din această sesiune.")

  // Verifică dacă toți evaluatorii au terminat
  const pendingCount = sessionJob.assignments.filter((a: any) => !a.submittedAt).length
  if (pendingCount > 0) {
    throw new Error(`Încă ${pendingCount} evaluator(i) nu au terminat. Nu se pot revela scorurile.`)
  }

  const criteria = await getCriteriaWithSubfactors(prisma)

  const revealed: RevealedScore[] = criteria.map((criterion: any) => {
    const evaluatorsForCriterion = sessionJob.assignments.map((assignment: any) => {
      const ev = assignment.evaluations.find((e: any) => e.criterionId === criterion.id)
      const subfactor = ev
        ? criterion.subfactors.find((s: any) => s.id === ev.subfactorId)
        : null

      return {
        userId: assignment.user.id,
        userName: `${assignment.user.firstName} ${assignment.user.lastName}`,
        letter: subfactor?.code ?? "?",
      }
    })

    // Calculează divergența maximă
    const letters = evaluatorsForCriterion.map((e: any) => e.letter).filter((l: string) => l !== "?")
    let maxDiv = 0
    for (let i = 0; i < letters.length; i++) {
      for (let j = i + 1; j < letters.length; j++) {
        const div = letterDivergence(letters[i], letters[j])
        if (div > maxDiv) maxDiv = div
      }
    }

    // Consens: toți au aceeași literă
    const uniqueLetters = Array.from(new Set<string>(letters))
    const consensusLetter = uniqueLetters.length === 1 ? uniqueLetters[0] : null

    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      evaluators: evaluatorsForCriterion,
      consensusLetter,
      needsMediation: maxDiv >= 2,
      maxDivergence: maxDiv,
    }
  })

  await addJournalEntry(sessionId, session.tenantId, "SCORES_REVEALED", "system", {
    jobId,
    criteriaWithMediation: revealed.filter(r => r.needsMediation).map(r => r.criterionName),
  }, prisma)

  return {
    jobId,
    criteria: revealed,
    overallNeedsMediation: revealed.some(r => r.needsMediation),
    consensusCount: revealed.filter(r => r.consensusLetter !== null).length,
    totalCriteria: revealed.length,
  }
}

/**
 * 5. Marchează un criteriu pe un job ca necesitând mediere.
 *    Creează/actualizează ConsensusStatus.
 */
export async function flagForMediation(
  sessionId: string,
  jobId: string,
  criterionId: string,
  prisma: any
) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  await (prisma as any).consensusStatus.upsert({
    where: {
      sessionId_jobId_criterionId: {
        sessionId,
        jobId,
        criterionId,
      },
    },
    update: { status: "RECALIBRATING" },
    create: {
      sessionId,
      jobId,
      criterionId,
      status: "RECALIBRATING",
    },
  })

  await addJournalEntry(sessionId, session.tenantId, "CRITERION_FLAGGED_MEDIATION", "system", {
    jobId,
    criterionId,
  }, prisma)

  return {
    message: "Criteriul a fost marcat pentru mediere.",
    jobId,
    criterionId,
    status: "RECALIBRATING",
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 6: BENCHMARK SELECTION + SLOTTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 6. AI analizează toate joburile și sugerează ~30% ca benchmarks,
 *    asigurând acoperire pe departamente + niveluri ierarhice.
 */
export async function suggestBenchmarks(sessionId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionJobs: {
        include: {
          job: {
            include: { department: true },
          },
        },
      },
    },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  const jobs = session.sessionJobs.map((sj: any) => ({
    id: sj.job.id,
    title: sj.job.title,
    department: sj.job.department?.name ?? "Fără departament",
    purpose: sj.job.purpose ?? "",
    description: sj.job.description ?? "",
    responsibilities: sj.job.responsibilities ?? "",
    requirements: sj.job.requirements ?? "",
  }))

  // Calculează target-ul: ~30% din total, minim 3, maxim 50
  const targetCount = Math.max(3, Math.min(50, Math.round(jobs.length * 0.3)))

  // Obține company profile pentru context MVV
  const company = await (prisma as any).companyProfile.findFirst({
    where: { tenantId: session.tenantId },
  })

  const systemPrompt = await buildAgentPromptWithKB(
    "MEDIATOR",
    "Agent facilitator pentru selectarea benchmark-urilor în evaluarea posturilor",
    prisma,
    {
      additionalContext: `
TASK: Selectează benchmark-uri din lista de joburi pentru o sesiune de evaluare.
COMPANIE: ${company?.description ?? "N/A"}
MISIUNE: ${company?.mission ?? "N/A"}
VIZIUNE: ${company?.vision ?? "N/A"}
VALORI: ${(company?.values ?? []).join(", ") || "N/A"}`,
    }
  )

  const userMessage = `Analizează următoarele ${jobs.length} posturi și selectează aproximativ ${targetCount} benchmark-uri.

CRITERII DE SELECȚIE BENCHMARK:
1. Acoperire departamentală — cel puțin un benchmark per departament
2. Acoperire ierarhică — de la nivel de intrare la nivel strategic
3. Reprezentativitate — joburi "tipice" pentru nivelul lor
4. Diversitate — mix de complexitate, responsabilitate, impact
5. Claritate — joburi cu fișe bine definite (prioritare)

JOBURI:
${jobs.map((j: any, i: number) => `${i + 1}. [${j.id}] "${j.title}" — Dept: ${j.department}
   Scop: ${j.purpose.substring(0, 200)}
   Cerințe: ${j.requirements.substring(0, 200)}`).join("\n\n")}

Răspunde STRICT în format JSON:
{
  "benchmarks": [
    { "jobId": "...", "jobTitle": "...", "department": "...", "reasoning": "..." }
  ],
  "selectionRationale": "..."
}`

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("")

  // Parsează JSON din răspuns
  let suggestions: { benchmarks: BenchmarkSuggestion[]; selectionRationale: string }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { benchmarks: [], selectionRationale: text }
  } catch {
    suggestions = { benchmarks: [], selectionRationale: text }
  }

  // Validare: verifică că ID-urile joburilor există în sesiune
  const validJobIds = new Set<string>(jobs.map((j: any) => j.id))
  suggestions.benchmarks = suggestions.benchmarks.filter(
    (b: BenchmarkSuggestion) => validJobIds.has(b.jobId)
  )

  await addJournalEntry(sessionId, session.tenantId, "BENCHMARKS_SUGGESTED", "AI", {
    suggestedCount: suggestions.benchmarks.length,
    totalJobs: jobs.length,
    rationale: suggestions.selectionRationale,
  }, prisma)

  return suggestions
}

/**
 * 7. Adminul confirmă/ajustează lista de benchmark-uri.
 *    Tranziționează sesiunea la BENCHMARK_SELECTION dacă nu era deja.
 */
export async function confirmBenchmarks(
  sessionId: string,
  benchmarkJobIds: string[],
  prisma: any
) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: { sessionJobs: true },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  // Validare: toate job ID-urile trebuie să fie în sesiune
  const validJobIds = new Set<string>(session.sessionJobs.map((sj: any) => sj.jobId))
  const invalid = benchmarkJobIds.filter(id => !validJobIds.has(id))
  if (invalid.length > 0) {
    throw new Error(`Joburile următoare nu fac parte din sesiune: ${invalid.join(", ")}`)
  }

  if (benchmarkJobIds.length === 0) {
    throw new Error("Trebuie selectat cel puțin un benchmark.")
  }

  // Stochează benchmark-urile ca metadate în JobResult (cu rank = -1 ca marker benchmark)
  // Resetează mai întâi orice benchmark-uri anterioare
  await (prisma as any).jobResult.deleteMany({
    where: { sessionId, rank: -1 },
  })

  // Creează markere benchmark
  for (const jobId of benchmarkJobIds) {
    await (prisma as any).jobResult.upsert({
      where: { sessionId_jobId: { sessionId, jobId } },
      update: { rank: -1 }, // -1 = marker benchmark
      create: {
        sessionId,
        jobId,
        totalScore: 0,
        normalizedScore: 0,
        rank: -1,
      },
    })
  }

  // Actualizează statusul sesiunii
  await (prisma as any).evaluationSession.update({
    where: { id: sessionId },
    data: { status: "BENCHMARK_SELECTION" },
  })

  await addJournalEntry(sessionId, session.tenantId, "BENCHMARKS_CONFIRMED", "admin", {
    benchmarkCount: benchmarkJobIds.length,
    benchmarkJobIds,
  }, prisma)

  return {
    message: `${benchmarkJobIds.length} benchmark-uri confirmate.`,
    benchmarkCount: benchmarkJobIds.length,
    benchmarkJobIds,
  }
}

/**
 * 8. Pentru un job non-benchmark, AI compară cu benchmark-urile evaluate
 *    și sugerează gradul + cel mai similar benchmark.
 */
export async function suggestSlotting(sessionId: string, jobId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionJobs: {
        include: {
          job: { include: { department: true } },
          assignments: { include: { evaluations: true } },
        },
      },
    },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  const criteria = await getCriteriaWithSubfactors(prisma)

  // Obține benchmark-urile cu scorurile lor finale
  const benchmarkResults = await (prisma as any).jobResult.findMany({
    where: { sessionId, rank: -1 },
    include: { job: { include: { department: true } } },
  })

  const benchmarkJobIds = new Set<string>(benchmarkResults.map((br: any) => br.jobId))

  // Colectează scorurile finale ale benchmark-urilor
  const benchmarkProfiles: Array<{
    jobId: string
    title: string
    department: string
    letters: Record<string, string>
    grade: number
    gradeLabel: string
    points: number
  }> = []

  for (const sj of session.sessionJobs) {
    if (!benchmarkJobIds.has(sj.job.id)) continue

    // Obține consensul sau ultima evaluare pentru benchmark
    const letters = await getFinalLettersForJob(sessionId, sj.job.id, sj, criteria, prisma)
    if (Object.keys(letters).length === 0) continue

    const { grade, label, points } = gradeFromLetters(letters)
    benchmarkProfiles.push({
      jobId: sj.job.id,
      title: sj.job.title,
      department: sj.job.department?.name ?? "N/A",
      letters,
      grade,
      gradeLabel: label,
      points,
    })
  }

  if (benchmarkProfiles.length === 0) {
    throw new Error("Nu există benchmark-uri evaluate. Evaluați mai întâi benchmark-urile.")
  }

  // Obține jobul de slotat
  const targetSj = session.sessionJobs.find((sj: any) => sj.job.id === jobId)
  if (!targetSj) throw new Error("Jobul nu face parte din sesiune.")

  const targetJob = targetSj.job

  // Context pentru AI
  const systemPrompt = await buildAgentPromptWithKB(
    "MEDIATOR",
    "Agent facilitator pentru slotting-ul posturilor non-benchmark",
    prisma,
  )

  const userMessage = `SLOTTING: Clasifică postul non-benchmark comparându-l cu benchmark-urile evaluate.

POSTUL DE CLASIFICAT:
- Titlu: ${targetJob.title}
- Departament: ${targetJob.department?.name ?? "N/A"}
- Scop: ${targetJob.purpose ?? "N/A"}
- Descriere: ${targetJob.description ?? "N/A"}
- Responsabilități: ${targetJob.responsibilities ?? "N/A"}
- Cerințe: ${targetJob.requirements ?? "N/A"}

BENCHMARK-URI EVALUATE (referință):
${benchmarkProfiles.map((b, i) => `${i + 1}. "${b.title}" (Dept: ${b.department}) — Grad ${b.grade} (${b.gradeLabel})
   Litere: ${Object.entries(b.letters).map(([k, v]) => `${k}=${v}`).join(", ")}`).join("\n")}

CRITERII DE EVALUARE:
- Knowledge (A-G): Educație și experiență
- Communications (A-E): Abilități de comunicare
- ProblemSolving (A-G): Rezolvare probleme
- DecisionMaking (A-G): Luarea deciziilor
- BusinessImpact (A-D): Impact asupra afacerii
- WorkingConditions (A-C): Condiții de muncă

INSTRUCȚIUNI:
1. Analizează postul în raport cu benchmark-urile
2. Atribuie litere per criteriu
3. Identifică benchmark-ul cel mai similar
4. Argumentează alegerea

Răspunde STRICT în format JSON:
{
  "letterScores": { "Knowledge": "X", "Communications": "X", "ProblemSolving": "X", "DecisionMaking": "X", "BusinessImpact": "X", "WorkingConditions": "X" },
  "mostSimilarBenchmarkId": "...",
  "mostSimilarBenchmarkTitle": "...",
  "reasoning": "..."
}`

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("")

  let suggestion: any
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch {
    suggestion = null
  }

  if (!suggestion?.letterScores) {
    return {
      suggestedGrade: 0,
      suggestedGradeLabel: "Necunoscut",
      mostSimilarBenchmarkId: "",
      mostSimilarBenchmarkTitle: "",
      reasoning: text,
      letterScores: {},
    } as SlottingSuggestion
  }

  // Calculează gradul din literele sugerate
  const { grade, label } = gradeFromLetters(suggestion.letterScores)

  const result: SlottingSuggestion = {
    suggestedGrade: grade,
    suggestedGradeLabel: label,
    mostSimilarBenchmarkId: suggestion.mostSimilarBenchmarkId ?? "",
    mostSimilarBenchmarkTitle: suggestion.mostSimilarBenchmarkTitle ?? "",
    reasoning: suggestion.reasoning ?? "",
    letterScores: suggestion.letterScores,
  }

  await addJournalEntry(sessionId, session.tenantId, "SLOTTING_SUGGESTED", "AI", {
    jobId,
    ...result,
  }, prisma)

  return result
}

/**
 * 9. Confirmă slotting-ul unui job non-benchmark.
 *    Stochează gradul final în JobResult.
 */
export async function confirmSlotting(
  sessionId: string,
  jobId: string,
  grade: number,
  prisma: any
) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  // Găsește threshold-ul pentru grad
  const threshold = GRADE_THRESHOLDS.find(t => t.grade === grade)
  if (!threshold) {
    throw new Error(`Gradul ${grade} nu este valid. Gradele valide: 1-8.`)
  }

  // Stochează rezultatul
  await (prisma as any).jobResult.upsert({
    where: { sessionId_jobId: { sessionId, jobId } },
    update: {
      totalScore: threshold.minPoints,
      normalizedScore: threshold.minPoints / 2800,
      rank: grade,
    },
    create: {
      sessionId,
      jobId,
      totalScore: threshold.minPoints,
      normalizedScore: threshold.minPoints / 2800,
      rank: grade,
    },
  })

  await addJournalEntry(sessionId, session.tenantId, "SLOTTING_CONFIRMED", "admin", {
    jobId,
    grade,
    gradeLabel: threshold.label,
  }, prisma)

  return {
    message: `Jobul a fost clasificat la ${threshold.label} (Grad ${grade}).`,
    jobId,
    grade,
    gradeLabel: threshold.label,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 7: OWNER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 10. Tranziționează sesiunea la OWNER_VALIDATION.
 *     Pregătește vizualizarea ierarhiei.
 */
export async function startOwnerValidation(sessionId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  const allowedFrom = ["SLOTTING", "IN_PROGRESS", "FACILITATION", "PRE_SCORING"]
  if (!allowedFrom.includes(session.status)) {
    throw new Error(`Nu se poate trece la OWNER_VALIDATION din starea ${session.status}.`)
  }

  await (prisma as any).evaluationSession.update({
    where: { id: sessionId },
    data: { status: "OWNER_VALIDATION" },
  })

  await addJournalEntry(sessionId, session.tenantId, "OWNER_VALIDATION_STARTED", "system", {
    previousStatus: session.status,
  }, prisma)

  return {
    status: "OWNER_VALIDATION",
    message: "Sesiunea este acum în faza de validare Owner. Ierarhia poate fi revizuită.",
  }
}

/**
 * 11. Returnează ierarhia completă: joburi grupate pe grad,
 *     cu litere per criteriu (NU puncte), scor agregat vizibil.
 */
export async function getHierarchyForValidation(sessionId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionJobs: {
        include: {
          job: { include: { department: true } },
          assignments: { include: { evaluations: true } },
        },
      },
    },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  const criteria = await getCriteriaWithSubfactors(prisma)

  // Obține benchmark markers
  const benchmarkResults = await (prisma as any).jobResult.findMany({
    where: { sessionId, rank: -1 },
  })
  const benchmarkJobIds = new Set<string>(benchmarkResults.map((br: any) => br.jobId))

  // Obține job results (slotted jobs)
  const allResults = await (prisma as any).jobResult.findMany({
    where: { sessionId, rank: { not: -1 } },
  })
  const slottedMap = new Map<string, any>(allResults.map((r: any) => [r.jobId, r]))

  // Obține overrides
  const overrides = await (prisma as any).scoreOverride.findMany({
    where: { sessionId },
  })
  const overrideMap = new Map<string, any[]>()
  for (const ov of overrides) {
    const key = ov.jobId
    if (!overrideMap.has(key)) overrideMap.set(key, [])
    overrideMap.get(key)!.push(ov)
  }

  const hierarchy: HierarchyEntry[] = []

  for (const sj of session.sessionJobs) {
    const jobId = sj.job.id
    const isBenchmark = benchmarkJobIds.has(jobId)
    const slotResult = slottedMap.get(jobId)
    const hasOverrides = overrideMap.has(jobId)

    // Obține literele finale
    let letters: Record<string, string>

    if (hasOverrides) {
      // Aplică overrides-urile Owner-ului
      letters = await getFinalLettersForJob(sessionId, jobId, sj, criteria, prisma)
      const jobOverrides = overrideMap.get(jobId)!
      for (const ov of jobOverrides) {
        const criterion = criteria.find((c: any) => c.id === ov.criterionId)
        const subfactor = criterion?.subfactors.find((s: any) => s.id === ov.subfactorId)
        if (criterion && subfactor) {
          letters[criterion.name] = subfactor.code
        }
      }
    } else {
      letters = await getFinalLettersForJob(sessionId, jobId, sj, criteria, prisma)
    }

    let grade: number, label: string, points: number
    if (Object.keys(letters).length > 0) {
      const r = gradeFromLetters(letters)
      grade = r.grade; label = r.label; points = r.points
    } else if (slotResult) {
      grade = (slotResult as any).rank; label = `Nivel ${(slotResult as any).rank}`; points = (slotResult as any).totalScore
    } else {
      grade = 8; label = "Nivel 8"; points = 0
    }

    hierarchy.push({
      jobId,
      jobTitle: sj.job.title,
      department: sj.job.department?.name ?? "Fără departament",
      grade,
      gradeLabel: label,
      letters,
      totalPoints: points,
      isBenchmark,
      isSlotted: !!slotResult && !isBenchmark,
      adjustedByOwner: hasOverrides,
    })
  }

  // Sortează: grad 1 (top) → grad 8 (bottom)
  hierarchy.sort((a, b) => a.grade - b.grade || a.department.localeCompare(b.department))

  // Grupează pe grade
  const grouped: Record<number, HierarchyEntry[]> = {}
  for (const entry of hierarchy) {
    if (!grouped[entry.grade]) grouped[entry.grade] = []
    grouped[entry.grade].push(entry)
  }

  return {
    sessionId,
    status: session.status,
    hierarchy,
    byGrade: grouped,
    totalJobs: hierarchy.length,
    gradesUsed: Object.keys(grouped).map(Number).sort((a, b) => a - b),
  }
}

/**
 * 12. Owner propune ajustarea unui grad. Motivul vine din MVV.
 *     Logare completă în jurnal.
 */
export async function proposeGradeAdjustment(
  sessionId: string,
  jobId: string,
  newGrade: number,
  reason: string,
  affectedCriterion: string,
  newLevel: string,
  prisma: any
) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  if (session.status !== "OWNER_VALIDATION") {
    throw new Error("Ajustările sunt permise doar în faza OWNER_VALIDATION.")
  }

  // Obține gradul curent
  const criteria = await getCriteriaWithSubfactors(prisma)
  const sessionJob = await (prisma as any).sessionJob.findFirst({
    where: { sessionId, jobId },
    include: {
      job: { include: { department: true } },
      assignments: { include: { evaluations: true } },
    },
  })
  if (!sessionJob) throw new Error("Jobul nu face parte din sesiune.")

  const currentLetters = await getFinalLettersForJob(sessionId, jobId, sessionJob, criteria, prisma)
  const currentResult = Object.keys(currentLetters).length > 0
    ? gradeFromLetters(currentLetters)
    : { grade: 8, label: "Nivel 8", points: 0 }

  // Validare criteriu și nivel
  const criterion = criteria.find((c: any) => c.name === affectedCriterion)
  if (!criterion) throw new Error(`Criteriul "${affectedCriterion}" nu există.`)

  const subfactor = criterion.subfactors.find((s: any) => s.code === newLevel)
  if (!subfactor) throw new Error(`Nivelul "${newLevel}" nu este valid pentru criteriul "${affectedCriterion}".`)

  // Calculează noul grad cu ajustarea
  const adjustedLetters = { ...currentLetters, [affectedCriterion]: newLevel }
  const newResult = gradeFromLetters(adjustedLetters)

  // Obține impactul asupra ierarhiei
  const impact = await getAdjustmentImpact(sessionId, jobId, newGrade, prisma)

  await addJournalEntry(sessionId, session.tenantId, "GRADE_ADJUSTMENT_PROPOSED", "owner", {
    jobId,
    jobTitle: sessionJob.job.title,
    currentGrade: currentResult.grade,
    newGradeFromCriterion: newResult.grade,
    requestedGrade: newGrade,
    affectedCriterion,
    previousLevel: currentLetters[affectedCriterion] ?? "N/A",
    newLevel,
    reason,
    impactedPositions: impact.positionsAbove.length + impact.positionsBelow.length,
  }, prisma)

  return {
    jobId,
    jobTitle: sessionJob.job.title,
    currentGrade: currentResult.grade,
    currentGradeLabel: currentResult.label,
    newGrade: newResult.grade,
    newGradeLabel: newResult.label,
    affectedCriterion,
    previousLevel: currentLetters[affectedCriterion] ?? "N/A",
    newLevel,
    reason,
    impact,
    message: `Propunere: ${sessionJob.job.title} de la Grad ${currentResult.grade} la Grad ${newResult.grade} (criteriu ${affectedCriterion}: ${currentLetters[affectedCriterion] ?? "?"} → ${newLevel}).`,
  }
}

/**
 * 13. Owner confirmă ajustarea — stochează override-ul.
 */
export async function confirmAdjustment(
  sessionId: string,
  jobId: string,
  ownerId: string,
  affectedCriterion: string,
  newLevel: string,
  reason: string,
  prisma: any
) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  if (session.status !== "OWNER_VALIDATION") {
    throw new Error("Confirmarea ajustărilor este permisă doar în faza OWNER_VALIDATION.")
  }

  const criteria = await getCriteriaWithSubfactors(prisma)
  const criterion = criteria.find((c: any) => c.name === affectedCriterion)
  if (!criterion) throw new Error(`Criteriul "${affectedCriterion}" nu există.`)

  const subfactor = criterion.subfactors.find((s: any) => s.code === newLevel)
  if (!subfactor) throw new Error(`Nivelul "${newLevel}" nu este valid.`)

  // Creează sau actualizează override
  const existing = await (prisma as any).scoreOverride.findFirst({
    where: { sessionId, jobId, criterionId: criterion.id },
  })

  if (existing) {
    await (prisma as any).scoreOverride.update({
      where: { id: existing.id },
      data: {
        subfactorId: subfactor.id,
        rationale: reason,
        ownerId,
      },
    })
  } else {
    await (prisma as any).scoreOverride.create({
      data: {
        sessionId,
        jobId,
        criterionId: criterion.id,
        ownerId,
        subfactorId: subfactor.id,
        rationale: reason,
      },
    })
  }

  // Recalculează și actualizează JobResult
  const sessionJob = await (prisma as any).sessionJob.findFirst({
    where: { sessionId, jobId },
    include: { assignments: { include: { evaluations: true } } },
  })

  const letters = await getFinalLettersForJob(sessionId, jobId, sessionJob, criteria, prisma)
  // Aplică toate override-urile
  const allOverrides = await (prisma as any).scoreOverride.findMany({
    where: { sessionId, jobId },
  })
  for (const ov of allOverrides) {
    const c = criteria.find((cr: any) => cr.id === ov.criterionId)
    const sf = c?.subfactors.find((s: any) => s.id === ov.subfactorId)
    if (c && sf) letters[c.name] = sf.code
  }

  const { grade, points } = gradeFromLetters(letters)

  await (prisma as any).jobResult.upsert({
    where: { sessionId_jobId: { sessionId, jobId } },
    update: {
      totalScore: points,
      normalizedScore: points / 2800,
      rank: grade,
    },
    create: {
      sessionId,
      jobId,
      totalScore: points,
      normalizedScore: points / 2800,
      rank: grade,
    },
  })

  await addJournalEntry(sessionId, session.tenantId, "GRADE_ADJUSTMENT_CONFIRMED", ownerId, {
    jobId,
    affectedCriterion,
    newLevel,
    reason,
    newGrade: grade,
  }, prisma)

  return {
    message: "Ajustarea a fost confirmată și aplicată.",
    jobId,
    newGrade: grade,
    newGradeLabel: `Nivel ${grade}`,
  }
}

/**
 * 14. Arată impactul unei ajustări de grad: poziții deasupra/dedesubt,
 *     schimbări în ierarhie.
 */
export async function getAdjustmentImpact(
  sessionId: string,
  jobId: string,
  newGrade: number,
  prisma: any
): Promise<AdjustmentImpact> {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionJobs: {
        include: { job: { select: { id: true, title: true } } },
      },
    },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  // Obține toate rezultatele curente
  const results = await (prisma as any).jobResult.findMany({
    where: { sessionId },
    include: { job: { select: { id: true, title: true } } },
  })

  const currentResult = results.find((r: any) => r.jobId === jobId)
  const currentGrade = currentResult?.rank ?? 8
  const targetJob = session.sessionJobs.find((sj: any) => sj.job.id === jobId)

  const positionsAbove = results
    .filter((r: any) => r.jobId !== jobId && r.rank < newGrade && r.rank > 0)
    .map((r: any) => ({ jobId: r.jobId, jobTitle: r.job.title, grade: r.rank }))
    .sort((a: any, b: any) => a.grade - b.grade)

  const positionsBelow = results
    .filter((r: any) => r.jobId !== jobId && r.rank > newGrade)
    .map((r: any) => ({ jobId: r.jobId, jobTitle: r.job.title, grade: r.rank }))
    .sort((a: any, b: any) => a.grade - b.grade)

  const affectedInSameGrade = results
    .filter((r: any) => r.jobId !== jobId && r.rank === newGrade)
    .map((r: any) => ({ jobId: r.jobId, jobTitle: r.job.title }))

  return {
    jobId,
    jobTitle: targetJob?.job.title ?? "Necunoscut",
    currentGrade,
    newGrade,
    positionsAbove,
    positionsBelow,
    affectedInSameGrade,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 8: FINALIZARE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 15. Finalizează sesiunea: COMPLETED, acces temporar închis,
 *     raport final generat, totul logat.
 */
export async function finalizeSession(sessionId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionJobs: {
        include: {
          job: { include: { department: true } },
          assignments: { include: { evaluations: true, user: true } },
        },
      },
      participants: { include: { user: true } },
    },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  if (session.status === "COMPLETED") {
    throw new Error("Sesiunea este deja finalizată.")
  }

  const criteria = await getCriteriaWithSubfactors(prisma)

  // Calculează și stochează rezultatele finale pentru toate joburile
  const finalResults: Array<{
    jobId: string
    jobTitle: string
    department: string
    grade: number
    gradeLabel: string
    letters: Record<string, string>
    totalPoints: number
  }> = []

  for (const sj of session.sessionJobs) {
    const letters = await getFinalLettersForJob(sessionId, sj.job.id, sj, criteria, prisma)

    // Aplică overrides
    const overrides = await (prisma as any).scoreOverride.findMany({
      where: { sessionId, jobId: sj.job.id },
    })
    for (const ov of overrides) {
      const c = criteria.find((cr: any) => cr.id === ov.criterionId)
      const sf = c?.subfactors.find((s: any) => s.id === ov.subfactorId)
      if (c && sf) letters[c.name] = sf.code
    }

    if (Object.keys(letters).length === 0) continue

    const { grade, label, points } = gradeFromLetters(letters)

    // Upsert rezultat final
    await (prisma as any).jobResult.upsert({
      where: { sessionId_jobId: { sessionId, jobId: sj.job.id } },
      update: {
        totalScore: points,
        normalizedScore: points / 2800,
        rank: grade,
      },
      create: {
        sessionId,
        jobId: sj.job.id,
        totalScore: points,
        normalizedScore: points / 2800,
        rank: grade,
      },
    })

    finalResults.push({
      jobId: sj.job.id,
      jobTitle: sj.job.title,
      department: sj.job.department?.name ?? "N/A",
      grade,
      gradeLabel: label,
      letters,
      totalPoints: points,
    })
  }

  // Sortează rezultatele finale
  finalResults.sort((a, b) => a.grade - b.grade)

  // Creează SalaryGrade-uri pe baza gradelor utilizate
  const gradesUsed = Array.from(new Set<number>(finalResults.map(r => r.grade))).sort((a, b) => a - b)
  for (let i = 0; i < gradesUsed.length; i++) {
    const grade = gradesUsed[i]
    const threshold = GRADE_THRESHOLDS.find(t => t.grade === grade)
    if (!threshold) continue

    const nextThreshold = GRADE_THRESHOLDS.find(t => t.grade === grade - 1)
    const scoreMax = nextThreshold ? nextThreshold.minPoints - 1 : 2800

    await (prisma as any).salaryGrade.upsert({
      where: {
        id: `${sessionId}-grade-${grade}`,
      },
      update: {
        name: threshold.label,
        scoreMin: threshold.minPoints,
        scoreMax,
        order: grade,
      },
      create: {
        id: `${sessionId}-grade-${grade}`,
        tenantId: session.tenantId,
        sessionId,
        name: threshold.label,
        scoreMin: threshold.minPoints,
        scoreMax,
        order: grade,
      },
    })
  }

  // Marchează participanții ca completați
  await (prisma as any).sessionParticipant.updateMany({
    where: { sessionId },
    data: { completedAt: new Date() },
  })

  // Tranziție finală
  await (prisma as any).evaluationSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  })

  // Generează raportul final ca AiGeneration
  const reportContent = {
    sessionId,
    sessionName: session.name,
    completedAt: new Date().toISOString(),
    totalJobs: finalResults.length,
    totalParticipants: session.participants.length,
    gradesUsed,
    results: finalResults.map(r => ({
      jobTitle: r.jobTitle,
      department: r.department,
      grade: r.grade,
      gradeLabel: r.gradeLabel,
      letters: r.letters,
    })),
  }

  await (prisma as any).aiGeneration.create({
    data: {
      tenantId: session.tenantId,
      type: "SESSION_ANALYSIS",
      sourceId: sessionId,
      sourceType: "final_report",
      prompt: "Raport final sesiune de evaluare",
      output: JSON.stringify(reportContent),
      model: "system",
      tokensUsed: 0,
      credits: 0, // Raportul final e intern — zero credite consumate
    },
  })

  await addJournalEntry(sessionId, session.tenantId, "SESSION_FINALIZED", "system", {
    totalJobs: finalResults.length,
    gradesUsed,
    participantsCount: session.participants.length,
  }, prisma)

  return {
    status: "COMPLETED",
    message: `Sesiunea "${session.name}" a fost finalizată cu succes.`,
    totalJobs: finalResults.length,
    gradesUsed,
    results: finalResults.map(r => ({
      jobTitle: r.jobTitle,
      department: r.department,
      grade: r.grade,
      gradeLabel: r.gradeLabel,
      letters: r.letters,
      // NU se returnează totalPoints — secret de serviciu
    })),
  }
}

/**
 * 16. Jurnal complet: toate scorurile, discuțiile, ajustările,
 *     participanții, timestamp-uri.
 */
export async function getSessionJournal(sessionId: string, prisma: any) {
  const session = await (prisma as any).evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      sessionJobs: { include: { job: { select: { id: true, title: true } } } },
    },
  })
  if (!session) throw new Error("Sesiunea nu există.")

  // Obține toate intrările din jurnal (stocate ca AiGeneration de tip SESSION_ANALYSIS)
  const journalEntries = await (prisma as any).aiGeneration.findMany({
    where: {
      tenantId: session.tenantId,
      sourceId: sessionId,
      sourceType: { in: ["journal", "final_report"] },
      type: "SESSION_ANALYSIS",
    },
    orderBy: { generatedAt: "asc" },
  })

  // Obține toate evaluările
  const evaluations = await (prisma as any).evaluation.findMany({
    where: { sessionId },
    include: {
      assignment: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          sessionJob: { include: { job: { select: { id: true, title: true } } } },
        },
      },
      criterion: { select: { id: true, name: true } },
      subfactor: { select: { id: true, code: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  // Obține toate override-urile
  const overrides = await (prisma as any).scoreOverride.findMany({
    where: { sessionId },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      criterion: { select: { id: true, name: true } },
      subfactor: { select: { id: true, code: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  // Obține decizii facilitator
  const facilitatorDecisions = await (prisma as any).facilitatorDecision.findMany({
    where: { sessionId },
    include: {
      facilitator: { select: { id: true, firstName: true, lastName: true } },
      criterion: { select: { name: true } },
      subfactor: { select: { code: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  // Obține voturi
  const votes = await (prisma as any).vote.findMany({
    where: { sessionId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      criterion: { select: { name: true } },
      subfactor: { select: { code: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  // Obține rezultate finale
  const results = await (prisma as any).jobResult.findMany({
    where: { sessionId },
    include: { job: { select: { id: true, title: true } } },
    orderBy: { rank: "asc" },
  })

  // Obține consensusStatuses
  const consensusStatuses = await (prisma as any).consensusStatus.findMany({
    where: { sessionId },
    include: {
      criterion: { select: { name: true } },
      finalSubfactor: { select: { code: true } },
    },
  })

  // Parsează intrări jurnal
  const parsedJournal = journalEntries.map((entry: any) => {
    try {
      return JSON.parse(entry.output)
    } catch {
      return { timestamp: entry.generatedAt, action: entry.prompt, details: entry.output }
    }
  })

  return {
    sessionId,
    sessionName: session.name,
    status: session.status,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    participants: session.participants.map((p: any) => ({
      userId: p.user.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      completedAt: p.completedAt,
    })),
    jobs: session.sessionJobs.map((sj: any) => ({
      jobId: sj.job.id,
      jobTitle: sj.job.title,
    })),
    timeline: parsedJournal,
    evaluations: evaluations.map((ev: any) => ({
      evaluator: `${ev.assignment.user.firstName} ${ev.assignment.user.lastName}`,
      evaluatorId: ev.assignment.user.id,
      jobTitle: ev.assignment.sessionJob.job.title,
      jobId: ev.assignment.sessionJob.job.id,
      criterion: ev.criterion.name,
      letter: ev.subfactor.code,
      timestamp: ev.createdAt,
    })),
    overrides: overrides.map((ov: any) => ({
      owner: `${ov.owner.firstName} ${ov.owner.lastName}`,
      criterion: ov.criterion.name,
      newLevel: ov.subfactor.code,
      rationale: ov.rationale,
      timestamp: ov.createdAt,
    })),
    facilitatorDecisions: facilitatorDecisions.map((fd: any) => ({
      facilitator: `${fd.facilitator.firstName} ${fd.facilitator.lastName}`,
      jobId: fd.jobId,
      criterion: fd.criterion.name,
      decision: fd.subfactor.code,
      rationale: fd.rationale,
      timestamp: fd.createdAt,
    })),
    votes: votes.map((v: any) => ({
      voter: `${v.user.firstName} ${v.user.lastName}`,
      jobId: v.jobId,
      criterion: v.criterion.name,
      votedFor: v.subfactor.code,
      timestamp: v.createdAt,
    })),
    consensusStatuses: consensusStatuses.map((cs: any) => ({
      jobId: cs.jobId,
      criterion: cs.criterion.name,
      status: cs.status,
      finalLevel: cs.finalSubfactor?.code ?? null,
    })),
    results: results.map((r: any) => ({
      jobId: r.job.id,
      jobTitle: r.job.title,
      grade: r.rank,
      // totalScore NU se returnează — secret de serviciu
    })),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAR INTERN: Obține literele finale pentru un job
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determină literele finale per criteriu pentru un job:
 *   1. Prioritate: FacilitatorDecision > ConsensusStatus.finalSubfactor > Evaluări (medie/modă)
 *   2. Dacă există mai mulți evaluatori, se ia moda (litera cea mai frecventă)
 */
async function getFinalLettersForJob(
  sessionId: string,
  jobId: string,
  sessionJob: any,
  criteria: any[],
  prisma: any
): Promise<Record<string, string>> {
  const letters: Record<string, string> = {}

  // 1. Verifică decizii facilitator
  const facilitatorDecisions = await (prisma as any).facilitatorDecision.findMany({
    where: { sessionId, jobId },
  })
  const fdMap = new Map<string, any>(facilitatorDecisions.map((fd: any) => [fd.criterionId, fd.subfactorId]))

  // 2. Verifică consensus finalizat
  const consensuses = await (prisma as any).consensusStatus.findMany({
    where: { sessionId, jobId, finalSubfactorId: { not: null } },
  })
  const csMap = new Map<string, any>(consensuses.map((cs: any) => [cs.criterionId, cs.finalSubfactorId]))

  for (const criterion of criteria) {
    // Cheia folosită în scoring table (engleză). Criteriile din DB pot avea
    // nume românești — normalizăm înainte de a le pune în letters.
    const key = normalizeCriterionKey(criterion.name)

    // Prioritate 1: Decizie facilitator
    if (fdMap.has(criterion.id)) {
      const sf = criterion.subfactors.find((s: any) => s.id === fdMap.get(criterion.id))
      if (sf) { letters[key] = sf.code; continue }
    }

    // Prioritate 2: Consens finalizat
    if (csMap.has(criterion.id)) {
      const sf = criterion.subfactors.find((s: any) => s.id === csMap.get(criterion.id))
      if (sf) { letters[key] = sf.code; continue }
    }

    // Prioritate 3: Modă din evaluări
    if (!sessionJob?.assignments) continue
    const evLetters: string[] = []
    for (const assignment of sessionJob.assignments) {
      if (!assignment.submittedAt) continue
      const ev = assignment.evaluations.find((e: any) => e.criterionId === criterion.id)
      if (ev) {
        const sf = criterion.subfactors.find((s: any) => s.id === ev.subfactorId)
        if (sf) evLetters.push(sf.code)
      }
    }

    if (evLetters.length > 0) {
      // Modă: litera cea mai frecventă
      const freq: Record<string, number> = {}
      for (const l of evLetters) freq[l] = (freq[l] ?? 0) + 1
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
      letters[key] = sorted[0][0]
    }
  }

  return letters
}
