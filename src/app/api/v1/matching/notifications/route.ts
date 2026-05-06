/**
 * /api/v1/matching/notifications
 *
 * POST — Notifica utilizatori B2C cand profilul lor se potriveste cu un job B2B
 * GET  — Listeaza notificarile de matching active pentru tenant
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { cpuCall } from "@/lib/cpu/gateway"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

const notifySchema = z.object({
  jobId: z.string().min(1),
  jobTitle: z.string().min(1),
  matchedCandidates: z.array(z.object({
    pseudonym: z.string(),
    compatibilityScore: z.number().min(0).max(100),
    b2cUserId: z.string(),
  })),
})

interface MatchNotification {
  id: string
  jobId: string
  jobTitle: string
  candidatePseudonym: string
  compatibilityScore: number
  status: "PENDING" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED"
  createdAt: string
  sentAt: string | null
}

interface NotificationState {
  notifications: MatchNotification[]
}

/**
 * POST — Creeaza notificari de matching pentru candidati B2C
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = notifySchema.parse(body)

    // Load existing notifications state
    const state = await getTenantData<NotificationState>(tenantId, "MATCHING_NOTIFICATIONS") ?? { notifications: [] }

    // Generate personalized notification messages via CPU
    const result = await cpuCall({
      system: `Genereaza mesaje de notificare scurte si profesionale pentru candidati B2C care au fost identificati ca potriviti pentru o pozitie. Mesajul trebuie sa fie discret, sa NU dezvaluie identitatea companiei, si sa invite la vizualizarea oportunitatii. Returneaza JSON.`,
      messages: [
        {
          role: "user",
          content: `Pozitia: "${data.jobTitle}"
Candidati: ${data.matchedCandidates.length}
Score-uri compatibilitate: ${data.matchedCandidates.map(c => `${c.pseudonym}: ${c.compatibilityScore}%`).join(", ")}

Genereaza un mesaj generic de notificare (va fi personalizat la trimitere).
Returneaza: { "notificationMessage": "..." }`,
        },
      ],
      max_tokens: 500,
      agentRole: "CMA",
      operationType: "matching-notification",
      tenantId,
      skipObjectiveCheck: true,
    })

    // Create notification records
    const newNotifications: MatchNotification[] = data.matchedCandidates.map(candidate => ({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      jobId: data.jobId,
      jobTitle: data.jobTitle,
      candidatePseudonym: candidate.pseudonym,
      compatibilityScore: candidate.compatibilityScore,
      status: "PENDING" as const,
      createdAt: new Date().toISOString(),
      sentAt: null,
    }))

    state.notifications = [...newNotifications, ...state.notifications].slice(0, 500)
    await setTenantData(tenantId, "MATCHING_NOTIFICATIONS", state)

    return NextResponse.json({
      created: newNotifications.length,
      notifications: newNotifications,
      notificationMessage: result.degraded ? null : result.text,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Date invalide.", errors: error.issues }, { status: 400 })
    }
    console.error("[MATCHING NOTIFICATIONS POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}

/**
 * GET — Listeaza notificarile de matching pentru tenant
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const state = await getTenantData<NotificationState>(tenantId, "MATCHING_NOTIFICATIONS") ?? { notifications: [] }

    return NextResponse.json({
      total: state.notifications.length,
      pending: state.notifications.filter(n => n.status === "PENDING").length,
      sent: state.notifications.filter(n => n.status === "SENT").length,
      notifications: state.notifications.slice(0, 50),
    })
  } catch (error) {
    console.error("[MATCHING NOTIFICATIONS GET]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
