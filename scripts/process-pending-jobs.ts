/**
 * Procesează joburile de ingestie create din portal (IN_PROGRESS)
 *
 * Utilizare:
 *   npx tsx scripts/process-pending-jobs.ts
 *
 * Portalul creează jobul (extrage text, chunk-uiește, salvează în DB).
 * Acest script preia joburile pending și le procesează local — fără timeout.
 *
 * Rulează pe calculatorul local. Se poate lăsa deschis — verifică la fiecare 30s.
 */

const API_BASE = process.env.API_BASE || "https://jobgrade.ro"
const API_KEY = process.env.INTERNAL_API_KEY || "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function processJob(jobId: string, sourceTitle: string, totalChunks: number, processedUpTo: number) {
  console.log(`\n⚙️  Procesez: "${sourceTitle}" (${processedUpTo}/${totalChunks} deja procesate)`)

  let completed = false
  let totalEntries = 0

  while (!completed) {
    const processRes = await fetch(`${API_BASE}/api/v1/kb/ingest-chunked`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": API_KEY },
      body: JSON.stringify({ action: "process", jobId, batchSize: 3 }),
    })

    if (!processRes.ok) {
      if (processRes.status === 429) {
        process.stdout.write(`\n   ⏳ Rate limit — aștept 60s...`)
        await sleep(60000)
        continue
      }
      if (processRes.status === 504) {
        process.stdout.write(`\n   ⏳ Timeout server — reîncerc după 15s...`)
        await sleep(15000)
        continue
      }
      const errText = await processRes.text()
      console.error(`\n❌ Eroare: ${processRes.status} ${errText}`)
      console.log(`   Job ${jobId} — poți relua mai târziu.`)
      return
    }

    const data = await processRes.json()
    totalEntries = data.entriesCreated || 0
    const pct = data.completionPct || 0
    const bar = "\u2588".repeat(Math.round(pct / 5)) + "\u2591".repeat(20 - Math.round(pct / 5))

    process.stdout.write(`\r   [${bar}] ${pct}% | ${data.processedUpTo}/${totalChunks} chunks | ${totalEntries} entries`)

    if (data.status === "COMPLETED") {
      completed = true
      console.log("\n")
      console.log(`✅ "${sourceTitle}" — ${totalEntries} entries`)
      for (const [role, count] of Object.entries(data.byRole || {})) {
        console.log(`      ${role}: ${count}`)
      }
    } else if (data.status === "FAILED") {
      console.log(`\n❌ Eșuat: ${data.error}`)
      return
    }

    if (!completed) await sleep(10000)
  }
}

async function checkAndProcess() {
  const res = await fetch(`${API_BASE}/api/v1/kb/ingest-chunked`, {
    headers: { "x-internal-key": API_KEY },
  })

  if (!res.ok) {
    console.error(`Eroare la citirea joburilor: ${res.status}`)
    return
  }

  const { jobs } = await res.json()
  const pending = (jobs || []).filter((j: any) => j.status === "IN_PROGRESS")

  if (pending.length === 0) {
    return false // nimic de procesat
  }

  console.log(`\n📋 ${pending.length} job(uri) de procesat:`)
  for (const job of pending) {
    console.log(`   • ${job.sourceTitle} — ${job.completionPct}% (${job.processedUpTo}/${job.totalChunks})`)
  }

  for (const job of pending) {
    await processJob(job.id, job.sourceTitle, job.totalChunks, job.processedUpTo)
  }

  return true
}

async function main() {
  const watchMode = process.argv.includes("--watch")

  console.log(`🔄 Verificare joburi de ingestie pe ${API_BASE}`)
  if (watchMode) console.log(`   Mod watch — verifică la fiecare 30s. Ctrl+C pentru a opri.\n`)

  const found = await checkAndProcess()

  if (watchMode) {
    // Polling continuu
    while (true) {
      await sleep(30000)
      await checkAndProcess()
    }
  } else if (!found) {
    console.log("   Niciun job în așteptare. Portalul creează joburi automat la upload.")
    console.log("   Rulează cu --watch pentru a monitoriza continuu.")
  }
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1) })
