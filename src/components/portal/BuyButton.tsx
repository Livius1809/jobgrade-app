"use client"

export default function BuyButton() {
  return (
    <button
      onClick={() => {
        if (window.location.pathname === "/portal") {
          document.getElementById("pachete")?.scrollIntoView({ behavior: "smooth" })
        } else {
          window.location.href = "/portal#pachete"
        }
      }}
      className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
    >
      Cumpără
    </button>
  )
}
