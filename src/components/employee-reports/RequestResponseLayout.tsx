"use client"

/**
 * Layout 3.1a — Raport răspuns la solicitare angajat (Art. 7)
 *
 * Structura: header cerere + secțiuni răspuns + semnătură + termen legal
 * Folosit atât pentru afișare HTML cât și pentru export PDF
 */

interface ResponseSection {
  category: string
  title: string
  content: string
  editable?: boolean
}

interface RequestData {
  id: string
  requestedBy: string
  requestEmail: string
  requestType: string
  requestDetails: string
  status: string
  dueDate: string
  createdAt: string
  respondedAt?: string | null
  respondedBy?: string | null
  response?: string | null
  salaryGradeName?: string | null
}

export default function RequestResponseLayout({
  request,
  sections,
  companyName,
  respondentName,
}: {
  request: RequestData
  sections: ResponseSection[]
  companyName: string
  respondentName?: string
}) {
  const isOverdue = new Date(request.dueDate) < new Date() && request.status !== "RESPONDED"
  const daysLeft = Math.ceil(
    (new Date(request.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="max-w-3xl mx-auto bg-white" id="request-response-pdf">
      {/* ── Antet oficial ────────────────────────────── */}
      <div className="border-b-2 border-indigo-600 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Raspuns la solicitarea de informatii salariale
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              In temeiul Directivei (UE) 2023/970, Art. 7
            </p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="font-medium text-gray-800">{companyName}</p>
            <p>Nr. ref: {request.id.slice(-8).toUpperCase()}</p>
            <p>
              Data:{" "}
              {request.respondedAt
                ? new Date(request.respondedAt).toLocaleDateString("ro-RO")
                : new Date().toLocaleDateString("ro-RO")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Detalii solicitare ───────────────────────── */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Solicitarea depusa</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">Solicitant:</span>
            <span className="ml-2 text-gray-800 font-medium">{request.requestedBy}</span>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <span className="ml-2 text-gray-800">{request.requestEmail}</span>
          </div>
          <div>
            <span className="text-gray-500">Tip cerere:</span>
            <span className="ml-2 text-gray-800">
              {request.requestType === "ART7" ? "Art. 7 — Informatii salariale" : request.requestType}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Data depunerii:</span>
            <span className="ml-2 text-gray-800">
              {new Date(request.createdAt).toLocaleDateString("ro-RO")}
            </span>
          </div>
          {request.salaryGradeName && (
            <div className="col-span-2">
              <span className="text-gray-500">Clasa salariala:</span>
              <span className="ml-2 text-gray-800 font-medium">{request.salaryGradeName}</span>
            </div>
          )}
          <div className="col-span-2 mt-2">
            <span className="text-gray-500">Detalii:</span>
            <p className="mt-1 text-gray-700 bg-white rounded p-2 border border-gray-200 text-sm">
              {request.requestDetails}
            </p>
          </div>
        </div>
      </div>

      {/* ── Termen legal ─────────────────────────────── */}
      <div className={`rounded-lg p-3 mb-6 flex items-center gap-2 text-sm ${
        isOverdue
          ? "bg-red-50 text-red-700 border border-red-200"
          : daysLeft <= 7
            ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
            : "bg-green-50 text-green-700 border border-green-200"
      }`}>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {isOverdue ? (
          <span>Termen depasit. Raspunsul trebuia furnizat pana la {new Date(request.dueDate).toLocaleDateString("ro-RO")}.</span>
        ) : (
          <span>
            Termen legal: {new Date(request.dueDate).toLocaleDateString("ro-RO")}
            {daysLeft > 0 && ` (${daysLeft} zile ramase)`}
          </span>
        )}
      </div>

      {/* ── Secțiuni răspuns ──────────────────────────── */}
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                {idx + 1}
              </span>
              <h3 className="text-base font-semibold text-gray-800">{section.title}</h3>
            </div>
            <div className="ml-8 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {section.content}
            </div>
            <div className="ml-8 mt-1">
              <span className="text-xs text-gray-400 italic">
                Categorie: {section.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Nota legala ──────────────────────────────── */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 leading-relaxed">
          Informatiile din prezentul document sunt furnizate in conformitate cu
          Directiva (UE) 2023/970 privind transparenta salariala, Art. 7.
          Angajatorul are obligatia de a raspunde in termen de 2 luni de la
          data depunerii solicitarii. Datele furnizate sunt anonimizate conform
          cerintelor legale si nu permit identificarea individuala a altor angajati.
        </p>
      </div>

      {/* ── Semnatura ────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div className="text-sm">
          <p className="text-gray-500 text-xs mb-1">Intocmit de:</p>
          <p className="font-medium text-gray-800">{respondentName || "Departamentul HR"}</p>
          <p className="text-gray-500">{companyName}</p>
          <div className="mt-4 border-t border-gray-300 pt-2 w-48">
            <p className="text-xs text-gray-400">Semnatura / Stampila</p>
          </div>
        </div>
        <div className="text-sm text-right">
          <p className="text-gray-500 text-xs mb-1">Data emiterii:</p>
          <p className="font-medium text-gray-800">
            {request.respondedAt
              ? new Date(request.respondedAt).toLocaleDateString("ro-RO")
              : "___.___.______"}
          </p>
        </div>
      </div>
    </div>
  )
}
