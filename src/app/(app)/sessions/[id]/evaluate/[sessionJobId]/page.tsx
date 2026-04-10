import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import EvaluationForm from "@/components/sessions/EvaluationForm"

export const metadata = { title: "Evaluare job" }

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ id: string; sessionJobId: string }>
}) {
  const session = await auth()
  const { id: sessionId, sessionJobId } = await params
  const userId = session!.user.id
  const tenantId = session!.user.tenantId

  // Verifică că utilizatorul este participant la sesiune
  const participant = await prisma.sessionParticipant.findFirst({
    where: { sessionId, userId },
  })
  if (!participant) redirect(`/sessions/${sessionId}`)

  const evalSession = await prisma.evaluationSession.findFirst({
    where: { id: sessionId, tenantId, status: "IN_PROGRESS" },
  })
  if (!evalSession) redirect(`/sessions/${sessionId}`)

  const sessionJob = await prisma.sessionJob.findFirst({
    where: { id: sessionJobId, sessionId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          code: true,
          purpose: true,
          responsibilities: true,
          requirements: true,
          department: { select: { name: true } },
          representative: {
            select: { firstName: true, lastName: true, jobTitle: true },
          },
        },
      },
    },
  })
  if (!sessionJob) notFound()

  // Găsește sau creează assignment
  let assignment = await prisma.jobAssignment.findFirst({
    where: { sessionJobId, userId },
    include: {
      evaluations: {
        include: { subfactor: true },
      },
    },
  })

  if (!assignment) {
    assignment = await prisma.jobAssignment.create({
      data: { sessionJobId, userId },
      include: {
        evaluations: {
          include: { subfactor: true },
        },
      },
    })
  }

  // Încarcă criteriile cu subfactorii
  const criteria = await prisma.criterion.findMany({
    where: { isActive: true },
    include: {
      subfactors: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  })

  // Construiește mapul cu evaluările existente
  const existingScores: Record<string, string> = {}
  const existingJustifications: Record<string, string> = {}
  for (const ev of assignment.evaluations) {
    existingScores[ev.criterionId] = ev.subfactorId
    if (ev.justification) {
      existingJustifications[ev.criterionId] = ev.justification
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Job header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {sessionJob.job.title}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {sessionJob.job.department?.name ?? "—"}
              {sessionJob.job.code ? ` · ${sessionJob.job.code}` : ""}
            </p>
          </div>
          {assignment.submittedAt && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              ✓ Trimis
            </span>
          )}
        </div>

        {sessionJob.job.representative && (
          <div className="text-sm text-gray-600 mb-3">
            <span className="font-medium">Reprezentant:</span>{" "}
            {sessionJob.job.representative.firstName}{" "}
            {sessionJob.job.representative.lastName}
            {sessionJob.job.representative.jobTitle
              ? ` — ${sessionJob.job.representative.jobTitle}`
              : ""}
          </div>
        )}

        {sessionJob.job.purpose && (
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Scopul rolului:</span>{" "}
            {sessionJob.job.purpose}
          </div>
        )}

        {sessionJob.job.responsibilities && (
          <details className="text-sm text-gray-600">
            <summary className="font-medium cursor-pointer hover:text-gray-900">
              Responsabilități principale
            </summary>
            <div className="mt-2 whitespace-pre-line pl-3 border-l-2 border-gray-200">
              {sessionJob.job.responsibilities}
            </div>
          </details>
        )}
      </div>

      {/* Evaluation form */}
      <EvaluationForm
        sessionId={sessionId}
        sessionJobId={sessionJobId}
        assignmentId={assignment.id}
        isSubmitted={!!assignment.submittedAt}
        criteria={criteria}
        existingScores={existingScores}
        existingJustifications={existingJustifications}
        jobTitle={sessionJob.job.title}
      />
    </div>
  )
}
