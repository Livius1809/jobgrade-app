/**
 * safety-monitor-runtime.ts — SafetyMonitor B2C Runtime
 *
 * Scanare PREVENTIVĂ a mesajelor B2C pentru pattern-uri DSM-5 de risc
 * ÎNAINTE ca mesajul să ajungă la AI.
 *
 * 4 niveluri de alertă:
 *   CRITIC — risc imediat (suicid, self-harm activ): blochează AI, oferă resurse criză
 *   RIDICAT — risc semnificativ: flag sesiune, notificare echipă, AI cu precauție
 *   MODERAT — pattern îngrijorător: log, AI continuă cu ton adaptat
 *   INFORMATIV — observație: log doar, zero intervenție
 *
 * PRINCIPII:
 *   - NU diagnosticăm. NU etichetăm. NU interpretăm clinic.
 *   - Oferim resurse. Recunoaștem suferința. Protejăm.
 *   - Prefer false positives decât false negatives la nivel CRITIC.
 *   - Confidențialitate maximă — log-urile safety sunt separate și protejate.
 *
 * Resurse criză România:
 *   - Telefonul Sufletului: 0800 801 200 (non-stop, gratuit)
 *   - Linia de urgență: 112
 */

import { cpuCall } from "@/lib/cpu/gateway"

// ── Types ──────────────────────────────────────────────────────────────────

export type AlertLevel = "CRITIC" | "RIDICAT" | "MODERAT" | "INFORMATIV"

export interface SafetyPattern {
  id: string
  category: SafetyCategory
  alertLevel: AlertLevel
  triggers: RegExp[]
  keywords: string[]
  confidence: number // 0-1 base confidence
  description: string
}

export type SafetyCategory =
  | "SUICIDAL_IDEATION"
  | "SELF_HARM"
  | "PSYCHOTIC_SYMPTOMS"
  | "SEVERE_DISSOCIATION"
  | "SUBSTANCE_ABUSE_CRISIS"
  | "HARM_TO_OTHERS"
  | "EATING_DISORDER_CRISIS"
  | "PANIC_SEVERE"

export interface SessionContext {
  sessionId: string
  userId: string
  messageCount: number
  previousAlerts: AlertLevel[]
  isMinor?: boolean
  currentCardId?: string
}

export interface SafetyScanResult {
  /** Nivelul cel mai ridicat de alertă detectat */
  alertLevel: AlertLevel | null
  /** Toate pattern-urile detectate */
  detections: SafetyDetection[]
  /** Dacă true, mesajul NU trebuie procesat de AI */
  blocked: boolean
  /** Mesajul de criză (dacă blocked=true) */
  crisisResponse?: string
  /** Instrucțiuni suplimentare pentru AI (dacă blocked=false dar alertLevel != null) */
  aiGuidance?: string
  /** Dacă true, sesiunea trebuie flagged pentru review */
  flagSession: boolean
  /** Dacă true, echipa safety trebuie notificată */
  notifySafetyTeam: boolean
}

export interface SafetyDetection {
  patternId: string
  category: SafetyCategory
  alertLevel: AlertLevel
  confidence: number
  matchedText: string
  timestamp: Date
}

// ── Crisis Resources ───────────────────────────────────────────────────────

const CRISIS_RESOURCES_RO = {
  primary: {
    name: "Telefonul Sufletului",
    number: "0800 801 200",
    description: "Linie non-stop, gratuită, confidențială",
  },
  emergency: {
    name: "Serviciul de urgență",
    number: "112",
    description: "Pentru situații de urgență imediată",
  },
  additional: [
    {
      name: "Asociația Telefonul Sufletului",
      url: "https://www.telefonulsufletului.ro",
    },
    {
      name: "Linia pentru copii și adolescenți",
      number: "116 111",
      description: "Non-stop, gratuit",
    },
  ],
}

// ── Pattern Definitions ────────────────────────────────────────────────────

const SAFETY_PATTERNS: SafetyPattern[] = [
  // ═══ CRITIC — Suicidal Ideation ═══
  {
    id: "SUI_ACTIVE_PLAN",
    category: "SUICIDAL_IDEATION",
    alertLevel: "CRITIC",
    triggers: [
      /vreau\s+să\s+(mă\s+)?sinucid/i,
      /vreau\s+să\s+mor/i,
      /mă\s+omor/i,
      /o\s+să\s+mă\s+sinucid/i,
      /am\s+un\s+plan\s+(să|de)/i,
      /nu\s+mai\s+vreau\s+să\s+trăiesc/i,
      /viața\s+(mea\s+)?nu\s+(mai\s+)?are\s+sens/i,
      /toată\s+lumea\s+ar\s+fi\s+mai\s+bine\s+fără\s+mine/i,
      /want\s+to\s+(kill\s+myself|die|end\s+(it|my\s+life))/i,
      /going\s+to\s+(kill\s+myself|end\s+it)/i,
      /suicide\s+(plan|method|note)/i,
      /i('m|\s+am)\s+going\s+to\s+do\s+it/i,
    ],
    keywords: ["sinucidere", "sinucid", "suicid", "suicide", "să mor", "mă omor"],
    confidence: 0.9,
    description: "Ideație suicidară activă cu intenție sau plan",
  },
  {
    id: "SUI_PASSIVE",
    category: "SUICIDAL_IDEATION",
    alertLevel: "RIDICAT",
    triggers: [
      /nu\s+mai\s+am\s+rost/i,
      /nu\s+mai\s+are\s+rost/i,
      /mai\s+bine\s+(nu\s+)?m-aș\s+fi\s+născut/i,
      /nu\s+vreau\s+să\s+mă\s+trezesc/i,
      /wish\s+i\s+(was|were)\s+(dead|never\s+born)/i,
      /no\s+reason\s+to\s+(live|go\s+on)/i,
      /aș\s+vrea\s+să\s+dispar/i,
    ],
    keywords: ["fără rost", "nu mai are sens", "dispar"],
    confidence: 0.7,
    description: "Ideație suicidară pasivă — fără plan explicit",
  },

  // ═══ CRITIC — Self-Harm Active ═══
  {
    id: "SH_ACTIVE",
    category: "SELF_HARM",
    alertLevel: "CRITIC",
    triggers: [
      /mă\s+tai\s+(acum|chiar|din\s+nou)/i,
      /m-am\s+tăiat/i,
      /sângerez/i,
      /am\s+luat\s+(prea\s+)?multe\s+pastile/i,
      /am\s+înghițit/i,
      /cutting\s+(myself|again|right\s+now)/i,
      /i('m|\s+am)\s+bleeding/i,
      /took\s+(too\s+many|all\s+(the|my))\s+(pills|medication)/i,
      /overdose/i,
    ],
    keywords: ["mă tai", "tăiat", "sânger", "pastile", "overdose"],
    confidence: 0.9,
    description: "Self-harm activ în curs sau recent",
  },
  {
    id: "SH_URGE",
    category: "SELF_HARM",
    alertLevel: "RIDICAT",
    triggers: [
      /vreau\s+să\s+mă\s+tai/i,
      /simt\s+(nevoia|impulsul)\s+să/i,
      /want\s+to\s+(cut|hurt)\s+myself/i,
      /urge\s+to\s+(self-?harm|cut)/i,
      /nu\s+mă\s+pot\s+opri\s+din/i,
    ],
    keywords: ["impuls", "nevoie să mă tai", "hurt myself"],
    confidence: 0.75,
    description: "Impuls de self-harm — nu confirmat ca activ",
  },

  // ═══ RIDICAT — Psychotic Symptoms ═══
  {
    id: "PSY_HALLUCINATION",
    category: "PSYCHOTIC_SYMPTOMS",
    alertLevel: "RIDICAT",
    triggers: [
      /aud\s+voci\s+(care|ce)/i,
      /vocea\s+(îmi\s+)?spune\s+să/i,
      /cineva\s+mă\s+urmărește/i,
      /mi-au\s+pus\s+ceva\s+în/i,
      /sunt\s+controlat/i,
      /hearing\s+voices/i,
      /the\s+voice\s+(tells|told)\s+me\s+to/i,
      /they('re|\s+are)\s+(watching|following|controlling)\s+me/i,
      /implant/i,
    ],
    keywords: ["voci", "urmărește", "controlat", "voices", "watching me"],
    confidence: 0.7,
    description: "Simptome psihotice — halucinații, paranoia structurată",
  },

  // ═══ RIDICAT — Severe Dissociation ═══
  {
    id: "DIS_SEVERE",
    category: "SEVERE_DISSOCIATION",
    alertLevel: "RIDICAT",
    triggers: [
      /nu\s+sunt\s+real/i,
      /nimic\s+nu\s+e\s+real/i,
      /nu\s+mă\s+simt\s+în\s+corpul\s+meu/i,
      /mă\s+uit\s+de\s+(afară|sus)\s+la\s+mine/i,
      /nu\s+știu\s+cine\s+sunt/i,
      /am\s+pierdut\s+ore\s+întregi/i,
      /nothing\s+is\s+real/i,
      /i('m|\s+am)\s+not\s+real/i,
      /outside\s+my\s+body/i,
      /lost\s+hours/i,
      /don'?t\s+know\s+who\s+i\s+am/i,
    ],
    keywords: ["nu sunt real", "derealizare", "depersonalizare", "not real"],
    confidence: 0.65,
    description: "Disociere severă — derealizare/depersonalizare acută",
  },

  // ═══ RIDICAT — Substance Abuse Crisis ═══
  {
    id: "SUB_CRISIS",
    category: "SUBSTANCE_ABUSE_CRISIS",
    alertLevel: "RIDICAT",
    triggers: [
      /am\s+băut\s+(prea\s+)?mult\s+și\s+(nu\s+)?mă\s+simt/i,
      /am\s+luat\s+droguri\s+și/i,
      /nu\s+mă\s+pot\s+opri\s+din\s+(băut|consumat)/i,
      /withdrawal/i,
      /overdos/i,
      /can'?t\s+stop\s+(drinking|using)/i,
      /took\s+(drugs|something)\s+and/i,
    ],
    keywords: ["nu mă pot opri", "droguri", "withdrawal", "overdose"],
    confidence: 0.7,
    description: "Criză de abuz de substanțe — risc imediat",
  },

  // ═══ MODERAT — Harm to Others ═══
  {
    id: "HARM_OTHERS",
    category: "HARM_TO_OTHERS",
    alertLevel: "MODERAT",
    triggers: [
      /vreau\s+să\s+(îl|o|îi)\s+(omor|lovesc|rănesc)/i,
      /o\s+să\s+(îl|o)\s+(omor|distrug)/i,
      /want\s+to\s+(kill|hurt|harm)\s+(him|her|them|someone)/i,
      /going\s+to\s+(kill|hurt)\s+(him|her|them)/i,
    ],
    keywords: ["omor", "rănesc", "kill", "hurt someone"],
    confidence: 0.6,
    description: "Exprimarea intenției de a face rău altora",
  },

  // ═══ MODERAT — Eating Disorder Crisis ═══
  {
    id: "ED_CRISIS",
    category: "EATING_DISORDER_CRISIS",
    alertLevel: "MODERAT",
    triggers: [
      /nu\s+am\s+mâncat\s+de\s+\d+\s+zile/i,
      /am\s+vomitat\s+(din\s+nou|intenționat)/i,
      /mă\s+forțez\s+să\s+vomit/i,
      /haven'?t\s+eaten\s+in\s+\d+\s+days/i,
      /purging/i,
      /made\s+myself\s+(throw\s+up|vomit)/i,
    ],
    keywords: ["nu am mâncat", "vomit intenționat", "purging"],
    confidence: 0.6,
    description: "Criză tulburare alimentară — restricție sau purgare severă",
  },

  // ═══ MODERAT — Severe Panic ═══
  {
    id: "PANIC_SEVERE",
    category: "PANIC_SEVERE",
    alertLevel: "MODERAT",
    triggers: [
      /nu\s+pot\s+respira/i,
      /am\s+un\s+atac\s+de\s+panică/i,
      /simt\s+că\s+mor/i,
      /inima\s+(îmi\s+)?bate\s+(prea\s+)?tare/i,
      /can'?t\s+breathe/i,
      /having\s+a\s+panic\s+attack/i,
      /feel\s+like\s+i('m|\s+am)\s+dying/i,
    ],
    keywords: ["nu pot respira", "atac de panică", "panic attack"],
    confidence: 0.55,
    description: "Atac de panică sever sau simptome somatice acute",
  },

  // ═══ INFORMATIV — Mild distress signals ═══
  {
    id: "DISTRESS_MILD",
    category: "SUICIDAL_IDEATION",
    alertLevel: "INFORMATIV",
    triggers: [
      /sunt\s+(foarte\s+)?trist/i,
      /nu\s+mai\s+am\s+(putere|energie)/i,
      /mă\s+simt\s+singur/i,
      /nimeni\s+nu\s+mă\s+(iubește|înțelege)/i,
      /feeling\s+(very\s+)?(sad|hopeless|alone)/i,
      /no\s+one\s+(cares|understands)/i,
    ],
    keywords: ["trist", "singur", "fără putere", "hopeless"],
    confidence: 0.4,
    description: "Semne de suferință — nu constituie risc imediat dar se monitorizează",
  },
]

// ── Core Scan Function ─────────────────────────────────────────────────────

/**
 * Scanează un mesaj B2C pentru pattern-uri DSM-5 de risc.
 *
 * Se apelează ÎNAINTE ca mesajul să ajungă la AI.
 * Returnează instrucțiuni: block/flag/notify/guide.
 */
export async function scanForSafety(
  message: string,
  sessionContext: SessionContext,
): Promise<SafetyScanResult> {
  const detections: SafetyDetection[] = []
  const normalizedMessage = message.toLowerCase().trim()

  // Scanare pattern-uri
  for (const pattern of SAFETY_PATTERNS) {
    let matched = false
    let matchedText = ""

    // Check regex triggers
    for (const trigger of pattern.triggers) {
      const match = message.match(trigger)
      if (match) {
        matched = true
        matchedText = match[0]
        break
      }
    }

    // Check keywords (fallback dacă regex nu a prins)
    if (!matched) {
      for (const keyword of pattern.keywords) {
        if (normalizedMessage.includes(keyword.toLowerCase())) {
          matched = true
          matchedText = keyword
          break
        }
      }
    }

    if (matched) {
      // Ajustare confidence pe baza contextului
      let adjustedConfidence = pattern.confidence

      // Minor = confidence mai mare (precauție suplimentară)
      if (sessionContext.isMinor) {
        adjustedConfidence = Math.min(1, adjustedConfidence + 0.15)
      }

      // Alerte repetate în aceeași sesiune = confidence mai mare
      if (sessionContext.previousAlerts.includes(pattern.alertLevel)) {
        adjustedConfidence = Math.min(1, adjustedConfidence + 0.1)
      }

      detections.push({
        patternId: pattern.id,
        category: pattern.category,
        alertLevel: pattern.alertLevel,
        confidence: adjustedConfidence,
        matchedText,
        timestamp: new Date(),
      })
    }
  }

  // Determinare nivel maxim de alertă
  const alertLevels: AlertLevel[] = ["CRITIC", "RIDICAT", "MODERAT", "INFORMATIV"]
  let maxAlertLevel: AlertLevel | null = null
  for (const level of alertLevels) {
    if (detections.some(d => d.alertLevel === level)) {
      maxAlertLevel = level
      break
    }
  }

  // Construire rezultat pe baza nivelului de alertă
  const result: SafetyScanResult = {
    alertLevel: maxAlertLevel,
    detections,
    blocked: false,
    flagSession: false,
    notifySafetyTeam: false,
  }

  if (maxAlertLevel === "CRITIC") {
    result.blocked = true
    result.crisisResponse = buildCrisisResponse(detections)
    result.flagSession = true
    result.notifySafetyTeam = true
    await logSafetyEvent(sessionContext, detections, "CRITIC")
    await notifySafetyTeamAsync(sessionContext, detections)
  } else if (maxAlertLevel === "RIDICAT") {
    result.blocked = false
    result.flagSession = true
    result.notifySafetyTeam = true
    result.aiGuidance = buildAIGuidance("RIDICAT", detections)
    await logSafetyEvent(sessionContext, detections, "RIDICAT")
    await notifySafetyTeamAsync(sessionContext, detections)
  } else if (maxAlertLevel === "MODERAT") {
    result.blocked = false
    result.flagSession = false
    result.notifySafetyTeam = false
    result.aiGuidance = buildAIGuidance("MODERAT", detections)
    await logSafetyEvent(sessionContext, detections, "MODERAT")
  } else if (maxAlertLevel === "INFORMATIV") {
    result.blocked = false
    result.aiGuidance = buildAIGuidance("INFORMATIV", detections)
    await logSafetyEvent(sessionContext, detections, "INFORMATIV")
  }

  return result
}

// ── Crisis Response Builder ────────────────────────────────────────────────

function buildCrisisResponse(detections: SafetyDetection[]): string {
  const hasSuicidal = detections.some(d => d.category === "SUICIDAL_IDEATION")
  const hasSelfHarm = detections.some(d => d.category === "SELF_HARM")

  let response = ""

  if (hasSuicidal || hasSelfHarm) {
    response = [
      "Observ că treci printr-un moment foarte greu. Ceea ce simți contează și vreau să fii în siguranță.",
      "",
      "Te rog să contactezi acum:",
      "",
      `📞 ${CRISIS_RESOURCES_RO.primary.name}: ${CRISIS_RESOURCES_RO.primary.number}`,
      `   (${CRISIS_RESOURCES_RO.primary.description})`,
      "",
      `🚨 Urgențe: ${CRISIS_RESOURCES_RO.emergency.number}`,
      "",
      "Sunt oameni pregătiți care te pot ajuta chiar acum, non-stop.",
      "",
      "Nu ești singur/singură în asta. Suferința pe care o simți este reală, dar există ajutor.",
      "",
      "Dacă vrei, putem continua conversația după ce ai vorbit cu cineva. " +
      "Nu trebuie să treci prin asta de unul singur/una singură.",
    ].join("\n")
  } else {
    response = [
      "Observ că treci printr-un moment dificil. Siguranța ta este prioritatea mea.",
      "",
      "Dacă simți că ai nevoie de ajutor imediat:",
      "",
      `📞 ${CRISIS_RESOURCES_RO.primary.name}: ${CRISIS_RESOURCES_RO.primary.number}`,
      `   (${CRISIS_RESOURCES_RO.primary.description})`,
      "",
      `🚨 Urgențe: ${CRISIS_RESOURCES_RO.emergency.number}`,
      "",
      "Acești specialiști sunt disponibili non-stop și pot ajuta.",
    ].join("\n")
  }

  return response
}

// ── AI Guidance Builder ────────────────────────────────────────────────────

function buildAIGuidance(level: AlertLevel, detections: SafetyDetection[]): string {
  const categories = [...new Set(detections.map(d => d.category))]

  if (level === "RIDICAT") {
    return [
      "═══ SAFETY MONITOR: NIVEL RIDICAT ═══",
      `Categorii detectate: ${categories.join(", ")}`,
      "",
      "REGULI STRICTE pentru acest răspuns:",
      "• NU diagnostica. NU eticheta. NU interpreta clinic.",
      "• NU minimiza suferința ('va fi bine', 'toată lumea trece prin asta').",
      "• NU încuraja acțiuni autodistructive sub nicio formă.",
      "• VALIDEAZĂ emoția: 'Înțeleg că e greu. Ceea ce simți e real.'",
      "• OFERĂ resursele de criză natural în răspuns.",
      "• ÎNTREABĂ dacă e în siguranță acum.",
      "• TON: cald, calm, prezent. Fără grabă.",
      `• Resurse de menționat: ${CRISIS_RESOURCES_RO.primary.name} — ${CRISIS_RESOURCES_RO.primary.number}`,
      "",
      "Dacă persoana confirmă risc imediat → OPREȘTE conversația și oferă doar resurse.",
    ].join("\n")
  }

  if (level === "MODERAT") {
    return [
      "═══ SAFETY MONITOR: NIVEL MODERAT ═══",
      `Categorii detectate: ${categories.join(", ")}`,
      "",
      "ADAPTĂRI pentru acest răspuns:",
      "• Ton empatic crescut — persoana exprimă suferință.",
      "• Nu minimiza, nu dramatiza.",
      "• Dacă pare relevant, menționează că există ajutor profesional disponibil.",
      "• Nu insista pe tema sensibilă dacă persoana schimbă subiectul.",
      "• Continuă conversația normal dar cu atenție sporită.",
    ].join("\n")
  }

  // INFORMATIV
  return [
    "═══ SAFETY MONITOR: INFORMATIV ═══",
    `Semnal detectat: ${categories.join(", ")}`,
    "• Menține tonul empatic. Monitorizare pasivă. Fără intervenție activă.",
  ].join("\n")
}

// ── Logging ────────────────────────────────────────────────────────────────

async function logSafetyEvent(
  context: SessionContext,
  detections: SafetyDetection[],
  level: AlertLevel,
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma")
    await prisma.agentMetric.create({
      data: {
        agentRole: "SAFETY_MONITOR",
        periodStart: new Date(),
        periodEnd: new Date(),
        tasksCompleted: 0,
        healthScoreAvg: alertLevelToNumber(level),
        cycleActions: 1,
      },
    })
  } catch (error) {
    // Safety logging nu trebuie să blocheze fluxul
    console.error(`[SAFETY_MONITOR] Log failed:`, error)
  }
}

async function notifySafetyTeamAsync(
  context: SessionContext,
  detections: SafetyDetection[],
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma")
    const maxLevel = detections.reduce((max, d) => {
      const levels: AlertLevel[] = ["INFORMATIV", "MODERAT", "RIDICAT", "CRITIC"]
      return levels.indexOf(d.alertLevel) > levels.indexOf(max) ? d.alertLevel : max
    }, "INFORMATIV" as AlertLevel)

    await prisma.agentTask.create({
      data: {
        title: `[SAFETY ${maxLevel}] Sesiune ${context.sessionId.slice(0, 8)} — intervenție necesară`,
        description: [
          `Nivel alertă: ${maxLevel}`,
          `Sesiune: ${context.sessionId}`,
          `User: ${context.userId}`,
          `Mesaj #: ${context.messageCount}`,
          `Categorii: ${[...new Set(detections.map(d => d.category))].join(", ")}`,
          "",
          "Detecții:",
          ...detections.map(d =>
            `  - [${d.alertLevel}] ${d.category}: "${d.matchedText.slice(0, 80)}" (conf: ${d.confidence})`
          ),
        ].join("\n"),
        status: "ASSIGNED",
        priority: maxLevel === "CRITIC" ? "CRITICAL" : "HIGH",
        assignedTo: "SAFETY_MONITOR",
        assignedBy: "SAFETY_MONITOR_RUNTIME",
        businessId: "default",
        taskType: "INVESTIGATION",
        tags: ["safety", "b2c", maxLevel.toLowerCase(), `session:${context.sessionId}`, ...detections.map(d => d.category.toLowerCase())],
      },
    })
  } catch (error) {
    console.error(`[SAFETY_MONITOR] Notify failed:`, error)
  }
}

// ── Graceful Exit Protocol ─────────────────────────────────────────────────

/**
 * Protocol de ieșire grațioasă — când sesiunea trebuie încheiată
 * din motive de siguranță (ex: utilizatorul refuză ajutor dar riscul e real).
 *
 * Principii:
 *   - Nu abandonăm brusc
 *   - Recunoaștem suferința fără a diagnostica
 *   - Oferim resurse clare
 *   - Dacă sesiunea era plătită, oferim rambursare
 */
export function buildGracefulExit(
  context: SessionContext,
  reason: "safety_block" | "user_refused_help" | "session_limit",
): { message: string; offerRefund: boolean } {
  let message: string
  let offerRefund = false

  switch (reason) {
    case "safety_block":
      message = [
        "Vreau să fii în siguranță. Conversația noastră se oprește aici, dar nu ești singur/singură.",
        "",
        `Te rog să suni acum: ${CRISIS_RESOURCES_RO.primary.name} — ${CRISIS_RESOURCES_RO.primary.number}`,
        "",
        "Dacă ai plătit pentru această sesiune, vei primi automat o rambursare completă.",
        "",
        "Poți reveni oricând, când te simți pregătit/pregătită. Fără judecată.",
      ].join("\n")
      offerRefund = true
      break

    case "user_refused_help":
      message = [
        "Respect decizia ta. Nu insist.",
        "",
        "Vreau doar să știi că ajutorul există dacă vei simți vreodată nevoia:",
        `📞 ${CRISIS_RESOURCES_RO.primary.name}: ${CRISIS_RESOURCES_RO.primary.number} (non-stop, gratuit)`,
        "",
        "Poți reveni oricând la conversație. Ușa rămâne deschisă.",
      ].join("\n")
      offerRefund = true
      break

    case "session_limit":
      message = [
        "Am observat că traversezi un moment dificil în această sesiune.",
        "",
        "Înainte de a continua, te încurajez să discuți cu un specialist:",
        `📞 ${CRISIS_RESOURCES_RO.primary.name}: ${CRISIS_RESOURCES_RO.primary.number}`,
        "",
        "Putem relua conversația despre dezvoltarea ta profesională oricând dorești.",
      ].join("\n")
      offerRefund = false
      break
  }

  return { message, offerRefund }
}

// ── Refund Trigger ─────────────────────────────────────────────────────────

/**
 * Declanșează rambursare automată pentru sesiuni întrerupte din motive de siguranță.
 */
export async function triggerSafetyRefund(
  sessionId: string,
  userId: string,
): Promise<{ triggered: boolean; reason?: string }> {
  try {
    const { prisma } = await import("@/lib/prisma")

    // Verificăm dacă există o plată asociată sesiunii (via sourceId)
    const payment = await prisma.creditTransaction.findFirst({
      where: {
        sourceId: sessionId,
        type: "USAGE",
      },
      orderBy: { createdAt: "desc" },
    })

    if (!payment) {
      return { triggered: false, reason: "Nu există plată pentru această sesiune" }
    }

    // Creare credit back
    await prisma.creditTransaction.create({
      data: {
        tenantId: payment.tenantId,
        type: "REFUND",
        amount: payment.amount,
        description: `Rambursare automată — sesiune ${sessionId.slice(0, 8)} întreruptă din motive de siguranță`,
        sourceId: payment.id,
      },
    })

    return { triggered: true }
  } catch (error) {
    console.error(`[SAFETY_MONITOR] Refund trigger failed:`, error)
    return { triggered: false, reason: "Eroare internă — rambursarea va fi procesată manual" }
  }
}

// ── Utility ────────────────────────────────────────────────────────────────

function alertLevelToNumber(level: AlertLevel): number {
  switch (level) {
    case "CRITIC": return 4
    case "RIDICAT": return 3
    case "MODERAT": return 2
    case "INFORMATIV": return 1
    default: return 0
  }
}

/**
 * Verifică dacă o sesiune a fost flagged anterior.
 */
export async function isSessionFlagged(sessionId: string): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/prisma")
    const flag = await prisma.agentTask.findFirst({
      where: {
        assignedTo: "SAFETY_MONITOR",
        tags: { hasEvery: ["safety", `session:${sessionId}`] },
      },
    })
    return flag !== null
  } catch {
    return false
  }
}

/**
 * Obține istoricul de alerte pentru un utilizator (pentru SafetyMonitor agent review).
 */
export async function getUserSafetyHistory(userId: string): Promise<{
  totalAlerts: number
  criticalAlerts: number
  lastAlert: Date | null
}> {
  try {
    const { prisma } = await import("@/lib/prisma")
    const alerts = await prisma.agentTask.findMany({
      where: {
        assignedTo: "SAFETY_MONITOR",
        tags: { hasEvery: ["safety", `user:${userId}`] },
      },
      select: { priority: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.priority === "CRITICAL").length,
      lastAlert: alerts[0]?.createdAt ?? null,
    }
  } catch {
    return { totalAlerts: 0, criticalAlerts: 0, lastAlert: null }
  }
}
