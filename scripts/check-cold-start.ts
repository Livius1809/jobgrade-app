process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("DB:", new URL(process.env.DATABASE_URL!).host)
  const p = prisma as any

  // Toti agentii activi
  let agents = await p.agent?.findMany({
    where: { isActive: true },
    select: { role: true, displayName: true },
  }).catch(() => []) ?? []

  if (agents.length === 0) {
    agents = await p.agentDefinition?.findMany({
      where: { isActive: true },
      select: { agentRole: true, displayName: true },
    }).catch(() => []) ?? []
    agents = agents.map((a: any) => ({ role: a.agentRole, displayName: a.displayName }))
  }

  console.log("Agenti activi:", agents.length)

  // Per agent: cate KB entries are
  const withoutKB: string[] = []
  const withKB: string[] = []

  for (const agent of agents) {
    const kbCount = await p.kBEntry?.count({
      where: { agentRole: agent.role, status: "PERMANENT" },
    }).catch(() => 0) ?? 0

    if (kbCount <= 1) { // 1 = doar meta-organism pe care tocmai l-am injectat
      withoutKB.push(`${agent.role} (${agent.displayName || "?"}) — ${kbCount} KB entries`)
    } else {
      withKB.push(`${agent.role} — ${kbCount} KB`)
    }
  }

  console.log("\n=== FARA COLD START (0-1 KB entries) ===")
  console.log("Total:", withoutKB.length)
  for (const a of withoutKB) console.log("  " + a)

  console.log("\n=== CU KB (au cold start sau cunoastere) ===")
  console.log("Total:", withKB.length)
  // Top 10 cu cele mai multe KB
  const sorted = withKB.sort((a, b) => {
    const numA = parseInt(a.split("— ")[1]) || 0
    const numB = parseInt(b.split("— ")[1]) || 0
    return numB - numA
  })
  for (const a of sorted.slice(0, 15)) console.log("  " + a)
  if (sorted.length > 15) console.log("  ... si inca " + (sorted.length - 15))
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
