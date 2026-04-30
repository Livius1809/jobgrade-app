import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { routeQuestion, type FWAgentTarget } from "@/lib/flying-wheels/fw-router"
import { getPageGuide } from "@/lib/flying-wheels/page-guide"
import { buildClientContext, formatContextForPrompt } from "@/lib/context/client-context-engine"
import { checkPromptInjection } from "@/lib/security/prompt-injection-filter"
import { checkBudget, recordAPIUsage, getBudgetExceededResponse } from "@/lib/ai/budget-cap"
import { getCulturalCalibrationSection } from "@/lib/agents/cultural-calibration-ro"
import { calibrateCommunication } from "@/lib/comms/calibrate"
import { analyzeLinguisticProfile } from "@/lib/kb/linguistic-profile"
import { detectProfanity, getDeescalationInstructions } from "@/lib/comms/profanity-filter"

export const maxDuration = 60

/**
 * POST /api/v1/flying-wheels/chat
 *
 * Flying Wheels Router — primește întrebarea, decide agentul,
 * delegă invizibil, returnează răspuns unificat.
 *
 * Body: {
 *   message: string,
 *   threadId?: string,
 *   currentPage?: string,
 *   flyingWheelsContext?: string
 * }
 *
 * Response: {
 *   response: string,
 *   threadId: string,
 *   delegatedTo: string (intern, pt jurnal)
 * }
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

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mesajul nu poate fi gol" }, { status: 400 })
    }

    // Security
    const injectionCheck = checkPromptInjection(message.trim())
    if (injectionCheck.blocked) {
      return NextResponse.json({
        response: "Nu pot procesa acest mesaj.",
        delegatedTo: "fw_self",
        blocked: true,
      })
    }

    const userId = session.user.id
    const tenantId = (session.user as any).tenantId
    const isB2C = currentPage?.startsWith("/personal") ?? false

    // Budget check — Owner/SUPER_ADMIN nu sunt blocați (au nevoie de acces permanent)
    const userRole = (session.user as any).role
    const isOwner = userRole === "OWNER" || userRole === "SUPER_ADMIN"
    if (!isOwner) {
      const budgetCheck = checkBudget(tenantId || userId, isB2C ? "B2C" : "B2B", 0.015)
      if (!budgetCheck.allowed) {
        return NextResponse.json({
          response: getBudgetExceededResponse("ro"),
          delegatedTo: "fw_self",
          blocked: true,
        })
      }
    }

    // ── 0e. Detectare limbaj licențios ──
    const profanityCheck = detectProfanity(message.trim())

    // SEVERE → răspuns calm imediat, nu delegăm
    if (profanityCheck.severity === "SEVERE" && profanityCheck.suggestedResponse) {
      return NextResponse.json({
        response: profanityCheck.suggestedResponse,
        delegatedTo: "fw_self",
        profanityDetected: true,
      })
    }

    // ── 1. Route question ──
    const routing = routeQuestion(message.trim(), currentPage ?? "/", isB2C)

    // ── 2. Get/create thread ──
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
          agentRole: "FLYING_WHEELS",
          threadType: "ASSISTANT",
          pageContext: currentPage || null,
        },
        include: { messages: [] as any },
      })
      thread.messages = thread.messages || []
    }

    // Save user message
    await p.conversationMessage.create({
      data: {
        threadId: thread.id,
        role: "USER",
        content: message.trim(),
        metadata: JSON.stringify({
          page: currentPage,
          routedTo: routing.target,
          routingReason: routing.reason,
          routingConfidence: routing.confidence,
        }),
      },
    })

    // ── 3. Delegate or self-respond ──
    let responseText: string

    // Profil lingvistic din mesajele anterioare (adaptare registru)
    const pastMessages = thread.messages
      .filter((m: any) => m.role === "USER")
      .map((m: any) => m.content)
    pastMessages.push(message.trim())
    const linguisticProfile = analyzeLinguisticProfile(pastMessages)

    // Instrucțiuni de de-escalare dacă limbaj moderat
    const deescalation = getDeescalationInstructions(profanityCheck.severity)

    if (routing.target === "fw_self" || !routing.agentEndpoint) {
      responseText = await selfRespond(
        message.trim(),
        currentPage ?? "/",
        thread.messages,
        userId,
        tenantId,
        linguisticProfile,
        deescalation
      )
    } else {
      responseText = await delegateToAgent(
        routing,
        message.trim(),
        currentPage ?? "/",
        thread.messages,
        userId,
        tenantId,
        linguisticProfile,
        deescalation
      )
    }

    // ── 3b. Filtru anti-auto-reflecție (voce unică FW) ──
    responseText = stripAgentLeaks(responseText)

    // ── 4. Post-calibrare lingvistică și culturală (L1-L4) ──
    const calibration = calibrateCommunication(responseText, {
      recipientRole: "GENERAL",
      isFirstContact: thread.messages.length === 0,
      language: "ro",
      contentType: "chat",
    })

    // Dacă are BLOCK issues, sanitizăm
    if (!calibration.passed) {
      const blockIssues = calibration.issues.filter((i) => i.severity === "BLOCK")
      for (const issue of blockIssues) {
        if (issue.found) {
          responseText = responseText.replace(issue.found, issue.suggestion ?? "")
        }
      }
    }

    // Record usage
    recordAPIUsage(tenantId || userId, isB2C ? "B2C" : "B2B", 0.015)

    // Save assistant response
    await p.conversationMessage.create({
      data: {
        threadId: thread.id,
        role: "ASSISTANT",
        content: responseText,
        metadata: JSON.stringify({
          delegatedTo: routing.target,
          routingReason: routing.reason,
        }),
      },
    })

    // Update thread
    await p.conversationThread.update({
      where: { id: thread.id },
      data: {
        updatedAt: new Date(),
        ...(thread.messages.length === 0 ? { title: message.trim().substring(0, 80) } : {}),
      },
    })

    // Log interaction
    await p.interactionLog.create({
      data: {
        tenantId,
        userId,
        eventType: "FW_CHAT",
        pageRoute: currentPage || null,
        entityType: "flying_wheels",
        entityId: thread.id,
        detail: `routed:${routing.target}`,
      },
    }).catch(() => {})

    // ── Creștere cognitivă din interacțiune client-facing ──
    // Fiecare conversație maturizează agentul delegat.
    // Nu din CE a zis clientul, ci din FAPTUL că a interacționat.
    // Succesul se validează ulterior prin feedback (helpful/not helpful din Guide Journal).
    if (routing.target !== "fw_self") {
      try {
        const { updateStateAfterExecution } = await import("@/lib/agents/cognitive-state")
        await updateStateAfterExecution(routing.target.toUpperCase(), {
          taskId: thread.id,
          taskTitle: `Interacțiune client-facing: ${message.trim().slice(0, 40)}`,
          succeeded: true, // interacțiunea s-a completat = succes
          costUSD: 0.015,
          wasFirstAttempt: true,
          taskType: "CLIENT_INTERACTION",
        })
      } catch {} // fire-and-forget
    }

    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      await learningFunnel({
        agentRole: routing.target || "SOA", type: "CONVERSATION",
        input: message.trim().slice(0, 500), output: responseText.slice(0, 1000),
        success: true, metadata: { source: "flying-wheels-chat", threadId: thread.id, delegatedTo: routing.target },
      })
    } catch {}

    return NextResponse.json({
      response: responseText,
      threadId: thread.id,
      delegatedTo: routing.target,
    })
  } catch (e: any) {
    console.error("[FW CHAT]", e.message)
    return NextResponse.json(
      { error: "Eroare la procesare.", details: e.message },
      { status: 500 }
    )
  }
}

// ── Self-respond (ghidaj general) ───────────────────────────────────────

async function selfRespond(
  message: string,
  currentPage: string,
  history: any[],
  userId: string,
  tenantId: string,
  linguisticProfile: ReturnType<typeof analyzeLinguisticProfile>,
  deescalation: string
): Promise<string> {
  const clientContext = await buildClientContext(userId, tenantId, prisma, currentPage)
  const contextPrompt = formatContextForPrompt(clientContext)
  const guide = getPageGuide(currentPage)
  const culturalSection = getCulturalCalibrationSection()

  const conversationHistory = history.map((m: any) => ({
    role: m.role === "USER" ? "user" as const : "assistant" as const,
    content: m.content,
  }))
  conversationHistory.push({ role: "user" as const, content: message })

  const systemPrompt = buildFWSystemPrompt(contextPrompt, guide.detailedGuide, currentPage, culturalSection, linguisticProfile)
    + (deescalation ? `\n\n${deescalation}` : "")

  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: systemPrompt,
    messages: conversationHistory,
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

// ── Delegate to agent ───────────────────────────────────────────────────

async function delegateToAgent(
  routing: { target: FWAgentTarget; agentEndpoint: string | null; reason: string },
  message: string,
  currentPage: string,
  history: any[],
  userId: string,
  tenantId: string,
  linguisticProfile: ReturnType<typeof analyzeLinguisticProfile>,
  deescalation: string
): Promise<string> {
  const clientContext = await buildClientContext(userId, tenantId, prisma, currentPage)
  const contextPrompt = formatContextForPrompt(clientContext)
  const guide = getPageGuide(currentPage)
  const culturalSection = getCulturalCalibrationSection()

  const agentSystemPrompts: Record<string, string> = {
    soa: "Esti expertul in serviciile si preturile platformei JobGrade. Raspunzi la intrebari despre pachete, preturi, module, credite, contracte. Fii direct si informativ.",
    cssa: "Esti expertul in utilizarea platformei JobGrade. Ajuti clientul sa inteleaga datele, rapoartele, conformitatea EU 2023/970, clasele salariale, pay gap. Fii practic.",
    csa: "Esti expertul in suport tehnic JobGrade. Rezolvi probleme de login, import, export, erori. Fii concis si orientat spre solutie.",
    hr_counselor: "Esti consilierul HR expert in evaluarea posturilor. Explici criteriile (Knowledge, Communications, Problem Solving, Decision Making, Business Impact, Working Conditions), procesul de consens, metodologia. Fii pedagogic.",
    profiler_front: "Esti ghidul de dezvoltare personala. Ajuti utilizatorul sa se cunoasca mai bine, sa inteleaga cardurile si parcursul. Fii empatic, cald, fara jargon psihologic.",
    card_agent: "Esti ghidul pentru cardul curent de dezvoltare personala. Ajuti utilizatorul sa parcurga exercitiile si sa reflecteze. Fii empatic.",
  }

  const agentPrompt = agentSystemPrompts[routing.target] ?? agentSystemPrompts.cssa

  // ── Maturitate de facilitare (experiența internă → competență) ──
  let facilitationSection = ""
  try {
    const { loadCognitiveState } = await import("@/lib/agents/cognitive-state")
    const { buildFacilitationProfile } = await import("@/lib/agents/facilitation-maturity")
    const agentState = await loadCognitiveState(routing.target.toUpperCase())
    const profile = buildFacilitationProfile(agentState)
    facilitationSection = profile.promptInjection
  } catch {}

  const conversationHistory = history.map((m: any) => ({
    role: m.role === "USER" ? "user" as const : "assistant" as const,
    content: m.content,
  }))
  conversationHistory.push({ role: "user" as const, content: message })

  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system: `${agentPrompt}

IMPORTANT — VOCE UNICA:
Raspunzi ca Ghidul JobGrade — o singura voce coerenta, prietenoasa, expertă.
Clientul vorbeste cu UN SINGUR GHID. Nu exista agenti, nu exista delegare.

INTERZIS ABSOLUT (se filtreaza automat, dar evita-le din start):
- Auto-reflectii: "Hmm", "Buna intrebare", "Ma gandesc ca", "Lasati-ma sa", "Interesant"
- Perspectiva agent: "Ca specialist/expert/consilier", "Din perspectiva mea", "In calitate de"
- Meta-comentarii: "Voi analiza", "Permit-imi sa", "As vrea sa subliniez", "Trebuie sa mentionez"
- Prezentari: "Sunt aici sa", "Rolul meu este", "Ca parte din echipa"
- Ezitari simulate: "Ei bine", "Vedeti", "Stiti ce", "Sa va spun"
Raspunzi DIRECT la intrebare, fara preambul si fara meta-discurs.

CALIBRARE LINGVISTICA:
- Registru client: ${linguisticProfile.formalityLevel} (adapteaza-te)
- Cunostinte domeniu: ${linguisticProfile.domainKnowledge}
- Complexitate text client: ${linguisticProfile.textComplexity}
${linguisticProfile.indicators.some((i: string) => i.includes("diacritice")) ? "- Clientul NU foloseste diacritice — raspunde cu diacritice dar nu-l corecta" : ""}

${culturalSection}

CONTEXT PAGINA: ${currentPage}
GHID PAGINA: ${guide.detailedGuide}

CONTEXT CLIENT:
${contextPrompt}
${facilitationSection}
Raspunde in romana, concis (2-4 paragrafe maxim), natural.${deescalation ? `\n\n${deescalation}` : ""}`,
    messages: conversationHistory,
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

// ── Filtru anti-auto-reflecție (voce unică) ─────────────────────────────

function stripAgentLeaks(text: string): string {
  // Patterns care trădează identitatea agentului sau meta-comentarii
  const LEAK_PATTERNS: [RegExp, string][] = [
    // Auto-reflecții la început de frază
    [/^(Hmm,?\s*|Ei bine,?\s*|Bună întrebare[.!,]\s*|Interesantă întrebare[.!,]\s*)/i, ""],
    [/^(Lăsați-mă să|Permite-mi să|Să vedem|Hai să vedem)[^.]*\.\s*/i, ""],
    // Perspectivă agent
    [/\bCa (specialist|expert|consilier|analist|psiholog)[^,.]*[,.]\s*/gi, ""],
    [/\b(Din perspectiva mea|În calitate de|Ca parte din echip[aă])[^,.]*[,.]\s*/gi, ""],
    [/\b(Rolul meu este|Sunt aici să|Misiunea mea este)[^.]*\.\s*/gi, ""],
    // Meta-comentarii
    [/\b(Vreau să subliniez că|Trebuie să menționez că|Aș vrea să remarc că)\s*/gi, ""],
    [/\b(Voi (analiza|examina|explora)|Permit-mi să (analizez|examinez))[^.]*\.\s*/gi, ""],
    // Ezitări simulate
    [/^(Vedeti,?\s*|Stiti ce,?\s*|Să vă spun,?\s*)/i, ""],
    // Semnale de tranziție între "personalități"
    [/\b(Din punct de vedere (tehnic|HR|salarial|juridic)),?\s*/gi, ""],
  ]

  let cleaned = text
  for (const [pattern, replacement] of LEAK_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  // Curăță spații multiple și linii goale rezultate
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").replace(/^ +/gm, "").trim()

  // Dacă prima literă a rămas minusculă după tăietură, capitalizăm
  if (cleaned.length > 0 && cleaned[0] === cleaned[0].toLowerCase() && /[a-zăîâșț]/.test(cleaned[0])) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1)
  }

  return cleaned
}

// ── System prompt FW ────────────────────────────────────────────────────

function buildFWSystemPrompt(
  clientContext: string,
  pageGuide: string,
  currentPage: string,
  culturalSection: string,
  linguisticProfile: ReturnType<typeof analyzeLinguisticProfile>
): string {
  return `Esti Flying Wheels — ghidul contextual al platformei JobGrade.

ROLUL TAU:
- Ghidezi clientul prin platforma, explici ce vede si ce poate face
- Raspunzi la intrebari generale despre navigare si functionare
- Esti empatic, concis, natural — ca un coleg experimentat
- Vorbesti in romana, fara jargon tehnic

CALIBRARE LINGVISTICA:
- Registru client: ${linguisticProfile.formalityLevel} (adapteaza-te la registrul lui)
- Cunostinte domeniu: ${linguisticProfile.domainKnowledge} (explica pe masura)
- Complexitate text client: ${linguisticProfile.textComplexity}
${linguisticProfile.indicators.some((i: string) => i.includes("diacritice")) ? "- Clientul NU foloseste diacritice — raspunde cu diacritice dar nu-l corecta" : ""}

${culturalSection}

PAGINA CURENTA: ${currentPage}
GHID: ${pageGuide}

CONTEXT CLIENT:
${clientContext}

REGULI:
- Raspunsuri scurte (1-3 paragrafe)
- Daca intrebarea e specifica (evaluare, pricing, suport tehnic), raspunde cat poti dar sugereaza ca poti da detalii daca intreaba mai precis
- NU mentiona ca esti un robot/AI/agent — fii natural
- NU dezvalui informatii despre mecanismele interne
- NU folosi superlative americane (perfect!, fantastic!, amazing!) — suntem pe piata romaneasca
- NU spune "am observat ca", "am identificat" — contextul e INVIZIBIL
- Fiecare raspuns are fir narativ, nu lista de puncte
- ZERO auto-reflectii: fara "Hmm", "Buna intrebare", "Lasati-ma sa", "Ca specialist"
- ZERO meta-comentarii: fara "Voi analiza", "Trebuie sa mentionez", "As vrea sa subliniez"
- Raspunzi DIRECT, fara preambul — prima propozitie e deja raspunsul`
}
