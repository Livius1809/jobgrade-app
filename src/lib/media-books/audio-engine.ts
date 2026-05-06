/**
 * audio-engine.ts — Generare audio narration pentru Media Book sections
 *
 * Foloseste ElevenLabs TTS REST API (eleven_multilingual_v2).
 * Fallback graceful daca voice ID nu e configurat.
 */

export interface AudioNarrationResult {
  audioUrl: string
  durationSeconds: number
  sectionId: string
  status: "generated" | "voice_not_configured" | "error"
  error?: string
}

/**
 * Genereaza audio narration pentru o sectiune de Media Book.
 *
 * @param text - Textul de narrat (Markdown e OK, se curata automat)
 * @param sectionId - Identificator sectiune (ex: "section-0")
 * @param voiceId - Optional voice ID ElevenLabs; default din env
 */
export async function generateSectionAudio(
  text: string,
  sectionId: string,
  voiceId?: string
): Promise<AudioNarrationResult> {
  const resolvedVoiceId =
    voiceId ||
    process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_B2B ||
    process.env.ELEVENLABS_RARES_VOICE_ID ||
    ""

  if (!resolvedVoiceId) {
    return {
      audioUrl: "",
      durationSeconds: 0,
      sectionId,
      status: "voice_not_configured",
    }
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return {
      audioUrl: "",
      durationSeconds: 0,
      sectionId,
      status: "voice_not_configured",
      error: "ELEVENLABS_API_KEY nu este configurat",
    }
  }

  // Curatare Markdown minimala (headings, bold, links)
  const cleanText = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .trim()

  if (cleanText.length < 10) {
    return {
      audioUrl: "",
      durationSeconds: 0,
      sectionId,
      status: "error",
      error: "Text prea scurt pentru narare",
    }
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      }
    )

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      return {
        audioUrl: "",
        durationSeconds: 0,
        sectionId,
        status: "error",
        error: `ElevenLabs TTS failed: ${response.status} — ${errBody.slice(0, 200)}`,
      }
    }

    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString("base64")
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

    // Estimare durata: ~150 cuvinte/minut pentru vorbire romana
    const wordCount = cleanText.split(/\s+/).length
    const durationSeconds = Math.round((wordCount / 150) * 60)

    return {
      audioUrl,
      durationSeconds,
      sectionId,
      status: "generated",
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      audioUrl: "",
      durationSeconds: 0,
      sectionId,
      status: "error",
      error: message,
    }
  }
}
