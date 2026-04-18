"use client"

import dynamic from "next/dynamic"
import type { MasterReportData } from "@/lib/reports/master-report-data"

const MasterReportFlipbook = dynamic(
  () => import("@/components/reports/MasterReportFlipbook"),
  { ssr: false, loading: () => <div className="text-center py-20 text-slate-400">Se încarcă flipbook-ul...</div> }
)

export function MasterReportWrapper({ data, initialTheme }: { data: MasterReportData; initialTheme: "sobru" | "magazine" }) {
  return <MasterReportFlipbook data={data} initialTheme={initialTheme} />
}
