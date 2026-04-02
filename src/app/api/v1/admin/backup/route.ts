import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/admin/backup
 * Exportă datele critice ca JSON backup.
 * Trimite notificare la Owner cu rezumatul.
 *
 * Rulat zilnic prin n8n FLUX-040.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const p = prisma as any
    const now = new Date()

    // Export date critice
    const [
      tenants,
      users,
      jobs,
      sessions,
      evaluations,
      kbEntries,
      agentDefinitions,
      agentRelationships,
      proposals,
      escalations,
      brainstormSessions,
      brainstormIdeas,
      agentMetrics,
      payrollEntries,
      payrollBatches,
    ] = await Promise.all([
      p.tenant.findMany(),
      p.user.findMany({ select: { id: true, tenantId: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true } }),
      p.job.findMany(),
      p.evaluationSession.findMany(),
      p.evaluation.findMany(),
      p.kBEntry.findMany({ where: { status: "PERMANENT" } }),
      p.agentDefinition.findMany(),
      p.agentRelationship.findMany(),
      p.orgProposal.findMany().catch(() => []),
      p.escalation.findMany().catch(() => []),
      p.brainstormSession.findMany().catch(() => []),
      p.brainstormIdea.findMany().catch(() => []),
      p.agentMetric.findMany().catch(() => []),
      p.payrollEntry.findMany().catch(() => []),
      p.payrollImportBatch.findMany().catch(() => []),
    ])

    const backup = {
      version: "1.0",
      generatedAt: now.toISOString(),
      counts: {
        tenants: tenants.length,
        users: users.length,
        jobs: jobs.length,
        sessions: sessions.length,
        evaluations: evaluations.length,
        kbEntries: kbEntries.length,
        agentDefinitions: agentDefinitions.length,
        agentRelationships: agentRelationships.length,
        proposals: proposals.length,
        escalations: escalations.length,
        brainstormSessions: brainstormSessions.length,
        brainstormIdeas: brainstormIdeas.length,
        agentMetrics: agentMetrics.length,
        payrollEntries: payrollEntries.length,
        payrollBatches: payrollBatches.length,
      },
      data: {
        tenants,
        users,
        jobs,
        sessions,
        evaluations,
        kbEntries,
        agentDefinitions,
        agentRelationships,
        proposals,
        escalations,
        brainstormSessions,
        brainstormIdeas,
        agentMetrics,
        payrollEntries,
        payrollBatches,
      },
    }

    const totalRecords = Object.values(backup.counts).reduce((a, b) => a + b, 0)

    // Notificare Owner
    try {
      const ntfyUrl = process.env.NTFY_URL || "https://ntfy.sh"
      const ntfyTopic = process.env.NTFY_TOPIC
      if (ntfyTopic) {
        await fetch(`${ntfyUrl}/${ntfyTopic}`, {
          method: "POST",
          headers: {
            "Title": `Backup DB — ${now.toISOString().split("T")[0]}`,
            "Priority": "low",
            "Tags": "floppy_disk",
          },
          body: `Backup complet: ${totalRecords} înregistrări din 15 tabele.\nKB: ${kbEntries.length} | Agenți: ${agentDefinitions.length} | Jobs: ${jobs.length}`,
        }).catch(() => {})
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      generatedAt: now.toISOString(),
      totalRecords,
      counts: backup.counts,
      // Backup-ul complet e în response body — n8n îl salvează
      backup,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
