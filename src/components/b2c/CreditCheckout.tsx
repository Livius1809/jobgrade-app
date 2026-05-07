"use client"

import { useState } from "react"
import { CREDIT_PACKAGES } from "@/lib/stripe"

interface BillingData {
  fullName: string
  cui: string
  address: string
  county: string
  isCompany: boolean
}

const EMPTY_BILLING: BillingData = {
  fullName: "",
  cui: "",
  address: "",
  county: "",
  isCompany: false,
}

// Subset of packages suitable for B2C (smaller tiers)
const B2C_PACKAGES = CREDIT_PACKAGES.filter((p) =>
  ["credits_micro", "credits_mini", "credits_start"].includes(p.id),
)

export default function CreditCheckout({ userId }: { userId: string }) {
  const [selectedPkg, setSelectedPkg] = useState<string>(
    B2C_PACKAGES[0]?.id ?? "",
  )
  const [wantInvoice, setWantInvoice] = useState(false)
  const [billing, setBilling] = useState<BillingData>(EMPTY_BILLING)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBuy = async () => {
    setError(null)
    setLoading(true)

    try {
      const payload: Record<string, unknown> = {
        userId,
        packageId: selectedPkg,
        documentType: wantInvoice ? "invoice" : "receipt",
      }

      if (wantInvoice) {
        if (!billing.fullName || !billing.address || !billing.county) {
          setError("Completati toate campurile obligatorii pentru factura.")
          setLoading(false)
          return
        }
        payload.billingData = {
          fullName: billing.fullName,
          cui: billing.cui || undefined,
          address: billing.address,
          county: billing.county,
          isCompany: billing.isCompany,
        }
      }

      const res = await fetch("/api/v1/b2c/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Eroare la procesare.")
        setLoading(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError("Eroare de conexiune. Reincercati.")
      setLoading(false)
    }
  }

  const selectedPackage = B2C_PACKAGES.find((p) => p.id === selectedPkg)
  const vatAmount = selectedPackage
    ? Math.round(selectedPackage.price * 0.21)
    : 0
  const totalWithVAT = selectedPackage
    ? selectedPackage.price + vatAmount
    : 0

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h2 className="text-xl font-semibold">Credite JobGrade</h2>

      {/* Package selection */}
      <div className="grid gap-3">
        {B2C_PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => setSelectedPkg(pkg.id)}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              selectedPkg === pkg.id
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{pkg.label}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {pkg.credits} credite
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold">
                  {(pkg.price + Math.round(pkg.price * 0.21)).toLocaleString(
                    "ro-RO",
                  )}{" "}
                  RON
                </span>
                <span className="ml-1 text-xs text-gray-400">
                  (incl. TVA)
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">{pkg.description}</p>
            {pkg.discount && (
              <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                -{pkg.discount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Invoice toggle */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={wantInvoice}
          onChange={(e) => setWantInvoice(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm">Vreau factura</span>
      </label>

      {/* Billing form (only if invoice) */}
      {wantInvoice && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-700">
            Date de facturare
          </h3>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={billing.isCompany}
              onChange={(e) =>
                setBilling({ ...billing, isCompany: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            Persoana juridica (firma)
          </label>

          <input
            type="text"
            placeholder={
              billing.isCompany ? "Denumire firma" : "Nume complet"
            }
            value={billing.fullName}
            onChange={(e) =>
              setBilling({ ...billing, fullName: e.target.value })
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />

          {billing.isCompany && (
            <input
              type="text"
              placeholder="CUI (optional)"
              value={billing.cui}
              onChange={(e) =>
                setBilling({ ...billing, cui: e.target.value })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          )}

          <input
            type="text"
            placeholder="Adresa"
            value={billing.address}
            onChange={(e) =>
              setBilling({ ...billing, address: e.target.value })
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />

          <input
            type="text"
            placeholder="Judet"
            value={billing.county}
            onChange={(e) =>
              setBilling({ ...billing, county: e.target.value })
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Summary */}
      {selectedPackage && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Pret fara TVA</span>
            <span>{selectedPackage.price.toLocaleString("ro-RO")} RON</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>TVA 21%</span>
            <span>{vatAmount.toLocaleString("ro-RO")} RON</span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
            <span>Total</span>
            <span>{totalWithVAT.toLocaleString("ro-RO")} RON</span>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Document fiscal:{" "}
            {wantInvoice ? "factura" : "bon fiscal"}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}

      {/* Buy button */}
      <button
        type="button"
        onClick={handleBuy}
        disabled={loading || !selectedPkg}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Se proceseaza..." : "Cumpara"}
      </button>
    </div>
  )
}
