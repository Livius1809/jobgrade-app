export const metadata = { title: "Facturare & Credite" }

export default function BillingPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturare & Credite</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestionează creditele și istoricul tranzacțiilor
        </p>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">🔧</div>
        <h2 className="font-semibold text-yellow-800 mb-1">Indisponibil momentan</h2>
        <p className="text-sm text-yellow-700">
          Modulul de facturare este în configurare. Va fi disponibil în curând.
        </p>
      </div>
    </div>
  )
}
