/**
 * pdf-generator.ts — Generare HTML print-ready pentru Media Books
 *
 * Pattern identic cu contract-pdf: HTML cu CSS @page,
 * convertibil client-side via window.print() sau html2pdf.js.
 */

import { getMediaBookContent, getMediaBookByCode } from "@/lib/media-books"

export interface MediaBookPDF {
  html: string
  title: string
  code: string
}

/**
 * Genereaza HTML print-ready pentru un Media Book.
 * Fiecare sectiune devine o pagina separata (page-break-after).
 *
 * @param code - Codul Media Book (ex: "MB-R1")
 */
export async function generateMediaBookPDF(code: string): Promise<MediaBookPDF> {
  const config = getMediaBookByCode(code)
  if (!config) {
    throw new Error(`Media Book cu codul "${code}" nu exista`)
  }

  const data = await getMediaBookContent(code)
  if (!data) {
    throw new Error(`Nu exista continut generat pentru Media Book "${code}"`)
  }

  const today = new Date().toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  // Parsare sectiuni din continutul Markdown (splitare dupa heading-uri)
  const sectionBlocks = parseSectionsFromMarkdown(data.content)

  // Generare cuprins
  const tocItems = sectionBlocks
    .map(
      (s, i) =>
        `<li><a href="#section-${i}" style="color:#4F46E5;text-decoration:none">${escapeHtml(s.title)}</a></li>`
    )
    .join("\n        ")

  // Generare pagini sectiuni
  const sectionPages = sectionBlocks
    .map(
      (s, i) => `
    <div class="section-page" id="section-${i}">
      <h2>${escapeHtml(s.title)}</h2>
      <div class="section-body">${markdownToHtml(s.body)}</div>
    </div>`
    )
    .join("\n")

  // Daca avem contributii de la mai multi agenti, adaugam atribuire
  const contributors =
    data.sections.length > 1
      ? data.sections.map((s) => s.role).join(", ")
      : data.author

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(config.title)} — JobGrade Media Book</title>
  <style>
    @page {
      size: A4;
      margin: 25mm 20mm 30mm 20mm;
    }
    @media print {
      .no-print { display: none !important; }
      .section-page { page-break-after: always; }
      .section-page:last-child { page-break-after: auto; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 40px;
    }

    /* ── Cover ────────────────────────────────────────── */
    .cover {
      text-align: center;
      padding: 80px 20px 40px;
      page-break-after: always;
    }
    .cover .icon { font-size: 48pt; margin-bottom: 20px; }
    .cover h1 {
      font-size: 22pt;
      font-weight: 700;
      color: #4F46E5;
      margin: 0 0 8px;
      line-height: 1.3;
    }
    .cover .subtitle {
      font-size: 13pt;
      color: #555;
      margin-bottom: 40px;
    }
    .cover .brand {
      margin-top: 60px;
      font-size: 10pt;
      color: #888;
      letter-spacing: 0.5px;
    }
    .cover .brand strong { color: #4F46E5; }
    .cover .date {
      font-size: 10pt;
      color: #999;
      margin-top: 8px;
    }

    /* ── TOC ──────────────────────────────────────────── */
    .toc {
      page-break-after: always;
      padding: 20px 0;
    }
    .toc h2 {
      font-size: 16pt;
      color: #4F46E5;
      margin-bottom: 20px;
    }
    .toc ol {
      padding-left: 20px;
      line-height: 2.2;
    }
    .toc li {
      font-size: 11pt;
    }

    /* ── Sections ─────────────────────────────────────── */
    .section-page {
      padding: 10px 0;
    }
    .section-page h2 {
      font-size: 15pt;
      font-weight: 700;
      color: #4F46E5;
      margin: 0 0 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E0E7FF;
    }
    .section-body p {
      margin: 8px 0;
      text-align: justify;
    }
    .section-body ul, .section-body ol {
      margin: 8px 0;
      padding-left: 24px;
    }
    .section-body li { margin-bottom: 4px; }
    .section-body strong { color: #312E81; }
    .section-body blockquote {
      border-left: 3px solid #4F46E5;
      margin: 12px 0;
      padding: 8px 16px;
      color: #555;
      background: #F9FAFB;
    }

    /* ── Footer ───────────────────────────────────────── */
    .doc-footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      font-size: 9pt;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>

<!-- Cover Page -->
<div class="cover">
  <div class="icon">${config.icon}</div>
  <h1>${escapeHtml(config.title)}</h1>
  <p class="subtitle">${escapeHtml(config.subtitle)}</p>
  <p class="brand">Generat de platforma <strong>JobGrade</strong></p>
  <p class="brand">Psihobusiness Consulting SRL</p>
  <p class="date">${today}</p>
</div>

<!-- Table of Contents -->
<div class="toc">
  <h2>Cuprins</h2>
  <ol>
    ${tocItems}
  </ol>
</div>

<!-- Sections -->
${sectionPages}

<!-- Footer -->
<div class="doc-footer">
  <p>${escapeHtml(config.title)} &mdash; ${escapeHtml(config.code)} &bull; Generat de platforma JobGrade &bull; &copy; Psihobusiness Consulting SRL ${new Date().getFullYear()}</p>
  <p>Contribuitori: ${escapeHtml(contributors)}</p>
</div>

</body>
</html>`

  return {
    html,
    title: config.title,
    code: config.code,
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

interface ParsedSection {
  title: string
  body: string
}

/**
 * Parseaza continut Markdown in sectiuni (split pe heading-uri ## sau ###).
 * Daca nu gaseste heading-uri, returneaza tot continutul ca o singura sectiune.
 */
function parseSectionsFromMarkdown(md: string): ParsedSection[] {
  const lines = md.split("\n")
  const sections: ParsedSection[] = []
  let currentTitle = ""
  let currentBody: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch) {
      // Salvam sectiunea anterioara
      if (currentTitle || currentBody.length > 0) {
        sections.push({
          title: currentTitle || "Introducere",
          body: currentBody.join("\n").trim(),
        })
      }
      currentTitle = headingMatch[1].trim()
      currentBody = []
    } else {
      currentBody.push(line)
    }
  }

  // Ultima sectiune
  if (currentTitle || currentBody.length > 0) {
    sections.push({
      title: currentTitle || "Continut",
      body: currentBody.join("\n").trim(),
    })
  }

  // Daca nu am gasit nimic, returnam tot ca o sectiune
  if (sections.length === 0) {
    sections.push({ title: "Continut", body: md.trim() })
  }

  return sections
}

/**
 * Conversie Markdown simpla -> HTML (fara librarie externa).
 * Suporta: paragrafe, bold, italic, liste, blockquotes.
 */
function markdownToHtml(md: string): string {
  let html = md
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Blockquotes
    .replace(/^>\s+(.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    // Unordered lists
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")

  // Paragraphs: linii non-empty care nu sunt deja HTML
  const lines = html.split("\n")
  const result: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      result.push("")
    } else if (
      trimmed.startsWith("<") ||
      trimmed.startsWith("</")
    ) {
      result.push(trimmed)
    } else {
      result.push(`<p>${trimmed}</p>`)
    }
  }

  return result.join("\n")
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
