import { test, expect } from "@playwright/test"

/**
 * First Client Journey E2E — flow COMPLET pentru un client real nou.
 *
 * Scenario: Un HR Director care tocmai a descoperit JobGrade:
 *   1. Se înregistrează (fresh cont)
 *   2. Completează onboarding (profil companie)
 *   3. Creează primul job din scratch (/jobs/new)
 *   4. Navighează la /sessions/new
 *   5. Verifică că primul job apare în listă (chiar dacă e DRAFT)
 *   6. Verifică că user-ul însuși apare în lista de evaluatori
 *
 * Acest test expune toate blockerele "onboarding-to-first-session" care sunt
 * invizibile în teste pre-seed-uite.
 *
 * Prerequisite: seed-demo.ts + seed-demo-session.ts NU sunt necesare — testul
 * creează totul de la zero.
 */

test.describe.configure({ timeout: 120_000 })

test("First Client Journey: register → onboarding → job → session available", async ({ page }) => {
  const ts = Date.now()
  const email = `fcj-${ts}@example.com`
  const password = "ClientPass123!"
  const companyName = `Client Nou ${ts}`

  // ─── Step 1: Register ────────────────────────────────────────────
  await page.goto("/register", { waitUntil: "domcontentloaded" })
  const textInputs = page.locator("input[type='text']")
  await textInputs.nth(0).fill(companyName)
  await textInputs.nth(1).fill("Maria")
  await textInputs.nth(2).fill("Client")
  await page.locator("input[type='email']").fill(email)
  await page.locator("input[type='password']").first().fill(password)
  const confirmPwd = page.locator("input[name='confirmPassword']")
  if (await confirmPwd.count() > 0) {
    await confirmPwd.fill(password)
  }
  await page.locator("input[type='checkbox']").nth(0).check()
  await page.locator("input[type='checkbox']").nth(1).check()
  await page.locator("button[type='submit']").click()

  await page.waitForURL(/\/login/, { timeout: 20_000 })

  // ─── Step 2: Login ───────────────────────────────────────────────
  await page.locator("input[type='email']").fill(email)
  await page.locator("input[type='password']").first().fill(password)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => url.pathname === "/onboarding", { timeout: 20_000 })

  // ─── Step 3: Complete onboarding ─────────────────────────────────
  const textareas = page.locator("textarea")
  await textareas.nth(0).fill("Evaluăm posturile pentru transparență salarială.")
  await textareas.nth(1).fill("Lider regional în evaluare posturi până în 2028.")
  const industrySelect = page.locator("select").first()
  if (await industrySelect.count() > 0) {
    await industrySelect.selectOption({ index: 1 }).catch(() => {})
  }
  const [onboardResp] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/v1/company") && res.request().method() === "PUT",
      { timeout: 15_000 }
    ),
    page.getByRole("button", { name: /Salvează profilul/i }).click(),
  ])
  expect(onboardResp.status()).toBe(200)
  await page.waitForURL(/\/sessions\/new/, { timeout: 20_000 })

  // ─── Step 4: La /sessions/new — client nou are 0 joburi ──────────
  // Verifică că există buton/link ca să meargă să creeze job
  // (sau link spre /jobs/new dacă sessions/new afișează stare goală)

  // ─── Step 5: Creează primul job ──────────────────────────────────
  await page.goto("/jobs/new", { waitUntil: "networkidle" })
  // Așteaptă ca React să se hidrateze — altfel form submit merge native GET
  await page.waitForLoadState("networkidle")

  // JobForm prima input e title
  await page.locator("input[type='text']").first().fill(`Software Developer Senior ${ts}`)

  // Submit: butonul "Creează fișa de post" (nu "Ieși" din navbar)
  const createJobBtn = page.getByRole("button", { name: /Creează fișa de post/i })
  await createJobBtn.waitFor({ state: "visible" })

  const [jobResp] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/v1/jobs") && res.request().method() === "POST",
      { timeout: 20_000 }
    ),
    createJobBtn.click(),
  ])
  expect(jobResp.status(), `POST /api/v1/jobs failed: ${jobResp.status()}`).toBe(201)

  // ─── Step 6: Întoarce-te la /sessions/new — wizard 3 pași ────────
  await page.goto("/sessions/new", { waitUntil: "domcontentloaded" })

  // Step 1: Nume sesiune
  await page.locator("input[type='text']").first().fill(`Prima sesiune ${ts}`)
  await page.getByRole("button", { name: /Continuă/i }).click()

  // Step 2: Selectează joburi — verifică că jobul nou creat (DRAFT) apare
  // (fix 10.04.2026: anterior query filtra doar status=ACTIVE)
  await expect(page.getByText(new RegExp(`Software Developer Senior ${ts}`))).toBeVisible({
    timeout: 10_000,
  })

  // Click pe jobul nou ca să-l selecteze
  const jobLabel = page
    .locator("label")
    .filter({ hasText: new RegExp(`Software Developer Senior ${ts}`) })
  await jobLabel.click()
  await page.getByRole("button", { name: /Continuă/i }).click()

  // Step 3: Selectează participanți — verifică că lista NU e goală
  // (fix 10.04.2026: anterior erau listați doar FACILITATOR/REPRESENTATIVE,
  // client solo cu rol COMPANY_ADMIN rămânea blocat cu listă goală)
  await page.waitForTimeout(500)

  // Nu trebuie să apară mesajul "Nu există evaluatori"
  const emptyMsg = page.getByText(/Nu există evaluatori disponibili/i)
  await expect(emptyMsg).toHaveCount(0, { timeout: 5_000 })

  // Și Maria trebuie să apară în lista de evaluatori (ca heading item)
  await expect(page.getByText("Maria Client", { exact: false }).first()).toBeVisible({
    timeout: 5_000,
  })
})
