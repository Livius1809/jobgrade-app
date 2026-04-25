/**
 * POST /api/v1/owner/report — Agentul depune un raport scris în Inbox Owner
 *
 * Body: {
 *   sourceRole: "COG" | "CFO" | "DMA" | etc.,
 *   title: "Raport săptămânal marketing",
 *   body: "Conținutul complet al raportului...",
 *   category?: "zilnic" | "saptamanal" | "lunar" | "ad-hoc" | "alertă",
 *   sections?: Array<{ heading: string; content: string }>,  // secțiuni structurate (opțional)
 *   priority?: "LOW" | "NORMAL" | "HIGH"
 * }
 *
 * Acces: internal key (agenți, n8n) sau Owner session (manual trigger)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  // Auth: internal key sau owner session
  const internalKey = process.env.INTERNAL_API_KEY
  const hasKey = internalKey && req.headers.get("x-internal-key") === internalKey

  if (!hasKey) {
    const session = await auth()
    if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }
  }

  const body = await req.json()
  const { sourceRole, title, body: reportBody, category, sections, priority } = body

  if (!sourceRole || !title || !reportBody) {
    return NextResponse.json({ error: "sourceRole, title și body sunt obligatorii" }, { status: 400 })
  }

  const p = prisma as any

  // Găsim Owner-ul
  const owner = await p.user.findFirst({
    where: { role: { in: ["OWNER", "SUPER_ADMIN"] } },
    select: { id: true },
  })

  if (!owner) {
    return NextResponse.json({ error: "Owner nu e configurat" }, { status: 500 })
  }

  // Construim body-ul complet (cu secțiuni dacă există)
  let fullBody = reportBody
  if (sections && Array.isArray(sections) && sections.length > 0) {
    fullBody = sections.map((s: any) => `## ${s.heading}\n${s.content}`).join("\n\n")
  }

  // Creăm notificarea în Inbox
  const notification = await p.notification.create({
    data: {
      userId: owner.id,
      type: "REPORT_GENERATED",
      title: title.slice(0, 200),
      body: fullBody,
      read: false,
      sourceRole,
      requestKind: "INFORMATION",  // Schema existentă — detectat ca REPORT prin requestData
      requestData: JSON.stringify({
        isReport: true,
        category: category || "ad-hoc",
        priority: priority || "NORMAL",
        generatedAt: new Date().toISOString(),
        sectionsCount: sections?.length || 0,
      }),
    },
  })

  return NextResponse.json({
    ok: true,
    notificationId: notification.id,
    message: `Raport "${title}" depus în Inbox Owner de ${sourceRole}`,
  })
}

export async function GET() {
  return NextResponse.json({
    usage: {
      method: "POST",
      body: {
        sourceRole: "COG | CFO | DMA | etc. (obligatoriu)",
        title: "Titlul raportului (obligatoriu)",
        body: "Conținutul complet (obligatoriu)",
        category: "zilnic | saptamanal | lunar | ad-hoc | alerta (optional)",
        sections: "[{ heading, content }, ...] (optional — structurare pe secțiuni)",
        priority: "LOW | NORMAL | HIGH (optional)",
      },
      access: "x-internal-key header sau Owner session",
    },
  })
}
