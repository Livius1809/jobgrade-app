import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import PostConsensusValidation from "@/components/sessions/PostConsensusValidation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Validare post-consens" }

export default async function ValidatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) notFound()

  const { id: sessionId } = await params
  const tenantId = session.user.tenantId

  const evalSession = await prisma.evaluationSession.findFirst({
    where: { id: sessionId, tenantId },
    select: { id: true, name: true, status: true },
  })

  if (!evalSession) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/sessions/${sessionId}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Sesiune
            </Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Validare post-consens
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {evalSession.name} — Comparați scorarea dumneavoastră inițială cu rezultatul consensului
          </p>
        </div>
      </div>

      <PostConsensusValidation sessionId={sessionId} />
    </div>
  )
}
