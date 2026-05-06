/**
 * pipeline.ts — MBook Pipeline Orchestrator
 *
 * Genereaza toate asset-urile pentru un Media Book:
 * - Content (din DB, via getMediaBookContent)
 * - PDF (HTML print-ready)
 * - Audio (ElevenLabs TTS per sectiune)
 * - Video (D-ID talking avatar pentru prima sectiune)
 *
 * Flux: Content → PDF → Audio → Video
 * ~185 RON/luna estimat vs. 3-10K productie umana.
 */

import {
  getMediaBookContent,
  getMediaBookByCode,
} from "@/lib/media-books"
import { generateMediaBookPDF } from "@/lib/media-books/pdf-generator"
import {
  generateSectionAudio,
  type AudioNarrationResult,
} from "@/lib/media-books/audio-engine"
import { generateTalkingAvatar } from "@/lib/video/talking-avatar"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PipelineResult {
  code: string
  content: { status: "ready" | "missing"; sectionCount: number }
  audio: {
    status: "generated" | "skipped" | "error"
    sections: string[]
    results?: AudioNarrationResult[]
    error?: string
  }
  video: {
    status: "generated" | "skipped" | "error" | "processing"
    talkId?: string
    videoUrl?: string
    error?: string
  }
  pdf: {
    status: "generated" | "skipped" | "error"
    html?: string
    error?: string
  }
}

export interface PipelineOptions {
  generateAudio?: boolean
  generateVideo?: boolean
  generatePdf?: boolean
  avatarVariant?: string
}

// ═══════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Ruleaza pipeline-ul complet de generare pentru un Media Book.
 *
 * @param code - Codul Media Book (ex: "MB-R1")
 * @param options - Ce asset-uri sa genereze (default: doar PDF)
 */
export async function runMediaBookPipeline(
  code: string,
  options?: PipelineOptions
): Promise<PipelineResult> {
  const {
    generateAudio = false,
    generateVideo = false,
    generatePdf = true,
    avatarVariant,
  } = options || {}

  const config = getMediaBookByCode(code)
  if (!config) {
    return {
      code,
      content: { status: "missing", sectionCount: 0 },
      audio: { status: "skipped", sections: [] },
      video: { status: "skipped" },
      pdf: { status: "skipped" },
    }
  }

  // ── 1. Fetch content ────────────────────────────────────────
  const data = await getMediaBookContent(code)
  if (!data) {
    return {
      code,
      content: { status: "missing", sectionCount: 0 },
      audio: { status: "skipped", sections: [] },
      video: { status: "skipped" },
      pdf: { status: "skipped" },
    }
  }

  const result: PipelineResult = {
    code,
    content: {
      status: "ready",
      sectionCount: data.sections.length,
    },
    audio: { status: "skipped", sections: [] },
    video: { status: "skipped" },
    pdf: { status: "skipped" },
  }

  // ── 2. PDF ──────────────────────────────────────────────────
  if (generatePdf) {
    try {
      const pdf = await generateMediaBookPDF(code)
      result.pdf = {
        status: "generated",
        html: pdf.html,
      }
    } catch (err) {
      result.pdf = {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ── 3. Audio (per sectiune) ─────────────────────────────────
  if (generateAudio) {
    try {
      const audioResults: AudioNarrationResult[] = []
      const sectionIds: string[] = []

      for (let i = 0; i < data.sections.length; i++) {
        const section = data.sections[i]
        const sectionId = `section-${i}`

        const audioResult = await generateSectionAudio(
          section.content,
          sectionId
        )

        audioResults.push(audioResult)
        if (audioResult.status === "generated") {
          sectionIds.push(sectionId)
        }
      }

      const hasErrors = audioResults.some((r) => r.status === "error")
      const hasGenerated = audioResults.some((r) => r.status === "generated")

      result.audio = {
        status: hasGenerated ? "generated" : hasErrors ? "error" : "skipped",
        sections: sectionIds,
        results: audioResults,
        error: hasErrors
          ? audioResults
              .filter((r) => r.status === "error")
              .map((r) => r.error)
              .join("; ")
          : undefined,
      }
    } catch (err) {
      result.audio = {
        status: "error",
        sections: [],
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ── 4. Video (prima sectiune ca script) ─────────────────────
  if (generateVideo) {
    try {
      // Folosim prima sectiune (sau continutul principal) ca script video
      const scriptText =
        data.sections[0]?.content?.slice(0, 5000) ||
        data.content.slice(0, 5000)

      const videoResult = await generateTalkingAvatar({
        script: scriptText,
        avatarVariant: avatarVariant || "C2_B2B",
        language: "ro",
        context: `Media Book ${code}`,
      })

      result.video = {
        status: videoResult.status === "completed" ? "generated" : videoResult.status === "processing" ? "processing" : "error",
        talkId: videoResult.talkId,
        videoUrl: videoResult.videoUrl || undefined,
      }
    } catch (err) {
      result.video = {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  return result
}
