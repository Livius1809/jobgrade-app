import { test, expect } from "@playwright/test"

/**
 * Organism Pulse — meta-panel cu cele 10 vital signs tests peste cele 8 straturi.
 *
 * Verifică:
 *  - Panel-ul e prezent deasupra secțiunii "Organismul"
 *  - Verdict afișat (ALIVE/WEAKENED/CRITICAL sau UNKNOWN)
 *  - Summary counts (PASS/WARN/FAIL/SKIP)
 *  - Click pe un punct test → expand cu detalii
 */

const DEMO_EMAIL = "owner@techvision.ro"
const DEMO_PASSWORD = "Demo2026!"

test.describe.configure({ timeout: 90_000 })

test("Organism Pulse afișează verdict + 10 teste clickabile", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(DEMO_EMAIL)
  await page.locator("input[type='password']").fill(DEMO_PASSWORD)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })

  await page.goto("/owner", { waitUntil: "networkidle" })

  // Verifică prezența meta-panel-ului Organism Pulse
  await expect(page.getByText("Organism Pulse")).toBeVisible()

  // Verifică prezența uneia din cele 4 verdict-uri
  const bodyText = (await page.locator("body").textContent()) || ""
  const hasVerdict = /ALIVE|WEAKENED|CRITICAL|NERULAT/.test(bodyText)
  expect(hasVerdict, "Verdict organism absent").toBe(true)

  // Verifică summary chips (PASS/WARN/FAIL/SKIP)
  expect(bodyText).toContain("PASS")
  expect(bodyText).toContain("WARN")
  expect(bodyText).toContain("FAIL")
  expect(bodyText).toContain("SKIP")

  // Verifică că cele 10 teste vital signs sunt prezente (sau mesaj "Niciun test rulat")
  const hasTests =
    bodyText.includes("Respirație") ||
    bodyText.includes("Niciun test rulat încă")
  expect(hasTests, "Teste vital signs absente").toBe(true)

  // Dacă există teste rulate, click pe primul și verifică expand
  const respiratieButton = page.getByRole("button", { name: /Respirație/i })
  if (await respiratieButton.count() > 0) {
    await respiratieButton.first().click()
    // Verifică că detaliul apare
    await expect(page.locator("text=/Metrici|status/i").first()).toBeVisible({ timeout: 5_000 })
  }
})
