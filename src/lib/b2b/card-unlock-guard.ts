/**
 * card-unlock-guard.ts — State machine pentru deblocarea progresiva a cardurilor B2B
 *
 * Model Onion B2B:
 *   C1 (Ordine interna)    = always available (base card)
 *   C2 (Conformitate)      = requires C1 completed
 *   C3 (Competitivitate)   = requires C1 + C2 completed
 *   C4 (Dezvoltare)        = requires C1 + C2 + C3 completed
 *
 * Fiecare card are criterii de completare bazate pe date reale din DB:
 *   C1: CompanyProfile + minim 1 Job definit + EvaluationSession creata
 *   C2: C1 complet + SalaryGrade definite + PayGapReport existent
 *   C3: C2 complet + evaluare psihometrica initiata + benchmark piata
 *   C4: C3 complet + audit cultura initiat
 */

import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type CardNumber = 1 | 2 | 3 | 4

export type CardStatus = "LOCKED" | "IN_PROGRESS" | "COMPLETED"

export interface CardStatusMap {
  C1: CardStatus
  C2: CardStatus
  C3: CardStatus
  C4: CardStatus
}

export interface UnlockRequirement {
  key: string
  label: string
  met: boolean
  description: string
}

export interface CardUnlockResult {
  unlocked: boolean
  purchaseAllows: boolean
  prerequisitesMet: boolean
  reason?: string
}

export interface CompletionCheck {
  cardNumber: CardNumber
  completed: boolean
  requirements: UnlockRequirement[]
  progress: number // 0-100
}

// ─────────────────────────────────────────
// CARD LABELS (RO)
// ─────────────────────────────────────────

export const CARD_LABELS: Record<CardNumber, { ro: string; en: string }> = {
  1: { ro: "Ordine internă", en: "Internal Order" },
  2: { ro: "Conformitate", en: "Compliance" },
  3: { ro: "Competitivitate", en: "Competitiveness" },
  4: { ro: "Dezvoltare", en: "Development" },
}

// ─────────────────────────────────────────
// COMPLETION CRITERIA CHECKS
// ─────────────────────────────────────────

/**
 * Verifica criteriile de completare pentru C1.
 * C1 complet = CompanyProfile + minim 1 Job + EvaluationSession creata
 */
async function checkC1Completion(tenantId: string): Promise<CompletionCheck> {
  const [companyProfile, jobCount, sessionCount] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.job.count({ where: { tenantId, isActive: true } }),
    prisma.evaluationSession.count({ where: { tenantId } }),
  ])

  const requirements: UnlockRequirement[] = [
    {
      key: "company_profile",
      label: "Profil companie",
      met: companyProfile !== null,
      description: "Completați profilul companiei (minim obiect de activitate)",
    },
    {
      key: "at_least_one_job",
      label: "Minim 1 poziție definită",
      met: jobCount > 0,
      description: "Definiți cel puțin o poziție/fișă de post",
    },
    {
      key: "evaluation_session",
      label: "Sesiune de evaluare creată",
      met: sessionCount > 0,
      description: "Creați o sesiune de evaluare a posturilor",
    },
  ]

  const metCount = requirements.filter((r) => r.met).length
  const progress = Math.round((metCount / requirements.length) * 100)

  return {
    cardNumber: 1,
    completed: requirements.every((r) => r.met),
    requirements,
    progress,
  }
}

/**
 * Verifica criteriile de completare pentru C2.
 * C2 complet = C1 complet + structura salariala definita + analiza pay gap
 */
async function checkC2Completion(tenantId: string): Promise<CompletionCheck> {
  const [salaryGradeCount, payGapCount] = await Promise.all([
    prisma.salaryGrade.count({ where: { tenantId } }),
    prisma.payGapReport.count({ where: { tenantId } }),
  ])

  const requirements: UnlockRequirement[] = [
    {
      key: "c1_complete",
      label: "Card C1 completat",
      met: false, // se seteaza dinamic mai jos
      description: "Completați toate cerințele cardului Ordine internă (C1)",
    },
    {
      key: "salary_structure",
      label: "Structură salarială definită",
      met: salaryGradeCount > 0,
      description: "Definiți cel puțin o clasă/gradă salarială din rezultatele evaluării",
    },
    {
      key: "pay_gap_analysis",
      label: "Analiza pay gap efectuată",
      met: payGapCount > 0,
      description: "Rulați analiza diferențelor salariale (obligatorie EU 2023/970)",
    },
  ]

  // Check C1 completion
  const c1 = await checkC1Completion(tenantId)
  requirements[0].met = c1.completed

  const metCount = requirements.filter((r) => r.met).length
  const progress = Math.round((metCount / requirements.length) * 100)

  return {
    cardNumber: 2,
    completed: requirements.every((r) => r.met),
    requirements,
    progress,
  }
}

/**
 * Verifica criteriile de completare pentru C3.
 * C3 complet = C2 complet + evaluare psihometrica initiata + benchmark piata
 */
async function checkC3Completion(tenantId: string): Promise<CompletionCheck> {
  // Evaluare psihometrica = KPI definitions exists (proxy: company uses performance measurement)
  // Benchmark piata = CompensationPackage with market data
  const [kpiCount, compensationCount] = await Promise.all([
    prisma.kpiDefinition.count({ where: { tenantId } }),
    prisma.compensationPackage.count({ where: { tenantId } }),
  ])

  const requirements: UnlockRequirement[] = [
    {
      key: "c2_complete",
      label: "Card C2 completat",
      met: false, // se seteaza dinamic
      description: "Completați toate cerințele cardului Conformitate (C2)",
    },
    {
      key: "psychometric_evaluation",
      label: "Evaluare psihometrică inițiată",
      met: kpiCount > 0,
      description: "Inițiați evaluarea competențelor și KPI-urilor per poziție",
    },
    {
      key: "market_benchmark",
      label: "Date benchmark piață",
      met: compensationCount > 0,
      description: "Încărcați sau generați date de benchmark salarial pe piață",
    },
  ]

  // Check C2 completion
  const c2 = await checkC2Completion(tenantId)
  requirements[0].met = c2.completed

  const metCount = requirements.filter((r) => r.met).length
  const progress = Math.round((metCount / requirements.length) * 100)

  return {
    cardNumber: 3,
    completed: requirements.every((r) => r.met),
    requirements,
    progress,
  }
}

/**
 * Verifica criteriile de completare pentru C4.
 * C4 complet = C3 complet + audit cultura initiat
 */
async function checkC4Completion(tenantId: string): Promise<CompletionCheck> {
  // Audit cultura = are rapoarte generate de tip FULL sau are simulari
  const [reportCount, simulationCount] = await Promise.all([
    prisma.report.count({ where: { tenantId, type: "FULL" } }),
    prisma.simulationScenario.count({ where: { tenantId } }),
  ])

  const cultureAuditInitiated = reportCount > 0 || simulationCount > 0

  const requirements: UnlockRequirement[] = [
    {
      key: "c3_complete",
      label: "Card C3 completat",
      met: false, // se seteaza dinamic
      description: "Completați toate cerințele cardului Competitivitate (C3)",
    },
    {
      key: "culture_audit",
      label: "Audit cultură organizațională inițiat",
      met: cultureAuditInitiated,
      description: "Inițiați procesul de audit al culturii organizaționale (raport complet sau simulare impact)",
    },
  ]

  // Check C3 completion
  const c3 = await checkC3Completion(tenantId)
  requirements[0].met = c3.completed

  const metCount = requirements.filter((r) => r.met).length
  const progress = Math.round((metCount / requirements.length) * 100)

  return {
    cardNumber: 4,
    completed: requirements.every((r) => r.met),
    requirements,
    progress,
  }
}

// ─────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────

/**
 * Verifica daca un card este deblocat pentru un tenant.
 *
 * Un card e deblocat daca:
 *   1. Tenant-ul a cumparat layer-ul respectiv (ServicePurchase.layer >= cardNumber)
 *   2. Toate cardurile anterioare sunt completate (progressive unlocking)
 *
 * C1 este INTOTDEAUNA disponibil (base card).
 */
export async function isCardUnlocked(
  tenantId: string,
  cardNumber: CardNumber
): Promise<CardUnlockResult> {
  // C1 este mereu disponibil
  if (cardNumber === 1) {
    return { unlocked: true, purchaseAllows: true, prerequisitesMet: true }
  }

  // Verifica daca tenant-ul a cumparat layer-ul necesar
  const purchase = await prisma.servicePurchase.findUnique({
    where: { tenantId },
  })

  const purchaseAllows = purchase !== null && purchase.layer >= cardNumber

  if (!purchaseAllows) {
    return {
      unlocked: false,
      purchaseAllows: false,
      prerequisitesMet: false,
      reason: `Cardul ${CARD_LABELS[cardNumber].ro} necesită achiziția serviciului de nivel ${cardNumber}. Nivelul actual: ${purchase?.layer ?? 0}.`,
    }
  }

  // Verifica daca toate cardurile anterioare sunt completate
  const prerequisiteCard = (cardNumber - 1) as CardNumber
  const prerequisiteCheck = await getCompletionCheck(tenantId, prerequisiteCard)
  const prerequisitesMet = prerequisiteCheck.completed

  if (!prerequisitesMet) {
    const missingReqs = prerequisiteCheck.requirements
      .filter((r) => !r.met)
      .map((r) => r.label)

    return {
      unlocked: false,
      purchaseAllows: true,
      prerequisitesMet: false,
      reason: `Cardul ${CARD_LABELS[cardNumber].ro} necesită completarea cardului ${CARD_LABELS[prerequisiteCard].ro}. Lipsesc: ${missingReqs.join(", ")}.`,
    }
  }

  return { unlocked: true, purchaseAllows: true, prerequisitesMet: true }
}

/**
 * Returneaza statusul tuturor celor 4 carduri pentru un tenant.
 */
export async function getCardStatus(tenantId: string): Promise<CardStatusMap> {
  const [c1, c2, c3, c4] = await Promise.all([
    checkC1Completion(tenantId),
    checkC2Completion(tenantId),
    checkC3Completion(tenantId),
    checkC4Completion(tenantId),
  ])

  const purchase = await prisma.servicePurchase.findUnique({
    where: { tenantId },
  })
  const maxLayer = purchase?.layer ?? 1 // fara achizitie, doar C1 e vizibil

  function resolveStatus(check: CompletionCheck, cardNum: CardNumber): CardStatus {
    if (check.completed) return "COMPLETED"
    if (cardNum > maxLayer) return "LOCKED"
    // Card is available (purchased) but check if prerequisites met
    if (cardNum === 1) return check.progress > 0 ? "IN_PROGRESS" : "IN_PROGRESS"
    // For C2+, check if the previous card is completed
    const prevCompleted =
      cardNum === 2 ? c1.completed :
      cardNum === 3 ? c2.completed :
      c3.completed
    if (!prevCompleted) return "LOCKED"
    return check.progress > 0 ? "IN_PROGRESS" : "IN_PROGRESS"
  }

  return {
    C1: resolveStatus(c1, 1),
    C2: resolveStatus(c2, 2),
    C3: resolveStatus(c3, 3),
    C4: resolveStatus(c4, 4),
  }
}

/**
 * Returneaza ce lipseste pentru a debloca un card specific.
 */
export async function getUnlockRequirements(
  tenantId: string,
  cardNumber: CardNumber
): Promise<UnlockRequirement[]> {
  if (cardNumber === 1) {
    // C1 e mereu deblocat, dar returnam requirements pt completare
    const c1 = await checkC1Completion(tenantId)
    return c1.requirements
  }

  const allRequirements: UnlockRequirement[] = []

  // Verificam achizitia
  const purchase = await prisma.servicePurchase.findUnique({
    where: { tenantId },
  })

  if (!purchase || purchase.layer < cardNumber) {
    allRequirements.push({
      key: "purchase_required",
      label: `Achiziție nivel ${cardNumber}`,
      met: false,
      description: `Trebuie achiziționat pachetul de servicii nivel ${cardNumber} (${CARD_LABELS[cardNumber].ro})`,
    })
  }

  // Cerinte de completare card anterior
  const check = await getCompletionCheck(tenantId, cardNumber)
  allRequirements.push(...check.requirements.filter((r) => !r.met))

  return allRequirements
}

/**
 * Returneaza detaliile de completare pentru un card (intern + public).
 */
export async function getCompletionCheck(
  tenantId: string,
  cardNumber: CardNumber
): Promise<CompletionCheck> {
  switch (cardNumber) {
    case 1: return checkC1Completion(tenantId)
    case 2: return checkC2Completion(tenantId)
    case 3: return checkC3Completion(tenantId)
    case 4: return checkC4Completion(tenantId)
  }
}

/**
 * Returneaza progresul global al tenantului pe toate cardurile.
 */
export async function getOverallProgress(tenantId: string): Promise<{
  currentCard: CardNumber
  overallProgress: number
  cards: Array<{ card: CardNumber; label: string; status: CardStatus; progress: number }>
}> {
  const status = await getCardStatus(tenantId)
  const [c1, c2, c3, c4] = await Promise.all([
    checkC1Completion(tenantId),
    checkC2Completion(tenantId),
    checkC3Completion(tenantId),
    checkC4Completion(tenantId),
  ])

  const checks = [c1, c2, c3, c4]
  const statuses = [status.C1, status.C2, status.C3, status.C4]

  // Card curent = primul card incomplet
  let currentCard: CardNumber = 1
  for (let i = 0; i < 4; i++) {
    if (!checks[i].completed) {
      currentCard = (i + 1) as CardNumber
      break
    }
    if (i === 3) currentCard = 4 // toate complete
  }

  // Progres global = medie ponderata (cardurile blocate nu conteaza)
  const activeCards = checks.filter((_, i) => statuses[i] !== "LOCKED")
  const overallProgress = activeCards.length > 0
    ? Math.round(activeCards.reduce((sum, c) => sum + c.progress, 0) / activeCards.length)
    : 0

  return {
    currentCard,
    overallProgress,
    cards: checks.map((c, i) => ({
      card: (i + 1) as CardNumber,
      label: CARD_LABELS[(i + 1) as CardNumber].ro,
      status: statuses[i],
      progress: c.progress,
    })),
  }
}
