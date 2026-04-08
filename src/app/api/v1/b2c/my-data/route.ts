import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"

export const maxDuration = 30

// ── GET /api/v1/b2c/my-data?userId=... — GDPR Art.15 Data Export ──────────

/**
 * VUL-027 / BUILD-004 — Exportul complet al datelor personale B2C.
 *
 * Returnează JSON structurat cu TOATE datele utilizatorului:
 * profil, carduri, jurnal, conversații, teste, traseu evolutiv.
 *
 * NU include date interne (KB entries, observații agent, Profiler shadow).
 * Include și un rezumat text (human-readable) ce poate fi convertit PDF client-side.
 */
export async function GET(req: NextRequest) {
  const p = prisma as any
  const userId = req.nextUrl.searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
  }

  // B2C Auth
  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
  }

  try {
    // ── Fetch all user-facing data ──────────────────────────────────────

    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        cards: { orderBy: { card: "asc" } },
        journalEntries: { orderBy: { createdAt: "desc" } },
        testResults: { orderBy: { administeredAt: "desc" } },
        evolutionLog: { orderBy: { createdAt: "desc" } },
        sessions: {
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            card: true,
            agentRole: true,
            status: true,
            startedAt: true,
            endedAt: true,
            threadId: true,
          },
        },
        memberships: {
          include: {
            community: { select: { card: true, name: true } },
          },
        },
        creditBalance: true,
        creditTxns: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    // ── Fetch conversation messages for all sessions with threads ───────

    const threadIds = user.sessions
      .map((s: any) => s.threadId)
      .filter(Boolean) as string[]

    let conversations: any[] = []
    if (threadIds.length > 0) {
      const threads = await p.conversationThread.findMany({
        where: { id: { in: threadIds } },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              role: true,
              content: true,
              createdAt: true,
            },
          },
        },
      })

      conversations = threads.map((t: any) => ({
        threadId: t.id,
        agentRole: t.agentRole,
        title: t.title,
        createdAt: t.createdAt,
        messages: t.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          date: m.createdAt,
        })),
      }))
    }

    // ── Build structured export ─────────────────────────────────────────

    const exportData = {
      exportedAt: new Date().toISOString(),
      gdprArticle: "Art. 15 GDPR — Dreptul de acces",

      profile: {
        alias: user.alias,
        email: user.email,
        age: user.age,
        gender: user.gender,
        lastJobTitle: user.lastJobTitle,
        hasCurrentJob: user.hasCurrentJob,
        locale: user.locale,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Profil evolutiv (doar date vizibile, fără dialogInsights interne)
        evolution: user.profile
          ? {
              herrmannA: user.profile.herrmannA,
              herrmannB: user.profile.herrmannB,
              herrmannC: user.profile.herrmannC,
              herrmannD: user.profile.herrmannD,
              hawkinsEstimate: user.profile.hawkinsEstimate,
              viaSignature: user.profile.viaSignature,
              spiralLevel: user.profile.spiralLevel,
              spiralStage: user.profile.spiralStage,
            }
          : null,
      },

      cards: user.cards.map((c: any) => ({
        card: c.card,
        status: c.status,
        phase: c.phase,
        stage: c.stage,
        communityReady: c.communityReady,
        communityGrantedAt: c.communityGrantedAt,
        questionnaireData: c.questionnaireData,
        cvFileUrl: c.cvFileUrl,
        activatedAt: c.activatedAt,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
      })),

      journal: user.journalEntries.map((j: any) => ({
        card: j.card,
        promptText: j.promptText,
        content: j.content,
        suggestedMinutes: j.suggestedMinutes,
        actualMinutes: j.actualMinutes,
        status: j.status,
        createdAt: j.createdAt,
        writtenAt: j.writtenAt,
      })),

      conversations,

      tests: user.testResults.map((t: any) => ({
        testType: t.testType,
        testName: t.testName,
        source: t.source,
        rawScore: t.rawScore,
        normScore: t.normScore,
        administeredAt: t.administeredAt,
      })),

      evolution: user.evolutionLog.map((e: any) => ({
        card: e.card,
        type: e.type,
        title: e.title,
        description: e.description,
        phase: e.phase,
        stage: e.stage,
        createdAt: e.createdAt,
      })),

      communities: user.memberships.map((m: any) => ({
        communityName: m.community?.name,
        card: m.community?.card,
        role: m.role,
        joinedAt: m.joinedAt,
      })),

      credits: {
        balance: user.creditBalance?.balance ?? 0,
        transactions: user.creditTxns.map((tx: any) => ({
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          card: tx.card,
          createdAt: tx.createdAt,
        })),
      },
    }

    // ── Generate human-readable text summary ────────────────────────────

    const textSummary = generateTextSummary(exportData)

    return NextResponse.json({
      data: exportData,
      textSummary,
    })
  } catch (e: any) {
    console.error("[B2C My-Data GET] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la exportul datelor" },
      { status: 500 }
    )
  }
}

// ── Text summary generator ────────────────────────────────────────────────

function generateTextSummary(data: any): string {
  const lines: string[] = []

  lines.push("═══════════════════════════════════════════════════")
  lines.push("  EXPORT DATE PERSONALE — GDPR Art. 15")
  lines.push("  JobGrade B2C Platform")
  lines.push(`  Generat la: ${data.exportedAt}`)
  lines.push("═══════════════════════════════════════════════════")
  lines.push("")

  // Profile
  lines.push("── PROFIL ──────────────────────────────────────────")
  lines.push(`Alias: ${data.profile.alias}`)
  lines.push(`Email: ${data.profile.email}`)
  if (data.profile.age) lines.push(`Varsta: ${data.profile.age}`)
  if (data.profile.gender) lines.push(`Gen: ${data.profile.gender}`)
  if (data.profile.lastJobTitle) lines.push(`Ultimul job: ${data.profile.lastJobTitle}`)
  lines.push(`Limba: ${data.profile.locale}`)
  lines.push(`Status: ${data.profile.status}`)
  lines.push(`Cont creat: ${data.profile.createdAt}`)
  lines.push("")

  // Evolution profile
  if (data.profile.evolution) {
    lines.push("── PROFIL EVOLUTIV ─────────────────────────────────")
    const ev = data.profile.evolution
    if (ev.herrmannA != null) {
      lines.push(`Herrmann HBDI: A=${ev.herrmannA}, B=${ev.herrmannB}, C=${ev.herrmannC}, D=${ev.herrmannD}`)
    }
    if (ev.hawkinsEstimate != null) lines.push(`Hawkins (estimat): ${ev.hawkinsEstimate}`)
    if (ev.viaSignature?.length) lines.push(`VIA Signature Strengths: ${ev.viaSignature.join(", ")}`)
    lines.push(`Spirala: nivel ${ev.spiralLevel}, etapa ${ev.spiralStage}`)
    lines.push("")
  }

  // Cards
  if (data.cards.length > 0) {
    lines.push("── CARDURI ─────────────────────────────────────────")
    for (const c of data.cards) {
      lines.push(`  ${c.card}: ${c.status} (${c.phase}, etapa ${c.stage})`)
    }
    lines.push("")
  }

  // Journal
  if (data.journal.length > 0) {
    lines.push(`── JURNAL (${data.journal.length} intrari) ─────────────────────────`)
    for (const j of data.journal) {
      lines.push(`  [${j.createdAt}] Card ${j.card}: ${j.promptText.slice(0, 80)}...`)
      if (j.content) lines.push(`    Raspuns: ${j.content.slice(0, 100)}...`)
    }
    lines.push("")
  }

  // Conversations
  if (data.conversations.length > 0) {
    lines.push(`── CONVERSATII (${data.conversations.length} thread-uri) ───────────`)
    for (const conv of data.conversations) {
      lines.push(`  Thread: ${conv.title || conv.agentRole} (${conv.messages.length} mesaje)`)
      for (const m of conv.messages) {
        const preview = m.content.length > 120 ? m.content.slice(0, 120) + "..." : m.content
        lines.push(`    [${m.role}] ${preview}`)
      }
      lines.push("")
    }
  }

  // Tests
  if (data.tests.length > 0) {
    lines.push(`── TESTE (${data.tests.length}) ────────────────────────────────`)
    for (const t of data.tests) {
      lines.push(`  ${t.testName} (${t.testType}) — ${t.administeredAt}`)
      lines.push(`    Scor: ${JSON.stringify(t.rawScore)}`)
    }
    lines.push("")
  }

  // Evolution
  if (data.evolution.length > 0) {
    lines.push(`── TRASEU EVOLUTIV (${data.evolution.length} momente) ──────────`)
    for (const e of data.evolution) {
      lines.push(`  [${e.createdAt}] ${e.title} (${e.type}, Card ${e.card})`)
      if (e.description) lines.push(`    ${e.description.slice(0, 120)}`)
    }
    lines.push("")
  }

  // Communities
  if (data.communities.length > 0) {
    lines.push("── COMUNITATI ──────────────────────────────────────")
    for (const cm of data.communities) {
      lines.push(`  ${cm.communityName} (${cm.role}) — din ${cm.joinedAt}`)
    }
    lines.push("")
  }

  // Credits
  lines.push("── CREDITE ─────────────────────────────────────────")
  lines.push(`Sold curent: ${data.credits.balance}`)
  if (data.credits.transactions.length > 0) {
    lines.push(`Tranzactii: ${data.credits.transactions.length}`)
    for (const tx of data.credits.transactions.slice(0, 20)) {
      lines.push(`  [${tx.createdAt}] ${tx.type}: ${tx.amount > 0 ? "+" : ""}${tx.amount} — ${tx.description}`)
    }
  }
  lines.push("")

  lines.push("═══════════════════════════════════════════════════")
  lines.push("  Sfarsit export. Pentru intrebari: support@jobgrade.ro")
  lines.push("═══════════════════════════════════════════════════")

  return lines.join("\n")
}
