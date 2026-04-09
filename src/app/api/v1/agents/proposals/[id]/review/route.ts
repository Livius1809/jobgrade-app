import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60
import { validateHierarchy } from "@/lib/agents/hierarchy-validator"
import { notifyProposalForOwner } from "@/lib/agents/owner-notify"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * PATCH /api/v1/agents/proposals/[id]/review
 * COG auto-review of a proposal.
 * Body: { autoReview?: boolean } — if autoReview, uses Claude to evaluate
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const p = prisma as any
  const proposal = await p.orgProposal.findUnique({ where: { id } })
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!["DRAFT", "PROPOSED"].includes(proposal.status)) {
    return NextResponse.json({ error: `Cannot review: status is ${proposal.status}` }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  let cogComment = body.cogComment || ""
  let approved = body.approved ?? true

  // Auto-review via Claude
  if (body.autoReview !== false) {
    try {
      const validation = await validateHierarchy(prisma)
      const client = new Anthropic()
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Ca COG (Chief Orchestrator General) al platformei JobGrade, evaluează această propunere de restructurare:

Tip: ${proposal.proposalType}
Titlu: ${proposal.title}
Descriere: ${proposal.description}
Rațional: ${proposal.rationale}
Spec: ${JSON.stringify(proposal.changeSpec)}

Ierarhie curentă: ${validation.stats.totalAgents} agenți, ${validation.stats.maxDepth} niveluri, ${validation.valid ? "validă" : "INVALIDĂ"}

Evaluează:
1. E necesar? (gap real sau optimizare prematură?)
2. E fezabil? (respectă max 5 niveluri, nu creează orfani?)
3. Riscuri?

Răspunde JSON: {"approved": true/false, "comment": "explicație scurtă", "risks": ["risc1"]}`,
        }],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : "{}"
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        approved = parsed.approved ?? true
        cogComment = parsed.comment || ""
        if (parsed.risks?.length) cogComment += ` Riscuri: ${parsed.risks.join("; ")}`
      }
    } catch (e: any) {
      cogComment = `Auto-review failed: ${e.message}. Manual review needed.`
      approved = false
    }
  }

  await p.orgProposal.update({
    where: { id },
    data: {
      status: approved ? "COG_REVIEWED" : "REJECTED",
      reviewedByCog: true,
      cogComment,
    },
  })

  // Notify Owner if COG approved
  if (approved) {
    notifyProposalForOwner(proposal.title, proposal.proposedBy, id).catch(() => {})
  }

  return NextResponse.json({
    proposal: { id, status: approved ? "COG_REVIEWED" : "REJECTED", cogComment },
  })
}
