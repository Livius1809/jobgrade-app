/**
 * joint-assessment-workflow.ts — Motor workflow evaluare comună (Art. 10)
 *
 * Conform Art. 10 din Directiva (UE) 2023/970:
 * Când raportul de diferențe salariale (Art. 9) evidențiază un gap > 5%
 * într-o categorie de lucrători, angajatorul trebuie să efectueze o
 * evaluare comună împreună cu reprezentanții salariaților.
 *
 * Statusuri: INITIATED → TEAM_FORMED → IN_PROGRESS → REMEDIATION_PLAN → MONITORING → COMPLETED | ESCALATED
 * Termen legal: 90 de zile lucrătoare de la declanșare
 *
 * Export: triggerJointAssessment, addParticipant, generateRemediationPlan,
 *         checkDeadlines, reEvaluateGap, getAssessmentJournal
 */

// ── Tipuri ──────────────────────────────────────────────────────────────────

export type WorkflowStatus =
  | "INITIATED"
  | "TEAM_FORMED"
  | "IN_PROGRESS"
  | "REMEDIATION_PLAN"
  | "MONITORING"
  | "COMPLETED"
  | "ESCALATED"

export type ParticipantRole = "MANAGEMENT" | "WORKER_REP" | "FACILITATOR"

export interface AssessmentParticipant {
  name: string
  email: string
  role: ParticipantRole
  addedAt: string
}

export interface RemediationAction {
  descriere: string
  responsabil: string
  termenLimita: string      // ISO date
  status: "PLANIFICATĂ" | "ÎN_CURS" | "FINALIZATĂ" | "ANULATĂ"
  notițe?: string
}

export interface RemediationPlan {
  cauzeIdentificate: string[]
  acțiuni: RemediationAction[]
  creatLa: string
  actualizatLa: string
}

export interface JournalEntry {
  timestamp: string
  acțiune: string
  detalii: string
  efectuatDe: string
}

export interface WorkflowData {
  workflowStatus: WorkflowStatus
  categorie: string
  tipCategorie: string
  gapInițial: number
  gapActual?: number
  participanți: AssessmentParticipant[]
  planRemediere?: RemediationPlan
  jurnal: JournalEntry[]
  termenLimită: string      // ISO date — 90 zile lucrătoare
  alerteEmise: string[]     // timestamps ale alertelor emise
}

export interface DeadlineAlert {
  assessmentId: string
  tenantId: string
  categorie: string
  gapProcent: number
  zileLucrătoareRămase: number
  nivel: "INFO" | "AVERTISMENT" | "URGENT" | "CRITIC"
  mesaj: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculează data la N zile lucrătoare de la o dată de start.
 * Exclude sâmbăta (6) și duminica (0).
 */
function adaugăZileLucrătoare(start: Date, zile: number): Date {
  const result = new Date(start)
  let adăugate = 0
  while (adăugate < zile) {
    result.setDate(result.getDate() + 1)
    const zi = result.getDay()
    if (zi !== 0 && zi !== 6) {
      adăugate++
    }
  }
  return result
}

/**
 * Calculează zilele lucrătoare rămase între acum și termenul limită.
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
 * Mapare WorkflowStatus → AssessmentStatus (enum Prisma existent).
 */
function mapWorkflowToPrismaStatus(ws: WorkflowStatus): string {
  switch (ws) {
    case "INITIATED":
    case "TEAM_FORMED":
      return "OPEN"
    case "IN_PROGRESS":
    case "REMEDIATION_PLAN":
    case "MONITORING":
      return "IN_PROGRESS"
    case "COMPLETED":
      return "RESOLVED"
    case "ESCALATED":
      return "CLOSED"
  }
}

function addJournalEntry(
  data: WorkflowData,
  acțiune: string,
  detalii: string,
  efectuatDe: string
): void {
  data.jurnal.push({
    timestamp: new Date().toISOString(),
    acțiune,
    detalii,
    efectuatDe,
  })
}

// ── Funcții principale ──────────────────────────────────────────────────────

/**
 * Declanșează o evaluare comună pentru o categorie cu gap > 5%.
 * Creează sau actualizează înregistrarea JointPayAssessment.
 *
 * @param tenantId - ID-ul organizației
 * @param category - Numele categoriei (job family / departament / nivel)
 * @param categoryType - Tipul categoriei (JOB_FAMILY / DEPARTAMENT / NIVEL_IERARHIC / OVERALL)
 * @param gapPercent - Procentul gap-ului detectat
 * @param prisma - instanța Prisma
 * @returns Înregistrarea creată
 */
export async function triggerJointAssessment(
  tenantId: string,
  category: string,
  categoryType: string,
  gapPercent: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<any> {
  const termenLimită = adaugăZileLucrătoare(new Date(), 90)

  const workflowData: WorkflowData = {
    workflowStatus: "INITIATED",
    categorie: category,
    tipCategorie: categoryType,
    gapInițial: gapPercent,
    participanți: [],
    jurnal: [],
    termenLimită: termenLimită.toISOString(),
    alerteEmise: [],
  }

  addJournalEntry(
    workflowData,
    "EVALUARE_DECLANȘATĂ",
    `Evaluare comună declanșată automat. Categorie: ${category} (${categoryType}), gap: ${gapPercent}%. Termen limită: ${termenLimită.toISOString().split("T")[0]}. Conform Art. 10 Directiva (UE) 2023/970.`,
    "SISTEM"
  )

  const assessment = await prisma.jointPayAssessment.create({
    data: {
      tenantId,
      triggerReason: `Gap salarial de gen ${gapPercent}% detectat în categoria „${category}" (${categoryType}). Art. 10 impune evaluare comună.`,
      status: "OPEN",
      dueDate: termenLimită,
      actionPlan: workflowData,
      createdBy: "SISTEM_AUTO",
    },
  })

  return assessment
}

/**
 * Adaugă un participant la echipa de evaluare comună.
 *
 * @param assessmentId - ID-ul evaluării
 * @param participant - Datele participantului
 * @param addedBy - Cine adaugă participantul
 * @param prisma - instanța Prisma
 */
export async function addParticipant(
  assessmentId: string,
  participant: { name: string; email: string; role: ParticipantRole },
  addedBy: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<any> {
  const assessment = await prisma.jointPayAssessment.findUnique({
    where: { id: assessmentId },
  })

  if (!assessment) {
    throw new Error(`Evaluarea comună ${assessmentId} nu a fost găsită.`)
  }

  const data = (assessment.actionPlan as WorkflowData) || {} as WorkflowData
  if (!data.participanți) data.participanți = []
  if (!data.jurnal) data.jurnal = []

  // Verifică duplicat
  const existent = data.participanți.find(
    (p) => p.email === participant.email
  )
  if (existent) {
    throw new Error(`Participantul ${participant.email} este deja în echipă.`)
  }

  data.participanți.push({
    ...participant,
    addedAt: new Date().toISOString(),
  })

  const roleLabel: Record<ParticipantRole, string> = {
    MANAGEMENT: "Management",
    WORKER_REP: "Reprezentant salariați",
    FACILITATOR: "Facilitator",
  }

  addJournalEntry(
    data,
    "PARTICIPANT_ADĂUGAT",
    `${participant.name} (${participant.email}) adăugat ca ${roleLabel[participant.role]}.`,
    addedBy
  )

  // Verifică dacă echipa este completă (min 1 management + 1 worker_rep)
  const areManagement = data.participanți.some((p) => p.role === "MANAGEMENT")
  const areWorkerRep = data.participanți.some((p) => p.role === "WORKER_REP")

  if (areManagement && areWorkerRep && data.workflowStatus === "INITIATED") {
    data.workflowStatus = "TEAM_FORMED"
    addJournalEntry(
      data,
      "ECHIPĂ_FORMATĂ",
      `Echipa de evaluare comună este completă. Minimum cerut: 1 reprezentant management + 1 reprezentant salariați.`,
      "SISTEM"
    )
  }

  const updated = await prisma.jointPayAssessment.update({
    where: { id: assessmentId },
    data: {
      actionPlan: data,
      status: mapWorkflowToPrismaStatus(data.workflowStatus),
    },
  })

  return updated
}

/**
 * Generează planul de remediere cu cauze identificate și acțiuni concrete.
 *
 * @param assessmentId - ID-ul evaluării
 * @param causes - Lista cauzelor identificate
 * @param actions - Lista acțiunilor concrete
 * @param createdBy - Cine creează planul
 * @param prisma - instanța Prisma
 */
export async function generateRemediationPlan(
  assessmentId: string,
  causes: string[],
  actions: Array<{
    descriere: string
    responsabil: string
    termenLimita: string
  }>,
  createdBy: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<any> {
  const assessment = await prisma.jointPayAssessment.findUnique({
    where: { id: assessmentId },
  })

  if (!assessment) {
    throw new Error(`Evaluarea comună ${assessmentId} nu a fost găsită.`)
  }

  const data = assessment.actionPlan as WorkflowData
  if (!data.jurnal) data.jurnal = []

  if (!["TEAM_FORMED", "IN_PROGRESS"].includes(data.workflowStatus)) {
    throw new Error(
      `Planul de remediere poate fi creat doar în statusul TEAM_FORMED sau IN_PROGRESS. Status curent: ${data.workflowStatus}.`
    )
  }

  const acum = new Date().toISOString()

  data.planRemediere = {
    cauzeIdentificate: causes,
    acțiuni: actions.map((a) => ({
      descriere: a.descriere,
      responsabil: a.responsabil,
      termenLimita: a.termenLimita,
      status: "PLANIFICATĂ" as const,
    })),
    creatLa: acum,
    actualizatLa: acum,
  }

  data.workflowStatus = "REMEDIATION_PLAN"

  addJournalEntry(
    data,
    "PLAN_REMEDIERE_CREAT",
    `Plan de remediere creat cu ${causes.length} cauze identificate și ${actions.length} acțiuni concrete. Responsabili: ${[...new Set(actions.map((a) => a.responsabil))].join(", ")}.`,
    createdBy
  )

  // Adaugă cauza rădăcină în câmpul dedicat al modelului
  const rootCause = causes.join("; ")

  const updated = await prisma.jointPayAssessment.update({
    where: { id: assessmentId },
    data: {
      actionPlan: data,
      rootCause,
      status: mapWorkflowToPrismaStatus(data.workflowStatus),
    },
  })

  return updated
}

/**
 * Verifică toate evaluările active ale unui tenant și returnează alerte
 * la pragurile de 30, 60, 85, 90 zile lucrătoare consumate.
 *
 * @param tenantId - ID-ul organizației
 * @param prisma - instanța Prisma
 * @returns Lista de alerte deadline
 */
export async function checkDeadlines(
  tenantId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<DeadlineAlert[]> {
  const assessments = await prisma.jointPayAssessment.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  })

  const alerts: DeadlineAlert[] = []

  for (const assessment of assessments) {
    const data = assessment.actionPlan as WorkflowData | null
    if (!data?.termenLimită) continue

    const termenLimită = new Date(data.termenLimită)
    const rămase = zileLucrătoareRămase(termenLimită)

    let nivel: DeadlineAlert["nivel"] | null = null
    let mesaj = ""

    if (rămase <= 0) {
      nivel = "CRITIC"
      mesaj = `TERMEN DEPĂȘIT! Evaluarea comună pentru „${data.categorie}" a depășit termenul de 90 de zile lucrătoare. Se impune escaladare conform Art. 10.`
    } else if (rămase <= 5) {
      nivel = "CRITIC"
      mesaj = `CRITIC: Mai sunt doar ${rămase} zile lucrătoare pentru evaluarea comună „${data.categorie}" (gap: ${data.gapInițial}%). Termen: ${termenLimită.toISOString().split("T")[0]}.`
    } else if (rămase <= 30) {
      nivel = "URGENT"
      mesaj = `URGENT: ${rămase} zile lucrătoare rămase pentru evaluarea comună „${data.categorie}" (gap: ${data.gapInițial}%). Finalizați planul de remediere.`
    } else if (rămase <= 60) {
      nivel = "AVERTISMENT"
      mesaj = `AVERTISMENT: ${rămase} zile lucrătoare rămase pentru evaluarea comună „${data.categorie}" (gap: ${data.gapInițial}%). Asigurați-vă că echipa lucrează activ.`
    } else if (rămase <= 90 && rămase >= 60) {
      nivel = "INFO"
      mesaj = `INFO: ${rămase} zile lucrătoare rămase pentru evaluarea comună „${data.categorie}" (gap: ${data.gapInițial}%). Status: ${data.workflowStatus}.`
    }

    if (nivel) {
      alerts.push({
        assessmentId: assessment.id,
        tenantId: assessment.tenantId,
        categorie: data.categorie,
        gapProcent: data.gapInițial,
        zileLucrătoareRămase: rămase,
        nivel,
        mesaj,
      })

      // Escaladare automată dacă termenul e depășit
      if (rămase <= 0 && data.workflowStatus !== "ESCALATED" && data.workflowStatus !== "COMPLETED") {
        data.workflowStatus = "ESCALATED"
        addJournalEntry(
          data,
          "ESCALADARE_AUTOMATĂ",
          `Termen de 90 de zile lucrătoare depășit. Evaluarea a fost escaladată automat. Se impune notificarea autorității competente.`,
          "SISTEM"
        )

        await prisma.jointPayAssessment.update({
          where: { id: assessment.id },
          data: {
            actionPlan: data,
            status: "CLOSED",
          },
        })
      }
    }
  }

  return alerts.sort((a, b) => a.zileLucrătoareRămase - b.zileLucrătoareRămase)
}

/**
 * Re-evaluează gap-ul salarial pentru categoria unei evaluări comune,
 * după aplicarea măsurilor de remediere.
 *
 * @param assessmentId - ID-ul evaluării
 * @param prisma - instanța Prisma
 * @returns Obiect cu gap-ul nou calculat și statusul actualizat
 */
export async function reEvaluateGap(
  assessmentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<{ gapNou: number; remediat: boolean; assessment: any }> {
  const assessment = await prisma.jointPayAssessment.findUnique({
    where: { id: assessmentId },
  })

  if (!assessment) {
    throw new Error(`Evaluarea comună ${assessmentId} nu a fost găsită.`)
  }

  const data = assessment.actionPlan as WorkflowData

  if (!["REMEDIATION_PLAN", "MONITORING"].includes(data.workflowStatus)) {
    throw new Error(
      `Re-evaluarea se poate face doar în statusul REMEDIATION_PLAN sau MONITORING. Status curent: ${data.workflowStatus}.`
    )
  }

  // Recalculăm gap-ul din datele salariale curente
  const { generatePayGapReport } = await import("./pay-gap-report")
  const raport = await generatePayGapReport(assessment.tenantId, prisma)

  // Căutăm categoria specifică în raport
  let gapNou = 0
  const tipCategorie = data.tipCategorie
  const categorie = data.categorie

  if (tipCategorie === "JOB_FAMILY" || tipCategorie === "OVERALL") {
    const found = raport.categoriiLucratori.find((c) => `${c.functie} (${c.norma})` === categorie || c.functie === categorie)
    gapNou = found?.gapMedieProcent ?? 0
  }

  data.gapActual = gapNou
  const remediat = Math.abs(gapNou) <= 5

  if (remediat) {
    data.workflowStatus = "COMPLETED"
    addJournalEntry(
      data,
      "GAP_REMEDIAT",
      `Gap-ul a fost redus la ${gapNou}% (sub pragul de 5%). Evaluarea comună se consideră finalizată cu succes.`,
      "SISTEM"
    )
  } else {
    data.workflowStatus = "MONITORING"
    addJournalEntry(
      data,
      "RE_EVALUARE",
      `Gap re-evaluat: ${gapNou}% (inițial: ${data.gapInițial}%). Gap-ul rămâne peste 5%, monitorizarea continuă.`,
      "SISTEM"
    )
  }

  const updated = await prisma.jointPayAssessment.update({
    where: { id: assessmentId },
    data: {
      actionPlan: data,
      status: mapWorkflowToPrismaStatus(data.workflowStatus),
      resolvedAt: remediat ? new Date() : undefined,
    },
  })

  return { gapNou, remediat, assessment: updated }
}

/**
 * Returnează jurnalul complet al unei evaluări comune — probă legală.
 * Include toate acțiunile, participanții, timestamp-urile și tranzițiile de status.
 *
 * @param assessmentId - ID-ul evaluării
 * @param prisma - instanța Prisma
 * @returns Jurnal structurat cu toate detaliile
 */
export async function getAssessmentJournal(
  assessmentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<{
  assessmentId: string
  tenantId: string
  categorie: string
  tipCategorie: string
  gapInițial: number
  gapActual: number | null
  workflowStatus: WorkflowStatus
  termenLimită: string
  participanți: AssessmentParticipant[]
  planRemediere: RemediationPlan | null
  intrăriJurnal: JournalEntry[]
  sumar: {
    totalIntrări: number
    dataÎnceput: string
    dataUltimăActualizare: string
    zileLucrătoareRămase: number
  }
}> {
  const assessment = await prisma.jointPayAssessment.findUnique({
    where: { id: assessmentId },
  })

  if (!assessment) {
    throw new Error(`Evaluarea comună ${assessmentId} nu a fost găsită.`)
  }

  const data = assessment.actionPlan as WorkflowData

  const termenLimită = new Date(data.termenLimită)
  const rămase = zileLucrătoareRămase(termenLimită)

  const jurnal = data.jurnal || []

  return {
    assessmentId: assessment.id,
    tenantId: assessment.tenantId,
    categorie: data.categorie,
    tipCategorie: data.tipCategorie,
    gapInițial: data.gapInițial,
    gapActual: data.gapActual ?? null,
    workflowStatus: data.workflowStatus,
    termenLimită: data.termenLimită,
    participanți: data.participanți || [],
    planRemediere: data.planRemediere ?? null,
    intrăriJurnal: jurnal,
    sumar: {
      totalIntrări: jurnal.length,
      dataÎnceput: jurnal.length > 0 ? jurnal[0].timestamp : assessment.triggeredAt.toISOString(),
      dataUltimăActualizare:
        jurnal.length > 0 ? jurnal[jurnal.length - 1].timestamp : assessment.triggeredAt.toISOString(),
      zileLucrătoareRămase: rămase,
    },
  }
}
