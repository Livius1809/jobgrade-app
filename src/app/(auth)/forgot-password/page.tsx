"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        setError("A apărut o eroare. Te rog încearcă din nou.")
      } else {
        setSent(true)
      }
    } catch {
      setError("Eroare de conexiune. Verifică internetul și încearcă din nou.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verifică email-ul
        </h2>
        <p className="text-gray-500 mb-8">
          Dacă adresa <strong>{email}</strong> există în sistem, vei primi un
          email cu instrucțiuni pentru resetarea parolei. Verifică și folderul
          Spam.
        </p>
        <Link
          href="/login"
          className="text-sm text-coral hover:text-coral/80 transition-colors"
        >
          ← Înapoi la login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Resetare parolă
      </h2>
      <p className="text-gray-500 mb-8">
        Introdu adresa de email asociată contului tău și îți vom trimite un link
        de resetare.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="adresa@companie.ro"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-coral/30 focus:border-coral outline-none transition"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--coral)" }}
        >
          {loading ? "Se trimite..." : "Trimite link de resetare"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-coral transition-colors"
        >
          ← Înapoi la login
        </Link>
      </div>
    </div>
  )
}
