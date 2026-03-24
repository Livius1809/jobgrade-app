"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { JobStatus } from "@/generated/prisma"

const schema = z.object({
  title: z.string().min(2, "Minim 2 caractere"),
  code: z.string().optional(),
  departmentId: z.string().optional(),
  representativeId: z.string().optional(),
  purpose: z.string().optional(),
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  status: z.nativeEnum(JobStatus),
})

type FormData = z.infer<typeof schema>

interface Department {
  id: string
  name: string
}

interface Representative {
  id: string
  firstName: string
  lastName: string
  jobTitle?: string | null
}

interface JobFormProps {
  departments: Department[]
  representatives: Representative[]
  defaultValues?: Partial<FormData>
  jobId?: string
}

export default function JobForm({
  departments,
  representatives,
  defaultValues,
  jobId,
}: JobFormProps) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: JobStatus.DRAFT,
      ...defaultValues,
    },
  })

  const title = watch("title")

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError("")

    try {
      const url = jobId ? `/api/v1/jobs/${jobId}` : "/api/v1/jobs"
      const method = jobId ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "A apărut o eroare.")
        setLoading(false)
        return
      }

      router.push(`/app/jobs/${json.id ?? jobId}`)
      router.refresh()
    } catch {
      setError("A apărut o eroare. Încearcă din nou.")
      setLoading(false)
    }
  }

  async function handleAiAnalysis() {
    if (!title || title.length < 3) {
      setError("Completează titlul poziției pentru a genera cu AI.")
      return
    }
    setAiLoading(true)
    setError("")

    try {
      const res = await fetch("/api/v1/ai/job-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Eroare AI.")
        setAiLoading(false)
        return
      }

      if (json.purpose) setValue("purpose", json.purpose)
      if (json.responsibilities) setValue("responsibilities", json.responsibilities)
      if (json.requirements) setValue("requirements", json.requirements)
    } catch {
      setError("Eroare la generarea cu AI.")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Informații de bază</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titlul poziției *
            </label>
            <input
              {...register("title")}
              type="text"
              placeholder="ex: Senior Software Engineer"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cod poziție
            </label>
            <input
              {...register("code")}
              type="text"
              placeholder="ex: IT-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departament
            </label>
            <select
              {...register("departmentId")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selectează departamentul —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reprezentant
            </label>
            <select
              {...register("representativeId")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selectează reprezentantul —</option>
              {representatives.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName} {r.lastName}
                  {r.jobTitle ? ` (${r.jobTitle})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            {...register("status")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="DRAFT">Ciornă</option>
            <option value="ACTIVE">Activ</option>
            <option value="ARCHIVED">Arhivat</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Descrierea rolului</h2>
          <button
            type="button"
            onClick={handleAiAnalysis}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            {aiLoading ? (
              "Se generează..."
            ) : (
              <>
                <span>✨</span>
                <span>Generează cu AI</span>
              </>
            )}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scopul rolului
          </label>
          <textarea
            {...register("purpose")}
            rows={3}
            placeholder="Descrie scopul principal al acestei poziții..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsabilități principale
          </label>
          <textarea
            {...register("responsibilities")}
            rows={6}
            placeholder="Listează principalele responsabilități și atribuții..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cerințe și calificări
          </label>
          <textarea
            {...register("requirements")}
            rows={4}
            placeholder="Educație, experiență, competențe necesare..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Anulează
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Se salvează..." : jobId ? "Salvează modificările" : "Creează fișa de post"}
        </button>
      </div>
    </form>
  )
}
