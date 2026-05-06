/**
 * coherence-guard.ts — Gardianul integrității profilului B2C
 *
 * PROBLEMA:
 *   Clientul A, entuziasmat de progresul său, poate:
 *   1. Pune întrebări despre problemele prietenului B (proxy questions)
 *   2. Lăsa prietenul B să-i folosească contul ("joacă-te și tu puțin")
 *
 *   Ambele poluează profilul lui A cu informații care nu-i aparțin.
 *   Profilul poluat → recomandări greșite → experiență degradată →
 *   clientul pierde încrederea în platformă.
 *
 * SOLUȚIA:
 *   Detectare prin multiple semnale + notificare blândă + izolare date contaminate.
 *   NU acuzăm. NU blocăm. Explicăm DE CE contează și oferim alternativa corectă.
 *
 * PRINCIPIU:
 *   "Platformă asta e doar pentru tine. Nu pentru că suntem rigizi —
 *    ci pentru că tot ce am construit aici se calibrează pe TINE.
 *    Dacă altcineva intră aici, nu mai ești tu cel pe care îl vedem."
 */

import { cpuCall } from "@/lib/cpu/gateway"

const MODEL = "claude-sonnet-4-20250514"

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIUL 1: PROXY QUESTIONS — A întreabă despre B
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pattern-uri lingvistice care sugerează întrebări proxy.
 * Detectăm persoana a treia, formulări indirecte, schimb brusc de context.
 */
const PROXY_PATTERNS = [
  // Persoana a treia explicită
  { pattern: /un prieten|o prietena|un amic|cineva pe care|cineva drag/i, weight: 0.7, type: "THIRD_PERSON" as const },
  { pattern: /fratele meu|sora mea|so[tț]ul|so[tț]ia|partenerul|partenera|colegul|colega/i, weight: 0.5, type: "THIRD_PERSON" as const },
  { pattern: /el (are|e |simte|crede|vrea)|ea (are|e |simte|crede|vrea)/i, weight: 0.4, type: "THIRD_PERSON" as const },

  // Formulări indirecte ("cum aș putea să ajut pe cineva care...")
  { pattern: /cum (a[sș]|pot|ar trebui).*(ajut|sfătuiesc|explic|conving)/i, weight: 0.6, type: "HELP_SEEKING" as const },
  { pattern: /ce (a[sș]|pot|ar trebui).*(spun|fac|recomand)\s*(cuiva|unui|unei)/i, weight: 0.6, type: "HELP_SEEKING" as const },
  { pattern: /dac[aă] cineva|în cazul cuiva|pentru altcineva/i, weight: 0.5, type: "HELP_SEEKING" as const },

  // Schimb de perspectivă brusc (din "eu" în "el/ea")
  { pattern: /nu (e|sunt) (pentru|despre) mine|nu m[aă] refer la mine/i, weight: 0.8, type: "EXPLICIT_PROXY" as const },
  { pattern: /întreb pentru|vreau s[aă] ([iî]i|le) ar[aă]t|s[aă]-i explic/i, weight: 0.7, type: "EXPLICIT_PROXY" as const },

  // Dorința de a convinge pe altcineva
  { pattern: /nu vrea s[aă] (aud[aă]|[iî]n[tț]eleag[aă]|accepte|recunoasc[aă])/i, weight: 0.6, type: "CONVINCING" as const },
  { pattern: /cum [iî]l conving|cum o conving|cum [iî]i fac s[aă]/i, weight: 0.8, type: "CONVINCING" as const },
]

export interface ProxyDetection {
  isProxy: boolean
  confidence: number // 0-1
  type: "THIRD_PERSON" | "HELP_SEEKING" | "EXPLICIT_PROXY" | "CONVINCING" | "NONE"
  matchedPatterns: string[]
}

/**
 * Detectează dacă mesajul e o întrebare proxy (despre altcineva).
 * Returnează confidencea și tipul detectat.
 */
export function detectProxyQuestion(message: string): ProxyDetection {
  const matches: Array<{ type: string; weight: number; pattern: string }> = []

  for (const { pattern, weight, type } of PROXY_PATTERNS) {
    if (pattern.test(message)) {
      matches.push({ type, weight, pattern: pattern.source })
    }
  }

  if (matches.length === 0) {
    return { isProxy: false, confidence: 0, type: "NONE", matchedPatterns: [] }
  }

  // Confidența = cea mai mare greutate, cu bonus pentru match-uri multiple
  const maxWeight = Math.max(...matches.map(m => m.weight))
  const bonusMultiple = Math.min(0.2, matches.length * 0.05)
  const confidence = Math.min(1, maxWeight + bonusMultiple)

  // Tipul dominant
  const typeCounts = new Map<string, number>()
  for (const m of matches) {
    typeCounts.set(m.type, (typeCounts.get(m.type) || 0) + m.weight)
  }
  const dominantType = [...typeCounts.entries()].sort(([, a], [, b]) => b - a)[0][0]

  return {
    isProxy: confidence >= 0.5,
    confidence,
    type: dominantType as ProxyDetection["type"],
    matchedPatterns: matches.map(m => m.pattern),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIUL 2: ACCOUNT SHARING — B intră pe contul lui A
// ═══════════════════════════════════════════════════════════════════════════

export interface CoherenceCheck {
  isCoherent: boolean
  confidence: number // 0-1 (1 = sigur că e aceeași persoană)
  anomalies: CoherenceAnomaly[]
}

export interface CoherenceAnomaly {
  type: "STYLE_SHIFT" | "HERRMANN_SHIFT" | "TOPIC_DISCONTINUITY" | "VOCABULARY_SHIFT" | "CONTRADICTION"
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH"
}

/**
 * Verifică coerența unui mesaj nou cu profilul și istoricul clientului.
 * Detectează dacă pare a fi o altă persoană pe cont.
 *
 * Rulează asincron — nu blochează răspunsul.
 * Cost: ~$0.005 per verificare.
 */
export async function checkCoherence(
  newMessage: string,
  profile: {
    herrmannA: number | null
    herrmannB: number | null
    herrmannC: number | null
    herrmannD: number | null
    hawkinsEstimate: number | null
    viaSignature: string[]
  } | null,
  recentMessages: string[], // ultimele 5-10 mesaje ale clientului
  sessionHistory: {
    totalSessions: number
    avgMessageLength: number
    dominantTopics: string[]
  }
): Promise<CoherenceCheck> {
  // Dacă nu avem suficient istoric, nu putem verifica
  if (recentMessages.length < 3 || !profile) {
    return { isCoherent: true, confidence: 0.3, anomalies: [] }
  }

  try {
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 300,
      system: "",
      messages: [{
        role: "user",
        content: `Ești sistemul de verificare a coerenței pe platforma JobGrade.

PROFIL CUNOSCUT AL CLIENTULUI:
Herrmann: A=${profile.herrmannA} B=${profile.herrmannB} C=${profile.herrmannC} D=${profile.herrmannD}
Hawkins: ~${profile.hawkinsEstimate || "necunoscut"}
VIA: ${profile.viaSignature.join(", ") || "neidentificate"}
Sesiuni totale: ${sessionHistory.totalSessions}
Lungime medie mesaj: ${sessionHistory.avgMessageLength} cuvinte
Topicuri dominante: ${sessionHistory.dominantTopics.join(", ") || "diverse"}

ULTIMELE MESAJE ALE CLIENTULUI (stil de referință):
${recentMessages.slice(-5).map((m, i) => `${i + 1}. "${m.substring(0, 150)}"`).join("\n")}

MESAJUL NOU DE VERIFICAT:
"${newMessage.substring(0, 300)}"

VERIFICĂ: Mesajul nou pare scris de ACEEAȘI persoană ca mesajele anterioare?

Răspunde STRICT în JSON:
{
  "isCoherent": true/false,
  "confidence": 0.0-1.0,
  "anomalies": [
    {
      "type": "STYLE_SHIFT|HERRMANN_SHIFT|TOPIC_DISCONTINUITY|VOCABULARY_SHIFT|CONTRADICTION",
      "description": "scurtă",
      "severity": "LOW|MEDIUM|HIGH"
    }
  ]
}

REGULI:
- DOAR JSON valid
- isCoherent=false DOAR dacă ai dovezi clare (nu pe bănuieli)
- Schimbări subtile de ton = LOW, nu HIGH
- Oamenii pot avea zile diferite — nu suprasemnaliza
- CONTRADICTION = spune opusul a ce a spus anterior pe aceeași temă
- HERRMANN_SHIFT = brusc analitic când era empatic, sau invers
- STYLE_SHIFT = lungime mesaje, complexitate, formalitate schimbate brusc`,
      }],
      agentRole: "PROFILER",
      operationType: "coherence-check",
    })

    const text = cpuResult.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { isCoherent: true, confidence: 0.5, anomalies: [] }

    return JSON.parse(jsonMatch[0]) as CoherenceCheck
  } catch {
    return { isCoherent: true, confidence: 0.5, anomalies: [] }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RĂSPUNSURI DE PROTECȚIE — blânde, explicative, nu acuzatoare
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generează mesajul de protecție pentru proxy questions.
 * Tonul: cald, explicativ, oferă alternativa corectă.
 * NU acuzăm. Explicăm DE CE contează.
 */
export function getProxyProtectionMessage(detection: ProxyDetection): string {
  if (detection.type === "EXPLICIT_PROXY" || detection.type === "CONVINCING") {
    return `Observ că vorbești despre cineva care-ți e drag și că vrei să-l ajuți. Asta spune ceva valoros despre tine.

Trebuie să-ți spun ceva important: tot ce construim aici se calibrează pe tine — pe felul tău de a gândi, de a simți, de a acționa. Dacă amestecăm informații despre altcineva, profilul tău se diluează și ce-ți recomand nu mai e al tău.

Cea mai bună modalitate prin care îl poți ajuta este să-i recomanzi să-și facă un cont propriu. E simplu: își alege un alias, primește o adresă de email pe domeniul nostru și pornește pe drumul lui, calibrat pe el. Contul e gratuit și complet anonim — nu are nevoie de date personale. Poți să-i trimiți un link direct: jobgrade.ro/personal

Între timp, ce pot face eu pentru tine: să explorăm cum te afectează pe tine situația asta. Ce simți când vezi că cineva drag ție se confruntă cu o problemă?`
  }

  if (detection.type === "HELP_SEEKING") {
    return `Înțeleg că vrei să ajuți pe cineva. E un impuls generos.

Ca să-ți fiu cu adevărat util, trebuie să rămânem pe drumul tău — pentru că tot ce construim aici e calibrat pe tine. Dacă introducem informații despre altcineva, pierdem din precizia a ceea ce-ți oferim.

Cel mai bun lucru pe care-l poți face pentru persoana respectivă: recomandă-i să-și facă un cont propriu pe jobgrade.ro/personal. Își alege un alias, primește email pe domeniul nostru și pornește pe drumul lui. E gratuit, anonim și personalizat pe el. Fiecare om primește un parcurs diferit — pentru că fiecare om e diferit.

Acum, hai să ne întoarcem la tine: cum te afectează pe tine situația prin care trece acea persoană?`
  }

  // THIRD_PERSON — mai subtil, doar semnalează
  return `Am observat că vorbești despre experiența altcuiva. E firesc — relațiile fac parte din cine ești.

Ca să te ajut cel mai bine, hai să ne concentrăm pe cum te afectează pe tine situația asta. Ce simți când te gândești la ce se întâmplă cu acea persoană?

Dacă simți că acel om ar avea nevoie de un spațiu al lui în care să exploreze, îi poți recomanda să-și facă un cont gratuit pe jobgrade.ro/personal — fiecare primește un drum personalizat.`
}

/**
 * Generează mesajul de protecție pentru posibil account sharing.
 * Tonul: curios, nu acuzator. Ca și cum ai observa ceva neobișnuit.
 */
export function getCoherenceProtectionMessage(anomalies: CoherenceAnomaly[]): string {
  const highSeverity = anomalies.filter(a => a.severity === "HIGH")

  if (highSeverity.length >= 2) {
    // Puternic semnal de account sharing
    return `Am observat ceva neobișnuit în conversația noastră de azi — ritmul e diferit față de cum te cunosc.

Vreau să fiu direct cu tine: tot ce construim aici — profilul, recomandările, traseul tău pe spirală — se calibrează pe felul TĂU de a gândi și de a simți. Dacă altcineva interacționează pe contul tău, chiar și câteva minute, informațiile se amestecă și ce-ți recomand nu mai e relevant pentru tine.

Dacă cineva din viața ta vrea să exploreze ce facem aici, cel mai bun lucru pe care i-l poți oferi este propriul lui cont. Își alege un alias pe jobgrade.ro/personal, primește email pe domeniul nostru și pornește pe drumul lui — gratuit, anonim, calibrat pe el.

Dacă totuși ești tu și pur și simplu ai o zi diferită — e perfect în regulă. Spune-mi ce s-a schimbat și continuăm de aici.`
  }

  // Semnal moderat — doar o întrebare blândă
  return `Azi pari puțin diferit față de conversațiile noastre anterioare — poate o zi diferită, poate o stare nouă. E ceva care s-a schimbat în ultima perioadă?`
}

// ═══════════════════════════════════════════════════════════════════════════
// IZOLARE DATE CONTAMINATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Marchează o interacțiune ca potențial contaminată.
 * Profiler-ul shadow NU va actualiza profilul din aceste interacțiuni.
 * Datele rămân în DB (pentru audit) dar cu flag QUARANTINED.
 */
export async function quarantineInteraction(
  userId: string,
  sessionId: string,
  reason: "PROXY_DETECTED" | "COHERENCE_ANOMALY",
  details: string,
  prisma: any
): Promise<void> {
  const p = prisma

  // Log în evolution entries cu tip special
  await p.b2CEvolutionEntry.create({
    data: {
      userId,
      card: "CARD_6", // Profiler observă
      type: "MILESTONE", // folosim milestone cu metadata
      title: reason === "PROXY_DETECTED"
        ? "Întrebare proxy detectată — date izolate"
        : "Anomalie coerență — date izolate",
      description: details,
      phase: "CHRYSALIS",
      stage: 1,
      agentRole: "PROFILER",
      metadata: {
        quarantined: true,
        reason,
        sessionId,
        timestamp: new Date().toISOString(),
      },
    },
  }).catch(() => {})
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCȚIA PRINCIPALĂ — apelată din chat routes
// ═══════════════════════════════════════════════════════════════════════════

export interface GuardResult {
  /** Mesajul trebuie procesat normal? */
  proceed: boolean
  /** Mesaj de protecție de adăugat la răspunsul agentului (null = nimic) */
  protectionMessage: string | null
  /** Datele din această interacțiune trebuie izolate? (profiler shadow skip) */
  quarantine: boolean
  /** Tipul detecției */
  detectionType: "NONE" | "PROXY" | "COHERENCE_ANOMALY"
}

/**
 * Verificare completă a integrității — apelează din orice chat route B2C.
 *
 * Returnează rapid (proxy detection e sync, coherence e async).
 * Coherence check se face doar dacă proxy nu a detectat nimic.
 */
export async function guardProfileIntegrity(
  message: string,
  profile: {
    herrmannA: number | null
    herrmannB: number | null
    herrmannC: number | null
    herrmannD: number | null
    hawkinsEstimate: number | null
    viaSignature: string[]
  } | null,
  recentClientMessages: string[],
  sessionHistory: {
    totalSessions: number
    avgMessageLength: number
    dominantTopics: string[]
  }
): Promise<GuardResult> {
  // 1. Proxy detection (sync, rapid)
  const proxy = detectProxyQuestion(message)
  if (proxy.isProxy && proxy.confidence >= 0.5) {
    return {
      proceed: true, // procesăm mesajul dar adăugăm protecție
      protectionMessage: getProxyProtectionMessage(proxy),
      quarantine: proxy.confidence >= 0.7, // izolăm doar dacă suntem destul de siguri
      detectionType: "PROXY",
    }
  }

  // 2. Coherence check (async, doar dacă avem suficient istoric)
  if (recentClientMessages.length >= 5 && profile) {
    const coherence = await checkCoherence(message, profile, recentClientMessages, sessionHistory)

    if (!coherence.isCoherent && coherence.confidence >= 0.6) {
      const highAnomalies = coherence.anomalies.filter(a => a.severity === "HIGH")
      if (highAnomalies.length >= 1) {
        return {
          proceed: true,
          protectionMessage: getCoherenceProtectionMessage(coherence.anomalies),
          quarantine: highAnomalies.length >= 2,
          detectionType: "COHERENCE_ANOMALY",
        }
      }
    }
  }

  // 3. Totul e în regulă
  return {
    proceed: true,
    protectionMessage: null,
    quarantine: false,
    detectionType: "NONE",
  }
}
