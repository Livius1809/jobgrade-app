import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance, CREDIT_COSTS } from "@/lib/credits"
import SocialMediaGenerator from "@/components/ai/SocialMediaGenerator"

export const metadata = { title: "Generator Social Media" }

export default async function SocialMediaPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [jobs, credits] = await Promise.all([
    prisma.job.findMany({
      where: { tenantId, status: { in: ["ACTIVE", "DRAFT"] } },
      select: { id: true, title: true, department: { select: { name: true } } },
      orderBy: { title: "asc" },
    }),
    getBalance(tenantId),
  ])

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Generator Social Media
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Posturi optimizate pentru LinkedIn, Facebook, Instagram
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-purple-50 px-3 py-1.5 rounded-lg">
          Cost: <span className="font-medium text-purple-700">
            {CREDIT_COSTS.SOCIAL_MEDIA_PER_PLATFORM} credite
          </span> per platformă ·{" "}
          <span className="text-gray-700 font-medium">{credits} disponibile</span>
        </div>
      </div>
      <SocialMediaGenerator jobs={jobs} credits={credits} />
    </div>
  )
}
