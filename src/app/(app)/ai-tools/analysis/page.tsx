import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance, CREDIT_COSTS } from "@/lib/credits"
import SessionAnalysisGenerator from "@/components/ai/SessionAnalysisGenerator"

export const metadata = { title: "Analiză sesiune AI" }

export default async function SessionAnalysisPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [sessions, credits] = await Promise.all([
    prisma.evaluationSession.findMany({
      where: {
        tenantId,
        status: { in: ["COMPLETED", "IN_PROGRESS"] },
      },
      include: {
        _count: { select: { sessionJobs: true, participants: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getBalance(tenantId),
  ])

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analiză sesiune AI
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Interpretare statistică și recomandări bazate pe rezultatele sesiunii
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-purple-50 px-3 py-1.5 rounded-lg">
          Cost: <span className="font-medium text-purple-700">
            {CREDIT_COSTS.SESSION_ANALYSIS} credite
          </span> per analiză ·{" "}
          <span className="text-gray-700 font-medium">{credits} disponibile</span>
        </div>
      </div>
      <SessionAnalysisGenerator sessions={sessions} credits={credits} />
    </div>
  )
}
