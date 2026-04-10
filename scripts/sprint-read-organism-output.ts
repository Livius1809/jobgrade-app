import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import * as fs from "node:fs"
import * as path from "node:path"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

;(async () => {
  const obj = await p.organizationalObjective.findFirst({
    where: { code: "sprint-demo-ready-b2b-v1" },
  })
  if (!obj) return console.log("Obiectiv lipsă")

  const tasks = await p.agentTask.findMany({
    where: { objectiveId: obj.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      assignedTo: true,
      title: true,
      status: true,
      result: true,
      failureReason: true,
    },
  })

  // Scrie fiecare output într-un fișier separat pentru review
  const outDir = path.resolve(__dirname, "..", "docs", "e2e-reports", "sprint-demo-ready")
  fs.mkdirSync(outDir, { recursive: true })

  for (const t of tasks) {
    const fname = `${t.assignedTo}-${t.status}.md`
    const body = [
      `# ${t.assignedTo} — ${t.title}`,
      ``,
      `**Status:** ${t.status}`,
      `**Task ID:** ${t.id}`,
      ``,
      `---`,
      ``,
      t.result || `**FAILED:** ${t.failureReason || "no reason"}`,
    ].join("\n")
    fs.writeFileSync(path.join(outDir, fname), body)
  }

  console.log(`\nScrise ${tasks.length} fișiere în ${outDir}\n`)
  for (const t of tasks) {
    console.log(
      `${t.status.padEnd(10)} ${t.assignedTo.padEnd(8)} ${(t.result?.length || 0).toString().padStart(6)}ch  ${t.title.slice(0, 60)}`,
    )
  }

  await p.$disconnect()
})()
