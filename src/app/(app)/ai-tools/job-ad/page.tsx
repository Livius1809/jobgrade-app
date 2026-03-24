import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import JobAdGenerator from "@/components/ai/JobAdGenerator"
import { getBalance } from "@/lib/credits"
import { CREDIT_COSTS } from "@/lib/credits"

export const metadata = { title: "Generator anunț de angajare" }

export default async function JobAdPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [jobs, credits] = await Promise.all([
    prisma.job.findMany({
      where: { tenantId, status: { in: ["ACTIVE", "DRAFT"] } },
      select: {
        id: true,
        title: true,
        code: true,
        purpose: true,
        responsibilities: true,
        requirements: true,
        department: { select: { name: true } },
      },
      orderBy: { title: "asc" },
    }),
    getBalance(tenantId),
  ])

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Generator anunț de angajare
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generează anunțuri profesionale bazate pe fișa de post
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-purple-50 px-3 py-1.5 rounded-lg">
          Cost: <span className="font-medium text-purple-700">{CREDIT_COSTS.JOB_AD} credite</span> per generare
          {" · "}
          <span className="text-gray-700 font-medium">{credits} disponibile</span>
        </div>
      </div>
      <JobAdGenerator jobs={jobs} credits={credits} />
    </div>
  )
}
