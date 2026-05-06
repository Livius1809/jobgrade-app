"use client"
import OrgChartTree from "@/components/org/OrgChartTree"

export default function CompanyStructurePage() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Structura organizatorica</h1>
      <OrgChartTree />
    </div>
  )
}
