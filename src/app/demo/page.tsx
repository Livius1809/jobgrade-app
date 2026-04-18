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
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Raport Master — Demo</h1>
          <p className="text-sm text-slate-500 mt-1">
            Date fictive AgroVision SRL · Toate straturile vizibile
          </p>
        </div>
        <MasterReportWrapper data={data} initialTheme="magazine" />
      </div>
    </main>
  )
}
