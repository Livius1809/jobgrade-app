export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import {
  rebuildMentalModel,
  queryMentalModel,
  updateMentalModel,
  loadMentalModel,
} from "@/lib/engines/mental-model"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/mental-model
 * Returns current mental model (nodes, edges, stats).
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const model = await loadMentalModel()
    if (!model) {
      return NextResponse.json({
        exists: false,
        message: "Mental model not yet built. POST with action='rebuild' to create it.",
      })
    }

    return NextResponse.json({
      exists: true,
      version: model.version,
      lastRebuilt: model.lastRebuilt,
      stats: {
        nodes: model.nodes.length,
        edges: model.edges.length,
        nodesByType: countBy(model.nodes, (n) => n.type),
        edgesByRelationship: countBy(model.edges, (e) => e.relationship),
        avgNodeStrength:
          model.nodes.length > 0
            ? +(model.nodes.reduce((s, n) => s + n.strength, 0) / model.nodes.length).toFixed(3)
            : 0,
        avgEdgeWeight:
          model.edges.length > 0
            ? +(model.edges.reduce((s, e) => s + e.weight, 0) / model.edges.length).toFixed(3)
            : 0,
      },
      nodes: model.nodes,
      edges: model.edges,
    })
  } catch (err) {
    console.error("[API mental-model GET]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    )
  }
}

/**
 * POST /api/v1/agents/mental-model
 * Actions:
 *  - { action: "rebuild" } — full rebuild from all sources
 *  - { action: "query", question: "..." } — answer a question using the model
 *  - { action: "update", content: "...", source: "...", agentRole: "..." } — incremental update
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action as string

    if (!action) {
      return NextResponse.json(
        { error: "Missing 'action'. Use: rebuild | query | update" },
        { status: 400 },
      )
    }

    switch (action) {
      case "rebuild": {
        const model = await rebuildMentalModel()
        return NextResponse.json({
          ok: true,
          action: "rebuild",
          version: model.version,
          nodes: model.nodes.length,
          edges: model.edges.length,
          lastRebuilt: model.lastRebuilt,
        })
      }

      case "query": {
        const question = body.question as string
        if (!question) {
          return NextResponse.json(
            { error: "Missing 'question' for query action" },
            { status: 400 },
          )
        }
        const result = await queryMentalModel(question)
        return NextResponse.json({
          ok: true,
          action: "query",
          answer: result.answer,
          relevantNodes: result.relevantNodes.length,
          relevantEdges: result.relevantEdges.length,
          details: result,
        })
      }

      case "update": {
        const { content, source, agentRole } = body
        if (!content || !source || !agentRole) {
          return NextResponse.json(
            { error: "Missing content, source, or agentRole for update action" },
            { status: 400 },
          )
        }
        const result = await updateMentalModel({ content, source, agentRole })
        return NextResponse.json({
          ok: true,
          action: "update",
          ...result,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action '${action}'. Use: rebuild | query | update` },
          { status: 400 },
        )
    }
  } catch (err) {
    console.error("[API mental-model POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    )
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of items) {
    const key = keyFn(item)
    result[key] = (result[key] ?? 0) + 1
  }
  return result
}
