import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function verifyInternalAuth(req: NextRequest): boolean {
  // Allow browser calls (from owner pages) via special marker
  if (req.headers.get("x-internal-key") === "__browser__") return true
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * Strategic Themes are stored in SystemConfig as a JSON array
 * since the StrategicTheme model does not exist yet in the schema.
 * Key: "STRATEGIC_THEMES"
 *
 * Each theme: { id, name, description, objectiveCodes[], status, createdAt, archivedAt? }
 */

interface StrategicThemeData {
  id: string
  name: string
  description: string
  objectiveCodes: string[]
  status: "ACTIVE" | "ARCHIVED"
  createdAt: string
  archivedAt?: string
}

async function getThemes(): Promise<StrategicThemeData[]> {
  const p = prisma as any
  const config = await p.systemConfig.findUnique({ where: { key: "STRATEGIC_THEMES" } }).catch(() => null)
  if (!config) return []
  try {
    return JSON.parse(config.value) as StrategicThemeData[]
  } catch {
    return []
  }
}

async function saveThemes(themes: StrategicThemeData[]) {
  const p = prisma as any
  await p.systemConfig.upsert({
    where: { key: "STRATEGIC_THEMES" },
    create: { key: "STRATEGIC_THEMES", value: JSON.stringify(themes) },
    update: { value: JSON.stringify(themes) },
  })
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const themes = await getThemes()
    const p = prisma as any

    // Enrich with objective progress
    const allObjectives = await p.organizationalObjective.findMany({
      where: { businessId: "biz_jobgrade" },
      select: { code: true, status: true, currentValue: true, targetValue: true },
    }).catch(() => [])

    const objMap: Record<string, any> = {}
    for (const obj of allObjectives as any[]) {
      objMap[obj.code] = obj
    }

    const enriched = themes.map((theme) => {
      const linked = theme.objectiveCodes.map((code) => {
        const obj = objMap[code]
        return {
          code,
          status: obj?.status || "UNKNOWN",
          progress: obj?.targetValue
            ? Math.min(100, Math.round(((obj.currentValue || 0) / obj.targetValue) * 100))
            : null,
        }
      })
      const completedCount = linked.filter((o) => o.status === "COMPLETED").length
      const totalLinked = linked.length

      return {
        ...theme,
        objectives: linked,
        progress: totalLinked > 0 ? Math.round((completedCount / totalLinked) * 100) : 0,
      }
    })

    return NextResponse.json({ themes: enriched })
  } catch (error) {
    console.error("[strategic-themes] GET Error:", error)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, themeId, name, description, objectiveCodes } = body

    const themes = await getThemes()

    if (action === "create") {
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
      const newTheme: StrategicThemeData = {
        id: `theme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        description: description || "",
        objectiveCodes: objectiveCodes || [],
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      }
      themes.push(newTheme)
      await saveThemes(themes)
      return NextResponse.json({ ok: true, theme: newTheme })
    }

    if (action === "update") {
      if (!themeId) return NextResponse.json({ error: "themeId required" }, { status: 400 })
      const idx = themes.findIndex((t) => t.id === themeId)
      if (idx === -1) return NextResponse.json({ error: "theme not found" }, { status: 404 })
      if (name !== undefined) themes[idx].name = name
      if (description !== undefined) themes[idx].description = description
      if (objectiveCodes !== undefined) themes[idx].objectiveCodes = objectiveCodes
      await saveThemes(themes)
      return NextResponse.json({ ok: true, theme: themes[idx] })
    }

    if (action === "archive") {
      if (!themeId) return NextResponse.json({ error: "themeId required" }, { status: 400 })
      const idx = themes.findIndex((t) => t.id === themeId)
      if (idx === -1) return NextResponse.json({ error: "theme not found" }, { status: 404 })
      themes[idx].status = "ARCHIVED"
      themes[idx].archivedAt = new Date().toISOString()
      await saveThemes(themes)
      return NextResponse.json({ ok: true, theme: themes[idx] })
    }

    if (action === "activate") {
      if (!themeId) return NextResponse.json({ error: "themeId required" }, { status: 400 })
      const idx = themes.findIndex((t) => t.id === themeId)
      if (idx === -1) return NextResponse.json({ error: "theme not found" }, { status: 404 })
      themes[idx].status = "ACTIVE"
      themes[idx].archivedAt = undefined
      await saveThemes(themes)
      return NextResponse.json({ ok: true, theme: themes[idx] })
    }

    if (action === "delete") {
      if (!themeId) return NextResponse.json({ error: "themeId required" }, { status: 400 })
      const filtered = themes.filter((t) => t.id !== themeId)
      await saveThemes(filtered)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 })
  } catch (error) {
    console.error("[strategic-themes] POST Error:", error)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
