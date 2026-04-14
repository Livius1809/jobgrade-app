import Image from "next/image"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center justify-between px-6 h-16" style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <Link href="/">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors duration-200"
          >
            ← Pagina principală
          </Link>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="flex items-center justify-center px-6 py-12" style={{ minHeight: "calc(100vh - 4rem)" }}>
        {children}
      </main>
    </div>
  )
}
