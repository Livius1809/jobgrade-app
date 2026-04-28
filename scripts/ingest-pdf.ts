/**
 * Script ingestie PDF mare → pâlnia de cunoaștere (pe tranșe)
 *
 * Utilizare:
 *   npx tsx scripts/ingest-pdf.ts "cale/catre/fisier.pdf" "Titlul" "Autorul" [tip]
 *
 * Tip: carte | curs | articol | manual | politica (default: carte)
 *
 * Exemplu:
 *   npx tsx scripts/ingest-pdf.ts "C:/docs/tratat-psihologie.pdf" "Tratat de psihologie socială" "Chelcea, S." carte
 *
 * Funcționează pe orice dimensiune — procesează câte 3 chunk-uri per apel,
 * cu pauză de 5s între tranșe (evită rate limit).
 */

const API_BASE = process.env.API_BASE || "https://jobgrade.ro"
const API_KEY = process.env.INTERNAL_API_KEY || "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"

async function extractTextFromPDF(filePath: string): Promise<string> {
  const { execSync } = await import("child_process")
  const fs = await import("fs")

  if (!fs.existsSync(filePath)) {
    throw new Error(`Fișierul nu există: ${filePath}`)
  }

  // Încearcă pdftotext (Poppler)
  const popplerPath = "C:/poppler/poppler-25.12.0/Library/bin/pdftotext.exe"
  const pdftotext = fs.existsSync(popplerPath) ? popplerPath : "pdftotext"

  try {
    const text = execSync(`"${pdftotext}" "${filePath}" -`, {
      maxBuffer: 100 * 1024 * 1024, // 100MB
      encoding: "utf-8",
    })
    return text
  } catch (e: any) {
    throw new Error(`Eroare la extragere text din PDF: ${e.message}`)
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.log("Utilizare: npx tsx scripts/ingest-pdf.ts <cale.pdf> <titlu> <autor> [tip]")
    console.log("Tip: carte | curs | articol | manual | politica")
    console.log("")
    console.log('Exemplu: npx tsx scripts/ingest-pdf.ts "C:/docs/tratat.pdf" "Tratat psihologie" "Chelcea" carte')
    process.exit(1)
  }

  const [filePath, sourceTitle, sourceAuthor, sourceType = "carte"] = args

  console.log(`\n📚 Ingestie: "${sourceTitle}" de ${sourceAuthor}`)
  console.log(`   Fișier: ${filePath}`)
  console.log(`   Tip: ${sourceType}`)

  // 1. Extrage text din PDF
  console.log("\n📄 Extrag text din PDF...")
  const rawText = await extractTextFromPDF(filePath)
  console.log(`   ${rawText.length.toLocaleString()} caractere extrase`)

  if (rawText.length < 200) {
    console.error("❌ Prea puțin text extras. PDF-ul poate fi scanat (imagine), nu text.")
    process.exit(1)
  }

  // Estimare pagini (~2500 chars/pagina)
  const estPages = Math.round(rawText.length / 2500)
  console.log(`   ~${estPages} pagini estimate`)

  // 2. Start job pe API
  console.log("\n🚀 Pornesc jobul de ingestie...")
  const startRes = await fetch(`${API_BASE}/api/v1/kb/ingest-chunked`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": API_KEY,
    },
    body: JSON.stringify({
      action: "start",
      rawText,
      sourceTitle,
      sourceAuthor,
      sourceType,
    }),
  })

  if (!startRes.ok) {
    const err = await startRes.text()
    console.error(`❌ Eroare la start: ${startRes.status} ${err}`)
    process.exit(1)
  }

  const startData = await startRes.json()
  const { jobId, totalChunks, estimatedMinutes } = startData

  console.log(`   Job ID: ${jobId}`)
  console.log(`   Chunk-uri: ${totalChunks}`)
  console.log(`   Timp estimat: ~${estimatedMinutes} minute`)

  // 3. Procesează tranșe
  console.log("\n⚙️  Procesez chunk-uri...\n")

  let completed = false
  let totalEntries = 0
  let batch = 0

  while (!completed) {
    batch++
    const processRes = await fetch(`${API_BASE}/api/v1/kb/ingest-chunked`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": API_KEY,
      },
      body: JSON.stringify({
        action: "process",
        jobId,
        batchSize: 3,
      }),
    })

    if (!processRes.ok) {
      const err = await processRes.text()
      console.error(`\n❌ Eroare la batch ${batch}: ${processRes.status} ${err}`)
      console.log("   Poți relua cu: POST { action: 'process', jobId: '" + jobId + "' }")
      process.exit(1)
    }

    const data = await processRes.json()
    totalEntries = data.entriesCreated || 0
    const pct = data.completionPct || 0
    const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5))

    process.stdout.write(`\r   [${bar}] ${pct}% | ${data.processedUpTo}/${totalChunks} chunks | ${totalEntries} entries`)

    if (data.status === "COMPLETED") {
      completed = true
      console.log("\n")
      console.log(`✅ Ingestie completă!`)
      console.log(`   📊 ${totalEntries} entries create`)
      console.log(`   📦 Per rol:`)
      for (const [role, count] of Object.entries(data.byRole || {})) {
        console.log(`      ${role}: ${count}`)
      }
      break
    }

    if (data.status === "FAILED") {
      console.error(`\n❌ Job eșuat: ${data.error}`)
      process.exit(1)
    }

    // Pauză între tranșe (evită rate limit)
    await sleep(5000)
  }
}

main().catch(e => {
  console.error(`\n❌ Eroare: ${e.message}`)
  process.exit(1)
})
