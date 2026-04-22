/**
 * /api/v1/owner/notifications
 *
 * GET — lista notificări Owner (mesaje de la structură)
 * PATCH — marchează ca citit SAU răspunde cu informația solicitată
 *
 * Owner-ul nu dă acces la informații — oferă exact ce a fost solicitat.
 * Răspunsul merge înapoi în KB-ul agentului solicitant.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const notifications = await (prisma as any).notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  return NextResponse.json({ notifications })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const body = await request.json()
  const { id, response, responseText } = body
  if (!id) return NextResponse.json({ error: "id obligatoriu" }, { status: 400 })

  // Actualizăm notificarea
  await (prisma as any).notification.update({
    where: { id },
    data: { read: true },
  })

  // Dacă Owner-ul răspunde (nu doar "Am luat act")
  if (response === "reply" && responseText) {
    const notification = await (prisma as any).notification.findUnique({
      where: { id },
      select: { title: true, body: true, type: true },
    })

    if (notification) {
      // Extragem rolul agentului solicitant din titlu/body
      const sourceRole = extractSourceRole(notification.title, notification.body)

      if (sourceRole) {
        // Răspunsul Owner-ului merge în KB-ul agentului solicitant
        await (prisma as any).kBEntry.create({
          data: {
            agentRole: sourceRole,
            kbType: "PERMANENT",
            content: [
              `[OWNER_RESPONSE] Răspuns la: "${notification.title}"`,
              `Informație furnizată: ${responseText}`,
              `Context original: ${(notification.body || "").slice(0, 200)}`,
            ].join("\n"),
            tags: ["owner-response", "directive", sourceRole.toLowerCase()],
            confidence: 1,
            status: "PERMANENT",
            source: "EXPERT_HUMAN",
          },
        }).catch(() => {})

        // Notificăm agentul (prin task dacă există tabelul)
        await (prisma as any).agentTask?.create({
          data: {
            title: `Răspuns Owner la solicitarea: ${notification.title}`,
            description: responseText,
            assignedTo: sourceRole,
            createdBy: "OWNER",
            priority: "HIGH",
            status: "PENDING",
          },
        }).catch(() => {})
      }
    }
  }

  // Dacă Owner-ul cere lămuriri
  if (response === "clarification") {
    const notification = await (prisma as any).notification.findUnique({
      where: { id },
      select: { title: true, body: true },
    })

    if (notification) {
      const sourceRole = extractSourceRole(notification.title, notification.body)
      if (sourceRole) {
        await (prisma as any).agentTask?.create({
          data: {
            title: `Owner solicită lămuriri: ${notification.title}`,
            description: responseText || "Vă rog să detaliați solicitarea cu context suplimentar.",
            assignedTo: sourceRole,
            createdBy: "OWNER",
            priority: "HIGH",
            status: "PENDING",
          },
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true })
}

/**
 * Extrage rolul agentului solicitant din titlu/body notificare.
 * Pattern: "[ROL]", "(ROL)", "ROL:", "de la ROL" etc.
 */
function extractSourceRole(title: string, body: string): string | null {
  const combined = `${title} ${body}`

  // Pattern explicit: [COG], [DOA], etc.
  const bracketMatch = combined.match(/\[([A-Z_]{2,15})\]/)
  if (bracketMatch) return bracketMatch[1]

  // Pattern: "de la COG", "solicitat de DOA"
  const fromMatch = combined.match(/(?:de la|solicitat de|trimis de|generat de)\s+([A-Z_]{2,15})/i)
  if (fromMatch) return fromMatch[1].toUpperCase()

  // Pattern: "COG:", "DOA —"
  const prefixMatch = combined.match(/^([A-Z_]{2,10})\s*[:\—\-]/)
  if (prefixMatch) return prefixMatch[1]

  // Fallback: caută orice rol cunoscut
  const knownRoles = ["COG", "COA", "COCSA", "DOA", "DOAS", "SOA", "PMA", "CJA", "CIA", "MKA", "CMA", "HR_COUNSELOR", "MEDIATOR"]
  for (const role of knownRoles) {
    if (combined.includes(role)) return role
  }

  return "COG" // fallback implicit
}
