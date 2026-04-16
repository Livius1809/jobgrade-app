import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import SignOutButton from "@/components/auth/SignOutButton"

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
            <span className="text-xs text-text-secondary hidden sm:inline">
              {session.user.name}
            </span>
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
        <div className="flex items-center justify-between text-xs text-text-secondary/40" style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <span>JobGrade · Psihobusiness Consulting SRL</span>
          <span className="italic">Evaluăm posturi. Construim echitate.</span>
        </div>
      </footer>
    </div>
  )
}
