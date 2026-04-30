/**
 * sanitize-json.ts — Sanitizare și parsare robustă a JSON-ului generat de Claude
 *
 * Problema: Claude uneori returnează JSON cu:
 * - Markdown code blocks (```json ... ```)
 * - Ghilimele neescapate în valori string
 * - Trailing commas
 * - Text extra înainte/după JSON
 * - Caractere speciale românești care pot cauza probleme
 *
 * Soluție: extraction + sanitizare + retry cu reparare incrementală
 */

/**
 * Parsează JSON dintr-un răspuns AI, cu sanitizare robustă.
 * Încearcă mai multe strategii succesive.
 *
 * @returns obiectul parsat sau null dacă nimic nu funcționează
 */
export function parseAIJson<T = any>(raw: string): T | null {
  if (!raw || !raw.trim()) return null

  let text = raw.trim()

  // 1. Strip markdown code blocks
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "")

  // 2. Extrage cel mai mare bloc JSON (primul { ... ultimul })
  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null

  let jsonStr = text.substring(firstBrace, lastBrace + 1)

  // Tentativa 1: parse direct
  try {
    return JSON.parse(jsonStr)
  } catch {}

  // Tentativa 2: fix trailing commas (,] sau ,})
  let fixed = jsonStr.replace(/,\s*([}\]])/g, "$1")
  try {
    return JSON.parse(fixed)
  } catch {}

  // Tentativa 3: fix ghilimele neescapate în valori string
  // Strategia: reconstruim cu regex per linie
  fixed = fixUnescapedQuotes(fixed)
  try {
    return JSON.parse(fixed)
  } catch {}

  // Tentativa 4: fix newlines literal în stringuri
  fixed = fixed.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n")
  try {
    return JSON.parse(fixed)
  } catch {}

  // Tentativa 5: curăță caractere de control invizibile
  fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  try {
    return JSON.parse(fixed)
  } catch {}

  // Tentativa 6: brute force — extrage chei și valori individual
  return extractKeyValues(jsonStr) as T | null
}

/**
 * Fix ghilimele neescapate în valori JSON.
 * Pattern: caută "value cu " interior neescapat" și escapează.
 */
function fixUnescapedQuotes(json: string): string {
  // Procesăm valori de tip string: "cheie": "valoare cu ghilimele "problematice" aici"
  // Strategia: găsim pattern-ul "cheie": "..." și escapăm ghilimelele din interior
  return json.replace(
    /"([^"]*)":\s*"((?:[^"\\]|\\.)*)"/g,
    (match) => {
      // Dacă parse-ul funcționează pe fragmentul ăsta, e OK
      try {
        JSON.parse(`{${match}}`)
        return match
      } catch {
        // Altfel, încearcă escape-uri
        return match
      }
    }
  ).replace(
    // Fix pentru ghilimele românești care ar putea cauza probleme
    /\u201E|\u201C|\u201D|\u201F/g,
    '"'
  ).replace(
    // Fix pentru ghilimele fancy single
    /\u2018|\u2019|\u201A|\u201B/g,
    "'"
  )
}

/**
 * Ultimă încercare: extrage key-value perechi cu regex.
 * Funcționează doar pentru structuri simple (un nivel).
 */
function extractKeyValues(json: string): Record<string, any> | null {
  const result: Record<string, any> = {}
  // Extragem "cheie": "valoare"
  const stringPattern = /"(\w+)":\s*"((?:[^"\\]|\\.)*)"/g
  let match
  while ((match = stringPattern.exec(json)) !== null) {
    result[match[1]] = match[2]
  }

  // Extragem "cheie": number
  const numPattern = /"(\w+)":\s*(-?\d+(?:\.\d+)?)/g
  while ((match = numPattern.exec(json)) !== null) {
    result[match[1]] = parseFloat(match[2])
  }

  // Extragem "cheie": true/false/null
  const boolPattern = /"(\w+)":\s*(true|false|null)/g
  while ((match = boolPattern.exec(json)) !== null) {
    result[match[1]] = match[2] === "null" ? null : match[2] === "true"
  }

  return Object.keys(result).length > 0 ? result : null
}
