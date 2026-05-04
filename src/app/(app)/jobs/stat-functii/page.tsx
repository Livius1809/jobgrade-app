import { auth } from "@/lib/auth"
import { getTenantData } from "@/lib/tenant-storage"
import { StatFunctiiClient } from "./StatFunctiiClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Stat de funcții" }

export default async function StatFunctiiPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const statFunctii = await getTenantData(tenantId, "STAT_FUNCTII")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stat de funcții</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Structura organizatorică: departamente, posturi, niveluri ierarhice
          </p>
        </div>
      </div>

      <StatFunctiiClient initialData={statFunctii} />
    </div>
  )
}
