import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import PortalClientSection from "@/components/portal/PortalClientSection"
import SmartReportsDashboard from "@/components/dashboard/SmartReportsDashboard"
import PortalC1Pipeline from "@/components/portal/PortalC1Pipeline"
import PortalC2Pipeline from "@/components/portal/PortalC2Pipeline"
import PortalC3Pipeline from "@/components/portal/PortalC3Pipeline"
import PortalC4Pipeline from "@/components/portal/PortalC4Pipeline"
import { needsRoleOnboarding } from "@/lib/onboarding-check"
import { getUserPermissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Portal — JobGrade" }

// ─── Determinare etapă client ──────────────────────────────────────────────

type ClientStage = "NEW" | "HAS_PROFILE" | "HAS_JOBS" | "HAS_EVALUATION" | "VALIDATED"

async function getClientStage(tenantId: string): Promise<{
  stage: ClientStage
  companyName: string
  cui: string | null
  industry: string | null
  caenName: string | null
  address: string | null
  mission: string | null
  vision: string | null
  jobCount: number
  sessionCount: number
  hasPayroll: boolean
  isValidated: boolean
  creditBalance: number
  // C1 pipeline
  jobsWithDescription: number
  departmentCount: number
  latestSessionStatus: string | null
  evaluatedJobCount: number
  rankedJobCount: number
  // C2 pipeline
  employeeCount: number
  salaryGradeCount: number
  hasPayGapReport: boolean
  payGapYear: number | null
  hasJointAssessment: boolean
  complianceDocs: any[]
  // C3 pipeline
  kpiCount: number
  jobsWithKpi: number
  benchmarkCount: number
  sociogramCount: number
  teamCount: number
}> {
  const [tenant, profile, jobCount, sessionCount, payrollCount, validatedSession, credits, jobsWithDesc, departmentCount, latestSession, evaluatedJobs, employeeCount, salaryGradeCount, latestPayGap, resolvedJPA, complianceDocs, kpiCount, jobsWithKpi, benchmarkCount, sociogramCount, teamCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.companyProfile.findUnique({ where: { tenantId }, select: { cui: true, industry: true, caenName: true, address: true, mission: true, vision: true } }),
    prisma.job.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.evaluationSession.count({ where: { tenantId, status: { in: ["COMPLETED", "VALIDATED"] } } }),
    (prisma as any).payrollEntry.count({ where: { tenantId } }).catch(() => 0),
    prisma.evaluationSession.findFirst({ where: { tenantId, status: "VALIDATED" as any } }).catch(() => null),
    (prisma as any).creditTransaction?.aggregate({ where: { tenantId }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
    // C1 pipeline data
    prisma.job.count({ where: { tenantId, status: "ACTIVE", purpose: { not: null } } }).catch(() => 0),
    prisma.department.count({ where: { tenantId, isActive: true } }).catch(() => 0),
    prisma.evaluationSession.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" as const }, select: { status: true } }).catch(() => null),
    prisma.jobResult.count({ where: { session: { tenantId } } }).catch(() => 0),
    // C2 pipeline data
    (prisma as any).employeeSalaryRecord?.count({ where: { tenantId } }).catch(() => 0),
    prisma.salaryGrade.count({ where: { tenantId } }).catch(() => 0),
    prisma.payGapReport.findFirst({ where: { tenantId }, orderBy: { reportYear: "desc" as const }, select: { reportYear: true } }).catch(() => null),
    (prisma as any).jointPayAssessment?.findFirst({ where: { tenantId, status: "RESOLVED" } }).catch(() => null),
    (prisma as any).systemConfig?.findMany({ where: { key: { startsWith: `TENANT_${tenantId}_COMPLIANCE_DOC_` } } }).catch(() => []),
    // C3 pipeline data
    prisma.kpiDefinition.count({ where: { tenantId } }).catch(() => 0),
    prisma.kpiDefinition.groupBy({ by: ["jobId"], where: { tenantId } }).then((g: any[]) => g.length).catch(() => 0),
    (prisma as any).salaryBenchmark?.count({ where: { country: "RO" } }).catch(() => 0),
    (prisma as any).sociogramSession?.count({ where: { tenantId } }).catch(() => 0),
    prisma.department.count({ where: { tenantId, isActive: true } }).catch(() => 0),
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
    caenName: profile?.caenName || null,
    address: profile?.address || null,
    mission: profile?.mission || null,
    vision: profile?.vision || null,
    jobCount,
    sessionCount,
    hasPayroll: payrollCount > 0,
    isValidated: !!validatedSession,
    creditBalance: Number(credits?._sum?.amount || 0),
    // C1 pipeline
    jobsWithDescription: jobsWithDesc,
    departmentCount,
    latestSessionStatus: (latestSession as any)?.status || null,
    evaluatedJobCount: evaluatedJobs,
    rankedJobCount: evaluatedJobs,
    // C2 pipeline
    employeeCount: Number(employeeCount || 0),
    salaryGradeCount: Number(salaryGradeCount || 0),
    hasPayGapReport: !!latestPayGap,
    payGapYear: (latestPayGap as any)?.reportYear || null,
    hasJointAssessment: !!resolvedJPA,
    complianceDocs: (complianceDocs as any[]) || [],
    // C3 pipeline
    kpiCount: Number(kpiCount || 0),
    jobsWithKpi: Number(jobsWithKpi || 0),
    benchmarkCount: Number(benchmarkCount || 0),
    sociogramCount: Number(sociogramCount || 0),
    teamCount: Number(teamCount || 0),
  }
}

// ─── Pagina principală ─────────────────────────────────────────────────────

export default async function PortalPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await auth()
  if (!session?.user?.tenantId) redirect("/login")

  // Onboarding forțat: redirect la configurare roluri dacă lipsesc
  if (["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    const needsOnboarding = await needsRoleOnboarding(session.user.tenantId)
    if (needsOnboarding) redirect("/settings/roles?onboarding=true")
  }

  const params = await searchParams
  const showSuccess = params?.success === "service"
  const showCreditsSuccess = params?.success === "credits"
  const creditsAmount = params?.amount || ""

  const client = await getClientStage(session.user.tenantId)

  // Fetch purchased service layer
  const purchase = await prisma.servicePurchase.findUnique({
    where: { tenantId: session.user.tenantId },
    select: { layer: true, positions: true, employees: true },
  }).catch(() => null)
  const purchasedLayer = purchase?.layer ?? 0
  const purchasedPositions = purchase?.positions ?? 0
  const purchasedEmployees = purchase?.employees ?? 0

  // Permisiuni efective user (pe baza orgRoles + layer)
  const userPermissions = await getUserPermissions(session.user.id)
  const allowedResources = [...new Set(userPermissions.map((p) => p.resource))]

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
          <div className="flex items-center gap-6 shrink-0">
            {client.creditBalance > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Credite disponibile</p>
                <p className="text-sm font-bold text-indigo-600">{client.creditBalance.toLocaleString("ro-RO")}</p>
              </div>
            )}
            {client.cui && (
              <div className="text-right">
                <p className="text-xs text-slate-400">CUI</p>
                <p className="text-sm font-mono text-slate-600">{client.cui}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: "24px" }} />

        {/* Progres vizual — cerc + text aliniate pe aceeași coloană */}
        <div className="flex items-start">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center shrink-0" style={{ width: "56px" }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step.done ? "bg-emerald-500 text-white" :
                  i === currentStep ? "bg-indigo-500 text-white ring-4 ring-indigo-100" :
                  "bg-slate-100 text-slate-400"
                }`}>
                  {step.done ? "✓" : step.icon}
                </div>
                <div style={{ height: "6px" }} />
                <span className="text-[10px] text-slate-400 text-center whitespace-nowrap">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 rounded ${step.done ? "bg-emerald-300" : "bg-slate-100"}`} style={{ marginTop: "14px" }} />
              )}
            </div>
          ))}
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
      {showCreditsSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-emerald-600 text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Creditele au fost adăugate cu succes!</p>
            <p className="text-xs text-emerald-600">{creditsAmount ? `+${Number(creditsAmount).toLocaleString("ro-RO")} credite disponibile.` : "Creditele sunt disponibile în cont."}</p>
          </div>
        </div>
      )}

      {/* ═══ Pipeline C1 — Organizare internă ═══ */}
      {purchasedLayer > 0 && (
        <PortalC1Pipeline
          jobCount={client.jobCount}
          jobsWithDescription={client.jobsWithDescription}
          statFunctiiExists={client.departmentCount >= 2}
          departmentCount={client.departmentCount}
          sessionCount={client.sessionCount}
          sessionStatus={client.latestSessionStatus}
          evaluatedJobCount={client.evaluatedJobCount}
          rankedJobCount={client.rankedJobCount}
          isValidated={client.isValidated}
        />
      )}

      {/* ═══ Pipeline C2 — Conformitate ═══ */}
      {purchasedLayer >= 2 && (
        <PortalC2Pipeline
          c1Complete={client.isValidated || client.evaluatedJobCount > 0}
          jobCount={client.jobCount}
          hasSalaryData={client.employeeCount > 0}
          employeeCount={client.employeeCount}
          hasSalaryGrades={client.salaryGradeCount > 0}
          salaryGradeCount={client.salaryGradeCount}
          hasPayGapReport={client.hasPayGapReport}
          payGapYear={client.payGapYear}
          hasJointAssessment={client.hasJointAssessment}
          complianceEventsTotal={7}
          complianceOverdue={0}
          complianceCompleted={0}
          uploadedDocsCount={client.complianceDocs.length}
          hasROI={client.complianceDocs.some((d: any) => d.key?.includes("_ROI_"))}
          hasCCM={client.complianceDocs.some((d: any) => d.key?.includes("_CCM_"))}
        />
      )}

      {/* ═══ Pipeline C3 — Competitivitate ═══ */}
      {purchasedLayer >= 3 && (
        <PortalC3Pipeline
          c1c2Complete={client.isValidated || (client.evaluatedJobCount > 0 && client.salaryGradeCount > 0)}
          jobCount={client.jobCount}
          hasSalaryGrades={client.salaryGradeCount > 0}
          kpiCount={client.kpiCount}
          jobsWithKpi={client.jobsWithKpi}
          hasBenchmarkData={client.benchmarkCount > 0}
          hasVariableComp={false}
          evaluatedEmployees={0}
          totalEmployees={client.employeeCount}
          hasPsychometricResults={false}
          hasSociogram={client.sociogramCount > 0}
          teamCount={client.teamCount}
          teamsWithSociogram={client.sociogramCount}
          hasMatchingActive={false}
          processMapCount={0}
          hasQualityManual={false}
          sopCount={0}
        />
      )}

      {/* ═══ Pipeline C4 — Dezvoltare ═══ */}
      {purchasedLayer >= 4 && (
        <PortalC4Pipeline
          c1c2c3Complete={client.isValidated && client.salaryGradeCount > 0}
          hasClimateResults={false}
          climateDimensionsScored={0}
          hasAuditCultural={false}
          hasMVV={!!(client.mission || client.vision)}
          has3CReport={false}
          hasROICulture={false}
          hasInterventionPlan={false}
          hasSimulations={false}
          hasMonitoring={false}
          pulseCount={0}
          hasStrategicObjectives={false}
        />
      )}

      {/* ═══ Toate secțiunile client (state partajat pentru panouri laterale) ═══ */}
      <PortalClientSection
        jobCount={client.jobCount}
        purchasedLayer={purchasedLayer}
        purchasedPositions={purchasedPositions}
        purchasedEmployees={purchasedEmployees}
        creditBalance={client.creditBalance}
        clientStage={client.stage}
        companyName={client.companyName}
        cui={client.cui}
        industry={client.industry}
        caenName={client.caenName}
        address={client.address}
        mission={client.mission}
        vision={client.vision}
        sessionCount={client.sessionCount}
        isValidated={client.isValidated}
        allowedResources={allowedResources}
      />

      {/* Evaluare + Rapoarte sunt acum inline în PortalClientSection */}

      {/* ═══ Rapoarte inteligente ═══ */}
      {purchasedLayer > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Rapoarte inteligente</h2>
          <SmartReportsDashboard />
        </section>
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
