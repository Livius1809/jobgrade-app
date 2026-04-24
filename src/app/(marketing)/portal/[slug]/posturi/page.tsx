import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import JobListingsClient from "./JobListingsClient"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { name: true } })
  return {
    title: tenant
      ? `Posturi disponibile — ${tenant.name}`
      : "Posturi disponibile",
  }
}

export default async function PublicJobListingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, status: true },
  })

  if (!tenant || tenant.status !== "ACTIVE") notFound()

  // Fetch active jobs with salary grades (via JobResult)
  const jobs = await prisma.job.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      title: true,
      code: true,
      purpose: true,
      description: true,
      responsibilities: true,
      requirements: true,
      department: { select: { name: true } },
      jobResults: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          salaryGrade: {
            select: {
              name: true,
              salaryMin: true,
              salaryMax: true,
              currency: true,
            },
          },
        },
      },
    },
    orderBy: { title: "asc" },
  })

  const listings = jobs.map((job) => {
    const grade = job.jobResults[0]?.salaryGrade
    return {
      id: job.id,
      title: job.title,
      code: job.code,
      department: job.department?.name ?? null,
      purpose: job.purpose,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      salaryGrade: grade?.name ?? null,
      salaryMin: grade?.salaryMin ? Number(grade.salaryMin) : null,
      salaryMax: grade?.salaryMax ? Number(grade.salaryMax) : null,
      currency: grade?.currency ?? "RON",
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-violet-600 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Posturi disponibile</h1>
          <p className="text-sm text-gray-500 mt-2">
            {tenant.name} · Conform Art. 5 Directiva EU 2023/970
          </p>
        </div>

        {/* Art. 5 compliance notice */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-8 text-sm text-violet-800">
          <p className="font-semibold mb-1">Transparenta salariala (Art. 5)</p>
          <p>
            Conform Directivei EU 2023/970, fiecare post afisat include intervalul salarial
            aplicabil. Nu solicitam si nu utilizam informatii despre salariul dvs. anterior.
            Criteriile de stabilire a salariului sunt obiective si neutre din perspectiva genului.
          </p>
        </div>

        <JobListingsClient
          listings={listings}
          companyName={tenant.name}
          portalSlug={slug}
        />
      </div>
    </div>
  )
}
