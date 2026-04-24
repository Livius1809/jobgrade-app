import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import AssessmentDetailClient from "./AssessmentDetailClient"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Evaluare Comuna ${id.slice(0, 8)} — Art. 10` }
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) notFound()

  const { id } = await params

  const assessment = await prisma.jointPayAssessment.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { report: { select: { reportYear: true } } },
  })

  if (!assessment) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionPlan = (assessment.actionPlan as any) ?? {}

  const canEdit = ["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(
    session.user.role
  )

  // Numără participanții din workflow
  const participants = actionPlan.participanti ?? actionPlan.participants ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Evaluare Comuna — Art. 10
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {assessment.triggerReason.slice(0, 120)}
            {assessment.triggerReason.length > 120 ? "..." : ""}
          </p>
        </div>
        <a
          href="/pay-gap/assessments"
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Lista evaluari
        </a>
      </div>

      <AssessmentDetailClient
        assessmentId={assessment.id}
        status={assessment.status}
        triggerReason={assessment.triggerReason}
        triggeredAt={assessment.triggeredAt.toISOString()}
        dueDate={assessment.dueDate?.toISOString() ?? null}
        resolvedAt={assessment.resolvedAt?.toISOString() ?? null}
        rootCause={assessment.rootCause}
        reportYear={assessment.report?.reportYear ?? null}
        chapters={actionPlan.chapters ?? {}}
        categories={actionPlan.categories ?? []}
        votes={actionPlan.votes ?? []}
        signatures={actionPlan.signatures ?? []}
        versions={actionPlan.versions ?? []}
        currentVersion={actionPlan.currentVersion ?? 1}
        participants={participants}
        jurnal={actionPlan.jurnal ?? []}
        canEdit={canEdit}
        currentUserId={session.user.id}
        currentUserName={session.user.name ?? session.user.email}
        currentUserRole={session.user.role}
      />
    </div>
  )
}
