/**
 * JOB EVALUATION DOCUMENT — Document de lucru post-evaluare AI
 *
 * Generează documentul atașat la fiecare fișă de post după evaluarea AI:
 * 1. Tabel scoruri finale (doar scor total per criteriu)
 * 2. Anexă: descrierea fiecărui criteriu cu TOATE variantele
 *
 * Utilizări:
 * - Evaluare AI acceptată → clientul validează direct
 * - Reevaluare prin comisie → document de lucru
 * - Client evaluează acasă → modifică scorurile, validează
 *
 * Scorurile AI = PROPUNERE, nu verdict. Clientul decide.
 */

import { CRITERION_DESCRIPTIONS, CRITERION_LABELS } from "./criterion-descriptions"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface JobEvaluationDocument {
  jobId: string
  jobTitle: string
  department: string

  /** Scorul AI per criteriu (propunere) */
  aiScores: CriterionScore[]

  /** Scorul final validat (poate fi override de client/comisie) */
  finalScores?: CriterionScore[]

  /** Status validare */
  status: "AI_PROPOSED" | "CLIENT_MODIFIED" | "COMMITTEE_EVALUATED" | "VALIDATED"

  /** Cine a validat și când */
  validatedBy?: string
  validatedAt?: string

  /** Total */
  aiTotal: number
  finalTotal?: number
}

export interface CriterionScore {
  criterionKey: string       // "Knowledge" | "Communications" | etc.
  criterionLabel: string     // "Educație și experiență"
  selectedLetter: string     // "D" — litera selectată
  selectedDescription: string // Descrierea variantei selectate
  score: number              // Punctajul final
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT BUILDER
// ═══════════════════════════════════════════════════════════════

export function buildEvaluationDocument(
  jobId: string,
  jobTitle: string,
  department: string,
  evaluationScores: Array<{ criterionKey: string; subfactorLetter: string; score: number }>
): JobEvaluationDocument {
  const aiScores: CriterionScore[] = evaluationScores.map((es) => {
    const descriptions = CRITERION_DESCRIPTIONS[es.criterionKey] || []
    const selected = descriptions.find((d) => d.letter === es.subfactorLetter)

    return {
      criterionKey: es.criterionKey,
      criterionLabel: CRITERION_LABELS[es.criterionKey] || es.criterionKey,
      selectedLetter: es.subfactorLetter,
      selectedDescription: selected?.description || "",
      score: es.score,
    }
  })

  return {
    jobId,
    jobTitle,
    department,
    aiScores,
    status: "AI_PROPOSED",
    aiTotal: aiScores.reduce((sum, s) => sum + s.score, 0),
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML EXPORT (pentru PDF print)
// ═══════════════════════════════════════════════════════════════

export function generateDocumentHTML(doc: JobEvaluationDocument): string {
  const scores = doc.finalScores || doc.aiScores
  const total = doc.finalTotal || doc.aiTotal
  const isOverridden = doc.status === "CLIENT_MODIFIED" || doc.status === "COMMITTEE_EVALUATED"

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Evaluare post — ${doc.jobTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.5; max-width: 210mm; margin: 0 auto; padding: 15mm; color: #1a1a1a; font-size: 11pt; }
    h1 { font-size: 16pt; margin-bottom: 4px; }
    h2 { font-size: 13pt; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 11pt; margin: 12px 0 4px; }
    .meta { font-size: 9pt; color: #6b7280; margin-bottom: 16px; }
    .badge { display: inline-block; font-size: 8pt; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .badge-ai { background: #dbeafe; color: #1e40af; }
    .badge-modified { background: #fef3c7; color: #92400e; }
    .badge-validated { background: #d1fae5; color: #065f46; }

    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; font-size: 10pt; }
    th { background: #f3f4f6; font-weight: 600; }
    .score-col { width: 80px; text-align: center; font-weight: 600; font-size: 12pt; }
    .total-row { background: #f0fdf4; font-weight: 700; font-size: 12pt; }
    .total-row .score-col { font-size: 14pt; color: #059669; }

    .annexe { page-break-before: always; }
    .criterion-block { margin-bottom: 16px; }
    .criterion-title { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
    .variant { padding: 4px 8px; margin: 2px 0; font-size: 9pt; border-left: 3px solid #e5e7eb; }
    .variant-selected { border-left-color: #3b82f6; background: #eff6ff; font-weight: 500; }

    .footer { margin-top: 30px; font-size: 9pt; color: #9ca3af; text-align: center; }
    .signature-block { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-line { width: 200px; border-top: 1px solid #9ca3af; padding-top: 4px; font-size: 9pt; color: #6b7280; text-align: center; }

    @media print { body { padding: 10mm; } }
  </style>
</head>
<body>

  <!-- HEADER -->
  <h1>Evaluare post de lucru</h1>
  <p class="meta">
    <strong>${doc.jobTitle}</strong> — ${doc.department}<br>
    <span class="badge ${doc.status === 'VALIDATED' ? 'badge-validated' : isOverridden ? 'badge-modified' : 'badge-ai'}">
      ${doc.status === 'AI_PROPOSED' ? 'Propunere AI — necesită validare' :
        doc.status === 'CLIENT_MODIFIED' ? 'Modificat de client — necesită validare' :
        doc.status === 'COMMITTEE_EVALUATED' ? 'Evaluat de comisie — necesită validare' :
        'Validat'}
    </span>
    ${doc.validatedBy ? `<br>Validat de: ${doc.validatedBy} la ${doc.validatedAt}` : ''}
  </p>

  <!-- TABEL SCORURI -->
  <h2>Tabel scoruri</h2>
  <table>
    <thead>
      <tr>
        <th>Criteriu</th>
        <th>Nivel selectat</th>
        <th class="score-col">Scor</th>
      </tr>
    </thead>
    <tbody>
      ${scores.map((s) => `
        <tr>
          <td>${s.criterionLabel}</td>
          <td>${s.selectedLetter} — ${s.selectedDescription}</td>
          <td class="score-col">${s.score}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="2">TOTAL</td>
        <td class="score-col">${total}</td>
      </tr>
    </tbody>
  </table>

  ${isOverridden ? `
    <p style="font-size: 9pt; color: #92400e; margin-top: 8px;">
      * Scorurile au fost modificate față de propunerea AI (total AI: ${doc.aiTotal})
    </p>
  ` : ""}

  <!-- ANEXĂ: DESCRIEREA CRITERIILOR -->
  <div class="annexe">
    <h2>Anexă — Descrierea criteriilor de evaluare</h2>
    <p style="font-size: 9pt; color: #6b7280; margin-bottom: 12px;">
      Pentru fiecare criteriu sunt prezentate toate variantele posibile.
      Varianta selectată este marcată cu fond albastru.
    </p>

    ${Object.entries(CRITERION_DESCRIPTIONS).map(([key, variants]) => {
      const score = scores.find((s) => s.criterionKey === key)
      return `
        <div class="criterion-block">
          <div class="criterion-title">${CRITERION_LABELS[key] || key}</div>
          ${variants.map((v) => `
            <div class="variant ${score?.selectedLetter === v.letter ? 'variant-selected' : ''}">
              <strong>${v.letter}</strong> — ${v.description}
            </div>
          `).join("")}
        </div>
      `
    }).join("")}
  </div>

  <!-- SEMNĂTURI -->
  <div class="signature-block">
    <div class="signature-line">Evaluator / Comisie</div>
    <div class="signature-line">Data</div>
    <div class="signature-line">Validare client</div>
  </div>

  <div class="footer">
    Document generat de platforma JobGrade — jobgrade.ro<br>
    EASY ASSET MANAGEMENT IFN S.A. — ${new Date().toLocaleDateString("ro-RO")}
  </div>

</body>
</html>`
}
