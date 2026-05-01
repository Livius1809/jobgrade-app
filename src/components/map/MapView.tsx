"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix Leaflet icon paths (Next.js issue)
const createIcon = (color: string) => new L.DivIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

const ICONS: Record<string, L.DivIcon> = {
  BUSINESS: createIcon("#4F46E5"),
  SCHOOL: createIcon("#059669"),
  HOSPITAL: createIcon("#DC2626"),
  GOVERNMENT: createIcon("#7C3AED"),
  PHARMACY: createIcon("#EC4899"),
  RESTAURANT: createIcon("#F59E0B"),
  BANK: createIcon("#6366F1"),
  SUPERMARKET: createIcon("#10B981"),
  GAS_STATION: createIcon("#78716C"),
  DEFAULT: createIcon("#94A3B8"),
}

const TYPE_LABELS: Record<string, string> = {
  BUSINESS: "Firmă",
  SCHOOL: "Școală",
  HOSPITAL: "Spital",
  GOVERNMENT: "Instituție",
  PHARMACY: "Farmacie",
  RESTAURANT: "Restaurant",
  CAFE: "Cafenea",
  BANK: "Bancă",
  SUPERMARKET: "Supermarket",
  GAS_STATION: "Benzinărie",
  POST_OFFICE: "Poștă",
  WORSHIP: "Lăcaș de cult",
  KINDERGARTEN: "Grădiniță",
  CLINIC: "Clinică",
  DENTIST: "Dentist",
  DOCTOR: "Cabinet medical",
}

// Centrul Medgidia
const CENTER: [number, number] = [44.2481, 28.2711]

interface Entity {
  name: string
  category?: string
  address?: string
  lat?: number
  lon?: number
  employees?: number
  revenue?: number
}

interface Props {
  feed: {
    territory: string
    data: Record<string, Array<{ key: string; value: any; unit?: string; subcategory?: string }>>
    entities: Record<string, Entity[]>
    stats: { totalDataPoints: number; totalEntities: number; categories: string[]; entityTypes: string[] }
  } | null
}

function StatsPanel({ feed }: Props) {
  if (!feed) return null

  const pop = feed.data.POPULATION || []
  const eco = feed.data.ECONOMY || []
  const biz = feed.data.BUSINESS || []

  const total = pop.find(p => p.key === "total")
  const firmsTotal = biz.find(b => b.key === "firms_total")
  const employeesTotal = biz.find(b => b.key === "employees_total")
  const revenueTotal = eco.find(e => e.key === "revenue_total")

  // Grupe vârstă
  const ageGroups = pop
    .filter(p => p.subcategory === "AGE_GROUPS")
    .sort((a, b) => {
      const aNum = parseInt(a.key.replace("age_", ""))
      const bNum = parseInt(b.key.replace("age_", ""))
      return aNum - bNum
    })

  return (
    <div className="absolute top-4 left-4 z-[1000] w-72 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100" style={{ background: "var(--indigo)" }}>
        <h3 className="text-white text-sm font-bold">{feed.territory}</h3>
        <p className="text-indigo-200 text-xs">{feed.stats.totalDataPoints} indicatori · {feed.stats.totalEntities} entități</p>
      </div>

      <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
        {/* Cifre cheie */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Populație" value={total?.value?.toLocaleString("ro-RO") || "—"} />
          <StatCard label="Firme" value={firmsTotal?.value?.toLocaleString("ro-RO") || "—"} />
          <StatCard label="Angajați" value={employeesTotal?.value?.toLocaleString("ro-RO") || "—"} />
          <StatCard label="Cifră afaceri" value={revenueTotal ? `${(revenueTotal.value / 1000000).toFixed(0)}M RON` : "—"} />
        </div>

        {/* Piramida vârstelor */}
        {ageGroups.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Structura pe vârste</p>
            <div className="space-y-0.5">
              {ageGroups.map(ag => {
                const pct = total?.value ? Math.round((ag.value / total.value) * 100) : 0
                return (
                  <div key={ag.key} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-10 text-right text-gray-500">{ag.key.replace("age_", "")}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--indigo)" }} />
                    </div>
                    <span className="w-8 text-gray-600">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Entități per tip */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Entități locale</p>
          <div className="space-y-0.5">
            {Object.entries(feed.entities).map(([type, entities]) => (
              <div key={type} className="flex items-center justify-between text-[10px] py-0.5">
                <span className="text-gray-600">{TYPE_LABELS[type] || type}</span>
                <span className="font-semibold text-gray-800">{entities.length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructură */}
        {feed.data.INFRASTRUCTURE && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Infrastructură</p>
            <div className="space-y-0.5">
              {feed.data.INFRASTRUCTURE.filter(i => !i.subcategory?.includes("STRATEGIC")).map(inf => (
                <div key={inf.key} className="flex items-center gap-1 text-[10px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${inf.value === "true" || inf.value === "1" ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <span className="text-gray-600">{inf.key.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className="text-xs font-bold text-gray-800">{value}</p>
      <p className="text-[9px] text-gray-500">{label}</p>
    </div>
  )
}

// Legendă
function Legend() {
  const items = [
    { color: "#4F46E5", label: "Firme" },
    { color: "#059669", label: "Școli" },
    { color: "#DC2626", label: "Spital" },
    { color: "#7C3AED", label: "Instituții" },
  ]

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur rounded-lg shadow border border-gray-200 px-3 py-2">
      <div className="flex items-center gap-3">
        {items.map(i => (
          <div key={i.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: i.color }} />
            <span className="text-[10px] text-gray-600">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MapView({ feed }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  // Colectăm toate entitățile cu GPS
  const markers: Array<Entity & { type: string }> = []
  if (feed?.entities) {
    for (const [type, entities] of Object.entries(feed.entities)) {
      for (const entity of entities) {
        if (entity.lat && entity.lon) {
          markers.push({ ...entity, type })
        }
      }
    }
  }

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={CENTER}
        zoom={14}
        className="w-full h-full"
        style={{ minHeight: "calc(100vh - 90px)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Cercul zonei pilot */}
        <Circle
          center={CENTER}
          radius={3000}
          pathOptions={{ color: "#4F46E5", fillColor: "#4F46E5", fillOpacity: 0.03, weight: 1, dashArray: "5,5" }}
        />

        {/* Markere entități */}
        {markers.map((m, i) => (
          <Marker
            key={i}
            position={[m.lat!, m.lon!]}
            icon={ICONS[m.type] || ICONS.DEFAULT}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-sm text-gray-800">{m.name}</p>
                <p className="text-xs text-indigo-600 mb-1">{TYPE_LABELS[m.type] || m.type}</p>
                {m.category && <p className="text-xs text-gray-500">{m.category}</p>}
                {m.address && <p className="text-xs text-gray-500">{m.address}</p>}
                {m.employees && <p className="text-xs text-gray-600 mt-1">{m.employees} angajați</p>}
                {m.revenue && <p className="text-xs text-gray-600">{(m.revenue / 1000000).toFixed(1)}M RON cifră afaceri</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Panel statistici */}
      <StatsPanel feed={feed} />

      {/* Legendă */}
      <Legend />
    </div>
  )
}
