import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { readFile } from "fs/promises"
import { join } from "path"

export const metadata = { title: "Business Plan — Owner Dashboard" }

async function loadBusinessPlan(): Promise<string | null> {
  try {
    const path = join(process.cwd(), "docs", "business-plan-v0.md")
    return await readFile(path, "utf-8")
  } catch {
    return null
  }
}

export default async function BusinessPlanPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const plan = await loadBusinessPlan()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cockpit" className="text-sm text-indigo hover:underline">← Dashboard</Link>
        <h1 className="text-xl font-bold text-foreground">Business Plan V0</h1>
        <span className="text-xs bg-amber-100 text-amber-700 rounded px-2 py-0.5 font-medium">Draft</span>
      </div>

      {!plan ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">docs/business-plan-v0.md nu a fost găsit.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          <div className="prose prose-sm prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-mono">
              {plan}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
