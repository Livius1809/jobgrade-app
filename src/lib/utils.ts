import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function formatCurrency(
  amount: number,
  currency = "RON",
  locale = "ro-RO"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string, locale = "ro-RO"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string, locale = "ro-RO"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function timeAgo(date: Date | string, locale = "ro"): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const diff = (new Date(date).getTime() - Date.now()) / 1000

  if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), "second")
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), "minute")
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), "hour")
  return rtf.format(Math.round(diff / 86400), "day")
}

export function normalizeScore(score: number, maxScore: number): number {
  return Math.round((score / maxScore) * 100 * 10) / 10
}

export function calculateCv(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  return stdDev / mean
}

export function getMode(values: number[]): number {
  const freq: Record<number, number> = {}
  values.forEach((v) => (freq[v] = (freq[v] || 0) + 1))
  return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])
}
