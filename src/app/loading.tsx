export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(180deg, var(--hero-bg-top) 0%, var(--hero-bg-bottom) 100%)",
      }}
    >
      {/* Spinner — spiral animation matching brand */}
      <div
        className="w-12 h-12 rounded-full border-[3px] border-indigo/20"
        style={{
          borderTopColor: "var(--indigo)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p className="mt-6 text-sm text-text-secondary animate-pulse">
        Se încarcă...
      </p>
    </div>
  )
}
