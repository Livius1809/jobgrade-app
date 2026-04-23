import { auth } from "@/lib/auth"
import { getMasterReportData } from "@/lib/reports/master-report-data"
import { redirect } from "next/navigation"
import { MasterReportWrapper } from "@/components/reports/MasterReportWrapper"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Raport Master — JobGrade",
  description: "Raportul Master complet al organizației dvs.",
}

export default async function MasterReportPage() {
  const session = await auth()
  if (!session?.user?.tenantId) redirect("/login")

  const data = await getMasterReportData(session.user.tenantId)

  return (
    <div className="flex justify-center px-6">
      <MasterReportWrapper data={data} initialTheme="sobru" isDemo={false} />
    </div>
  )
}
