import Link from "next/link"
import { getMediaBooksSummary } from "@/lib/media-books"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Media Books — JobGrade",
  description: "Ghiduri interactive pentru evaluarea și ierarhizarea posturilor. Rapoarte de conformitate EU 2023/970.",
}

const STATUS_BADGE = {
  ready: { label: "Disponibil", bg: "bg-emerald-100", text: "text-emerald-700" },
  "in-progress": { label: "În lucru", bg: "bg-amber-100", text: "text-amber-700" },
  planned: { label: "Planificat", bg: "bg-slate-100", text: "text-slate-500" },
}

export default async function MediaBooksIndex() {
  const books = await getMediaBooksSummary()
  const reports = books.filter((b) => b.type === "Raport")
  const services = books.filter((b) => b.type === "Serviciu")

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Link href="/" className="text-sm text-text-secondary hover:text-coral transition-colors mb-6 inline-block">
            ← Pagina principală
          </Link>
          <h1 className="text-3xl font-bold text-indigo-dark mb-3">Media Books</h1>
          <p className="text-lg text-text-warm max-w-2xl">
            Ghiduri interactive pentru evaluarea posturilor, conformitate salarială
            și dezvoltare organizațională. Fiecare ghid combină expertiză HR, cadru
            legal și calibrare psiholingvistică.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Reports */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-6">
            Rapoarte de conformitate
          </h2>
          <div className="grid gap-4">
            {reports.map((mb) => (
              <MediaBookCard key={mb.code} book={mb} />
            ))}
          </div>
        </section>

        {/* Services */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-6">
            Servicii organizaționale
          </h2>
          <div className="grid gap-4">
            {services.map((mb) => (
              <MediaBookCard key={mb.code} book={mb} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function MediaBookCard({
  book,
}: {
  book: Awaited<ReturnType<typeof getMediaBooksSummary>>[0]
}) {
  const badge = STATUS_BADGE[book.status]
  const isClickable = book.hasContent

  const inner = (
    <div
      className={`rounded-xl border border-border bg-surface p-6 transition-all ${
        isClickable ? "hover:border-indigo/30 hover:shadow-md cursor-pointer" : "opacity-70"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="text-2xl">{book.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-foreground">{book.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-3">{book.subtitle}</p>
          <div className="flex items-center gap-4 text-xs text-text-secondary/60">
            <span>{book.completedTasks} contribuții</span>
            <span>{Math.round(book.totalChars / 1000)}K caractere</span>
            <span className="uppercase tracking-wider">{book.type}</span>
          </div>
        </div>
        {isClickable && (
          <span className="text-text-secondary/30 text-lg mt-1">→</span>
        )}
      </div>
    </div>
  )

  return isClickable ? (
    <Link href={`/media-books/${book.slug}`}>{inner}</Link>
  ) : (
    inner
  )
}
