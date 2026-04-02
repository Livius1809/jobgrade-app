/**
 * consultation-meter.ts — Contorul de consultanță în timp
 *
 * Clientul vede: „2h 15min din 10h folosite"
 * Intern calculăm: mesaje × cost mediu → echivalent ore
 *
 * Principii L1+L2+L3:
 * L1: Contorul nu streseaz㠗 arată progres, nu consum
 * L2: Clientul înțelege „ora de consultanță" — e unitatea naturală
 * L3: Transparent dar nu tehnic — nu ascundem, dar nu complicăm
 *
 * ECHIVALENȚA:
 * 1 oră consultanță echivalentă = 18 mesaje (media schimburilor
 * într-o ședință de 1 oră cu un consultant uman)
 *
 * Intern:
 * 18 mesaje × $0.03/mesaj mediu = $0.54 cost AI per oră echivalentă
 * Tariful clientului per oră inclusă în pachet ≈ 45-120 RON
 * (depinde de pachet — Esențial/Partener/Strateg)
 */

// ── Configurare ─────────────────────────────────────────────────────────────

export const CONSULTATION_CONFIG = {
  /** Câte mesaje echivalează o oră de consultanță */
  messagesPerHour: 18,

  /** Ore incluse per pachet B2B */
  packages: {
    esential: { hoursIncluded: 3, label: "Esențial" },
    partener: { hoursIncluded: 12, label: "Partener" },
    strateg: { hoursIncluded: 0, label: "Strateg (nelimitat)" }, // 0 = nelimitat
  },

  /** Ore incluse per pachet B2C */
  b2cPackages: {
    parcurs: { hoursIncluded: 5, label: "Parcurs Descoperă-te" },
    abonament: { hoursIncluded: 4, label: "Abonament lunar" },
  },

  /** Ce activități consumă timp (și cât echivalent) */
  activityWeights: {
    chatMessage: 1,              // 1 mesaj = 1 unitate
    reportGeneration: 5,         // 1 raport = 5 mesaje echivalent
    questionnaireInterpretation: 3, // 1 interpretare = 3 mesaje
    documentAnalysis: 4,         // 1 analiză document = 4 mesaje
    evaluationSession: 8,        // 1 sesiune evaluare = 8 mesaje
  },
}

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface ConsultationUsage {
  /** Total unități consumate (mesaje echivalent) */
  totalUnits: number
  /** Ore echivalente consumate */
  hoursUsed: number
  /** Ore incluse în pachet */
  hoursIncluded: number
  /** Procent utilizat */
  percentUsed: number
  /** Ore rămase */
  hoursRemaining: number
  /** Nelimitat? */
  isUnlimited: boolean
  /** Format afișabil: „2h 15min din 10h" */
  displayText: string
  /** Format scurt: „2h 15min" */
  displayShort: string
  /** Status vizual */
  status: "ok" | "warning" | "critical"
}

// ── Calcul ───────────────────────────────────────────────────────────────────

/**
 * Calculează consumul de consultanță pentru un client.
 *
 * @param totalMessageEquivalents — total unități consumate (mesaje + activități ponderate)
 * @param packageType — tipul de pachet
 */
export function calculateConsultationUsage(
  totalMessageEquivalents: number,
  packageType: keyof typeof CONSULTATION_CONFIG.packages | keyof typeof CONSULTATION_CONFIG.b2cPackages
): ConsultationUsage {
  const config = CONSULTATION_CONFIG.packages[packageType as keyof typeof CONSULTATION_CONFIG.packages]
    || CONSULTATION_CONFIG.b2cPackages[packageType as keyof typeof CONSULTATION_CONFIG.b2cPackages]

  if (!config) {
    return {
      totalUnits: totalMessageEquivalents,
      hoursUsed: 0,
      hoursIncluded: 0,
      percentUsed: 0,
      hoursRemaining: 0,
      isUnlimited: false,
      displayText: "Pachet necunoscut",
      displayShort: "—",
      status: "ok",
    }
  }

  const hoursUsed = totalMessageEquivalents / CONSULTATION_CONFIG.messagesPerHour
  const hoursIncluded = config.hoursIncluded
  const isUnlimited = hoursIncluded === 0

  const hoursRemaining = isUnlimited ? Infinity : Math.max(0, hoursIncluded - hoursUsed)
  const percentUsed = isUnlimited ? 0 : Math.min(100, (hoursUsed / hoursIncluded) * 100)

  // Format display
  const formatHours = (h: number): string => {
    const hrs = Math.floor(h)
    const mins = Math.round((h - hrs) * 60)
    if (hrs === 0) return `${mins}min`
    if (mins === 0) return `${hrs}h`
    return `${hrs}h ${mins}min`
  }

  const displayShort = formatHours(hoursUsed)
  const displayText = isUnlimited
    ? `${displayShort} utilizate (nelimitat)`
    : `${displayShort} din ${hoursIncluded}h utilizate`

  // Status
  let status: ConsultationUsage["status"] = "ok"
  if (!isUnlimited) {
    if (percentUsed >= 90) status = "critical"
    else if (percentUsed >= 75) status = "warning"
  }

  return {
    totalUnits: totalMessageEquivalents,
    hoursUsed: Math.round(hoursUsed * 100) / 100,
    hoursIncluded,
    percentUsed: Math.round(percentUsed),
    hoursRemaining: isUnlimited ? Infinity : Math.round(hoursRemaining * 100) / 100,
    isUnlimited,
    displayText,
    displayShort,
    status,
  }
}

/**
 * Înregistrează o activitate și returnează unitățile echivalente.
 */
export function getActivityUnits(
  activityType: keyof typeof CONSULTATION_CONFIG.activityWeights,
  count: number = 1
): number {
  return CONSULTATION_CONFIG.activityWeights[activityType] * count
}

/**
 * Calculează costul intern real (pentru rapoartele financiare — NU pentru client).
 * Clientul NU vede asta.
 */
export function calculateInternalCost(totalMessageEquivalents: number): {
  costUSD: number
  costRON: number
  hoursEquivalent: number
} {
  const avgCostPerMessage = 0.03 // $0.03 mediu
  const usdToRon = 4.6 // curs aproximativ

  const costUSD = totalMessageEquivalents * avgCostPerMessage
  const costRON = costUSD * usdToRon
  const hoursEquivalent = totalMessageEquivalents / CONSULTATION_CONFIG.messagesPerHour

  return {
    costUSD: Math.round(costUSD * 100) / 100,
    costRON: Math.round(costRON * 100) / 100,
    hoursEquivalent: Math.round(hoursEquivalent * 100) / 100,
  }
}
