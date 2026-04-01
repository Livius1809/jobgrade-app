import Image from "next/image"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header — consistent cu homepage ──────────────────── */}
      <header className="sticky top-0 z-50 header-glass">
        <div className="flex items-center justify-between px-6 h-16" style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.svg"
              alt="JobGrade"
              width={32}
              height={32}
              className="transition-transform duration-500 group-hover:rotate-45"
            />
            <span className="text-lg font-semibold text-indigo-dark">JobGrade</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-text-secondary hover:text-coral transition-colors duration-200"
          >
            ← Pagina principală
          </Link>
        </div>
      </header>

      {/* ── Content centrat ──────────────────────────────────── */}
      <main className="flex items-center justify-center px-6 py-16" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="w-full" style={{ maxWidth: "24rem" }}>
          {children}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-6 px-6">
        <div className="text-center text-xs text-text-secondary/50">
          <span className="italic">Evaluăm posturi. Construim echitate.</span>
        </div>
      </footer>
    </div>
  )
}
