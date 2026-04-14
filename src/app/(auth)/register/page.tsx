"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z
  .object({
    cui: z.string().min(2, "CUI obligatoriu").regex(/^(RO)?\d{2,10}$/, "Format CUI invalid (ex: RO12345678 sau 12345678)"),
    companyName: z.string().min(2, "Minim 2 caractere"),
    firstName: z.string().min(2, "Minim 2 caractere"),
    lastName: z.string().min(2, "Minim 2 caractere"),
    email: z.string().email("Email invalid"),
    phone: z.string().min(10, "Telefon obligatoriu"),
    password: z
      .string()
      .min(8, "Minim 8 caractere")
      .regex(/[A-Z]/, "Cel puțin o literă mare")
      .regex(/[0-9]/, "Cel puțin o cifră"),
    confirmPassword: z.string(),
    terms: z.literal(true, { error: "Trebuie să accepți termenii" }),
    gdpr: z.literal(true, { error: "Trebuie să accepți GDPR" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  })

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.companyName,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "A apărut o eroare.")
        setLoading(false)
        return
      }

      router.push("/login?registered=true&callbackUrl=/onboarding")
    } catch {
      setError("A apărut o eroare. Încearcă din nou.")
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Creează contul organizației</h2>
      <p className="text-slate-500 mb-8">Introdu datele companiei pentru a accesa portalul JobGrade</p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <Link
          href="/login"
          className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          Login
        </Link>
        <span className="px-4 py-2 border-b-2 border-coral text-coral font-medium text-sm">
          Cont nou
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* OAuth */}
      <div className="space-y-2 mb-6">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Înregistrare cu Google
        </button>
        <button
          type="button"
          onClick={() => signIn("linkedin", { callbackUrl: "/onboarding" })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          Înregistrare cu LinkedIn
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-slate-400">sau cu email</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Organizația</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              CUI
            </label>
            <input
              {...register("cui")}
              type="text"
              placeholder="RO12345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
            />
            {errors.cui && (
              <p className="mt-1 text-xs text-red-600">{errors.cui.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Denumire companie
            </label>
            <input
              {...register("companyName")}
              type="text"
              placeholder="Exemplu SRL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
            />
            {errors.companyName && (
              <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>
            )}
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Persoana de contact</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prenume
            </label>
            <input
              {...register("firstName")}
              type="text"
              placeholder="Ana"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume
            </label>
            <input
              {...register("lastName")}
              type="text"
              placeholder="Popescu"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email profesional
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="ana@companie.ro"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Telefon
            </label>
            <input
              {...register("phone")}
              type="tel"
              placeholder="0721 234 567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Securitate</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Parolă
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Minim 8 caractere"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmă parola
          </label>
          <div className="relative">
            <input
              {...register("confirmPassword")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input {...register("terms")} type="checkbox" className="mt-0.5 rounded" />
            <span className="text-sm text-gray-600">
              Sunt de acord cu{" "}
              <Link href="/termeni" className="text-coral hover:underline">
                Termenii și Condițiile
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="text-xs text-red-600">{errors.terms.message}</p>
          )}

          <label className="flex items-start gap-2 cursor-pointer">
            <input {...register("gdpr")} type="checkbox" className="mt-0.5 rounded" />
            <span className="text-sm text-gray-600">
              Accept{" "}
              <Link href="/gdpr" className="text-coral hover:underline">
                Politica GDPR
              </Link>
            </span>
          </label>
          {errors.gdpr && (
            <p className="text-xs text-red-600">{errors.gdpr.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-coral text-white py-2.5 rounded-lg font-medium hover:bg-coral-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Se procesează..." : "Creează cont"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Ai deja cont?{" "}
        <Link href="/login" className="text-coral hover:underline font-medium">
          Loghează-te
        </Link>
      </p>
    </div>
  )
}
