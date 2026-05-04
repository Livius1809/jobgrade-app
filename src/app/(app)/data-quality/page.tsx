import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { runDataQualityCheck } from "@/lib/data-quality"
import { DataQualityClient } from "./DataQualityClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Calitate date — JobGrade" }

export default async function DataQualityPage() {
  const session = await auth()
  if (!session?.user?.tenantId) redirect("/login")

  const report = await runDataQualityCheck(session.user.tenantId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calitate date</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {report.guidanceMessage}
        </p>
      </div>
      <DataQualityClient initialReport={report} />
    </div>
  )
}
