import { headers } from "next/headers"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Situation = {
  id: string
  classification: "DECISION_REQUIRED" | "AUTO_REMEDIATING" | "KNOWN_GAP_ACCEPTED" | "CONFIG_NOISE"
  severity: string
  title: string
  cause: string
  impact: string
  trend: string
  actionRequired: string
  scope: { count: number; entities: string[] }
  eventIds: string[]
  firstSeenAt: string
  lastSeenAt: string
}

const CLASSIFICATION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DECISION_REQUIRED: { bg: "bg-red-900/30", text: "text-red-300", label: "Decizie necesară" },
  AUTO_REMEDIATING: { bg: "bg-yellow-900/30", text: "text-yellow-300", label: "Auto-remediere" },
  KNOWN_GAP_ACCEPTED: { bg: "bg-blue-900/30", text: "text-blue-300", label: "Gap cunoscut" },
  CONFIG_NOISE: { bg: "bg-zinc-800/30", text: "text-zinc-400", label: "Zgomot config" },
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-zinc-400",
}

async function fetchSituations(): Promise<Situation[]> {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return []

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/v1/disfunctions/situations`,
      {
        headers: { "x-internal-key": key },
        cache: "no-store",
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.situations || []
  } catch {
    return []
  }
}

export default async function SituationsPage() {
  await headers() // opt into dynamic rendering
  const situations = await fetchSituations()

  const byClassification = {
    DECISION_REQUIRED: situations.filter((s) => s.classification === "DECISION_REQUIRED"),
    AUTO_REMEDIATING: situations.filter((s) => s.classification === "AUTO_REMEDIATING"),
    KNOWN_GAP_ACCEPTED: situations.filter((s) => s.classification === "KNOWN_GAP_ACCEPTED"),
    CONFIG_NOISE: situations.filter((s) => s.classification === "CONFIG_NOISE"),
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <meta httpEquiv="refresh" content="3600" />

      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Situații — Cockpit Owner</h1>
        <p className="text-zinc-500 text-sm mb-6">
          {situations.length} situații active | Auto-refresh 30s
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {Object.entries(CLASSIFICATION_STYLES).map(([key, style]) => (
            <div key={key} className={`${style.bg} rounded-lg p-4`}>
              <div className={`text-2xl font-bold ${style.text}`}>
                {byClassification[key as keyof typeof byClassification]?.length || 0}
              </div>
              <div className="text-zinc-400 text-xs mt-1">{style.label}</div>
            </div>
          ))}
        </div>

        {/* Decision Required — top priority */}
        {byClassification.DECISION_REQUIRED.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-red-300 mb-3">
              Decizii necesare ({byClassification.DECISION_REQUIRED.length})
            </h2>
            <div className="space-y-3">
              {byClassification.DECISION_REQUIRED.map((s) => (
                <SituationCard key={s.id} situation={s} />
              ))}
            </div>
          </section>
        )}

        {/* Auto remediating */}
        {byClassification.AUTO_REMEDIATING.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-yellow-300 mb-3">
              Auto-remediere ({byClassification.AUTO_REMEDIATING.length})
            </h2>
            <div className="space-y-3">
              {byClassification.AUTO_REMEDIATING.map((s) => (
                <SituationCard key={s.id} situation={s} />
              ))}
            </div>
          </section>
        )}

        {/* Known gaps */}
        {byClassification.KNOWN_GAP_ACCEPTED.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-blue-300 mb-3">
              Gaps cunoscute ({byClassification.KNOWN_GAP_ACCEPTED.length})
            </h2>
            <div className="space-y-3">
              {byClassification.KNOWN_GAP_ACCEPTED.map((s) => (
                <SituationCard key={s.id} situation={s} />
              ))}
            </div>
          </section>
        )}

        {/* Config noise — collapsed */}
        {byClassification.CONFIG_NOISE.length > 0 && (
          <section className="mb-8 opacity-60">
            <h2 className="text-sm font-semibold text-zinc-500 mb-2">
              Zgomot config ({byClassification.CONFIG_NOISE.length})
            </h2>
            <div className="text-xs text-zinc-600">
              {byClassification.CONFIG_NOISE.map((s) => s.title).join(" | ")}
            </div>
          </section>
        )}

        {situations.length === 0 && (
          <div className="text-center text-zinc-500 py-12">
            Nicio situație activă. Sistemul funcționează normal.
          </div>
        )}
      </div>
    </div>
  )
}

function SituationCard({ situation: s }: { situation: Situation }) {
  const style = CLASSIFICATION_STYLES[s.classification] || CLASSIFICATION_STYLES.CONFIG_NOISE
  const sevColor = SEVERITY_COLORS[s.severity] || "text-zinc-400"

  return (
    <div className={`${style.bg} rounded-lg p-4 border border-zinc-800`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-medium ${style.text}`}>{s.title}</h3>
        <span className={`text-xs font-mono ${sevColor}`}>{s.severity}</span>
      </div>
      <p className="text-sm text-zinc-300 mb-2">{s.cause}</p>
      {s.impact && <p className="text-xs text-zinc-400 mb-2">Impact: {s.impact}</p>}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span>{s.scope.count} entități: {s.scope.entities.slice(0, 5).join(", ")}</span>
        <span>{s.eventIds.length} events</span>
      </div>
      {s.actionRequired && (
        <div className="mt-2 text-xs text-zinc-300 bg-zinc-800/50 rounded p-2">
          Acțiune: {s.actionRequired}
        </div>
      )}
    </div>
  )
}
