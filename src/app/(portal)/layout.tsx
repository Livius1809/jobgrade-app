import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import SignOutButton from "@/components/auth/SignOutButton"
import NarrativeGuide from "@/components/guide/NarrativeGuide"
import AccountMenu from "@/components/portal/AccountMenu"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const isOwner = session.user.role === "SUPER_ADMIN" || session.user.role === "OWNER"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header — consistent cu homepage ──────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center justify-between px-6 h-14" style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <Link href="/portal">
            <Image src="/logo.svg" alt="JobGrade" width={130} height={33} className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/company" className="text-xs font-medium text-text-warm hover:text-coral transition-colors">
              Detalii companie
            </Link>
            {isOwner && (
              <Link href="/owner" className="text-xs font-medium text-indigo hover:text-indigo-dark transition-colors">
                Owner
              </Link>
            )}
            <AccountMenu />
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="px-6 py-8" style={{ maxWidth: "72rem", margin: "0 auto" }}>
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-6 px-6">
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

      {/* ── Consultant HR (bubble jos-dreapta) ──────────────── */}
      <NarrativeGuide />
    </div>
  )
}
