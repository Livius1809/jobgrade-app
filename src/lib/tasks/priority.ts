/**
 * Sistem de prioritizare taskuri — Matrice Eisenhower
 *
 * 1. IMPORTANT_URGENT — Impact mare + presiune timp → faci ACUM
 * 2. URGENT — Presiune timp dar impact mai mic → faci repede
 * 3. IMPORTANT — Impact mare fără presiune → planifici
 * 4. NECESAR — Trebuie făcut dar poate aștepta
 *
 * Backwards compat: CRITICAL→IMPORTANT_URGENT, HIGH→URGENT, MEDIUM→IMPORTANT, LOW→NECESAR
 */

export type EisenhowerPriority = "IMPORTANT_URGENT" | "URGENT" | "IMPORTANT" | "NECESAR"

/** Mapare din valorile vechi la cele noi */
const LEGACY_MAP: Record<string, EisenhowerPriority> = {
  CRITICAL: "IMPORTANT_URGENT",
  HIGH: "URGENT",
  MEDIUM: "IMPORTANT",
  LOW: "NECESAR",
  // Noile valori se mapează pe ele însele
  IMPORTANT_URGENT: "IMPORTANT_URGENT",
  URGENT: "URGENT",
  IMPORTANT: "IMPORTANT",
  NECESAR: "NECESAR",
}

/** Normalizează orice valoare de priority (veche sau nouă) la Eisenhower */
export function normalizePriority(value: string | null | undefined): EisenhowerPriority {
  if (!value) return "NECESAR"
  return LEGACY_MAP[value] || "NECESAR"
}

/** Ordine descrescătoare pentru sortare (1 = cel mai prioritar) */
export const PRIORITY_ORDER: Record<EisenhowerPriority, number> = {
  IMPORTANT_URGENT: 1,
  URGENT: 2,
  IMPORTANT: 3,
  NECESAR: 4,
}

/** Etichete afișate Owner-ului */
export const PRIORITY_LABELS: Record<EisenhowerPriority, string> = {
  IMPORTANT_URGENT: "Important si urgent",
  URGENT: "Urgent",
  IMPORTANT: "Important",
  NECESAR: "Necesar",
}

/** Culori UI */
export const PRIORITY_COLORS: Record<EisenhowerPriority, { bg: string; text: string; border: string }> = {
  IMPORTANT_URGENT: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  URGENT:           { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  IMPORTANT:        { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  NECESAR:          { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
}

/** Validare enum pentru zod/API (acceptă atât vechi cât și noi) */
export const ALL_PRIORITY_VALUES = [
  "IMPORTANT_URGENT", "URGENT", "IMPORTANT", "NECESAR",
  "CRITICAL", "HIGH", "MEDIUM", "LOW",
] as const

/** Sortare array de taskuri după prioritate Eisenhower */
export function sortByPriority<T extends { priority: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[normalizePriority(a.priority)]
    const pb = PRIORITY_ORDER[normalizePriority(b.priority)]
    return pa - pb
  })
}
