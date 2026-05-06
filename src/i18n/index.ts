import ro from "./ro.json"
import en from "./en.json"
import { cookies, headers } from "next/headers"

export type Locale = "ro" | "en"

const dictionaries: Record<Locale, Record<string, any>> = { ro, en }

/**
 * Detect locale from cookie "locale" or Accept-Language header.
 * Fallback: Romanian (primary language of the platform).
 */
export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies()
    const localeCookie = cookieStore.get("locale")?.value
    if (localeCookie === "en" || localeCookie === "ro") return localeCookie
  } catch {
    // cookies() may throw outside of request context
  }

  try {
    const headerStore = await headers()
    const acceptLang = headerStore.get("accept-language") || ""
    if (acceptLang.startsWith("en")) return "en"
  } catch {
    // headers() may throw outside of request context
  }

  return "ro"
}

/**
 * Get a nested translation value by dot-notation key.
 * Example: t("common.save", "ro") → "Salveaza"
 */
export function t(key: string, locale: Locale = "ro"): string {
  const dict = dictionaries[locale] || dictionaries.ro
  const parts = key.split(".")
  let value: any = dict
  for (const part of parts) {
    value = value?.[part]
    if (value === undefined) break
  }
  if (typeof value === "string") return value

  // Fallback to Romanian if key not found in requested locale
  if (locale !== "ro") {
    let fallback: any = dictionaries.ro
    for (const part of parts) {
      fallback = fallback?.[part]
      if (fallback === undefined) break
    }
    if (typeof fallback === "string") return fallback
  }

  return key // Return key itself as last resort
}

/**
 * Create a bound translate function for a specific locale.
 */
export function createT(locale: Locale) {
  return (key: string) => t(key, locale)
}
