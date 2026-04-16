import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import ContextualAssistant from "@/components/chat/ContextualAssistant"
import InteractionTracker from "@/components/tracking/InteractionTracker"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const isOwner = session.user.role === "SUPER_ADMIN" || session.user.role === "OWNER"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header brand ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 header-glass">
        <div className="flex items-center justify-between px-6 h-14" style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <Link href="/portal" className="flex items-center gap-2 group">
            <Image
              src="/logo.svg"
              alt="JobGrade"
              width={28}
              height={28}
              className="transition-transform duration-500 group-hover:rotate-45"
            />
            <span className="text-base font-semibold text-indigo-dark">JobGrade</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            {isOwner && (
              <Link href="/owner" className="font-medium text-indigo hover:text-indigo-dark transition-colors">
                Owner
              </Link>
            )}
            <Link href="/portal" className="font-medium text-text-warm hover:text-coral transition-colors">
              Portal
            </Link>
            <Link href="/company" className="text-text-secondary hover:text-foreground transition-colors">
              Detalii companie
            </Link>
            <Link href="/jobs" className="text-text-secondary hover:text-foreground transition-colors">
              Posturi
            </Link>
            <Link href="/sessions" className="text-text-secondary hover:text-foreground transition-colors">
              Sesiuni
            </Link>
            <Link href="/reports" className="text-text-secondary hover:text-foreground transition-colors">
              Rapoarte
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary hidden sm:inline">
              {session.user.name}
            </span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs text-text-secondary/60 hover:text-coral transition-colors"
              >
                Ieși
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="px-6 py-6" style={{ maxWidth: "72rem", margin: "0 auto" }}>
        {children}
      </main>

      {/* ── Interaction Tracking (invisible) ─────────────────── */}
      <InteractionTracker />

      {/* ── Contextual Assistant ────────────────────────────── */}
      <ContextualAssistant />

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-4 px-6 mt-8">
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary/50"
          style={{ maxWidth: "72rem", margin: "0 auto" }}
        >
          <span>JobGrade · Psihobusiness Consulting SRL</span>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link href="/termeni" className="hover:text-indigo transition-colors">Termeni și condiții</Link>
            <span className="text-text-secondary/30">·</span>
            <Link href="/privacy" className="hover:text-indigo transition-colors">Confidențialitate</Link>
            <span className="text-text-secondary/30">·</span>
            <Link href="/cookies" className="hover:text-indigo transition-colors">Cookies</Link>
            <span className="text-text-secondary/30">·</span>
            <Link href="/transparenta-ai" className="hover:text-indigo transition-colors">Transparență AI</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
