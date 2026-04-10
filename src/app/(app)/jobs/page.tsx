import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"
import { JobStatus } from "@/generated/prisma"

export const metadata = { title: "Fișe de post" }

const STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "Ciornă",
  ACTIVE: "Activ",
  ARCHIVED: "Arhivat",
}

const STATUS_STYLES: Record<JobStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-yellow-100 text-yellow-700",
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  const tenantId = session!.user.tenantId

  const status = (params.status as JobStatus) || undefined
  const search = params.search || ""
  const page = Number(params.page) || 1
  const limit = 20

  const where = {
    tenantId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        department: { select: { name: true } },
        representative: {
          select: { firstName: true, lastName: true },
        },
        _count: { select: { sessionJobs: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.job.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fișe de post</h1>
          <p className="text-sm text-gray-500 mt-1">{total} fișe în total</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/jobs/import"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Import Excel
          </Link>
          <Link
            href="/jobs/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Fișă nouă
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form className="flex gap-3 items-center">
          <input
            name="search"
            defaultValue={search}
            placeholder="Caută după titlu sau cod..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="status"
            defaultValue={status || ""}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Toate statusurile</option>
            <option value="DRAFT">Ciornă</option>
            <option value="ACTIVE">Activ</option>
            <option value="ARCHIVED">Arhivat</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Filtrează
          </button>
          {(search || status) && (
            <Link
              href="/jobs"
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Resetează
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {jobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-2">Nicio fișă de post</p>
            <p className="text-gray-400 text-sm mb-6">
              Adaugă prima fișă de post pentru a începe evaluarea
            </p>
            <Link
              href="/jobs/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Fișă nouă
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titlu / Cod
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departament
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reprezentant
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sesiuni
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creat
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {job.title}
                    </Link>
                    {job.code && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {job.code}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {job.department?.name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {job.representative
                      ? `${job.representative.firstName} ${job.representative.lastName}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[job.status]}`}
                    >
                      {STATUS_LABELS[job.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {job._count.sessionJobs}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {formatDateTime(job.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Editează
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} din{" "}
            {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/jobs?page=${page - 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/jobs?page=${page + 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Următor →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
