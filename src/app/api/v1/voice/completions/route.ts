import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk" // TODO: extend cpuCall for streaming — kept for streaming support
import { cpuCall } from "@/lib/cpu/gateway"
import { readFileSync } from "fs"
import { join } from "path"
import type { AgentRole } from "@/lib/chat/types"
import type { OpenAIChatCompletionRequest } from "@/lib/voice/types"

export const maxDuration = 60

// ── Constants ──────────────────────────────────────────────────────────────

const CLAUDE_MODEL = "claude-sonnet-4-20250514"
const VALID_AGENTS: AgentRole[] = ["soa", "cssa", "csa"]

// ── System prompt cache ────────────────────────────────────────────────────

const promptCache = new Map<string, string>()

function loadSystemPrompt(agentRole: AgentRole): string {
  const cached = promptCache.get(agentRole)
  if (cached) return cached

  try {
    const filepath = join(
      process.cwd(),
      "src",
      "lib",
      "agents",
      "system-prompts",
      `${agentRole}-system-prompt.md`
    )
    const content = readFileSync(filepath, "utf-8")
    promptCache.set(agentRole, content)
    return content
  } catch {
    console.warn(`[voice-proxy] Could not load system prompt for ${agentRole}`)
    return ""
  }
}

// ── Helper: generate unique completion ID ──────────────────────────────────

let completionCounter = 0
function generateCompletionId(): string {
  return `chatcmpl-voice-${Date.now()}-${++completionCounter}`
}

// ── Helper: format SSE chunk ───────────────────────────────────────────────

function formatSSEChunk(
  id: string,
  content: string | null,
  finishReason: string | null = null
): string {
  const chunk = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: CLAUDE_MODEL,
    choices: [
      {
        index: 0,
        delta: content !== null ? { content } : {},
        finish_reason: finishReason,
      },
    ],
  }
  return `data: ${JSON.stringify(chunk)}\n\n`
}

// ── POST /api/v1/voice/completions ─────────────────────────────────────────

/**
 * Claude-to-OpenAI proxy for ElevenLabs Conversational AI.
 *
 * ElevenLabs sends OpenAI-compatible chat completion requests.
 * We translate them to Anthropic API calls and stream back SSE
 * in OpenAI format.
 *
 * The `model` field is used to determine which agent role to use
 * (e.g., model="soa" routes to the SOA system prompt).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpenAIChatCompletionRequest
    const { model, messages, stream } = body

    // ── Determine agent role from model field ────────────────────────────
    const agentRole = (model?.toLowerCase() || "soa") as AgentRole
    if (!VALID_AGENTS.includes(agentRole)) {
      return NextResponse.json(
        { error: `Invalid model/agent: ${model}. Valid: ${VALID_AGENTS.join(", ")}` },
        { status: 400 }
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      )
    }

    // ── Separate system messages from conversation ───────────────────────
    const systemMessages = messages.filter((m) => m.role === "system")
    const conversationMessages = messages.filter((m) => m.role !== "system")

    // Build system prompt: our agent prompt + any ElevenLabs system instructions
    const agentSystemPrompt = loadSystemPrompt(agentRole)
    const elevenLabsSystem = systemMessages.map((m) => m.content).join("\n\n")

    const fullSystemPrompt = [
      agentSystemPrompt,
      elevenLabsSystem ? `\n--- INSTRUCȚIUNI ELEVENLABS ---\n${elevenLabsSystem}` : "",
      "",
      "IMPORTANT: Răspunzi VERBAL — ești într-o conversație vocală.",
      "- Folosește propoziții scurte și clare.",
      "- NU folosi formatare markdown, asteriscuri, sau caractere speciale.",
      "- NU folosi liste cu bullet points — enumeră natural.",
      "- Poți folosi tag-uri [ACTION:navigate:/path] — ele nu se citesc cu voce.",
      "- Limba principală: Română.",
    ]
      .filter(Boolean)
      .join("\n")

    // ── Convert to Anthropic message format ──────────────────────────────
    const anthropicMessages = conversationMessages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }))

    // Ensure messages alternate (Anthropic requirement)
    // If first message is assistant, prepend a user message
    if (anthropicMessages.length > 0 && anthropicMessages[0].role === "assistant") {
      anthropicMessages.unshift({
        role: "user",
        content: "(conversație vocală inițiată)",
      })
    }

    // ── Non-streaming fallback ───────────────────────────────────────────
    if (!stream) {
      const cpuResult = await cpuCall({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        system: fullSystemPrompt,
        messages: anthropicMessages,
        agentRole: "SOA",
        operationType: "voice-completion",
      })

      return NextResponse.json({
        id: generateCompletionId(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: CLAUDE_MODEL,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: cpuResult.text },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: cpuResult.tokensUsed,
        },
      })
    }

    // ── Streaming response ───────────────────────────────────────────────
    const completionId = generateCompletionId()
    const client = new Anthropic()

    const anthropicStream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      system: fullSystemPrompt,
      messages: anthropicMessages,
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial role chunk
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                id: completionId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: CLAUDE_MODEL,
                choices: [
                  {
                    index: 0,
                    delta: { role: "assistant" },
                    finish_reason: null,
                  },
                ],
              })}\n\n`
            )
          )

          // Stream text deltas
          anthropicStream.on("text", (text) => {
            controller.enqueue(
              encoder.encode(formatSSEChunk(completionId, text))
            )
          })

          // Wait for completion
          await anthropicStream.finalMessage()

          // Send finish chunk
          controller.enqueue(
            encoder.encode(formatSSEChunk(completionId, null, "stop"))
          )

          // Send [DONE]
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (err) {
          console.error("[voice-proxy] Stream error:", err)
          // Try to send an error message before closing
          try {
            controller.enqueue(
              encoder.encode(
                formatSSEChunk(
                  completionId,
                  "Scuzați, a apărut o eroare. Vă rog să reîncercați."
                )
              )
            )
            controller.enqueue(
              encoder.encode(formatSSEChunk(completionId, null, "stop"))
            )
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          } catch {
            // ignore — controller may already be closed
          }
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[voice-proxy] Error:", message)
    return NextResponse.json(
      { error: "Voice proxy error", details: message },
      { status: 500 }
    )
  }
}
