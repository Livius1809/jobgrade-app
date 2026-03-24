import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import JobForm from "@/components/jobs/JobForm"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"

export const metadata = { title: "Editează fișa de post" }

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params
  const tenantId = session!.user.tenantId

  const [job, departments, representatives] = await Promise.all([
    prisma.job.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        representative: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
          },
        },
        sessionJobs: {
          include: {
            session: {
              select: { id: true, name: true, status: true, createdAt: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.department.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { tenantId, role: "REPRESENTATIVE", status: "ACTIVE" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ])

  if (!job) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          {job.code && (
            <p className="text-sm text-gray-500 mt-1">Cod: {job.code}</p>
          )}
        </div>
        <Link
          href="/app/jobs"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Înapoi
        </Link>
      </div>

      <JobForm
        departments={departments}
        representatives={representatives}
        defaultValues={{
          title: job.title,
          code: job.code ?? "",
          departmentId: job.departmentId ?? "",
          representativeId: job.representativeId ?? "",
          purpose: job.purpose ?? "",
          responsibilities: job.responsibilities ?? "",
          requirements: job.requirements ?? "",
          status: job.status,
        }}
        jobId={job.id}
      />

      {/* Sesiuni asociate */}
      {job.sessionJobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Sesiuni de evaluare
          </h2>
          <div className="space-y-2">
            {job.sessionJobs.map((sj) => (
              <div
                key={sj.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <Link
                    href={`/app/sessions/${sj.session.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {sj.session.name}
                  </Link>
                  <div className="text-xs text-gray-400">
                    {formatDateTime(sj.session.createdAt)}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                  {sj.session.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
