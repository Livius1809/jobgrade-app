"use client"

import { useState } from "react"
import Link from "next/link"

export default function DemoForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("sending")
    setErrorMsg("")

    const form = e.currentTarget
    const data = {
      contactName: (form.elements.namedItem("contactName") as HTMLInputElement).value,
      contactRole: (form.elements.namedItem("contactRole") as HTMLInputElement).value || undefined,
      contactEmail: (form.elements.namedItem("contactEmail") as HTMLInputElement).value,
      contactPhone: (form.elements.namedItem("contactPhone") as HTMLInputElement).value || undefined,
      companyName: (form.elements.namedItem("companyName") as HTMLInputElement).value,
      industry: (form.elements.namedItem("industry") as HTMLInputElement).value || undefined,
      companySize: (form.elements.namedItem("companySize") as HTMLSelectElement).value || undefined,
      distinctPositions: (form.elements.namedItem("distinctPositions") as HTMLInputElement).value || undefined,
    }

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setStatus("success")
      } else {
        const json = await res.json().catch(() => ({}))
        setErrorMsg(json.error ?? "A apărut o eroare. Încercați din nou.")
        setStatus("error")
      }
    } catch {
      setErrorMsg("Nu se poate conecta la server. Verificați conexiunea.")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-emerald-200 p-8 text-center">
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Cererea a fost trimisă</h3>
        <p className="text-slate-600 text-sm">
          Vă vom contacta în cel mai scurt timp pentru a programa demo-ul. Verificați și inbox-ul de e-mail.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-left space-y-5"
    >
      {/* ── Persoana de contact ──────────────────── */}
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Persoana de contact</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nume și prenume</label>
          <input name="contactName" required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Funcția</label>
          <input name="contactRole" placeholder="ex: Director HR, Manager C&B" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input name="contactEmail" type="email" required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
          <input name="contactPhone" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
      </div>

      {/* ── Organizația ──────────────────────────── */}
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Organizația</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nume companie</label>
          <input name="companyName" required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Industrie</label>
          <input name="industry" placeholder="ex: Producție, IT, Servicii financiare" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nr. angajați (estimat)</label>
          <select name="companySize" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white">
            <option value="">Selectați</option>
            <option value="10-50">10–50</option>
            <option value="50-200">50–200</option>
            <option value="200-500">200–500</option>
            <option value="500-2000">500–2.000</option>
            <option value="2000+">2.000+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Poziții distincte (estimat)</label>
          <input name="distinctPositions" type="number" placeholder="ex: 80" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-[#E85D43] text-white py-3.5 rounded-xl font-semibold text-base hover:bg-[#d04e36] transition-colors shadow-lg shadow-orange-200 disabled:opacity-60"
      >
        {status === "sending" ? "Se trimite..." : "Programează demo gratuit"}
      </button>
      <p className="text-xs text-slate-400 text-center">
        Datele sunt prelucrate conform GDPR. <Link href="/privacy" className="underline">Politica de confidențialitate</Link>
      </p>
    </form>
  )
}
