import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import AssessmentsClient from "./AssessmentsClient"

export const metadata = { title: "Evaluări Comune — Art. 10 EU 2023/970" }

export default async function JointAssessmentsPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const assessments = await prisma.jointPayAssessment.findMany({
    where: { tenantId },
    include: { report: { select: { reportYear: true } } },
    orderBy: { triggeredAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluări Comune — Art. 10</h1>
          <p className="text-sm text-gray-500 mt-1">
            Procese de remediere când diferența salarială depășește 5% — obligatorii conform
            Directivei EU 2023/970
          </p>
        </div>
        <a
          href="/pay-gap"
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Dashboard Pay Gap
        </a>
      </div>

      <AssessmentsClient
        assessments={assessments.map((a) => ({
          ...a,
          triggeredAt: a.triggeredAt.toISOString(),
          dueDate: a.dueDate?.toISOString() ?? null,
          resolvedAt: a.resolvedAt?.toISOString() ?? null,
          reportYear: a.report?.reportYear ?? null,
          actionPlan: a.actionPlan as {
            milestone: string
            owner: string
            dueDate: string
            done: boolean
          }[] | null,
        }))}
        canEdit={["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(
          session!.user.role
        )}
      />
    </div>
  )
}
