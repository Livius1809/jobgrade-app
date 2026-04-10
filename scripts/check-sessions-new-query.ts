/**
 * Simulează query-ul din /sessions/new pentru ultimul user fcj-*.
 * Verifică că fix-ul meu returnează într-adevăr jobs DRAFT + user COMPANY_ADMIN.
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

;(async () => {
  const user = await p.user.findFirst({
    where: { email: { startsWith: "fcj-" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, tenantId: true, firstName: true, lastName: true, role: true },
  })
  if (!user) return console.log("no user found")

  console.log(`\nUser: ${user.email} (tenantId: ${user.tenantId})\n`)

  // Query IDENTIC cu cel din /sessions/new/page.tsx (după fix)
  const [jobs, evaluators] = await Promise.all([
    p.job.findMany({
      where: { tenantId: user.tenantId, status: { in: ["ACTIVE", "DRAFT"] } },
      include: { department: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { title: "asc" }],
    }),
    p.user.findMany({
      where: {
        tenantId: user.tenantId,
        role: { in: ["OWNER", "COMPANY_ADMIN", "FACILITATOR", "REPRESENTATIVE"] },
        status: "ACTIVE",
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ])

  console.log(`Jobs returned: ${jobs.length}`)
  for (const j of jobs) console.log(`  - [${j.status}] ${j.title}`)
  console.log()
  console.log(`Evaluators returned: ${evaluators.length}`)
  for (const e of evaluators) console.log(`  - ${e.firstName} ${e.lastName} [${e.role}]`)

  await p.$disconnect()
})()
