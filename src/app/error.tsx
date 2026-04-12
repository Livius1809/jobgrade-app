"use client"

import Image from "next/image"
import Link from "next/link"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background:
          "linear-gradient(180deg, var(--hero-bg-top) 0%, var(--hero-bg-bottom) 100%)",
      }}
    >
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

      {/* Error icon */}
      <h1
        className="text-5xl md:text-7xl font-semibold text-coral/30 mb-4"
        style={{ animation: "fadeInUp 0.6s ease-out 0.1s both" }}
      >
        Eroare
      </h1>

      {/* Message */}
      <p
        className="text-xl md:text-2xl font-semibold text-indigo-dark mb-3 text-center"
        style={{ animation: "fadeInUp 0.6s ease-out 0.2s both" }}
      >
        Ceva nu a funcționat corect
      </p>
      <p
        className="text-base text-text-warm mb-10 text-center max-w-md"
        style={{ animation: "fadeInUp 0.6s ease-out 0.3s both" }}
      >
        Ne cerem scuze pentru neplăcere. Poți încerca din nou sau te poți
        întoarce la pagina principală.
      </p>

      {/* Actions */}
      <div
        className="flex flex-col sm:flex-row items-center gap-4"
        style={{ animation: "fadeInUp 0.6s ease-out 0.4s both" }}
      >
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center font-semibold text-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
          style={{
            minWidth: "160px",
            height: "40px",
            backgroundColor: "var(--coral)",
            color: "white",
          }}
        >
          Încearcă din nou
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center font-semibold text-sm rounded-full border transition-all duration-200"
          style={{
            minWidth: "160px",
            height: "40px",
            borderColor: "var(--indigo)",
            color: "var(--indigo)",
          }}
        >
          Pagina principală
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-16 text-xs text-text-micro">
        JobGrade &mdash; Evaluare și ierarhizare posturi
      </p>
    </div>
  )
}
