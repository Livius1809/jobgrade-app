/**
 * doas-functions.ts — DOAS (Director Operațional Adjunct Structură)
 *
 * 7 funcții dedicate ale DOAS:
 *   F1: Audit coerență MVV
 *   F2: Gap analysis permanent
 *   F3: Remediere colaborativă
 *   F4: Registru viu fluxuri
 *   F5: Registru proceduri
 *   F6: Registru atribuții
 *   F7: Registru skill-uri
 *
 * Arhitectura: DOAS există în DB (AgentDefinition) dar nu avea cod dedicat.
 * Fiecare funcție interoghează date reale din Prisma și unde e nevoie
 * folosește cpuCall pentru analiză AI.
 */

import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"

// ── F1: Audit coerență MVV ─────────────────────────────────────────────────

/**
 * Verifică dacă misiune/viziune/valori sunt coerente între ele per tenant.
 * Citește din KB (entries cu tag "mvv") și analizează cu Claude.
 */
export async function auditMVVCoherence(tenantId: string): Promise<{
  coherent: boolean
  gaps: string[]
  score: number
}> {
  // Citim MVV din KB
  const mvvEntries = await (prisma as any).kBEntry.findMany({
    where: {
      agentRole: "DOAS",
      tags: { hasSome: ["mvv", "misiune", "viziune", "valori", "mission", "vision", "values"] },
      businessId: tenantId,
      status: "PERMANENT",
    },
    select: { content: true, tags: true },
    take: 20,
  })

  // Dacă nu avem date MVV, returnăm gap explicit
  if (!mvvEntries || mvvEntries.length === 0) {
    // Încercăm și în company profile
    const companyProfile = await (prisma as any).companyProfile?.findFirst({
      where: { tenantId },
      select: { mission: true, vision: true, values: true },
    }).catch(() => null)

    if (!companyProfile?.mission && !companyProfile?.vision) {
      return {
        coherent: false,
        gaps: ["Nu există date MVV (misiune/viziune/valori) pentru acest tenant. Input necesar de la client."],
        score: 0,
      }
    }

    // Avem date din company profile — le folosim
    const mvvText = [
      companyProfile.mission && `Misiune: ${companyProfile.mission}`,
      companyProfile.vision && `Viziune: ${companyProfile.vision}`,
      companyProfile.values && `Valori: ${JSON.stringify(companyProfile.values)}`,
    ].filter(Boolean).join("\n")

    return analyzeCoherence(mvvText, tenantId)
  }

  const mvvText = mvvEntries.map((e: any) => e.content).join("\n---\n")
  return analyzeCoherence(mvvText, tenantId)
}

async function analyzeCoherence(mvvText: string, tenantId: string): Promise<{
  coherent: boolean
  gaps: string[]
  score: number
}> {
  const result = await cpuCall({
    system: `Ești DOAS — Director Operațional Adjunct Structură. Analizezi coerența MVV (misiune/viziune/valori).
Răspunde STRICT în JSON: { "coherent": boolean, "gaps": ["..."], "score": number_0_100 }
- coherent: true dacă cele 3 componente se susțin reciproc
- gaps: lista discrepanțelor/lipsurilor
- score: 0-100 (scor de coerență)
Nu adăuga text suplimentar, doar JSON-ul.`,
    messages: [{ role: "user", content: `Analizează coerența MVV:\n\n${mvvText}` }],
    max_tokens: 500,
    agentRole: "DOAS",
    operationType: "mvv-audit",
    tenantId,
    skipObjectiveCheck: true,
  })

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        coherent: Boolean(parsed.coherent),
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        score: typeof parsed.score === "number" ? parsed.score : 0,
      }
    }
  } catch { /* fallback below */ }

  return { coherent: false, gaps: ["Analiza nu a putut fi finalizată"], score: 0 }
}

// ── F2: Gap analysis permanent ─────────────────────────────────────────────

/**
 * Identifică ce lipsește din structura organizațională per tenant.
 * Compară agenții activi, KB-urile, fluxurile cu ce ar trebui să existe.
 */
export async function gapAnalysis(tenantId: string): Promise<{
  gaps: { area: string; severity: string; recommendation: string }[]
}> {
  // Citim starea curentă
  const [agents, kbCount, flowCount] = await Promise.all([
    (prisma as any).agentDefinition.findMany({
      where: { isActive: true },
      select: { agentRole: true, objectives: true },
    }).catch(() => []),
    (prisma as any).kBEntry.count({
      where: { businessId: tenantId, status: "PERMANENT" },
    }).catch(() => 0),
    (prisma as any).fluxStep?.count({
      where: { flux: { tenantId } },
    }).catch(() => 0),
  ])

  const gaps: { area: string; severity: string; recommendation: string }[] = []

  // Verificăm obiective lipsă
  const agentsWithoutObjectives = (agents as any[]).filter(
    (a: any) => !a.objectives || a.objectives.length === 0
  )
  if (agentsWithoutObjectives.length > 0) {
    gaps.push({
      area: "Obiective agenți",
      severity: "HIGH",
      recommendation: `${agentsWithoutObjectives.length} agenți fără obiective active: ${agentsWithoutObjectives.slice(0, 5).map((a: any) => a.agentRole).join(", ")}`,
    })
  }

  // Verificăm KB insuficient
  if (kbCount < 10) {
    gaps.push({
      area: "Knowledge Base",
      severity: kbCount === 0 ? "CRITICAL" : "MEDIUM",
      recommendation: `KB are doar ${kbCount} entries permanente pentru tenant ${tenantId}. Necesar cold-start sau alimentare.`,
    })
  }

  // Verificăm fluxuri lipsă
  if (flowCount === 0) {
    gaps.push({
      area: "Fluxuri operaționale",
      severity: "HIGH",
      recommendation: "Nu există fluxuri definite. Necesare pentru C1 (organizare) și C2 (conformitate).",
    })
  }

  // Verificăm dacă există agenți critici
  const criticalRoles = ["COG", "COA", "SOA", "DOAS", "CFO"]
  const existingRoles = new Set((agents as any[]).map((a: any) => a.agentRole))
  const missingCritical = criticalRoles.filter((r) => !existingRoles.has(r))
  if (missingCritical.length > 0) {
    gaps.push({
      area: "Agenți critici",
      severity: "CRITICAL",
      recommendation: `Agenți critici lipsă: ${missingCritical.join(", ")}. Necesari pentru funcționarea organismului.`,
    })
  }

  return { gaps }
}

// ── F3: Remediere colaborativă ─────────────────────────────────────────────

/**
 * Propune fix-uri concrete pentru un gap detectat.
 * Folosește Claude pentru a genera pași de remediere.
 */
export async function proposeRemediation(
  tenantId: string,
  gapArea: string
): Promise<{
  steps: string[]
  priority: string
  estimatedEffort: string
}> {
  const result = await cpuCall({
    system: `Ești DOAS. Propui pași de remediere pentru un gap organizațional.
Răspunde STRICT în JSON: { "steps": ["pas1", "pas2", ...], "priority": "HIGH|MEDIUM|LOW", "estimatedEffort": "ore/zile" }
Maxim 5 pași, concreți și acționabili. Nu adăuga text suplimentar.`,
    messages: [{ role: "user", content: `Gap detectat în zona: "${gapArea}" pentru tenant ${tenantId}. Propune remediere.` }],
    max_tokens: 500,
    agentRole: "DOAS",
    operationType: "remediation",
    tenantId,
    skipObjectiveCheck: true,
  })

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        priority: parsed.priority || "MEDIUM",
        estimatedEffort: parsed.estimatedEffort || "necunoscut",
      }
    }
  } catch { /* fallback */ }

  return {
    steps: [`Investighează zona "${gapArea}" manual`, "Documentează situația curentă", "Propune plan de acțiune"],
    priority: "MEDIUM",
    estimatedEffort: "1-2 zile",
  }
}

// ── F4: Registru viu fluxuri ───────────────────────────────────────────────

/**
 * Lista tuturor fluxurilor active per tenant + pozițiile și procedurile asociate.
 */
export async function getLiveRegistry(tenantId: string): Promise<{
  flows: any[]
  positions: any[]
  procedures: any[]
}> {
  const [flows, positions, procedures] = await Promise.all([
    // Fluxuri din FluxStep sau din KB
    (prisma as any).fluxStep?.findMany({
      where: { flux: { tenantId } },
      include: { flux: { select: { name: true, status: true } } },
      take: 100,
    }).catch(() => []),

    // Pozițiile unice per tenant
    (prisma as any).jobPosition?.findMany({
      where: { tenantId },
      select: { id: true, title: true, department: true, grade: true },
      take: 100,
    }).catch(() =>
      // Fallback: citim din KB
      (prisma as any).kBEntry.findMany({
        where: {
          businessId: tenantId,
          tags: { hasSome: ["position", "pozitie", "job"] },
          status: "PERMANENT",
        },
        select: { id: true, content: true, tags: true },
        take: 50,
      }).catch(() => [])
    ),

    // Proceduri din KB
    (prisma as any).kBEntry.findMany({
      where: {
        businessId: tenantId,
        tags: { hasSome: ["procedura", "procedure", "sop"] },
        status: "PERMANENT",
      },
      select: { id: true, content: true, tags: true, agentRole: true, validatedAt: true },
      take: 50,
    }).catch(() => []),
  ])

  return {
    flows: flows ?? [],
    positions: positions ?? [],
    procedures: procedures ?? [],
  }
}

// ── F5: Registru proceduri ─────────────────────────────────────────────────

/**
 * SOP-uri generate din KB, cu status de validare.
 */
export async function getProcedureRegistry(tenantId: string): Promise<{
  procedures: { title: string; agentRole: string; validated: boolean }[]
}> {
  const entries = await (prisma as any).kBEntry.findMany({
    where: {
      businessId: tenantId,
      tags: { hasSome: ["procedura", "procedure", "sop", "process"] },
      status: "PERMANENT",
    },
    select: { content: true, agentRole: true, validatedAt: true },
    take: 100,
  }).catch(() => [])

  const procedures = (entries as any[]).map((e: any) => ({
    title: e.content.substring(0, 120).replace(/\n/g, " "),
    agentRole: e.agentRole,
    validated: e.validatedAt !== null,
  }))

  return { procedures }
}

// ── F6: Registru atribuții ─────────────────────────────────────────────────

/**
 * Mapping agent -> responsabilități (din AgentDefinition.objectives + description).
 */
export async function getAttributionRegistry(_tenantId: string): Promise<{
  attributions: { agentRole: string; responsibilities: string[] }[]
}> {
  const agents = await (prisma as any).agentDefinition.findMany({
    where: { isActive: true },
    select: { agentRole: true, description: true, objectives: true },
    orderBy: { agentRole: "asc" },
  }).catch(() => [])

  const attributions = (agents as any[]).map((a: any) => ({
    agentRole: a.agentRole,
    responsibilities: [
      ...(a.objectives || []),
      // Extragem prima frază din descriere ca responsabilitate principală
      ...(a.description ? [a.description.split(".")[0].trim()] : []),
    ].filter(Boolean),
  }))

  return { attributions }
}

// ── F7: Registru skill-uri ─────────────────────────────────────────────────

/**
 * Skills per agent cu nivel de competență, citite din KB + AgentMetric.
 */
export async function getSkillRegistry(_tenantId: string): Promise<{
  skills: { agentRole: string; skill: string; level: string }[]
}> {
  // Citim skill entries din KB
  const skillEntries = await (prisma as any).kBEntry.findMany({
    where: {
      tags: { hasSome: ["skill", "competenta", "competence", "capability"] },
      status: "PERMANENT",
    },
    select: { agentRole: true, content: true, confidence: true },
    take: 200,
  }).catch(() => [])

  // Citim performanța din metrics pentru estimare nivel
  const metrics = await (prisma as any).agentMetric.findMany({
    orderBy: { periodEnd: "desc" },
    distinct: ["agentRole"],
    select: { agentRole: true, performanceScore: true },
    take: 50,
  }).catch(() => [])

  const perfMap = new Map<string, number>()
  for (const m of metrics as any[]) {
    if (m.performanceScore != null) {
      perfMap.set(m.agentRole, m.performanceScore)
    }
  }

  const skills = (skillEntries as any[]).map((e: any) => {
    const perf = perfMap.get(e.agentRole) ?? 0.5
    let level = "BEGINNER"
    if (perf >= 0.8) level = "EXPERT"
    else if (perf >= 0.6) level = "ADVANCED"
    else if (perf >= 0.4) level = "INTERMEDIATE"

    return {
      agentRole: e.agentRole,
      skill: e.content.substring(0, 100).replace(/\n/g, " "),
      level,
    }
  })

  // Dacă nu avem skill entries, generăm din agent descriptions
  if (skills.length === 0) {
    const agents = await (prisma as any).agentDefinition.findMany({
      where: { isActive: true },
      select: { agentRole: true, description: true },
      take: 50,
    }).catch(() => [])

    for (const a of agents as any[]) {
      const perf = perfMap.get(a.agentRole) ?? 0.5
      let level = "BEGINNER"
      if (perf >= 0.8) level = "EXPERT"
      else if (perf >= 0.6) level = "ADVANCED"
      else if (perf >= 0.4) level = "INTERMEDIATE"

      skills.push({
        agentRole: a.agentRole,
        skill: a.description?.split(".")[0]?.trim() || a.agentRole,
        level,
      })
    }
  }

  return { skills }
}
