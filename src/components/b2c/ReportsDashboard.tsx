"use client"

import { useState } from "react"

/**
 * ReportsDashboard — Orchestrator rapoarte B2C Card 3
 *
 * Clientul vede TOTUL de la început. Fiecare raport are 3 stări:
 *   - ACTIV: date oferite + plătit → click și vede raportul
 *   - DISPONIBIL: date oferite, neplătit → preview + buton plată
 *   - INDISPONIBIL: date lipsă → ce date lipsesc + ce primește
 *
 * Principiu: cu cât oferi mai mult, cu atât afli mai mult.
 */

interface ReportConfig {
  id: string
  title: string
  description: string
  icon: string
  color: string        // gradient primary
  colorLight: string   // bg light
  colorText: string    // text
  /** Ce date sunt necesare pentru a debloca */
  requirements: Array<{
    key: string
    label: string
    met: boolean
  }>
  /** Cost în credite */
  creditCost: number
  /** Raportul e plătit? */
  paid: boolean
  /** Preview gratuit (teaser) */
  previewText: string
}

interface ReportsDashboardProps {
  /** Datele disponibile ale clientului */
  hasCV: boolean
  hasHermann: boolean
  hasMBTI: boolean
  hasMatchResult: boolean
  hasQuestionnaire: boolean
  /** Credite disponibile */
  credits: number
  /** Callback la plată */
  onPurchase: (reportId: string, cost: number) => void
  /** Callback la vizualizare raport */
  onViewReport: (reportId: string) => void
  /** Rapoarte deja plătite */
  purchasedReports: string[]
}

export default function ReportsDashboard({
  hasCV, hasHermann, hasMBTI, hasMatchResult, hasQuestionnaire,
  credits, onPurchase, onViewReport, purchasedReports,
}: ReportsDashboardProps) {

  const reports: ReportConfig[] = [
    {
      id: "compatibility-detail",
      title: "Raport detaliat compatibilitate",
      description: "Analiza aprofundata pe fiecare criteriu cu plan concret de dezvoltare personalizat",
      icon: "📊",
      color: "from-indigo-600 to-indigo-800",
      colorLight: "bg-indigo-50 border-indigo-200",
      colorText: "text-indigo-700",
      requirements: [
        { key: "cv", label: "CV incarcat", met: hasCV },
        { key: "match", label: "Cel putin un matching rulat", met: hasMatchResult },
      ],
      creditCost: 5,
      paid: purchasedReports.includes("compatibility-detail"),
      previewText: "Scorul tau general si directia pe fiecare criteriu — dar fara detalii. Vrei sa stii exact ce sa faci?",
    },
    {
      id: "interview-prep",
      title: "Consiliere interviu personalizata",
      description: "Intrebari probabile, puncte forte de evidentiat, puncte slabe de gestionat — specific pe postul ales",
      icon: "🎯",
      color: "from-violet-600 to-purple-700",
      colorLight: "bg-violet-50 border-violet-200",
      colorText: "text-violet-700",
      requirements: [
        { key: "cv", label: "CV incarcat", met: hasCV },
        { key: "match", label: "Matching rulat pe un post", met: hasMatchResult },
        { key: "hermann", label: "Profil cognitiv (Hermann)", met: hasHermann },
      ],
      creditCost: 8,
      paid: purchasedReports.includes("interview-prep"),
      previewText: "Stii ca ai puncte forte — dar stii cum sa le prezinti la interviu? Si ce intrebari sa astepti?",
    },
    {
      id: "job-selection-guide",
      title: "Ghid selectie posturi",
      description: "Criterii personalizate de prioritizare, benchmark salarial, directii de cariera recomandate",
      icon: "🧭",
      color: "from-teal-600 to-cyan-700",
      colorLight: "bg-teal-50 border-teal-200",
      colorText: "text-teal-700",
      requirements: [
        { key: "cv", label: "CV incarcat", met: hasCV },
        { key: "questionnaire", label: "Formular preferinte completat", met: hasQuestionnaire },
        { key: "hermann", label: "Profil cognitiv (Hermann)", met: hasHermann },
        { key: "mbti", label: "Profil personalitate (MBTI)", met: hasMBTI },
      ],
      creditCost: 10,
      paid: purchasedReports.includes("job-selection-guide"),
      previewText: "Cu cat ne spui mai mult, cu atat ghidul e mai precis. Ai completat totul — raportul e gata de generat.",
    },
    {
      id: "career-trends",
      title: "Proiectia tendintelor de cariera",
      description: "Unde se indreapta domeniul tau, ce competente vor conta, cum sa te pozitionezi",
      icon: "📈",
      color: "from-amber-600 to-orange-700",
      colorLight: "bg-amber-50 border-amber-200",
      colorText: "text-amber-700",
      requirements: [
        { key: "cv", label: "CV incarcat", met: hasCV },
        { key: "questionnaire", label: "Formular preferinte completat", met: hasQuestionnaire },
        { key: "match", label: "Cel putin 2 matching-uri rulate", met: hasMatchResult },
      ],
      creditCost: 8,
      paid: purchasedReports.includes("career-trends"),
      previewText: "Piata muncii se schimba. Stii incotro te indrepti — dar stii incotro se indreapta piata?",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Rapoartele tale</h2>
          <p className="text-xs text-gray-500">Cu cat oferi mai mult, cu atat afli mai mult</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Credite disponibile</p>
          <p className="text-lg font-bold text-indigo-600">{credits}</p>
        </div>
      </div>

      {reports.map(report => {
        const allRequirementsMet = report.requirements.every(r => r.met)
        const metCount = report.requirements.filter(r => r.met).length
        const totalReqs = report.requirements.length

        // Determină starea
        let state: "active" | "available" | "unavailable"
        if (report.paid && allRequirementsMet) state = "active"
        else if (allRequirementsMet) state = "available"
        else state = "unavailable"

        return (
          <div key={report.id} className={`rounded-xl border overflow-hidden transition-all ${
            state === "active" ? "border-emerald-300 bg-white shadow-sm" :
            state === "available" ? "border-indigo-200 bg-white" :
            "border-gray-200 bg-gray-50"
          }`}>
            {/* Header cu gradient */}
            <div className={`px-5 py-3 flex items-center justify-between ${
              state === "active" ? `bg-gradient-to-r ${report.color} text-white` :
              state === "available" ? report.colorLight :
              "bg-gray-100"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{report.icon}</span>
                <div>
                  <h3 className={`text-sm font-bold ${
                    state === "active" ? "text-white" :
                    state === "available" ? report.colorText :
                    "text-gray-500"
                  }`}>{report.title}</h3>
                  <p className={`text-[10px] ${
                    state === "active" ? "text-white/70" :
                    state === "available" ? "text-gray-500" :
                    "text-gray-400"
                  }`}>{report.description}</p>
                </div>
              </div>

              {/* Status badge */}
              <div className="shrink-0 ml-3">
                {state === "active" && (
                  <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
                    Disponibil
                  </span>
                )}
                {state === "available" && (
                  <span className={`text-[10px] ${report.colorText} bg-white px-2.5 py-1 rounded-full font-medium border`}>
                    {report.creditCost} credite
                  </span>
                )}
                {state === "unavailable" && (
                  <span className="text-[10px] text-gray-400 bg-white px-2.5 py-1 rounded-full font-medium border border-gray-200">
                    {metCount}/{totalReqs} conditii
                  </span>
                )}
              </div>
            </div>

            {/* Body — diferit per stare */}
            <div className="px-5 py-3">
              {state === "active" && (
                <button onClick={() => onViewReport(report.id)}
                  className={`w-full bg-gradient-to-r ${report.color} text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity`}>
                  Deschide raportul
                </button>
              )}

              {state === "available" && (
                <div>
                  <p className="text-xs text-gray-600 mb-3 italic">{report.previewText}</p>
                  <button
                    onClick={() => onPurchase(report.id, report.creditCost)}
                    disabled={credits < report.creditCost}
                    className={`w-full bg-gradient-to-r ${report.color} text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40`}>
                    {credits >= report.creditCost
                      ? `Deblocheaza (${report.creditCost} credite)`
                      : `Insuficiente credite (ai ${credits}, trebuie ${report.creditCost})`
                    }
                  </button>
                </div>
              )}

              {state === "unavailable" && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Ce mai trebuie sa oferi:</p>
                  <div className="space-y-1">
                    {report.requirements.map(req => (
                      <div key={req.key} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                          <span className="text-emerald-500 w-4 text-center">✓</span>
                        ) : (
                          <span className="text-gray-300 w-4 text-center">○</span>
                        )}
                        <span className={req.met ? "text-emerald-600" : "text-gray-500"}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Completeaza conditiile si raportul devine disponibil.
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
