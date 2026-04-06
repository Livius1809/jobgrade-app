import { headers } from "next/headers"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Dashboard minimal pentru sistemul de detecție disfuncții.
// Server component: citește INTERNAL_API_KEY din env, nu expune nimic în client.
// Auto-refresh: meta refresh 30s (minimalist, fără JS).

type CockpitResponse = {
  generatedAt: string
  windowHours: number
  totals: {
    events: number
    open: number
    resolved: number
    escalated: number
    autoResolved: number
  }
  byClass: Record<string, number>
  bySeverity: Record<string, number>
  d2ByLevel: Record<string, number>
  totalByLevel: Record<string, number>
  topCritical: Array<{
    id: string
    class: string
    severity: string
    targetType: string
    targetId: string
    signal: string
    detectedAt: string
    ageMinutes: number
    escalationChain: string[]
  }>
}

async function fetchCockpit(): Promise<CockpitResponse | null> {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return null
  try {
    const h = await headers()
    const host = h.get("host") ?? "localhost:3001"
    const proto = h.get("x-forwarded-proto") ?? "http"
    const res = await fetch(`${proto}://${host}/api/v1/disfunctions/cockpit`, {
      headers: { "x-internal-key": key },
      cache: "no-store",
    })
    if (!res.ok) return null
    return (await res.json()) as CockpitResponse
  } catch {
    return null
  }
}

function severityColor(sev: string): string {
  switch (sev) {
    case "CRITICAL": return "#dc2626"
    case "HIGH":     return "#ea580c"
    case "MEDIUM":   return "#ca8a04"
    case "LOW":      return "#65a30d"
    default:         return "#6b7280"
  }
}

function classColor(cls: string): string {
  switch (cls) {
    case "D1_TECHNICAL":       return "#0891b2"
    case "D2_FUNCTIONAL_MGMT": return "#7c3aed"
    case "D3_BUSINESS_PROCESS":return "#db2777"
    default:                    return "#6b7280"
  }
}

export default async function DisfunctionsDashboard() {
  const data = await fetchCockpit()

  if (!data) {
    return (
      <main style={{ padding: 32, fontFamily: "monospace" }}>
        <h1>JobGrade — Cockpit Disfuncții</h1>
        <p style={{ color: "#dc2626" }}>
          Nu pot încărca date. Verifică INTERNAL_API_KEY și că /api/v1/disfunctions/cockpit e live.
        </p>
      </main>
    )
  }

  const generated = new Date(data.generatedAt)

  return (
    <main style={{
      padding: 24,
      fontFamily: "-apple-system, system-ui, sans-serif",
      background: "#0f172a",
      color: "#e2e8f0",
      minHeight: "100vh",
    }}>
      <meta httpEquiv="refresh" content="30" />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>
          JobGrade — Cockpit Disfuncții
        </h1>
        <span style={{ color: "#64748b", fontSize: 13 }}>
          generat {generated.toLocaleString("ro-RO")} · auto-refresh 30s
        </span>
      </header>

      {/* Top stats row */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        <Stat label="Total events 24h" value={data.totals.events} />
        <Stat label="OPEN" value={data.totals.open} color="#fbbf24" />
        <Stat label="RESOLVED" value={data.totals.resolved} color="#4ade80" />
        <Stat label="ESCALATED" value={data.totals.escalated} color="#f87171" />
        <Stat label="Auto-reparat" value={data.totals.autoResolved} color="#38bdf8" />
      </section>

      {/* By class + severity */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Panel title="Pe clase">
          {Object.entries(data.byClass).map(([k, v]) => (
            <Row key={k} label={k} value={v} color={classColor(k)} />
          ))}
        </Panel>
        <Panel title="Pe severitate">
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((k) => (
            <Row key={k} label={k} value={data.bySeverity[k] ?? 0} color={severityColor(k)} />
          ))}
        </Panel>
      </section>

      {/* D2 per level */}
      <section style={{ marginBottom: 24 }}>
        <Panel title="D2 funcțional pe niveluri ierarhice">
          {(["STRATEGIC", "TACTICAL", "OPERATIONAL"] as const).map((lvl) => {
            const d2 = data.d2ByLevel[lvl] ?? 0
            const total = data.totalByLevel[lvl] ?? 0
            const pct = total > 0 ? Math.round((100 * d2) / total) : 0
            const color = pct >= 80 ? "#f87171" : pct >= 50 ? "#fbbf24" : "#4ade80"
            return (
              <div key={lvl} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                  <span>{lvl}</span>
                  <span style={{ color }}>{d2}/{total} D2 ({pct}%)</span>
                </div>
                <div style={{ background: "#1e293b", height: 8, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ background: color, height: "100%", width: `${pct}%`, transition: "width 0.3s" }} />
                </div>
              </div>
            )
          })}
        </Panel>
      </section>

      {/* Top critical */}
      <section>
        <Panel title={`Top ${data.topCritical.length} disfuncții OPEN (HIGH/CRITICAL prioritate)`}>
          {data.topCritical.length === 0 ? (
            <p style={{ color: "#4ade80", margin: 0 }}>Nimic critic deschis ✓</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                  <th style={{ padding: "8px 6px" }}>Severitate</th>
                  <th style={{ padding: "8px 6px" }}>Clasă</th>
                  <th style={{ padding: "8px 6px" }}>Tip</th>
                  <th style={{ padding: "8px 6px" }}>Target</th>
                  <th style={{ padding: "8px 6px" }}>Signal</th>
                  <th style={{ padding: "8px 6px" }}>Vârstă</th>
                  <th style={{ padding: "8px 6px" }}>Escaladare</th>
                </tr>
              </thead>
              <tbody>
                {data.topCritical.map((e) => {
                  const hrs = Math.round(e.ageMinutes / 60)
                  const age = hrs >= 1 ? `${hrs}h` : `${e.ageMinutes}min`
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px 6px" }}>
                        <span style={{
                          background: severityColor(e.severity),
                          padding: "2px 8px",
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {e.severity}
                        </span>
                      </td>
                      <td style={{ padding: "8px 6px", color: classColor(e.class), fontSize: 11 }}>
                        {e.class.replace("_", " ")}
                      </td>
                      <td style={{ padding: "8px 6px", color: "#94a3b8" }}>{e.targetType}</td>
                      <td style={{ padding: "8px 6px", fontWeight: 600 }}>{e.targetId}</td>
                      <td style={{ padding: "8px 6px", color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}>
                        {e.signal}
                      </td>
                      <td style={{ padding: "8px 6px", color: "#94a3b8" }}>{age}</td>
                      <td style={{ padding: "8px 6px", color: "#64748b", fontSize: 11 }}>
                        {e.escalationChain.length > 0 ? e.escalationChain.join(" → ") : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      <footer style={{ marginTop: 32, color: "#475569", fontSize: 11, textAlign: "center" }}>
        Principiu canonic 05.04.2026: detectăm canale/ritm/tranziții, nu judecăm conținut.
      </footer>
    </main>
  )
}

function Stat({ label, value, color = "#e2e8f0" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: "#1e293b",
      padding: "14px 16px",
      borderRadius: 6,
      border: "1px solid #334155",
    }}>
      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#1e293b",
      padding: 16,
      borderRadius: 6,
      border: "1px solid #334155",
    }}>
      <h2 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#94a3b8", fontWeight: 600 }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: "#cbd5e1" }}>{label}</span>
      <span style={{
        background: color,
        color: "#0f172a",
        padding: "1px 10px",
        borderRadius: 3,
        fontWeight: 700,
        minWidth: 30,
        textAlign: "center",
      }}>
        {value}
      </span>
    </div>
  )
}
