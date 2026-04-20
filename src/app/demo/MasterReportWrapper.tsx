"use client"

import dynamic from "next/dynamic"
import type { MasterReportData } from "@/lib/reports/master-report-data"
import MasterSimulatorLayout, { useSimulator } from "@/components/reports/MasterSimulatorLayout"

const MasterReportFlipbook = dynamic(
  () => import("@/components/reports/MasterReportFlipbook"),
  { ssr: false, loading: () => <div className="text-center py-20 text-slate-400">Se încarcă raportul...</div> }
)

const JESimulator = dynamic(
  () => import("@/components/reports/simulators/JESimulator"),
  { ssr: false }
)

function MasterPanel({ data }: { data: MasterReportData }) {
  const { setActiveSection, getModifiedJE } = useSimulator()
  const modifiedJE = getModifiedJE(data.layers.baza.jobEvaluations)
  return <MasterReportFlipbook data={data} initialTheme="sobru" onOpenSimulator={setActiveSection} modifiedJE={modifiedJE} />
}

function SimulatorPanel({ data }: { data: MasterReportData }) {
  const { state } = useSimulator()

  switch (state.activeSection) {
    case "je":
      return <JESimulator jobs={data.layers.baza.jobEvaluations} companyName={data.company.name} />
    default:
      return (
        <div className="text-center text-slate-400 text-sm py-12">
          <p>Selectați o secțiune din raport pentru a deschide simulatorul asociat.</p>
        </div>
      )
  }
}

export function MasterReportWrapper({ data, initialTheme }: { data: MasterReportData; initialTheme: "sobru" | "modern" }) {
  return (
    <MasterSimulatorLayout
      data={data}
      masterContent={<MasterPanel data={data} />}
      simulatorContent={<SimulatorPanel data={data} />}
    />
  )
}
