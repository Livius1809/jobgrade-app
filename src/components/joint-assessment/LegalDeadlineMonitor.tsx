"use client"

// ── Tipuri ──────────────────────────────────────────────────

interface Props {
  triggeredAt: string
  dueDate: string | null
  status: string
  resolvedAt?: string | null
}

interface DeadlineLevel {
  label: string
  color: string
  bgColor: string
  borderColor: string
}

const LEVELS: Record<string, DeadlineLevel> = {
  OK: {
    label: "In termen",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  INFO: {
    label: "Informativ",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  AVERTISMENT: {
    label: "Avertisment",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  URGENT: {
    label: "Urgent",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  CRITIC: {
    label: "Critic",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
}

// ── Helpers ─────────────────────────────────────────────────

function calcWorkingDaysRemaining(dueDate: Date): number {
  const now = new Date()
  if (now >= dueDate) return 0

  let days = 0
  const cursor = new Date(now)
  while (cursor < dueDate) {
    cursor.setDate(cursor.getDate() + 1)
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) {
      days++
    }
  }
  return days
}

function calcWorkingDaysElapsed(startDate: Date): number {
  const now = new Date()
  let days = 0
  const cursor = new Date(startDate)
  while (cursor < now) {
    cursor.setDate(cursor.getDate() + 1)
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) {
      days++
    }
  }
  return days
}

function getLevel(daysRemaining: number): string {
  if (daysRemaining <= 0) return "CRITIC"
  if (daysRemaining <= 5) return "CRITIC"   // ~0.5 luni
  if (daysRemaining <= 22) return "URGENT"   // ~1 luna
  if (daysRemaining <= 44) return "AVERTISMENT" // ~2 luni
  if (daysRemaining <= 90) return "INFO"
  return "OK"
}

function getLevelMessage(daysRemaining: number, category: string): string {
  if (daysRemaining <= 0) {
    return `TERMEN DEPASIT! Evaluarea comuna pentru "${category}" a depasit termenul legal de 6 luni. Se impune notificarea autoritatii competente.`
  }
  if (daysRemaining <= 5) {
    return `CRITIC: Mai sunt doar ${daysRemaining} zile lucratoare. Risc sanctiuni — finalizati imediat.`
  }
  if (daysRemaining <= 22) {
    return `URGENT: ${daysRemaining} zile lucratoare ramase (~1 luna). Escalare recomandata daca planul nu este finalizat.`
  }
  if (daysRemaining <= 44) {
    return `AVERTISMENT: ${daysRemaining} zile lucratoare ramase (~2 luni). Asigurati-va ca echipa lucreaza activ la plan.`
  }
  return `${daysRemaining} zile lucratoare ramase. Status conform.`
}

// ── Componenta ──────────────────────────────────────────────

export default function LegalDeadlineMonitor({
  triggeredAt,
  dueDate,
  status,
  resolvedAt,
}: Props) {
  const isResolved = status === "RESOLVED" || status === "CLOSED"
  const startDate = new Date(triggeredAt)
  const deadlineDate = dueDate ? new Date(dueDate) : null

  if (!deadlineDate) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-500">
          Termen legal nesetat. Setati termenul limita de 6 luni conform Art. 10
          alin. 3.
        </p>
      </div>
    )
  }

  const daysRemaining = calcWorkingDaysRemaining(deadlineDate)
  const daysElapsed = calcWorkingDaysElapsed(startDate)
  const totalDays = daysElapsed + daysRemaining
  const progressPercent = totalDays > 0
    ? Math.min(100, Math.round((daysElapsed / totalDays) * 100))
    : 0

  const levelKey = isResolved ? "OK" : getLevel(daysRemaining)
  const level = LEVELS[levelKey] ?? LEVELS.OK

  // Milestone-uri timeline
  const milestones = [
    { label: "Declansare", date: startDate, position: 0 },
    { label: "4 luni", date: null, position: 67 },
    { label: "5 luni", date: null, position: 83 },
    { label: "Termen", date: deadlineDate, position: 100 },
  ]

  return (
    <div className={`border rounded-xl p-5 space-y-4 ${level.borderColor} ${level.bgColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${level.bgColor} ${level.color} border ${level.borderColor}`}
          >
            {level.label}
          </span>
          <span className="text-sm font-medium text-gray-900">
            Termen legal Art. 10 alin. 3
          </span>
        </div>
        {isResolved && resolvedAt && (
          <span className="text-xs text-green-600 font-medium">
            Rezolvat {new Date(resolvedAt).toLocaleDateString("ro-RO")}
          </span>
        )}
      </div>

      {/* Mesaj nivel */}
      {!isResolved && (
        <p className={`text-sm ${level.color}`}>
          {getLevelMessage(daysRemaining, "aceasta categorie")}
        </p>
      )}

      {isResolved && (
        <p className="text-sm text-green-700">
          Evaluarea comuna a fost finalizata in termen. Gap-ul a fost remediat
          sub pragul de 5%.
        </p>
      )}

      {/* Progress bar cu milestones */}
      <div className="space-y-2">
        <div className="relative h-3 bg-white/60 rounded-full overflow-hidden border border-gray-200/50">
          <div
            className={`h-full rounded-full transition-all ${
              isResolved
                ? "bg-green-500"
                : levelKey === "CRITIC"
                ? "bg-red-500"
                : levelKey === "URGENT"
                ? "bg-orange-500"
                : levelKey === "AVERTISMENT"
                ? "bg-amber-500"
                : "bg-violet-500"
            }`}
            style={{ width: `${isResolved ? 100 : progressPercent}%` }}
          />
        </div>

        {/* Milestone labels */}
        <div className="relative h-4">
          {milestones.map((m, i) => (
            <div
              key={i}
              className="absolute text-[10px] text-gray-500 -translate-x-1/2"
              style={{ left: `${m.position}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Detalii */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-gray-500">Declansat</div>
          <div className="text-sm font-medium text-gray-900">
            {startDate.toLocaleDateString("ro-RO")}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Zile lucratoare consumate</div>
          <div className="text-sm font-medium text-gray-900">{daysElapsed}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Termen limita</div>
          <div className="text-sm font-medium text-gray-900">
            {deadlineDate.toLocaleDateString("ro-RO")}
          </div>
        </div>
      </div>

      {/* Notificari programate */}
      {!isResolved && (
        <div className="border-t border-gray-200/50 pt-3">
          <div className="text-xs font-medium text-gray-600 mb-2">
            Notificari automate programate
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "4 luni", days: 44, type: "AVERTISMENT" as const },
              { label: "5 luni", days: 22, type: "URGENT" as const },
              { label: "5.5 luni", days: 11, type: "CRITIC" as const },
            ].map((n) => (
              <span
                key={n.label}
                className={`text-xs px-2 py-1 rounded-full ${
                  daysRemaining <= n.days
                    ? "bg-gray-300 text-gray-600 line-through"
                    : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {n.label}
                {daysRemaining <= n.days && " (emisa)"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
