import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/monitors/n8n-executions
 *
 * Read-only peste DB n8n (n8n_dev). Agregă execuțiile pe workflow în ultimele N ore
 * și returnează fail rate. Folosit de FLUX-043 pentru detecție D1 pe workflow-uri
 * cu rate eșec > prag.
 *
 * Query params:
 * - sinceMinutes: fereastra de analiză (default 60, max 1440)
 * - minSample: prag minim execuții pentru a raporta (default 3, evită zgomot)
 *
 * Principiu 05.04.2026: pur funcțional — numărăm succese/eșecuri, nu interpretăm.
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// Pool singleton — evită deschiderea de conexiuni la fiecare request
let pool: Pool | null = null
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL_N8N,
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  }
  return pool
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const sinceMinutes = Math.min(
    Math.max(parseInt(url.searchParams.get("sinceMinutes") ?? "60", 10) || 60, 1),
    1440,
  )
  const minSample = Math.max(
    parseInt(url.searchParams.get("minSample") ?? "3", 10) || 3,
    1,
  )

  try {
    const client = await getPool().connect()
    try {
      const { rows } = await client.query<{
        workflow_id: string
        total: string
        success: string
        error: string
        last_started: Date | null
      }>(
        `
        SELECT
          "workflowId"                                   AS workflow_id,
          COUNT(*)                                        AS total,
          COUNT(*) FILTER (WHERE status = 'success')      AS success,
          COUNT(*) FILTER (WHERE status = 'error')        AS error,
          MAX("startedAt")                                AS last_started
        FROM execution_entity
        WHERE "startedAt" > NOW() - ($1::int * INTERVAL '1 minute')
        GROUP BY "workflowId"
        HAVING COUNT(*) >= $2::int
        ORDER BY COUNT(*) FILTER (WHERE status = 'error') DESC
        `,
        [sinceMinutes, minSample],
      )

      const workflows = rows.map((r) => {
        const total = parseInt(r.total, 10)
        const success = parseInt(r.success, 10)
        const error = parseInt(r.error, 10)
        const failRate = total > 0 ? error / total : 0
        return {
          workflowId: r.workflow_id,
          total,
          success,
          error,
          failRate: Math.round(failRate * 10000) / 10000,
          lastStarted: r.last_started,
        }
      })

      return NextResponse.json({
        windowMinutes: sinceMinutes,
        minSample,
        workflows,
      })
    } finally {
      client.release()
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: "query_failed", detail: msg },
      { status: 500 },
    )
  }
}
