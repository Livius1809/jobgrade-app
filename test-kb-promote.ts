import { config } from "dotenv"
config()
import { PrismaClient } from "./src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const THRESHOLD_OCCURRENCES = 3
const THRESHOLD_SUCCESS_RATE = 0.70
const THRESHOLD_CONFLICT_CONFIDENCE = 0.85

async function evaluateBuffer(bufferId: string, agentRole: string) {
  const buffer = await prisma.kBBuffer.findUnique({ where: { id: bufferId } })
  if (!buffer || buffer.agentRole !== agentRole || buffer.status !== "PENDING") {
    return { decision: "ERROR", reason: "Buffer invalid." }
  }

  if (buffer.occurrences < THRESHOLD_OCCURRENCES) {
    return { decision: "PENDING_MORE_DATA", reason: `occurrences ${buffer.occurrences}/${THRESHOLD_OCCURRENCES}` }
  }

  if (buffer.totalOutcomes > 0) {
    const rate = buffer.positiveOutcomes / buffer.totalOutcomes
    if (rate < THRESHOLD_SUCCESS_RATE) {
      await prisma.kBBuffer.update({ where: { id: bufferId }, data: { status: "REJECTED", reviewedAt: new Date() } })
      return { decision: "REJECTED_LOW_SUCCESS", reason: `successRate=${(rate*100).toFixed(0)}%` }
    }
  }

  const words = buffer.rawContent.slice(0, 80).toLowerCase().split(/\s+/).filter(w => w.length >= 4).slice(0, 5)
  const orQuery = words.join(" | ")
  const duplicate = orQuery ? await prisma.$queryRaw<{id:string,confidence:number}[]>`
    SELECT id, confidence FROM kb_entries
    WHERE "agentRole" = ${agentRole}
      AND status = 'PERMANENT'::"KBStatus"
      AND confidence > ${THRESHOLD_CONFLICT_CONFIDENCE}
      AND to_tsvector('simple', unaccent(content)) @@ to_tsquery('simple', unaccent(${orQuery}))
    LIMIT 1
  ` : []

  if (duplicate.length > 0) {
    return { decision: "REJECTED_DUPLICATE", reason: `Duplicat: id=${duplicate[0].id}` }
  }

  const confidence = buffer.totalOutcomes > 0
    ? Math.min(0.95, (buffer.positiveOutcomes / buffer.totalOutcomes) * 0.9)
    : 0.65

  const [entry] = await prisma.$transaction([
    prisma.kBEntry.create({
      data: {
        agentRole, kbType: "PERMANENT", content: buffer.rawContent,
        source: "DISTILLED_INTERACTION", confidence, status: "PERMANENT",
        tags: [], validatedAt: new Date(), usageCount: 0,
      },
    }),
    prisma.kBBuffer.update({ where: { id: bufferId }, data: { status: "APPROVED", reviewedAt: new Date() } }),
  ])

  return { decision: "PROMOTED", reason: `confidence=${confidence.toFixed(2)}`, entryId: entry.id }
}

async function main() {
  console.log("=== TEST /kb/promote ===\n")

  // Scenariul 1: frecvență insuficientă (occurrences=1)
  const b1 = await prisma.kBBuffer.create({
    data: { agentRole: "HR_COUNSELOR", rawContent: "Pattern test A: clientul timid are nevoie de validare înainte de a oferi opinii în grup.", occurrences: 1 }
  })
  const r1 = await evaluateBuffer(b1.id, "HR_COUNSELOR")
  console.log(`Scenariu 1 — frecvență insuficientă: ${r1.decision} (${r1.reason})`)
  console.log(`   Așteptat: PENDING_MORE_DATA ✅\n`)

  // Scenariul 2: succes rate prea mic (3 ocurențe, 1/4 pozitive = 25%)
  const b2 = await prisma.kBBuffer.create({
    data: {
      agentRole: "HR_COUNSELOR",
      rawContent: "Pattern test B: abordare care nu funcționează bine cu clienții directivi.",
      occurrences: 3, positiveOutcomes: 1, totalOutcomes: 4,
    }
  })
  const r2 = await evaluateBuffer(b2.id, "HR_COUNSELOR")
  console.log(`Scenariu 2 — succes rate mic: ${r2.decision} (${r2.reason})`)
  console.log(`   Așteptat: REJECTED_LOW_SUCCESS ✅\n`)

  // Scenariul 3: duplicat (conținut similar cu un PERMANENT existent)
  const b3 = await prisma.kBBuffer.create({
    data: {
      agentRole: "HR_COUNSELOR",
      rawContent: "Diferența dintre evaluatori la subfactori indică înțelegeri diferite ale rolului.",
      occurrences: 4, positiveOutcomes: 3, totalOutcomes: 4,
    }
  })
  const r3 = await evaluateBuffer(b3.id, "HR_COUNSELOR")
  console.log(`Scenariu 3 — duplicat: ${r3.decision} (${r3.reason})`)
  console.log(`   Așteptat: REJECTED_DUPLICATE ✅\n`)

  // Scenariul 4: promovare reușită (3+ ocurențe, succes bun, conținut nou)
  const b4 = await prisma.kBBuffer.create({
    data: {
      agentRole: "HR_COUNSELOR",
      rawContent: "Clienții din industria IT preferă scoruri exprimate în procente relative față de median, nu în puncte absolute. Reformularea rezultatelor în termeni de percentilă crește înțelegerea și acceptarea gradelor.",
      occurrences: 5, positiveOutcomes: 4, totalOutcomes: 5,
    }
  })
  const r4 = await evaluateBuffer(b4.id, "HR_COUNSELOR")
  console.log(`Scenariu 4 — promovare: ${r4.decision} (${r4.reason})`)
  console.log(`   Așteptat: PROMOTED ✅`)
  if (r4.entryId) console.log(`   KBEntry creat: ${r4.entryId}`)

  // Cleanup scenariile rămase în buffer
  await prisma.kBBuffer.deleteMany({ where: { id: { in: [b1.id, b3.id] } } })
  if (r4.decision === "PROMOTED") {
    // Cleanup entry de test
    await prisma.kBEntry.delete({ where: { id: r4.entryId } }).catch(() => {})
  }
  await prisma.kBBuffer.delete({ where: { id: b4.id } }).catch(() => {})

  // Verificare stare finală
  const bufferCount = await prisma.kBBuffer.count({ where: { agentRole: "HR_COUNSELOR" } })
  const entryCount = await prisma.kBEntry.count({ where: { agentRole: "HR_COUNSELOR" } })
  console.log(`\nStare finală HR_COUNSELOR: ${entryCount} entries, ${bufferCount} buffers`)
  console.log("\n=== DONE ===")
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
