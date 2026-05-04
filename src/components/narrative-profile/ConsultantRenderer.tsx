"use client"

/**
 * ConsultantRenderer — Ce vede consultantul (layer inferențial)
 *
 * Pentru fiecare afirmație activă:
 * - Surse (instrumente + scale + scoruri)
 * - Compoziție (cum interacționează)
 * - Mecanism inferențial (logica date → concluzie)
 * - Convergență (câte surse confirmă)
 * - Note consultant (atenționări, reframing)
 */

import type {
  NarrativeSection,
  NarrativeStatement,
  InferenceBlock,
  ScaleReference,
  RoleLayerConfig,
} from "@/lib/cpu/profilers/narrative-profile"

type PanelType = RoleLayerConfig["sidePanel"]
type ExtraInfoType = RoleLayerConfig["extraInfo"][number]

interface ConsultantRendererProps {
  sections: NarrativeSection[]
  activeStatementId: string | null
  panelType?: PanelType
  extraInfo?: ExtraInfoType[]
}

export function ConsultantRenderer({ sections, activeStatementId, panelType = "INFERENCE", extraInfo = [] }: ConsultantRendererProps) {
  // Find active statement
  let activeStatement: NarrativeStatement | null = null
  for (const section of sections) {
    const found = section.statements.find((s) => s.id === activeStatementId)
    if (found) {
      activeStatement = found
      break
    }
  }

  if (!activeStatement?.inference) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Scrolează prin raport — inferențele apar aici automat.
      </div>
    )
  }

  return <InferencePanel inference={activeStatement.inference} />
}

// ═══════════════════════════════════════════════════════════════
// INFERENCE PANEL — blocul detaliat per afirmație
// ═══════════════════════════════════════════════════════════════

function InferencePanel({ inference }: { inference: InferenceBlock }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Convergence badge */}
      <div className="flex items-center gap-2">
        <ConvergenceBadge level={inference.convergence} />
        <span className="text-xs text-muted-foreground">
          {inference.convergence} {inference.convergence === 1 ? "sursă" : "surse convergente"}
        </span>
      </div>

      {/* SURSE */}
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Surse
        </h4>
        <div className="space-y-1.5">
          {inference.sources.map((source) => (
            <SourceLine key={`${source.instrumentId}-${source.scaleName}`} source={source} />
          ))}
        </div>
      </div>

      {/* COMPOZIȚIE */}
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
          Compoziție
        </h4>
        <p className="text-xs leading-relaxed">{inference.composition}</p>
      </div>

      {/* MECANISM INFERENȚIAL */}
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
          Mecanism
        </h4>
        <p className="text-xs leading-relaxed font-mono bg-muted/50 p-2 rounded">
          {inference.mechanism}
        </p>
      </div>

      {/* NOTE CONSULTANT */}
      {inference.consultantNotes && (
        <div className="border-l-2 border-amber-400 pl-3 py-1">
          <h4 className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1">
            ⚠️ Atenție în feedback
          </h4>
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            {inference.consultantNotes}
          </p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SOURCE LINE — o scală cu scor + nivel
// ═══════════════════════════════════════════════════════════════

function SourceLine({ source }: { source: ScaleReference }) {
  const levelColors: Record<string, string> = {
    FOARTE_SCAZUT: "text-red-600 bg-red-50",
    SCAZUT: "text-orange-600 bg-orange-50",
    MEDIU: "text-gray-600 bg-gray-100",
    RIDICAT: "text-emerald-600 bg-emerald-50",
    FOARTE_RIDICAT: "text-emerald-700 bg-emerald-100",
  }

  const colorClass = levelColors[source.level] || "text-gray-600 bg-gray-100"

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Instrument badge */}
      <span className="font-mono text-[10px] w-14 text-muted-foreground">
        {source.instrumentId.toUpperCase()}
      </span>

      {/* Scale name */}
      <span className="flex-1 truncate">{source.scaleName}</span>

      {/* T-score */}
      <span className="font-mono font-medium w-8 text-right">
        T={source.normalizedT}
      </span>

      {/* Percentile */}
      <span className="font-mono text-[10px] text-muted-foreground w-8">
        p{source.percentile}
      </span>

      {/* Level badge */}
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}>
        {source.level.replace("_", " ")}
      </span>

      {/* Inverse marker */}
      {source.isInverse && (
        <span className="text-[9px] text-red-500" title="Scala inversă — scor mare = risc">
          ⟲
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CONVERGENCE BADGE
// ═══════════════════════════════════════════════════════════════

function ConvergenceBadge({ level }: { level: number }) {
  const colors = [
    "bg-red-100 text-red-700",      // 1 — weak
    "bg-orange-100 text-orange-700", // 2 — moderate
    "bg-yellow-100 text-yellow-700", // 3 — good
    "bg-emerald-100 text-emerald-700", // 4 — strong
    "bg-emerald-200 text-emerald-800", // 5 — very strong
  ]

  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[level - 1] || colors[0]}`}>
      C{level}
    </span>
  )
}
