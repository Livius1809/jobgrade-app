import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  importMarketData,
  queryBenchmarks,
  getLatestMedians,
  compareBulk,
  getMarketSummaries,
  getYoYTrends,
  SEED_DATA_RO_2025,
} from "@/lib/benchmark"

/**
 * GET /api/v1/benchmark
 *
 * Query params:
 *   action: "query" | "summaries" | "medians" | "trends" | "compare"
 *   jobFamily: filtru pe familie
 *   grade: filtru pe grad (1-8)
 *   seniorityLevel: ENTRY | MID | SENIOR | LEAD | EXECUTIVE
 *   year: an
 *   region: regiune
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const url = request.nextUrl
  const action = url.searchParams.get("action") || "summaries"
  const jobFamily = url.searchParams.get("jobFamily") || undefined
  const grade = url.searchParams.get("grade") ? Number(url.searchParams.get("grade")) : undefined
  const seniorityLevel = url.searchParams.get("seniorityLevel") || undefined
  const year = url.searchParams.get("year") ? Number(url.searchParams.get("year")) : undefined
  const region = url.searchParams.get("region") || undefined

  try {
    switch (action) {
      case "summaries": {
        const summaries = await getMarketSummaries(prisma)
        return NextResponse.json({ summaries })
      }

      case "query": {
        const data = await queryBenchmarks(
          { jobFamily, grade, seniorityLevel, year, region },
          prisma
        )
        return NextResponse.json({ data, count: data.length })
      }

      case "medians": {
        if (!jobFamily) {
          return NextResponse.json(
            { error: "Parametrul jobFamily este obligatoriu pentru action=medians" },
            { status: 400 }
          )
        }
        const medians = await getLatestMedians(jobFamily, prisma)
        return NextResponse.json({ jobFamily, medians })
      }

      case "trends": {
        if (!jobFamily) {
          return NextResponse.json(
            { error: "Parametrul jobFamily este obligatoriu pentru action=trends" },
            { status: 400 }
          )
        }
        const trends = await getYoYTrends(jobFamily, prisma)
        return NextResponse.json({ jobFamily, trends })
      }

      default:
        return NextResponse.json(
          { error: `Acțiune necunoscută: ${action}. Opțiuni: summaries, query, medians, trends` },
          { status: 400 }
        )
    }
  } catch (err: any) {
    console.error("[benchmark GET]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/v1/benchmark
 *
 * Body:
 *   action: "import" | "seed" | "compare"
 *
 *   For "import": { data: MarketDataPoint[] }
 *   For "seed": {} (imports SEED_DATA_RO_2025)
 *   For "compare": { entries: PayrollBenchmarkInput[] }
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  // Only OWNER/SUPER_ADMIN can import benchmark data
  const role = session.user.role
  if (role !== "OWNER" && role !== "SUPER_ADMIN" && role !== "COMPANY_ADMIN") {
    return NextResponse.json(
      { error: "Doar administratorii pot importa date benchmark" },
      { status: 403 }
    )
  }

  const body = await request.json()
  const action = body.action || "import"

  try {
    switch (action) {
      case "seed": {
        const result = await importMarketData(SEED_DATA_RO_2025, prisma)
        return NextResponse.json({
          message: `Seed RO 2025 completat: ${result.imported} importate, ${result.skipped} duplicate.`,
          ...result,
        })
      }

      case "import": {
        if (!body.data || !Array.isArray(body.data)) {
          return NextResponse.json(
            { error: "Câmpul 'data' (array) este obligatoriu" },
            { status: 400 }
          )
        }
        const result = await importMarketData(body.data, prisma)
        return NextResponse.json({
          message: `Import completat: ${result.imported} importate, ${result.skipped} duplicate, ${result.errors.length} erori.`,
          ...result,
        })
      }

      case "compare": {
        if (!body.entries || !Array.isArray(body.entries)) {
          return NextResponse.json(
            { error: "Câmpul 'entries' (array) este obligatoriu pentru compare" },
            { status: 400 }
          )
        }
        const result = await compareBulk(body.entries, prisma)
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json(
          { error: `Acțiune necunoscută: ${action}. Opțiuni: seed, import, compare` },
          { status: 400 }
        )
    }
  } catch (err: any) {
    console.error("[benchmark POST]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
