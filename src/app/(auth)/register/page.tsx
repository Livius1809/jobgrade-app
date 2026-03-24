"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z
  .object({
    companyName: z.string().min(2, "Minim 2 caractere"),
    firstName: z.string().min(2, "Minim 2 caractere"),
    lastName: z.string().min(2, "Minim 2 caractere"),
    email: z.string().email("Email invalid"),
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

      router.push("/login?registered=true")
    } catch {
      setError("A apărut o eroare. Încearcă din nou.")
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Creează cont</h2>
      <p className="text-gray-500 mb-8">Începe evaluarea joburilor în compania ta</p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <Link
          href="/login"
          className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          Login
        </Link>
        <span className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium text-sm">
          Cont nou
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numele companiei
          </label>
          <input
            {...register("companyName")}
            type="text"
            placeholder="Exemplu SRL"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prenume
            </label>
            <input
              {...register("firstName")}
              type="text"
              placeholder="Ana"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email profesional
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="ana@companie.ro"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parolă
          </label>
          <input
            {...register("password")}
            type="password"
            placeholder="Minim 8 caractere"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmă parola
          </label>
          <input
            {...register("confirmPassword")}
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input {...register("terms")} type="checkbox" className="mt-0.5 rounded" />
            <span className="text-sm text-gray-600">
              Sunt de acord cu{" "}
              <Link href="/termeni" className="text-blue-600 hover:underline">
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
              <Link href="/gdpr" className="text-blue-600 hover:underline">
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
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Se procesează..." : "Creează cont"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Ai deja cont?{" "}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Loghează-te
        </Link>
      </p>
    </div>
  )
}
