/**
 * mvv/builder.ts — MVV Progressive Builder
 *
 * Construiește MVV progresiv din datele acumulate ale clientului.
 * Pornește de jos (posturi, fișe) și construiește în sus (misiune).
 *
 * Lanțul: Posturi → Fișe → Evaluări → Structură salarială → Benchmark
 *         ↓ AI construiește ↓
 *         Misiune ← Viziune ← Valori ← Obiective ← Atribuții
 */

import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"

export type MVVMaturity = "IMPLICIT" | "EMERGENT" | "PARTIAL" | "SUBSTANTIAL" | "COMPLETE"

export interface MVVState {
  maturity: MVVMaturity
  missionDraft: string | null
  missionValidated: string | null
  visionDraft: string | null
  visionValidated: string | null
  valuesDraft: string[]
  valuesValidated: string[]
  coherenceScore: number | null
  coherenceGaps: Array<{ level: string; gap: string; suggestion: string }>
}

/**
 * Determină nivelul de maturitate MVV pe baza datelor disponibile
 */
export function determineMVVMaturity(data: {
  hasCaen: boolean
  jobCount: number
  hasJobDescriptions: boolean
  hasSalaryStructure: boolean
  hasBenchmark: boolean
  hasMissionValidated: boolean
}): MVVMaturity {
  if (data.hasMissionValidated) return "COMPLETE"
  if (data.hasBenchmark) return "SUBSTANTIAL"
  if (data.hasSalaryStructure) return "PARTIAL"
  if (data.hasJobDescriptions || data.jobCount >= 3) return "EMERGENT"
  return "IMPLICIT"
}

/**
 * Rebuild MVV din datele curente ale clientului.
 * Apelat automat la fiecare acțiune semnificativă.
 */
export async function rebuildMVV(tenantId: string): Promise<MVVState> {
  // 1. Colectăm toate datele disponibile
  const [profile, jobs, sessions] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        caenCode: true, caenName: true, industry: true,
        mission: true, vision: true, values: true, description: true,
        missionDraft: true, visionDraft: true, valuesDraft: true,
        mvvMaturity: true, mvvValidatedAt: true,
      },
    }),
    prisma.job.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { title: true, purpose: true, responsibilities: true, requirements: true },
      take: 20,
    }),
    prisma.evaluationSession.count({
      where: { tenantId, status: { in: ["COMPLETED", "VALIDATED"] } },
    }).catch(() => 0),
  ])

  if (!profile) {
    return {
      maturity: "IMPLICIT",
      missionDraft: null, missionValidated: null,
      visionDraft: null, visionValidated: null,
      valuesDraft: [], valuesValidated: [],
      coherenceScore: null, coherenceGaps: [],
    }
  }

  const hasJobDescriptions = jobs.some(j => j.purpose || j.responsibilities)
  const maturity = determineMVVMaturity({
    hasCaen: !!profile.caenName,
    jobCount: jobs.length,
    hasJobDescriptions,
    hasSalaryStructure: sessions > 0,
    hasBenchmark: false, // TODO: verifică dacă are benchmark
    hasMissionValidated: !!profile.mvvValidatedAt,
  })

  // 2. Dacă maturity e IMPLICIT și nu avem suficiente date → nu generăm
  if (maturity === "IMPLICIT" && jobs.length === 0) {
    return {
      maturity,
      missionDraft: profile.missionDraft, missionValidated: profile.mission,
      visionDraft: profile.visionDraft, visionValidated: profile.vision,
      valuesDraft: profile.valuesDraft || [], valuesValidated: profile.values || [],
      coherenceScore: null, coherenceGaps: [],
    }
  }

  // 3. Construim context din datele de jos (posturi, fișe)
  const jobsSummary = jobs.map(j => {
    const parts = [j.title]
    if (j.purpose) parts.push(`Scop: ${j.purpose}`)
    if (j.responsibilities) parts.push(`Resp: ${j.responsibilities.slice(0, 200)}`)
    return parts.join(" — ")
  }).join("\n")

  // 4. AI construiește MVV de jos în sus
  const cpuResult = await cpuCall({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: "",
    messages: [{
      role: "user",
      content: `Construiește MVV (Misiune, Viziune, Valori) pentru o companie din România.

DATE DISPONIBILE:
- CAEN: ${profile.caenName || profile.industry || "necunoscut"}
- Descriere: ${profile.description || "–"}
- Misiune existentă: ${profile.mission || "–"}
- Viziune existentă: ${profile.vision || "–"}
- Valori existente: ${(profile.values || []).join(", ") || "–"}

POSTURI (de jos în sus — ce face firma concret):
${jobsSummary || "Nicio fișă de post disponibilă"}

INSTRUCȚIUNI:
- Misiunea = ce face compania ACUM, pentru cine, cum (max 2 propoziții)
- Viziunea = unde vrea să ajungă pe termen lung (1 propoziție)
- Valorile = principii operaționale (3-5, scurte)
- Construiește din CE FACE compania (posturi), nu din ce ar vrea să fie
- Dacă are deja misiune/viziune, rafinează — nu înlocui
- Limba: română, formulare profesională, realistă

JSON STRICT:
{
  "mission": "...",
  "vision": "...",
  "values": ["...", "...", "..."],
  "coherenceScore": 0-100,
  "coherenceGaps": [{"level": "misiune-posturi", "gap": "descriere scurtă", "suggestion": "ce să facă"}]
}

coherenceScore = cât de coerent e MVV-ul cu posturile existente.
coherenceGaps = unde sunt inconsistențe (gol dacă totul e coerent).`
    }],
    agentRole: "DOAS",
    operationType: "mvv-build",
    tenantId,
  })

  const text = cpuResult.text
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  let result: MVVState = {
    maturity,
    missionDraft: profile.missionDraft, missionValidated: profile.mission,
    visionDraft: profile.visionDraft, visionValidated: profile.vision,
    valuesDraft: profile.valuesDraft || [], valuesValidated: profile.values || [],
    coherenceScore: null, coherenceGaps: [],
  }

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      result.missionDraft = parsed.mission || result.missionDraft
      result.visionDraft = parsed.vision || result.visionDraft
      result.valuesDraft = parsed.values || result.valuesDraft
      result.coherenceScore = parsed.coherenceScore ?? null
      result.coherenceGaps = parsed.coherenceGaps || []
    } catch {}
  }

  // 5. Salvăm starea
  await prisma.companyProfile.update({
    where: { tenantId },
    data: {
      mvvMaturity: maturity,
      missionDraft: result.missionDraft,
      visionDraft: result.visionDraft,
      valuesDraft: result.valuesDraft,
      mvvLastBuiltAt: new Date(),
      mvvLastBuiltFrom: `${jobs.length} posturi, ${sessions} sesiuni`,
      mvvCoherenceScore: result.coherenceScore,
      mvvCoherenceGaps: result.coherenceGaps as any,
    },
  })

  return result
}

/**
 * Hook: apelat la fiecare acțiune semnificativă.
 * Rebuild MVV dacă datele noi schimbă maturitatea.
 */
export async function mvvRebuildIfNeeded(tenantId: string): Promise<void> {
  try {
    const profile = await prisma.companyProfile.findUnique({
      where: { tenantId },
      select: { mvvMaturity: true, mvvLastBuiltAt: true },
    })

    if (!profile) return

    // Rebuild dacă nu a fost construit niciodată sau dacă a trecut > 1h
    const lastBuilt = profile.mvvLastBuiltAt?.getTime() || 0
    const oneHourAgo = Date.now() - 3600000

    if (lastBuilt < oneHourAgo) {
      await rebuildMVV(tenantId)
    }
  } catch (e) {
    console.log("[MVV] Rebuild skip:", (e as Error).message?.slice(0, 80))
  }
}
