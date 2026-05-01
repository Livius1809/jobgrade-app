import GhidulPublic from "@/components/chat/GhidulPublic"

/**
 * Layout B2B — comun tuturor paginilor publice /b2b/*
 * Include GhidulPublic (ghid contextual SOA) pe toate paginile.
 */
export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GhidulPublic />
    </>
  )
}
