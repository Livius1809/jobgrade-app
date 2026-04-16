import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import CompanyProfileForm from "@/components/company/CompanyProfileForm"

export const metadata = { title: "Profil companie" }
export const dynamic = "force-dynamic"

export default async function CompanyPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [profile, tenant] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil companie</h1>
        <p className="text-sm text-gray-500 mt-1">
          Informații despre compania ta utilizate în rapoarte și documente
        </p>
      </div>
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
                caenCode: profile.caenCode ?? "",
                caenName: profile.caenName ?? "",
                isVATPayer: profile.isVATPayer,
              }
            : null
        }
      />
    </div>
  )
}
