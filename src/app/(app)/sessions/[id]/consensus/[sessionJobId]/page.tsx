import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import ConsensusView from "@/components/sessions/ConsensusView"

export const metadata = { title: "Consens evaluare" }

export default async function ConsensusPage({
  params,
}: {
  params: Promise<{ id: string; sessionJobId: string }>
}) {
  const session = await auth()
  const { id: sessionId, sessionJobId } = await params
  const tenantId = session!.user.tenantId

  const sessionJob = await prisma.sessionJob.findFirst({
    where: { id: sessionJobId, sessionId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          code: true,
          department: { select: { name: true } },
        },
      },
      session: {
        select: { tenantId: true, name: true, status: true },
      },
      assignments: {
        where: { submittedAt: { not: null } },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, jobTitle: true },
          },
          evaluations: {
            include: {
              criterion: {
                select: { id: true, name: true, order: true },
              },
              subfactor: {
                select: { id: true, code: true, points: true, description: true },
              },
            },
          },
        },
      },
    },
  })

  if (!sessionJob || sessionJob.session.tenantId !== tenantId) notFound()

  // Obțin toate criteriile cu subfactorii
  const criteria = await prisma.criterion.findMany({
    where: { isActive: true },
    include: {
      subfactors: { orderBy: { order: "asc" } },
    },
    orderBy: { order: "asc" },
  })

  // Calculează distribuția per criteriu
  const distributionByCriterion = criteria.map((criterion) => {
    const scores = sessionJob.assignments.flatMap((a) =>
      a.evaluations
        .filter((e) => e.criterion.id === criterion.id)
        .map((e) => ({
          evaluator: `${a.user.firstName} ${a.user.lastName}`,
          subfactor: e.subfactor,
        }))
    )

    const distribution = criterion.subfactors.map((sf) => {
      const count = scores.filter((s) => s.subfactor.id === sf.id).length
      return {
        subfactor: sf,
        count,
        evaluators: scores
          .filter((s) => s.subfactor.id === sf.id)
          .map((s) => s.evaluator),
        percentage: scores.length > 0 ? (count / scores.length) * 100 : 0,
      }
    })

    const mode = distribution.reduce(
      (max, item) => (item.count > max.count ? item : max),
      distribution[0]
    )

    const points = scores.map((s) => s.subfactor.points)
    const mean = points.length > 0
      ? points.reduce((a, b) => a + b, 0) / points.length
      : 0
    const variance = points.length > 0
      ? points.reduce((a, b) => a + (b - mean) ** 2, 0) / points.length
      : 0
    const stdDev = Math.sqrt(variance)
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0

    const consensusReached = cv <= 25 && scores.length > 0

    return {
      criterion,
      scores,
      distribution,
      mode,
      cv,
      consensusReached,
      totalEvaluators: sessionJob.assignments.length,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/sessions/${sessionId}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Sesiune
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Consens: {sessionJob.job.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {sessionJob.job.department?.name ?? "—"} ·{" "}
            {sessionJob.assignments.length} evaluatori au trimis
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/sessions/${sessionId}/discussion/${sessionJobId}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Discuție de grup →
          </Link>
          <Link
            href={`/sessions/${sessionId}/results`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Vezi ierarhia →
          </Link>
        </div>
      </div>

      {sessionJob.assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
          <p className="text-gray-400">
            Niciun evaluator nu a finalizat evaluarea pentru acest job.
          </p>
        </div>
      ) : (
        <ConsensusView
          sessionId={sessionId}
          sessionJobId={sessionJobId}
          distributionByCriterion={distributionByCriterion}
          sessionStatus={sessionJob.session.status}
          userRole={session!.user.role}
        />
      )}
    </div>
  )
}
