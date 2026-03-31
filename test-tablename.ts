import { config } from "dotenv"
config()
import { PrismaClient } from "./src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

async function main() {
  // Verificare unaccent
  try {
    await prisma.$queryRaw`CREATE EXTENSION IF NOT EXISTS unaccent`
    const r = await prisma.$queryRaw<{res: string}[]>`SELECT unaccent('diferența') as res`
    console.log("unaccent OK:", r[0].res)
  } catch (e: any) {
    console.log("unaccent indisponibil:", e.message)
  }

  // Test FTS direct cu diacritice
  try {
    const r = await prisma.$queryRaw<any[]>`
      SELECT content FROM kb_entries
      WHERE "agentRole" = 'HR_COUNSELOR'
        AND status = 'PERMANENT'::"KBStatus"
        AND to_tsvector('simple', content) @@ plainto_tsquery('simple', 'evaluatori')
      LIMIT 1
    `
    console.log("FTS 'evaluatori' (exact):", r.length > 0 ? "✅ găsit" : "❌ negăsit")
  } catch (e: any) {
    console.log("FTS error:", e.message)
  }

  // Test ILIKE simplu
  try {
    const r = await prisma.$queryRaw<any[]>`
      SELECT content FROM kb_entries
      WHERE "agentRole" = 'HR_COUNSELOR'
        AND status = 'PERMANENT'::"KBStatus"
        AND content ILIKE '%evaluator%'
      LIMIT 1
    `
    console.log("ILIKE '%evaluator%':", r.length > 0 ? "✅ găsit" : "❌ negăsit")
    if (r.length > 0) console.log(" ", r[0].content.slice(0, 80))
  } catch (e: any) {
    console.log("ILIKE error:", e.message)
  }
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e.message); prisma.$disconnect() })
