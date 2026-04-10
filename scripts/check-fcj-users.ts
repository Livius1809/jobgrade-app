import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

;(async () => {
  const users = await p.user.findMany({
    where: { email: { startsWith: "fcj-" } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      tenantId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  })

  console.log(`\nUltimii ${users.length} useri fcj-*:\n`)
  for (const u of users) {
    console.log(`  ${u.email}`)
    console.log(`    id=${u.id}`)
    console.log(`    firstName=${u.firstName} lastName=${u.lastName}`)
    console.log(`    role=${u.role} status=${u.status}`)
    console.log(`    tenantId=${u.tenantId}`)
    console.log()

    // Check jobs pentru acest tenant
    const jobs = await p.job.findMany({
      where: { tenantId: u.tenantId },
      select: { id: true, title: true, status: true },
    })
    console.log(`    Joburi pentru acest tenant: ${jobs.length}`)
    for (const j of jobs) {
      console.log(`      - [${j.status}] ${j.title}`)
    }
    console.log()
  }

  await p.$disconnect()
})()
