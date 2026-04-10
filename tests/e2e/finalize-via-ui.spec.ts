import { test, expect } from "@playwright/test"

/**
 * Finalize Via UI — validare end-to-end că butonul "Finalizează și calculează
 * rezultatele" apelează engine-ul real și populează JobResult în DB.
 *
 * Prerequisite: seed-demo + seed-demo-session rulate (sesiune DRAFT cu
 * evaluări complete). Acest test:
 *  1. Resetează sesiunea demo la IN_PROGRESS (cleanup previous JobResults)
 *  2. Login ca demo owner
 *  3. Navighează la /sessions/[id]
 *  4. Click pe butonul Finalizează
 *  5. Așteaptă redirect la /results
 *  6. Verifică că ranking apare (CTO, Senior, Junior)
 */

const DEMO_EMAIL = "owner@techvision.ro"
const DEMO_PASSWORD = "Demo2026!"
const DEMO_SESSION_NAME = "Evaluare Q2 2026 — Poziții Tehnice"

test.describe.configure({ timeout: 180_000 })

test("Finalize button apelează engine și populează rezultate", async ({ page, request }) => {
  // ─── Setup: reset sesiunea la IN_PROGRESS (via endpoint PATCH)  ───
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(DEMO_EMAIL)
  await page.locator("input[type='password']").fill(DEMO_PASSWORD)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })

  // Navighează la /sessions și găsește sesiunea demo
  await page.goto("/sessions", { waitUntil: "networkidle" })
  await page.getByText(DEMO_SESSION_NAME).first().click()
  await page.waitForURL(/\/sessions\/[^/]+(?:\?|$)/, { timeout: 15_000 })

  const url = page.url()
  const match = url.match(/\/sessions\/([^/?]+)/)
  if (!match) throw new Error("Nu am putut extrage sessionId")
  const sessionId = match[1]

  // Reset DB: PATCH status → IN_PROGRESS + delete JobResults via direct query
  await page.request.patch(`http://localhost:3000/api/v1/sessions/${sessionId}`, {
    headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
    data: { status: "IN_PROGRESS" },
  })

  // ─── Act: reîncarcă pagina sesiunii și click Finalizează  ────────
  await page.reload({ waitUntil: "networkidle" })

  // Confirmă dialogul de confirmare JavaScript
  page.once("dialog", (dialog) => dialog.accept())

  const finalizeBtn = page.getByRole("button", { name: /Finalizează/i })
  await finalizeBtn.waitFor({ state: "visible", timeout: 10_000 })

  const [finalizeResp] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes(`/api/v1/sessions/${sessionId}/je-process`) &&
        res.request().method() === "POST",
      { timeout: 60_000 }
    ),
    finalizeBtn.click(),
  ])
  expect(finalizeResp.status(), `finalizeSession status: ${finalizeResp.status()}`).toBe(200)

  // ─── Assert: redirect la /results + ranking vizibil  ─────────────
  await page.waitForURL(/\/sessions\/[^/]+\/results/, { timeout: 15_000 })
  await expect(page.getByText("Director Tehnic")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText("Senior Software Developer")).toBeVisible()
  await expect(page.getByText("Junior Software Developer")).toBeVisible()
})
