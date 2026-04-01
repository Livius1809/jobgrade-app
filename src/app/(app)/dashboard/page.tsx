import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance } from "@/lib/credits"
import Link from "next/link"

export const metadata = { title: "Portal B2B — JobGrade" }

/* ------------------------------------------------------------------ */
/*  Service definitions                                                */
/* ------------------------------------------------------------------ */

type ServiceStatus = "always" | "credits" | "locked"

interface ServiceDef {
  id: string
  title: string
  description: string
  href: string
  icon: string          // heroicon path (24x24 outline)
  status: ServiceStatus
  accent: "coral" | "indigo"
}

interface ServiceCategory {
  label: string
  services: ServiceDef[]
}

const SERVICE_CATALOG: ServiceCategory[] = [
  {
    label: "Evaluare",
    services: [
      {
        id: "jobs",
        title: "Fișe de post",
        description: "Gestionează posturile din companie",
        href: "/jobs",
        icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
        status: "always",
        accent: "coral",
      },
      {
        id: "sessions",
        title: "Sesiuni de evaluare",
        description: "Evaluează și ierarhizează posturile",
        href: "/sessions",
        icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z",
        status: "always",
        accent: "coral",
      },
      {
        id: "reports",
        title: "Rapoarte",
        description: "Exportă rezultate (PDF, Excel, JSON, XML)",
        href: "/reports",
        icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
        status: "always",
        accent: "coral",
      },
    ],
  },
  {
    label: "Compensații",
    services: [
      {
        id: "packages",
        title: "Pachete salariale",
        description: "Structuri de compensare per grad",
        href: "/compensation/packages",
        icon: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
        status: "always",
        accent: "coral",
      },
      {
        id: "kpis",
        title: "KPI-uri",
        description: "Indicatori de performanță per post",
        href: "/compensation/kpis",
        icon: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605",
        status: "always",
        accent: "coral",
      },
      {
        id: "simulations",
        title: "Simulări",
        description: "Simulează scenarii de buget salarial",
        href: "/compensation/simulations",
        icon: "M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
        status: "locked",
        accent: "coral",
      },
      {
        id: "budget",
        title: "Buget salarial",
        description: "Planificare buget pe departamente",
        href: "/compensation/budget",
        icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
        status: "locked",
        accent: "coral",
      },
    ],
  },
  {
    label: "Conformitate UE",
    services: [
      {
        id: "pay-gap",
        title: "Pay Gap",
        description: "Analiză diferențe salariale pe gen",
        href: "/pay-gap",
        icon: "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z",
        status: "locked",
        accent: "indigo",
      },
      {
        id: "employee-portal",
        title: "Portalul angajatului",
        description: "Cereri transparență salarială Art. 7",
        href: "/employee-portal",
        icon: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
        status: "locked",
        accent: "indigo",
      },
    ],
  },
  {
    label: "Instrumente AI",
    services: [
      {
        id: "job-ad",
        title: "Generator anunțuri",
        description: "Creează anunțuri de recrutare",
        href: "/ai-tools/job-ad",
        icon: "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z",
        status: "credits",
        accent: "indigo",
      },
      {
        id: "social-media",
        title: "Conținut social media",
        description: "Generează postări LinkedIn",
        href: "/ai-tools/social-media",
        icon: "M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z",
        status: "credits",
        accent: "indigo",
      },
      {
        id: "kpi-sheet",
        title: "Fișe KPI",
        description: "Generează fișe de indicatori",
        href: "/ai-tools/kpi-sheet",
        icon: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
        status: "credits",
        accent: "indigo",
      },
      {
        id: "analysis",
        title: "Analiză sesiune",
        description: "Insight-uri AI din evaluări",
        href: "/ai-tools/analysis",
        icon: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z",
        status: "credits",
        accent: "indigo",
      },
    ],
  },
  {
    label: "Companie",
    services: [
      {
        id: "company",
        title: "Profil companie",
        description: "Date organizație, MVV",
        href: "/company",
        icon: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
        status: "always",
        accent: "coral",
      },
      {
        id: "departments",
        title: "Departamente",
        description: "Structura organizatorică",
        href: "/company/departments",
        icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21",
        status: "always",
        accent: "coral",
      },
    ],
  },
  {
    label: "Setări",
    services: [
      {
        id: "users",
        title: "Utilizatori",
        description: "Gestionare echipă, invitații",
        href: "/settings/users",
        icon: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
        status: "always",
        accent: "coral",
      },
      {
        id: "billing",
        title: "Facturare",
        description: "Credite, abonament, plăți",
        href: "/settings/billing",
        icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z",
        status: "always",
        accent: "coral",
      },
      {
        id: "security",
        title: "Securitate",
        description: "Parolă, autentificare",
        href: "/settings/security",
        icon: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
        status: "always",
        accent: "coral",
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

async function getPortalData(tenantId: string) {
  const [credits, tenant, activeJobs] = await Promise.all([
    getBalance(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
    prisma.job.count({
      where: { tenantId, status: "ACTIVE" },
    }),
  ])

  return { credits, companyName: tenant?.name ?? "Compania ta", activeJobs }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function DashboardPage() {
  const session = await auth()
  const data = await getPortalData(session!.user.tenantId)
  const firstName = session!.user.name?.split(" ")[0] ?? "utilizator"

  function isActive(svc: ServiceDef): boolean {
    if (svc.status === "always") return true
    if (svc.status === "credits") return data.credits > 0
    return false // locked
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* ---- Header ---- */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Bine ai revenit, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {data.companyName} &middot;{" "}
          <span className={data.credits < 20 ? "text-coral font-semibold" : ""}>
            {data.credits} credite disponibile
          </span>
        </p>
      </div>

      {/* ---- Main two-column layout ---- */}
      <div className="flex gap-8 items-start">
        {/* ============ LEFT: Services grid ============ */}
        <div className="flex-1 min-w-0 space-y-10">
          {SERVICE_CATALOG.map((cat) => (
            <section key={cat.label}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {cat.label}
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Tiles grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {cat.services.map((svc) => {
                  const active = isActive(svc)
                  return active ? (
                    <ActiveTile key={svc.id} svc={svc} />
                  ) : (
                    <LockedTile key={svc.id} svc={svc} />
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* ============ RIGHT: AI Chat panel ============ */}
        <aside className="hidden lg:flex w-[340px] shrink-0 sticky top-24 flex-col rounded-2xl border border-border bg-surface shadow-sm overflow-hidden"
          style={{ height: "calc(100vh - 8rem)" }}
        >
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-indigo/5">
            {/* Spiral icon */}
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo/10">
              <svg className="w-5 h-5 text-indigo" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Asistentul tău</h3>
              <p className="text-[11px] text-text-secondary">Echipa JobGrade</p>
            </div>
          </div>

          {/* Chat messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* Welcome message */}
            <div className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-indigo/10 flex items-center justify-center mt-0.5">
                <svg className="w-3.5 h-3.5 text-indigo" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <div className="bg-indigo/5 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground leading-relaxed">
                Bună! Sunt aici să te ajut cu orice întrebare despre evaluarea posturilor, structura salarială sau utilizarea platformei. Cu ce pot începe?
              </div>
            </div>

            {/* Placeholder note */}
            <p className="mt-6 text-center text-[11px] text-text-secondary/60 italic">
              Chat-ul va fi conectat în curând.
            </p>
          </div>

          {/* Chat input */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled
                placeholder="Scrie un mesaj..."
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/50 disabled:opacity-60 focus:outline-none"
              />
              <button
                disabled
                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-coral text-white disabled:opacity-40 transition-colors"
                aria-label="Trimite mesaj"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ---- Footer slogan ---- */}
      <div className="mt-12 pb-6 text-center">
        <p className="text-xs text-text-secondary/50">
          JobGrade &mdash; Fiecare post la locul potrivit.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tile components                                                    */
/* ------------------------------------------------------------------ */

function ActiveTile({ svc }: { svc: ServiceDef }) {
  const accentBg = svc.accent === "coral" ? "bg-coral/10" : "bg-indigo/10"
  const accentText = svc.accent === "coral" ? "text-coral" : "text-indigo"

  return (
    <Link
      href={svc.href}
      className="group flex items-start gap-4 rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${accentBg}`}>
        <svg className={`w-5 h-5 ${accentText}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d={svc.icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-coral transition-colors">
          {svc.title}
        </h3>
        <p className="mt-0.5 text-xs text-text-secondary leading-relaxed line-clamp-2">
          {svc.description}
        </p>
      </div>
      <svg className="shrink-0 w-4 h-4 text-text-secondary/40 mt-0.5 group-hover:text-coral group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  )
}

function LockedTile({ svc }: { svc: ServiceDef }) {
  return (
    <div className="relative flex items-start gap-4 rounded-xl border border-dashed border-border bg-surface/50 p-5 opacity-60">
      {/* Lock overlay icon */}
      <div className="absolute top-3 right-3">
        <svg className="w-3.5 h-3.5 text-text-secondary/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>

      <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-border/40">
        <svg className="w-5 h-5 text-text-secondary/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d={svc.icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground/70">
          {svc.title}
        </h3>
        <p className="mt-0.5 text-xs text-text-secondary/60 leading-relaxed line-clamp-2">
          {svc.description}
        </p>
        <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-coral">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Activează
        </span>
      </div>
    </div>
  )
}
