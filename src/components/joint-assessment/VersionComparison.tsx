"use client"

import { useState } from "react"

// ── Tipuri ──────────────────────────────────────────────────

export interface ReportVersion {
  version: number
  label: string
  createdAt: string
  createdBy: string
  gapProcent: number
  chapters: Record<string, string>
  signatures: {
    memberId: string
    memberName: string
    signedAt: string
  }[]
}

interface Props {
  versions: ReportVersion[]
  currentVersion: number
}

// ── Componenta ──────────────────────────────────────────────

export default function VersionComparison({ versions, currentVersion }: Props) {
  const [leftVersion, setLeftVersion] = useState(1)
  const [rightVersion, setRightVersion] = useState(currentVersion)

  const left = versions.find((v) => v.version === leftVersion)
  const right = versions.find((v) => v.version === rightVersion)

  if (versions.length < 2) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">V1</div>
        <h3 className="text-sm font-semibold text-gray-800">
          Versiune unica disponibila
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          La urmatorul ciclu de monitorizare va fi creata versiunea V2 pentru
          comparatie.
        </p>
        {versions[0] && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500">Gap initial:</span>
            <span className="text-sm font-bold text-red-600">
              {versions[0].gapProcent.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    )
  }

  // Capitolele din ambele versiuni
  const allChapterIds = [
    ...new Set([
      ...Object.keys(left?.chapters ?? {}),
      ...Object.keys(right?.chapters ?? {}),
    ]),
  ]

  const gapDelta = right && left ? right.gapProcent - left.gapProcent : 0

  return (
    <div className="space-y-4">
      {/* Selector versiuni */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Referinta:</label>
          <select
            value={leftVersion}
            onChange={(e) => setLeftVersion(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-violet-500"
          >
            {versions.map((v) => (
              <option key={v.version} value={v.version}>
                V{v.version} — {v.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-gray-400">vs</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Actual:</label>
          <select
            value={rightVersion}
            onChange={(e) => setRightVersion(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-violet-500"
          >
            {versions.map((v) => (
              <option key={v.version} value={v.version}>
                V{v.version} — {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gap comparison */}
      {left && right && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">
              V{left.version} — Gap
            </div>
            <div className="text-xl font-bold text-gray-900">
              {left.gapProcent.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Variatie</div>
            <div
              className={`text-xl font-bold ${
                gapDelta < 0
                  ? "text-green-600"
                  : gapDelta > 0
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {gapDelta > 0 ? "+" : ""}
              {gapDelta.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">
              V{right.version} — Gap
            </div>
            <div
              className={`text-xl font-bold ${
                right.gapProcent <= 5 ? "text-green-600" : "text-red-600"
              }`}
            >
              {right.gapProcent.toFixed(1)}%
            </div>
            {right.gapProcent <= 5 && (
              <div className="text-xs text-green-600 mt-1">Sub pragul de 5%</div>
            )}
          </div>
        </div>
      )}

      {/* Diff capitole */}
      {left && right && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase">
            Comparatie capitole
          </h4>
          {allChapterIds.map((chId) => {
            const leftContent = left.chapters[chId] ?? ""
            const rightContent = right.chapters[chId] ?? ""
            const changed = leftContent !== rightContent

            return (
              <div
                key={chId}
                className={`border rounded-lg overflow-hidden ${
                  changed
                    ? "border-amber-200"
                    : "border-gray-200"
                }`}
              >
                <div
                  className={`px-4 py-2 text-xs font-medium flex items-center justify-between ${
                    changed
                      ? "bg-amber-50 text-amber-700"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  <span className="capitalize">
                    {chId.replace(/-/g, " ")}
                  </span>
                  {changed ? (
                    <span className="text-amber-600">Modificat</span>
                  ) : (
                    <span className="text-gray-400">Neschimbat</span>
                  )}
                </div>
                {changed && (
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        V{left.version}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {leftContent || (
                          <span className="italic text-gray-300">Gol</span>
                        )}
                      </p>
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        V{right.version}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {rightContent || (
                          <span className="italic text-gray-300">Gol</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Semnaturi per versiune */}
      {left && right && (
        <div className="grid grid-cols-2 gap-4">
          {[left, right].map((v) => (
            <div key={v.version} className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Semnaturi V{v.version}
              </h5>
              {v.signatures.length === 0 ? (
                <p className="text-xs text-gray-400">Nicio semnatura</p>
              ) : (
                <div className="space-y-1">
                  {v.signatures.map((s, i) => (
                    <div key={i} className="text-xs text-gray-600 flex justify-between">
                      <span className="font-medium">{s.memberName}</span>
                      <span className="text-gray-400">
                        {new Date(s.signedAt).toLocaleDateString("ro-RO")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
