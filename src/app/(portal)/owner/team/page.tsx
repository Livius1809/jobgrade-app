import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import TeamChat from "@/components/chat/TeamChat"

export const metadata = { title: "Discută cu echipa — JobGrade" }

export default async function TeamPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") {
    redirect("/portal")
  }

  const p = prisma as any

  // Fetch all active agents with hierarchy info
  const agents = await p.agentDefinition.findMany({
    where: { isActive: true },
    select: {
      agentRole: true,
      displayName: true,
      description: true,
      level: true,
      isManager: true,
    },
    orderBy: [
      { level: "asc" },
      { isManager: "desc" },
      { displayName: "asc" },
    ],
  })

  // Get parent relationships
  const relationships = await p.agentRelationship.findMany({
    where: { isActive: true, relationType: "REPORTS_TO" },
    select: { childRole: true, parentRole: true },
  })

  const parentMap = new Map(relationships.map((r: any) => [r.childRole, r.parentRole]))

  const agentsWithParent = agents.map((a: any) => ({
    ...a,
    parentRole: parentMap.get(a.agentRole) || undefined,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Discută cu echipa</h1>
        <p className="text-sm text-text-secondary mt-1">
          Selectează un agent și începe conversația. Fiecare agent răspunde din perspectiva rolului și cunoașterii sale.
        </p>
      </div>
      <TeamChat agents={agentsWithParent} />
    </div>
  )
}
