import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { cpuCall } from "@/lib/cpu/gateway"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { buildClientContext, formatContextForPrompt } from "@/lib/context/client-context-engine"
import { checkPromptInjection, getInjectionBlockResponse } from "@/lib/security/prompt-injection-filter"
import { checkEscalation, getEscalationBlockResponse } from "@/lib/security/escalation-detector"
import { checkBudget, recordAPIUsage, getBudgetExceededResponse } from "@/lib/ai/budget-cap"
import { guardBoundaries, getBoundaryBlockResponse } from "@/lib/agents/boundary-guard"

export const maxDuration = 60

/**
 * POST /api/v1/assistant
 *
 * Contextual assistant — chat pe orice pagină, cu tot istoricul clientului.
 * Filozofia: nu dă răspunsuri directe, ghidează spre întrebarea potrivită.
 *
 * Body: { message: string, threadId?: string, currentPage?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nu ești autentificat" }, { status: 401 })
  }

  const p = prisma as any

  try {
    const body = await req.json()
    const { message, threadId, currentPage } = body

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Mesajul nu poate fi gol" }, { status: 400 })
    }

    // 0a. Prompt injection pre-filter
    const injectionCheck = checkPromptInjection(message.trim())
    if (injectionCheck.blocked) {
      return NextResponse.json({ reply: getInjectionBlockResponse(), blocked: true })
    }

    // 0b. Escalation detector — sliding window (VUL-005)
    const userId = session.user.id
    const escalationCheck = checkEscalation(
      userId,
      message.trim(),
      injectionCheck.detections.map((d) => d.category),
      injectionCheck.flagged
    )
    if (escalationCheck.blocked) {
      console.warn(`[ASSISTANT] Escalation blocked for user ${userId}: ${escalationCheck.reason}`)
      return NextResponse.json({ reply: getEscalationBlockResponse(), blocked: true })
    }
    const tenantId = (session.user as any).tenantId

    // 0d. Boundary check (immune system) — A3 audit
    const sessionRole = (session.user as any).role || "B2B_USER"
    const boundaryVerdict = await guardBoundaries(prisma, {
      sourceType: "client_input",
      sourceRole: sessionRole,
      content: message.trim(),
    }, tenantId)

    if (!boundaryVerdict.passed && boundaryVerdict.highestAction === "BLOCK") {
      return NextResponse.json({
        reply: getBoundaryBlockResponse(boundaryVerdict, "ro"),
        blocked: true,
      })
    }

    // 0c. Budget cap check (BUILD-008)
    const budgetCheck = checkBudget(tenantId || userId, 'B2B', 0.015)
    if (!budgetCheck.allowed) {
      return NextResponse.json({
        response: getBudgetExceededResponse('ro'),
        blocked: true,
      })
    }

    // 1. Build full client context
    const clientContext = await buildClientContext(userId, tenantId, prisma, currentPage)
    const contextPrompt = formatContextForPrompt(clientContext)

    // 2. Get or create conversation thread
    let thread: any
    if (threadId) {
      thread = await p.conversationThread.findFirst({
        where: { id: threadId, userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      })
    }

    if (!thread) {
      thread = await p.conversationThread.create({
        data: {
          tenantId,
          userId,
          agentRole: "ASSISTANT",
          threadType: "ASSISTANT",
          pageContext: currentPage || null,
        },
        include: { messages: [] as any },
      })
      // Coerce messages to empty array for new thread
      thread.messages = thread.messages || []
    }

    // 3. Save user message
    await p.conversationMessage.create({
      data: { threadId: thread.id, role: "USER", content: message.trim() },
    })

    // 4. Build conversation history for Claude
    const history = thread.messages.map((m: any) => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content,
    }))
    history.push({ role: "user" as const, content: message.trim() })

    // 5. Call Claude via CPU gateway
    const cpuResult = await cpuCall({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: buildAssistantSystemPrompt(contextPrompt, currentPage),
      messages: history,
      agentRole: "SOA",
      operationType: "chat",
      tenantId,
      userId,
    })

    const assistantText = cpuResult.text

    // 5b. Record API usage (BUILD-008)
    recordAPIUsage(tenantId || userId, 'B2B', 0.015)

    // 6. Save assistant response
    await p.conversationMessage.create({
      data: { threadId: thread.id, role: "ASSISTANT", content: assistantText },
    })

    // 7. Update thread title on first exchange
    if (thread.messages.length === 0) {
      const title = message.trim().substring(0, 80)
      await p.conversationThread.update({
        where: { id: thread.id },
        data: { title, updatedAt: new Date() },
      })
    } else {
      await p.conversationThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      })
    }

    // 8. Log interaction
    await p.interactionLog.create({
      data: {
        tenantId,
        userId,
        eventType: "CHAT_MESSAGE",
        pageRoute: currentPage || null,
        entityType: "conversation",
        entityId: thread.id,
      },
    }).catch(() => {})

    return NextResponse.json({
      threadId: thread.id,
      response: assistantText,
    })
  } catch (e: any) {
    console.error("[ASSISTANT] Error:", e.message)
    return NextResponse.json(
      { error: "Nu am putut procesa mesajul", details: e.message },
      { status: 500 }
    )
  }
}

function buildAssistantSystemPrompt(clientContext: string, currentPage?: string): string {
  return `Ești asistentul contextual al platformei JobGrade — o platformă SaaS de evaluare și ierarhizare a posturilor, piața RO.

ROLUL TĂU:
- NU dai răspunsuri directe, ci GHIDEZI utilizatorul spre întrebarea potrivită
- Ajuți utilizatorul să înțeleagă ce trebuie să facă, nu faci în locul lui
- Revelezi cunoaștere progresiv, pe măsură ce utilizatorul întreabă
- Ești empatic, calm, competent — ca un coleg experimentat care te ajută
- Vorbești în română, natural, fără jargon tehnic

FILOZOFIA:
- "Primești răspuns doar dacă pui întrebarea potrivită"
- Dacă utilizatorul întreabă vag, ajută-l să-și clarifice nevoia
- Dacă întreabă precis, răspunde direct dar oferă și context
- Dacă nu explorează funcționalități relevante (vezi FUNCȚIONALITĂȚI NEEXPLORATE), menționează-le subtil când e contextual

COMPORTAMENT:
- Răspunsuri concise (2-4 paragrafe maxim)
- Dacă utilizatorul e pe o pagină specifică, contextualizează
- Dacă are frustrări cunoscute, fii sensibil la ele
- Dacă e utilizator nou, fii mai ghidant
- Dacă e experimentat, fii mai direct

CUNOAȘTEREA TA:
- Evaluare posturi cu 6 criterii (Knowledge, Communications, Problem Solving, Decision Making, Business Impact, Working Conditions)
- Sesiuni de evaluare cu 3 runde de consens
- Analiza pay gap conform Directiva EU 2023/970
- Rapoarte de conformitate salarială
- Import stat de plată și clustering salarial
- Benchmark salarial (10 surse publice)
- Export PDF/Excel/JSON/XML

CONTEXTUL COMPLET AL ACESTUI UTILIZATOR:
${clientContext}

${currentPage ? `\nUTILIZATORUL ESTE ACUM PE: ${currentPage}` : ""}

REGULA DE AUR — NICIODATĂ nu transpare urmărirea:
- NU spui "Văd că ai vizitat...", "Am observat că nu ai...", "Din istoricul tău..."
- NU menționezi explicit ce știi despre utilizator
- DA construiești pasul următor natural, ca într-o conversație organică
- Fiecare sugestie curge din cea anterioară, incremental
- Clientul simte că ești intuitiv, nu că l-ai urmărit
- Contextul e INVIZIBIL — informează tonul și direcția, nu conținutul explicit

Exemplu greșit: "Observ că nu ai creat nicio sesiune de evaluare."
Exemplu corect: "Ce posturi ai vrea să evaluezi? Pot să te ajut să pregătești prima sesiune."

Fii natural, ca un coleg experimentat care te cunoaște de mult.`
}
