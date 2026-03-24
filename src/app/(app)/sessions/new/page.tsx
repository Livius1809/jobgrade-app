import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import NewSessionWizard from "@/components/sessions/NewSessionWizard"

export const metadata = { title: "Sesiune nouă" }

export default async function NewSessionPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [jobs, evaluators] = await Promise.all([
    prisma.job.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: {
        department: { select: { name: true } },
      },
      orderBy: { title: "asc" },
    }),
    prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ["FACILITATOR", "REPRESENTATIVE"] },
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
