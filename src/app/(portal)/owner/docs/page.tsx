"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface DocEntry {
  title: string
  agents: string[]
  agentCount: number
  chunks: number
  createdAt: string
  tags: string[]
  sourceType?: string
}

type InputMode = "text" | "upload" | "reference" | "bibliography"

export default function DocsPage() {
  const [documents, setDocuments] = useState<DocEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>("text")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  // Comun
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [sourceType, setSourceType] = useState("carte")
  const [tags, setTags] = useState("")
  const [targetAgents, setTargetAgents] = useState("")

  // Text paste
  const [content, setContent] = useState("")

  // Upload
  const [file, setFile] = useState<File | null>(null)

  // Referință bibliografică
  const [publisher, setPublisher] = useState("")
  const [year, setYear] = useState("")
  const [focusTopics, setFocusTopics] = useState("")
  const [targetEntries, setTargetEntries] = useState("30")

  // Rezultat ingestie
  const [ingestResult, setIngestResult] = useState<any>(null)

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/docs")
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch { setDocuments([]) }
    setLoading(false)
  }

  function resetForm() {
    setTitle(""); setAuthor(""); setContent(""); setTags("")
    setTargetAgents(""); setFile(null); setPublisher("")
    setYear(""); setFocusTopics(""); setTargetEntries("30")
    setIngestResult(null)
  }

  // ── Submit: Text paste (mod vechi) ──────────────────────
  async function submitText() {
    if (!title.trim() || !content.trim()) {
      setMessage("Titlu si continut sunt obligatorii"); return
    }
    setSubmitting(true); setMessage("Se proceseaza...")
    try {
      const body: any = { title: title.trim(), content: content.trim() }
      if (tags.trim()) body.tags = tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      if (targetAgents.trim()) body.targetAgents = targetAgents.split(",").map((t: string) => t.trim()).filter(Boolean)

      const res = await fetch("/api/v1/docs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        setMessage(`"${data.title}" — ${data.totalEntries} entries pe ${data.agents} agenti`)
        resetForm(); setShowForm(false); loadDocs()
      } else {
        setMessage(`Eroare: ${data.error}`)
      }
    } catch (e: any) { setMessage(`Eroare: ${e.message}`) }
    setSubmitting(false)
  }

  // ── Submit: Upload PDF/DOCX (pâlnia nouă) ──────────────
  async function submitUpload() {
    if (!file || !title.trim() || !author.trim()) {
      setMessage("Fisier, titlu si autor sunt obligatorii"); return
    }
    setSubmitting(true); setMessage("Se extrage cunoastere din document... (poate dura 1-2 minute)")
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("sourceTitle", title.trim())
      fd.append("sourceAuthor", author.trim())
      fd.append("sourceType", sourceType)

      const res = await fetch("/api/v1/kb/ingest", { method: "POST", body: fd })
      const data = await res.json()

      if (data.entriesCreated > 0 || data.entries?.length > 0) {
        const roles = Object.entries(data.byRole || {}).map(([r, n]) => `${r}:${n}`).join(", ")
        setMessage(`"${data.sourceTitle}" — ${data.entriesCreated} entries create\nConsultanti: ${roles}`)
        setIngestResult(data)
        loadDocs()
      } else {
        setMessage(`Nu s-a extras cunoastere din document.`)
      }
    } catch (e: any) { setMessage(`Eroare: ${e.message}`) }
    setSubmitting(false)
  }

  // ── Submit: Referință bibliografică ─────────────────────
  async function submitReference() {
    if (!title.trim() || !author.trim()) {
      setMessage("Titlu si autor sunt obligatorii"); return
    }
    setSubmitting(true); setMessage("Se extrage cunoastere din referinta... (poate dura 1-3 minute)")
    try {
      const body: any = {
        bibliographicReference: true,
        sourceTitle: title.trim(),
        sourceAuthor: author.trim(),
        sourceType,
        targetEntries: parseInt(targetEntries) || 30,
      }
      if (publisher.trim()) body.publisher = publisher.trim()
      if (year.trim()) body.year = parseInt(year)
      if (focusTopics.trim()) body.focusTopics = focusTopics.split(",").map((t: string) => t.trim()).filter(Boolean)

      const res = await fetch("/api/v1/kb/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.knownSource === false) {
        setMessage("Sursa nu e cunoscuta de Claude. Comut pe upload PDF — incarca documentul.")
        // Comută automat pe tab upload cu datele pre-completate
        setInputMode("upload")
      } else if (data.entriesCreated > 0 || data.entries?.length > 0) {
        const roles = Object.entries(data.byRole || {}).map(([r, n]) => `${r}:${n}`).join(", ")
        setMessage(`"${data.sourceTitle}" — ${data.entriesCreated} entries create\nConsultanti: ${roles}`)
        setIngestResult(data)
        loadDocs()
      } else {
        setMessage("Nu s-a extras cunoastere.")
      }
    } catch (e: any) { setMessage(`Eroare: ${e.message}`) }
    setSubmitting(false)
  }

  // ── Submit: Bibliografie (PDF cu lista de referințe) ─────
  async function submitBibliography() {
    if (!bibFile && !content.trim()) {
      setMessage("Incarca un PDF cu bibliografie sau lipeste textul"); return
    }
    if (!title.trim()) {
      setMessage("Titlul sursei principale e obligatoriu"); return
    }
    setSubmitting(true); setMessage("Se extrag referintele si se proceseaza fiecare sursa... (poate dura cateva minute)")
    try {
      if (bibFile) {
        const fd = new FormData()
        fd.append("file", bibFile)
        fd.append("sourceTitle", title.trim())
        fd.append("sourceAuthor", author.trim() || "Bibliografie")
        fd.append("sourceType", sourceType)
        fd.append("bibliographyMode", "true")

        const res = await fetch("/api/v1/kb/ingest", { method: "POST", body: fd })
        const data = await res.json()
        handleBibResult(data)
      } else {
        const res = await fetch("/api/v1/kb/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawText: content.trim(),
            sourceTitle: title.trim(),
            sourceAuthor: author.trim() || "Bibliografie",
            sourceType,
            bibliographyMode: true,
          }),
        })
        const data = await res.json()
        handleBibResult(data)
      }
    } catch (e: any) { setMessage(`Eroare: ${e.message}`) }
    setSubmitting(false)
  }

  function handleBibResult(data: any) {
    if (data.bibliography) {
      const bib = data.bibliography
      setMessage(`Bibliografie procesata: ${bib.totalReferences} referinte gasite, ${bib.knownSources} cunoscute, ${bib.unknownSources} necunoscute. ${data.entriesCreated} KB entries create.`)
      setBibResult(bib)
      setIngestResult(data)
      loadDocs()
    } else if (data.entriesCreated > 0) {
      setMessage(`${data.entriesCreated} entries create`)
      setIngestResult(data)
      loadDocs()
    } else {
      setMessage("Nu s-au gasit referinte bibliografice in document.")
    }
  }

  async function deleteDoc(docTitle: string) {
    if (!confirm(`Stergi "${docTitle}" din biblioteca echipei?`)) return
    try {
      const res = await fetch("/api/v1/docs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: docTitle }) })
      const data = await res.json()
      setMessage(`Sters: ${data.deleted} entries`)
      loadDocs()
    } catch (e: any) { setMessage(`Eroare: ${e.message}`) }
  }

  // Bibliografie
  const [bibFile, setBibFile] = useState<File | null>(null)
  const [bibResult, setBibResult] = useState<any>(null)

  const modeLabels: Record<InputMode, { label: string; icon: string }> = {
    text: { label: "Text", icon: "T" },
    upload: { label: "PDF / Word", icon: "↑" },
    reference: { label: "Referinta", icon: "R" },
    bibliography: { label: "Bibliografie", icon: "B" },
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Biblioteca echipei</h1>
          <p className="text-sm text-text-secondary mt-1">
            Documente, carti si referinte. Fiecare sursa devine cunoastere accesibila automat.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
          className="text-sm font-medium bg-coral text-white px-4 py-2 rounded-lg hover:bg-coral-dark transition-colors"
        >
          {showForm ? "Anuleaza" : "+ Sursa noua"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-indigo/5 border border-indigo/10 text-sm text-foreground whitespace-pre-line">
          {message}
        </div>
      )}

      {/* ═══ Formular adăugare ═══ */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6 space-y-5">
          {/* Mod selector */}
          <div className="flex gap-2">
            {(["text", "upload", "reference"] as InputMode[]).map(m => (
              <button key={m}
                onClick={() => setInputMode(m)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === m
                    ? "bg-indigo text-white"
                    : "bg-background border border-border text-text-secondary hover:border-indigo/30"
                }`}>
                <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-xs font-bold">
                  {modeLabels[m].icon}
                </span>
                {modeLabels[m].label}
              </button>
            ))}
          </div>

          {/* Câmpuri comune: Titlu + Autor + Tip */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Titlu</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Creativitate si Inteligenta Emotionala"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Autor</label>
              <input type="text" value={author} onChange={e => setAuthor(e.target.value)}
                placeholder="Ex: Mihaela Rocco"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tip sursa</label>
              <select value={sourceType} onChange={e => setSourceType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20">
                <option value="carte">Carte</option>
                <option value="curs">Curs</option>
                <option value="articol">Articol</option>
                <option value="manual">Manual</option>
                <option value="politica">Politica / Procedura</option>
                <option value="alt-document">Alt document</option>
              </select>
            </div>
          </div>

          {/* ── Mod TEXT (paste) ── */}
          {inputMode === "text" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Continut</label>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Lipeste continutul documentului aici..."
                rows={10}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20 resize-y" />
              <p className="text-xs text-text-secondary/50 mt-1">
                Se imparte automat in sectiuni de max 2000 caractere per agent.
              </p>
            </div>
          )}

          {/* ── Mod UPLOAD (PDF/DOCX) ── */}
          {inputMode === "upload" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fisier (PDF, DOCX, TXT — max 50 MB)</label>
              <label className={`flex items-center justify-center gap-2 w-full py-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                file ? "border-indigo bg-indigo/5" : "border-border hover:border-indigo/30"
              }`}>
                <input type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <span className="text-sm text-indigo font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                ) : (
                  <span className="text-sm text-text-secondary">Click sau trage fisierul aici</span>
                )}
              </label>
              <p className="text-xs text-text-secondary/50 mt-1">
                Claude extrage cunoastere declarativa si procedurala si o ruteaza automat pe consultantii L2 relevanti.
              </p>
            </div>
          )}

          {/* ── Mod REFERINȚĂ (bibliografică) ── */}
          {inputMode === "reference" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Editura</label>
                  <input type="text" value={publisher} onChange={e => setPublisher(e.target.value)}
                    placeholder="Ex: Polirom"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">An publicare</label>
                  <input type="text" value={year} onChange={e => setYear(e.target.value)}
                    placeholder="Ex: 2004"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Entries tinta</label>
                  <input type="number" value={targetEntries} onChange={e => setTargetEntries(e.target.value)}
                    min="10" max="100"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Teme de focalizare (optional)</label>
                <input type="text" value={focusTopics} onChange={e => setFocusTopics(e.target.value)}
                  placeholder="Ex: inteligenta emotionala, creativitate organizationala, leadership"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20" />
                <p className="text-xs text-text-secondary/50 mt-1">
                  Separate prin virgula. Daca nu specifici, Claude extrage tot ce stie despre sursa.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700">
                  Claude extrage din cunoasterea sa despre aceasta sursa. Daca sursa nu e cunoscuta, vei fi invitat sa incarci documentul.
                </p>
              </div>
            </div>
          )}

          {/* ── Mod BIBLIOGRAFIE (PDF cu lista referințe) ── */}
          {inputMode === "bibliography" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">PDF cu bibliografie sau lipeste textul</label>
                <label className={`flex items-center justify-center gap-2 w-full py-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                  bibFile ? "border-orange-400 bg-orange-50" : "border-border hover:border-orange-300"
                }`}>
                  <input type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
                    onChange={e => setBibFile(e.target.files?.[0] || null)} />
                  {bibFile ? (
                    <span className="text-sm text-orange-600 font-medium">{bibFile.name}</span>
                  ) : (
                    <span className="text-sm text-text-secondary">Click pentru PDF cu bibliografie</span>
                  )}
                </label>
              </div>
              {!bibFile && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Sau lipeste lista de referinte</label>
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    placeholder={"Goleman, D. (1995). Emotional Intelligence. Bantam Books.\nAmabile, T.M. (1996). Creativity in Context. Westview Press.\n..."}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-y" />
                </div>
              )}
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-700">
                  Fiecare referinta din bibliografie e procesata individual. Claude extrage cunoastere din sursele pe care le cunoaste si le ruteaza pe consultantii L2 relevanti.
                </p>
              </div>

              {/* Rezultat bibliografie */}
              {bibResult && (
                <div className="p-4 rounded-lg bg-white border border-orange-200">
                  <p className="text-sm font-medium text-orange-800 mb-2">
                    {bibResult.knownSources}/{bibResult.totalReferences} surse cunoscute
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {bibResult.references?.map((ref: any, i: number) => (
                      <div key={i} className={`flex items-center gap-2 text-xs ${ref.known ? "text-emerald-700" : "text-slate-400"}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${ref.known ? "bg-emerald-100" : "bg-slate-100"}`}>
                          {ref.known ? ref.entries : "?"}
                        </span>
                        <span className="font-medium">{ref.author}</span>
                        <span className="text-slate-400">—</span>
                        <span className="truncate">{ref.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => {
              if (inputMode === "text") submitText()
              else if (inputMode === "upload") submitUpload()
              else if (inputMode === "bibliography") submitBibliography()
              else submitReference()
            }}
            disabled={submitting || !title.trim() || (inputMode === "text" && !content.trim()) || (inputMode === "upload" && !file) || (inputMode === "bibliography" && !bibFile && !content.trim()) || ((inputMode === "upload" || inputMode === "reference") && !author.trim())}
            className="bg-indigo text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-dark disabled:opacity-50 transition-colors"
          >
            {submitting
              ? (inputMode === "bibliography" ? "Se proceseaza bibliografie..." : inputMode === "text" ? "Se proceseaza..." : "Se extrage cunoastere...")
              : (inputMode === "text" ? "Adauga in biblioteca" : inputMode === "upload" ? "Extrage si infuzeaza" : inputMode === "bibliography" ? "Proceseaza bibliografie" : "Extrage din referinta")}
          </button>

          {/* Rezultat ingestie (dacă e disponibil) */}
          {ingestResult && ingestResult.byRole && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-800 mb-2">Cunoastere extrasa si rutata:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ingestResult.byRole).map(([role, count]) => (
                  <span key={role} className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                    {role}: {count as number}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Lista documente ═══ */}
      {loading ? (
        <p className="text-sm text-text-secondary">Se incarca...</p>
      ) : documents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-indigo/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground/60 mb-2">Biblioteca e goala</h3>
          <p className="text-sm text-text-secondary/50">Adauga prima sursa — echipa o va accesa automat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.title} className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{doc.title}</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {doc.chunks} sectiuni · {doc.agentCount} agenti · {new Date(doc.createdAt).toLocaleDateString("ro-RO")}
                </p>
                {doc.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {doc.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-[10px] bg-indigo/5 text-indigo/70 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => deleteDoc(doc.title)}
                className="text-xs text-text-secondary/40 hover:text-coral transition-colors">
                Sterge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Back */}
      <div className="mt-8">
        <Link href="/owner" className="text-sm text-indigo hover:text-indigo-dark transition-colors">
          ← Inapoi la Owner Dashboard
        </Link>
      </div>
    </div>
  )
}
