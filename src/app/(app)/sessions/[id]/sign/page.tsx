"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import SignatureCanvas from "@/components/sessions/SignatureCanvas"

export default function SignPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [signStatus, setSignStatus] = useState<{
    isSigned: boolean
    signedAt: string | null
    signedBy: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/sessions/${sessionId}/sign`)
      .then((r) => r.json())
      .then(setSignStatus)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  async function handleSign(signatureDataUrl: string) {
    setSigning(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: signatureDataUrl }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.message || "Eroare la semnare.")
      } else {
        setSuccess(true)
      }
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (success || signStatus?.isSigned) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h1 className="text-lg font-bold text-green-800">Raportul a fost semnat</h1>
          <p className="text-sm text-green-700 mt-2">
            {signStatus?.signedBy && `Semnat de: ${signStatus.signedBy}`}
            {signStatus?.signedAt && ` · ${new Date(signStatus.signedAt).toLocaleDateString("ro-RO")}`}
          </p>
          <p className="text-xs text-green-600 mt-3">
            Documentul este acum opozabil organelor competente. Puteți exporta raportul final din secțiunea Rapoarte.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href={`/sessions/${sessionId}`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            Înapoi la sesiune
          </Link>
          <Link
            href={`/sessions/${sessionId}/results`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Vezi ierarhia finală
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div>
        <Link
          href={`/sessions/${sessionId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Sesiune
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">
          Validare și semnătură
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Semnați raportul de evaluare pentru a-l oficializa
        </p>
      </div>

      {/* Declarație */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800 leading-relaxed">
          Subsemnatul/a, în calitate de Director General / Reprezentant legal al organizației,
          certific că am verificat ierarhia posturilor rezultată din procesul de evaluare și
          confirm că aceasta reflectă structura organizațională și nivelurile de complexitate ale posturilor.
        </p>
      </div>

      {/* Canvas semnătură */}
      <SignatureCanvas onSign={handleSign} />

      {signing && (
        <div className="text-center text-sm text-gray-500">
          Se procesează semnătura...
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Semnătura olografă este captată digital și inclusă în raportul PDF final.
          Documentul devine opozabil organelor competente după semnare.
          Procesul verbal al evaluării este disponibil ca anexă (Jurnal proces).
        </p>
      </div>
    </div>
  )
}
