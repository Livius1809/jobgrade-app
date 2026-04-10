/**
 * backup-neon-prod.ts — Backup manual pentru DB-ul de producție Neon.
 *
 * Neon Pro oferă nativ point-in-time restore 7 zile (incluse în plan).
 * Acest script e pentru backup-uri EXPLICITE la milestone-uri importante:
 *  - Înainte de deploy nou
 *  - Înainte de migrare Prisma majoră
 *  - Înainte de acțiuni bulk (delete, update massive)
 *  - Arhivare lunară off-site (S3, local, alt tenant Neon)
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backup-neon-prod.ts
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backup-neon-prod.ts --label="pre-deploy-v1.2"
 *
 * Output: backups/neon-{timestamp}-{label}.sql.gz
 *
 * Prerequisite:
 *   - pg_dump instalat local (vine cu postgresql-client)
 *     Windows: https://www.postgresql.org/download/windows/
 *     macOS: brew install postgresql
 *     Ubuntu: sudo apt install postgresql-client
 *   - gzip (vine cu git-bash pe Windows, nativ pe Unix)
 */
import "dotenv/config"
import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"

function parseArgs(): { label: string } {
  const args = process.argv.slice(2)
  let label = "manual"
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--label" && args[i + 1]) {
      label = args[i + 1].replace(/[^a-zA-Z0-9_-]/g, "-")
      i++
    } else if (args[i].startsWith("--label=")) {
      label = args[i].slice(8).replace(/[^a-zA-Z0-9_-]/g, "-")
    }
  }
  return { label }
}

function checkPgDump(): boolean {
  try {
    execSync("pg_dump --version", { stdio: "pipe" })
    return true
  } catch {
    return false
  }
}

function redactUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ":***@")
}

async function main() {
  const { label } = parseArgs()

  console.log("\n═══ Backup Neon Production DB ═══\n")

  // 1. Verifică DATABASE_URL
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error("❌ DATABASE_URL nu e setat")
    console.error("   Usage: DATABASE_URL='postgresql://...' npx tsx scripts/backup-neon-prod.ts")
    process.exit(1)
  }
  console.log(`DATABASE_URL: ${redactUrl(dbUrl)}`)

  // 2. Verifică pg_dump disponibil
  if (!checkPgDump()) {
    console.error("\n❌ pg_dump nu e disponibil în PATH")
    console.error("   Instalează PostgreSQL client:")
    console.error("   - Windows: https://www.postgresql.org/download/windows/")
    console.error("   - macOS: brew install postgresql")
    console.error("   - Ubuntu: sudo apt install postgresql-client")
    process.exit(1)
  }

  // 3. Creează folder backups/ dacă nu există
  const backupsDir = path.resolve(__dirname, "..", "backups")
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
  }

  // 4. Numele fișierului cu timestamp ISO (sigur pe Windows filename)
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const filename = `neon-${timestamp}-${label}.sql`
  const filepath = path.join(backupsDir, filename)
  const gzPath = `${filepath}.gz`

  console.log(`\nLabel: ${label}`)
  console.log(`Output: ${gzPath}`)
  console.log()

  // 5. Safety: dacă DATABASE_URL e dev/localhost, avertisment
  const looksLikeDev =
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("_dev")
  if (looksLikeDev) {
    console.log("⚠️  DATABASE_URL pare să fie un DB dev, nu prod. Continui oricum.\n")
  }

  // 6. Rulează pg_dump
  console.log("▶ Rulez: pg_dump --no-owner --no-privileges (schema + data)")
  console.log()

  const startTime = Date.now()
  try {
    execSync(
      `pg_dump --no-owner --no-privileges --format=plain --file="${filepath}" "${dbUrl}"`,
      { stdio: "inherit" },
    )
  } catch (e: any) {
    console.error("\n❌ pg_dump eșuat:", e.message)
    console.error("   Verifică:")
    console.error("   - Conexiunea la Neon (firewall, VPN)")
    console.error("   - Credențialele din DATABASE_URL")
    console.error("   - Versiunea pg_dump compatibilă cu PostgreSQL 15+")
    process.exit(1)
  }

  // 7. Gzip compression
  console.log("\n▶ Compresare gzip...")
  try {
    execSync(`gzip -9 "${filepath}"`, { stdio: "inherit" })
  } catch (e: any) {
    console.error("\n⚠️  gzip eșuat — fișierul rămâne necomprimat:")
    console.error(`   ${filepath}`)
    // Non-fatal
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000)

  // 8. Verifică fișierul final
  const finalPath = fs.existsSync(gzPath) ? gzPath : filepath
  const stats = fs.statSync(finalPath)
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)

  console.log()
  console.log("─".repeat(60))
  console.log("✅ BACKUP REUȘIT")
  console.log(`   File:     ${finalPath}`)
  console.log(`   Size:     ${sizeMB} MB`)
  console.log(`   Duration: ${durationSec}s`)
  console.log()

  // 9. Instrucțiuni restore
  console.log("─── Cum să restaurezi ───")
  console.log(`   # Pe DB nou/gol:`)
  if (finalPath.endsWith(".gz")) {
    console.log(`   gunzip -c "${finalPath}" | psql "\$DATABASE_URL"`)
  } else {
    console.log(`   psql "\$DATABASE_URL" < "${finalPath}"`)
  }
  console.log()
  console.log("─── Point-in-time restore (Neon Pro nativ) ───")
  console.log("   1. Neon Console → Branch production → Restore")
  console.log("   2. Selectează timestamp exact (granularitate 1s, ultimele 7 zile)")
  console.log("   3. Creează branch nou 'restored-<timestamp>'")
  console.log("   4. Testează pe branch-ul nou, apoi promovează dacă e OK")
  console.log()

  // 10. Cleanup: păstrează doar ultimele N backups
  const KEEP_LAST = 10
  const allBackups = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith("neon-") && (f.endsWith(".sql") || f.endsWith(".sql.gz")))
    .map((f) => ({
      name: f,
      path: path.join(backupsDir, f),
      mtime: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime)

  if (allBackups.length > KEEP_LAST) {
    console.log(`── Cleanup: păstrez doar ultimele ${KEEP_LAST} backups ──`)
    const toDelete = allBackups.slice(KEEP_LAST)
    for (const b of toDelete) {
      fs.unlinkSync(b.path)
      console.log(`   🗑  Șters: ${b.name}`)
    }
    console.log()
  }
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
