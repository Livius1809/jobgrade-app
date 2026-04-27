// Fix CSSA notification — ruleaza cu DATABASE_URL prod
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const host = new URL(process.env.DATABASE_URL!).host
  console.log("DB:", host)

  const cssa = await (prisma as any).notification.updateMany({
    where: { respondedAt: null, type: "AGENT_MESSAGE", sourceRole: "CSSA" },
    data: { respondedAt: new Date(), responseKind: "ADJUSTED", read: true },
  })
  console.log("CSSA rezolvat:", cssa.count)

  const rest = await (prisma as any).notification.findMany({
    where: { respondedAt: null, type: "AGENT_MESSAGE" },
    select: { sourceRole: true, title: true },
  })
  console.log("Ramase active:", rest.length)
  rest.forEach((n: any) => console.log("  " + n.sourceRole + ": " + (n.title || "").slice(0, 60)))
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
