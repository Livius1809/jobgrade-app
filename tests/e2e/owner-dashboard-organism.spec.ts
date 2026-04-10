import { test, expect } from "@playwright/test"

/**
 * Owner Dashboard — verifică că cele 8 straturi organism afișează
 * noile date post-sprint 10.04.2026:
 *  - Awareness: semnale neprocesate + tasks reactive
 *  - Action: tasks executate 24h + self-tasks + cicluri proactive
 *  - Metabolism: cron ON/OFF + cost estimat
 *  - Rhythm: vital signs verdict
 */

const DEMO_EMAIL = "owner@techvision.ro"
const DEMO_PASSWORD = "Demo2026!"

test.describe.configure({ timeout: 90_000 })

test("Owner Dashboard afișează cele 8 straturi cu date organism curente", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(DEMO_EMAIL)
  await page.locator("input[type='password']").fill(DEMO_PASSWORD)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })

  await page.goto("/owner", { waitUntil: "networkidle" })

  // Verifică că pagina încarcă fără 500
  const title = await page.locator("h1").first().textContent()
  expect(title).toMatch(/Bună/i)

  // Verifică prezența celor 8 straturi (prin label-uri text)
  const expectedLayers = [
    "Conștiință",
    "Obiective",
    "Acțiune",
    "Homeostazie",
    "Imunitate",
    "Metabolism",
    "Evoluție",
    "Ritm",
  ]

  const bodyText = (await page.locator("body").textContent()) || ""
  const missingLayers = expectedLayers.filter((l) => !bodyText.includes(l))
  expect(missingLayers, `Straturi lipsă: ${missingLayers.join(", ")}`).toHaveLength(0)

  // Verifică că metrici noi sunt prezente (sub-factori)
  const expectedSubFactors = [
    "Tasks executate 24h",
    "Self-tasks 24h",
    "Cicluri proactive",
    "Semnale neprocesate",
    "Tasks reactive 24h",
    "Cron executor",
    "Cost 24h",
    "Vital signs",
  ]

  const missingSubs = expectedSubFactors.filter((s) => !bodyText.includes(s))
  expect(missingSubs, `Sub-factori noi lipsă: ${missingSubs.join(", ")}`).toHaveLength(0)
})
