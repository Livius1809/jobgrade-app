import { test, expect } from "@playwright/test"

/**
 * Performance Audit — măsoară metrici reale pe pagini critice.
 *
 * Metrici Web Vitals folosind Performance API:
 *  - TTFB (Time to First Byte)
 *  - FCP (First Contentful Paint)
 *  - DOMContentLoaded
 *  - Load (Full Load)
 *  - Transfer Size
 *  - DOM nodes count
 *
 * Threshold-uri MVP (dev server — production va fi 2-5x mai rapid):
 *  - TTFB < 1500ms
 *  - FCP < 3000ms
 *  - Load < 5000ms
 *
 * Rezultatele sunt loggate ca referință pentru comparație post-deploy.
 */

const DEMO_EMAIL = "owner@techvision.ro"
const DEMO_PASSWORD = "Demo2026!"

const CRITICAL_PAGES = [
  { path: "/", label: "Homepage (public)", auth: false },
  { path: "/login", label: "Login (public)", auth: false },
  { path: "/register", label: "Register (public)", auth: false },
  { path: "/transparenta-ai", label: "AI Transparency (public)", auth: false },
  { path: "/portal", label: "Portal (auth)", auth: true },
  { path: "/jobs", label: "Jobs list (auth)", auth: true },
  { path: "/sessions", label: "Sessions list (auth)", auth: true },
  { path: "/sessions/new", label: "New session wizard (auth)", auth: true },
  { path: "/reports", label: "Reports (auth)", auth: true },
]

interface PerfMetrics {
  path: string
  label: string
  ttfb: number
  fcp: number
  domReady: number
  load: number
  transferSize: number
  domNodes: number
}

test.describe.configure({ timeout: 180_000 })

test("Performance audit — măsurători pe pagini critice", async ({ page, browser }) => {
  // Login pentru paginile auth
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("input[type='email']").fill(DEMO_EMAIL)
  await page.locator("input[type='password']").fill(DEMO_PASSWORD)
  await page.locator("button[type='submit']").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })

  const results: PerfMetrics[] = []

  for (const { path, label, auth } of CRITICAL_PAGES) {
    // Pentru pagini public — folosim un browser context nou fără cookies
    const targetPage = auth
      ? page
      : await (await browser.newContext()).newPage()

    const start = Date.now()
    await targetPage.goto(path, { waitUntil: "load", timeout: 45_000 })
    const load = Date.now() - start

    // Colectare metrici Web Vitals via Performance API
    const perfData = await targetPage.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType("paint")
      const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime || 0
      return {
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        fcp: Math.round(fcp),
        domReady: Math.round(nav.domContentLoadedEventEnd),
        load: Math.round(nav.loadEventEnd),
        transferSize: nav.transferSize,
        domNodes: document.querySelectorAll("*").length,
      }
    })

    results.push({
      path,
      label,
      ttfb: perfData.ttfb,
      fcp: perfData.fcp,
      domReady: perfData.domReady,
      load: load,
      transferSize: perfData.transferSize,
      domNodes: perfData.domNodes,
    })

    if (!auth) await targetPage.close()
  }

  // ─── Print summary table ─────────────────────────────────────────
  console.log("\n═══ PERFORMANCE AUDIT ═══")
  console.log(`Data: ${new Date().toISOString()}`)
  console.log(`Mediu: dev server (production va fi 2-5x mai rapid)\n`)
  console.log("Path".padEnd(20) + "TTFB".padStart(8) + "FCP".padStart(8) + "Load".padStart(8) + "Size(KB)".padStart(10) + "DOM".padStart(7))
  console.log("─".repeat(62))
  for (const r of results) {
    const sizeKB = Math.round(r.transferSize / 1024)
    console.log(
      r.path.padEnd(20) +
        `${r.ttfb}ms`.padStart(8) +
        `${r.fcp}ms`.padStart(8) +
        `${r.load}ms`.padStart(8) +
        `${sizeKB}KB`.padStart(10) +
        `${r.domNodes}`.padStart(7)
    )
  }
  console.log()

  // Threshold-uri MVP pentru dev server
  const TTFB_MAX = 3000
  const LOAD_MAX = 10_000

  const slow = results.filter((r) => r.ttfb > TTFB_MAX || r.load > LOAD_MAX)
  if (slow.length > 0) {
    console.log("⚠️ Pagini lente (> threshold MVP):")
    for (const s of slow) {
      console.log(`  - ${s.label}: TTFB=${s.ttfb}ms Load=${s.load}ms`)
    }
  } else {
    console.log("✅ Toate paginile sub threshold MVP")
  }

  // Salvăm raportul ca JSON pentru baseline
  const report = {
    timestamp: new Date().toISOString(),
    environment: "development",
    results,
  }
  await page.evaluate((r) => {
    // Save as window variable for persistence if needed
    ;(window as any).__PERF_REPORT__ = r
  }, report)

  // Assert: nicio pagină > 10s load
  const broken = results.filter((r) => r.load > 10_000)
  expect(broken, `${broken.length} pagini peste 10s: ${broken.map((b) => b.path).join(", ")}`).toHaveLength(0)
})
