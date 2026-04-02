import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance } from "@/lib/credits"
import { redirect } from "next/navigation"
import Link from "next/link"
import CogChat from "@/components/chat/CogChat"

export const metadata = { title: "Owner Dashboard — JobGrade" }

// ── Data fetching ───────────────────────────────────────────────────────────

async function getOwnerData() {
  const p = prisma as any

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [
    // Agenți
    totalAgents,
    activeAgents,
    // KB
    totalKB,
    kbAddedToday,
    // Escaladări
    openEscalations,
    // Propuneri
    pendingProposals,
    totalProposals,
    // Calibrări Owner
    ownerFlags30d,
    ownerFlagsCritice,
    // Metrici
    avgPerformance,
    // Credite
    credits,
    // Brainstorm
    recentIdeas,
  ] = await Promise.all([
    p.agentDefinition.count().catch(() => 0),
    p.agentDefinition.count({ where: { isActive: true } }).catch(() => 0),
    p.kBEntry.count({ where: { status: "PERMANENT" } }).catch(() => 0),
    p.kBEntry.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }).catch(() => 0),
    p.escalation.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }).catch(() => 0),
    p.orgProposal.count({ where: { status: "COG_REVIEWED", ownerDecision: null } }).catch(() => 0),
    p.orgProposal.count().catch(() => 0),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "owner-calibration" }, createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } }).catch(() => 0),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "critic"] }, createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } }).catch(() => 0),
    p.agentMetric.aggregate({ _avg: { performanceScore: true } }).then((r: any) => Math.round(r._avg?.performanceScore || 0)).catch(() => 0),
    getBalance("demo-tenant").catch(() => 0),
    p.brainstormIdea.count({ where: { createdAt: { gte: threeDaysAgo } } }).catch(() => 0),
  ])

  return {
    agents: { total: totalAgents, active: activeAgents },
    kb: { total: totalKB, addedToday: kbAddedToday },
    escalations: openEscalations,
    proposals: { pending: pendingProposals, total: totalProposals },
    ownerCalibration: { flags30d: ownerFlags30d, critice: ownerFlagsCritice },
    performance: avgPerformance,
    credits,
    ideas: recentIdeas,
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function OwnerDashboard() {
  const session = await auth()
  if (!session) redirect("/login")

  // Acces restricționat — doar OWNER și SUPER_ADMIN
  const role = session.user.role
  if (role !== "SUPER_ADMIN" && role !== "OWNER") {
    redirect("/portal")
  }

  const data = await getOwnerData()
  const firstName = session.user.name?.split(" ")[0] ?? "Owner"

  return (
    <div className="flex gap-8 items-start">

      {/* ════════════ LEFT: Dashboard content ════════════ */}
      <div className="flex-1 min-w-0 space-y-8">

        {/* ── Greeting ──────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Bună, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Iată ce se întâmplă în organizație.
          </p>
        </div>

        {/* ── KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Agenți activi"
            value={`${data.agents.active}`}
            sub={`din ${data.agents.total} total`}
            accent="indigo"
          />
          <KPICard
            label="KB Total"
            value={`${data.kb.total}`}
            sub={`+${data.kb.addedToday} azi`}
            accent="coral"
          />
          <KPICard
            label="Performanță medie"
            value={`${data.performance}/100`}
            sub="scor echipă"
            accent="indigo"
          />
          <KPICard
            label="Credite"
            value={`${data.credits}`}
            sub="disponibile"
            accent={data.credits < 20 ? "coral" : "indigo"}
          />
        </div>

        {/* ── Atenție imediată ──────────────────────────── */}
        {(data.escalations > 0 || data.proposals.pending > 0) && (
          <div className="rounded-xl border border-coral/20 bg-coral/5 p-5">
            <h2 className="text-sm font-semibold text-coral mb-3">Necesită atenție</h2>
            <div className="space-y-2 text-sm text-foreground">
              {data.proposals.pending > 0 && (
                <p>📋 <strong>{data.proposals.pending}</strong> {data.proposals.pending === 1 ? "propunere așteaptă" : "propuneri așteaptă"} decizia ta</p>
              )}
              {data.escalations > 0 && (
                <p>🔺 <strong>{data.escalations}</strong> {data.escalations === 1 ? "escaladare deschisă" : "escaladări deschise"}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Discută cu echipa ──────────────────────────── */}
        <Link
          href="/owner/team"
          className="block rounded-xl border border-indigo/20 bg-indigo/5 p-5 hover:bg-indigo/10 hover:border-indigo/30 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-indigo" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Discută cu echipa</h3>
              <p className="text-xs text-text-secondary mt-0.5">Selectează un agent — nivel ierarhic, departament, sau individual</p>
            </div>
            <svg className="w-5 h-5 text-indigo/40 ml-auto group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>

        {/* ── Biblioteca echipei ──────────────────────────── */}
        <Link
          href="/owner/docs"
          className="block rounded-xl border border-border bg-surface p-5 hover:border-indigo/20 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Biblioteca echipei</h3>
              <p className="text-xs text-text-secondary mt-0.5">Documente partajate — agenții le accesează automat din KB</p>
            </div>
            <svg className="w-5 h-5 text-text-secondary/30 ml-auto group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>

        {/* ── Rapoarte disponibile ─────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/80 mb-4">
            Rapoarte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReportCard
              title="Evoluție agenți"
              description="8 dimensiuni per agent, maturitate, trend-uri"
              endpoint="/api/v1/agents/evolution"
              icon="📊"
            />
            <ReportCard
              title="Evoluție Owner"
              description="Oglinda ta: aliniere L1+L2+L3, pattern-uri, reflecție"
              endpoint="/api/v1/agents/owner-evolution"
              icon="🪞"
            />
            <ReportCard
              title="Raport zilnic"
              description="KB, performanță, brainstorming, cicluri, escaladări"
              endpoint="/api/v1/agents/daily-report"
              icon="📅"
            />
            <ReportCard
              title="Business Plan"
              description="Plan strategic actualizat săptămânal"
              endpoint="/api/v1/agents/business-plan"
              icon="📈"
            />
          </div>
        </div>

        {/* ── Starea organizației ──────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/80 mb-4">
            Starea organizației
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Idei recente" value={`${data.ideas}`} sub="ultimele 3 zile" />
            <StatCard label="Propuneri total" value={`${data.proposals.total}`} sub="din toate timpurile" />
            <StatCard label="Calibrări Owner" value={`${data.ownerCalibration.flags30d}`} sub="ultimele 30 zile" />
            <StatCard
              label="Flag-uri critice"
              value={`${data.ownerCalibration.critice}`}
              sub="ultimele 30 zile"
              alert={data.ownerCalibration.critice > 0}
            />
          </div>
        </div>

        {/* ── Acces rapid ──────────────────────────────── */}
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

function KPICard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: "coral" | "indigo" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent === "coral" ? "text-coral" : "text-indigo"}`}>{value}</p>
      <p className="text-xs text-text-secondary/60 mt-0.5">{sub}</p>
    </div>
  )
}

function StatCard({ label, value, sub, alert }: { label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${alert ? "border-coral/30 bg-coral/5" : "border-border bg-surface"}`}>
      <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${alert ? "text-coral" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-text-secondary/60 mt-0.5">{sub}</p>
    </div>
  )
}

function ReportCard({ title, description, endpoint, icon }: { title: string; description: string; endpoint: string; icon: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 hover:border-indigo/20 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
          <p className="text-[10px] text-text-secondary/40 mt-2 font-mono">{endpoint}</p>
        </div>
      </div>
    </div>
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
