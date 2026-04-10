import { test, expect } from "@playwright/test"

/**
 * AI Tools Smoke — verifică că paginile AI tools se încarcă și au UI funcțional.
 * NU testează generarea reală (cost Claude + timp) — doar smoke:
 *  - Pagina se încarcă (200)
 *  - Form/UI e prezent
 *  - Zero link-uri broken
 *
 * Verifică existența (nu runtime) pentru:
 *  - /ai-tools (hub)
 *  - /ai-tools/job-ad (generator anunț)
 *  - /ai-tools/social-media (generator postări)
 *  - /ai-tools/kpi-sheet (generator KPI)
 *  - /ai-tools/analysis (analiză sesiune)
 */

const DEMO_EMAIL = "owner@techvision.ro"
const DEMO_PASSWORD = "Demo2026!"

test.describe.configure({ timeout: 90_000 })

// /ai-tools (hub) face redirect la /ai-tools/job-ad — verificat separat
const AI_TOOL_PAGES = [
  { path: "/ai-tools/job-ad", expectedHeading: /anunț|job ad/i },
  { path: "/ai-tools/social-media", expectedHeading: /social media|postări/i },
  { path: "/ai-tools/kpi-sheet", expectedHeading: /KPI/i },
  { path: "/ai-tools/analysis", expectedHeading: /anali/i },
]

test("AI Tools Smoke: toate paginile se încarcă cu heading corect", async ({ page }) => {
  // Login
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(DEMO_EMAIL)
  await page.locator("input[type='password']").fill(DEMO_PASSWORD)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })

  const errors: string[] = []

  for (const { path, expectedHeading } of AI_TOOL_PAGES) {
    try {
      const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 })
      if (!response || response.status() >= 400) {
        errors.push(`${path}: HTTP ${response?.status() || "no response"}`)
        continue
      }

      // Verifică heading
      const headings = await page.locator("h1").allTextContents()
      const matchingHeading = headings.find((h) => expectedHeading.test(h))
      if (!matchingHeading) {
        errors.push(`${path}: heading ${expectedHeading} absent. Found: ${headings.join(" | ")}`)
      }

      // Verifică că nu există link-uri /app/*
      const badLinks = await page.locator("a[href]").evaluateAll((links) =>
        links
          .map((l) => (l as HTMLAnchorElement).getAttribute("href"))
          .filter((h): h is string => !!h && h.startsWith("/app/"))
      )
      if (badLinks.length > 0) {
        errors.push(`${path}: link-uri /app/* — ${badLinks.slice(0, 2).join(", ")}`)
      }
    } catch (e: any) {
      errors.push(`${path}: exception ${e.message.slice(0, 80)}`)
    }
  }

  if (errors.length > 0) {
    console.log("\n═══ AI TOOLS ERRORS ═══")
    for (const err of errors) console.log(`  ❌ ${err}`)
  }

  expect(errors, `${errors.length} AI tool pages cu probleme`).toHaveLength(0)
})
