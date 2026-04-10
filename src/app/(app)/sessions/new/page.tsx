import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import NewSessionWizard from "@/components/sessions/NewSessionWizard"

// Force dynamic rendering — pagina depinde de sesiune autentificată și de
// date live per tenant. Nu cachem rezultate între useri/tenant-i.
export const dynamic = "force-dynamic"

export const metadata = { title: "Sesiune nouă" }

export default async function NewSessionPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  // Include atât ACTIVE cât și DRAFT — client nou are doar joburi DRAFT
  // la început și trebuie să le poată folosi pentru prima sesiune.
  const [jobs, evaluators] = await Promise.all([
    prisma.job.findMany({
      where: { tenantId, status: { in: ["ACTIVE", "DRAFT"] } },
      include: {
        department: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { title: "asc" }],
    }),
    // Include toate rolurile care pot participa la o sesiune — COMPANY_ADMIN
    // și OWNER sunt creatorul contului și trebuie să poată self-evalua
    // sau facilita prima sesiune (fix 10.04.2026: client singur era blocat).
    prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ["OWNER", "COMPANY_ADMIN", "FACILITATOR", "REPRESENTATIVE"] },
        status: "ACTIVE",
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sesiune nouă</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurează sesiunea de evaluare
        </p>
      </div>
      <NewSessionWizard jobs={jobs} evaluators={evaluators} />
    </div>
  )
}
