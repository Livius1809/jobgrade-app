import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { executeAction, type ExecutionAction, type ActionExecutors } from "@/lib/agents/execution-framework"
import { publishContentExecutor, sendEmailExecutor, generateMarketingContent, sendMarketingEmail } from "@/lib/agents/marketing-executor"
import { initiateOutreach, processScheduledEmails } from "@/lib/agents/sales-executor"
import { generateDocument } from "@/lib/agents/document-executor"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// ── Executors ────────────────────────────────────────────────────────────────

const executors: ActionExecutors = {
  publishContent: publishContentExecutor,
  sendEmail: sendEmailExecutor,
  generateDocument: async (id, action) => ({
    actionId: id, type: "GENERATE_DOCUMENT", status: "EXECUTED",
    details: `Document ${action.payload.docType} generat`, timestamp: new Date().toISOString(),
  }),
  notifyOwner: async (id, action) => {
    try {
      await fetch("https://ntfy.sh/jobgrade-owner-liviu-2026", {
        method: "POST",
        headers: { Title: action.payload.title || "Notificare", Priority: action.priority.toLowerCase() },
        body: action.payload.message || action.target,
      })
    } catch {}
    return { actionId: id, type: "NOTIFY_OWNER", status: "EXECUTED", details: "Notification sent", timestamp: new Date().toISOString() }
  },
}

/**
 * POST /api/v1/agents/execute
 * Unified execution endpoint.
 *
 * Body variants:
 * { action: "content", contentType, topic, context }
 * { action: "outreach", prospect: {name, email, company, role} }
 * { action: "document", docType, clientData: {...} }
 * { action: "email", to, subject, body }
 * { action: "process_followups" }
 * { action: "raw", ...ExecutionAction }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()

    switch (body.action) {
      case "content": {
        const content = await generateMarketingContent(
          body.contentType || "blog", body.topic, body.context || "", prisma
        )
        // Store in KB
        try {
          await (prisma as any).kBEntry.create({
            data: {
              agentRole: "CWA",
              kbType: "SHARED_DOMAIN",
              content: `[Content ${content.type}] "${content.title}": ${content.body.substring(0, 200)}`,
              source: "DISTILLED_INTERACTION",
              confidence: 0.7,
              status: "PERMANENT",
              tags: ["content", content.type, "published"],
              usageCount: 0,
              validatedAt: new Date(),
            },
          })
        } catch {}
        return NextResponse.json({ content })
      }

      case "outreach": {
        const result = await initiateOutreach(body.prospect, prisma)
        return NextResponse.json(result)
      }

      case "document": {
        const doc = await generateDocument(body.docType, body.clientData, prisma)
        return NextResponse.json(doc)
      }

      case "email": {
        const result = await sendMarketingEmail(body.to, body.subject, body.body)
        return NextResponse.json(result)
      }

      case "process_followups": {
        const sent = await processScheduledEmails(prisma)
        return NextResponse.json({ followUpsSent: sent })
      }

      case "raw": {
        const result = await executeAction(body as ExecutionAction, prisma, executors)
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
