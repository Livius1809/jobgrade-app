"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"

// Leaflet trebuie încărcat doar client-side (nu SSR)
const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false })

interface TerritorialFeed {
  territory: string
  data: Record<string, Array<{ key: string; value: any; unit?: string; subcategory?: string }>>
  entities: Record<string, Array<{ name: string; category?: string; address?: string; lat?: number; lon?: number; employees?: number; revenue?: number }>>
  stats: { totalDataPoints: number; totalEntities: number; categories: string[]; entityTypes: string[] }
}

export default function MapPage() {
  const [feed, setFeed] = useState<TerritorialFeed | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/crawl/feed?agent=COG&territory=MEDGIDIA")
      .then(r => r.json())
      .then(data => { setFeed(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--hero-bg-bottom)" }}>
      {/* Banner pilot */}
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-center">
        <p className="text-xs text-emerald-700">
          Pilot teritorial — Municipiul Medgidia, jud. Constanța
        </p>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/favicon.svg" alt="JobGrade" width={28} height={28} />
          <span className="text-base font-semibold" style={{ color: "var(--indigo-dark)" }}>JobGrade</span>
          <span className="text-xs text-gray-400 ml-2">Motor Teritorial</span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {feed && (
            <>
              <span>{feed.stats.totalDataPoints} date</span>
              <span>·</span>
              <span>{feed.stats.totalEntities} entități</span>
            </>
          )}
        </div>
      </header>

      {/* Main — hartă */}
      <main className="flex-1 flex">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full border-[3px] border-indigo-200 mx-auto" style={{ borderTopColor: "var(--indigo)", animation: "spin 0.8s linear infinite" }} />
              <p className="mt-4 text-sm text-gray-500">Se încarcă datele teritoriale...</p>
            </div>
          </div>
        ) : (
          <MapView feed={feed} />
        )}
      </main>
    </div>
  )
}
