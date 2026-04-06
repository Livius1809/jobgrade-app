import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  const r = await prisma.orgProposal.updateMany({
    where: { title: { contains: "Metamorfoz" }, status: "REJECTED" },
    data: {
      status: "COG_REVIEWED",
      cogComment: "[OVERRIDE OWNER N1] Decizie strategică confirmată în sesiunea Owner+Claude 03.04.2026. Complexitatea e internă — clientul vede doar povestea lui. Modelul onion + spirala + Hawkins sunt validate. COG a primit context extins și învață. Prioritate: 1",
      reviewedByCog: true,
    },
  })
  process.stdout.write("Override: " + r.count + " propuneri actualizate\n")
  await prisma.$disconnect()
}
main()
