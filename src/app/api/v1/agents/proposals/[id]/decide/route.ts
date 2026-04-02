import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { distillOwnerDecision } from "@/lib/agents/brainstorm-engine"
import { calibrateOwnerInput } from "@/lib/agents/owner-calibration"
import { logOwnerCalibration } from "@/lib/agents/owner-calibration-log"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * PATCH /api/v1/agents/proposals/[id]/decide
 * Owner decision on a COG-reviewed proposal.
 * Body: { decision: "APPROVED" | "REJECTED" | "DEFERRED", comment?: string }
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

  if (proposal.status !== "COG_REVIEWED") {
    return NextResponse.json(
      { error: `Cannot decide: status is ${proposal.status}, expected COG_REVIEWED` },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { decision, comment } = body

  if (!["APPROVED", "REJECTED", "DEFERRED"].includes(decision)) {
    return NextResponse.json(
      { error: "decision must be APPROVED, REJECTED, or DEFERRED" },
      { status: 400 }
    )
  }

  // Calibrare input Owner (decizie + comentariu)
  const calibrationInput = `${decision} propunere: ${proposal.title || id}${comment ? `. Comentariu: ${comment}` : ""}`
  const ownerCalibration = calibrateOwnerInput(calibrationInput)

  // Loghează și propagă
  logOwnerCalibration(ownerCalibration, "proposal-decide", prisma as any).catch(() => {})

  const newStatus = decision === "APPROVED" ? "APPROVED" : decision === "REJECTED" ? "REJECTED" : "COG_REVIEWED"

  await p.orgProposal.update({
    where: { id },
    data: {
      status: newStatus,
      ownerDecision: decision,
      ownerComment: comment || null,
    },
  })

  // Distilare feedback Owner → KB (ciclu virtuos brainstorm ↔ learning)
  try {
    await distillOwnerDecision(id, prisma)
  } catch { /* non-blocking */ }

  return NextResponse.json({
    proposal: { id, status: newStatus, ownerDecision: decision },
    ...(ownerCalibration.flags.length > 0 && {
      ownerCalibration: {
        flags: ownerCalibration.flags,
        isAligned: ownerCalibration.isAligned,
        hawkinsEstimate: ownerCalibration.hawkinsEstimate,
      },
    }),
  })
}
