"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(3, "Minim 3 caractere"),
  jobIds: z.array(z.string()).min(1, "Selectează cel puțin un job"),
  participantIds: z
    .array(z.string())
    .min(1, "Selectează cel puțin un evaluator"),
})

type FormData = z.infer<typeof schema>

interface Job {
  id: string
  title: string
  code?: string | null
  department?: { name: string } | null
}

interface Evaluator {
  id: string
  firstName: string
  lastName: string
  role: string
  jobTitle?: string | null
}

const ROLE_LABELS: Record<string, string> = {
  FACILITATOR: "Facilitator",
  REPRESENTATIVE: "Reprezentant",
}

export default function NewSessionWizard({
  jobs,
  evaluators,
}: {
  jobs: Job[]
  evaluators: Evaluator[]
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { jobIds: [], participantIds: [] },
  })

  const selectedJobs = watch("jobIds")
  const selectedParticipants = watch("participantIds")
  const sessionName = watch("name")

  function toggleItem(field: "jobIds" | "participantIds", id: string) {
    const current = field === "jobIds" ? selectedJobs : selectedParticipants
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id]
    setValue(field, next, { shouldValidate: true })
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "A apărut o eroare.")
        setLoading(false)
        return
      }

      router.push(`/app/sessions/${json.id}`)
    } catch {
      setError("A apărut o eroare. Încearcă din nou.")
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

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-16 transition-colors ${
                  step > s ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
        <div className="ml-2 text-sm text-gray-500">
          {step === 1 && "Detalii sesiune"}
          {step === 2 && "Selectează joburi"}
          {step === 3 && "Selectează evaluatori"}
        </div>
      </div>

      {/* Step 1: Name */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Detalii sesiune</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numele sesiunii *
            </label>
            <input
              {...register("name")}
              type="text"
              placeholder="ex: Evaluare Q1 2025 — IT & Engineering"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Jobs */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Selectează joburile de evaluat
            </h2>
            <span className="text-sm text-gray-500">
              {selectedJobs.length} selectate
            </span>
          </div>

          {errors.jobIds && (
            <p className="text-xs text-red-600">{errors.jobIds.message}</p>
          )}

          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Nu există joburi active. Creează mai întâi fișe de post.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {jobs.map((job) => (
                <label
                  key={job.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedJobs.includes(job.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedJobs.includes(job.id)}
                    onChange={() => toggleItem("jobIds", job.id)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {job.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {job.department?.name ?? "—"}
                      {job.code ? ` · ${job.code}` : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Participants */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Selectează evaluatorii
            </h2>
            <span className="text-sm text-gray-500">
              {selectedParticipants.length} selectați
            </span>
          </div>

          {errors.participantIds && (
            <p className="text-xs text-red-600">
              {errors.participantIds.message}
            </p>
          )}

          {evaluators.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Nu există evaluatori disponibili. Invită utilizatori din Setări.
            </p>
          ) : (
            <div className="space-y-2">
              {evaluators.map((ev) => (
                <label
                  key={ev.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedParticipants.includes(ev.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(ev.id)}
                    onChange={() => toggleItem("participantIds", ev.id)}
                    className="rounded"
                  />
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                    {ev.firstName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {ev.firstName} {ev.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ROLE_LABELS[ev.role] ?? ev.role}
                      {ev.jobTitle ? ` · ${ev.jobTitle}` : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-1">
            <div className="font-medium text-gray-700">Sumar sesiune:</div>
            <div className="text-gray-600">Nume: {sessionName}</div>
            <div className="text-gray-600">
              Joburi: {selectedJobs.length} selectate
            </div>
            <div className="text-gray-600">
              Evaluatori: {selectedParticipants.length} selectați
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => (step === 1 ? router.back() : setStep(step - 1))}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {step === 1 ? "Anulează" : "← Înapoi"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Continuă →
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Se creează..." : "Creează sesiunea"}
          </button>
        )}
      </div>
    </form>
  )
}
