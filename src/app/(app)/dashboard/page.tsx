import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance } from "@/lib/credits"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"

export const metadata = { title: "Dashboard" }

async function getDashboardData(tenantId: string) {
  const [
    activeJobs,
    activeSessions,
    credits,
    recentActivity,
  ] = await Promise.all([
    prisma.job.count({
      where: { tenantId, status: "ACTIVE" },
    }),
    prisma.evaluationSession.findFirst({
      where: { tenantId, status: "IN_PROGRESS" },
      include: {
        participants: {
          include: { user: true },
        },
        _count: { select: { sessionJobs: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getBalance(tenantId),
    prisma.creditTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  const completedParticipants =
    activeSessions?.participants.filter((p: any) => p.completedAt).length ?? 0
  const totalParticipants = activeSessions?.participants.length ?? 0

  return {
    activeJobs,
    activeSessions: activeSessions ? 1 : 0,
    evaluatorsCompleted: completedParticipants,
    evaluatorsTotal: totalParticipants,
    credits,
    activeSession: activeSessions,
    recentActivity,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const data = await getDashboardData(session!.user.tenantId)

  const firstName = session!.user.name?.split(" ")[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bună ziua, {firstName}! 👋
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Joburi active"
          value={data.activeJobs}
          unit="joburi"
          href="/app/jobs"
        />
        <StatCard
          label="Sesiuni active"
          value={data.activeSessions}
          unit="în curs"
          href="/app/sessions"
        />
        <StatCard
          label="Evaluatori"
          value={`${data.evaluatorsCompleted}/${data.evaluatorsTotal}`}
          unit="completat"
          href="/app/sessions"
        />
        <StatCard
          label="Credite rămase"
          value={data.credits}
          unit="credite"
          href="/app/settings/billing"
          highlight={data.credits < 20}
        />
      </div>

      {/* Sesiune activă */}
      {data.activeSession && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Sesiune activă</h2>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
              🟡 În curs
            </span>
          </div>

          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {data.activeSession.name}
          </h3>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progres evaluatori</span>
              <span>
                {data.evaluatorsCompleted} din {data.evaluatorsTotal}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all"
                style={{
                  width:
                    data.evaluatorsTotal > 0
                      ? `${(data.evaluatorsCompleted / data.evaluatorsTotal) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </div>

          {/* Participanți */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {data.activeSession.participants.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <span>{p.completedAt ? "✓" : "⏳"}</span>
                <span>
                  {p.user.firstName} {p.user.lastName.charAt(0)}.
                </span>
              </div>
            ))}
          </div>

          <Link
            href={`/app/sessions/${data.activeSession.id}`}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Vezi sesiunea →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Acțiuni rapide */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Acțiuni rapide</h2>
          <div className="space-y-2">
            <QuickAction href="/app/sessions/new" label="+ Sesiune nouă" />
            <QuickAction href="/app/jobs/new" label="+ Fișă de post" />
            <QuickAction href="/app/settings/users" label="+ Invită evaluator" />
          </div>
        </div>

        {/* Activitate recentă */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Activitate recentă</h2>
          <div className="space-y-3">
            {data.recentActivity.length === 0 && (
              <p className="text-sm text-gray-500">Nicio activitate recentă.</p>
            )}
            {data.recentActivity.map((txn: any) => (
              <div key={txn.id} className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>🕐</span>
                  <span>{txn.description}</span>
                </div>
                <div className="text-right text-xs text-gray-400 shrink-0">
                  {txn.amount < 0 && (
                    <span className="text-orange-500">{txn.amount} cr.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Credite */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Credite</h2>
          <Link
            href="/app/settings/billing"
            className="text-sm text-blue-600 hover:underline"
          >
            + Cumpără credite
          </Link>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full">
            <div
              className={`h-2 rounded-full transition-all ${
                data.credits < 20 ? "bg-red-500" : "bg-blue-600"
              }`}
              style={{ width: `${Math.min((data.credits / 100) * 100, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900">
            {data.credits} credite
          </span>
        </div>
        {data.credits < 20 && (
          <p className="text-xs text-red-600">
            ⚠️ Sold redus — reîncarcă pentru a continua să folosești funcționalitățile AI.
          </p>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  href,
  highlight,
}: {
  label: string
  value: number | string
  unit: string
  href: string
  highlight?: boolean
}) {
  return (
    <Link href={href}>
      <div
        className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow cursor-pointer ${
          highlight ? "border-red-200 bg-red-50" : "border-gray-200"
        }`}
      >
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div
          className={`text-2xl font-bold ${
            highlight ? "text-red-600" : "text-gray-900"
          }`}
        >
          {value}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{unit}</div>
      </div>
    </Link>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      {label}
    </Link>
  )
}
