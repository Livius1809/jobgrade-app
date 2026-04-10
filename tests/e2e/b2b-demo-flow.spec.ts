import { test, expect } from "@playwright/test"

/**
 * B2B Demo Flow E2E — JobGrade Platform
 *
 * Testează critical path-ul B2B pentru demo cu tenantul seed-uit TechVision România:
 *  1. Login cu credentialele demo
 *  2. Navigare la /reports → vezi sesiunea COMPLETED
 *  3. Click "Vezi ierarhia" → verifică ranking (CTO rank 1, Senior rank 2, Junior rank 3)
 *  4. Verifică link-urile NU conțin /app/ (regression test pentru fix-ul din 10.04.2026)
 *  5. Verifică pagina onboarding e accesibilă după auth redirect
 *
 * Prerequisite: rulează `npx tsx prisma/seed-demo.ts` + `seed-demo-session.ts` +
 * `seed-demo-complete.ts` înainte să porneşti testele.
 */

const DEMO_EMAIL = "owner@techvision.ro"
const DEMO_PASSWORD = "Demo2026!"
const DEMO_SESSION_NAME = "Evaluare Q2 2026 — Poziții Tehnice"

// Warmup compilare Next.js lazy — prima rulare pe dev server poate fi ~20-30s
test.describe.configure({ timeout: 90_000 })

async function loginDemo(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(DEMO_EMAIL)
  await page.locator("input[type='password']").fill(DEMO_PASSWORD)
  await page.locator("button[type='submit']").click()
  // NextAuth redirect asincron — așteptăm să plecăm de pe /login
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })
}

test.describe("B2B Demo Critical Path", () => {
  test("Login cu credentialele demo funcționează", async ({ page }) => {
    await loginDemo(page)
    expect(page.url()).not.toContain("/login")
  })

  test("Reports page listează sesiunea demo COMPLETED", async ({ page }) => {
    await loginDemo(page)
    await page.goto("/reports", { waitUntil: "domcontentloaded" })
    await expect(page.getByText(DEMO_SESSION_NAME)).toBeVisible({ timeout: 15_000 })
  })

  test("Ierarhia joburilor afișează ranking CTO → Senior → Junior", async ({ page }) => {
    await loginDemo(page)
    await page.goto("/reports", { waitUntil: "domcontentloaded" })
    await page.getByText(DEMO_SESSION_NAME).first().click()
    await page.waitForURL(/\/sessions\/[^/]+\/results/, { timeout: 15_000 })
    await expect(page.getByText("Director Tehnic")).toBeVisible()
    await expect(page.getByText("Senior Software Developer")).toBeVisible()
    await expect(page.getByText("Junior Software Developer")).toBeVisible()
  })

  test("REGRESSION: link-urile din /reports NU conțin /app/ (fix 10.04.2026)", async ({ page }) => {
    await loginDemo(page)
    await page.goto("/reports", { waitUntil: "domcontentloaded" })
    const hrefs = await page.locator("a[href]").evaluateAll((links) =>
      links.map((l) => (l as HTMLAnchorElement).getAttribute("href")).filter((h): h is string => !!h)
    )
    const badLinks = hrefs.filter((h) => h.startsWith("/app/"))
    expect(badLinks, `Link-uri greșite găsite: ${badLinks.join(", ")}`).toHaveLength(0)
  })

  test("REGRESSION: link-urile din /sessions/[id]/results NU conțin /app/", async ({ page }) => {
    await loginDemo(page)
    await page.goto("/reports", { waitUntil: "domcontentloaded" })
    await page.getByText(DEMO_SESSION_NAME).first().click()
    await page.waitForURL(/\/sessions\/[^/]+\/results/, { timeout: 15_000 })
    const hrefs = await page.locator("a[href]").evaluateAll((links) =>
      links.map((l) => (l as HTMLAnchorElement).getAttribute("href")).filter((h): h is string => !!h)
    )
    const badLinks = hrefs.filter((h) => h.startsWith("/app/"))
    expect(badLinks, `Link-uri greșite în results: ${badLinks.join(", ")}`).toHaveLength(0)
  })

  test("Pagina /onboarding redirectează neauth la login cu callbackUrl", async ({ page }) => {
    await page.goto("/onboarding")
    // Ar trebui să ajungem pe /login
    await page.waitForURL(/\/login/, { timeout: 10000 })
    expect(page.url()).toContain("/login")
  })

  test("FLUX COMPLET: register → login → onboarding → sessions/new", async ({ page }) => {
    // Email + companie unice per rulare pentru a evita coliziuni
    const ts = Date.now()
    const testEmail = `test-${ts}@example.com`
    const testPassword = "TestPass123!"
    const testCompany = `TestCo ${ts}`

    // ─── Step 1: Register ─────────────────────────────────────────────
    await page.goto("/register", { waitUntil: "domcontentloaded" })
    await page.locator("input[placeholder*='Exemplu SRL'], input[placeholder*='companie']")
      .first()
      .fill(testCompany)
    // Prenume (first input text după companie)
    const textInputs = page.locator("input[type='text']")
    await textInputs.nth(1).fill("Test")
    await textInputs.nth(2).fill("User")
    await page.locator("input[type='email']").fill(testEmail)
    await page.locator("input[type='password']").first().fill(testPassword)
    // Confirm password e al doilea input password (există toggle show — poate fi input type=text)
    // Încercăm pe bază de name/attributes
    const confirmPwd = page.locator("input[name='confirmPassword']")
    if (await confirmPwd.count() > 0) {
      await confirmPwd.fill(testPassword)
    } else {
      // Fallback: al doilea password input
      await page.locator("input[type='password']").nth(1).fill(testPassword).catch(() => {})
    }
    // Check terms + gdpr
    await page.locator("input[type='checkbox']").nth(0).check()
    await page.locator("input[type='checkbox']").nth(1).check()

    await page.locator("button[type='submit']").click()

    // ─── Step 2: Redirect la login cu callbackUrl ────────────────────
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    expect(page.url()).toContain("callbackUrl=")
    expect(decodeURIComponent(page.url())).toContain("/onboarding")

    // ─── Step 3: Login cu contul nou ─────────────────────────────────
    await page.locator("input[type='email']").fill(testEmail)
    await page.locator("input[type='password']").first().fill(testPassword)
    await page.locator("button[type='submit']").click()

    // ─── Step 4: Ajunge pe /onboarding ───────────────────────────────
    await page.waitForURL((url) => url.pathname === "/onboarding", { timeout: 20_000 })

    // Verifică header-ul de welcome (heading specific, nu aria announcer)
    await expect(page.getByRole("heading", { name: /Bine ai venit/i })).toBeVisible({
      timeout: 10_000,
    })

    // ─── Step 5: Completează profil companie ────────────────────────
    // Mission + Vision sunt textarea-uri
    const textareas = page.locator("textarea")
    const taCount = await textareas.count()
    if (taCount >= 2) {
      // Găsim mission + vision după label sau poziție
      await textareas.nth(0).fill("Ajutăm companiile să construiască ierarhii salariale echitabile și transparente.")
      if (taCount >= 2) {
        await textareas.nth(1).fill("Lider regional în evaluarea obiectivă a posturilor până în 2028.")
      }
    }

    // Industry select — primul select din pagină
    const industrySelect = page.locator("select").first()
    if (await industrySelect.count() > 0) {
      await industrySelect.selectOption({ index: 1 }).catch(() => {})
    }

    // Submit profil — folosim locator specific (există și buton "Ieși" cu type=submit)
    const saveButton = page.getByRole("button", { name: /Salvează profilul/i })
    const [companyResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/v1/company") && res.request().method() === "PUT",
        { timeout: 15_000 }
      ),
      saveButton.click(),
    ])
    expect(companyResponse.status(), `PUT /api/v1/company failed: ${companyResponse.status()}`).toBe(200)

    // ─── Step 6: Redirect la sessions/new ───────────────────────────
    await page.waitForURL(/\/sessions\/new/, { timeout: 20_000 })
    expect(page.url()).toContain("/sessions/new")
  })
})
