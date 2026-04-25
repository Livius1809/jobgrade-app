/**
 * KB Document Ingestion Pipeline — „Pâlnia de cunoaștere"
 *
 * Primește orice document (PDF, DOCX, text brut) și:
 *  1. Extrage textul
 *  2. Împarte în chunk-uri procesabile
 *  3. Claude extrage cunoaștere declarativă + procedurală per chunk
 *  4. Rutează automat pe consultanții L2 relevanți
 *  5. Generează tag-uri din conținut
 *  6. Creează KB entries (status: PERMANENT, source: EXPERT_HUMAN)
 *
 * Surse acceptate:
 *  - Cărți (PDF)
 *  - Cursuri tipărite (PDF scanat → text extras)
 *  - Documente Word (DOCX/DOC)
 *  - Text brut (paste direct)
 *
 * Apelat de:
 *  - Owner Dashboard (upload)
 *  - API direct (POST /api/v1/kb/ingest)
 *  - n8n workflow (async pentru documente mari)
 */

import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

// ── Tipuri ──────────────────────────────────────────────────

export interface IngestDocumentInput {
  /** Textul brut al documentului (dacă deja extras) */
  rawText?: string
  /** Buffer-ul fișierului (PDF/DOCX) */
  fileBuffer?: Buffer
  /** Extensia fișierului (.pdf, .docx, .doc) */
  fileExtension?: string
  /** Titlul sursei (ex: "Creativitate și Inteligență Emoțională") */
  sourceTitle: string
  /** Autorul sursei */
  sourceAuthor: string
  /** Tipul sursei */
  sourceType: "carte" | "curs" | "articol" | "manual" | "politica" | "alt-document"
  /** Domeniu principal (hint pentru rutare) */
  domain?: string
  /** Dry run — nu scrie în DB, doar returnează ce ar crea */
  dryRun?: boolean
  /** Chunk size (default 3000 chars) */
  chunkSize?: number
  /**
   * Referință bibliografică (fără document atașat).
   * Dacă e true, nu se așteaptă rawText sau fileBuffer.
   * Claude extrage cunoaștere din ceea ce știe despre această sursă.
   */
  bibliographicReference?: boolean
  /** Editura (util pentru referințe bibliografice) */
  publisher?: string
  /** Anul publicării */
  year?: number
  /** Ediția */
  edition?: string
  /** ISBN */
  isbn?: string
  /** Capitole sau teme specifice de extras (opțional — focalizează extracția) */
  focusTopics?: string[]
  /** Câte entries să genereze per referință bibliografică (default 30) */
  targetEntries?: number
}

export interface IngestResult {
  sourceTitle: string
  sourceAuthor: string
  totalChunks: number
  entriesCreated: number
  entriesSkipped: number
  byRole: Record<string, number>
  entries: IngestedEntry[]
  durationMs: number
}

export interface IngestedEntry {
  agentRole: string
  kbType: string
  content: string
  tags: string[]
  confidence: number
  knowledgeType: "declarativa" | "procedurala" | "mixta"
}

// ── Consultanți L2 disponibili ──────────────────────────────

const L2_CONSULTANTS = [
  { role: "PPA", domain: "psihologie pozitivă, inteligență emoțională, wellbeing, strengths, flow, reziliență, emoții pozitive" },
  { role: "PSE", domain: "științe educaționale, andragogie, pedagogie, metode de învățare, dezvoltare competențe, training" },
  { role: "PSYCHOLINGUIST", domain: "comunicare, calibrare lingvistică, registru, empatie verbală, markeri lingvistici, persuasiune" },
  { role: "SCA", domain: "biasuri cognitive, shadow, distorsiuni, blocaje, mecanisme de apărare, perfecționism" },
  { role: "PPMO", domain: "psihologia muncii, organizații, echipe, climat organizațional, evaluare, performanță, HR, selecție" },
  { role: "MGA", domain: "management, leadership, decizie, strategie, inovație, conducere echipe, feedback" },
  { role: "SVHA", domain: "vindecări holistice, mindfulness, yoga, meditație, integrare corp-minte, tradiții contemplative" },
  { role: "SOC", domain: "sociologie, comportament social, norme, cultură, grupuri, dinamici sociale" },
  { role: "STA", domain: "statistică, date, metrici, validare, analiză cantitativă, etaloane, norme" },
  { role: "ACEA", domain: "context extern, piață, legislativ, tendințe, economic, cultural" },
]

const L2_ROLES_LIST = L2_CONSULTANTS.map(c => `${c.role} (${c.domain})`).join("\n")

// ── Extragere text ──────────────────────────────────────────

async function extractText(input: IngestDocumentInput): Promise<string> {
  if (input.rawText) return input.rawText

  if (!input.fileBuffer || !input.fileExtension) {
    throw new Error("Trebuie furnizat rawText sau fileBuffer + fileExtension")
  }

  const ext = input.fileExtension.toLowerCase()

  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse(input.fileBuffer) as any
    await parser.load()
    return await parser.getText() as string
  }

  if (ext === ".docx" || ext === ".doc") {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer: input.fileBuffer })
    return result.value
  }

  if (ext === ".txt") {
    return input.fileBuffer.toString("utf-8")
  }

  throw new Error(`Format nesuportat: ${ext}. Acceptăm: .pdf, .docx, .doc, .txt`)
}

// ── Chunking ────────────────────────────────────────────────

function chunkText(text: string, maxChars: number = 3000): string[] {
  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ""

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    if (current.length + trimmed.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim())
      current = trimmed
    } else {
      current += (current ? "\n\n" : "") + trimmed
    }
  }

  if (current.trim()) chunks.push(current.trim())

  return chunks
}

// ── Extracție cunoaștere per chunk ──────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Ești un specialist în extracția cunoașterii din texte academice și profesionale.

Primești un fragment dintr-un document și trebuie să extragi CUNOAȘTEREA UTILĂ sub formă de KB entries pentru o platformă de resurse umane și dezvoltare personală/profesională.

CONSULTANȚII L2 DISPONIBILI (rutează fiecare entry spre cel mai potrivit):
${L2_ROLES_LIST}

REGULI DE EXTRACȚIE:
1. Fiecare entry = 2-4 propoziții CONCRETE și ACȚIONABILE
2. NU copia text — reformulează în limbaj clar, direct, aplicabil
3. Separă cunoașterea DECLARATIVĂ (ce e adevărat) de cea PROCEDURALĂ (cum se face)
4. Dacă un fragment nu conține cunoaștere utilă (e introducere, bibliografie, note de subsol), returnează array gol
5. Tag-uri: 2-5 per entry, lowercase, fără diacritice, specifice (nu generice)
6. Un chunk poate genera 0-5 entries (calitate > cantitate)
7. NU genera entries triviale sau care repetă cunoaștere de bază

Răspunde STRICT cu JSON valid:
{
  "entries": [
    {
      "agentRole": "PPA",
      "content": "Descriere concretă, acționabilă...",
      "knowledgeType": "declarativa" | "procedurala" | "mixta",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Dacă fragmentul nu conține cunoaștere extractabilă: {"entries": []}
`

async function extractKnowledgeFromChunk(
  chunk: string,
  sourceTitle: string,
  sourceAuthor: string,
  sourceType: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<IngestedEntry[]> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `SURSĂ: "${sourceTitle}" de ${sourceAuthor} (${sourceType})
FRAGMENT ${chunkIndex + 1}/${totalChunks}:

${chunk}`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  try {
    const parsed = JSON.parse(text)
    if (!parsed.entries || !Array.isArray(parsed.entries)) return []

    // Validăm și completăm fiecare entry
    const sourceTag = sourceAuthor.toLowerCase().split(" ").pop() || "unknown"

    return parsed.entries
      .filter((e: any) => e.agentRole && e.content && e.content.length > 30)
      .map((e: any) => ({
        agentRole: e.agentRole,
        kbType: "SHARED_DOMAIN" as const,
        content: e.content,
        tags: [
          sourceTag,
          ...(e.tags || []).slice(0, 4),
        ],
        confidence: 0.75,
        knowledgeType: e.knowledgeType || "declarativa",
      }))
  } catch {
    return []
  }
}

// ── Extracție din referință bibliografică ────────────────────

const BIBLIO_SYSTEM_PROMPT = `Ești un specialist în extracția cunoașterii din surse academice și profesionale.

Primești o REFERINȚĂ BIBLIOGRAFICĂ (nu textul complet). Folosește tot ce știi despre această sursă pentru a extrage cunoaștere utilă.

CONSULTANȚII L2 DISPONIBILI (rutează fiecare entry spre cel mai potrivit):
${L2_ROLES_LIST}

REGULI:
1. Extrage DOAR cunoaștere pe care o cunoști efectiv din această sursă
2. Dacă nu cunoști sursa, spune sincer — returnează {"entries": [], "knownSource": false}
3. Fiecare entry = 2-4 propoziții CONCRETE și ACȚIONABILE
4. Separă cunoaștere DECLARATIVĂ (ce e adevărat) de cea PROCEDURALĂ (cum se face)
5. Tag-uri: 2-5 per entry, lowercase, fără diacritice
6. Prioritizează cunoașterea care e SPECIFICĂ acestei surse, nu cunoaștere generală de domeniu
7. Dacă sunt indicate teme specifice de focalizare, concentrează-te pe ele

Răspunde STRICT cu JSON valid:
{
  "knownSource": true,
  "sourceDescription": "Scurtă descriere a sursei și relevanței ei",
  "entries": [
    {
      "agentRole": "PPA",
      "content": "Descriere concretă, acționabilă...",
      "knowledgeType": "declarativa" | "procedurala" | "mixta",
      "tags": ["tag1", "tag2"]
    }
  ]
}
`

async function extractFromBibliography(input: IngestDocumentInput): Promise<{ entries: IngestedEntry[]; knownSource: boolean; sourceDescription: string }> {
  const client = new Anthropic()

  const reference = [
    `Titlu: "${input.sourceTitle}"`,
    `Autor: ${input.sourceAuthor}`,
    input.publisher ? `Editură: ${input.publisher}` : "",
    input.year ? `An: ${input.year}` : "",
    input.edition ? `Ediție: ${input.edition}` : "",
    input.isbn ? `ISBN: ${input.isbn}` : "",
    `Tip: ${input.sourceType}`,
    input.domain ? `Domeniu: ${input.domain}` : "",
    input.focusTopics?.length
      ? `\nTEME SPECIFICE DE FOCALIZARE:\n${input.focusTopics.map(t => `- ${t}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n")

  const targetEntries = input.targetEntries || 30
  const batchSize = 15
  const batches = Math.ceil(targetEntries / batchSize)

  const allEntries: IngestedEntry[] = []
  let knownSource = false
  let sourceDescription = ""
  const sourceTag = input.sourceAuthor.toLowerCase().split(" ").pop() || "unknown"

  for (let batch = 0; batch < batches; batch++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: BIBLIO_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `REFERINȚĂ BIBLIOGRAFICĂ:\n${reference}\n\nGenerează ${batchSize} KB entries (batch ${batch + 1}/${batches}).${
          batch > 0 ? `\n\nATENȚIE: NU repeta entries deja generate. Acoperă ALTE aspecte ale sursei.` : ""
        }${
          allEntries.length > 0
            ? `\n\nDeja generate (NU repeta):\n${allEntries.slice(-10).map(e => `- [${e.agentRole}] ${e.content.slice(0, 60)}...`).join("\n")}`
            : ""
        }`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""

    try {
      const parsed = JSON.parse(text)
      if (batch === 0) {
        knownSource = parsed.knownSource !== false
        sourceDescription = parsed.sourceDescription || ""
        if (!knownSource) break
      }

      if (parsed.entries && Array.isArray(parsed.entries)) {
        const entries = parsed.entries
          .filter((e: any) => e.agentRole && e.content && e.content.length > 30)
          .map((e: any) => ({
            agentRole: e.agentRole,
            kbType: "SHARED_DOMAIN" as const,
            content: e.content,
            tags: [sourceTag, ...(e.tags || []).slice(0, 4)],
            confidence: 0.75,
            knowledgeType: e.knowledgeType || "declarativa",
          }))
        allEntries.push(...entries)
      }
    } catch {
      // Parse error — skip batch
    }
  }

  return { entries: allEntries, knownSource, sourceDescription }
}

// ── Pipeline principal ──────────────────────────────────────

export async function ingestDocument(input: IngestDocumentInput): Promise<IngestResult> {
  const start = Date.now()

  let allEntries: IngestedEntry[]

  // ── Mod A: Referință bibliografică (fără document) ───���────
  if (input.bibliographicReference) {
    const bibResult = await extractFromBibliography(input)

    if (!bibResult.knownSource) {
      return {
        sourceTitle: input.sourceTitle,
        sourceAuthor: input.sourceAuthor,
        totalChunks: 0,
        entriesCreated: 0,
        entriesSkipped: 0,
        byRole: {},
        entries: [],
        durationMs: Date.now() - start,
        knownSource: false,
        sourceDescription: "Sursa nu e cunoscută — furnizează documentul PDF/text.",
      } as IngestResult & { knownSource: boolean; sourceDescription: string }
    }

    allEntries = bibResult.entries
  } else {
    // ── Mod B: Document (PDF/DOCX/text) ──────────────────────
    const fullText = await extractText(input)

    if (fullText.trim().length < 100) {
      throw new Error("Documentul conține prea puțin text pentru extracție (<100 caractere)")
    }

    const chunks = chunkText(fullText, input.chunkSize || 3000)
    allEntries = []

    for (let i = 0; i < chunks.length; i++) {
      const entries = await extractKnowledgeFromChunk(
        chunks[i],
        input.sourceTitle,
        input.sourceAuthor,
        input.sourceType,
        i,
        chunks.length,
      )
      allEntries.push(...entries)
    }
  }

  // 4. Deduplică (entries cu conținut aproape identic)
  const unique = deduplicateEntries(allEntries)

  // 5. Persistă în DB (dacă nu e dry run)
  let created = 0
  let skipped = 0
  const byRole: Record<string, number> = {}

  for (const entry of unique) {
    byRole[entry.agentRole] = (byRole[entry.agentRole] || 0) + 1

    if (input.dryRun) {
      created++
      continue
    }

    // Verifică duplicare cu DB
    const existing = await prisma.kBEntry.findFirst({
      where: {
        agentRole: entry.agentRole,
        content: entry.content,
        status: "PERMANENT",
      },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.kBEntry.create({
      data: {
        agentRole: entry.agentRole,
        kbType: entry.kbType as any,
        content: entry.content,
        tags: entry.tags,
        confidence: entry.confidence,
        source: "EXPERT_HUMAN",
        status: "PERMANENT",
        usageCount: 0,
        validatedAt: new Date(),
      },
    })
    created++
  }

  return {
    sourceTitle: input.sourceTitle,
    sourceAuthor: input.sourceAuthor,
    totalChunks: input.bibliographicReference ? 0 : allEntries.length,
    entriesCreated: created,
    entriesSkipped: skipped,
    byRole,
    entries: unique,
    durationMs: Date.now() - start,
  }
}

// ── Deduplicate ─────────────────────────────────────────────

function deduplicateEntries(entries: IngestedEntry[]): IngestedEntry[] {
  const seen = new Set<string>()
  return entries.filter(entry => {
    // Normalizăm conținutul pentru comparație
    const key = `${entry.agentRole}:${entry.content.slice(0, 80).toLowerCase().replace(/\s+/g, " ")}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
