"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  tenantName: z.string().min(2, "Minim 2 caractere"),
  website: z.string().url("URL invalid").optional().or(z.literal("")),
  description: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  cui: z.string().optional(),
  regCom: z.string().optional(),
  address: z.string().optional(),
  county: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ProfileData {
  mission: string
  vision: string
  description: string
  industry: string
  size: string
  website: string
  cui: string
  regCom: string
  address: string
  county: string
}

interface CompanyProfileFormProps {
  tenantName: string
  profile: ProfileData | null
  onSuccessRedirect?: string
}

const INDUSTRY_OPTIONS = [
  "IT & Software",
  "Producție",
  "Retail",
  "Servicii financiare",
  "Sănătate",
  "Construcții",
  "Transport & Logistică",
  "Educație",
  "Telecomunicații",
  "Alimentar",
  "Altele",
]

const SIZE_OPTIONS = [
  "1-10 angajați",
  "11-50 angajați",
  "51-200 angajați",
  "201-500 angajați",
  "501-1000 angajați",
  "1000+ angajați",
]

export default function CompanyProfileForm({
  tenantName,
  profile,
  onSuccessRedirect,
}: CompanyProfileFormProps) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantName,
      ...profile,
    },
  })

  const website = watch("website")

  async function handleExtract() {
    if (!website) {
      setError("Completează URL-ul website-ului înainte de extragere.")
      return
    }
    setExtracting(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/v1/ai/company-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Eroare la extragere.")
        setExtracting(false)
        return
      }

      if (json.description) setValue("description", json.description)
      if (json.mission) setValue("mission", json.mission)
      if (json.vision) setValue("vision", json.vision)
      if (json.industry) setValue("industry", json.industry)
      if (json.size) setValue("size", json.size)

      setSuccess("Informațiile au fost extrase cu succes. Verifică și salvează.")
    } catch {
      setError("Eroare la extragerea informațiilor.")
    } finally {
      setExtracting(false)
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/v1/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "A apărut o eroare.")
        setLoading(false)
        return
      }

      setSuccess("Profilul a fost salvat cu succes.")
      if (onSuccessRedirect) {
        router.push(onSuccessRedirect)
      } else {
        router.refresh()
      }
    } catch {
      setError("A apărut o eroare. Încearcă din nou.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

      {/* Informații de bază */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Informații de bază</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numele companiei *
          </label>
          <input
            {...register("tenantName")}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.tenantName && (
            <p className="mt-1 text-xs text-red-600">
              {errors.tenantName.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industrie
            </label>
            <select
              {...register("industry")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selectează —</option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimensiune
            </label>
            <select
              {...register("size")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selectează —</option>
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CUI
            </label>
            <input
              {...register("cui")}
              type="text"
              placeholder="ex: RO12345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reg. Com.
            </label>
            <input
              {...register("regCom")}
              type="text"
              placeholder="ex: J40/1234/2020"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresă
            </label>
            <input
              {...register("address")}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Județ
            </label>
            <input
              {...register("county")}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Extragere din website */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Descriere & identitate
          </h2>
          <div className="flex items-center gap-2">
            <input
              {...register("website")}
              type="url"
              placeholder="https://compania.ro"
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {extracting ? (
                "Se extrage..."
              ) : (
                <>
                  <span>✨</span>
                  <span>Extrage din site</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errors.website && (
          <p className="text-xs text-red-600">{errors.website.message}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descriere companie
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Scurtă descriere a companiei..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Misiune
          </label>
          <textarea
            {...register("mission")}
            rows={2}
            placeholder="Misiunea companiei..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Viziune
          </label>
          <textarea
            {...register("vision")}
            rows={2}
            placeholder="Viziunea companiei..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Se salvează..." : "Salvează profilul"}
        </button>
      </div>
    </form>
  )
}
