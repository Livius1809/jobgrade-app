import Image from "next/image"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: "linear-gradient(180deg, var(--hero-bg-top) 0%, var(--hero-bg-bottom) 100%)" }}>

      {/* Logo */}
      <div className="mb-8" style={{ animation: "fadeInUp 0.6s ease-out both" }}>
        <Image
          src="/favicon.svg"
          alt="JobGrade"
          width={80}
          height={80}
          className="opacity-70"
        />
      </div>

      {/* 404 */}
      <h1
        className="text-6xl md:text-8xl font-semibold text-indigo-dark/20 mb-4"
        style={{ animation: "fadeInUp 0.6s ease-out 0.1s both" }}
      >
        404
      </h1>

      {/* Message */}
      <p
        className="text-xl md:text-2xl font-semibold text-indigo-dark mb-3 text-center"
        style={{ animation: "fadeInUp 0.6s ease-out 0.2s both" }}
      >
        Pagina pe care o cauți nu există
      </p>
      <p
        className="text-base text-text-warm mb-10 text-center max-w-md"
        style={{ animation: "fadeInUp 0.6s ease-out 0.3s both" }}
      >
        Este posibil ca adresa să fie greșită sau pagina să fi fost mutată.
      </p>

      {/* Navigation links */}
      <div
        className="flex flex-col sm:flex-row items-center gap-4"
        style={{ animation: "fadeInUp 0.6s ease-out 0.4s both" }}
      >
        <Link
          href="/"
          className="inline-flex items-center justify-center font-semibold text-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          style={{
            minWidth: "160px",
            height: "40px",
            backgroundColor: "var(--indigo)",
            color: "white",
          }}
        >
          Pagina principală
        </Link>
        <Link
          href="/portal"
          className="inline-flex items-center justify-center font-semibold text-sm rounded-full border transition-all duration-200"
          style={{
            minWidth: "160px",
            height: "40px",
            borderColor: "var(--indigo)",
            color: "var(--indigo)",
          }}
        >
          Portal
        </Link>
      </div>

      {/* Footer subtle */}
      <p className="mt-16 text-xs text-text-micro">
        JobGrade &mdash; Evaluare și ierarhizare posturi
      </p>
    </div>
  )
}
