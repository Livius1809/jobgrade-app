import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Mother Maturity — Owner Dashboard" }
export const dynamic = "force-dynamic"

/**
 * MOTHER MATURITY — Indicatori de maturitate organism
 *
 * Pragul de la care structura poate fi portata pentru un nou proiect.
 * Nu cand economiseste Claude, ci cand fiecare actiune produce valoare neta.
 *
 * 10 indicatori × 0-100 fiecare → scor compozit → prag de portare
 */

// Pragul de portare: scorul compozit minim
const BIRTH_THRESHOLD = 70

interface MaturityIndicator {
  code: string
  name: string
  description: string
  score: number       // 0-100
  evidence: string    // ce date concrete sustin scorul
  weight: number      // pondere in compozit
}

export default async function MaturityPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any
  const now = new Date()
  const d30 = new Date(now.getTime() - 7 * 24 * 3600000) // Fereastra principală: 7 zile (era 30 — prea rar pentru galben)
  const d7 = new Date(now.getTime() - 7 * 24 * 3600000)

  const indicators: MaturityIndicator[] = []

  // ── 1. VALOARE PER TASK — fiecare task avansează un obiectiv ──
  try {
    const [totalTasks, tasksWithObjective, tasksCompleted] = await Promise.all([
      p.agentTask.count({ where: { createdAt: { gte: d30 } } }),
      p.agentTask.count({ where: { createdAt: { gte: d30 }, objectiveId: { not: null } } }),
      p.agentTask.count({ where: { createdAt: { gte: d30 }, status: "COMPLETED" } }),
    ])
    const alignmentPct = totalTasks > 0 ? Math.round(tasksWithObjective / totalTasks * 100) : 0
    const completionPct = totalTasks > 0 ? Math.round(tasksCompleted / totalTasks * 100) : 0
    const score = Math.round(alignmentPct * 0.6 + completionPct * 0.4)
    indicators.push({
      code: "VALUE_PER_TASK", name: "Valoare per task",
      description: "Fiecare task avanseza un obiectiv concret si se finalizeaza",
      score, evidence: `${alignmentPct}% aliniate la obiective, ${completionPct}% completate (din ${totalTasks} in 30 zile)`,
      weight: 15,
    })
  } catch { indicators.push({ code: "VALUE_PER_TASK", name: "Valoare per task", description: "", score: 0, evidence: "Date indisponibile", weight: 15 }) }

  // ── 2. CUNOASTERE DIN PRACTICA — KB creste din experienta, nu doar cold start ���─
  try {
    const [totalKB, fromColdStart, fromDistilled, fromPropagated, fromExpert] = await Promise.all([
      p.kBEntry.count({ where: { status: "PERMANENT" } }),
      p.kBEntry.count({ where: { status: "PERMANENT", source: "SELF_INTERVIEW" } }),
      p.kBEntry.count({ where: { status: "PERMANENT", source: "DISTILLED_INTERACTION" } }),
      p.kBEntry.count({ where: { status: "PERMANENT", source: "PROPAGATED" } }),
      p.kBEntry.count({ where: { status: "PERMANENT", source: "EXPERT_HUMAN" } }),
    ])
    const organicPct = totalKB > 0 ? Math.round((fromDistilled + fromPropagated) / totalKB * 100) : 0
    const score = Math.min(100, organicPct * 2) // 50% organic = 100 scor
    indicators.push({
      code: "ORGANIC_KNOWLEDGE", name: "Cunoastere din practica",
      description: "KB creste din experienta reala, nu doar din injectii externe",
      score, evidence: `${organicPct}% organic (${fromDistilled} distilat + ${fromPropagated} propagat din ${totalKB} total)`,
      weight: 15,
    })
  } catch { indicators.push({ code: "ORGANIC_KNOWLEDGE", name: "Cunoastere din practica", description: "", score: 0, evidence: "Date indisponibile", weight: 15 }) }

  // ── 3. CLIENT REAL SERVIT — cel putin 1 client end-to-end ──
  try {
    const tenants = await p.tenant.count({ where: { isActive: true } })
    const sessions = await p.evaluationSession.count({ where: { status: "COMPLETED" } }).catch(() => 0)
    const hasRealClient = tenants > 1 && sessions > 0 // >1 pentru ca exista demo tenant
    const score = hasRealClient ? (sessions >= 3 ? 100 : sessions >= 1 ? 60 : 30) : 0
    indicators.push({
      code: "REAL_CLIENTS", name: "Clienti reali serviti",
      description: "Cel putin 1 client trecut prin flow complet evaluare",
      score, evidence: `${tenants - 1} clienti activi, ${sessions} sesiuni completate`,
      weight: 20,
    })
  } catch { indicators.push({ code: "REAL_CLIENTS", name: "Clienti reali serviti", description: "", score: 0, evidence: "Date indisponibile", weight: 20 }) }

  // ── 4. AUTO-REPARARE — self-check rezolva fara escalare ──
  try {
    const selfChecks = await p.kBEntry.findMany({
      where: { agentRole: "SYSTEM", tags: { has: "self-check" }, createdAt: { gte: d30 } },
      select: { content: true },
      take: 30,
    })
    let totalChecks = selfChecks.length
    let repaired = 0
    let escalated = 0
    for (const sc of selfChecks) {
      try {
        const data = JSON.parse(sc.content)
        repaired += data.checks?.filter((c: any) => c.status === "repaired").length || 0
        escalated += data.checks?.filter((c: any) => c.status === "escalated").length || 0
      } catch {}
    }
    const total = repaired + escalated
    const score = total > 0 ? Math.round(repaired / total * 100) : (totalChecks > 0 ? 80 : 0) // daca totul e ok = 80
    indicators.push({
      code: "SELF_REPAIR", name: "Auto-reparare",
      description: "Problemele detectate sunt reparate automat, fara interventie umana",
      score, evidence: `${repaired} reparate automat, ${escalated} escaladate (din ${totalChecks} self-checks)`,
      weight: 10,
    })
  } catch { indicators.push({ code: "SELF_REPAIR", name: "Auto-reparare", description: "", score: 0, evidence: "Date indisponibile", weight: 10 }) }

  // ── 5. AUTONOMIE MANAGERIALA — managerii ruleaza cicluri singuri ──
  try {
    const managers = await p.agentDefinition.count({ where: { isManager: true, isActive: true } })
    const safetyNetRuns = await p.kBEntry.count({
      where: { agentRole: "SYSTEM", tags: { has: "self-check" }, createdAt: { gte: d30 } },
    })
    // Dacă safety net nu a intervenit = managerii au acționat singuri
    // Simplificare: verificăm dacă evolution cycles au fost rulate
    const evolutionCycles = await p.kBEntry.count({
      where: { agentRole: "EVOLUTION_ENGINE", tags: { has: "evolution-cycle" }, createdAt: { gte: d30 } },
    })
    const score = evolutionCycles > 0 ? Math.min(100, Math.round(evolutionCycles / managers * 100)) : 0
    indicators.push({
      code: "MANAGER_AUTONOMY", name: "Autonomie manageriala",
      description: "Managerii evalueaza si actioneaza fara safety net",
      score, evidence: `${evolutionCycles} cicluri evolutie in 30 zile (${managers} manageri activi)`,
      weight: 10,
    })
  } catch { indicators.push({ code: "MANAGER_AUTONOMY", name: "Autonomie manageriala", description: "", score: 0, evidence: "Date indisponibile", weight: 10 }) }

  // ���─ 6. COERENTA CULTURALA — materialele respecta brand voice si L1 ──
  try {
    const qcBlocked = await p.agentTask.count({
      where: { tags: { has: "qc-blocked" }, createdAt: { gte: d30 } },
    })
    const totalContentTasks = await p.agentTask.count({
      where: { taskType: "CONTENT_CREATION", createdAt: { gte: d30 } },
    })
    const qcPassRate = totalContentTasks > 0 ? Math.round((totalContentTasks - qcBlocked) / totalContentTasks * 100) : 100
    indicators.push({
      code: "CULTURAL_COHERENCE", name: "Coerenta culturala",
      description: "Materialele respecta brand voice, L1, adaptare RO",
      score: qcPassRate, evidence: `${qcPassRate}% trec QC gate (${qcBlocked} blocate din ${totalContentTasks} content tasks)`,
      weight: 10,
    })
  } catch { indicators.push({ code: "CULTURAL_COHERENCE", name: "Coerenta culturala", description: "", score: 0, evidence: "Date indisponibile", weight: 10 }) }

  // ── 7. TRAIECTORIE ASCENDENTA — organismul se imbunatateste ──
  try {
    const weeklyTasks = await p.$queryRaw`
      SELECT date_trunc('week', "completedAt") as week, COUNT(*)::int as cnt
      FROM agent_tasks WHERE status = 'COMPLETED' AND "completedAt" > ${d30}
      GROUP BY week ORDER BY week
    `.catch(() => []) as any[]
    let ascending = false
    if (weeklyTasks.length >= 3) {
      const last = weeklyTasks[weeklyTasks.length - 1]?.cnt || 0
      const first = weeklyTasks[0]?.cnt || 0
      ascending = last > first
    }
    const score = weeklyTasks.length < 2 ? 20 : ascending ? 80 : 40
    indicators.push({
      code: "TRAJECTORY", name: "Traiectorie ascendenta",
      description: "Organismul se imbunatateste in timp (mai multe completari, mai putine blocaje)",
      score, evidence: weeklyTasks.length >= 2 ? `${ascending ? "Ascendent" : "Plat/descendent"} pe ${weeklyTasks.length} saptamani` : "Insuficiente date (< 2 saptamani)",
      weight: 5,
    })
  } catch { indicators.push({ code: "TRAJECTORY", name: "Traiectorie ascendenta", description: "", score: 0, evidence: "Date indisponibile", weight: 5 }) }

  // ── 8. SUSTENABILITATE FINANCIARA — valoarea depaseste costul ──
  try {
    const budgetLines = await p.budgetLine.findMany({
      where: { businessId: "biz_jobgrade" },
      select: { planned: true, actual: true, category: true },
    }).catch(() => [])
    const revenueEntries = await p.revenueEntry.aggregate({ _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } }))
    const totalCost = budgetLines.reduce((s: number, l: any) => s + Number(l.actual || 0), 0)
    const totalRevenue = Number(revenueEntries._sum?.amount || 0)
    const score = totalRevenue > 0 ? (totalRevenue >= totalCost ? 100 : Math.round(totalRevenue / Math.max(1, totalCost) * 100)) : 0
    indicators.push({
      code: "FINANCIAL", name: "Sustenabilitate financiara",
      description: "Valoarea generata depaseste costul operational",
      score, evidence: totalRevenue > 0 ? `Venituri: ${totalRevenue} RON, Cost: ${totalCost} RON` : "Niciun venit inca",
      weight: 5,
    })
  } catch { indicators.push({ code: "FINANCIAL", name: "Sustenabilitate financiara", description: "", score: 0, evidence: "Date indisponibile", weight: 5 }) }

  // ── 9. STABILITATE ECHIPA — agentii performeaza consistent ──
  try {
    const [totalAgents, redAgents] = await Promise.all([
      p.agentDefinition.count({ where: { isActive: true } }),
      p.$queryRaw`
        SELECT COUNT(DISTINCT ad."agentRole")::int as cnt
        FROM agent_definitions ad
        WHERE ad."isActive" = true
          AND NOT EXISTS (SELECT 1 FROM agent_tasks t WHERE t."assignedTo" = ad."agentRole" AND t."createdAt" > ${d7})
          AND NOT EXISTS (SELECT 1 FROM kb_entries kb WHERE kb."agentRole" = ad."agentRole" AND kb."createdAt" > ${d7})
      `.then((r: any) => r[0]?.cnt || 0).catch(() => 0),
    ])
    const activePct = totalAgents > 0 ? Math.round((totalAgents - redAgents) / totalAgents * 100) : 0
    indicators.push({
      code: "TEAM_STABILITY", name: "Stabilitate echipa",
      description: "Agentii sunt activi si productivi consistent",
      score: activePct, evidence: `${totalAgents - redAgents}/${totalAgents} agenti activi in ultima saptamana`,
      weight: 5,
    })
  } catch { indicators.push({ code: "TEAM_STABILITY", name: "Stabilitate echipa", description: "", score: 0, evidence: "Date indisponibile", weight: 5 }) }

  // ── 10. INDEPENDENTA DE CONSTRUCTOR — functioneaza fara interventii structurale ──
  try {
    // Proxy: câte commit-uri/deploy-uri au fost necesare pentru fix-uri (nu features)
    // Simplificare: verificăm dacă escalările la Owner sunt sub 10% din taskuri
    const [totalTasks30, ownerEscalations] = await Promise.all([
      p.agentTask.count({ where: { createdAt: { gte: d30 } } }),
      p.agentTask.count({ where: { createdAt: { gte: d30 }, blockerType: "WAITING_OWNER" } }),
    ])
    const ownerDependencyPct = totalTasks30 > 0 ? Math.round(ownerEscalations / totalTasks30 * 100) : 0
    const score = Math.max(0, 100 - ownerDependencyPct * 3) // 33% owner-dependent = 0
    indicators.push({
      code: "INDEPENDENCE", name: "Independenta de constructor",
      description: "Functioneaza fara interventii structurale frecvente de la Owner/Claude",
      score, evidence: `${ownerDependencyPct}% taskuri blocate pe Owner (${ownerEscalations} din ${totalTasks30})`,
      weight: 5,
    })
  } catch { indicators.push({ code: "INDEPENDENCE", name: "Independenta de constructor", description: "", score: 0, evidence: "Date indisponibile", weight: 5 }) }

  // ── SCOR COMPOZIT ──
  const totalWeight = indicators.reduce((s, i) => s + i.weight, 0)
  const compositeScore = Math.round(indicators.reduce((s, i) => s + i.score * i.weight, 0) / totalWeight)
  const readyToBirth = compositeScore >= BIRTH_THRESHOLD

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mother Maturity</h1>
          <p className="text-sm text-slate-500">Maturitate = mosteneste priceperea constructorilor fara sa mosteneasca limitele lor</p>
        </div>
        <Link href="/owner" className="text-xs text-indigo-600 hover:underline">← Dashboard</Link>
      </div>

      {/* Scor compozit + prag */}
      <div className={`rounded-2xl p-8 text-center border-2 ${
        readyToBirth ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"
      }`}>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Scor maturitate organism</p>
        <p className={`text-6xl font-bold ${readyToBirth ? "text-emerald-600" : "text-amber-600"}`}>
          {compositeScore}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Prag portare: <strong>{BIRTH_THRESHOLD}</strong>
        </p>
        <p className={`text-sm font-medium mt-3 ${readyToBirth ? "text-emerald-700" : "text-amber-700"}`}>
          {readyToBirth
            ? "Organismul este apt sa neasca un pui viabil"
            : `Inca ${BIRTH_THRESHOLD - compositeScore} puncte pana la maturitate`
          }
        </p>
      </div>

      {/* Indicatori */}
      <div className="space-y-3">
        {indicators.sort((a, b) => b.weight - a.weight).map(ind => (
          <div key={ind.code} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{ind.name}</h3>
                <p className="text-[10px] text-slate-400">{ind.description}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className={`text-2xl font-bold ${
                  ind.score >= 70 ? "text-emerald-600" : ind.score >= 40 ? "text-amber-600" : "text-red-500"
                }`}>{ind.score}</p>
                <p className="text-[9px] text-slate-400">pondere {ind.weight}%</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
              <div className={`h-2 rounded-full transition-all ${
                ind.score >= 70 ? "bg-emerald-400" : ind.score >= 40 ? "bg-amber-300" : "bg-red-300"
              }`} style={{ width: `${ind.score}%` }} />
            </div>
            <p className="text-[10px] text-slate-500">{ind.evidence}</p>
          </div>
        ))}
      </div>

      {/* Ce inseamna portarea */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl border border-indigo-100 p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Ce inseamna portarea</h2>
        <div className="space-y-2 text-xs text-slate-600">
          <p>Cand scorul atinge <strong>{BIRTH_THRESHOLD}</strong>, organismul a demonstrat ca:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mecanismele de auto-dezvoltare functioneaza (testate cu clienti reali)</li>
            <li>L1 + L2 + L3 sunt validate prin practica (nu doar teorie)</li>
            <li>Invata din ce face (KB creste organic)</li>
            <li>Se auto-repara (nu depinde de constructor)</li>
            <li>Produce valoare reala (nu doar potential)</li>
          </ul>
          <p className="mt-3 text-indigo-600 font-medium">
            Puiul mosteneste: L1 (identic) + L2 (upgradabil) + L3 (universal) + mecanismele validate.
            Primeste: domeniu nou + agenti specifici + obiective proprii.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/owner" className="text-sm text-indigo-600 hover:underline">← Inapoi la Owner Dashboard</Link>
      </div>
    </div>
  )
}
