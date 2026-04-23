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

// ─── Demo: read-only, fără simulator ──────────────────────────────────────

function DemoPanel({ data }: { data: MasterReportData }) {
  return <MasterReportFlipbook data={data} initialTheme="sobru" readOnly />
}

// ─── Producție: full, cu simulator ────────────────────────────────────────

function ProdMasterPanel({ data }: { data: MasterReportData }) {
  const { setActiveSection, getModifiedJE } = useSimulator()
  const modifiedJE = getModifiedJE(data.layers.baza.jobEvaluations)
  return <MasterReportFlipbook data={data} initialTheme="sobru" onOpenSimulator={setActiveSection} modifiedJE={modifiedJE} />
}

function ProdSimulatorPanel({ data }: { data: MasterReportData }) {
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

// ─── Export ───────────────────────────────────────────────────────────────

export function MasterReportWrapper({ data, initialTheme, isDemo = true }: { data: MasterReportData; initialTheme: "sobru" | "modern"; isDemo?: boolean }) {
  if (isDemo) {
    // Demo public: doar raportul, read-only, fără simulator
    return (
      <div className="max-w-6xl mx-auto w-full">
        <DemoPanel data={data} />
      </div>
    )
  }

  // Producție: split-screen cu simulator
  return (
    <MasterSimulatorLayout
      data={data}
      isDemo={false}
      masterContent={<ProdMasterPanel data={data} />}
      simulatorContent={<ProdSimulatorPanel data={data} />}
    />
  )
}
