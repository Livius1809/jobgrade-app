import { config } from "dotenv"
config()

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function check() {
  const user = await prisma.user.findFirst({ where: { email: "owner@techvision.ro" } })
  if (!user) {
    console.log("❌ User not found")
    await prisma.$disconnect()
    return
  }
  console.log("✅ User found:", user.email)
  console.log("   Status:", user.status)
  console.log("   Role:", user.role)
  console.log("   Hash (first 20):", user.passwordHash?.substring(0, 20))
  console.log("   Hash length:", user.passwordHash?.length)

  const valid = await bcrypt.compare("Demo2026!", user.passwordHash || "")
  console.log("   bcrypt.compare result:", valid)

  await prisma.$disconnect()
}

check()
