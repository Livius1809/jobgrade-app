import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance } from "@/lib/credits"
import { CREDIT_PACKAGES, SUBSCRIPTION } from "@/lib/stripe"
import Link from "next/link"
import BillingActions from "./BillingActions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Facturare & Credite — JobGrade" }

export default async function BillingPage() {
  const session = await auth()
  if (!session) return null

  const tenantId = session.user.tenantId
  const [balance, tenant, transactions, revenueEntries] = await Promise.all([
    getBalance(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true, stripeCustomerId: true },
    }),
    prisma.creditTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, amount: true, description: true, createdAt: true },
    }),
    (prisma as any).revenueEntry.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, amount: true, currency: true, description: true, createdAt: true },
    }).catch(() => []),
  ])

  const hasSubscription = tenant?.status === "ACTIVE"

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturare & Credite</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestionează abonamentul, creditele și istoricul tranzacțiilor
        </p>
      </div>

      {/* ── Sold credite ── */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 rounded-2xl border border-indigo-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-1">Sold disponibil</p>
            <p className="text-4xl font-extrabold text-indigo-700">{balance.toLocaleString("ro-RO")}</p>
            <p className="text-sm text-indigo-400">credite</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-400 mb-1">Echivalent estimativ</p>
            <p className="text-lg font-bold text-indigo-600">{(balance * 8).toLocaleString("ro-RO")} RON</p>
            <p className="text-[10px] text-indigo-300">la 8 RON/credit (preț standard)</p>
          </div>
        </div>
      </div>

      {/* ── Abonament ── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Abonament</h2>
        <div className={`rounded-xl border p-5 ${hasSubscription ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          {hasSubscription ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">ACTIV</span>
                  <p className="font-semibold text-slate-800">{SUBSCRIPTION.label}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">{SUBSCRIPTION.description}</p>
              </div>
              <BillingActions type="portal" />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">INACTIV</span>
                <p className="font-semibold text-slate-800">Abonament necesar</p>
              </div>
              <p className="text-xs text-slate-600 mb-4">{SUBSCRIPTION.description}</p>
              <div className="flex gap-3">
                <BillingActions
                  type="subscribe"
                  billing="monthly"
                  label={`${SUBSCRIPTION.monthlyPrice} RON/lună`}
                />
                <BillingActions
                  type="subscribe"
                  billing="annual"
                  label={`${SUBSCRIPTION.annualPrice.toLocaleString("ro-RO")} RON/an (economie 17%)`}
                  variant="outline"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Pachete credite ── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Pachete credite</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CREDIT_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              className={`relative rounded-xl border p-5 bg-white transition-shadow hover:shadow-md ${
                pkg.popular ? "ring-2 ring-indigo-300 border-indigo-200" : "border-slate-200"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-full">
                  Popular
                </div>
              )}
              <h3 className="font-bold text-slate-900 text-lg">{pkg.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">{pkg.description}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-extrabold text-slate-900">{pkg.credits.toLocaleString("ro-RO")}</span>
                <span className="text-sm text-slate-400">credite</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-bold text-indigo-700">{pkg.price.toLocaleString("ro-RO")} RON</span>
                {pkg.discount && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    -{pkg.discount}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mb-4">{pkg.pricePerCredit.toFixed(2)} RON/credit</p>
              <BillingActions type="credits" packageId={pkg.id} label="Cumpără" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Istoric tranzacții ── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Istoric tranzacții credite</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-6 text-center">
            Nicio tranzacție încă.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 font-semibold text-slate-600">Data</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-600">Descriere</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-600 text-center">Tip</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Credite</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{tx.description}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.type === "PURCHASE" ? "bg-emerald-100 text-emerald-800" :
                        tx.type === "SUBSCRIPTION_MONTHLY" ? "bg-sky-100 text-sky-800" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {tx.type === "PURCHASE" ? "Cumpărare" :
                         tx.type === "SUBSCRIPTION_MONTHLY" ? "Abonament" :
                         tx.type === "USAGE" ? "Consum" :
                         tx.type === "REFUND" ? "Rambursare" : tx.type}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right font-bold ${tx.amount > 0 ? "text-emerald-600" : "text-slate-600"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Link demo ── */}
      <div className="text-center pb-8">
        <Link href="/demo" className="text-xs text-indigo-500 hover:underline">
          Nu știi câte credite ai nevoie? Explorează pachetele pe nevoi →
        </Link>
      </div>
    </div>
  )
}
