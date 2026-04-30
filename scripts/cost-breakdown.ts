process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
async function main() {
  // Per day cost
  const daily: any[] = await prisma.$queryRaw`
    SELECT DATE("createdAt") as day, COUNT(*) as calls, 
      ROUND(SUM("estimatedCostUSD")::numeric, 2) as cost,
      SUM(CASE WHEN "kbHit" THEN 1 ELSE 0 END) as kb_hits,
      SUM(CASE WHEN "modelUsed" = 'kb-cached' THEN 1 ELSE 0 END) as kb_cached
    FROM execution_telemetry
    GROUP BY DATE("createdAt")
    ORDER BY day DESC
    LIMIT 7
  `
  console.log("=== COST PER ZI ===")
  console.log("Zi          | Apeluri | Cost    | KB-hit | KB-cached")
  for (const d of daily) {
    console.log(`${d.day} | ${String(Number(d.calls)).padStart(7)} | $${String(Number(d.cost)).padStart(6)} | ${String(Number(d.kb_hits)).padStart(6)} | ${Number(d.kb_cached)}`)
  }

  // Tasks completed today vs Claude calls today
  const today: any[] = await prisma.$queryRaw`
    SELECT 
      (SELECT COUNT(*) FROM agent_tasks WHERE status = 'COMPLETED' AND "completedAt"::date = CURRENT_DATE) as tasks_today,
      (SELECT COUNT(*) FROM execution_telemetry WHERE "createdAt"::date = CURRENT_DATE) as calls_today,
      (SELECT COUNT(*) FROM execution_telemetry WHERE "createdAt"::date = CURRENT_DATE AND "kbHit" = true) as kb_today,
      (SELECT COUNT(*) FROM execution_telemetry WHERE "createdAt"::date = CURRENT_DATE AND "modelUsed" = 'kb-cached') as cached_today
  `
  console.log("\n=== AZI ===")
  console.log("Tasks completate: " + Number(today[0]?.tasks_today || 0))
  console.log("Apeluri Claude: " + Number(today[0]?.calls_today || 0))
  console.log("KB-hit: " + Number(today[0]?.kb_today || 0))
  console.log("KB-cached: " + Number(today[0]?.cached_today || 0))

  // Who's calling Claude today?
  const whoToday: any[] = await prisma.$queryRaw`
    SELECT "agentRole", COUNT(*) as calls, ROUND(SUM("estimatedCostUSD")::numeric, 3) as cost
    FROM execution_telemetry
    WHERE "createdAt"::date = CURRENT_DATE
    GROUP BY "agentRole"
    ORDER BY cost DESC
    LIMIT 15
  `
  console.log("\n=== CINE APELEAZA AZI ===")
  for (const w of whoToday) console.log("  " + w.agentRole + ": " + Number(w.calls) + " apeluri, $" + Number(w.cost))
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
