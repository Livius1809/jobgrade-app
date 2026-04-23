/**
 * html-to-pdf.ts — Generare PDF din HTML template via Puppeteer
 *
 * Folosit pentru rapoarte design InDesign → HTML → PDF pixel-perfect.
 * Web-ul și PDF-ul arată identic (același HTML + CSS).
 *
 * Folosim puppeteer-core (fără Chromium bundled):
 *   - Local dev: Chrome/Chromium instalat pe sistem
 *   - Prod (Vercel): @sparticuz/chromium-min pentru serverless
 *
 * Usage:
 *   const buffer = await renderHtmlToPdf(htmlString, { format: "A4", landscape: false })
 */

import type { PDFOptions } from "puppeteer-core"

interface RenderOptions {
  format?: "A4" | "Letter"
  landscape?: boolean
  printBackground?: boolean
  margin?: { top?: string; right?: string; bottom?: string; left?: string }
  headerTemplate?: string
  footerTemplate?: string
  displayHeaderFooter?: boolean
}

const DEFAULT_OPTIONS: RenderOptions = {
  format: "A4",
  landscape: false,
  printBackground: true,
  margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
}

/**
 * Renders HTML string to PDF buffer using Puppeteer.
 * Automatically detects Chrome/Chromium executable.
 */
export async function renderHtmlToPdf(
  html: string,
  options: RenderOptions = {}
): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core")
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Detect Chrome executable
  const executablePath = await getChromePath()

  const browser = await puppeteer.default.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  })

  try {
    const page = await browser.newPage()

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 15000,
    })

    const pdfOptions: PDFOptions = {
      format: opts.format as any,
      landscape: opts.landscape,
      printBackground: opts.printBackground,
      margin: opts.margin,
      displayHeaderFooter: opts.displayHeaderFooter ?? false,
      headerTemplate: opts.headerTemplate,
      footerTemplate: opts.footerTemplate,
    }

    const pdf = await page.pdf(pdfOptions)
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

/**
 * Detects Chrome/Chromium path on the current system.
 * Falls back to @sparticuz/chromium-min for serverless (Vercel).
 */
async function getChromePath(): Promise<string> {
  // 1. Environment variable override
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH
  }

  // 2. Try serverless chromium (Vercel)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      // @ts-ignore — optional serverless dependency
      const chromium = await import("@sparticuz/chromium-min")
      return await chromium.default.executablePath(
        "https://github.com/nicholasgasior/chromium-binaries/releases/download/v131.0.6778.69/chromium-v131.0.6778.69-pack.tar"
      )
    } catch {
      // fallback to system Chrome
    }
  }

  // 3. System Chrome paths
  const paths = [
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ]

  const fs = await import("fs")
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }

  throw new Error(
    "Chrome/Chromium not found. Set CHROME_PATH environment variable or install Chrome."
  )
}

/**
 * Wraps HTML content in a complete document with print-optimized CSS.
 * Use this to create a full HTML page from a template fragment.
 */
export function wrapHtmlTemplate(bodyHtml: string, options: {
  title?: string
  cssUrl?: string
  inlineCss?: string
} = {}): string {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title ?? "Raport JobGrade"}</title>
  ${options.cssUrl ? `<link rel="stylesheet" href="${options.cssUrl}">` : ""}
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .page-break { page-break-after: always; }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #111827;
      line-height: 1.5;
      font-size: 10pt;
    }
    ${options.inlineCss ?? ""}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}
