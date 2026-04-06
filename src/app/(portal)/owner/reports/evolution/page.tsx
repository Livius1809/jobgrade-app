import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const metadata = { title: "Evoluție Owner — Owner Dashboard" }
export const maxDuration = 60

export default async function OwnerEvolutionPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  // Fetch owner calibration report
  let report: any = null
  try {
    const key = process.env.INTERNAL_API_KEY
    const base = `http://localhost:${process.env.PORT ?? 3000}`
    const res = await fetch(`${base}/api/v1/agents/cog-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": key ?? "" },
      body: JSON.stringify({
        message: "Generează raportul de evoluție Owner: 1) Aliniere L1 (decizii morale, veto-uri), 2) Aliniere L2 (calibrare comunicare, interacțiuni cu consultanții), 3) Aliniere L3 (conformitate legal), 4) Pattern-uri observate (ce decizii iei frecvent, ce amâni), 5) Reflecție: ce servește BINELE și ce ar putea fi Umbră."
      }),
      cache: "no-store",
    })
    if (res.ok) report = await res.json()
  } catch { /* non-blocking */ }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner" className="text-sm text-indigo hover:underline">← Dashboard</Link>
        <h1 className="text-xl font-bold text-foreground">Evoluție Owner</h1>
        <span className="text-xs text-text-secondary">Oglinda ta</span>
      </div>

      {!report ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">Raportul de evoluție nu s-a putut genera.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Reflecție COG</h2>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {report.cogAnswer}
            </div>
          </div>

          {report.ownerCalibration?.flags && report.ownerCalibration.flags.length > 0 && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5">
              <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">Calibrare</h3>
              <div className="space-y-2">
                {report.ownerCalibration.flags.map((flag: any, i: number) => (
                  <div key={i} className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-purple-100">
                    <span className="text-[10px] font-bold text-purple-500 mr-2">{flag.layer}</span>
                    {flag.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
