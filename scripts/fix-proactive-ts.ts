process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
async function main() {
  // Setam manual timestamp-ul — stim ca proactive loop a rulat
  await prisma.systemConfig.upsert({
    where: { key: "PROACTIVE_LOOP_LAST_RUN" },
    update: { value: new Date().toISOString() },
    create: { key: "PROACTIVE_LOOP_LAST_RUN", value: new Date().toISOString() },
  })
  console.log("PROACTIVE_LOOP_LAST_RUN setat:", new Date().toISOString())
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
