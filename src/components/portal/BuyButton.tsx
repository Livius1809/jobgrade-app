"use client"

export default function BuyButton() {
  return (
    <button
      onClick={() => {
        if (window.location.pathname === "/portal") {
          // Emite event custom — PortalClientSection ascultă
          window.dispatchEvent(new CustomEvent("open-calculator"))
        } else {
          window.location.href = "/portal?openCalculator=1"
        }
      }}
      className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
    >
      Cumpără
    </button>
  )
}
