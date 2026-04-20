import { auth } from "@/lib/auth"
import { getMasterReportData } from "@/lib/reports/master-report-data"
import { redirect } from "next/navigation"
import { MasterReportWrapper } from "@/app/demo/MasterReportWrapper"

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Raport Master</h1>
        <p className="text-sm text-slate-500">
          Dosarul complet al organizației — toate straturile conform serviciilor active
        </p>
      </div>
      <MasterReportWrapper data={data} initialTheme="sobru" isDemo={false} />
    </div>
  )
}
