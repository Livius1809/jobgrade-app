process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
async function main() {
  // Cauta entries cu "psiholingvistic" sau "slama" sau "cazacu"
  const entries = await prisma.kBEntry.findMany({
    where: {
      OR: [
        { content: { contains: "psiholingvistic", mode: "insensitive" } },
        { content: { contains: "Slama", mode: "insensitive" } },
        { content: { contains: "Cazacu", mode: "insensitive" } },
        { tags: { hasSome: ["psiholingvistica", "slama-cazacu", "slama"] } },
      ],
    },
    select: { agentRole: true, source: true, content: true, tags: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  console.log("Entries gasite: " + entries.length)
  for (const e of entries) {
    console.log("\n" + e.createdAt.toISOString().slice(0,16) + " | " + e.agentRole + " | " + e.status + " | " + e.source)
    console.log("  " + (e.content || "").slice(0, 150))
    if (e.tags?.length) console.log("  tags: " + e.tags.join(", "))
  }

  // Cauta si in learning artifacts
  const artifacts = await prisma.learningArtifact.findMany({
    where: {
      OR: [
        { rule: { contains: "psiholingvistic", mode: "insensitive" } },
        { rule: { contains: "Slama", mode: "insensitive" } },
      ],
    },
    select: { teacherRole: true, studentRole: true, rule: true, createdAt: true },
    take: 10,
  })
  if (artifacts.length > 0) {
    console.log("\nLearning artifacts: " + artifacts.length)
    for (const a of artifacts) console.log("  " + a.teacherRole + " → " + a.studentRole + ": " + (a.rule || "").slice(0, 100))
  }
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
