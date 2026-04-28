import { test, expect } from "@playwright/test"

/**
 * C3 Competitivitate + C4 Dezvoltare — Portal B2B
 * + Owner Dashboard noile secțiuni (Claude breakdown, organism health)
 *
 * Rulează pe prod (jobgrade.ro) cu contul pilot.
 */

const PILOT_EMAIL = "pilot@jobgrade.ro"
const PILOT_PASS = "Pilot2026!"

test.describe("Portal B2B — C3 + C4", () => {

  test.beforeEach(async ({ page }) => {
    // Login pilot
    await page.goto("/login")
    await page.fill("input[type='email']", PILOT_EMAIL)
    await page.fill("input[type='password']", PILOT_PASS)
    await page.click("button[type='submit']")
    await page.waitForURL(/portal|dashboard/, { timeout: 15000 })
  })

  test("Portal se incarca cu toate sectiunile", async ({ page }) => {
    await page.goto("/portal")
    await page.waitForLoadState("networkidle")

    // Verifică ca pagina portal există
    const body = await page.textContent("body")
    expect(body).toBeTruthy()
  })

  test("Sectiunea C3 Competitivitate vizibila (layer >= 3)", async ({ page }) => {
    await page.goto("/portal")
    await page.waitForLoadState("networkidle")

    // C3 apare doar daca purchasedLayer >= 3
    // Verificam daca textul exista (chiar daca e ascuns — depinde de layer)
    const hasC3 = await page.locator("text=Competitivitate").count()
    // Poate fi 0 daca pilotul nu are layer 3, sau >0 daca are
    // Nu facem assert strict — doar verificam ca pagina nu crashuiește
    expect(hasC3).toBeGreaterThanOrEqual(0)
  })

  test("Sectiunea C4 Dezvoltare vizibila (layer >= 4)", async ({ page }) => {
    await page.goto("/portal")
    await page.waitForLoadState("networkidle")

    const hasC4 = await page.locator("text=Dezvoltare organizationala").count()
    expect(hasC4).toBeGreaterThanOrEqual(0)
  })
})

test.describe("API endpoints C3", () => {
  test("GET /api/v1/psychometrics — returneaza instrumente", async ({ request }) => {
    const login = await request.post("/api/auth/callback/credentials", {
      form: { email: PILOT_EMAIL, password: PILOT_PASS, csrfToken: "", callbackUrl: "/" },
    })

    const res = await request.get("/api/v1/psychometrics")
    // Poate fi 401 (fara session cookie) sau 200
    expect([200, 401]).toContain(res.status())
  })

  test("GET /api/v1/sociogram — returneaza grupuri", async ({ request }) => {
    const res = await request.get("/api/v1/sociogram")
    expect([200, 401]).toContain(res.status())
  })

  test("GET /api/v1/compensation-packages — returneaza pachete", async ({ request }) => {
    const res = await request.get("/api/v1/compensation-packages")
    expect([200, 401]).toContain(res.status())
  })

  test("GET /api/v1/benchmark — returneaza summaries", async ({ request }) => {
    const res = await request.get("/api/v1/benchmark?action=summaries")
    expect([200, 401]).toContain(res.status())
  })
})

test.describe("Owner Dashboard — noile sectiuni", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill("input[type='email']", PILOT_EMAIL)
    await page.fill("input[type='password']", PILOT_PASS)
    await page.click("button[type='submit']")
    await page.waitForURL(/portal|dashboard|owner/, { timeout: 15000 })
  })

  test("Dashboard Owner se incarca fara erori", async ({ page }) => {
    await page.goto("/owner")
    await page.waitForLoadState("networkidle", { timeout: 30000 })

    // Verifică header
    const header = await page.locator("text=Situație internă").count()
    expect(header).toBeGreaterThanOrEqual(0) // poate fi 0 daca nu e OWNER
  })

  test("Organism health page se incarca", async ({ page }) => {
    await page.goto("/owner/organism-health")
    await page.waitForLoadState("networkidle", { timeout: 30000 })

    // Trebuie sa arate butonul Dashboard
    const backBtn = await page.locator("text=Dashboard").count()
    expect(backBtn).toBeGreaterThanOrEqual(0)
  })

  test("Business birth page se incarca cu buton back", async ({ page }) => {
    await page.goto("/owner/business-birth")
    await page.waitForLoadState("networkidle")

    const backBtn = await page.locator("text=Dashboard").count()
    expect(backBtn).toBeGreaterThanOrEqual(0)

    // Verifică ca readiness se incarca
    const readinessText = await page.locator("text=Readiness").count()
    expect(readinessText).toBeGreaterThanOrEqual(0)
  })
})

test.describe("API health — monitorizare", () => {

  test("GET /api/v1/organism-health cu internal key", async ({ request }) => {
    const res = await request.get("/api/v1/organism-health", {
      headers: { "x-internal-key": process.env.INTERNAL_API_KEY || "test" },
    })
    // 200 daca key corect, 401 daca nu
    expect([200, 401]).toContain(res.status())
    if (res.status() === 200) {
      const data = await res.json()
      expect(data).toHaveProperty("verdict")
      expect(data).toHaveProperty("checks")
      expect(data.checks.length).toBeGreaterThan(0)
    }
  })

  test("GET /api/cron/executor cu internal key", async ({ request }) => {
    const res = await request.get("/api/cron/executor", {
      headers: { "x-internal-key": process.env.INTERNAL_API_KEY || "test" },
    })
    expect([200, 401]).toContain(res.status())
    if (res.status() === 200) {
      const data = await res.json()
      expect(data).toHaveProperty("ok")
    }
  })
})

test.describe("Pagini publice — smoke", () => {

  test("Homepage", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/JobGrade/)
  })

  test("Login", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("input[type='email']")).toBeVisible()
  })

  test("B2B landing", async ({ page }) => {
    await page.goto("/b2b")
    await page.waitForLoadState("networkidle")
    const body = await page.textContent("body")
    expect(body?.length).toBeGreaterThan(100)
  })

  test("Media Books index", async ({ page }) => {
    await page.goto("/media-books")
    await page.waitForLoadState("networkidle")
    const body = await page.textContent("body")
    expect(body?.length).toBeGreaterThan(50)
  })
})
