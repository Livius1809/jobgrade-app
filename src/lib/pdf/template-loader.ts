/**
 * template-loader.ts — Încarcă și interpolează template-uri HTML din InDesign/Dreamweaver.
 *
 * Workflow:
 *   1. Designer creează în InDesign / Dreamweaver
 *   2. Export HTML Package → salvat în src/templates/reports/{name}/
 *   3. Loader-ul citește HTML-ul, înlocuiește variabilele {{var}}, returnează string-ul complet
 *   4. Se pasează la renderHtmlToPdf() pentru generare PDF
 *
 * Variabile suportate:
 *   {{companyName}}, {{cui}}, {{date}}, {{sessionName}}, etc.
 *   {{#each jobs}} ... {{/each}} — iterare simplă
 *   {{#if condition}} ... {{/if}} — condiționare simplă
 */

import { readFileSync, existsSync } from "fs"
import { join } from "path"

const TEMPLATES_DIR = join(process.cwd(), "src", "templates")

/**
 * Loads an HTML template and interpolates variables.
 */
export function loadTemplate(
  category: "reports" | "emails",
  name: string,
  variables: Record<string, string | number | boolean | null | undefined> = {}
): string {
  const templatePath = join(TEMPLATES_DIR, category, name, "index.html")

  if (!existsSync(templatePath)) {
    // Fallback: try without directory (flat file)
    const flatPath = join(TEMPLATES_DIR, category, `${name}.html`)
    if (!existsSync(flatPath)) {
      throw new Error(`Template not found: ${category}/${name}`)
    }
    return interpolate(readFileSync(flatPath, "utf-8"), variables)
  }

  let html = readFileSync(templatePath, "utf-8")

  // Resolve relative CSS/image paths to absolute
  html = html.replace(
    /(?:href|src)="(?!https?:\/\/|data:)([^"]+)"/g,
    (match, path) => {
      const absPath = join(TEMPLATES_DIR, category, name, path)
      if (existsSync(absPath)) {
        // Inline CSS files
        if (path.endsWith(".css")) {
          const css = readFileSync(absPath, "utf-8")
          return `style="${css.replace(/"/g, "'").replace(/\n/g, " ")}"`
        }
      }
      return match
    }
  )

  return interpolate(html, variables)
}

/**
 * Simple template interpolation: {{variable}} → value
 */
function interpolate(
  template: string,
  variables: Record<string, string | number | boolean | null | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key]
    if (value === null || value === undefined) return ""
    return String(value)
  })
}

/**
 * Loads template CSS separately (for inline injection).
 */
export function loadTemplateCss(category: "reports" | "emails", name: string): string {
  const cssPath = join(TEMPLATES_DIR, category, name, "styles.css")
  if (!existsSync(cssPath)) return ""
  return readFileSync(cssPath, "utf-8")
}

/**
 * Lists available templates in a category.
 */
export function listTemplates(category: "reports" | "emails"): string[] {
  const dir = join(TEMPLATES_DIR, category)
  if (!existsSync(dir)) return []

  const fs = require("fs")
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d: any) => d.isDirectory() || d.name.endsWith(".html"))
    .map((d: any) => d.name.replace(".html", ""))
}
