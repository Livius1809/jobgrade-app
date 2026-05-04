/**
 * POST /api/v1/narrative-profile/export
 *
 * Exportă un NarrativeDocument în format HTML sau PDF.
 * Două variante:
 * - variant: "subject" → narațiune cu link-uri expandabile
 * - variant: "consultant" → layer inferențial complet + narațiune
 *
 * HTML: interactiv, toggle-uri per afirmație
 * PDF: print-friendly, anexe la final
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import type {
  NarrativeDocument,
  NarrativeSection,
  NarrativeStatement,
  InferenceBlock,
} from "@/lib/cpu/profilers/narrative-profile"

interface ExportRequest {
  document: NarrativeDocument
  format: "html" | "pdf"
  variant: "subject" | "consultant"
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json()
    const { document, format, variant } = body

    if (!document || !format || !variant) {
      return NextResponse.json(
        { error: "document, format, and variant are required" },
        { status: 400 }
      )
    }

    const html = generateHTML(document, variant)

    if (format === "html") {
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="profil-${document.subjectAlias}-${variant}.html"`,
        },
      })
    }

    // PDF: returnăm HTML optimizat pentru print (browser-ul sau un serviciu extern face PDF)
    const printHtml = wrapForPrint(html, document, variant)
    return new NextResponse(printHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="profil-${document.subjectAlias}-${variant}-print.html"`,
      },
    })
  } catch (error) {
    console.error("[narrative-profile/export] Error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML GENERATION
// ═══════════════════════════════════════════════════════════════

function generateHTML(doc: NarrativeDocument, variant: "subject" | "consultant"): string {
  const sections = doc.sections.map((s) => renderSection(s, variant)).join("\n")

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profil Narativ — ${doc.subjectAlias}</title>
  <style>${getStyles(variant)}</style>
</head>
<body>
  <header class="header">
    <h1>Profil Narativ Integrat</h1>
    <p class="scope">Scop: ${doc.scope.description}</p>
    <p class="meta">Generat: ${new Date(doc.generatedAt).toLocaleDateString("ro-RO")} | Versiune: ${doc.version}</p>
  </header>

  <main>
    ${sections}
  </main>

  ${variant === "subject" ? renderSubjectAnnexes(doc) : renderConsultantAnnexes(doc)}

  <script>${getScript(variant)}</script>
</body>
</html>`
}

function renderSection(section: NarrativeSection, variant: "subject" | "consultant"): string {
  const statements = section.statements
    .map((s) => renderStatement(s, variant))
    .join("\n")

  return `
    <section class="narrative-section" id="section-${section.id}">
      <h2>${section.order}. ${section.title}</h2>
      ${section.subtitle ? `<p class="subtitle">${section.subtitle}</p>` : ""}
      ${statements}
    </section>`
}

function renderStatement(stmt: NarrativeStatement, variant: "subject" | "consultant"): string {
  const registerClass = stmt.register.toLowerCase()

  let detailHtml = ""
  if (stmt.inference) {
    if (variant === "subject") {
      detailHtml = renderSubjectDetail(stmt.inference)
    } else {
      detailHtml = renderConsultantDetail(stmt.inference)
    }
  }

  return `
    <div class="statement ${registerClass}" id="${stmt.id}">
      <span class="register-label">${getRegisterLabel(stmt.register)}</span>
      <p class="text">${stmt.text}</p>
      ${stmt.expandable && stmt.inference ? `
        <button class="expand-btn" onclick="toggleDetail('${stmt.id}')">
          ▸ De unde știm asta
        </button>
        <div class="detail" id="detail-${stmt.id}" style="display:none">
          ${detailHtml}
        </div>
      ` : ""}
    </div>`
}

function renderSubjectDetail(inf: InferenceBlock): string {
  const scalesHtml = inf.sources.slice(0, 2).map((s) => {
    const pos = Math.max(0, Math.min(100, ((s.normalizedT - 20) / 60) * 100))
    return `
      <div class="scale-visual">
        <div class="scale-label">${s.scaleName} <span class="t-score">T=${s.normalizedT}</span></div>
        <div class="scale-bar">
          <div class="scale-median"></div>
          <div class="scale-marker" style="left:${pos}%"></div>
        </div>
        <div class="scale-labels"><span>Scăzut</span><span>Mediu</span><span>Ridicat</span></div>
      </div>`
  }).join("")

  return `
    <div class="subject-detail">
      <p class="desc">${inf.subjectExplanation.scaleDescription}</p>
      ${scalesHtml}
      <p class="position"><strong>${inf.subjectExplanation.position}</strong></p>
      <p class="norm">${inf.subjectExplanation.normExplanation}</p>
      <p class="meaning">${inf.subjectExplanation.personalMeaning}</p>
    </div>`
}

function renderConsultantDetail(inf: InferenceBlock): string {
  const sourcesHtml = inf.sources.map((s) => `
    <tr>
      <td class="mono">${s.instrumentId.toUpperCase()}</td>
      <td>${s.scaleName}</td>
      <td class="mono">T=${s.normalizedT}</td>
      <td class="mono">p${s.percentile}</td>
      <td class="level level-${s.level.toLowerCase()}">${s.level}</td>
      ${s.isInverse ? '<td class="inverse">⟲</td>' : "<td></td>"}
    </tr>
  `).join("")

  return `
    <div class="consultant-detail">
      <div class="convergence">C${inf.convergence} — ${inf.convergence} surse convergente</div>
      <table class="sources-table">
        <thead><tr><th>Instr.</th><th>Scală</th><th>T</th><th>%ile</th><th>Nivel</th><th></th></tr></thead>
        <tbody>${sourcesHtml}</tbody>
      </table>
      <div class="field"><label>Compoziție:</label><p>${inf.composition}</p></div>
      <div class="field"><label>Mecanism:</label><pre>${inf.mechanism}</pre></div>
      ${inf.consultantNotes ? `
        <div class="warning">
          <strong>⚠️ Atenție în feedback:</strong>
          <p>${inf.consultantNotes}</p>
        </div>
      ` : ""}
    </div>`
}

function renderSubjectAnnexes(doc: NarrativeDocument): string {
  return `
    <footer class="annexes">
      <h2>Anexe</h2>
      <p class="note">Instrumente utilizate: ${doc.annexes.instruments.map((i) => i.name).join(", ")}</p>
      <p class="note">Norme de referință: ${doc.annexes.norms.map((n) => n.population).join("; ")}</p>
    </footer>`
}

function renderConsultantAnnexes(doc: NarrativeDocument): string {
  const rawTable = doc.annexes.rawScores.map((d: any) => `
    <tr>
      <td>${d.instrumentId || ""}</td>
      <td>${d.scaleName || d.dimensionId || ""}</td>
      <td>${d.rawScore ?? ""}</td>
      <td>${d.normalizedT ?? ""}</td>
      <td>${d.level || ""}</td>
    </tr>
  `).join("")

  return `
    <footer class="annexes">
      <h2>Anexe tehnice</h2>
      <table class="raw-scores">
        <thead><tr><th>Instrument</th><th>Scală</th><th>Raw</th><th>T</th><th>Nivel</th></tr></thead>
        <tbody>${rawTable}</tbody>
      </table>
    </footer>`
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

function getStyles(variant: string): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    .header { margin-bottom: 3rem; padding-bottom: 1.5rem; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .scope { font-size: 1rem; color: #4b5563; }
    .meta { font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem; }

    .narrative-section { margin-bottom: 3rem; }
    .narrative-section h2 { font-size: 1.4rem; margin-bottom: 0.25rem; }
    .subtitle { font-size: 0.85rem; color: #6b7280; margin-bottom: 1.5rem; }

    .statement { border-left: 4px solid #e5e7eb; padding: 0.75rem 1rem; margin-bottom: 1rem; }
    .statement.calauza { border-left-color: #10b981; }
    .statement.oglinda { border-left-color: #3b82f6; }
    .statement.poveste { border-left-color: #f59e0b; }

    .register-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; font-weight: 600; }
    .text { margin-top: 0.25rem; font-size: 0.95rem; }

    .expand-btn { margin-top: 0.5rem; font-size: 0.75rem; color: #3b82f6; background: none; border: none; cursor: pointer; }
    .expand-btn:hover { text-decoration: underline; }

    .detail { margin-top: 0.75rem; padding: 0.75rem; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }

    .subject-detail .desc { font-size: 0.8rem; color: #6b7280; margin-bottom: 0.5rem; }
    .subject-detail .position { font-size: 0.85rem; margin: 0.5rem 0; }
    .subject-detail .norm { font-size: 0.75rem; color: #9ca3af; }
    .subject-detail .meaning { font-size: 0.85rem; margin-top: 0.5rem; }

    .scale-visual { margin: 0.5rem 0; }
    .scale-label { font-size: 0.7rem; display: flex; justify-content: space-between; }
    .t-score { font-family: monospace; }
    .scale-bar { height: 10px; background: linear-gradient(to right, #fecaca, #f3f4f6, #d1fae5); border-radius: 5px; position: relative; margin: 2px 0; }
    .scale-median { position: absolute; left: 41.7%; width: 16.6%; height: 100%; background: rgba(0,0,0,0.05); }
    .scale-marker { position: absolute; top: 0; height: 100%; width: 3px; background: #3b82f6; border-radius: 2px; }
    .scale-labels { display: flex; justify-content: space-between; font-size: 0.6rem; color: #9ca3af; }

    .consultant-detail .convergence { font-size: 0.7rem; font-weight: 600; margin-bottom: 0.5rem; padding: 2px 6px; background: #ecfdf5; border-radius: 4px; display: inline-block; }
    .sources-table { width: 100%; font-size: 0.7rem; border-collapse: collapse; margin: 0.5rem 0; }
    .sources-table th, .sources-table td { padding: 3px 6px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    .sources-table .mono { font-family: monospace; }
    .field { margin: 0.5rem 0; }
    .field label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
    .field p, .field pre { font-size: 0.8rem; margin-top: 2px; }
    .field pre { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; white-space: pre-wrap; font-family: monospace; font-size: 0.75rem; }
    .warning { border-left: 3px solid #f59e0b; padding: 0.5rem; margin-top: 0.5rem; background: #fffbeb; font-size: 0.8rem; }

    .annexes { margin-top: 4rem; padding-top: 2rem; border-top: 2px solid #e5e7eb; }
    .annexes h2 { font-size: 1.2rem; margin-bottom: 1rem; }
    .note { font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem; }
    .raw-scores { width: 100%; font-size: 0.7rem; border-collapse: collapse; }
    .raw-scores th, .raw-scores td { padding: 3px 6px; border-bottom: 1px solid #e5e7eb; }

    @media print {
      .expand-btn { display: none; }
      .detail { display: block !important; }
      body { padding: 1cm; }
    }
  `
}

function getScript(variant: string): string {
  return `
    function toggleDetail(stmtId) {
      const el = document.getElementById('detail-' + stmtId);
      const btn = el.previousElementSibling;
      if (el.style.display === 'none') {
        el.style.display = 'block';
        btn.textContent = '▾ Ascunde detalii';
      } else {
        el.style.display = 'none';
        btn.textContent = '▸ De unde știm asta';
      }
    }
  `
}

function wrapForPrint(html: string, doc: NarrativeDocument, variant: string): string {
  // For print/PDF: expand all details by default
  return html.replace(/style="display:none"/g, 'style="display:block"')
}

function getRegisterLabel(register: string): string {
  const labels: Record<string, string> = {
    CALAUZA: "Călăuză",
    OGLINDA: "Oglindă",
    POVESTE: "Poveste",
  }
  return labels[register] || register
}
