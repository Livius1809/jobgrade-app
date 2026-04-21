// Formule pricing — sursa de adevăr (din PackageSelector.tsx / 05_decizie.md)
// Folosit atât client-side (calculator) cât și server-side (checkout API)

export function calcLayerCredits(layer: number, positions: number, employees: number) {
  const items: Array<{ label: string; credits: number; detail: string }> = []

  // BAZA (layer 1)
  if (layer >= 1) {
    items.push({ label: "Evaluare posturi (JE AUTO)", credits: positions * 60, detail: `${positions} × 60 cr` })
    items.push({ label: "Fișe de post AI", credits: positions * 12, detail: `${positions} × 12 cr` })
    items.push({ label: "Structură salarială", credits: 20 + employees * 1, detail: `20 + ${employees} × 1 cr` })
  }
  // LAYER 1 — Conformitate
  if (layer >= 2) {
    items.push({ label: "Analiză pay gap (Art. 9)", credits: 15 + Math.ceil(employees * 0.5), detail: `15 + ${employees} × 0,5 cr` })
    items.push({ label: "Benchmark salarial", credits: 30 + Math.ceil(positions * 1.5), detail: `30 + ${positions} × 1,5 cr` })
  }
  // LAYER 2 — Competitivitate
  if (layer >= 3) {
    items.push({ label: "Pachete salariale", credits: 25 + positions * 1, detail: `25 + ${positions} × 1 cr` })
    items.push({ label: "Evaluare performanță", credits: employees * 15, detail: `${employees} × 15 cr` })
    items.push({ label: "Impact bugetar", credits: 40, detail: "40 cr" })
  }
  // LAYER 3 — Dezvoltare
  if (layer >= 4) {
    const recruitProjects = Math.max(1, Math.ceil(positions * 0.2))
    items.push({ label: "Dezvoltare HR", credits: 40 + employees * 1, detail: `40 + ${employees} × 1 cr` })
    items.push({ label: "Recrutare", credits: recruitProjects * 60, detail: `${recruitProjects} proiecte × 60 cr` })
    items.push({ label: "Manual angajat", credits: 20 + Math.ceil(positions * 1.5), detail: `20 + ${positions} × 1,5 cr` })
  }

  const total = items.reduce((s, i) => s + i.credits, 0)
  return { items, total }
}

export function getVolumeDiscount(positions: number, employees: number): { pct: number; label: string } {
  const maxDim = Math.max(positions, employees)
  if (maxDim > 150) return { pct: 25, label: "Enterprise" }
  if (maxDim > 50) return { pct: 12, label: "Professional" }
  return { pct: 0, label: "Starter" }
}

export function pricePerCredit(totalCredits: number): number {
  if (totalCredits >= 15000) return 5.50
  if (totalCredits >= 5000) return 6.00
  if (totalCredits >= 1500) return 6.50
  if (totalCredits >= 500) return 7.00
  if (totalCredits >= 250) return 7.50
  return 8.00
}

export function calculateServicePrice(layer: number, positions: number, employees: number) {
  const calc = calcLayerCredits(layer, positions, employees)
  const ppc = pricePerCredit(calc.total)
  const volumeDiscount = getVolumeDiscount(positions, employees)
  const priceBeforeDiscount = Math.round(calc.total * ppc)
  const serviciiRON = Math.round(priceBeforeDiscount * (1 - volumeDiscount.pct / 100))
  return { credits: calc.total, serviciiRON, volumeDiscount, items: calc.items }
}

export const LAYER_NAMES: Record<number, string> = {
  1: "Ordine internă (Baza)",
  2: "Conformitate (Nivelul 1)",
  3: "Competitivitate (Nivelul 2)",
  4: "Dezvoltare (Nivelul 3)",
}
