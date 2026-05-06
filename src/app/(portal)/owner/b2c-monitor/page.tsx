import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Monitor B2C — Owner Dashboard" }
export const dynamic = "force-dynamic"

// ── Types ─────────────────────────────────────────────────────────────────────

interface FunnelData {
  onboarding: number
  active: number
  inactive: number
  suspended: number
  paying: number
}

interface CommunityData {
  card: string
  name: string
  members: number
  messages: number
}

interface SafetyAlertData {
  id: string
  card: string
  createdAt: string
  level: string
  reason: string
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

async function fetchB2CData() {
  const p = prisma as any
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  try {
    const [
      totalUsers,
      usersByStatus,
      activeSessionsToday,
      cardProgressRaw,
      communityStats,
      revenueTotal,
      revenueLast30d,
      recentMessages,
    ] = await Promise.all([
      p.b2CUser.count().catch(() => 0),
      p.b2CUser.groupBy({ by: ["status"], _count: { _all: true } }).catch(() => []),
      p.b2CSession.count({
        where: {
          OR: [
            { status: "ACTIVE" },
            { startedAt: { gte: todayStart } },
          ],
        },
      }).catch(() => 0),
      p.b2CCardProgress.groupBy({ by: ["card", "status"], _count: { _all: true } }).catch(() => []),
      p.b2CCommunity.findMany({
        where: { isActive: true },
        select: { card: true, name: true, _count: { select: { members: true, messages: true } } },
      }).catch(() => []),
      p.b2CCreditTransaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      p.b2CCreditTransaction.aggregate({
        where: { type: "PURCHASE", createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      p.b2CCommunityMessage.count({
        where: { createdAt: { gte: new Date(now.getTime() - 86400000) } },
      }).catch(() => 0),
    ])

    // Funnel
    const statusMap: Record<string, number> = {}
    for (const row of usersByStatus as any[]) {
      statusMap[row.status] = row._count._all
    }

    let payingUsers = 0
    try {
      const payingRaw = await p.b2CCreditTransaction.groupBy({ by: ["userId"], where: { type: "PURCHASE" } })
      payingUsers = payingRaw.length
    } catch { payingUsers = 0 }

    // Card distribution
    const cardDistribution: Record<string, Record<string, number>> = {}
    for (const row of cardProgressRaw as any[]) {
      if (!cardDistribution[row.card]) cardDistribution[row.card] = {}
      cardDistribution[row.card][row.status] = row._count._all
    }

    // Safety alerts
    let safetyAlerts: SafetyAlertData[] = []
    try {
      const raw = await p.b2CEvolutionEntry.findMany({
        where: { type: "SAFETY_ALERT", createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
        select: { id: true, card: true, createdAt: true, metadata: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      safetyAlerts = (raw as any[]).map((a: any) => ({
        id: a.id,
        card: a.card,
        createdAt: a.createdAt.toISOString(),
        level: a.metadata?.level || "UNKNOWN",
        reason: a.metadata?.reason || "",
      }))
    } catch { /* SAFETY_ALERT may not exist */ }

    const communities: CommunityData[] = (communityStats as any[]).map((c: any) => ({
      card: c.card,
      name: c.name,
      members: c._count.members,
      messages: c._count.messages,
    }))

    return {
      totalUsers: totalUsers as number,
      activeSessionsToday: activeSessionsToday as number,
      funnel: {
        onboarding: statusMap["ONBOARDING"] || 0,
        active: statusMap["ACTIVE"] || 0,
        inactive: statusMap["INACTIVE"] || 0,
        suspended: statusMap["SUSPENDED"] || 0,
        paying: payingUsers,
      } as FunnelData,
      cardDistribution,
      safetyAlerts,
      communities,
      recentMessages24h: recentMessages as number,
      revenue: {
        totalCredits: revenueTotal._sum?.amount || 0,
        last30dCredits: revenueLast30d._sum?.amount || 0,
      },
    }
  } catch (error) {
    console.error("[b2c-monitor page] fetch error:", error)
    return null
  }
}

// ── Card label helper ─────────────────────────────────────────────────────────

const CARD_LABELS: Record<string, string> = {
  CARD_1: "Card 1 — Drumul catre mine",
  CARD_2: "Card 2 — Eu si ceilalti",
  CARD_3: "Card 3 — Rol profesional",
  CARD_4: "Card 4 — Oameni de succes",
  CARD_5: "Card 5 — Antreprenoriat",
  CARD_6: "Card 6 — Spune-mi despre mine",
}

const ALERT_COLORS: Record<string, string> = {
  CRITIC: "bg-red-100 text-red-800 border-red-300",
  RIDICAT: "bg-orange-100 text-orange-800 border-orange-300",
  MODERAT: "bg-yellow-100 text-yellow-800 border-yellow-300",
  INFORMATIV: "bg-blue-100 text-blue-800 border-blue-300",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function B2CMonitorPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const data = await fetchB2CData()

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Monitor B2C</h1>
            <p className="text-sm text-slate-500 mt-1">Starea ecosistemului B2C in timp real</p>
          </div>
          <Link href="/owner" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← Inapoi la Dashboard
          </Link>
        </div>

        {!data ? (
          <div className="bg-white rounded-xl border p-8 text-center text-slate-500">
            Nu s-au putut incarca datele B2C. Verifica conexiunea la baza de date.
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="Utilizatori B2C" value={data.totalUsers} />
              <KpiCard label="Sesiuni active azi" value={data.activeSessionsToday} />
              <KpiCard label="Credite totale" value={data.revenue.totalCredits} suffix=" cr" />
              <KpiCard label="Credite ultimele 30z" value={data.revenue.last30dCredits} suffix=" cr" />
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white rounded-xl border p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Palnie de conversie</h2>
              <div className="flex items-center gap-2">
                <FunnelStep label="Onboarding" count={data.funnel.onboarding} color="bg-slate-200" />
                <Arrow />
                <FunnelStep label="Activi" count={data.funnel.active} color="bg-emerald-200" />
                <Arrow />
                <FunnelStep label="Platitori" count={data.funnel.paying} color="bg-indigo-200" />
                <div className="ml-4 text-sm text-slate-500">
                  Inactivi: {data.funnel.inactive} | Suspendati: {data.funnel.suspended}
                </div>
              </div>
            </div>

            {/* Card Distribution */}
            <div className="bg-white rounded-xl border p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Distributie pe carduri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(CARD_LABELS).map(([card, label]) => {
                  const dist = data.cardDistribution[card] || {}
                  return (
                    <div key={card} className="border rounded-lg p-3">
                      <div className="text-sm font-medium text-slate-700 mb-2">{label}</div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-emerald-600">Activ: {dist["ACTIVE"] || 0}</span>
                        <span className="text-indigo-600">Completat: {dist["COMPLETED"] || 0}</span>
                        <span className="text-slate-400">Locked: {dist["LOCKED"] || 0}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Safety Alerts */}
            <div className="bg-white rounded-xl border p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Alerte de siguranta (ultimele 7 zile)</h2>
              {data.safetyAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">Nicio alerta activa — ecosistem stabil.</p>
              ) : (
                <div className="space-y-2">
                  {data.safetyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`border rounded-lg p-3 ${ALERT_COLORS[alert.level] || "bg-slate-50"}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{alert.level}</span>
                        <span className="text-xs opacity-70">
                          {CARD_LABELS[alert.card] || alert.card} — {new Date(alert.createdAt).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                      {alert.reason && <p className="text-xs mt-1 opacity-80">{alert.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Community Activity */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Activitate comunitati
                <span className="ml-2 text-sm font-normal text-slate-500">({data.recentMessages24h} mesaje in ultimele 24h)</span>
              </h2>
              {data.communities.length === 0 ? (
                <p className="text-sm text-slate-500">Nicio comunitate activa.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.communities.map((c) => (
                    <div key={c.card} className="border rounded-lg p-3">
                      <div className="text-sm font-medium text-slate-700">{c.name}</div>
                      <div className="flex gap-4 text-xs text-slate-500 mt-1">
                        <span>{c.members} membri</span>
                        <span>{c.messages} mesaje</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">
        {value.toLocaleString("ro-RO")}{suffix || ""}
      </div>
    </div>
  )
}

function FunnelStep({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`${color} rounded-lg px-4 py-2 text-center`}>
      <div className="text-lg font-bold text-slate-800">{count}</div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  )
}

function Arrow() {
  return <span className="text-slate-400 text-lg">→</span>
}
