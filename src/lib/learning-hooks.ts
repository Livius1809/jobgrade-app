/**
 * learning-hooks.ts — Functii helper pentru alimentarea learning funnel
 * din orice punct al aplicatiei.
 *
 * Principiu: ORICE interactiune care produce cunoastere de business
 * trebuie sa alimenteze learning funnel. Cunoasterea e UNA.
 *
 * Folosire:
 *   import { learnFrom } from "@/lib/learning-hooks"
 *   await learnFrom("SOA", "REPORT_GENERATED", "Raport pay gap generat", "Gap 12% pe gen in IT")
 */

export async function learnFrom(
  agentRole: string,
  type: "CONVERSATION" | "DECISION" | "FEEDBACK" | "SIGNAL" | "REPORT_GENERATED" | "INPUT_RECEIVED",
  input: string,
  output: string,
  metadata?: Record<string, any>,
): Promise<void> {
  if (!output || output.length < 20) return // nu invatam din outputuri triviale

  try {
    const { learningFunnel } = await import("@/lib/agents/learning-funnel")
    await learningFunnel({
      agentRole,
      type: type === "REPORT_GENERATED" ? "DECISION" : type === "INPUT_RECEIVED" ? "FEEDBACK" : type,
      input: input.slice(0, 500),
      output: output.slice(0, 1500),
      success: true,
      metadata: { ...metadata, hookSource: "learning-hooks" },
    })
  } catch {} // fire-and-forget — nu blocam fluxul principal
}

/**
 * Hook specific: client a introdus date (fise post, stat functii, salarii etc)
 * → organismul invata despre structura organizationala a clientului
 */
export async function learnFromClientInput(
  tenantId: string,
  dataType: string,
  summary: string,
): Promise<void> {
  await learnFrom(
    "COCSA", "INPUT_RECEIVED",
    `Client ${tenantId} a introdus: ${dataType}`,
    summary,
    { tenantId, dataType },
  )
}

/**
 * Hook specific: sistem a generat un raport
 * → organismul invata din ce a produs (tipare, insights)
 */
export async function learnFromReport(
  reportType: string,
  tenantId: string,
  summary: string,
): Promise<void> {
  await learnFrom(
    "PMA", "REPORT_GENERATED",
    `Raport ${reportType} generat pentru ${tenantId}`,
    summary,
    { tenantId, reportType },
  )
}

/**
 * Hook specific: simulare WIF completata
 * → organismul invata tipare de impact organizational
 */
export async function learnFromSimulation(
  preset: string,
  mode: string,
  impactSummary: string,
): Promise<void> {
  await learnFrom(
    "PMA", "DECISION",
    `WIF ${preset} (${mode})`,
    impactSummary,
    { preset, mode },
  )
}
