/**
 * business-plan.ts — Business Plan iterativ generat de COG
 *
 * Document viu care se îmbunătățește cu fiecare iterație:
 * 1. Structura financiară (costuri, revenue, break-even)
 * 2. Marketing detaliat (strategii, tactici, planuri de măsuri)
 * 3. Timeline etape (construcție → lansare → exploatare)
 * 4. Metrici target (clienți, MRR, churn)
 *
 * Servește ca bază pentru Owner Dashboard.
 * Fiecare generare actualizează versiunea — nu suprascrie, adaugă.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

export interface BusinessPlanSection {
  title: string
  content: string
  subsections?: Array<{ title: string; content: string }>
}

export interface BusinessPlan {
  version: number
  generatedAt: string
  generatedBy: string
  sections: {
    executiveSummary: BusinessPlanSection
    companyOverview: BusinessPlanSection
    marketAnalysis: BusinessPlanSection
    marketingStrategy: BusinessPlanSection
    operationalPlan: BusinessPlanSection
    financialPlan: BusinessPlanSection
    timeline: BusinessPlanSection
    risks: BusinessPlanSection
    kpis: BusinessPlanSection
  }
  metadata: {
    agentsCount: number
    kbEntriesCount: number
    dataSourcesUsed: string[]
    previousVersionSummary?: string
  }
}

export async function generateBusinessPlan(
  prisma: PrismaClient,
  previousPlan?: any
): Promise<BusinessPlan> {
  const p = prisma as any
  const client = new Anthropic()

  // ── Collect platform data for context ──────────────────────────────────────
  const agentCount = await p.agentDefinition.count({ where: { isActive: true } })
  const kbCount = await p.kBEntry.count({ where: { status: "PERMANENT" } })
  const proposalCount = await p.orgProposal.count()
  const brainstormCount = await p.brainstormSession.count()

  // Get COG's KB for strategic context
  const cogKB = await p.kBEntry.findMany({
    where: { agentRole: "COG", status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 10,
    select: { content: true },
  })

  // Get marketing KB (ACA, CMA, CWA, SOA)
  const marketingKB = await p.kBEntry.findMany({
    where: { agentRole: { in: ["ACA", "CMA", "CWA", "SOA", "CIA", "CDIA"] }, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 15,
    select: { agentRole: true, content: true },
  })

  // Get financial KB (COAFin, BCA)
  const financialKB = await p.kBEntry.findMany({
    where: { agentRole: { in: ["COAFin", "BCA"] }, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 10,
    select: { agentRole: true, content: true },
  })

  // Get resource costs
  const resources = await p.externalResource.findMany({ where: { status: "ACTIVE" } }).catch(() => [])
  const monthlyCost = resources.reduce((s: number, r: any) => s + (r.monthlyCost || 0), 0)

  // Previous plan context
  const prevContext = previousPlan
    ? `\nPLAN ANTERIOR (v${previousPlan.version}):\n${previousPlan.sections?.executiveSummary?.content?.substring(0, 500) || "N/A"}\nCe s-a schimbat de atunci: actualizare cu date noi, brainstorming-uri, metrici.`
    : "\nPRIM PLAN — generare inițială."

  // ── Generate each section ──────────────────────────────────────────────────
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{
      role: "user",
      content: `Ca COG (Chief Orchestrator General) al platformei JobGrade, generează un Business Plan complet.

CONTEXT PLATFORMĂ:
- Psihobusiness Consulting SRL, CIF RO15790994, plătitoare TVA
- Platformă SaaS evaluare și ierarhizare joburi (job grading)
- Stack: Next.js 16, PostgreSQL, 42 agenți AI, n8n workflows
- Piață: România (principal), CEE (expansiune)
- Conformitate: GDPR, Directiva EU 2023/970, Codul Muncii RO, AI Act
- Target lansare: Q4 2026
- ${agentCount} agenți AI activi, ${kbCount} entries KB, ${proposalCount} propuneri, ${brainstormCount} sesiuni brainstorming
- Cost lunar curent infrastructură: ${monthlyCost}€

EXPERIENȚĂ STRATEGICĂ (COG KB):
${cogKB.map((e: any) => "- " + e.content.substring(0, 150)).join("\n")}

EXPERIENȚĂ MARKETING:
${marketingKB.map((e: any) => `- [${e.agentRole}] ${e.content.substring(0, 120)}`).join("\n")}

EXPERIENȚĂ FINANCIARĂ:
${financialKB.map((e: any) => `- [${e.agentRole}] ${e.content.substring(0, 120)}`).join("\n")}
${prevContext}

Generează BUSINESS PLAN complet cu secțiunile:

1. **EXECUTIVE SUMMARY** — viziune, propunere de valoare, obiective principale
2. **COMPANY OVERVIEW** — companie, echipă AI, diferențiatori
3. **ANALIZA PIEȚEI** — dimensiune, segmente, competiție, tendințe
4. **STRATEGIA DE MARKETING** — cu subsecțiuni:
   a. Strategii (poziționare, branding, canale)
   b. Tactici (content marketing, LinkedIn ads, parteneriate, webinarii, Directiva EU ca driver)
   c. Plan de măsuri (acțiuni concrete per lună)
   d. Buget marketing estimat
   e. KPIs marketing (leads, conversii, CAC, LTV)
5. **PLAN OPERAȚIONAL** — etape construcție → lansare → exploatare
6. **PLAN FINANCIAR** — cu subsecțiuni:
   a. Costuri fixe (infrastructură, API, domeniu)
   b. Costuri variabile (per client, API usage)
   c. Pricing (planuri, prețuri)
   d. Proiecții revenue (M1-M12, anul 1, anul 2)
   e. Break-even analysis
   f. Scenarii (optimist, realist, pesimist)
7. **TIMELINE** — eșalonare pe luni/trimestre cu milestones
8. **RISCURI** — top 10 riscuri cu probabilitate, impact, mitigare
9. **KPIs BUSINESS** — metrici cheie per etapă

Răspunde STRICT JSON:
{
  "executiveSummary": {"title": "...", "content": "..."},
  "companyOverview": {"title": "...", "content": "..."},
  "marketAnalysis": {"title": "...", "content": "...", "subsections": [{"title": "...", "content": "..."}]},
  "marketingStrategy": {"title": "...", "content": "...", "subsections": [{"title": "Strategii", "content": "..."}, {"title": "Tactici", "content": "..."}, {"title": "Plan de măsuri", "content": "..."}, {"title": "Buget marketing", "content": "..."}, {"title": "KPIs marketing", "content": "..."}]},
  "operationalPlan": {"title": "...", "content": "...", "subsections": [...]},
  "financialPlan": {"title": "...", "content": "...", "subsections": [{"title": "Costuri fixe", "content": "..."}, {"title": "Costuri variabile", "content": "..."}, {"title": "Pricing", "content": "..."}, {"title": "Proiecții revenue", "content": "..."}, {"title": "Break-even", "content": "..."}, {"title": "Scenarii", "content": "..."}]},
  "timeline": {"title": "...", "content": "...", "subsections": [...]},
  "risks": {"title": "...", "content": "..."},
  "kpis": {"title": "...", "content": "..."}
}

IMPORTANT: Conținut DETALIAT și SPECIFIC — nu generalități. Numere concrete, date, acțiuni.`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("Failed to parse business plan from AI response")

  const sections = JSON.parse(match[0])
  const version = previousPlan ? (previousPlan.version || 0) + 1 : 1

  const plan: BusinessPlan = {
    version,
    generatedAt: new Date().toISOString(),
    generatedBy: "COG",
    sections,
    metadata: {
      agentsCount: agentCount,
      kbEntriesCount: kbCount,
      dataSourcesUsed: ["COG KB", "Marketing KB (ACA/CMA/CWA/SOA/CIA/CDIA)", "Financial KB (COAFin/BCA)", "ExternalResources"],
      previousVersionSummary: previousPlan?.sections?.executiveSummary?.content?.substring(0, 200),
    },
  }

  // Store as KB entry for COG (document viu)
  try {
    await p.kBEntry.create({
      data: {
        agentRole: "COG",
        kbType: "METHODOLOGY",
        content: `[Business Plan v${version}] ${sections.executiveSummary?.content?.substring(0, 300) || "Plan generat"}`,
        source: "DISTILLED_INTERACTION",
        confidence: 0.9,
        status: "PERMANENT",
        tags: ["business-plan", `v${version}`, new Date().toISOString().split("T")[0]],
        usageCount: 0,
        validatedAt: new Date(),
      },
    })
  } catch { /* duplicate */ }

  return plan
}
