"use client"

/**
 * EvolutionSpiral — Vizualizare SVG a parcursului evolutiv B2C
 *
 * Spirala cu 4 faze: Crisalidă → Fluture → Zbor → Salt
 * 6 carduri poziționate pe spirală, colorate per status (activ/locked/completat)
 * Animație subtilă: pulsează faza curentă
 */

interface SpiralProps {
  /** Faza curentă: CHRYSALIS | BUTTERFLY | FLIGHT | LEAP */
  currentPhase: string
  /** Etapa curentă (1-4) în faza curentă */
  currentStage: number
  /** Statusul fiecărui card */
  cards: Array<{
    id: string
    title: string
    status: "ACTIVE" | "LOCKED" | "COMPLETED"
    phase: string
  }>
}

const PHASES = [
  { key: "CHRYSALIS", label: "Crisalida", color: "#8B7355", description: "Inceputul transformarii" },
  { key: "BUTTERFLY", label: "Fluturele", color: "#6366F1", description: "Metamorfoza" },
  { key: "FLIGHT", label: "Zborul", color: "#F97316", description: "Libertatea" },
  { key: "LEAP", label: "Saltul", color: "#10B981", description: "Transcendenta" },
]

// Pozițiile cardurilor pe spirală (cx, cy pe un SVG 400×400)
const CARD_POSITIONS = [
  { id: "CARD_6", cx: 200, cy: 340, angle: 0 },     // Centru jos — "Spune-mi despre mine" (start)
  { id: "CARD_3", cx: 310, cy: 280, angle: 60 },     // Dreapta jos — Cariera
  { id: "CARD_2", cx: 340, cy: 170, angle: 120 },    // Dreapta sus — Relații
  { id: "CARD_4", cx: 250, cy: 90, angle: 180 },     // Sus — Succes/Valoare
  { id: "CARD_1", cx: 120, cy: 120, angle: 240 },    // Stânga sus — Drumul către mine
  { id: "CARD_5", cx: 80, cy: 230, angle: 300 },     // Stânga — Antreprenoriat
]

const STATUS_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  ACTIVE: { fill: "#EEF2FF", stroke: "#6366F1", text: "#4338CA" },
  LOCKED: { fill: "#F9FAFB", stroke: "#D1D5DB", text: "#9CA3AF" },
  COMPLETED: { fill: "#ECFDF5", stroke: "#10B981", text: "#065F46" },
}

export default function EvolutionSpiral({ currentPhase, currentStage, cards }: SpiralProps) {
  const currentPhaseIndex = PHASES.findIndex(p => p.key === currentPhase)

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg viewBox="0 0 400 400" className="w-full h-auto">
        {/* Gradient de fundal */}
        <defs>
          <radialGradient id="spiralBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0.02" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="200" cy="200" r="195" fill="url(#spiralBg)" />

        {/* Spirala — 3 bucle concentrice */}
        <path
          d="M 200 340
             C 310 340, 360 260, 340 170
             C 320 80, 220 60, 160 100
             C 100 140, 80 220, 120 280
             C 160 340, 240 330, 280 260
             C 320 190, 280 120, 200 100
             C 120 80, 80 160, 120 220"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.6"
        />

        {/* Faze pe spirală */}
        {PHASES.map((phase, i) => {
          const angle = (i * 90 - 90) * Math.PI / 180
          const radius = 155 - i * 15
          const x = 200 + Math.cos(angle) * radius
          const y = 200 + Math.sin(angle) * radius
          const isActive = i === currentPhaseIndex
          const isPast = i < currentPhaseIndex

          return (
            <g key={phase.key}>
              {/* Linie de conectare la centru */}
              <line x1="200" y1="200" x2={x} y2={y} stroke={phase.color} strokeWidth="0.5" opacity="0.2" />

              {/* Punct fază */}
              <circle
                cx={x} cy={y} r={isActive ? 8 : 5}
                fill={isPast || isActive ? phase.color : "#E5E7EB"}
                opacity={isActive ? 1 : isPast ? 0.7 : 0.3}
                filter={isActive ? "url(#glow)" : undefined}
              >
                {isActive && (
                  <animate attributeName="r" values="7;9;7" dur="2s" repeatCount="indefinite" />
                )}
              </circle>

              {/* Label fază */}
              <text
                x={x} y={y + (i < 2 ? -14 : 18)}
                textAnchor="middle"
                className="text-[8px] font-bold"
                fill={isPast || isActive ? phase.color : "#9CA3AF"}
              >
                {phase.label}
              </text>
            </g>
          )
        })}

        {/* Centru — nucleu */}
        <circle cx="200" cy="200" r="20" fill="white" stroke="#6366F1" strokeWidth="1" opacity="0.8" />
        <text x="200" y="197" textAnchor="middle" className="text-[7px] font-bold" fill="#6366F1">
          EU
        </text>
        <text x="200" y="208" textAnchor="middle" className="text-[5px]" fill="#9CA3AF">
          evoluz
        </text>

        {/* Carduri pe spirală */}
        {CARD_POSITIONS.map(pos => {
          const card = cards.find(c => c.id === pos.id)
          const status = card?.status || "LOCKED"
          const colors = STATUS_COLORS[status]
          const isActive = status === "ACTIVE"

          return (
            <g key={pos.id} className="cursor-pointer">
              {/* Card bubble */}
              <circle
                cx={pos.cx} cy={pos.cy} r={isActive ? 24 : 20}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isActive ? 2 : 1}
                filter={isActive ? "url(#glow)" : undefined}
              >
                {isActive && (
                  <animate attributeName="stroke-opacity" values="1;0.5;1" dur="3s" repeatCount="indefinite" />
                )}
              </circle>

              {/* Card number */}
              <text
                x={pos.cx} y={pos.cy + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-bold"
                fill={colors.text}
              >
                {pos.id.replace("CARD_", "")}
              </text>

              {/* Card title (abbreviated) */}
              <text
                x={pos.cx} y={pos.cy + 34}
                textAnchor="middle"
                className="text-[6px]"
                fill={colors.text}
              >
                {card?.title?.split(" ").slice(0, 3).join(" ") || pos.id}
              </text>

              {/* Status indicator */}
              {status === "COMPLETED" && (
                <circle cx={pos.cx + 16} cy={pos.cy - 16} r="5" fill="#10B981">
                  <text x={pos.cx + 16} y={pos.cy - 14} textAnchor="middle" className="text-[6px]" fill="white">✓</text>
                </circle>
              )}
              {status === "LOCKED" && (
                <circle cx={pos.cx + 16} cy={pos.cy - 16} r="5" fill="#D1D5DB">
                  <text x={pos.cx + 16} y={pos.cy - 14} textAnchor="middle" className="text-[6px]" fill="white">🔒</text>
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legenda sub SVG */}
      <div className="flex justify-center gap-4 mt-4 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Activ
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completat
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Se deblocheaza
        </span>
      </div>

      {/* Faza curentă */}
      <div className="text-center mt-3">
        <p className="text-xs text-gray-500">
          Faza ta: <strong className="text-indigo-600">{PHASES[currentPhaseIndex]?.label || "Crisalida"}</strong>
          {" · "}Etapa {currentStage}/4
        </p>
        <p className="text-[10px] text-gray-400">{PHASES[currentPhaseIndex]?.description || ""}</p>
      </div>
    </div>
  )
}
