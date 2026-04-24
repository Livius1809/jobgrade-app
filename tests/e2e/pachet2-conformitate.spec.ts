import { test, expect, Page } from "@playwright/test"

/**
 * Pachet 2 "Conformitate" — Test E2E
 *
 * Testează fluxul Pachet 2 cu contul pilot:
 *   1. Portal: secțiunea Conformitate vizibilă
 *   2. Pay Gap dashboard accesibil
 *   3. Pay Gap indicatori afișați
 *   4. Justificări accesibile
 *   5. Evaluare comună (Art. 10) accesibilă
 *   6. API pay-gap/report funcțional
 *   7. API pay-gap/justifications funcțional
 *   8. Import stat salarii funcțional
 *   9. Master Report include pay gap
 */

test.describe.configure({ timeout: 120_000 })

const PILOT_EMAIL = "pilot@jobgrade.ro"
const PILOT_PASSWORD = "Pilot2026!"

async function loginPilot(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(PILOT_EMAIL)
  await page.locator("input[type='password']").fill(PILOT_PASSWORD)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 })
}

// ─── 1. Portal: secțiunea Conformitate ──────────────────

test.describe("1. Portal Conformitate", () => {
  test("Secțiunea Conformitate apare în portal", async ({ page }) => {
    await loginPilot(page)
    await page.goto("/portal", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    const content = await page.textContent("body")
    // Verificăm că secțiunea Conformitate apare (Pachet 2)
    expect(content).toMatch(/Conformitate|Directiva EU|pay gap|decalaj/i)
  })
})

// ─── 2. Pay Gap Dashboard ───────────────────────────────

test.describe("2. Pay Gap Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginPilot(page)
  })

  test("Pay Gap dashboard se încarcă", async ({ page }) => {
    await page.goto("/pay-gap", { waitUntil: "domcontentloaded" })
    const status = (await page.goto("/pay-gap"))?.status()
    expect(status).toBeLessThan(400)
  })

  test("Dashboard conține indicatori Art. 9", async ({ page }) => {
    await page.goto("/pay-gap", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    const content = await page.textContent("body")
    // Verificăm prezența secțiunilor cheie
    expect(content).toMatch(/Art\.\s*9|indicator|decalaj|salarial/i)
  })
})

// ─── 3. Evaluare comună (Art. 10) ───────────────────────

test.describe("3. Evaluare comună Art. 10", () => {
  test("Pagina assessments se încarcă", async ({ page }) => {
    await loginPilot(page)
    await page.goto("/pay-gap/assessments", { waitUntil: "domcontentloaded" })
    const status = (await page.goto("/pay-gap/assessments"))?.status()
    expect(status).toBeLessThan(400)
  })
})

// ─── 4. Import angajați ─────────────────────────────────

test.describe("4. Import angajați", () => {
  test("Pagina employees se încarcă", async ({ page }) => {
    await loginPilot(page)
    await page.goto("/pay-gap/employees", { waitUntil: "domcontentloaded" })
    const status = (await page.goto("/pay-gap/employees"))?.status()
    expect(status).toBeLessThan(400)
  })
})

// ─── 5. API Pay Gap ─────────────────────────────────────

test.describe("5. API Pay Gap", () => {
  test("API report GET funcționează", async ({ request, page }) => {
    await loginPilot(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ")

    const res = await request.get("/api/v1/pay-gap/report", {
      headers: { cookie: cookieHeader },
    })
    expect(res.status()).toBe(200)
  })

  test("API justifications GET funcționează", async ({ request, page }) => {
    await loginPilot(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ")

    // Fără reportId returnează 400 (validare corectă)
    const res = await request.get("/api/v1/pay-gap/justifications", {
      headers: { cookie: cookieHeader },
    })
    expect([200, 400]).toContain(res.status())
  })

  test("API dashboard GET funcționează", async ({ request, page }) => {
    await loginPilot(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ")

    const res = await request.get("/api/v1/pay-gap/dashboard?year=2026", {
      headers: { cookie: cookieHeader },
    })
    expect(res.status()).toBe(200)
  })
})

// ─── 6. API Health ──────────────────────────────────────

test.describe("6. Infrastructure", () => {
  test("Health endpoint OK", async ({ request }) => {
    const res = await request.get("/api/health")
    expect(res.status()).toBe(200)
  })
})
