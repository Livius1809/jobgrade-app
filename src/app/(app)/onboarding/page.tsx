import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import CompanyProfileForm from "@/components/company/CompanyProfileForm"

export const metadata = { title: "Bine ai venit la JobGrade" }

/**
 * Onboarding page — prima oprire după signup.
 *
 * Flow:
 *  1. Utilizator creează cont (/register)
 *  2. Este redirectat la /login cu callbackUrl=/onboarding
 *  3. După login, ajunge aici și completează profilul companiei
 *  4. După salvare, e redirectat la /sessions/new (primul job evaluat)
 *
 * Dacă profilul e deja completat (mission + vision), pagina face bypass
 * și redirectează direct la dashboard — evităm să ghidăm repeat users.
 */
export default async function OnboardingPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/onboarding")

  const tenantId = session.user.tenantId
  const [profile, tenant] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
  ])

  // Skip onboarding dacă profilul are deja mission + vision completate
  const alreadyOnboarded = !!(profile?.mission && profile?.vision)
  if (alreadyOnboarded) redirect("/portal")

  return (
    <div className="max-w-3xl space-y-8">
      {/* Welcome hero */}
      <div className="bg-gradient-to-br from-coral/10 to-blue-50 border border-coral/20 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Bine ai venit{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-gray-700 mb-4">
          Hai să cunoaștem compania ta. Completează profilul în 2-3 minute și
          îți pregătim prima evaluare de joburi.
        </p>
        <div className="flex items-center gap-3 text-sm">
          <StepBadge n={1} active>Profil companie</StepBadge>
          <StepArrow />
          <StepBadge n={2}>Primul job</StepBadge>
          <StepArrow />
          <StepBadge n={3}>Comitet evaluare</StepBadge>
          <StepArrow />
          <StepBadge n={4}>Raport JobGrade</StepBadge>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">De ce îți cerem aceste informații?</p>
        <ul className="list-disc pl-5 space-y-0.5 text-blue-800">
          <li>Misiunea și viziunea ghidează algoritmul de evaluare</li>
          <li>Industria și dimensiunea calibrează benchmarks salariale</li>
          <li>CUI-ul e pentru rapoartele oficiale (poți completa mai târziu)</li>
        </ul>
        <p className="mt-2 text-xs text-blue-700">
          💡 Tip: dacă ai website, folosește butonul "Extrage din website" — îți
          completăm profilul automat cu AI.
        </p>
      </div>

      {/* Form reused from /company page */}
      <CompanyProfileForm
        tenantName={tenant?.name ?? ""}
        profile={
          profile
            ? {
                mission: profile.mission ?? "",
                vision: profile.vision ?? "",
                description: profile.description ?? "",
                industry: profile.industry ?? "",
                size: profile.size ?? "",
                website: profile.website ?? "",
                cui: profile.cui ?? "",
                regCom: profile.regCom ?? "",
                address: profile.address ?? "",
                county: profile.county ?? "",
              }
            : null
        }
        onSuccessRedirect="/sessions/new"
      />
    </div>
  )
}

function StepBadge({
  n,
  active,
  children,
}: {
  n: number
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
        active
          ? "bg-coral text-white font-medium"
          : "bg-white border border-gray-200 text-gray-500"
      }`}
    >
      <span
        className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
          active ? "bg-white text-coral" : "bg-gray-100 text-gray-500"
        }`}
      >
        {n}
      </span>
      <span className="text-xs">{children}</span>
    </div>
  )
}

function StepArrow() {
  return (
    <svg
      className="w-3 h-3 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}
