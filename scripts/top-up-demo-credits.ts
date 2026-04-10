import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

;(async () => {
  const tenant = await p.tenant.findUnique({ where: { slug: "demo-company" } })
  if (!tenant) return console.log("Demo tenant absent")

  await p.creditBalance.upsert({
    where: { tenantId: tenant.id },
    update: { balance: 1000 },
    create: { tenantId: tenant.id, balance: 1000 },
  })
  console.log(`Demo tenant ${tenant.name}: credits → 1000`)
  await p.$disconnect()
})()
