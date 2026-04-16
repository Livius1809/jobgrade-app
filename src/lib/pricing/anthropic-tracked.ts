/**
 * anthropic-tracked.ts — wrapper Anthropic SDK cu telemetry automată
 *
 * Înlocuiește utilizarea directă a Anthropic în cod (acolo unde vrem
 * să măsurăm cost). Capturează automat:
 *  - tokens input/output
 *  - modelul folosit
 *  - timp execuție
 * Apoi loghează în service_usage_logs.
 *
 * USAGE:
 *   import { trackedAnthropic } from "@/lib/pricing/anthropic-tracked"
 *   const result = await trackedAnthropic.messages.create({
 *     model: "claude-haiku-4-5-20251001",
 *     messages: [...],
 *     max_tokens: 1000,
 *   }, {
 *     tenantId,
 *     userId,
 *     serviceCode: "consultant-hr-chat",
 *     operationType: "intent-classification",
 *     executionId: chatSessionId,
 *   })
 */

import Anthropic from "@anthropic-ai/sdk"
import type { MessageCreateParams, Message } from "@anthropic-ai/sdk/resources/messages"
import { logServiceUsage } from "./usage-logger"

const client = new Anthropic()

export interface TrackingContext {
  tenantId: string
  userId?: string | null
  serviceCode: string
  operationType?: string | null
  executionId?: string | null
  metadata?: Record<string, unknown>
}

export const trackedAnthropic = {
  messages: {
    /**
     * Creează un mesaj Anthropic cu telemetry automată.
     * Returnează atât răspunsul AI cât și ID-ul log-ului creat.
     */
    create: async (
      params: MessageCreateParams,
      context: TrackingContext
    ): Promise<{ response: Message; usageLogId: string }> => {
      const startMs = Date.now()
      const response = await client.messages.create(params)

      // Anthropic returnează response.usage cu { input_tokens, output_tokens }
      // Cast pentru a evita stream type
      const m = response as Message
      const usage = m.usage

      const usageLogId = await logServiceUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        serviceCode: context.serviceCode,
        operationType: context.operationType,
        executionId: context.executionId,
        usage: {
          modelUsed: typeof params.model === "string" ? params.model : undefined,
          tokensInput: usage?.input_tokens ?? 0,
          tokensOutput: usage?.output_tokens ?? 0,
          computeMs: Date.now() - startMs,
        },
        metadata: context.metadata,
      })

      return { response: m, usageLogId }
    },
  },
}
