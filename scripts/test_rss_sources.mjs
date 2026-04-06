#!/usr/bin/env node
/**
 * Pings each RSS source configured in FLUX-047 și raportează:
 *   - HTTP status
 *   - content-type
 *   - număr de <item> (estimare rapidă prin regex, nu parse XML complet)
 *   - sample: titlul primului item
 *
 * Rol: verificare rapidă că URL-urile RSS sunt live înainte/după modificări,
 * fără să importăm n8n. Rulat la cerere, nu pe cron.
 */

const SOURCES = [
  { url: "https://portalhr.ro/feed/",      category: "MARKET_HR",       source: "portalhr.ro" },
  { url: "https://www.zf.ro/rss/",         category: "MACRO_ECONOMIC",  source: "zf.ro" },
  { url: "https://www.hotnews.ro/rss",     category: "CULTURAL_SOCIAL", source: "hotnews.ro" },
  { url: "https://www.juridice.ro/feed",   category: "LEGAL_REG",       source: "juridice.ro" },
  { url: "https://start-up.ro/feed/",      category: "TECH_AI",         source: "start-up.ro" },
  { url: "https://www.hr-romania.ro/feed", category: "MARKET_HR",       source: "hr-romania.ro" },
]

async function probe(src) {
  const started = Date.now()
  try {
    const res = await fetch(src.url, {
      redirect: "follow",
      headers: {
        // UA standard de browser — multe site-uri RO blochează UA custom (403)
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(15000),
    })
    const contentType = res.headers.get("content-type") ?? ""
    const text = await res.text()
    const itemCount = (text.match(/<item[\s>]/gi) || []).length
    const firstTitleMatch = text.match(/<item[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([^<\]]+)/i)
    const firstTitle = firstTitleMatch ? firstTitleMatch[1].trim().slice(0, 80) : "(n/a)"
    const ms = Date.now() - started
    return {
      ok: res.ok && itemCount > 0,
      status: res.status,
      contentType,
      itemCount,
      firstTitle,
      ms,
      note: res.ok
        ? itemCount === 0
          ? "200 OK but zero <item> — possibly not RSS"
          : ""
        : `HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      itemCount: 0,
      firstTitle: "",
      ms: Date.now() - started,
      note: err.message,
    }
  }
}

async function main() {
  console.log(`Testing ${SOURCES.length} RSS sources configured in FLUX-047\n`)
  const results = []
  for (const src of SOURCES) {
    process.stdout.write(`  ${src.source.padEnd(20)} ${src.category.padEnd(18)} ... `)
    const r = await probe(src)
    results.push({ ...src, ...r })
    const mark = r.ok ? "OK" : "FAIL"
    console.log(
      `${mark}  [${r.status}] items=${r.itemCount} in ${r.ms}ms${r.note ? `  (${r.note})` : ""}`,
    )
    if (r.ok && r.firstTitle) console.log(`    sample: ${r.firstTitle}`)
  }
  const okCount = results.filter((r) => r.ok).length
  console.log(`\nSummary: ${okCount}/${results.length} sources OK`)
  if (okCount < results.length) {
    console.log("\nFailed sources — swap URL in FLUX-047 or remove the branch:")
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.source}: ${r.url}  →  ${r.note}`)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(2)
})
