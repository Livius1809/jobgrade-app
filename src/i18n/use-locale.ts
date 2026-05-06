"use client"

import { useCallback, useMemo, useState, useEffect } from "react"
import ro from "./ro.json"
import en from "./en.json"

export type Locale = "ro" | "en"

const dictionaries: Record<Locale, Record<string, any>> = { ro, en }

function getNestedValue(obj: any, key: string): string {
  const parts = key.split(".")
  let value: any = obj
  for (const part of parts) {
    value = value?.[part]
    if (value === undefined) break
  }
  return typeof value === "string" ? value : key
}

/**
 * React hook for client-side i18n.
 * Reads locale from cookie; defaults to "ro".
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("ro")

  useEffect(() => {
    // Read from cookie on mount
    const match = document.cookie.match(/(?:^|; )locale=([^;]*)/)
    const cookieLocale = match?.[1]
    if (cookieLocale === "en" || cookieLocale === "ro") {
      setLocaleState(cookieLocale)
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    document.cookie = `locale=${newLocale};path=/;max-age=${365 * 24 * 3600}`
  }, [])

  const t = useCallback(
    (key: string): string => {
      const value = getNestedValue(dictionaries[locale], key)
      if (value !== key) return value
      // Fallback to Romanian
      if (locale !== "ro") {
        const fallback = getNestedValue(dictionaries.ro, key)
        if (fallback !== key) return fallback
      }
      return key
    },
    [locale]
  )

  return useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])
}
