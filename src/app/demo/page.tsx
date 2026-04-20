import { getMasterReportData } from "@/lib/reports/master-report-data"
import { MasterReportWrapper } from "./MasterReportWrapper"

export const metadata = {
  title: "Demo — Raport Master — JobGrade",
  description:
    "Raportul Master complet: evaluare posturi, structură salarială, analiză pay gap, benchmark. Date fictive AgroVision SRL, rezultate reale.",
}

export default async function DemoPage() {
  const data = await getMasterReportData("demo")

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="flex justify-center px-6">
        <div className="h-4" />
        <MasterReportWrapper data={data} initialTheme="sobru" />
      </div>
    </main>
  )
}
