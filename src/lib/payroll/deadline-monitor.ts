/**
 * deadline-monitor.ts — Monitorizare termene evaluări comune (Art. 10)
 *
 * Destinat execuției periodice via cron n8n.
 * Verifică toate evaluările comune active din toate organizațiile
 * și generează alerte structurate pentru notificări ntfy.
 *
 * Praguri alertare:
 *  - ≥ 60 zile rămase → INFO (la 30 zile consumate)
 *  - 30–59 zile rămase → AVERTISMENT (la 60 zile consumate)
 *  - 5–29 zile rămase → URGENT (la 85 zile consumate)
 *  - ≤ 5 zile sau depășit → CRITIC/ESCALADARE (la 90 zile consumate)
 *
 * Export: monitorAllDeadlines
 */

// ── Tipuri ──────────────────────────────────────────────────────────────────

export interface MonitorAlert {
  assessmentId: string
  tenantId: string
  categorie: string
  tipCategorie: string
  gapProcent: number
  workflowStatus: string
  zileLucrătoareRămase: number
  termenLimită: string
  nivel: "INFO" | "AVERTISMENT" | "URGENT" | "CRITIC"
  mesaj: string
  ntfyPriority: 1 | 2 | 3 | 5    // min/low/default/max (ntfy priority levels)
  ntfyTags: string[]
}

export interface MonitorResult {
  timestamp: string
  totalEvaluăriActive: number
  totalAlerte: number
  alerte: MonitorAlert[]
  sumarPerNivel: {
    INFO: number
    AVERTISMENT: number
    URGENT: number
    CRITIC: number
  }
  sumarPerTenant: Array<{
    tenantId: string
    evaluăriActive: number
    alerte: number
    celMaiUrgent: string | null
  }>
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculează zilele lucrătoare rămase până la termen.
 */
function zileLucrătoareRămase(termenLimită: Date): number {
  const acum = new Date()
  if (acum >= termenLimită) return 0

  let zile = 0
  const cursor = new Date(acum)
  while (cursor < termenLimită) {
    cursor.setDate(cursor.getDate() + 1)
    const zi = cursor.getDay()
    if (zi !== 0 && zi !== 6) {
      zile++
    }
  }
  return zile
}

/**
 * Calculează zilele lucrătoare depășite după termen.
 */
function zileLucrătoareDepășite(termenLimită: Date): number {
  const acum = new Date()
  if (acum <= termenLimită) return 0

  let zile = 0
  const cursor = new Date(termenLimită)
  while (cursor < acum) {
    cursor.setDate(cursor.getDate() + 1)
    const zi = cursor.getDay()
    if (zi !== 0 && zi !== 6) {
      zile++
    }
  }
  return zile
}

// ── Funcție principală ──────────────────────────────────────────────────────

/**
 * Monitorizează toate evaluările comune active din toate organizațiile.
 * Generează alerte structurate pentru integrare cu ntfy.
 *
 * @param prisma - instanța Prisma
 * @returns Rezultat complet cu alerte și sumar
 */
export async function monitorAllDeadlines(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<MonitorResult> {
  // Preia toate evaluările active (OPEN sau IN_PROGRESS în schema Prisma)
  const assessments = await prisma.jointPayAssessment.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    orderBy: { triggeredAt: "asc" },
  })

  const alerte: MonitorAlert[] = []
  const tenantMap = new Map<string, { evaluări: number; alerte: number; celMaiUrgent: number | null }>()

  for (const assessment of assessments) {
    const data = assessment.actionPlan as any
    if (!data?.termenLimită) continue

    // Tracking per tenant
    if (!tenantMap.has(assessment.tenantId)) {
      tenantMap.set(assessment.tenantId, { evaluări: 0, alerte: 0, celMaiUrgent: null })
    }
    const tenantStats = tenantMap.get(assessment.tenantId)!
    tenantStats.evaluări++

    const termenLimită = new Date(data.termenLimită)
    const rămase = zileLucrătoareRămase(termenLimită)
    const depășite = zileLucrătoareDepășite(termenLimită)

    let nivel: MonitorAlert["nivel"]
    let mesaj: string
    let ntfyPriority: MonitorAlert["ntfyPriority"]
    let ntfyTags: string[]

    if (rămase <= 0) {
      // Termen depășit
      nivel = "CRITIC"
      ntfyPriority = 5
      ntfyTags = ["rotating_light", "warning", "art10", "deadline_depasit"]
      mesaj = [
        `TERMEN DEPĂȘIT cu ${depășite} zile lucrătoare!`,
        `Evaluare comună: „${data.categorie}" (${data.tipCategorie}).`,
        `Gap inițial: ${data.gapInițial}%.`,
        `Status workflow: ${data.workflowStatus}.`,
        `Se impune escaladare imediată și notificarea autorității competente (ITM/CNCD).`,
      ].join(" ")

      // Escaladare automată în workflow
      if (data.workflowStatus !== "ESCALATED" && data.workflowStatus !== "COMPLETED") {
        data.workflowStatus = "ESCALATED"
        if (!data.jurnal) data.jurnal = []
        data.jurnal.push({
          timestamp: new Date().toISOString(),
          acțiune: "ESCALADARE_AUTOMATĂ_MONITOR",
          detalii: `Monitorizarea automată a detectat depășirea termenului cu ${depășite} zile lucrătoare. Evaluarea a fost escaladată.`,
          efectuatDe: "CRON_MONITOR",
        })

        await prisma.jointPayAssessment.update({
          where: { id: assessment.id },
          data: {
            actionPlan: data,
            status: "CLOSED",
          },
        })
      }
    } else if (rămase <= 5) {
      // Ultim avertisment — 85-90 zile consumate
      nivel = "CRITIC"
      ntfyPriority = 5
      ntfyTags = ["rotating_light", "art10", "deadline_iminent"]
      mesaj = [
        `CRITIC: Mai sunt doar ${rămase} zile lucrătoare!`,
        `Evaluare comună: „${data.categorie}" (${data.tipCategorie}).`,
        `Gap inițial: ${data.gapInițial}%.`,
        `Termen: ${termenLimită.toISOString().split("T")[0]}.`,
        `Status: ${data.workflowStatus}.`,
        `Finalizați imediat sau pregătiți escaladarea.`,
      ].join(" ")
    } else if (rămase <= 30) {
      // Urgent — 60-85 zile consumate
      nivel = "URGENT"
      ntfyPriority = 3
      ntfyTags = ["warning", "art10", "deadline_urgent"]
      mesaj = [
        `URGENT: ${rămase} zile lucrătoare rămase.`,
        `Evaluare comună: „${data.categorie}" (${data.tipCategorie}).`,
        `Gap: ${data.gapInițial}%.`,
        `Termen: ${termenLimită.toISOString().split("T")[0]}.`,
        `Status: ${data.workflowStatus}.`,
        data.planRemediere
          ? `Plan de remediere existent — verificați progresul acțiunilor.`
          : `NU există plan de remediere — creați-l urgent!`,
      ].join(" ")
    } else if (rămase <= 60) {
      // Avertisment — 30-60 zile consumate
      nivel = "AVERTISMENT"
      ntfyPriority = 2
      ntfyTags = ["hourglass", "art10"]
      mesaj = [
        `AVERTISMENT: ${rămase} zile lucrătoare rămase.`,
        `Evaluare comună: „${data.categorie}" (${data.tipCategorie}), gap ${data.gapInițial}%.`,
        `Status: ${data.workflowStatus}.`,
        `Asigurați-vă că echipa lucrează activ la identificarea cauzelor.`,
      ].join(" ")
    } else {
      // Info — sub 30 zile consumate
      nivel = "INFO"
      ntfyPriority = 1
      ntfyTags = ["information_source", "art10"]
      mesaj = [
        `INFO: ${rămase} zile lucrătoare rămase.`,
        `Evaluare comună: „${data.categorie}" (${data.tipCategorie}), gap ${data.gapInițial}%.`,
        `Status: ${data.workflowStatus}.`,
        data.participanți?.length > 0
          ? `Echipă: ${data.participanți.length} participanți.`
          : `Echipa nu a fost încă formată — adăugați participanți.`,
      ].join(" ")
    }

    const alertă: MonitorAlert = {
      assessmentId: assessment.id,
      tenantId: assessment.tenantId,
      categorie: data.categorie,
      tipCategorie: data.tipCategorie,
      gapProcent: data.gapInițial,
      workflowStatus: data.workflowStatus,
      zileLucrătoareRămase: rămase,
      termenLimită: data.termenLimită,
      nivel,
      mesaj,
      ntfyPriority,
      ntfyTags,
    }

    alerte.push(alertă)
    tenantStats.alerte++

    if (tenantStats.celMaiUrgent === null || rămase < tenantStats.celMaiUrgent) {
      tenantStats.celMaiUrgent = rămase
    }
  }

  // Sortăm alertele: cele mai urgente primele
  alerte.sort((a, b) => a.zileLucrătoareRămase - b.zileLucrătoareRămase)

  // Sumar per nivel
  const sumarPerNivel = {
    INFO: alerte.filter((a) => a.nivel === "INFO").length,
    AVERTISMENT: alerte.filter((a) => a.nivel === "AVERTISMENT").length,
    URGENT: alerte.filter((a) => a.nivel === "URGENT").length,
    CRITIC: alerte.filter((a) => a.nivel === "CRITIC").length,
  }

  // Sumar per tenant
  const sumarPerTenant = Array.from(tenantMap.entries()).map(
    ([tenantId, stats]) => ({
      tenantId,
      evaluăriActive: stats.evaluări,
      alerte: stats.alerte,
      celMaiUrgent:
        stats.celMaiUrgent !== null
          ? stats.celMaiUrgent <= 0
            ? "DEPĂȘIT"
            : `${stats.celMaiUrgent} zile lucrătoare`
          : null,
    })
  )

  return {
    timestamp: new Date().toISOString(),
    totalEvaluăriActive: assessments.length,
    totalAlerte: alerte.length,
    alerte,
    sumarPerNivel,
    sumarPerTenant,
  }
}
