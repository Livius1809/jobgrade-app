import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  const sessions = await prisma.brainstormSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, topic: true, status: true, createdAt: true },
  })
  for (const s of sessions) {
    process.stdout.write(`${s.id} | ${s.status} | ${s.topic}\n`)
  }
  await prisma.$disconnect()
}

main()
