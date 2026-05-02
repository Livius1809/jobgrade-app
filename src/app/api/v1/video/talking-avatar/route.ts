/**
 * POST /api/v1/video/talking-avatar
 *
 * Generează video cu Rareș vorbind.
 * Body: { script: "text", avatarVariant?: "C2_B2B", voiceSource?: "elevenlabs"|"did" }
 *
 * Returnează URL video mp4.
 * Auth: internal key sau Owner.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { generateTalkingAvatar, generateWithElevenLabsVoice } from "@/lib/video/talking-avatar"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { script, avatarVariant, voiceSource } = body

  if (!script || typeof script !== "string" || script.length < 5) {
    return NextResponse.json({ error: "Script obligatoriu (minim 5 caractere)" }, { status: 400 })
  }

  if (script.length > 5000) {
    return NextResponse.json({ error: "Script prea lung (max 5000 caractere)" }, { status: 400 })
  }

  try {
    const result = voiceSource === "elevenlabs"
      ? await generateWithElevenLabsVoice(script, avatarVariant)
      : await generateTalkingAvatar({ script, avatarVariant })

    return NextResponse.json(result)
  } catch (e: any) {
    console.error("[TALKING-AVATAR]", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
