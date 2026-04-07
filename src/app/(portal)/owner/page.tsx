import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import CogChat from "@/components/chat/CogChat"
import LayerCardInteractive from "./LayerCardInteractive"
import type { OwnerCockpitResult, LayerStatus, DecisionItem, DecisionOption } from "@/lib/owner/cockpit-aggregator"
import DecisionButtons from "./DecisionButtons"

export const metadata = { title: "Owner Dashboard — JobGrade" }

// ── Data fetching ───────────────────────────────────────────────────────────

async function fetchCockpit(): Promise<OwnerCockpitResult | null> {
  try {
    const key = process.env.INTERNAL_API_KEY
    const base = `http://localhost:${process.env.PORT ?? 3000}`
    const res = await fetch(`${base}/api/v1/owner/cockpit`, {
      headers: { "x-internal-key": key ?? "" },
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function OwnerDashboard() {
  const session = await auth()
  if (!session) redirect("/login")

  const role = session.user.role
  if (role !== "SUPER_ADMIN" && role !== "OWNER") {
    redirect("/portal")
  }

  const data = await fetchCockpit()
  const firstName = session.user.name?.split(" ")[0] ?? "Owner"

  return (
    <div className="flex gap-8 items-start">
      <div className="flex-1 min-w-0 space-y-8">
        <meta httpEquiv="refresh" content="3600" />

        {/* ── Greeting ──────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Bună, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Starea organismului — actualizat {data ? new Date(data.generatedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
        </div>

        {!data ? (
          <div className="rounded-xl border border-coral/20 bg-coral/5 p-5">
            <p className="text-sm text-coral">Nu se pot încărca datele cockpit-ului. Verifică dacă app-ul rulează.</p>
          </div>
        ) : (
          <>
            {/* ══════════ SECȚIUNEA 1: Organismul ══════════ */}
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/80 mb-4">
                Organismul
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <LayerCardInteractive layer={data.layers.awareness} icon="A" />
                <LayerCardInteractive layer={data.layers.goals} icon="G" />
                <LayerCardInteractive layer={data.layers.action} icon="Ac" />
                <LayerCardInteractive layer={data.layers.homeostasis} icon="H" />
                <LayerCardInteractive layer={data.layers.immune} icon="Im" />
                <LayerCardInteractive layer={data.layers.metabolism} icon="M" />
                <LayerCardInteractive layer={data.layers.evolution} icon="Ev" />
                <LayerCardInteractive layer={data.layers.rhythm} icon="R" />
              </div>
            </section>

            {/* ══════════ SECȚIUNEA 2: Decizii necesare ══════════ */}
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/80 mb-4">
                Decizii necesare
                {data.decisions.length > 0 && (
                  <span className="ml-2 text-coral">{data.decisions.length}</span>
                )}
              </h2>
              {data.decisions.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-5">
                  <p className="text-sm text-text-secondary">Zero decizii necesare. Organismul funcționează autonom.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.decisions.map((d, i) => (
                    <DecisionCard key={d.situationId ?? i} decision={d} />
                  ))}
                </div>
              )}
            </section>

            {/* ══════════ Sumar situații ══════════ */}
            {data.situationsSummary && data.situationsSummary.total > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MiniStat label="Decizii" value={data.situationsSummary.decisionRequired} accent={data.situationsSummary.decisionRequired > 0 ? "coral" : "slate"} />
                <MiniStat label="Auto-remediere" value={data.situationsSummary.autoRemediating} accent="indigo" />
                <MiniStat label="Gap cunoscut" value={data.situationsSummary.knownGap} accent="slate" />
                <MiniStat label="Zgomot config" value={data.situationsSummary.configNoise} accent="slate" />
              </div>
            )}
          </>
        )}

        {/* ── Discută cu echipa ──────────────────────────── */}
        <Link
          href="/owner/team"
          className="block rounded-xl border border-indigo/20 bg-indigo/5 p-5 hover:bg-indigo/10 hover:border-indigo/30 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo/10 flex items-center justify-center text-indigo text-lg">
              💬
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Discută cu echipa</h3>
              <p className="text-xs text-text-secondary mt-0.5">Agent — nivel ierarhic, departament, sau individual</p>
            </div>
            <span className="text-indigo/40 group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* ── Biblioteca echipei ──────────────────────────── */}
        <Link
          href="/owner/docs"
          className="block rounded-xl border border-border bg-surface p-5 hover:border-indigo/20 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center text-coral text-lg">
              📚
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Biblioteca echipei</h3>
              <p className="text-xs text-text-secondary mt-0.5">Documente partajate — agenții le accesează automat din KB</p>
            </div>
            <span className="text-text-secondary/30 group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* ── Rapoarte ────────────────────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/80 mb-4">
            Rapoarte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReportLink href="/owner/reports/agents" title="Evoluție agenți" description="8 dimensiuni per agent, maturitate, trend-uri" icon="📊" />
            <ReportLink href="/owner/reports/evolution" title="Evoluție Owner" description="Oglinda ta: aliniere L1+L2+L3, pattern-uri, reflecție" icon="🪞" />
            <ReportLink href="/owner/reports/daily" title="Raport zilnic" description="KB, performanță, brainstorming, cicluri, escaladări" icon="📅" />
            <ReportLink href="/owner/reports/business-plan" title="Business Plan" description="Plan strategic actualizat săptămânal" icon="📈" />
          </div>
        </div>

        {/* ── Acces rapid ──────────────────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/80 mb-4">
            Acces rapid
          </h2>
          <div className="flex flex-wrap gap-3">
            <QuickLink href="/portal" label="Portal B2B" />
            <QuickLink href="/personal" label="Portal B2C" />
            <QuickLink href="/jobs" label="Fișe de post" />
            <QuickLink href="/sessions" label="Sesiuni" />
            <QuickLink href="/reports" label="Rapoarte export" />
            <QuickLink href="/settings/users" label="Utilizatori" />
            <QuickLink href="/settings/billing" label="Facturare" />
          </div>
        </div>
      </div>

      {/* ════════════ RIGHT: COG Chat ════════════ */}
      <aside className="hidden lg:block w-[380px] shrink-0 sticky top-24">
        <CogChat />
      </aside>
    </div>
  )
}

// ── Componente auxiliare ─────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  HEALTHY: "bg-emerald-500",
  WARNING: "bg-amber-400",
  CRITICAL: "bg-red-500 animate-pulse",
}

const STATUS_BORDER: Record<string, string> = {
  HEALTHY: "border-emerald-500/30",
  WARNING: "border-amber-400/40",
  CRITICAL: "border-red-500/40",
}

const STATUS_BG: Record<string, string> = {
  HEALTHY: "bg-white",
  WARNING: "bg-amber-50/50",
  CRITICAL: "bg-red-50/50",
}

function LayerCard({ layer, icon }: { layer: LayerStatus; icon: string }) {
  return (
    <div className={`rounded-xl border ${STATUS_BORDER[layer.status]} ${STATUS_BG[layer.status]} p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] font-bold text-indigo bg-indigo/10 rounded px-1.5 py-0.5 uppercase tracking-wider">
          {icon}
        </span>
        <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{layer.label}</span>
        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[layer.status]}`} />
      </div>

      {/* Sub-factors */}
      <div className="space-y-1">
        {layer.subFactors.map((sf, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 truncate">{sf.name}</span>
            <span className={`font-mono font-medium ${
              sf.status === "CRITICAL" ? "text-red-600" :
              sf.status === "WARNING" ? "text-amber-600" :
              "text-slate-700"
            }`}>{sf.value}</span>
          </div>
        ))}
      </div>

      {/* Alarms badge */}
      {layer.alarmCount > 0 && (
        <div className="mt-2 text-[10px] text-red-500 bg-red-50 rounded px-2 py-1 truncate">
          {layer.alarms[0]?.message}
        </div>
      )}
    </div>
  )
}

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "border-l-red-500 bg-red-50",
  HIGH: "border-l-coral bg-orange-50",
  MEDIUM: "border-l-amber-400 bg-amber-50/50",
  LOW: "border-l-slate-300 bg-white",
}

const SEV_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
}

function DecisionCard({ decision }: { decision: DecisionItem }) {
  const d = decision
  return (
    <div className={`rounded-xl border-l-4 border border-border ${SEV_COLORS[d.severity]} p-4`}>
      {/* Title row */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${SEV_BADGE[d.severity]} uppercase`}>
          {d.severity}
        </span>
        <h3 className="text-sm font-semibold text-foreground flex-1 leading-tight">{d.title}</h3>
        <span className="text-[10px] text-text-secondary font-mono shrink-0">{d.eventCount}ev</span>
      </div>

      {/* Cause */}
      <p className="text-xs text-text-secondary mb-3 leading-relaxed">{d.cause}</p>

      {/* Causality chain */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] mb-3">
        {/* Roles */}
        {d.affectedRoles.length > 0 && (
          <>
            <span className="text-text-secondary/50 uppercase font-bold tracking-wider">Roluri</span>
            {d.affectedRoles.map(r => (
              <span key={r} className="bg-indigo/10 text-indigo border border-indigo/20 rounded px-1.5 py-0.5 font-mono">{r}</span>
            ))}
          </>
        )}

        {/* Arrow */}
        {d.affectedFluxes.length > 0 && (
          <>
            <span className="text-text-secondary/30 mx-0.5">→</span>
            <span className="text-text-secondary/50 uppercase font-bold tracking-wider">Fluxuri</span>
            {d.affectedFluxes.map(f => (
              <span key={f.fluxId} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded px-1.5 py-0.5 font-mono">
                {f.fluxId.replace("FLUX-", "F")}
                {f.criticalSteps > 0 && <span className="text-red-400 ml-0.5">({f.criticalSteps}c)</span>}
              </span>
            ))}
          </>
        )}

        {/* Arrow */}
        {d.impactedObjectives.length > 0 && (
          <>
            <span className="text-text-secondary/30 mx-0.5">→</span>
            <span className="text-text-secondary/50 uppercase font-bold tracking-wider">Obiective</span>
            {d.impactedObjectives.slice(0, 4).map(o => (
              <span key={o.code} className={`border rounded px-1.5 py-0.5 font-mono ${
                o.riskLevel === "CRITICAL" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                o.riskLevel === "HIGH" ? "bg-coral/10 text-coral border-coral/20" :
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                {o.code}
                {o.healthScore !== null && <span className="ml-0.5 opacity-70">{o.healthScore}hp</span>}
              </span>
            ))}
            {d.impactedObjectives.length > 4 && (
              <span className="text-text-secondary/40">+{d.impactedObjectives.length - 4}</span>
            )}
          </>
        )}
      </div>

      {/* Action required */}
      <div className="text-xs text-foreground/80 bg-surface/50 border border-border rounded-lg px-3 py-2 mb-3">
        <span className="font-semibold text-text-secondary mr-1">Context:</span>
        {d.actionRequired}
      </div>

      {/* Decision options — interactive */}
      {d.options && d.options.length > 0 && (
        <DecisionButtons
          situationId={d.situationId}
          options={d.options}
          affectedRoles={d.affectedRoles}
        />
      )}

      {/* Escalation paths — per rol */}
      {d.escalationPaths && d.escalationPaths.some((p: { chain: string[] }) => p.chain.length > 0) && (
        <div className="mt-2 space-y-0.5">
          {d.escalationPaths.map((p: { role: string; chain: string[] }) => p.chain.length > 0 && (
            <div key={p.role} className="text-[10px] text-text-secondary/40">
              {p.role} → {p.chain.join(" → ")}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: "coral" | "indigo" | "slate" }) {
  const colors = { coral: "text-coral", indigo: "text-indigo", slate: "text-text-secondary" }
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <p className={`text-xl font-bold ${colors[accent]}`}>{value}</p>
      <p className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

function ReportLink({ href, title, description, icon }: { href: string; title: string; description: string; icon: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface p-5 hover:border-indigo/20 hover:shadow-md transition-all group block"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-indigo transition-colors">{title}</h3>
          <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
        </div>
        <span className="text-text-secondary/30 group-hover:translate-x-1 transition-transform mt-1">→</span>
      </div>
    </Link>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-indigo bg-indigo/5 border border-indigo/10 rounded-lg px-4 py-2 hover:bg-indigo/10 hover:border-indigo/20 transition-all"
    >
      {label}
    </Link>
  )
}
