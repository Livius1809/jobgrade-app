"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Câmp obligatoriu"),
    newPassword: z
      .string()
      .min(8, "Minim 8 caractere")
      .regex(/[A-Z]/, "Cel puțin o literă mare")
      .regex(/[0-9]/, "Cel puțin o cifră"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  })

type PasswordData = z.infer<typeof passwordSchema>

interface SecurityFormProps {
  userId: string
  name: string
  email: string
}

export default function SecurityForm({ userId, name, email }: SecurityFormProps) {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) })

  async function onSubmit(data: PasswordData) {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/v1/users/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Eroare la schimbarea parolei.")
        setLoading(false)
        return
      }

      setSuccess("Parola a fost schimbată cu succes.")
      reset()
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Info cont */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Informații cont</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500 mb-0.5">Nume complet</div>
            <div className="font-medium text-gray-900">{name}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Email</div>
            <div className="font-medium text-gray-900">{email}</div>
          </div>
        </div>
      </div>

      {/* Schimbare parolă */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Schimbă parola</h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parola actuală
            </label>
            <input
              {...register("currentPassword")}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parola nouă
            </label>
            <input
              {...register("newPassword")}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmă parola nouă
            </label>
            <input
              {...register("confirmPassword")}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Se salvează..." : "Schimbă parola"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
