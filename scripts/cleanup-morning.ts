process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
async function main() {
  const r = await prisma.agentTask.updateMany({ where: { status: "BLOCKED" }, data: { status: "CANCELLED", failureReason: "Cleanup 29.04: task infezabil stadiu actual" } })
  console.log("Blocked → Cancelled: " + r.count)
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
