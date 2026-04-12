"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Link invalid</h2>
        <p className="text-gray-500 mb-6">
          Link-ul de resetare lipsește sau este incomplet. Te rog solicită un
          nou link de resetare.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-coral hover:text-coral/80 transition-colors"
        >
          Solicită un nou link →
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Parola trebuie să aibă minim 8 caractere.")
      return
    }
    if (password !== confirm) {
      setError("Parolele nu coincid.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(
          data.error ||
            "Link-ul de resetare a expirat sau este invalid. Solicită unul nou."
        )
      } else {
        setSuccess(true)
        setTimeout(() => router.push("/login"), 3000)
      }
    } catch {
      setError("Eroare de conexiune. Încearcă din nou.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Parolă resetată
        </h2>
        <p className="text-gray-500 mb-6">
          Parola a fost schimbată cu succes. Vei fi redirecționat la pagina de
          login în câteva secunde.
        </p>
        <Link
          href="/login"
          className="text-sm text-coral hover:text-coral/80 transition-colors"
        >
          Mergi la login →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Parolă nouă</h2>
      <p className="text-gray-500 mb-8">Alege o parolă nouă pentru contul tău.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Parolă nouă
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minim 8 caractere"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-coral/30 focus:border-coral outline-none transition"
          />
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirmă parola
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repetă parola"
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
          disabled={loading || !password || !confirm}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--coral)" }}
        >
          {loading ? "Se procesează..." : "Resetează parola"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-gray-400 py-12">Se încarcă...</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
