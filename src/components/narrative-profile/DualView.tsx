"use client"

/**
 * DualView — Componenta principală pentru sesiunea de feedback narativ
 *
 * Layout dual: consultant (stânga) | subiect (dreapta)
 * Scroll sincronizat: ambii văd același paragraf activ
 * Moduri: LIVE (sesiune video) | ASYNC (MBook HTML individual)
 *
 * ⚠️ Narațiunea finală se calibrează după încărcarea manualelor testelor.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  NarrativeDocument,
  NarrativeSection,
  NarrativeStatement,
  DualViewSession,
  ViewerRole,
  RoleLayerConfig,
} from "@/lib/cpu/profilers/narrative-profile"
import { ROLE_LAYER_CONFIGS } from "@/lib/cpu/profilers/narrative-profile"
import { ConsultantRenderer } from "./ConsultantRenderer"
import { SubjectRenderer } from "./SubjectRenderer"
import { SimulatorPanel } from "./SimulatorPanel"

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface DualViewProps {
  document: NarrativeDocument
  session?: DualViewSession
  /** Rolul vizualizatorului curent */
  viewerRole: ViewerRole
  /** Mod de afișare */
  mode: "LIVE" | "ASYNC"
  /** Callback scroll sync (pentru WebSocket în modul LIVE) */
  onScrollSync?: (statementId: string) => void
  /** Callback la completarea sesiunii */
  onSessionComplete?: (outcome: DualViewSession["outcome"]) => void
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DualView({
  document,
  session,
  viewerRole,
  mode,
  onScrollSync,
  onSessionComplete,
}: DualViewProps) {
  const [activeStatementId, setActiveStatementId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<number>(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const statementRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Role-based layer configuration
  const roleConfig = ROLE_LAYER_CONFIGS[viewerRole]

  // Filter sections based on role visibility
  const visibleSections = roleConfig.visibleSections === "ALL"
    ? document.sections
    : document.sections.filter((s) => (roleConfig.visibleSections as string[]).includes(s.id))

  // Determine side panel visibility
  const showSidePanel = roleConfig.sidePanel !== "NONE"

  // ─── Scroll sync logic ───
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const containerRect = container.getBoundingClientRect()
    const centerY = containerRect.top + containerRect.height / 2

    // Find which statement is closest to center of viewport
    let closestId: string | null = null
    let closestDistance = Infinity

    statementRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect()
      const distance = Math.abs(rect.top + rect.height / 2 - centerY)
      if (distance < closestDistance) {
        closestDistance = distance
        closestId = id
      }
    })

    if (closestId && closestId !== activeStatementId) {
      setActiveStatementId(closestId)
      onScrollSync?.(closestId)
    }
  }, [activeStatementId, onScrollSync])

  // ─── External scroll sync (from WebSocket in LIVE mode) ───
  const scrollToStatement = useCallback((statementId: string) => {
    const el = statementRefs.current.get(statementId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      setActiveStatementId(statementId)
    }
  }, [])

  // ─── Register statement ref ───
  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      statementRefs.current.set(id, el)
    } else {
      statementRefs.current.delete(id)
    }
  }, [])

  // ─── Navigation (only visible sections per role) ───
  const sectionNav = visibleSections.map((s, i) => ({
    id: s.id,
    title: s.title,
    order: s.order,
    isActive: i === activeSection,
  }))

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header: navigare secțiuni ─── */}
      <nav className="flex gap-1 p-2 border-b bg-muted/30 overflow-x-auto">
        {sectionNav.map((nav, i) => (
          <button
            key={nav.id}
            onClick={() => {
              setActiveSection(i)
              const firstStatement = document.sections[i]?.statements[0]
              if (firstStatement) scrollToStatement(firstStatement.id)
            }}
            className={`
              px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors
              ${nav.isActive
                ? "bg-primary text-primary-foreground font-medium"
                : "hover:bg-muted text-muted-foreground"
              }
            `}
          >
            {nav.order}. {nav.title}
          </button>
        ))}
      </nav>

      {/* ─── Body: dual view ─── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── LEFT: Side Panel (per role config) ─── */}
        {showSidePanel && (
          <aside className="w-[420px] border-r bg-slate-50 dark:bg-slate-900 overflow-y-auto p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              {roleConfig.sidePanel === "INFERENCE" && "Layer inferențial"}
              {roleConfig.sidePanel === "ACTIONS" && "Acțiuni recomandate"}
              {roleConfig.sidePanel === "IMPACT" && "Impact business"}
              {roleConfig.sidePanel === "BUDGET" && "Impact bugetar"}
            </div>
            <ConsultantRenderer
              sections={visibleSections}
              activeStatementId={activeStatementId}
              panelType={roleConfig.sidePanel}
              extraInfo={roleConfig.extraInfo}
            />
          </aside>
        )}

        {/* ─── CENTER/RIGHT: Subject Layer (narațiune) ─── */}
        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-2xl mx-auto py-8 px-6">
            {visibleSections.map((section) => (
              <SectionBlock
                key={section.id}
                section={section}
                activeStatementId={activeStatementId}
                viewerRole={viewerRole}
                mode={mode}
                registerRef={registerRef}
                inferenceDepth={roleConfig.inferenceDepth}
              />
            ))}

            {/* ─── Simulator (secțiunea 9, doar dacă rolul permite) ─── */}
            {roleConfig.canSimulate && (
              <SimulatorPanel
                config={document.simulator}
                scope={document.scope}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION BLOCK
// ═══════════════════════════════════════════════════════════════

interface SectionBlockProps {
  section: NarrativeSection
  activeStatementId: string | null
  viewerRole: ViewerRole
  mode: "LIVE" | "ASYNC"
  registerRef: (id: string, el: HTMLDivElement | null) => void
  inferenceDepth: RoleLayerConfig["inferenceDepth"]
}

function SectionBlock({ section, activeStatementId, viewerRole, mode, registerRef, inferenceDepth }: SectionBlockProps) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-1">{section.title}</h2>
      {section.subtitle && (
        <p className="text-sm text-muted-foreground mb-6">{section.subtitle}</p>
      )}

      <div className="space-y-4">
        {section.statements.map((statement) => (
          <StatementBlock
            key={statement.id}
            statement={statement}
            isActive={activeStatementId === statement.id}
            viewerRole={viewerRole}
            mode={mode}
            registerRef={registerRef}
          />
        ))}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// STATEMENT BLOCK (unitatea atomică)
// ═══════════════════════════════════════════════════════════════

interface StatementBlockProps {
  statement: NarrativeStatement
  isActive: boolean
  viewerRole: ViewerRole
  mode: "LIVE" | "ASYNC"
  registerRef: (id: string, el: HTMLDivElement | null) => void
  inferenceDepth?: RoleLayerConfig["inferenceDepth"]
}

function StatementBlock({ statement, isActive, viewerRole, mode, registerRef }: StatementBlockProps) {
  const [expanded, setExpanded] = useState(false)

  // Registru vizual markers
  const registerStyles: Record<string, string> = {
    CALAUZA: "border-l-emerald-500",
    OGLINDA: "border-l-blue-500",
    POVESTE: "border-l-amber-500",
  }

  const registerLabels: Record<string, string> = {
    CALAUZA: "Călăuză",
    OGLINDA: "Oglindă",
    POVESTE: "Poveste",
  }

  return (
    <div
      ref={(el) => registerRef(statement.id, el)}
      className={`
        border-l-4 pl-4 py-2 transition-all duration-200
        ${registerStyles[statement.register] || "border-l-gray-300"}
        ${isActive ? "bg-primary/5 ring-1 ring-primary/20 rounded-r-md" : ""}
      `}
    >
      {/* Register label */}
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {registerLabels[statement.register]}
      </span>

      {/* Narration text */}
      <p className="mt-1 text-base leading-relaxed">{statement.text}</p>

      {/* Expandable detail (async mode — subiect vede scale/poziții) */}
      {mode === "ASYNC" && statement.expandable && statement.inference && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {expanded ? "▾" : "▸"} De unde știm asta
          </button>

          {expanded && (
            <SubjectRenderer inference={statement.inference} />
          )}
        </div>
      )}

      {/* Live mode: subiect vede detalii automat când e activ */}
      {mode === "LIVE" && isActive && statement.inference && viewerRole === "SUBJECT" && (
        <div className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <SubjectRenderer inference={statement.inference} />
        </div>
      )}
    </div>
  )
}
