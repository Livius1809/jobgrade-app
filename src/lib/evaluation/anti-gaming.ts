/**
 * anti-gaming.ts — Detectare inginerie inversă pe tabelul de scorare
 *
 * Dacă clientul modifică repetat litere pe același criteriu,
 * înseamnă că încearcă să deducă punctajele secrete.
 *
 * Reguli:
 * - >3 modificări consecutive pe același criteriu/post → WARNING
 * - Scanare secvențială (A→B→C→D) → WARNING + log
 * - >10 modificări în <2 minute → COOLDOWN 30s
 * - Continuă după warning → BLOCK temporar
 */

export interface AntiGamingState {
  /** Istoric modificări: criterionKey → [{letter, timestamp}] */
  history: Record<string, Array<{ letter: string; timestamp: number }>>
  /** Număr total modificări în ultimele 2 minute */
  recentCount: number
  /** Timestamp ultima modificare */
  lastChange: number
  /** Status curent */
  status: "OK" | "WARNING" | "COOLDOWN" | "BLOCKED"
  /** Mesaj afișat */
  message: string | null
  /** Cooldown expiry */
  cooldownUntil: number | null
}

export function createAntiGamingState(): AntiGamingState {
  return {
    history: {},
    recentCount: 0,
    lastChange: 0,
    status: "OK",
    message: null,
    cooldownUntil: null,
  }
}

/**
 * Verifică dacă o modificare este permisă și actualizează starea.
 * @returns Noua stare + dacă modificarea e permisă
 */
export function checkModification(
  state: AntiGamingState,
  jobId: string,
  criterionKey: string,
  newLetter: string,
): { newState: AntiGamingState; allowed: boolean } {
  const now = Date.now()
  const key = `${jobId}:${criterionKey}`

  // Verificăm cooldown/block activ
  if (state.status === "BLOCKED") {
    return {
      newState: state,
      allowed: false,
    }
  }

  if (state.status === "COOLDOWN" && state.cooldownUntil && now < state.cooldownUntil) {
    const remaining = Math.ceil((state.cooldownUntil - now) / 1000)
    return {
      newState: {
        ...state,
        message: `Pauză de ${remaining}s. Prea multe modificări consecutive.`,
      },
      allowed: false,
    }
  }

  // Reset cooldown dacă a expirat
  if (state.status === "COOLDOWN" && state.cooldownUntil && now >= state.cooldownUntil) {
    state = { ...state, status: "OK", message: null, cooldownUntil: null }
  }

  // Actualizăm istoricul per criteriu
  const criterionHistory = [...(state.history[key] || [])]
  criterionHistory.push({ letter: newLetter, timestamp: now })

  // Păstrăm doar ultimele 10 intrări
  if (criterionHistory.length > 10) criterionHistory.shift()

  // Numărăm modificări recente (ultimele 2 minute)
  const twoMinAgo = now - 120_000
  const recentMods = Object.values({ ...state.history, [key]: criterionHistory })
    .flat()
    .filter(h => h.timestamp > twoMinAgo)
    .length

  // Detectare scanare secvențială (A→B→C→D)
  const lastLetters = criterionHistory.slice(-4).map(h => h.letter)
  const isSequential = lastLetters.length >= 4 && isSequentialScan(lastLetters)

  // Detectare modificări repetate pe același criteriu (>3 consecutive)
  const consecutiveOnSame = criterionHistory.slice(-4).length >= 4

  let newStatus: AntiGamingState["status"] = "OK"
  let message: string | null = null
  let cooldownUntil: number | null = null

  if (isSequential) {
    // Scanare secvențială detectată
    if (state.status === "WARNING") {
      // Al doilea warning → block
      newStatus = "BLOCKED"
      message = "Accesul la simulator a fost suspendat temporar. Modificările sistematice pe același criteriu nu sunt permise."
    } else {
      newStatus = "WARNING"
      message = "Modificările secvențiale pe același criteriu sunt monitorizate. Evaluarea trebuie să reflecte complexitatea reală a postului."
    }
  } else if (recentMods > 10) {
    // Prea multe modificări în 2 minute
    newStatus = "COOLDOWN"
    cooldownUntil = now + 30_000
    message = "Pauză de 30s. Prea multe modificări în timp scurt."
  } else if (consecutiveOnSame && state.status !== "WARNING") {
    // >3 pe același criteriu — avertisment ușor
    newStatus = "WARNING"
    message = "Modificările frecvente pe același criteriu sunt limitate. Evaluați cu atenție."
  }

  return {
    newState: {
      history: { ...state.history, [key]: criterionHistory },
      recentCount: recentMods,
      lastChange: now,
      status: newStatus !== "OK" ? newStatus : state.status === "WARNING" ? "OK" : "OK",
      message,
      cooldownUntil,
    },
    allowed: newStatus !== "BLOCKED",
  }
}

/** Verifică dacă ultimele litere sunt în ordine secvențială (A→B→C→D sau D→C→B→A) */
function isSequentialScan(letters: string[]): boolean {
  if (letters.length < 3) return false
  const codes = letters.map(l => l.charCodeAt(0))
  let ascending = true
  let descending = true
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] !== codes[i - 1] + 1) ascending = false
    if (codes[i] !== codes[i - 1] - 1) descending = false
  }
  return ascending || descending
}
