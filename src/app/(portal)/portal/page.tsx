import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance } from "@/lib/credits"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Portal — JobGrade" }

/* ── Data inputs — ce date poate furniza clientul ─────────────────── */

interface DataInput {
  id: string
  label: string
  description: string
  href: string
}

const DATA_INPUTS: DataInput[] = [
  { id: "jobs", label: "Fișe de post", description: "Descrierea posturilor din organizație", href: "/jobs" },
  { id: "payroll", label: "Stat de salarii", description: "Salariile actuale pe poziții și angajați", href: "/compensation/packages" },
]

/* ── Servicii — ce poate accesa cu datele respective ──────────────── */

interface Service {
  id: string
  label: string
  href: string
  requiredInputs: string[]
  color: string
  creditCost?: string  // ex: "~5 credite/poziție" sau "—" dacă necalibrat
}

interface ServiceCategory {
  name: string
  color: string
  services: Service[]
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    name: "Evaluare",
    color: "indigo",
    services: [
      { id: "je", label: "Evaluarea posturilor", href: "/sessions", requiredInputs: ["jobs"], color: "indigo", creditCost: "credite/poziție" },
      { id: "salary", label: "Pachete salariale + benchmark", href: "/compensation/packages", requiredInputs: ["jobs", "payroll"], color: "indigo", creditCost: "credite/proiect" },
    ],
  },
  {
    name: "Conformitate EU 2023/970",
    color: "violet",
    services: [
      { id: "paygap", label: "Analiza decalajului salarial", href: "/pay-gap", requiredInputs: ["jobs", "payroll"], color: "violet", creditCost: "credite/angajat" },
      { id: "joint", label: "Evaluarea comună (Art. 10)", href: "/pay-gap/assessments", requiredInputs: ["jobs", "payroll"], color: "violet", creditCost: "credite/proiect" },
    ],
  },
  {
    name: "Dezvoltare organizațională",
    color: "fuchsia",
    services: [
      { id: "eval-personal", label: "Evaluarea personalului", href: "#", requiredInputs: ["jobs", "payroll"], color: "fuchsia" },
      { id: "diagnosis", label: "Diagnoză organizațională", href: "#", requiredInputs: ["jobs"], color: "fuchsia" },
      { id: "omAI", label: "Managementul structurilor om-AI", href: "#", requiredInputs: ["jobs"], color: "fuchsia" },
      { id: "quality", label: "Procese interne și Manualul calității", href: "#", requiredInputs: ["jobs"], color: "fuchsia" },
      { id: "culture", label: "Cultură organizațională și performanță", href: "#", requiredInputs: ["jobs", "payroll"], color: "fuchsia" },
    ],
  },
  {
    name: "Instrumente",
    color: "slate",
    services: [
      { id: "reports", label: "Rapoarte generate", href: "/reports", requiredInputs: [], color: "slate" },
      { id: "settings", label: "Setări organizație", href: "/settings", requiredInputs: [], color: "slate" },
    ],
  },
]

/* ── Data fetching ────────────────────────────────────────────────── */

async function getPortalData(tenantId: string) {
  const [credits, tenant, jobCount, hasPayroll] = await Promise.all([
    getBalance(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.job.count({ where: { tenantId, status: "ACTIVE" } }).catch(() => 0),
    prisma.salaryGrade.count({ where: { tenantId } }).then(c => c > 0).catch(() => false),
  ])

  const providedInputs = new Set<string>()
  if (jobCount > 0) providedInputs.add("jobs")
  if (hasPayroll) providedInputs.add("payroll")

  return {
    credits,
    companyName: tenant?.name ?? "Organizația ta",
    jobCount,
    providedInputs,
  }
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default async function PortalPage() {
  const session = await auth()
  const data = await getPortalData(session!.user.tenantId)
  const firstName = session!.user.name?.split(" ")[0] ?? ""

  return (
    <div className="min-h-[calc(100vh-4rem)] space-y-10">

      {/* ══════════ GREETING ══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {firstName ? `Bine ai venit, ${firstName}.` : "Bine ai venit."}
          </h1>
          <p className="text-sm text-text-secondary mt-1">{data.companyName}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${
            data.credits < 20 ? "bg-coral/10 text-coral" : "bg-indigo/10 text-indigo"
          }`}>
            {data.credits} credite disponibile
          </span>
          <Link href="/settings/billing" className="text-xs text-indigo hover:underline">
            Reîncarcă
          </Link>
        </div>
      </div>

      {/* ══════════ DATELE TALE ══════════ */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
          Datele tale
        </h2>
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DATA_INPUTS.map((input) => {
              const provided = data.providedInputs.has(input.id)
              return (
                <Link
                  key={input.id}
                  href={input.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    provided
                      ? "bg-emerald-50 hover:bg-emerald-100"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    provided ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                  }`}>
                    {provided ? "✓" : ""}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${provided ? "text-slate-900" : "text-slate-500"}`}>
                      {input.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{input.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Cu cât introduci mai multe date, cu atât mai multe servicii devin disponibile.
          </p>
        </div>
      </section>

      {/* ══════════ CE POȚI ACCESA ══════════ */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
          Ce poți accesa
        </h2>
        <div className="space-y-6">
          {SERVICE_CATEGORIES.map((cat) => {
            const colorMap: Record<string, string> = {
              indigo: "border-l-indigo-500",
              violet: "border-l-violet-500",
              fuchsia: "border-l-fuchsia-500",
              slate: "border-l-slate-300",
            }
            const textColorMap: Record<string, string> = {
              indigo: "text-indigo-600",
              violet: "text-violet-600",
              fuchsia: "text-fuchsia-600",
              slate: "text-slate-500",
            }
            const bgMap: Record<string, string> = {
              indigo: "bg-indigo-50/50",
              violet: "bg-violet-50/50",
              fuchsia: "bg-fuchsia-50/50",
              slate: "bg-slate-50/50",
            }
            return (
              <div
                key={cat.name}
                className={`rounded-xl border border-border ${bgMap[cat.color]} border-l-4 ${colorMap[cat.color]} p-5`}
              >
                <h3 className={`text-xs font-bold uppercase tracking-widest ${textColorMap[cat.color]} mb-3`}>
                  {cat.name}
                </h3>
                <div className="space-y-2">
                  {cat.services.map((svc) => {
                    const missingInputs = svc.requiredInputs.filter(r => !data.providedInputs.has(r))
                    const available = missingInputs.length === 0
                    const missingLabels = missingInputs.map(id => DATA_INPUTS.find(d => d.id === id)?.label || id)

                    return (
                      <div key={svc.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            available ? "bg-emerald-500" : "bg-slate-300"
                          }`} />
                          {available ? (
                            <Link href={svc.href} className={`text-sm hover:underline ${textColorMap[svc.color]} font-medium`}>
                              {svc.label}
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-400">{svc.label}</span>
                          )}
                        </div>
                        {!available && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            lipsă: {missingLabels.join(", ")}
                          </span>
                        )}
                        {available && (
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {svc.creditCost && (
                              <span className="text-[10px] text-slate-400">{svc.creditCost}</span>
                            )}
                            <Link href={svc.href} className="text-[10px] text-indigo-500 hover:underline">
                              Accesează →
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════ RAPOARTE GENERATE ══════════ */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
          Rapoarte generate
        </h2>
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm text-slate-400 text-center py-4">
            Rapoartele vor apărea aici pe măsură ce rulezi serviciile disponibile.
          </p>
          <div className="text-center">
            <Link href="/reports" className="text-xs text-indigo-500 hover:underline">
              Toate rapoartele →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
