import { test, expect } from "@playwright/test"

/**
 * Exports Verify — fiecare format de export (PDF, Excel, JSON, XML) trebuie
 * să genereze un fișier valid și să consume credite conform specificației.
 *
 * Prerequisite: seed-demo + seed-demo-session + seed-demo-complete rulate
 * ca să avem o sesiune COMPLETED cu rezultate.
 */

const DEMO_EMAIL = "owner@techvision.ro"
const DEMO_PASSWORD = "Demo2026!"
const DEMO_SESSION_NAME = "Evaluare Q2 2026 — Poziții Tehnice"

test.describe.configure({ timeout: 120_000 })

async function loginAndGetSessionId(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(DEMO_EMAIL)
  await page.locator("input[type='password']").fill(DEMO_PASSWORD)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })

  await page.goto("/reports", { waitUntil: "domcontentloaded" })
  await page.getByText(DEMO_SESSION_NAME).first().click()
  await page.waitForURL(/\/sessions\/[^/]+\/results/, { timeout: 15_000 })

  const url = page.url()
  const match = url.match(/\/sessions\/([^/]+)\/results/)
  if (!match) throw new Error("Nu am putut extrage sessionId din URL")
  return match[1]
}

const FORMATS = [
  { name: "excel", ext: "xlsx", minSize: 1000 },
  { name: "json", ext: "json", minSize: 100 },
  { name: "xml", ext: "xml", minSize: 100 },
  { name: "pdf", ext: "pdf", minSize: 1000 },
]

for (const fmt of FORMATS) {
  test(`Export ${fmt.name.toUpperCase()} — generează fișier valid`, async ({ page, request }) => {
    const sessionId = await loginAndGetSessionId(page)

    // Folosim page.request (moștenește browser context + Origin pentru CSRF guard)
    // Timeout mare pentru prima compile Turbopack pe dev server
    const response = await page.request.post(
      `http://localhost:3000/api/v1/sessions/${sessionId}/export/${fmt.name}`,
      {
        headers: { Origin: "http://localhost:3000" },
        timeout: 60_000,
      }
    )

    expect(response.status(), `${fmt.name} status`).toBe(200)

    const body = await response.body()
    expect(body.length, `${fmt.name} file size`).toBeGreaterThan(fmt.minSize)

    // Validare conținut minimă per format
    if (fmt.name === "json") {
      const json = JSON.parse(body.toString())
      expect(json).toBeDefined()
    } else if (fmt.name === "xml") {
      const text = body.toString()
      expect(text).toMatch(/<\?xml|<\w+/)
    } else if (fmt.name === "pdf") {
      // PDF magic number: %PDF
      expect(body.subarray(0, 4).toString()).toBe("%PDF")
    } else if (fmt.name === "excel") {
      // XLSX e un ZIP (PK magic)
      expect(body.subarray(0, 2).toString("hex")).toBe("504b") // "PK"
    }
  })
}
