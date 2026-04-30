"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface MonthlyPulse {
  month: string
  score: number
}

interface MaturityQuarter {
  quarter: string
  leadership: number
  adaptability: number
  collaboration: number
  innovation: number
  resilience: number
}

interface InterventionAction {
  action: string
  status: "implemented" | "partial" | "not_started"
}

interface RecalibrationPlan {
  version: string
  updatedAt: string
  summary: string
}

interface AnnualReport {
  year: number
  summary: string
  generatedAt: string
}

interface EvolutionData {
  monthlyPulse: MonthlyPulse[]
  maturity: MaturityQuarter[]
  interventions: InterventionAction[]
  recalibration: RecalibrationPlan | null
  annualReport: AnnualReport | null
  trendSummary: string
}

type MeasurementType = "pulse" | "maturity" | "intervention"

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  implemented: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Implementat" },
  partial: { bg: "bg-amber-50", text: "text-amber-700", label: "Partial" },
  not_started: { bg: "bg-gray-100", text: "text-gray-500", label: "Neinceput" },
}

export default function EvolutionMonitoringPage() {
  const [data, setData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<MeasurementType>("pulse")
  const [formValue, setFormValue] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/monitoring/evolution")
      if (res.ok) {
        const json = await res.json()
        setData(json.result || json)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function submitMeasurement() {
    setSubmitting(true)
    try {
      await fetch("/api/v1/monitoring/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: formType, value: formValue }),
      })
      setShowForm(false)
      setFormValue("")
      fetchData()
    } catch { /* silent */ }
    setSubmitting(false)
  }

  function maxBarHeight(score: number) {
    return Math.max(4, (score / 100) * 120)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <p className="text-sm text-text-secondary">Se incarca datele...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Monitorizare evolutie organizationala
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Dashboard evolutie cultura si interventii
          </p>
        </div>
        <Link
          href="/portal"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Portal
        </Link>
      </div>

      {/* Trend summary */}
      {data?.trendSummary && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
          <span className="text-xs uppercase tracking-wide text-amber-700">Sumar tendinte</span>
          <p className="text-sm text-foreground mt-1">{data.trendSummary}</p>
        </div>
      )}

      {/* 1. Puls lunar */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Puls lunar — ultimele 12 luni</h2>
        {data?.monthlyPulse && data.monthlyPulse.length > 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-end gap-2 h-32">
              {data.monthlyPulse.map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                  <span className="text-[10px] font-medium text-foreground mb-1">{m.score}</span>
                  <div
                    className="w-full rounded-t bg-amber-500 transition-all"
                    style={{ height: `${maxBarHeight(m.score)}px` }}
                  />
                  <span className="text-[10px] text-text-secondary mt-1 truncate w-full text-center">
                    {m.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Nu exista date de puls lunar.</p>
        )}
      </section>

      {/* 2. Maturitate */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Maturitate — ultimele 4 trimestre</h2>
        {data?.maturity && data.maturity.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.maturity.map((q, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-surface p-4">
                <span className="text-xs font-semibold text-amber-600">{q.quarter}</span>
                <div className="space-y-2 mt-2">
                  {([
                    { label: "Leadership", value: q.leadership },
                    { label: "Adaptabilitate", value: q.adaptability },
                    { label: "Colaborare", value: q.collaboration },
                    { label: "Inovatie", value: q.innovation },
                    { label: "Rezilienta", value: q.resilience },
                  ] as const).map((cap) => (
                    <div key={cap.label}>
                      <div className="flex justify-between text-[10px] text-text-secondary">
                        <span>{cap.label}</span>
                        <span>{cap.value}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${cap.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Nu exista date de maturitate.</p>
        )}
      </section>

      {/* 3. Impact interventii */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Impact interventii</h2>
        {data?.interventions && data.interventions.length > 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="space-y-2">
              {data.interventions.map((int, idx) => {
                const st = STATUS_STYLES[int.status] || STATUS_STYLES.not_started
                return (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{int.action}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Nu exista interventii inregistrate.</p>
        )}
      </section>

      {/* 4. Re-calibrare */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Re-calibrare</h2>
        {data?.recalibration ? (
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Versiune: {data.recalibration.version}
              </span>
              <span className="text-xs text-text-secondary">
                {data.recalibration.updatedAt}
              </span>
            </div>
            <p className="text-sm text-text-secondary">{data.recalibration.summary}</p>
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Nu exista plan de re-calibrare.</p>
        )}
      </section>

      {/* 5. Raport CA */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Raport CA</h2>
        {data?.annualReport ? (
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Anul {data.annualReport.year}
              </span>
              <span className="text-xs text-text-secondary">
                {data.annualReport.generatedAt}
              </span>
            </div>
            <p className="text-sm text-text-secondary">{data.annualReport.summary}</p>
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Nu exista raport anual.</p>
        )}
      </section>

      {/* Add measurement */}
      <div className="rounded-lg border border-border bg-surface p-5">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Adauga masurare
          </button>
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Masurare noua</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Tip masurare</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as MeasurementType)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  <option value="pulse">Puls lunar</option>
                  <option value="maturity">Maturitate</option>
                  <option value="intervention">Impact interventie</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Valoare / descriere</label>
                <input
                  type="text"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="ex: 72 sau Implementat training leadership"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={submitMeasurement}
                disabled={submitting}
                className="text-sm font-medium bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {submitting ? "Se salveaza..." : "Salveaza"}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormValue("") }}
                className="text-sm font-medium text-text-secondary px-4 py-2 rounded-lg border border-border hover:bg-gray-50 transition-colors"
              >
                Anuleaza
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
