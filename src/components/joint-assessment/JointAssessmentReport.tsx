"use client"

import { useState } from "react"

// ── Tipuri ──────────────────────────────────────────────────

export interface ReportChapter {
  id: string
  title: string
  description: string
  content: string
  aiSuggestion?: string
}

export interface GapCategory {
  categorie: string
  tipDecalaj: "M-F" | "F-M" | "M-M" | "F-F"
  gapProcent: number
  angajatiVizati: number
  justificariExistente?: string
}

interface Props {
  chapters: ReportChapter[]
  categories: GapCategory[]
  readOnly?: boolean
  onUpdateChapter?: (chapterId: string, content: string) => void
}

// ── Constante ───────────────────────────────────────────────

const CHAPTER_DEFINITIONS: { id: string; title: string; description: string }[] = [
  {
    id: "constatare",
    title: "1. Constatare",
    description: "Categorii afectate, dimensiune decalaj, angajati vizati",
  },
  {
    id: "analiza-cauze",
    title: "2. Analiza cauze",
    description: "Cauze identificate per categorie (vechime, competente, piata etc.)",
  },
  {
    id: "justificari",
    title: "3. Justificari obiective",
    description: "Ce diferente sunt justificate si de ce",
  },
  {
    id: "diferente-nejustificate",
    title: "4. Diferente nejustificate",
    description: "Ce trebuie corectat",
  },
  {
    id: "plan-corectie",
    title: "5. Plan de corectie",
    description: "Masuri concrete, responsabili, termene, buget",
  },
  {
    id: "monitorizare",
    title: "6. Monitorizare",
    description: "Indicatori, frecventa verificare, termen legal (6 luni)",
  },
]

const GAP_TYPE_COLORS: Record<string, string> = {
  "M-F": "bg-red-100 text-red-700",
  "F-M": "bg-orange-100 text-orange-700",
  "M-M": "bg-blue-100 text-blue-700",
  "F-F": "bg-purple-100 text-purple-700",
}

const GAP_TYPE_LABELS: Record<string, string> = {
  "M-F": "Barbati castiga mai mult",
  "F-M": "Femei castiga mai mult",
  "M-M": "Decalaj intra-gen (M)",
  "F-F": "Decalaj intra-gen (F)",
}

// ── Componenta ──────────────────────────────────────────────

export default function JointAssessmentReport({
  chapters,
  categories,
  readOnly = false,
  onUpdateChapter,
}: Props) {
  const [activeChapter, setActiveChapter] = useState(CHAPTER_DEFINITIONS[0].id)
  const [editingContent, setEditingContent] = useState<Record<string, string>>({})

  const getChapter = (id: string): ReportChapter | undefined =>
    chapters.find((c) => c.id === id)

  const getContent = (id: string): string =>
    editingContent[id] ?? getChapter(id)?.content ?? ""

  const handleSaveChapter = (chapterId: string) => {
    const content = editingContent[chapterId]
    if (content !== undefined && onUpdateChapter) {
      onUpdateChapter(chapterId, content)
    }
  }

  return (
    <div className="space-y-6">
      {/* Categorii cu decalaj */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
          Categorii cu decalaj {">"}5%
        </h3>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400">Nicio categorie identificata.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((cat, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {cat.categorie}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      GAP_TYPE_COLORS[cat.tipDecalaj] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {cat.tipDecalaj}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Gap:{" "}
                    <span className="font-bold text-red-600">
                      {cat.gapProcent.toFixed(1)}%
                    </span>
                  </span>
                  <span>{cat.angajatiVizati} angajati vizati</span>
                </div>
                <p className="text-xs text-gray-400">
                  {GAP_TYPE_LABELS[cat.tipDecalaj] ?? cat.tipDecalaj}
                </p>
                {cat.justificariExistente && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 mt-1">
                    <span className="font-medium">Justificari existente:</span>{" "}
                    {cat.justificariExistente}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capitole raport */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
          Raport preliminar — Capitole
        </h3>

        {/* Tabs capitole */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 overflow-x-auto">
          {CHAPTER_DEFINITIONS.map((ch) => {
            const hasContent = !!getChapter(ch.id)?.content
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`flex-shrink-0 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
                  activeChapter === ch.id
                    ? "bg-white text-gray-900 font-medium shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {ch.title}
                {hasContent && (
                  <span className="ml-1.5 w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                )}
              </button>
            )
          })}
        </div>

        {/* Conținut capitol activ */}
        {CHAPTER_DEFINITIONS.map((ch) => {
          if (ch.id !== activeChapter) return null
          const chapter = getChapter(ch.id)
          const content = getContent(ch.id)

          return (
            <div
              key={ch.id}
              className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
            >
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{ch.title}</h4>
                <p className="text-sm text-gray-500 mt-1">{ch.description}</p>
              </div>

              {/* Sugestie AI */}
              {chapter?.aiSuggestion && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-700 mb-1">
                    Sugestie AI Mediator
                  </div>
                  <p className="text-sm text-purple-900">{chapter.aiSuggestion}</p>
                </div>
              )}

              {readOnly ? (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {content || (
                    <span className="text-gray-400 italic">
                      Acest capitol nu a fost completat.
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    value={content}
                    onChange={(e) =>
                      setEditingContent((prev) => ({
                        ...prev,
                        [ch.id]: e.target.value,
                      }))
                    }
                    rows={8}
                    placeholder={`Completati ${ch.title.toLowerCase()}...`}
                    className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSaveChapter(ch.id)}
                      disabled={editingContent[ch.id] === undefined}
                      className="px-4 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                      Salveaza capitol
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { CHAPTER_DEFINITIONS }
