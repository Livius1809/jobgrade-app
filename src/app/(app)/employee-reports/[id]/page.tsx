import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import EmployeeReportDetailClient from "./EmployeeReportDetailClient"

export const dynamic = "force-dynamic"

export default async function EmployeeReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const { id } = await params
  const { tenantId, role } = session.user

  const report = await prisma.employeeContinuousReport.findFirst({
    where: { id, tenantId },
    include: {
      sections: { orderBy: [{ order: "asc" }, { updatedAt: "desc" }] },
    },
  })

  if (!report) notFound()

  const isAdmin = ["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)

  return (
    <div className="p-6">
      <EmployeeReportDetailClient
        report={JSON.parse(JSON.stringify(report))}
        mode={isAdmin ? "employer" : "employee"}
      />
    </div>
  )
}
