import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import GroupDiscussionView from "@/components/sessions/GroupDiscussionView"

export const dynamic = "force-dynamic"
export const metadata = { title: "Discuție de grup" }

export default async function GroupDiscussionPage({
  params,
}: {
  params: Promise<{ id: string; sessionJobId: string }>
}) {
  const session = await auth()
  if (!session) notFound()

  const { id: sessionId, sessionJobId } = await params
  const tenantId = session.user.tenantId

  const sessionJob = await prisma.sessionJob.findFirst({
    where: { id: sessionJobId, sessionId },
    include: {
      job: {
        select: {
          title: true,
          department: { select: { name: true } },
        },
      },
      session: {
        select: { tenantId: true, name: true, status: true },
      },
    },
  })

  if (!sessionJob || sessionJob.session.tenantId !== tenantId) notFound()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/sessions/${sessionId}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Sesiune
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href={`/sessions/${sessionId}/consensus/${sessionJobId}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Consens analitic
            </Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Discuție de grup: {sessionJob.job.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {sessionJob.job.department?.name ?? "—"} · {sessionJob.session.name}
          </p>
        </div>
        <Link
          href={`/sessions/${sessionId}/results`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Vezi ierarhia →
        </Link>
      </div>

      {/* Main discussion view */}
      <GroupDiscussionView
        sessionId={sessionId}
        sessionJobId={sessionJobId}
        currentUserId={session.user.id}
      />
    </div>
  )
}
