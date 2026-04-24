"use client"

import { useState } from "react"

interface JobListing {
  id: string
  title: string
  code: string | null
  department: string | null
  purpose: string | null
  description: string | null
  responsibilities: string | null
  requirements: string | null
  salaryGrade: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string
}

interface Props {
  listings: JobListing[]
  companyName: string
  portalSlug: string
}

export default function JobListingsClient({ listings, companyName, portalSlug }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = searchTerm
    ? listings.filter(
        (l) =>
          l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : listings

  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">—</div>
        <h3 className="text-lg font-semibold text-gray-800">
          Niciun post disponibil momentan
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          Revizitati pagina ulterior pentru noi oportunitati.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cautati dupa titlu, departament sau cod..."
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <span className="absolute right-4 top-3.5 text-xs text-gray-400">
          {filtered.length} posturi
        </span>
      </div>

      {/* Salary history notice — Art. 5.2 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
        <strong>Art. 5.2:</strong> {companyName} nu solicita informatii despre salariul
        dvs. anterior sau actual de la alti angajatori. Nivelul de remunerare este
        stabilit exclusiv pe baza criteriilor obiective ale postului.
      </div>

      {/* Listings */}
      <div className="space-y-3">
        {filtered.map((job) => {
          const isExpanded = expandedId === job.id
          const hasSalary = job.salaryMin !== null || job.salaryMax !== null

          return (
            <div
              key={job.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-violet-300 transition-colors"
            >
              {/* Header */}
              <div
                className="px-6 py-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : job.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {job.department && <span>{job.department}</span>}
                      {job.code && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                          {job.code}
                        </span>
                      )}
                      {job.salaryGrade && (
                        <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-medium">
                          {job.salaryGrade}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Salary band — Art. 5.1 */}
                  <div className="text-right shrink-0">
                    {hasSalary ? (
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {job.salaryMin?.toLocaleString("ro-RO")} –{" "}
                          {job.salaryMax?.toLocaleString("ro-RO")} {job.currency}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Interval salarial brut lunar (Art. 5.1)
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Interval in curs de definire
                      </span>
                    )}
                  </div>
                </div>

                {job.purpose && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {job.purpose}
                  </p>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
                  {job.description && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Descriere post
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {job.description}
                      </p>
                    </div>
                  )}

                  {job.responsibilities && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Responsabilitati
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {job.responsibilities}
                      </p>
                    </div>
                  )}

                  {job.requirements && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Cerinte
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {job.requirements}
                      </p>
                    </div>
                  )}

                  {/* Salary transparency box */}
                  {hasSalary && (
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-violet-700 uppercase mb-2">
                        Informatii salariale (Art. 5.1)
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-violet-600 text-xs">Minim brut lunar</span>
                          <div className="font-bold text-gray-900">
                            {job.salaryMin?.toLocaleString("ro-RO")} {job.currency}
                          </div>
                        </div>
                        <div>
                          <span className="text-violet-600 text-xs">Maxim brut lunar</span>
                          <div className="font-bold text-gray-900">
                            {job.salaryMax?.toLocaleString("ro-RO")} {job.currency}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-violet-600 mt-3">
                        Nivelul exact de remunerare se stabileste pe baza criteriilor
                        obiective: complexitate, responsabilitati, competente necesare,
                        conditii de munca. Criteriile sunt neutre din perspectiva genului.
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex gap-3 pt-2">
                    <a
                      href={`/portal/${portalSlug}`}
                      className="text-sm text-violet-600 hover:text-violet-800 transition-colors"
                    >
                      Solicita informatii salariale (Art. 7) →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
