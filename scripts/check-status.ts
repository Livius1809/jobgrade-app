import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  const proposals = await prisma.orgProposal.findMany({
    where: { proposedBy: "CLAUDE" },
    orderBy: { createdAt: "desc" },
    select: { title: true, status: true, cogComment: true },
  })
  process.stdout.write("=== PROPUNERI (" + proposals.length + ") ===\n")
  for (const p of proposals) {
    process.stdout.write(p.status.padEnd(15) + " | " + p.title.substring(0, 70) + "\n")
    if (p.cogComment) process.stdout.write("  COG: " + p.cogComment.substring(0, 120) + "\n")
  }

  const sessions = await prisma.brainstormSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { topic: true, status: true, _count: { select: { ideas: true } } },
  })
  process.stdout.write("\n=== BRAINSTORMS (" + sessions.length + ") ===\n")
  for (const s of sessions) {
    process.stdout.write(s.status.padEnd(15) + " | " + s._count.ideas + " idei | " + s.topic.substring(0, 65) + "\n")
  }

  await prisma.$disconnect()
}
main()
