"use client"

import { useState, useEffect } from "react"

type CookieCategory = "necesare" | "functionale" | "analitice"

interface CookiePreferences {
  necesare: boolean
  functionale: boolean
  analitice: boolean
  timestamp: string
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  necesare: true,
  functionale: false,
  analitice: false,
  timestamp: "",
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    const stored = localStorage.getItem("cookie_consent")
    if (!stored) {
      setVisible(true)
    }
  }, [])

  function savePreferences(prefs: CookiePreferences) {
    const withTimestamp = { ...prefs, timestamp: new Date().toISOString() }
    localStorage.setItem("cookie_consent", JSON.stringify(withTimestamp))
    setCookie("cookie_consent", JSON.stringify(withTimestamp), 365)
    setVisible(false)
  }

  function acceptAll() {
    savePreferences({ necesare: true, functionale: true, analitice: true, timestamp: "" })
  }

  function acceptNecessary() {
    savePreferences({ necesare: true, functionale: false, analitice: false, timestamp: "" })
  }

  function saveCustom() {
    savePreferences(preferences)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6">
      <div className="max-w-3xl mx-auto bg-surface border border-border rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground mb-2">
            Respectăm confidențialitatea datelor tale
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Folosim cookie-uri pentru a asigura funcționarea platformei și, cu acordul tău,
            pentru a îmbunătăți experiența. Poți alege ce categorii accepți.
          </p>
        </div>

        {/* Details panel */}
        {showDetails && (
          <div className="mb-4 space-y-3 border-t border-border pt-4">
            {/* Necesare */}
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="mt-1 rounded border-border"
              />
              <div>
                <span className="text-sm font-medium text-foreground">Necesare</span>
                <span className="ml-2 text-xs text-text-micro">(mereu active)</span>
                <p className="text-xs text-text-secondary mt-0.5">
                  Esențiale pentru funcționarea platformei: autentificare, securitate, preferințe de bază.
                </p>
              </div>
            </label>

            {/* Funcționale */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.functionale}
                onChange={(e) => setPreferences({ ...preferences, functionale: e.target.checked })}
                className="mt-1 rounded border-border accent-indigo"
              />
              <div>
                <span className="text-sm font-medium text-foreground">Funcționale</span>
                <p className="text-xs text-text-secondary mt-0.5">
                  Personalizare interfață, limbă preferată, setări chat AI.
                </p>
              </div>
            </label>

            {/* Analitice */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.analitice}
                onChange={(e) => setPreferences({ ...preferences, analitice: e.target.checked })}
                className="mt-1 rounded border-border accent-indigo"
              />
              <div>
                <span className="text-sm font-medium text-foreground">Analitice</span>
                <p className="text-xs text-text-secondary mt-0.5">
                  Ne ajută să înțelegem cum este folosită platforma, fără a colecta date personale.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={acceptAll}
            className="px-5 py-2.5 rounded-xl bg-coral text-white text-sm font-semibold btn-coral"
          >
            Acceptă toate
          </button>
          <button
            onClick={acceptNecessary}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-warm-bg transition-colors"
          >
            Doar necesare
          </button>
          {!showDetails ? (
            <button
              onClick={() => setShowDetails(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-indigo hover:underline transition-colors"
            >
              Personalizare
            </button>
          ) : (
            <button
              onClick={saveCustom}
              className="px-5 py-2.5 rounded-xl border border-indigo/20 text-sm font-medium text-indigo hover:bg-indigo/5 transition-colors btn-indigo-outline"
            >
              Salvează preferințele
            </button>
          )}
        </div>

        {/* Link politica */}
        <p className="mt-3 text-xs text-text-micro">
          Mai multe detalii în{" "}
          <a href="/cookies" className="text-indigo hover:underline">Politica de cookie-uri</a>.
        </p>
      </div>
    </div>
  )
}
