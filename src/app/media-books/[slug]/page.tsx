import { notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { getMediaBookBySlug, getMediaBookContent, MEDIA_BOOKS } from "@/lib/media-books"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mb = getMediaBookBySlug(slug)
  if (!mb) return { title: "Media Book — JobGrade" }
  return {
    title: `${mb.title} — Media Book JobGrade`,
    description: mb.subtitle,
  }
}

export default async function MediaBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mb = getMediaBookBySlug(slug)
  if (!mb) notFound()

  const data = await getMediaBookContent(mb.code)
  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <span className="text-4xl mb-4 block">{mb.icon}</span>
          <h1 className="text-2xl font-bold text-indigo-dark mb-3">{mb.title}</h1>
          <p className="text-text-secondary mb-8">
            Acest Media Book este în curs de elaborare. Echipa interdisciplinară
            lucrează la conținut — revino în curând.
          </p>
          <Link href="/media-books" className="text-sm text-coral hover:text-coral/80">
            ← Toate Media Books
          </Link>
        </div>
      </div>
    )
  }

  const ROLE_LABELS: Record<string, string> = {
    PMP_B2B: "Coordonare integrată",
    CWA: "Copy & Storytelling",
    HR_COUNSELOR: "Expertiză HR",
    CJA: "Cadru legal",
    PSYCHOLINGUIST: "Calibrare psiholingvistică",
    DOA: "Design vizual",
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Link
            href="/media-books"
            className="text-sm text-text-secondary hover:text-coral transition-colors mb-4 inline-block"
          >
            ← Toate Media Books
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{mb.icon}</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-coral">
                {mb.type}
              </span>
              <h1 className="text-3xl font-bold text-indigo-dark">{mb.title}</h1>
            </div>
          </div>
          <p className="text-text-warm mt-2">{mb.subtitle}</p>
          <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary/50">
            <span>Echipă: {data.sections.length} contribuitori</span>
            <span>{Math.round(data.content.length / 1000)}K caractere</span>
            <span>Produs autonom de structura JobGrade</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <article className="prose prose-slate prose-lg max-w-none
          prose-headings:text-indigo-dark prose-headings:font-bold
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-p:text-text-warm prose-p:leading-relaxed
          prose-li:text-text-warm
          prose-strong:text-foreground
          prose-a:text-coral prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-coral prose-blockquote:bg-coral/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
          prose-code:text-indigo prose-code:bg-indigo/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-table:text-sm
          prose-th:bg-indigo/5 prose-th:text-indigo-dark
          prose-td:border-border">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </article>

        {/* Contributors */}
        {data.sections.length > 1 && (
          <section className="mt-16 pt-8 border-t border-border/50">
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-6">
              Echipa interdisciplinară
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.sections.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-surface/50 px-4 py-3"
                >
                  <p className="text-xs font-semibold text-indigo">{s.role}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {ROLE_LABELS[s.role] || s.role}
                  </p>
                  <p className="text-[10px] text-text-secondary/40 mt-1">
                    {Math.round(s.chars / 1000)}K chars
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-xl border border-indigo/20 bg-indigo/5 p-6 text-center">
          <p className="text-sm text-text-warm mb-3">
            Vrei să afli cum JobGrade poate ajuta organizația ta?
          </p>
          <Link
            href="/b2b"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg"
            style={{ backgroundColor: "var(--coral)" }}
          >
            Programează o demonstrație
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 px-6 mt-12">
        <div className="max-w-3xl mx-auto text-center text-xs text-text-secondary/50">
          <span className="italic">Evaluăm posturi. Construim echitate.</span>
          <span className="mx-2">·</span>
          <Link href="/" className="hover:text-coral transition-colors">jobgrade.ro</Link>
        </div>
      </footer>
    </div>
  )
}
