import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "KB Browser — Owner Dashboard" }
export const dynamic = "force-dynamic"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentKBStats {
  agentRole: string
  total: number
  permanent: number
  buffer: number
  archived: number
  embeddingCoverage: number | null
}

interface KBEntryData {
  id: string
  agentRole: string
  kbType: string
  content: string
  source: string
  confidence: number
  usageCount: number
  successRate: number | null
  status: string
  tags: string[]
  createdAt: Date
  validatedAt: Date | null
  propagatedFrom: string | null
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

async function fetchAgentSummary(): Promise<AgentKBStats[]> {
  const p = prisma as any
  try {
    const agentSummary = await p.kBEntry.groupBy({
      by: ["agentRole", "status"],
      _count: { _all: true },
    })

    const agentMap: Record<string, AgentKBStats> = {}
    for (const row of agentSummary as any[]) {
      if (!agentMap[row.agentRole]) {
        agentMap[row.agentRole] = { agentRole: row.agentRole, total: 0, permanent: 0, buffer: 0, archived: 0, embeddingCoverage: null }
      }
      agentMap[row.agentRole].total += row._count._all
      if (row.status === "PERMANENT") agentMap[row.agentRole].permanent += row._count._all
      else if (row.status === "BUFFER") agentMap[row.agentRole].buffer += row._count._all
      else if (row.status === "ARCHIVED") agentMap[row.agentRole].archived += row._count._all
    }

    // Embedding coverage
    try {
      const withEmbeddingRaw = await p.$queryRaw`
        SELECT "agentRole", COUNT(*) as cnt
        FROM kb_entries
        WHERE embedding IS NOT NULL
        GROUP BY "agentRole"
      ` as any[]
      for (const row of withEmbeddingRaw) {
        if (agentMap[row.agentRole]) {
          const total = agentMap[row.agentRole].total
          agentMap[row.agentRole].embeddingCoverage = total > 0
            ? Math.round((Number(row.cnt) / total) * 100)
            : 0
        }
      }
    } catch { /* pgvector not enabled */ }

    return Object.values(agentMap).sort((a, b) => b.total - a.total)
  } catch {
    return []
  }
}

async function fetchAgentEntries(
  agentRole: string,
  kbType?: string,
  source?: string,
  search?: string,
  minConf?: number,
  maxConf?: number,
  page: number = 1
): Promise<{ entries: KBEntryData[]; totalCount: number }> {
  const p = prisma as any
  const pageSize = 20

  const where: any = { agentRole }
  if (kbType) where.status = kbType
  if (source) where.source = source
  if (search) where.content = { contains: search, mode: "insensitive" }
  if (minConf !== undefined || maxConf !== undefined) {
    where.confidence = {}
    if (minConf !== undefined) where.confidence.gte = minConf
    if (maxConf !== undefined) where.confidence.lte = maxConf
  }

  try {
    const [entries, totalCount] = await Promise.all([
      p.kBEntry.findMany({
        where,
        select: {
          id: true, agentRole: true, kbType: true, content: true,
          source: true, confidence: true, usageCount: true, successRate: true,
          status: true, tags: true, createdAt: true, validatedAt: true, propagatedFrom: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      p.kBEntry.count({ where }),
    ])
    return { entries: entries as KBEntryData[], totalCount: totalCount as number }
  } catch {
    return { entries: [], totalCount: 0 }
  }
}

// ── Status colors ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PERMANENT: "bg-emerald-100 text-emerald-700",
  BUFFER: "bg-amber-100 text-amber-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
}

const SOURCE_LABELS: Record<string, string> = {
  SELF_INTERVIEW: "Self-interview",
  EXPERT_HUMAN: "Expert uman",
  DISTILLED_INTERACTION: "Distilat",
  PROPAGATED: "Propagat",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function KBBrowserPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const params = await searchParams
  const selectedAgent = params.agent || null
  const filterType = params.type || undefined
  const filterSource = params.source || undefined
  const searchQuery = params.search || undefined
  const page = parseInt(params.page || "1")

  const agents = await fetchAgentSummary()

  let entries: KBEntryData[] = []
  let totalCount = 0
  if (selectedAgent) {
    const result = await fetchAgentEntries(selectedAgent, filterType, filterSource, searchQuery, undefined, undefined, page)
    entries = result.entries
    totalCount = result.totalCount
  }

  const totalPages = Math.ceil(totalCount / 20)

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Knowledge Base Browser</h1>
            <p className="text-sm text-slate-500 mt-1">
              {agents.length} agenti | {agents.reduce((s, a) => s + a.total, 0)} intrari KB totale
            </p>
          </div>
          <Link href="/owner" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← Inapoi la Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agent List (sidebar) */}
          <div className="lg:col-span-1 bg-white rounded-xl border p-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Agenti</h2>
            <div className="space-y-1">
              {agents.map((agent) => (
                <Link
                  key={agent.agentRole}
                  href={`/owner/kb-browser?agent=${encodeURIComponent(agent.agentRole)}`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedAgent === agent.agentRole
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="font-medium">{agent.agentRole}</div>
                  <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                    <span>{agent.total} total</span>
                    <span className="text-emerald-600">{agent.permanent} perm</span>
                    <span className="text-amber-600">{agent.buffer} buf</span>
                    {agent.embeddingCoverage !== null && (
                      <span className="text-indigo-500">{agent.embeddingCoverage}% emb</span>
                    )}
                  </div>
                </Link>
              ))}
              {agents.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">Nicio intrare KB</p>
              )}
            </div>
          </div>

          {/* Entries Panel */}
          <div className="lg:col-span-3">
            {!selectedAgent ? (
              <div className="bg-white rounded-xl border p-8 text-center text-slate-500">
                Selecteaza un agent din lista din stanga pentru a vedea intrarile KB.
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b">
                  <form className="flex flex-wrap gap-2 items-center" method="GET" action="/owner/kb-browser">
                    <input type="hidden" name="agent" value={selectedAgent} />
                    <input
                      type="text"
                      name="search"
                      placeholder="Cauta in KB..."
                      defaultValue={searchQuery || ""}
                      className="border rounded-lg px-3 py-1.5 text-sm w-48"
                    />
                    <select name="type" defaultValue={filterType || ""} className="border rounded-lg px-3 py-1.5 text-sm">
                      <option value="">Toate tipurile</option>
                      <option value="PERMANENT">Permanent</option>
                      <option value="BUFFER">Buffer</option>
                      <option value="ARCHIVED">Arhivat</option>
                    </select>
                    <select name="source" defaultValue={filterSource || ""} className="border rounded-lg px-3 py-1.5 text-sm">
                      <option value="">Toate sursele</option>
                      <option value="SELF_INTERVIEW">Self-interview</option>
                      <option value="EXPERT_HUMAN">Expert uman</option>
                      <option value="DISTILLED_INTERACTION">Distilat</option>
                      <option value="PROPAGATED">Propagat</option>
                    </select>
                    <button type="submit" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
                      Filtreaza
                    </button>
                  </form>
                </div>

                {/* Agent header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">{selectedAgent}</h2>
                  <span className="text-sm text-slate-500">{totalCount} intrari</span>
                </div>

                {/* Entries list */}
                {entries.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">Nicio intrare gasita cu filtrele selectate.</p>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div key={entry.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[entry.status] || "bg-slate-100"}`}>
                            {entry.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {SOURCE_LABELS[entry.source] || entry.source}
                          </span>
                          <span className="text-xs text-slate-400">
                            Conf: {(entry.confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-xs text-slate-400">
                            Folosit: {entry.usageCount}x
                          </span>
                          {entry.propagatedFrom && (
                            <span className="text-xs text-indigo-500">← {entry.propagatedFrom}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-3">{entry.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          <span className="text-xs text-slate-400 ml-auto">
                            {new Date(entry.createdAt).toLocaleDateString("ro-RO")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    {page > 1 && (
                      <Link
                        href={`/owner/kb-browser?agent=${encodeURIComponent(selectedAgent)}&page=${page - 1}${filterType ? `&type=${filterType}` : ""}${filterSource ? `&source=${filterSource}` : ""}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
                        className="px-3 py-1 border rounded text-sm hover:bg-slate-50"
                      >
                        ← Anterior
                      </Link>
                    )}
                    <span className="text-sm text-slate-500">Pagina {page} din {totalPages}</span>
                    {page < totalPages && (
                      <Link
                        href={`/owner/kb-browser?agent=${encodeURIComponent(selectedAgent)}&page=${page + 1}${filterType ? `&type=${filterType}` : ""}${filterSource ? `&source=${filterSource}` : ""}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
                        className="px-3 py-1 border rounded text-sm hover:bg-slate-50"
                      >
                        Urmator →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
