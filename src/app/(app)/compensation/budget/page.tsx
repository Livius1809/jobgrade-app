import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Buget salarii" }

interface PackageComponent {
  name: string
  type: "percentage" | "fixed"
  value: number
}

function calcTotal(baseSalary: number, components: PackageComponent[]): number {
  const variable = components.reduce((sum, c) => {
    if (c.type === "percentage") return sum + (baseSalary * c.value) / 100
    return sum + c.value
  }, 0)
  return baseSalary + variable
}

export default async function BudgetPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const packages = await prisma.compensationPackage.findMany({
    where: { tenantId },
    include: {
      job: {
        select: {
          title: true,
          code: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Group by department
  type DeptGroup = {
    name: string
    packages: typeof packages
    totalMonthly: number
  }

  const deptMap: Record<string, DeptGroup> = {}
  for (const pkg of packages) {
    const dept = pkg.job.department?.name ?? "Fără departament"
    if (!deptMap[dept]) {
      deptMap[dept] = { name: dept, packages: [], totalMonthly: 0 }
    }
    const components = pkg.components as PackageComponent[]
    const total = calcTotal(pkg.baseSalary, components)
    deptMap[dept].packages.push(pkg)
    deptMap[dept].totalMonthly += total
  }

  const departments = Object.values(deptMap).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const grandTotalMonthly = departments.reduce((s, d) => s + d.totalMonthly, 0)
  const grandTotalAnnual = grandTotalMonthly * 12
  const currency = packages[0]?.currency ?? "RON"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buget salarii</h1>
        <p className="text-sm text-gray-500 mt-1">
          Estimare buget total bazată pe pachetele de compensații definite
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Total lunar (target 100%)</div>
          <div className="text-2xl font-bold text-gray-900">
            {grandTotalMonthly.toLocaleString("ro-RO")}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{currency}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Total anual estimat</div>
          <div className="text-2xl font-bold text-blue-700">
            {grandTotalAnnual.toLocaleString("ro-RO")}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{currency}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Posturi cu pachet</div>
          <div className="text-2xl font-bold text-gray-900">{packages.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">din {packages.length} definite</div>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Niciun pachet de compensații definit</p>
          <p className="text-sm">
            Mergi la{" "}
            <a href="/app/compensation/packages" className="text-blue-600 hover:underline">
              Pachete
            </a>{" "}
            pentru a crea primul pachet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => (
            <div
              key={dept.name}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">{dept.name}</h3>
                <div className="text-sm text-gray-600">
                  Lunar:{" "}
                  <span className="font-medium">
                    {dept.totalMonthly.toLocaleString("ro-RO")} {currency}
                  </span>
                  <span className="text-gray-400 mx-2">·</span>
                  Anual:{" "}
                  <span className="font-medium text-blue-700">
                    {(dept.totalMonthly * 12).toLocaleString("ro-RO")} {currency}
                  </span>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-2 text-xs text-gray-500 font-medium uppercase">Post</th>
                    <th className="text-right px-6 py-2 text-xs text-gray-500 font-medium uppercase">Salariu bază</th>
                    <th className="text-right px-6 py-2 text-xs text-gray-500 font-medium uppercase">Variable</th>
                    <th className="text-right px-6 py-2 text-xs text-gray-500 font-medium uppercase">Total lunar</th>
                    <th className="text-right px-6 py-2 text-xs text-gray-500 font-medium uppercase">Total anual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dept.packages.map((pkg) => {
                    const components = pkg.components as PackageComponent[]
                    const variable = components.reduce((sum, c) => {
                      if (c.type === "percentage") return sum + (pkg.baseSalary * c.value) / 100
                      return sum + c.value
                    }, 0)
                    const total = pkg.baseSalary + variable
                    return (
                      <tr key={pkg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {pkg.job.title}
                          {pkg.job.code && (
                            <span className="text-xs text-gray-400 ml-1">({pkg.job.code})</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-gray-600">
                          {pkg.baseSalary.toLocaleString("ro-RO")}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-gray-500">
                          +{Math.round(variable).toLocaleString("ro-RO")}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">
                          {Math.round(total).toLocaleString("ro-RO")}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-medium text-blue-700">
                          {Math.round(total * 12).toLocaleString("ro-RO")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* Grand total row */}
          <div className="bg-gray-900 rounded-xl p-5 flex items-center justify-between text-white">
            <span className="font-semibold">Total organizație</span>
            <div className="flex gap-8 text-right">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Lunar</div>
                <div className="font-bold text-lg">
                  {grandTotalMonthly.toLocaleString("ro-RO")} {currency}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Anual</div>
                <div className="font-bold text-lg text-blue-400">
                  {grandTotalAnnual.toLocaleString("ro-RO")} {currency}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
