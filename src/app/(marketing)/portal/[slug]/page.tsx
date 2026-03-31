import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import EmployeeRequestForm from "./EmployeeRequestForm"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { name: true } })
  return { title: tenant ? `Cerere Art. 7 — ${tenant.name}` : "Cerere transparență salarială" }
}

export default async function PublicEmployeePortalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { slug: true, name: true, status: true },
  })

  if (!tenant || tenant.status !== "ACTIVE") notFound()

  const salaryGrades = await prisma.salaryGrade.findMany({
    where: { tenant: { slug } },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Cerere transparență salarială</h1>
          <p className="text-sm text-gray-500 mt-2">
            {tenant.name} · Art. 7 Directiva EU 2023/970
          </p>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <p className="font-semibold mb-1">Dreptul dvs. la informare</p>
          <p>
            Conform Art. 7 al Directivei EU 2023/970, aveți dreptul să solicitați informații
            despre media sau mediana de remunerare pentru categoria de posturi similare cu a dvs.,
            defalcată pe gen. Angajatorul are obligația de a răspunde în termen de 2 luni.
          </p>
        </div>

        <EmployeeRequestForm tenantSlug={slug} salaryGrades={salaryGrades} />
      </div>
    </div>
  )
}
