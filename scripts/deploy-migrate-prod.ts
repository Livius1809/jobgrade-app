/**
 * deploy-migrate-prod.ts — Helper safe pentru aplicarea migrărilor Prisma
 * pe DB-ul de producție. Include verificări multiple pentru a evita
 * modificări accidentale pe DB-ul greșit.
 *
 * Usage:
 *   DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler.../neondb?sslmode=require" \
 *     npx tsx scripts/deploy-migrate-prod.ts
 *
 * Flow:
 *   1. Verifică că DATABASE_URL e setat și arată spre prod (nu dev)
 *   2. Conectare test (SELECT 1)
 *   3. Afișează lista migrărilor neaplicate
 *   4. Cere confirmare explicită (y/N)
 *   5. Rulează prisma migrate deploy
 *   6. Post-verificare: număr tabele
 */
import { execSync } from "node:child_process"
import * as readline from "node:readline"

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function redactUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ":***@")
}

async function main() {
  console.log("\n═══ Prisma Migrate Deploy — PROD safe ═══\n")

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error("❌ DATABASE_URL nu e setat")
    console.error("   Usage: DATABASE_URL='postgresql://...' npx tsx scripts/deploy-migrate-prod.ts")
    process.exit(1)
  }

  // Safety: avertizează dacă URL arată ca dev
  const looksLikeDev =
    dbUrl.includes("localhost") ||
    dbUrl.includes("jobgrade_dev") ||
    dbUrl.includes("test")

  console.log(`DATABASE_URL: ${redactUrl(dbUrl)}`)
  console.log()

  if (looksLikeDev) {
    console.log("⚠️  URL-ul pare să fie un DB de dev/test, nu prod.")
    const ok = await prompt("Continui oricum? (da/nu): ")
    if (ok.toLowerCase() !== "da") {
      console.log("❌ Anulat.")
      process.exit(0)
    }
  }

  // Confirmă clar intenția
  console.log("ATENȚIE: Această comandă va aplica toate migrările Prisma pe DB-ul de mai sus.")
  console.log("Operațiunea include: create tables, alter columns, indexes, enum-uri.")
  console.log("Ireversibil fără backup (Neon Pro oferă point-in-time restore 7 zile).")
  console.log()
  const confirmed = await prompt("Scrie 'APLICA MIGRARI' pentru a continua: ")
  if (confirmed !== "APLICA MIGRARI") {
    console.log("❌ Anulat. Nu ai confirmat exact 'APLICA MIGRARI'.")
    process.exit(0)
  }

  console.log()
  console.log("▶ Rulez: npx prisma migrate deploy")
  console.log()

  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: dbUrl },
    })
    console.log()
    console.log("✅ Migrare aplicată cu succes")
    console.log()
    console.log("Următorul pas: seed minimal criterii")
    console.log("  DATABASE_URL='...' npx tsx prisma/seed.ts")
    console.log()
    console.log("Nu rula seed-demo.ts pe prod — e doar pentru dev.")
  } catch (e: any) {
    console.error()
    console.error("❌ Migrare eșuată:", e.message)
    console.error()
    console.error("Rollback: dacă ai Neon Pro, poți restore DB la un moment anterior")
    console.error("  Neon Console → Branch → Restore to point in time")
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
