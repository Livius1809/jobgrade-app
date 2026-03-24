import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import JobForm from "@/components/jobs/JobForm"

export const metadata = { title: "Fișă de post nouă" }

export default async function NewJobPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [departments, evaluators] = await Promise.all([
    prisma.department.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        tenantId,
        role: "REPRESENTATIVE",
        status: "ACTIVE",
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fișă de post nouă</h1>
        <p className="text-sm text-gray-500 mt-1">
          Completează informațiile despre poziție
        </p>
      </div>
      <JobForm departments={departments} representatives={evaluators} />
    </div>
  )
}
