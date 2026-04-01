import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

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

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-coral">
              Portal
            </Link>
            <Link href="/" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200">
              Acasă
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              {session.user.name}
            </span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs text-text-secondary/60 hover:text-coral transition-colors"
              >
                Ieși din cont
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="px-6 py-8" style={{ maxWidth: "56rem", margin: "0 auto" }}>
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-6 px-6">
        <div className="flex items-center justify-between text-xs text-text-secondary/50" style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <span>JobGrade · Psihobusiness Consulting SRL</span>
          <span className="italic">Evaluăm posturi. Construim echitate.</span>
        </div>
      </footer>
    </div>
  )
}
