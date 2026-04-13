import { notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { getMediaBookBySlug, getMediaBookContent } from "@/lib/media-books"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mb = getMediaBookBySlug(slug)
  if (!mb) return { title: "JobGrade" }
  return {
    title: `${mb.title} — JobGrade`,
    description: mb.subtitle,
  }
}

/** Split markdown content by ## headings into sections */
function parseSections(content: string): { title: string; body: string }[] {
  const cleaned = content.replace(/<cite[^>]*>|<\/cite>/g, "")
  const parts = cleaned.split(/^## /m).filter(Boolean)
  return parts.map((part) => {
    const lines = part.split("\n")
    const title = lines[0].replace(/^#+\s*/, "").replace(/\{#\w+\}/g, "").trim()
    const body = lines.slice(1).join("\n").trim()
    return { title, body }
  })
}

/** Section number icons */
const SECTION_ICONS = ["📋", "🎯", "⏰", "💡", "⚙️", "✅", "🏢"]

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
            Acest ghid este în curs de elaborare. Revino în curând.
          </p>
          <Link href="/media-books" className="text-sm text-coral hover:text-coral/80">
            ← Toate ghidurile
          </Link>
        </div>
      </div>
    )
  }

  const sections = parseSections(data.content)
  // First section is usually the title block (# heading), skip it if empty
  const contentSections = sections.filter((s) => s.body.length > 50)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, var(--indigo-dark) 0%, var(--indigo) 50%, var(--coral) 100%)",
            opacity: 0.95,
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <Link
            href="/media-books"
            className="text-sm text-white/60 hover:text-white transition-colors mb-8 inline-block"
          >
            ← Toate ghidurile
          </Link>
          <div className="mt-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest bg-white/10 text-white/80 mb-4">
              {mb.type}
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-4">
              {mb.title}
            </h1>
            <p className="text-lg text-white/70 max-w-2xl">
              {mb.subtitle}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {contentSections.slice(0, 7).map((s, i) => {
              const shortTitle = s.title.split("(")[0].replace(/^\d+\.\s*/, "").trim()
              return (
                <a
                  key={i}
                  href={`#section-${i}`}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                >
                  {shortTitle}
                </a>
              )
            })}
          </div>
        </div>
      </header>

      {/* Sections */}
      <main>
        {contentSections.map((section, i) => {
          const isAlt = i % 2 === 1
          const sectionNumber = i + 1
          const shortTitle = section.title.split("(")[0].replace(/^\d+\.\s*/, "").trim()
          const subtitle = section.title.match(/\(([^)]+)\)/)?.[1] || ""

          return (
            <section
              key={i}
              id={`section-${i}`}
              className={`${isAlt ? "bg-white" : "bg-background"}`}
            >
              <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
                {/* Section header */}
                <div className="flex items-start gap-4 mb-10">
                  <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo/10 flex items-center justify-center text-xl">
                    {SECTION_ICONS[i] || "📌"}
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-coral">
                      {String(sectionNumber).padStart(2, "0")}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold text-indigo-dark mt-1">
                      {shortTitle}
                    </h2>
                    {subtitle && (
                      <p className="text-text-secondary mt-1 text-sm">{subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Section content */}
                <div className="prose prose-slate prose-lg max-w-none
                  prose-headings:text-indigo-dark prose-headings:font-semibold
                  prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
                  prose-p:text-text-warm prose-p:leading-relaxed prose-p:mb-4
                  prose-li:text-text-warm prose-li:leading-relaxed
                  prose-strong:text-foreground
                  prose-a:text-coral prose-a:no-underline hover:prose-a:underline
                  prose-table:text-sm prose-table:mt-6 prose-table:mb-6
                  prose-th:bg-indigo/5 prose-th:text-indigo-dark prose-th:px-4 prose-th:py-3 prose-th:text-left
                  prose-td:border-border prose-td:px-4 prose-td:py-3
                  prose-ul:my-4 prose-ol:my-4
                  prose-blockquote:border-l-coral prose-blockquote:bg-coral/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic">
                  <ReactMarkdown>{section.body}</ReactMarkdown>
                </div>
              </div>

              {/* Mid-page CTA after section 3 */}
              {i === 2 && (
                <div className="bg-indigo-dark">
                  <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-white/90 text-center sm:text-left">
                      Pregătește-te pentru Directiva EU 2023/970 cu un sistem de evaluare profesionist.
                    </p>
                    <Link
                      href="/b2b/je"
                      className="flex-shrink-0 inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg"
                      style={{ backgroundColor: "var(--coral)" }}
                    >
                      Solicită o discuție
                    </Link>
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </main>

      {/* Final CTA */}
      <section className="bg-indigo-dark">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            Începe evaluarea posturilor acum
          </h3>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Completează formularul pentru o discuție despre cum JobGrade poate ajuta organizația ta
            cu evaluarea posturilor și pregătirea pentru Directiva EU 2023/970.
          </p>
          <Link
            href="/b2b/je"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full text-base font-semibold text-white transition-all hover:shadow-xl hover:scale-105"
            style={{ backgroundColor: "var(--coral)" }}
          >
            Programează o demonstrație
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-text-secondary/50">
          <span className="italic">Evaluăm posturi. Construim echitate.</span>
          <div className="flex items-center gap-3">
            <Link href="/media-books" className="hover:text-coral transition-colors">
              Toate ghidurile
            </Link>
            <span>·</span>
            <Link href="/" className="hover:text-coral transition-colors">
              jobgrade.ro
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
