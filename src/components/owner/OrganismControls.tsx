"use client"

import { useState, useEffect } from "react"

interface ConfigItem {
  key: string
  value: string
  label?: string
}

const CONTROLS = [
  {
    key: "EXECUTOR_CRON_ENABLED",
    label: "Executor activ",
    description: "Procesează tasks ASSIGNED la fiecare ciclu cron",
    type: "toggle" as const,
  },
  {
    key: "SIGNAL_FILTER_LEVEL",
    label: "Filtru signals",
    description: "Nivel procesare semnale externe",
    type: "select" as const,
    options: [
      { value: "critical", label: "Critic — doar legal (LEGAL_REG)" },
      { value: "focused", label: "Focusat — legal + competiție" },
      { value: "broad", label: "Larg — + piață, tech, talent" },
      { value: "full", label: "Complet — toate categoriile" },
    ],
  },
]

const CRON_INFO = [
  { path: "Executor", schedule: "La fiecare 30 min", limit: "5 tasks/ciclu" },
  { path: "Signals", schedule: "La fiecare 15 min", limit: "10 signals/ciclu" },
  { path: "Retry", schedule: "La fiecare 30 min", limit: "10 tasks blocate" },
]

export default function OrganismControls() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/v1/admin/system-config")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {}
        for (const c of d.configs || []) map[c.key] = c.value
        // Fallback to env defaults if not in DB yet
        if (!map["EXECUTOR_CRON_ENABLED"]) map["EXECUTOR_CRON_ENABLED"] = "true"
        if (!map["SIGNAL_FILTER_LEVEL"]) map["SIGNAL_FILTER_LEVEL"] = "focused"
        setConfigs(map)
      })
      .catch(() => {
        setConfigs({ EXECUTOR_CRON_ENABLED: "true", SIGNAL_FILTER_LEVEL: "focused" })
      })
      .finally(() => setLoading(false))
  }, [])

  async function updateConfig(key: string, value: string) {
    setSaving(key)
    setConfigs((prev) => ({ ...prev, [key]: value }))
    try {
      await fetch("/api/v1/admin/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
    } catch {
      // revert on error
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-32 mb-3" />
        <div className="h-8 bg-slate-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toggles + Selectors */}
      {CONTROLS.map((ctrl) => (
        <div
          key={ctrl.key}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{ctrl.label}</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {ctrl.description}
              </p>
            </div>

            {ctrl.type === "toggle" ? (
              <button
                onClick={() =>
                  updateConfig(
                    ctrl.key,
                    configs[ctrl.key] === "true" ? "false" : "true"
                  )
                }
                disabled={saving === ctrl.key}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  configs[ctrl.key] === "true"
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                } ${saving === ctrl.key ? "opacity-50" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    configs[ctrl.key] === "true"
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </button>
            ) : (
              <select
                value={configs[ctrl.key] || "focused"}
                onChange={(e) => updateConfig(ctrl.key, e.target.value)}
                disabled={saving === ctrl.key}
                className="text-xs border border-border rounded-lg px-3 py-1.5 bg-surface text-foreground focus:ring-2 focus:ring-indigo/30 outline-none"
              >
                {ctrl.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}

      {/* Cron info (read-only) */}
      <div className="rounded-xl border border-border/50 bg-surface/50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 mb-3">
          Cicluri automate (configurare în vercel.json)
        </p>
        <div className="space-y-1.5">
          {CRON_INFO.map((cron) => (
            <div
              key={cron.path}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-text-secondary">{cron.path}</span>
              <span className="text-text-secondary/60 font-mono">
                {cron.schedule} · {cron.limit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
