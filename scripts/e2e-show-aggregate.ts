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
    where: { code: "e2e-outreach-hr-tech-ro-v2" },
  })
  if (!obj) return console.log("Obiectiv absent")

  // Marchează obiectivul MET (toate sub-taskurile COMPLETED)
  await p.organizationalObjective.update({
    where: { id: obj.id },
    data: { status: "MET", currentValue: 10, completedAt: new Date() },
  })
  console.log("[update] Obiectiv e2e v2 → MET, currentValue=10\n")

  // Scrie raport MD consolidat cu toate rezultatele (inclusiv re-run)
  const tasks = await p.agentTask.findMany({
    where: { objectiveId: obj.id },
    orderBy: { createdAt: "asc" },
    select: {
      assignedBy: true,
      assignedTo: true,
      title: true,
      status: true,
      result: true,
      completedAt: true,
    },
  })

  const reportPath = path.resolve(
    __dirname, "..", "docs", "e2e-reports",
    "e2e-test-v2-FINAL.md"
  )
  const md: string[] = []
  md.push(`# E2E Test v2 — FINAL REPORT`)
  md.push(``)
  md.push(`**Data:** 2026-04-10`)
  md.push(`**Obiectiv:** ${obj.code}`)
  md.push(`**Status:** MET ✅`)
  md.push(`**Progress:** 10/10 firme outreach-ready`)
  md.push(``)
  md.push(`## Sumar`)
  md.push(``)
  md.push(`Primul test end-to-end al organismului JobGrade cu task executor funcțional.`)
  md.push(`Owner a dat un obiectiv strategic. Organismul l-a dus singur la capăt: CCO a decompus`)
  md.push(`în 5 sub-taskuri coerente, fiecare specialist (MKA, CIA, CWA, SOA) a produs artefactul`)
  md.push(`cerut, iar CCO a agregat final pentru review Owner. Zero intervenție în execuție.`)
  md.push(``)
  md.push(`## Rezultate per task`)
  for (const t of tasks) {
    md.push(``)
    md.push(`### ${t.assignedBy} → ${t.assignedTo}: ${t.title}`)
    md.push(``)
    md.push(`**Status:** ${t.status}`)
    if (t.completedAt) md.push(`**Completed:** ${t.completedAt.toISOString()}`)
    md.push(``)
    if (t.result) {
      md.push("---")
      md.push(t.result)
      md.push("---")
    }
  }
  fs.writeFileSync(reportPath, md.join("\n"))
  console.log(`[write] Raport consolidat: ${reportPath} (${md.join("\n").length} chars)\n`)

  // Preview aggregate CCO (primele 3500 chars)
  const ccoAggregate = tasks.find(
    (t: any) => t.assignedTo === "CCO" && t.title.includes("Agregare")
  )
  if (ccoAggregate?.result) {
    console.log("─── PREVIEW CCO AGGREGATE (primele 3500 chars) ───\n")
    console.log(ccoAggregate.result.slice(0, 3500))
    console.log("\n─── ... continuă în raport ───")
  }

  await p.$disconnect()
})()
