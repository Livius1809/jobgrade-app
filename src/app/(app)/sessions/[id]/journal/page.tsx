import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import SessionJournal from "@/components/sessions/SessionJournal"

export const dynamic = "force-dynamic"
export const metadata = { title: "Jurnalul procesului" }

export default async function JournalPage({
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
    select: { id: true, name: true },
  })

  if (!evalSession) notFound()

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/sessions/${sessionId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Sesiune
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">
          Jurnalul procesului
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {evalSession.name} — Toate acțiunile consemnate structurat
        </p>
      </div>

      <SessionJournal sessionId={sessionId} />
    </div>
  )
}
