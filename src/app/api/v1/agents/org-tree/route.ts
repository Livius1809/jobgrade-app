import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgTree } from "@/lib/agents/agent-registry"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/org-tree
 * Returns the full agent hierarchy as a tree structure.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tree = await getOrgTree(prisma)

    // Count stats
    function countNodes(nodes: any[]): { total: number; managers: number; levels: Set<string> } {
      let total = 0
      let managers = 0
      const levels = new Set<string>()
      for (const n of nodes) {
        total++
        if (n.isManager) managers++
        levels.add(n.level)
        if (n.children?.length) {
          const sub = countNodes(n.children)
          total += sub.total
          managers += sub.managers
          for (const l of sub.levels) levels.add(l)
        }
      }
      return { total, managers, levels }
    }

    const stats = countNodes(tree)

    return NextResponse.json({
      tree,
      stats: {
        totalAgents: stats.total,
        totalManagers: stats.managers,
        levels: [...stats.levels],
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
