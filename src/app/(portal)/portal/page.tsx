import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance } from "@/lib/credits"
import Link from "next/link"
import CompanyIdentityCard from "@/components/company/CompanyIdentityCard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Portal — JobGrade" }

/* ── Data inputs — ce date poate furniza clientul ─────────────────── */

interface DataInput {
  id: string
  label: string
  description: string
  href: string
}

const INPUT_LABELS: Record<string, string> = {
  company_identity: "Identitate firmă (CUI)",
  jobs: "Fișe de post",
  jobs_complete: "Fișe de post complete",
  payroll: "Stat de salarii",
}

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
    name: "Profil sectorial (instant cu CUI)",
    color: "emerald",
    services: [
      { id: "sector-overview", label: "Profil sectorial — repere salariale pe industrie", href: "/sector-profile", requiredInputs: ["company_identity"], color: "emerald", creditCost: "gratuit" },
      { id: "sector-paygap", label: "Top pay gaps tipice în sector", href: "/sector-profile#paygap", requiredInputs: ["company_identity"], color: "emerald", creditCost: "gratuit" },
      { id: "mvv-draft", label: "MVV draft auto-generat din obiectul de activitate", href: "/company#mvv", requiredInputs: ["company_identity"], color: "emerald", creditCost: "gratuit" },
    ],
  },
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
      { id: "eval-personal", label: "Evaluarea personalului", href: "#", requiredInputs: ["jobs_complete", "payroll"], color: "fuchsia" },
      { id: "diagnosis", label: "Diagnoză organizațională", href: "#", requiredInputs: ["jobs_complete"], color: "fuchsia" },
      { id: "multigen", label: "Managementul echipelor multigeneraționale", href: "#", requiredInputs: ["jobs_complete", "payroll"], color: "fuchsia" },
      { id: "omAI", label: "Managementul structurilor și echipelor mixte om-AI", href: "#", requiredInputs: ["jobs_complete"], color: "fuchsia" },
      { id: "quality", label: "Procese interne și Manualul calității", href: "#", requiredInputs: ["jobs_complete"], color: "fuchsia" },
      { id: "culture", label: "Cultură organizațională și performanță", href: "#", requiredInputs: ["jobs_complete", "payroll"], color: "fuchsia" },
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
  const [credits, tenant, profile, jobCount, payrollCount, completeJobCount] = await Promise.all([
    getBalance(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.job.count({ where: { tenantId, status: "ACTIVE" } }).catch(() => 0),
    (prisma as any).payrollEntry.count({ where: { tenantId } }).catch(() => 0) as Promise<number>,
    prisma.job.count({ where: { tenantId, status: "ACTIVE", responsibilities: { not: null } } }).catch(() => 0),
  ])

  const providedInputs = new Set<string>()
  if (jobCount > 0) providedInputs.add("jobs")
  if (completeJobCount > 0) providedInputs.add("jobs_complete")
  if (payrollCount > 0) providedInputs.add("payroll")
  // Identitate firmă completă = avem CUI + industrie sincronizate cu ANAF
  if (profile?.cui && profile?.industry && profile?.anafSyncedAt) {
    providedInputs.add("company_identity")
  }

  const jobsPercent = jobCount === 0 ? 0 : completeJobCount > 0 ? 100 : 60
  const payrollPercent = payrollCount > 0 ? 100 : 0

  return {
    credits,
    companyName: tenant?.name ?? "Organizația ta",
    profile,
    jobCount,
    payrollCount: payrollCount as number,
    completeJobCount,
    jobsPercent,
    payrollPercent,
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
          <p className="text-sm text-text-secondary mt-1">
            {data.companyName}{" "}
            <Link
              href="/company"
              className="text-xs text-indigo hover:text-indigo-dark hover:underline ml-2"
            >
              Editează profil →
            </Link>
          </p>
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

      {/* ══════════ DATELE TALE — 2 coloane ══════════ */}
      <section>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Stânga — Inputuri client */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
              Inputuri client
            </h2>
            <div className="bg-surface rounded-xl border border-border p-5 space-y-5">
              {/* Identitate firmă (NEW — wizard ANAF inline) */}
              <CompanyIdentityCard
                initial={{
                  name: data.profile?.cui ? data.companyName : null,
                  cui: data.profile?.cui ?? null,
                  industry: data.profile?.industry ?? null,
                  caenName: data.profile?.caenName ?? null,
                  isVATPayer: data.profile?.isVATPayer ?? null,
                  address: data.profile?.address ?? null,
                  county: data.profile?.county ?? null,
                  anafSyncedAt: data.profile?.anafSyncedAt ?? null,
                }}
              />

              {/* Fișe de post */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-900">Fișe de post</p>
                  <span className="text-xs text-slate-400">{data.jobCount} fișe încărcate</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${data.jobsPercent === 100 ? "bg-emerald-500" : data.jobsPercent > 0 ? "bg-amber-400" : "bg-slate-200"}`}
                    style={{ width: `${data.jobsPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {data.jobsPercent === 100 ? "Complete — gata de procesare" : data.jobsPercent > 0 ? "Încărcate — necesită completare atribuții" : "Nicio fișă încărcată"}
                </p>
              </div>

              {/* Stat de salarii */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-900">Stat de salarii</p>
                  <span className="text-xs text-slate-400">{data.payrollCount} intrări importate</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${data.payrollPercent === 100 ? "bg-emerald-500" : "bg-slate-200"}`}
                    style={{ width: `${data.payrollPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {data.payrollPercent === 100 ? "Importat — gata de procesare" : "Niciun stat importat"}
                </p>
              </div>
            </div>
          </div>

          {/* Dreapta — Date relevante pentru procesare */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
              Date relevante pentru procesare
            </h2>
            <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
              {/* Fișe complete */}
              <div className={`rounded-lg px-4 py-3 ${data.providedInputs.has("jobs_complete") ? "bg-emerald-50" : "bg-amber-50"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    data.providedInputs.has("jobs_complete") ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                  }`}>
                    {data.providedInputs.has("jobs_complete") ? "✓" : "!"}
                  </span>
                  <p className="text-sm font-medium text-slate-900">Fișe de post complete</p>
                </div>
                {!data.providedInputs.has("jobs_complete") && (
                  <div className="ml-7">
                    <p className="text-xs text-slate-500 mb-2">Completează pentru fiecare post:</p>
                    <ul className="text-[10px] text-slate-400 space-y-0.5 mb-2">
                      <li>• Atribuții și responsabilități</li>
                      <li>• Cerințe (educație, experiență)</li>
                      <li>• Condiții de muncă</li>
                    </ul>
                    <Link href="/jobs" className="text-xs text-indigo-600 hover:underline">Completează acum →</Link>
                  </div>
                )}
                {data.providedInputs.has("jobs_complete") && (
                  <p className="text-xs text-emerald-600 ml-7">Gata de procesare</p>
                )}
              </div>

              {/* Date salariale */}
              <div className={`rounded-lg px-4 py-3 ${data.providedInputs.has("payroll") ? "bg-emerald-50" : "bg-slate-50"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    data.providedInputs.has("payroll") ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-500"
                  }`}>
                    {data.providedInputs.has("payroll") ? "✓" : ""}
                  </span>
                  <p className="text-sm font-medium text-slate-900">Date salariale</p>
                </div>
                {data.providedInputs.has("payroll") ? (
                  <p className="text-xs text-emerald-600 ml-7">Gata de procesare — {data.payrollCount} intrări</p>
                ) : (
                  <div className="ml-7">
                    <p className="text-xs text-slate-400 mb-2">Importă statul de salarii cu: funcție, salariu, gen, normă</p>
                    <Link href="/compensation/packages" className="text-xs text-indigo-600 hover:underline">Importă acum →</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
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
              emerald: "border-l-emerald-500",
              indigo: "border-l-indigo-500",
              violet: "border-l-violet-500",
              fuchsia: "border-l-fuchsia-500",
              slate: "border-l-slate-300",
            }
            const textColorMap: Record<string, string> = {
              emerald: "text-emerald-600",
              indigo: "text-indigo-600",
              violet: "text-violet-600",
              fuchsia: "text-fuchsia-600",
              slate: "text-slate-500",
            }
            const bgMap: Record<string, string> = {
              emerald: "bg-emerald-50/50",
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
                    const missingLabels = missingInputs.map(id => INPUT_LABELS[id] || id)

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
