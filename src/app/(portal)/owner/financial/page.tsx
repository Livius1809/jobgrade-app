"use client"

import { useEffect, useState } from "react"

export const dynamic = "force-dynamic"

// ── Types ──────────────────────────────────────────────────────────────────────

interface TrendPoint {
  month: string
  amount: number
}

interface TenantRevenue {
  tenantId: string
  tenantName: string
  amount: number
}

interface FinancialSummary {
  periodMonth: string
  revenue: {
    total: number
    byType: Record<string, number>
    byTenant: TenantRevenue[]
    trend: TrendPoint[]
  }
  costs: {
    byCategory: Record<string, number>
    planned: Record<string, number>
    actual: Record<string, number>
    variancePercent: number
  }
  profitability: {
    grossMargin: number
    netRevenue: number
    costToRevenueRatio: number
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRON(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

const TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Abonamente",
  CREDITS: "Credite",
  SERVICE: "Servicii",
  REFUND: "Rambursari",
}

const CATEGORY_LABELS: Record<string, string> = {
  INFRA: "Infrastructura",
  API_AI: "Cost AI (Claude)",
  MARKETING: "Marketing",
  PERSONAL: "Personal",
  DIVERSE: "Diverse",
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function FinancialPage() {
  const [data, setData] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/v1/cfo/financial-summary")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Se incarca datele financiare...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-600">
        Eroare la incarcarea datelor: {error || "Necunoscut"}
      </div>
    )
  }

  // MoM change
  const trend = data.revenue.trend
  const currentAmount = trend.length > 0 ? trend[trend.length - 1].amount : 0
  const prevAmount = trend.length > 1 ? trend[trend.length - 2].amount : 0
  const momChange = prevAmount > 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : 0
  const momArrow = momChange >= 0 ? "\u2191" : "\u2193"
  const momColor = momChange >= 0 ? "text-green-600" : "text-red-600"

  // Margin indicator
  const marginPct = data.profitability.grossMargin * 100
  const marginColor = marginPct >= 50 ? "text-green-600" : marginPct >= 30 ? "text-yellow-600" : "text-red-600"
  const marginTrendArrow = momChange >= 0 ? "\u2191" : "\u2193"

  // Budget alerts
  const budgetAlerts: { category: string; planned: number; actual: number; overPct: number }[] = []
  for (const [cat, actualVal] of Object.entries(data.costs.actual)) {
    const plannedVal = data.costs.planned[cat] || 0
    if (plannedVal > 0) {
      const overPct = ((actualVal - plannedVal) / plannedVal) * 100
      if (overPct > 20) {
        budgetAlerts.push({ category: cat, planned: plannedVal, actual: actualVal, overPct })
      }
    }
  }

  // Max bar height for trend chart
  const maxTrendAmount = Math.max(...trend.map((t) => t.amount), 1)

  // Top 5 tenants
  const topTenants = data.revenue.byTenant.slice(0, 5)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Situatie financiara — {data.periodMonth}
      </h1>

      {/* ── Revenue Summary Cards ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Venituri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total venituri</p>
            <p className="text-2xl font-bold text-gray-900">{formatRON(data.revenue.total)}</p>
            <p className={`text-sm mt-1 ${momColor}`}>
              {momArrow} {Math.abs(momChange).toFixed(1)}% vs luna anterioara
            </p>
          </div>

          {/* By type */}
          {Object.entries(data.revenue.byType).map(([type, amount]) => (
            <div key={type} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-sm text-gray-500">{TYPE_LABELS[type] || type}</p>
              <p className={`text-xl font-bold ${amount < 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatRON(amount)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cost Breakdown ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Costuri — planificat vs realizat
          <span className={`ml-2 text-sm font-normal ${data.costs.variancePercent > 0 ? "text-red-600" : "text-green-600"}`}>
            (varianta: {data.costs.variancePercent > 0 ? "+" : ""}{data.costs.variancePercent}%)
          </span>
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Categorie</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Planificat</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Realizat</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Diferenta</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.costs.byCategory).map(([cat, actualVal]) => {
                const plannedVal = data.costs.planned[cat] || 0
                const diff = actualVal - plannedVal
                const diffColor = diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-gray-500"
                return (
                  <tr key={cat} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{CATEGORY_LABELS[cat] || cat}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatRON(plannedVal)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatRON(actualVal)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${diffColor}`}>
                      {diff > 0 ? "+" : ""}{formatRON(diff)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Margin Indicator ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Profitabilitate</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
            <p className="text-sm text-gray-500">Marja bruta</p>
            <p className={`text-4xl font-bold ${marginColor}`}>
              {marginPct.toFixed(1)}%
            </p>
            <p className={`text-sm mt-1 ${momColor}`}>{marginTrendArrow} trend</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
            <p className="text-sm text-gray-500">Venit net</p>
            <p className={`text-2xl font-bold ${data.profitability.netRevenue >= 0 ? "text-green-700" : "text-red-600"}`}>
              {formatRON(data.profitability.netRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
            <p className="text-sm text-gray-500">Cost / Venit</p>
            <p className="text-2xl font-bold text-gray-900">
              {pct(data.profitability.costToRevenueRatio)}
            </p>
          </div>
        </div>
      </section>

      {/* ── Revenue Trend Chart (CSS bars) ─────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Trend venituri — ultimele 6 luni</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-end gap-3 h-48">
            {trend.map((point) => {
              const heightPct = maxTrendAmount > 0 ? (point.amount / maxTrendAmount) * 100 : 0
              return (
                <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-600 font-medium">
                    {formatRON(point.amount)}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-indigo-500 transition-all duration-300"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-1">{point.month}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Top 5 Tenants ──────────────────────────────────────────────────── */}
      {topTenants.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Top 5 clienti dupa venituri</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Client</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Venituri</th>
                </tr>
              </thead>
              <tbody>
                {topTenants.map((t, i) => (
                  <tr key={t.tenantId} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-900">{t.tenantName}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRON(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Budget Alerts ──────────────────────────────────────────────────── */}
      {budgetAlerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-red-700 mb-3">Alerte buget (depasire {">"} 20%)</h2>
          <div className="space-y-2">
            {budgetAlerts.map((alert) => (
              <div
                key={alert.category}
                className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-red-800">
                    {CATEGORY_LABELS[alert.category] || alert.category}
                  </p>
                  <p className="text-sm text-red-600">
                    Planificat: {formatRON(alert.planned)} — Realizat: {formatRON(alert.actual)}
                  </p>
                </div>
                <span className="text-lg font-bold text-red-700">
                  +{alert.overPct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
