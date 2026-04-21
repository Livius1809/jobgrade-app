import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import PortalClientSection from "@/components/portal/PortalClientSection"

export const dynamic = "force-dynamic"
export const metadata = { title: "Portal — JobGrade" }

// ─── Determinare etapă client ──────────────────────────────────────────────

type ClientStage = "NEW" | "HAS_PROFILE" | "HAS_JOBS" | "HAS_EVALUATION" | "VALIDATED"

async function getClientStage(tenantId: string): Promise<{
  stage: ClientStage
  companyName: string
  cui: string | null
  industry: string | null
  jobCount: number
  sessionCount: number
  hasPayroll: boolean
  isValidated: boolean
  creditBalance: number
}> {
  const [tenant, profile, jobCount, sessionCount, payrollCount, validatedSession, credits] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.companyProfile.findUnique({ where: { tenantId }, select: { cui: true, industry: true } }),
    prisma.job.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.evaluationSession.count({ where: { tenantId, status: { in: ["COMPLETED", "VALIDATED"] } } }),
    (prisma as any).payrollEntry.count({ where: { tenantId } }).catch(() => 0),
    prisma.evaluationSession.findFirst({ where: { tenantId, status: "VALIDATED" as any } }).catch(() => null),
    (prisma as any).creditTransaction?.aggregate({ where: { tenantId }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
  ])

  let stage: ClientStage = "NEW"
  if (profile?.cui) stage = "HAS_PROFILE"
  if (jobCount > 0) stage = "HAS_JOBS"
  if (sessionCount > 0) stage = "HAS_EVALUATION"
  if (validatedSession) stage = "VALIDATED"

  return {
    stage,
    companyName: tenant?.name || "—",
    cui: profile?.cui || null,
    industry: profile?.industry || null,
    jobCount,
    sessionCount,
    hasPayroll: payrollCount > 0,
    isValidated: !!validatedSession,
    creditBalance: Number(credits?._sum?.amount || 0),
  }
}

// ─── Pagina principală ─────────────────────────────────────────────────────

export default async function PortalPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await auth()
  if (!session?.user?.tenantId) redirect("/login")

  const params = await searchParams
  const showSuccess = params?.success === "service"

  const client = await getClientStage(session.user.tenantId)

  // Fetch purchased service layer
  const purchase = await prisma.servicePurchase.findUnique({
    where: { tenantId: session.user.tenantId },
    select: { layer: true },
  }).catch(() => null)
  const purchasedLayer = purchase?.layer ?? 0

  const steps = [
    { id: "profile", label: "Compania ta", icon: "🏢", done: client.stage !== "NEW" },
    { id: "jobs", label: "Posturi", icon: "📋", done: client.jobCount > 0 },
    { id: "evaluate", label: "Evaluare", icon: "⚖️", done: client.sessionCount > 0 },
    { id: "report", label: "Raport", icon: "📊", done: client.isValidated },
  ]

  const currentStep = steps.findIndex(s => !s.done)
  const progress = Math.round(steps.filter(s => s.done).length / steps.length * 100)

  return (
    <div className="max-w-4xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* ═══ HEADER — Bun venit + progres ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ padding: "28px" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {client.stage === "NEW" ? "Bine ai venit!" : client.companyName}
            </h1>
            <div style={{ height: "4px" }} />
            <p className="text-sm text-slate-500">
              {client.stage === "NEW"
                ? "Hai să ne cunoaștem. Începem cu câteva informații despre compania ta."
                : client.stage === "VALIDATED"
                  ? "Evaluarea e validată. Raportul tău e disponibil."
                  : "Continuă de unde ai rămas."}
            </p>
          </div>
          {client.cui && (
            <div className="text-right">
              <p className="text-xs text-slate-400">CUI</p>
              <p className="text-sm font-mono text-slate-600">{client.cui}</p>
            </div>
          )}
        </div>

        <div style={{ height: "24px" }} />

        {/* Progres vizual */}
        <div className="flex items-center gap-2">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                step.done ? "bg-emerald-500 text-white" :
                i === currentStep ? "bg-indigo-500 text-white ring-4 ring-indigo-100" :
                "bg-slate-100 text-slate-400"
              }`}>
                {step.done ? "✓" : step.icon}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded ${
                  step.done ? "bg-emerald-300" : "bg-slate-100"
                }`} />
              )}
            </div>
          ))}
        </div>
        <div style={{ height: "8px" }} />
        <div className="flex justify-between text-[10px] text-slate-400 px-1">
          {steps.map(s => <span key={s.id}>{s.label}</span>)}
        </div>
      </div>

      {/* ═══ Toast succes plată ═══ */}
      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-emerald-600 text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Pachetul a fost activat cu succes!</p>
            <p className="text-xs text-emerald-600">Poți introduce datele necesare pentru generarea rapoartelor.</p>
          </div>
        </div>
      )}

      {/* ═══ Toate secțiunile client (state partajat pentru panouri laterale) ═══ */}
      <PortalClientSection
        jobCount={client.jobCount}
        purchasedLayer={purchasedLayer}
        clientStage={client.stage}
        cui={client.cui}
        industry={client.industry}
      />

      {/* ═══ Evaluare — se activează după posturi ═══ */}
      <StepSection
        number={3}
        title="Evaluare și ierarhizare"
        subtitle={client.sessionCount > 0
          ? `Ai ${client.sessionCount} sesiune(i) de evaluare. Deschide pentru a vedea clasamentul.`
          : "AI evaluează posturile pe 4 criterii obiective. Rezultat în secunde."}
        done={client.sessionCount > 0}
        active={client.stage === "HAS_JOBS"}
        href="/sessions"
        actionLabel={client.sessionCount > 0 ? "Vezi evaluarea" : "Pornește evaluarea AI"}
        locked={client.jobCount === 0 || purchasedLayer === 0}
        lockedMessage={purchasedLayer === 0 ? "Cumpără un pachet și completează datele" : "Mai întâi adaugă cel puțin 3 posturi"}
      />

      {/* ═══ Rapoarte — se activează când datele sunt complete ═══ */}
      {purchasedLayer > 0 ? (
        <div className={`rounded-2xl border p-6 transition-all ${
          client.isValidated
            ? "bg-emerald-50 border-emerald-200"
            : client.sessionCount > 0
              ? "bg-white border-indigo-200 shadow-md ring-2 ring-indigo-100"
              : "bg-slate-50 border-dashed border-slate-200"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                client.isValidated ? "bg-emerald-500 text-white" :
                client.sessionCount > 0 ? "bg-indigo-500 text-white" :
                "bg-slate-200 text-slate-400"
              }`}>
                {client.isValidated ? "✓" : "4"}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Rapoarte</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {client.isValidated
                    ? "Raportul este validat și disponibil."
                    : client.sessionCount > 0
                      ? "Evaluarea e completă. Deschide raportul, ajustează dacă vrei, apoi validează."
                      : "Completează datele de intrare și rulează evaluarea pentru a genera rapoartele."}
                </p>
                {!client.isValidated && client.sessionCount === 0 && (
                  <>
                    <div style={{ height: "12px" }} />
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{client.jobCount >= 3 ? "✓" : "○"} Posturi ({client.jobCount}/3 min)</span>
                      <span>→</span>
                      <span>{client.sessionCount > 0 ? "✓" : "○"} Evaluare</span>
                      <span>→</span>
                      <span>○ Raport</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {client.sessionCount > 0 && (
              <Link
                href="/reports/master"
                className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors ${
                  client.isValidated
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                }`}
              >
                {client.isValidated ? "Vezi raportul validat" : "Deschide raportul"}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold">4</div>
            <div>
              <h3 className="text-base font-bold text-slate-400">Rapoarte</h3>
              <p className="text-xs text-slate-300">Cumpără un pachet și completează datele de intrare</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AJUTOR ═══ */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Ai nevoie de ajutor?</p>
          <p className="text-xs text-slate-400">Consilierul nostru te ghidează la fiecare pas.</p>
        </div>
        <Link href="/demo" className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          Vezi demo-ul →
        </Link>
      </div>
    </div>
  )
}

// ─── Componente ────────────────────────────────────────────────────────────

function StepSection({ number, title, subtitle, done, active, href, actionLabel, secondaryHref, secondaryLabel, locked, lockedMessage, reward, freeLabel }: {
  number: number; title: string; subtitle: string; done: boolean; active: boolean
  href: string; actionLabel: string; secondaryHref?: string; secondaryLabel?: string
  locked?: boolean; lockedMessage?: string; reward?: string; freeLabel?: string
}) {
  if (locked) {
    return (
      <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 opacity-60" style={{ padding: "28px" }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold shrink-0">{number}</div>
          <div>
            <h3 className="text-base font-bold text-slate-400">{title}</h3>
            <div style={{ height: "4px" }} />
            <p className="text-xs text-slate-300">{lockedMessage || "Finalizează pașii anteriori"}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border transition-all ${
      done ? "bg-emerald-50 border-emerald-200" :
      active ? "bg-white border-indigo-200 shadow-md ring-2 ring-indigo-100" :
      "bg-white border-slate-200"
    }`} style={{ padding: "28px" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
            done ? "bg-emerald-500 text-white" :
            active ? "bg-indigo-500 text-white" :
            "bg-slate-100 text-slate-400"
          }`}>
            {done ? "✓" : number}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {freeLabel && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{freeLabel}</span>}
            </div>
            <div style={{ height: "4px" }} />
            <p className="text-sm text-slate-500">{subtitle}</p>
            {reward && (
              <>
                <div style={{ height: "8px" }} />
                <p className="text-xs text-emerald-600 font-medium">{reward}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Link
            href={href}
            className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors ${
              done ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
              active ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm" :
              "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {actionLabel}
          </Link>
          {secondaryHref && (
            <Link href={secondaryHref} className="text-[10px] text-indigo-500 hover:underline text-center">
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function ProblemCard({ number, icon, title, description, solution, href }: {
  number: number; icon: string; title: string; description: string; solution: string; href: string
}) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">{number}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
      <p className="text-[10px] text-indigo-500 font-medium mt-3">{solution} →</p>
    </Link>
  )
}

function FeatureCard({ icon, title, description, included }: {
  icon: string; title: string; description: string; included: boolean
}) {
  return (
    <div className={`rounded-xl p-4 text-center border ${
      included ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100 opacity-60"
    }`}>
      <span className="text-xl">{icon}</span>
      <p className={`text-xs font-bold mt-2 ${included ? "text-emerald-800" : "text-slate-500"}`}>{title}</p>
      <p className="text-[10px] text-slate-400 mt-1">{description}</p>
      {included ? <p className="text-[9px] text-emerald-600 font-bold mt-2">✓ INCLUS</p> : <p className="text-[9px] text-slate-400 mt-2">+ adaugă</p>}
    </div>
  )
}
