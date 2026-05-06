import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ThemeActions, ThemeCreateForm } from "./ThemeActions"

export const metadata = { title: "Teme Strategice — Owner Dashboard" }
export const dynamic = "force-dynamic"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ObjectiveLink {
  code: string
  status: string
  progress: number | null
}

interface StrategicTheme {
  id: string
  name: string
  description: string
  objectiveCodes: string[]
  status: "ACTIVE" | "ARCHIVED"
  createdAt: string
  archivedAt?: string
  objectives: ObjectiveLink[]
  progress: number
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

async function fetchThemes(): Promise<StrategicTheme[]> {
  const p = prisma as any
  try {
    const config = await p.systemConfig.findUnique({ where: { key: "STRATEGIC_THEMES" } })
    if (!config) return []

    const themes = JSON.parse(config.value) as any[]

    // Enrich with objective progress
    const allObjectives = await p.organizationalObjective.findMany({
      where: { businessId: "biz_jobgrade" },
      select: { code: true, status: true, currentValue: true, targetValue: true },
    }).catch(() => [])

    const objMap: Record<string, any> = {}
    for (const obj of allObjectives as any[]) {
      objMap[obj.code] = obj
    }

    return themes.map((theme: any) => {
      const linked = (theme.objectiveCodes || []).map((code: string) => {
        const obj = objMap[code]
        return {
          code,
          status: obj?.status || "UNKNOWN",
          progress: obj?.targetValue
            ? Math.min(100, Math.round(((obj.currentValue || 0) / obj.targetValue) * 100))
            : null,
        }
      })
      const completedCount = linked.filter((o: ObjectiveLink) => o.status === "COMPLETED").length
      const totalLinked = linked.length

      return {
        ...theme,
        objectives: linked,
        progress: totalLinked > 0 ? Math.round((completedCount / totalLinked) * 100) : 0,
      }
    })
  } catch {
    return []
  }
}

async function fetchAvailableObjectives(): Promise<{ code: string; title: string; status: string }[]> {
  const p = prisma as any
  try {
    return await p.organizationalObjective.findMany({
      where: { businessId: "biz_jobgrade", status: { notIn: ["ARCHIVED"] } },
      select: { code: true, title: true, status: true },
      orderBy: { code: "asc" },
    })
  } catch {
    return []
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StrategicThemesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const themes = await fetchThemes()
  const objectives = await fetchAvailableObjectives()

  const activeThemes = themes.filter((t) => t.status === "ACTIVE")
  const archivedThemes = themes.filter((t) => t.status === "ARCHIVED")

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Teme Strategice</h1>
            <p className="text-sm text-slate-500 mt-1">
              Defineste si urmareste temele strategice ale organizatiei
            </p>
          </div>
          <Link href="/owner" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← Inapoi la Dashboard
          </Link>
        </div>

        {/* Create new theme form */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Creeaza tema noua</h2>
          <ThemeCreateForm objectives={objectives} />
        </div>

        {/* Active Themes */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Teme active ({activeThemes.length})
          </h2>
          {activeThemes.length === 0 ? (
            <div className="bg-white rounded-xl border p-6 text-center text-slate-500">
              Nicio tema strategica activa. Creeaza una mai sus.
            </div>
          ) : (
            <div className="space-y-4">
              {activeThemes.map((theme) => (
                <ThemeCard key={theme.id} theme={theme} />
              ))}
            </div>
          )}
        </div>

        {/* Archived Themes */}
        {archivedThemes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Teme arhivate ({archivedThemes.length})
            </h2>
            <div className="space-y-4 opacity-60">
              {archivedThemes.map((theme) => (
                <ThemeCard key={theme.id} theme={theme} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ThemeCard({ theme }: { theme: StrategicTheme }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{theme.name}</h3>
          {theme.description && (
            <p className="text-sm text-slate-500 mt-1">{theme.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            theme.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>
            {theme.status === "ACTIVE" ? "Activa" : "Arhivata"}
          </span>
          <ThemeActions themeId={theme.id} currentStatus={theme.status} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-600">Progres obiective</span>
          <span className="font-medium text-slate-800">{theme.progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${theme.progress}%` }}
          />
        </div>
      </div>

      {/* Linked objectives */}
      {theme.objectives.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-slate-600 mb-2">Obiective legate ({theme.objectives.length})</div>
          <div className="flex flex-wrap gap-2">
            {theme.objectives.map((obj) => (
              <span
                key={obj.code}
                className={`px-2 py-0.5 rounded text-xs ${
                  obj.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700"
                    : obj.status === "IN_PROGRESS"
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                {obj.code}
                {obj.progress !== null && ` (${obj.progress}%)`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Created date */}
      <div className="mt-3 text-xs text-slate-400">
        Creata: {new Date(theme.createdAt).toLocaleDateString("ro-RO")}
        {theme.archivedAt && ` | Arhivata: ${new Date(theme.archivedAt).toLocaleDateString("ro-RO")}`}
      </div>
    </div>
  )
}

