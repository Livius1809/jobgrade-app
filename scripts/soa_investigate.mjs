import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  // 1. Definiția agentului
  const agent = await pool.query(
    `SELECT "agentRole", "displayName", "level", "isManager", "isActive",
            "activityMode", "cycleIntervalHours", "objectives", "createdBy",
            "createdAt", "updatedAt"
     FROM agent_definitions WHERE "agentRole" = 'SOA'`
  )
  console.log('=== SOA DEFINITION ===')
  if (agent.rows.length === 0) { console.log('(nu exista)'); process.exit(0) }
  const a = agent.rows[0]
  console.log(`  displayName: ${a.displayName}`)
  console.log(`  level: ${a.level}, isManager: ${a.isManager}, isActive: ${a.isActive}`)
  console.log(`  activityMode: ${a.activityMode}`)
  console.log(`  cycleIntervalHours: ${a.cycleIntervalHours}`)
  console.log(`  objectives: ${JSON.stringify(a.objectives)}`)
  console.log(`  createdBy: ${a.createdBy}`)
  console.log(`  createdAt: ${a.createdAt?.toISOString()}`)
  console.log(`  updatedAt: ${a.updatedAt?.toISOString()}`)

  // 2. Ultimele cicluri ale SOA ca manager
  const cyclesAsManager = await pool.query(
    `SELECT "managerRole", "targetRole", "actionType", "createdAt"
     FROM cycle_logs WHERE "managerRole" = 'SOA'
     ORDER BY "createdAt" DESC LIMIT 10`
  )
  console.log(`\n=== CYCLE_LOGS cu SOA ca manager (${cyclesAsManager.rowCount} total in top 10) ===`)
  for (const r of cyclesAsManager.rows) {
    console.log(`  ${r.createdAt.toISOString()} ${r.actionType} -> ${r.targetRole}`)
  }

  // 3. SOA ca target (primeste interventii?)
  const cyclesAsTarget = await pool.query(
    `SELECT "managerRole", "actionType", "createdAt"
     FROM cycle_logs WHERE "targetRole" = 'SOA'
     ORDER BY "createdAt" DESC LIMIT 10`
  )
  console.log(`\n=== SOA ca target (primeste interventii) ===`)
  for (const r of cyclesAsTarget.rows) {
    console.log(`  ${r.createdAt.toISOString()} ${r.actionType} de la ${r.managerRole}`)
  }

  // 4. AgentMetric — ultima perioada
  const metrics = await pool.query(
    `SELECT "periodStart", "periodEnd", "tasksCompleted", "tasksFailed"
     FROM agent_metrics WHERE "agentRole" = 'SOA'
     ORDER BY "periodEnd" DESC LIMIT 5`
  )
  console.log(`\n=== AgentMetric pentru SOA (${metrics.rowCount} ultimele) ===`)
  for (const r of metrics.rows) {
    console.log(`  ${r.periodStart.toISOString()} -> ${r.periodEnd.toISOString()} tasks: ok=${r.tasksCompleted} fail=${r.tasksFailed}`)
  }

  // 5. Relatii in organigrama (subordonati, superiori)
  const rels = await pool.query(
    `SELECT ar.type, p."agentRole" AS parent, c."agentRole" AS child
     FROM agent_relationships ar
     JOIN agent_definitions p ON ar."parentAgentId" = p.id
     JOIN agent_definitions c ON ar."childAgentId" = c.id
     WHERE p."agentRole" = 'SOA' OR c."agentRole" = 'SOA'`
  )
  console.log(`\n=== RELATII ORGANIGRAMA ===`)
  for (const r of rels.rows) {
    console.log(`  ${r.parent} --${r.type}--> ${r.child}`)
  }
} catch (e) {
  console.error('FAIL:', e.message); process.exit(1)
} finally { await pool.end() }
