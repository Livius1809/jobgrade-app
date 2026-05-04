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

  let data
  let isDemo = false
  let insufficientData = false
  try {
    data = await getMasterReportData(session.user.tenantId)
    // Verificăm dacă datele reale sunt suficiente
    if (!data.layers.baza.jobEvaluations?.length) {
      insufficientData = true
    }
  } catch (e) {
    console.error("[master-report] getRealData failed:", (e as Error).message?.slice(0, 100))
    insufficientData = true
  }

  if (insufficientData) {
    return (
      <div className="flex justify-center px-6">
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Raport Master</h1>
          <div className="p-8 border-2 border-dashed rounded-lg">
            <p className="text-lg font-medium text-muted-foreground mb-2">
              Date insuficiente pentru generarea raportului
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Pentru a genera Raportul Master al organizației dvs. aveți nevoie de:
            </p>
            <ul className="text-sm text-left max-w-md mx-auto space-y-2">
              <li className="flex items-center gap-2">
                <span className={data?.layers?.baza?.jobEvaluations?.length ? "text-green-600" : "text-muted-foreground"}>
                  {data?.layers?.baza?.jobEvaluations?.length ? "✓" : "○"}
                </span>
                Cel puțin o sesiune de evaluare completată (C1)
              </li>
              <li className="flex items-center gap-2">
                <span className={data?.layers?.layer1?.salaryGrades?.length ? "text-green-600" : "text-muted-foreground"}>
                  {data?.layers?.layer1?.salaryGrades?.length ? "✓" : "○"}
                </span>
                Clase salariale generate (C1 → C2)
              </li>
              <li className="flex items-center gap-2">
                <span className={data?.layers?.layer1?.payGapCategories?.length ? "text-green-600" : "text-muted-foreground"}>
                  {data?.layers?.layer1?.payGapCategories?.length ? "✓" : "○"}
                </span>
                Stat de salarii importat (C2)
              </li>
            </ul>
            <div className="mt-6 flex gap-3 justify-center">
              <a href="/sessions/new" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
                Creează sesiune evaluare
              </a>
              <a href="/demo" className="px-4 py-2 border rounded-md text-sm hover:bg-muted">
                Vezi exemplu demo
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center px-6">
      <MasterReportWrapper data={data!} initialTheme="sobru" isDemo={isDemo} />
    </div>
  )
}
