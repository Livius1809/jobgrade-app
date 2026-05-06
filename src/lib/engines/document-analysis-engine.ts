/**
 * document-analysis-engine.ts — Motor analiză documente interne C3
 *
 * Pipeline AI pentru analiza documentelor organizaționale uploadate în C3.
 * Extrage teme cheie, gap-uri de conformitate, îmbunătățiri de proces
 * și alinierea cu MVV-ul companiei.
 *
 * Folosește cpuCall (gateway unic CPU) — NICIODATĂ apel direct Anthropic.
 */

import { cpuCall } from "@/lib/cpu/gateway"

// ── Tipuri ──────────────────────────────────────────────────────────────────

export interface ComplianceGap {
  area: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  detail: string
}

export interface MVVAlignment {
  aligned: string[]
  misaligned: string[]
}

export interface DocumentAnalysisResult {
  themes: string[]
  complianceGaps: ComplianceGap[]
  processImprovements: string[]
  mvvAlignment: MVVAlignment
  summary: string
}

export interface TenantContext {
  mission?: string
  values?: string[]
  industry?: string
}

// ── Constante ───────────────────────────────────────────────────────────────

const MAX_DOCUMENT_LENGTH = 80_000
const ANALYSIS_MAX_TOKENS = 4096

// ── Engine ──────────────────────────────────────────────────────────────────

/**
 * Analizează un document organizațional în contextul tenant-ului.
 *
 * @param documentText - Textul extras din documentul uploadat
 * @param tenantContext - Context organizațional (misiune, valori, industrie)
 * @param agentRole - Rolul agentului care solicită analiza (default: DOAS)
 */
export async function analyzeDocument(
  documentText: string,
  tenantContext: TenantContext,
  agentRole: string = "DOAS"
): Promise<DocumentAnalysisResult> {
  if (!documentText || documentText.trim().length === 0) {
    return emptyResult("Documentul nu conține text analizabil.")
  }

  // Trunchiază dacă depășește limita
  const truncated = documentText.length > MAX_DOCUMENT_LENGTH
    ? documentText.slice(0, MAX_DOCUMENT_LENGTH) + "\n[... document trunchiat la limita de analiză]"
    : documentText

  const contextBlock = buildContextBlock(tenantContext)

  const systemPrompt = `Ești un analist organizațional expert. Analizezi documente interne ale companiilor pentru a extrage informații structurate.

Răspunde EXCLUSIV în format JSON valid, fără explicații suplimentare.

Structura JSON cerută:
{
  "themes": ["tema1", "tema2", ...],
  "complianceGaps": [
    { "area": "zona", "severity": "LOW|MEDIUM|HIGH", "detail": "descriere" }
  ],
  "processImprovements": ["îmbunătățire1", "îmbunătățire2", ...],
  "mvvAlignment": {
    "aligned": ["element aliniat cu misiunea/valorile"],
    "misaligned": ["element nealiniat sau contradictoriu"]
  },
  "summary": "rezumat concis al documentului în 2-3 propoziții"
}

Reguli:
- themes: maxim 8 teme principale identificate
- complianceGaps: gap-uri reale de conformitate (legislație muncii RO, proceduri lipsă, riscuri)
- processImprovements: sugestii concrete și acționabile
- mvvAlignment: evaluează doar dacă există context MVV; altfel arrays goale
- severity: LOW = minor, MEDIUM = necesită atenție, HIGH = risc semnificativ
- Limba: română`

  const userMessage = `${contextBlock}

DOCUMENT DE ANALIZAT:
---
${truncated}
---

Analizează documentul și returnează JSON-ul structurat.`

  const result = await cpuCall({
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: ANALYSIS_MAX_TOKENS,
    agentRole,
    operationType: "document-analysis",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0.2,
  })

  if (result.degraded) {
    return emptyResult("Analiza nu este disponibilă momentan. Reîncearcă în câteva minute.")
  }

  return parseAnalysisResponse(result.text)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildContextBlock(ctx: TenantContext): string {
  const parts: string[] = ["CONTEXT ORGANIZAȚIONAL:"]

  if (ctx.industry) {
    parts.push(`- Industrie: ${ctx.industry}`)
  }
  if (ctx.mission) {
    parts.push(`- Misiune: ${ctx.mission}`)
  }
  if (ctx.values && ctx.values.length > 0) {
    parts.push(`- Valori: ${ctx.values.join(", ")}`)
  }

  return parts.length > 1 ? parts.join("\n") : "CONTEXT ORGANIZAȚIONAL: nedisponibil"
}

function parseAnalysisResponse(text: string): DocumentAnalysisResult {
  try {
    // Extrage JSON din răspuns (poate fi wrapat în markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return emptyResult("Răspunsul AI nu conține JSON valid.")
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      themes: Array.isArray(parsed.themes) ? parsed.themes.map(String) : [],
      complianceGaps: Array.isArray(parsed.complianceGaps)
        ? parsed.complianceGaps.map((g: Record<string, unknown>) => ({
            area: String(g.area ?? ""),
            severity: validateSeverity(g.severity),
            detail: String(g.detail ?? ""),
          }))
        : [],
      processImprovements: Array.isArray(parsed.processImprovements)
        ? parsed.processImprovements.map(String)
        : [],
      mvvAlignment: {
        aligned: Array.isArray(parsed.mvvAlignment?.aligned)
          ? parsed.mvvAlignment.aligned.map(String)
          : [],
        misaligned: Array.isArray(parsed.mvvAlignment?.misaligned)
          ? parsed.mvvAlignment.misaligned.map(String)
          : [],
      },
      summary: String(parsed.summary ?? ""),
    }
  } catch {
    return emptyResult("Eroare la parsarea răspunsului AI.")
  }
}

function validateSeverity(val: unknown): "LOW" | "MEDIUM" | "HIGH" {
  const s = String(val).toUpperCase()
  if (s === "LOW" || s === "MEDIUM" || s === "HIGH") return s
  return "LOW"
}

function emptyResult(summary: string): DocumentAnalysisResult {
  return {
    themes: [],
    complianceGaps: [],
    processImprovements: [],
    mvvAlignment: { aligned: [], misaligned: [] },
    summary,
  }
}
