/**
 * talking-avatar.ts — Generare video Rareș vorbind (D-ID API)
 *
 * Input: text (script) sau audio URL
 * Output: video URL (Rareș vorbind cu lip-sync)
 *
 * Flux:
 * 1. Text → ElevenLabs TTS → audio
 * 2. Audio + avatar Rareș → D-ID → video lip-sync
 * 3. Video stocat sau servit direct
 *
 * Sau simplificat:
 * 1. Text → D-ID (are TTS integrat) → video direct
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TalkingAvatarRequest {
  /** Textul pe care Rareș îl va spune */
  script: string
  /** Varianta avatar (C1_B2B, C2_B2B, etc.) — default C2_B2B */
  avatarVariant?: string
  /** Voce ElevenLabs (voice ID) — sau D-ID built-in */
  voiceId?: string
  /** Limba */
  language?: "ro" | "en"
  /** Context: pentru ce card/proces e video-ul */
  context?: string
}

export interface TalkingAvatarResult {
  videoUrl: string
  duration: number
  status: "completed" | "processing" | "failed"
  talkId: string
  costMinutes: number
}

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const DID_API_URL = "https://api.d-id.com"

const AVATAR_URLS: Record<string, string> = {
  C1_B2B: "https://jobgrade.ro/guide/C1_B2B.png",
  C2_B2B: "https://jobgrade.ro/guide/C2_B2B.png",
  C3_B2B: "https://jobgrade.ro/guide/C3_B2B.png",
  C4_B2B: "https://jobgrade.ro/guide/C4_B2B.png",
  C1_B2C: "https://jobgrade.ro/guide/C1_B2C.png",
  C2_B2C: "https://jobgrade.ro/guide/C2_B2C.png",
  C3_B2C: "https://jobgrade.ro/guide/C3_B2C.png",
  C4_B2C: "https://jobgrade.ro/guide/C4_B2C.png",
  C5_B2C: "https://jobgrade.ro/guide/C5_B2C.png",
  C6_B2C: "https://jobgrade.ro/guide/C6_B2C.png",
  DEFAULT: "https://jobgrade.ro/guide/C2_B2B.png",
}

// ═══════════════════════════════════════════════════════════════
// D-ID API — Generare video
// ═══════════════════════════════════════════════════════════════

/**
 * Generează video cu Rareș vorbind textul dat.
 * Folosește D-ID Talks API cu ElevenLabs TTS.
 */
export async function generateTalkingAvatar(req: TalkingAvatarRequest): Promise<TalkingAvatarResult> {
  const apiKey = process.env.DID_API_KEY
  if (!apiKey) throw new Error("DID_API_KEY nu este configurat")

  const avatarUrl = AVATAR_URLS[req.avatarVariant || "DEFAULT"] || AVATAR_URLS.DEFAULT
  const voiceId = req.voiceId || process.env.ELEVENLABS_RARES_VOICE_ID || ""

  // Pas 1: Creare talk (D-ID procesează async)
  const createRes = await fetch(`${DID_API_URL}/talks`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: avatarUrl,
      script: {
        type: "text",
        input: req.script,
        provider: voiceId ? {
          type: "elevenlabs",
          voice_id: voiceId,
          voice_config: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        } : {
          type: "microsoft",
          voice_id: "ro-RO-EmilNeural", // Fallback: Microsoft TTS Romanian male
        },
      },
      config: {
        stitch: true, // Smooth transitions
        result_format: "mp4",
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}))
    throw new Error(`D-ID create talk failed: ${createRes.status} — ${err.description || err.message || "unknown"}`)
  }

  const createData = await createRes.json()
  const talkId = createData.id

  // Pas 2: Poll status până e gata (max 60s)
  let result: TalkingAvatarResult | null = null
  const maxAttempts = 30
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000)) // poll la 2s

    const statusRes = await fetch(`${DID_API_URL}/talks/${talkId}`, {
      headers: { "Authorization": `Basic ${apiKey}` },
    })

    if (!statusRes.ok) continue

    const statusData = await statusRes.json()

    if (statusData.status === "done") {
      result = {
        videoUrl: statusData.result_url,
        duration: statusData.duration || 0,
        status: "completed",
        talkId,
        costMinutes: Math.ceil((statusData.duration || 0) / 60),
      }
      break
    }

    if (statusData.status === "error") {
      throw new Error(`D-ID talk failed: ${statusData.error?.description || "unknown error"}`)
    }
  }

  if (!result) {
    return {
      videoUrl: "",
      duration: 0,
      status: "processing",
      talkId,
      costMinutes: 0,
    }
  }

  return result
}

/**
 * Generează video cu ElevenLabs direct (audio) + D-ID (lip-sync).
 * Mai mult control pe voce.
 */
export async function generateWithElevenLabsVoice(
  script: string,
  avatarVariant?: string
): Promise<TalkingAvatarResult> {
  const elevenLabsKey = process.env.ANTHROPIC_API_KEY // refolosim? Nu — trebuie ELEVENLABS_API_KEY
  const elKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_RARES_VOICE_ID

  if (!elKey || !voiceId) {
    // Fallback la D-ID cu TTS built-in
    return generateTalkingAvatar({ script, avatarVariant })
  }

  // Pas 1: ElevenLabs TTS → audio
  const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": elKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: script,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
      },
    }),
  })

  if (!ttsRes.ok) {
    throw new Error(`ElevenLabs TTS failed: ${ttsRes.status}`)
  }

  // Audio blob → upload temporar sau base64
  const audioBuffer = await ttsRes.arrayBuffer()
  const audioBase64 = Buffer.from(audioBuffer).toString("base64")
  const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`

  // Pas 2: D-ID cu audio custom
  const apiKey = process.env.DID_API_KEY
  if (!apiKey) throw new Error("DID_API_KEY nu este configurat")

  const avatarUrl = AVATAR_URLS[avatarVariant || "DEFAULT"] || AVATAR_URLS.DEFAULT

  const createRes = await fetch(`${DID_API_URL}/talks`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: avatarUrl,
      script: {
        type: "audio",
        audio_url: audioDataUri,
      },
      config: {
        stitch: true,
        result_format: "mp4",
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}))
    throw new Error(`D-ID create talk (audio) failed: ${createRes.status} — ${err.description || ""}`)
  }

  const createData = await createRes.json()
  const talkId = createData.id

  // Poll
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const statusRes = await fetch(`${DID_API_URL}/talks/${talkId}`, {
      headers: { "Authorization": `Basic ${apiKey}` },
    })
    if (!statusRes.ok) continue
    const statusData = await statusRes.json()
    if (statusData.status === "done") {
      return {
        videoUrl: statusData.result_url,
        duration: statusData.duration || 0,
        status: "completed",
        talkId,
        costMinutes: Math.ceil((statusData.duration || 0) / 60),
      }
    }
    if (statusData.status === "error") {
      throw new Error(`D-ID error: ${statusData.error?.description || ""}`)
    }
  }

  return { videoUrl: "", duration: 0, status: "processing", talkId, costMinutes: 0 }
}
