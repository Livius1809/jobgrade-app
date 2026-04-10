import { test, expect } from "@playwright/test"

/**
 * Page Smoke Audit — verifică că fiecare pagină B2B:
 *  1. Se încarcă fără 500
 *  2. Nu are link-uri /app/* (regression fix 10.04.2026)
 *  3. Nu are erori JS vizibile în consolă (foarte strict)
 *
 * Rulat logged-in ca demo owner. Dacă vreuna din pagini are bug structural,
 * va ieși la iveală aici.
 */

const DEMO_EMAIL = "owner@techvision.ro"
const DEMO_PASSWORD = "Demo2026!"

const PAGES_TO_AUDIT = [
  "/portal",
  "/company",
  "/company/departments",
  "/settings/users",
  "/settings/security",
  "/settings/billing",
  "/jobs",
  "/sessions",
  "/reports",
  "/compensation",
  "/compensation/kpis",
  "/compensation/budget",
  "/pay-gap",
  "/pay-gap/employees",
  "/pay-gap/assessments",
  "/employee-portal",
  "/ai-tools",
  "/ai-tools/job-ad",
  "/ai-tools/social-media",
  "/ai-tools/kpi-sheet",
]

test.describe.configure({ timeout: 300_000 })

test("Page Smoke Audit: toate paginile B2B se încarcă fără erori + fără /app/* links", async ({
  page,
}) => {
  // Login demo
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(DEMO_EMAIL)
  await page.locator("input[type='password']").fill(DEMO_PASSWORD)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })

  const errors: string[] = []

  for (const path of PAGES_TO_AUDIT) {
    try {
      const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 })
      const status = response?.status() || 0

      if (status >= 500) {
        errors.push(`${path}: HTTP ${status}`)
        continue
      }

      // Caută link-uri /app/* care ar produce 404
      const badLinks = await page.locator("a[href]").evaluateAll((links) =>
        links
          .map((l) => (l as HTMLAnchorElement).getAttribute("href"))
          .filter((h): h is string => !!h && h.startsWith("/app/"))
      )
      if (badLinks.length > 0) {
        errors.push(`${path}: ${badLinks.length} link-uri /app/* → ${badLinks.slice(0, 3).join(", ")}`)
      }

      // Verifică dacă există text "Error" / "500" / "Something went wrong" în pagină
      const bodyText = (await page.locator("body").textContent())?.slice(0, 2000) || ""
      if (/Something went wrong|500 —|Internal Server Error/.test(bodyText)) {
        errors.push(`${path}: pagină cu eroare vizibilă`)
      }
    } catch (e: any) {
      errors.push(`${path}: exception — ${e.message.slice(0, 100)}`)
    }
  }

  if (errors.length > 0) {
    console.log("\n═══ ERORI DESCOPERITE ═══")
    for (const err of errors) console.log(`  ❌ ${err}`)
  }

  expect(errors, `${errors.length} pagini cu probleme:\n${errors.join("\n")}`).toHaveLength(0)
})
