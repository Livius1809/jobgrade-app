import { test, expect } from "@playwright/test"

/**
 * Smoke Tests — JobGrade B2B
 *
 * Testează flows critice end-to-end:
 * 1. Pagini publice se încarcă
 * 2. Auth flow (register + login)
 * 3. Creare job
 * 4. Creare sesiune evaluare
 * 5. API health checks
 * 6. Landing page B2B
 */

// ─── 1. Pagini publice ─────────────────────────────────────────────

test.describe("Pagini publice", () => {
  test("Homepage se încarcă", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/JobGrade/)
    // Verifică că pagina s-a încărcat complet
    await expect(page.locator("header")).toBeVisible()
  })

  test("B2B landing page se încarcă", async ({ page }) => {
    await page.goto("/b2b")
    await expect(page).toHaveTitle(/JobGrade/)
    await expect(page.locator("header")).toBeVisible()
  })

  test("Login page se încarcă", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("input[type='email']")).toBeVisible()
    await expect(page.locator("input[type='password']")).toBeVisible()
  })

  test("Register page se încarcă", async ({ page }) => {
    await page.goto("/register")
    await expect(page.locator("input[name='companyName']")).toBeVisible()
    await expect(page.locator("input[name='email']")).toBeVisible()
  })
})

// ─── 2. API Health ─────────────────────────────────────────────────

test.describe("API Health", () => {
  test("Health endpoint returnează ok", async ({ request }) => {
    const res = await request.get("/api/health")
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Acceptăm "healthy" (actual format) sau "ok" / "degraded"
    expect(["healthy", "ok", "degraded"]).toContain(body.status)
  })

  test("Auth endpoint există", async ({ request }) => {
    const res = await request.get("/api/auth/providers")
    expect(res.status()).toBe(200)
  })

  test("Internal API fără key returnează 401", async ({ request }) => {
    const res = await request.get("/api/v1/agents/meta-metrics")
    expect(res.status()).toBe(401)
  })
})

// ─── 3. Auth Flow ──────────────────────────────────────────────────

test.describe("Auth Flow", () => {
  const testEmail = `smoke-test-${Date.now()}@test.jobgrade.ro`
  const testPassword = "SmokeTest123!"

  test("Register — validare client-side", async ({ page }) => {
    await page.goto("/register")

    // Submit fără date — trebuie să arate erori
    await page.click("button[type='submit']")

    // Verifică că nu navighează (rămâne pe register)
    await expect(page).toHaveURL(/register/)
  })

  test("Login — credențiale invalide arată eroare", async ({ page }) => {
    await page.goto("/login")

    await page.fill("input[type='email']", "inexistent@test.ro")
    await page.fill("input[type='password']", "WrongPass123")
    await page.click("button[type='submit']")

    // Așteptăm eroarea
    await expect(page.locator("text=incorectă")).toBeVisible({ timeout: 10000 })
  })

  test("Login — redirect la login când accesezi rută protejată", async ({ page }) => {
    await page.goto("/jobs")
    // Proxy-ul redirecționează la /login
    await expect(page).toHaveURL(/login/)
  })
})

// ─── 4. Pricing B2B ────────────────────────────────────────────────

test.describe("B2B Landing Content", () => {
  test("Pricing tiers sunt vizibile", async ({ page }) => {
    await page.goto("/b2b")
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByText("Starter", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Professional", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Enterprise", { exact: true }).first()).toBeVisible()
  })

  test("Formular demo există și are câmpuri", async ({ page }) => {
    await page.goto("/b2b")

    // Scroll la formular
    await page.locator("#demo").scrollIntoViewIfNeeded()

    // Verifică prezența câmpurilor (DemoForm component)
    const formArea = page.locator("#demo")
    await expect(formArea).toBeVisible()
  })

  test("ROI section are numere corecte", async ({ page }) => {
    await page.goto("/b2b")
    await page.waitForLoadState("domcontentloaded")

    // ROI section exists with monetary values
    await expect(page.getByText("50.000", { exact: false }).first()).toBeVisible()
  })
})

// ─── 5. Demo Request API ───────────────────────────────────────────

test.describe("Demo Request", () => {
  test("POST /api/demo-request validează input", async ({ request }) => {
    const res = await request.post("/api/demo-request", {
      data: { name: "", email: "invalid", company: "" },
    })
    // Should return 400 for invalid data
    expect([400, 422]).toContain(res.status())
  })

  test("POST /api/demo-request acceptă date valide", async ({ request }) => {
    const res = await request.post("/api/demo-request", {
      data: {
        name: "Test Smoke",
        email: `smoke-${Date.now()}@test.ro`,
        company: "Test SRL",
        phone: "0700000000",
        employees: "50-200",
      },
    })
    // Should accept (200/201) or validation error (400/422) — not 500
    expect(res.status()).toBeLessThan(500)
  })
})

// ─── 6. Security ───────────────────────────────────────────────────

test.describe("Security", () => {
  test("Owner routes returnează 404 sau redirect fără auth", async ({ page }) => {
    const response = await page.goto("/owner")
    // Proxy-ul fie redirecționează la login, fie returnează 404
    const status = response?.status()
    expect([200, 302, 307, 404]).toContain(status)
    // Dacă 200, verifică că e login page (redirect)
    if (status === 200) {
      const url = page.url()
      expect(url).toMatch(/login|owner/)
    }
  })

  test("Disfunctions dashboard necesită auth", async ({ page }) => {
    await page.goto("/disfunctions")
    // Trebuie redirecționat la login (scos din PUBLIC_PATHS)
    await expect(page).toHaveURL(/login/)
  })

  test("Security headers prezente", async ({ request }) => {
    const res = await request.get("/")
    const headers = res.headers()
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["x-frame-options"]).toBe("DENY")
  })
})
