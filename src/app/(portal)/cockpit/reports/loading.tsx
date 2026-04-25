export default function ReportsLoading() {
  return (
    <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo/30 border-t-indigo rounded-full animate-spin mx-auto" />
        <p className="text-sm text-text-secondary">Se generează raportul...</p>
      </div>
    </div>
  )
}
