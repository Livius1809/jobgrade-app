"use client"

/**
 * MasterReportDualView — Master Report cu layer-e per rol
 *
 * Același document Master Report, dar afișat diferit per rol:
 * - CEO: impact business, decizii strategice, cost
 * - HR Director: operațional, conformitate, acțiuni
 * - CFO: buget, ROI, scenarii financiare
 * - Consultant: inferențe complete
 *
 * Folosește DualView infrastructure din narrative-profile.
 */

import { useState } from "react"
import type { ViewerRole, RoleLayerConfig } from "@/lib/cpu/profilers/narrative-profile"
import { ROLE_LAYER_CONFIGS } from "@/lib/cpu/profilers/narrative-profile"

interface MasterReportSection {
  id: string
  title: string
  content: string               // Markdown/HTML narativ
  /** Informatii per rol */
  roleOverlays: Partial<Record<ViewerRole, RoleOverlay>>
}

interface RoleOverlay {
  /** Ce vede acest rol în lateral pentru această secțiune */
  sideContent: string
  /** Highlight-uri specifice rolului */
  highlights: string[]
  /** Acțiuni recomandate per rol */
  actions?: string[]
  /** Impact financiar (pentru CFO) */
  financialImpact?: { amount: number; type: "COST" | "SAVING" | "INVESTMENT" }
}

interface MasterReportDualViewProps {
  sections: MasterReportSection[]
  /** Rolul curent al vizualizatorului */
  currentRole: ViewerRole
  /** Permite switch între roluri? (consultant/owner pot) */
  canSwitchRole: boolean
  /** Organizația */
  organizationName: string
}

export function MasterReportDualView({
  sections,
  currentRole,
  canSwitchRole,
  organizationName,
}: MasterReportDualViewProps) {
  const [activeRole, setActiveRole] = useState<ViewerRole>(currentRole)
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "")

  const roleConfig = ROLE_LAYER_CONFIGS[activeRole]

  // Roles available for switching
  const switchableRoles: ViewerRole[] = ["CEO", "HR_DIRECTOR", "CFO", "CONSULTANT"]

  const currentSection = sections.find((s) => s.id === activeSection)
  const currentOverlay = currentSection?.roleOverlays[activeRole]

  return (
    <div className="flex flex-col h-full">
      {/* Header: rol selector + navigare */}
      <header className="border-b p-3 flex items-center justify-between bg-muted/20">
        <div>
          <h1 className="text-lg font-semibold">Master Report — {organizationName}</h1>
          <p className="text-xs text-muted-foreground">
            Vizualizare: {roleConfig.label}
          </p>
        </div>

        {/* Role switcher */}
        {canSwitchRole && (
          <div className="flex gap-1">
            {switchableRoles.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeRole === role
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {ROLE_LAYER_CONFIGS[role].label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Section navigation */}
        <nav className="w-48 border-r overflow-y-auto p-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 text-xs rounded-md mb-1 transition-colors ${
                activeSection === section.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {section.title}
            </button>
          ))}
        </nav>

        {/* CENTER: Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentSection && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold mb-4">{currentSection.title}</h2>
              <div
                className="prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: currentSection.content }}
              />
            </div>
          )}
        </main>

        {/* RIGHT: Role overlay panel */}
        {currentOverlay && (
          <aside className="w-80 border-l bg-slate-50 dark:bg-slate-900 overflow-y-auto p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              {roleConfig.sidePanel === "IMPACT" && "Impact business"}
              {roleConfig.sidePanel === "ACTIONS" && "Acțiuni"}
              {roleConfig.sidePanel === "BUDGET" && "Impact bugetar"}
              {roleConfig.sidePanel === "INFERENCE" && "Detalii tehnice"}
            </div>

            <div className="space-y-4">
              {/* Side content */}
              <p className="text-xs leading-relaxed">{currentOverlay.sideContent}</p>

              {/* Highlights */}
              {currentOverlay.highlights.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Puncte cheie
                  </span>
                  <ul className="mt-1 space-y-1">
                    {currentOverlay.highlights.map((h, i) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <span className="text-primary">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {currentOverlay.actions && currentOverlay.actions.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Acțiuni recomandate
                  </span>
                  <ul className="mt-1 space-y-1">
                    {currentOverlay.actions.map((a, i) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <span className="text-emerald-500">→</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Financial impact (CFO) */}
              {currentOverlay.financialImpact && (
                <div className="p-3 rounded-md bg-muted/50 border">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Impact financiar
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      currentOverlay.financialImpact.type === "SAVING"
                        ? "text-emerald-600"
                        : currentOverlay.financialImpact.type === "COST"
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}>
                      {currentOverlay.financialImpact.type === "SAVING" ? "-" : "+"}
                      {currentOverlay.financialImpact.amount.toLocaleString("ro-RO")} RON
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      /{currentOverlay.financialImpact.type === "INVESTMENT" ? "investiție" : "an"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
