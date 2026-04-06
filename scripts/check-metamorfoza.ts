import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  const r = await prisma.orgProposal.findFirst({
    where: { title: { contains: "Metamorfoz" } },
    select: { title: true, status: true, cogComment: true },
  })
  if (r) {
    process.stdout.write("Status: " + r.status + "\n")
    process.stdout.write("COG: " + (r.cogComment || "none") + "\n")
  } else {
    process.stdout.write("Not found\n")
  }
  await prisma.$disconnect()
}
main()
