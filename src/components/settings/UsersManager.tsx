"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UserRole, UserStatus } from "@/generated/prisma"

const inviteSchema = z.object({
  firstName: z.string().min(2, "Minim 2 caractere"),
  lastName: z.string().min(2, "Minim 2 caractere"),
  email: z.string().email("Email invalid"),
  role: z.nativeEnum(UserRole),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
})

type InviteData = z.infer<typeof inviteSchema>

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  status: UserStatus
  jobTitle?: string | null
  department?: { name: string } | null
}

interface Department {
  id: string
  name: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  COMPANY_ADMIN: "Administrator",
  OWNER: "Owner",
  FACILITATOR: "Facilitator",
  REPRESENTATIVE: "Reprezentant",
}

const ROLE_STYLES: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  COMPANY_ADMIN: "bg-blue-100 text-blue-700",
  OWNER: "bg-purple-100 text-purple-700",
  FACILITATOR: "bg-orange-100 text-orange-700",
  REPRESENTATIVE: "bg-gray-100 text-gray-700",
}

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  INVITED: "bg-yellow-100 text-yellow-700",
}

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Activ",
  INACTIVE: "Inactiv",
  INVITED: "Invitat",
}

export default function UsersManager({
  users,
  departments,
}: {
  users: User[]
  departments: Department[]
}) {
  const router = useRouter()
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: UserRole.REPRESENTATIVE },
  })

  async function onInvite(data: InviteData) {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/v1/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "A apărut o eroare.")
        setLoading(false)
        return
      }

      setSuccess(`${data.firstName} ${data.lastName} a fost invitat cu succes.`)
      reset()
      setShowInvite(false)
      router.refresh()
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Invite button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showInvite ? "Anulează" : "+ Invită utilizator"}
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <form
          onSubmit={handleSubmit(onInvite)}
          className="bg-blue-50 rounded-xl border border-blue-200 p-6 space-y-4"
        >
          <h3 className="font-semibold text-gray-900">Invită utilizator nou</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prenume *
              </label>
              <input
                {...register("firstName")}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nume *
              </label>
              <input
                {...register("lastName")}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <select
                {...register("role")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="REPRESENTATIVE">Reprezentant</option>
                <option value="FACILITATOR">Facilitator</option>
                <option value="OWNER">Owner</option>
                <option value="COMPANY_ADMIN">Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Funcție
              </label>
              <input
                {...register("jobTitle")}
                type="text"
                placeholder="ex: HR Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departament
              </label>
              <select
                {...register("departmentId")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Selectează —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setShowInvite(false); reset() }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Se trimite..." : "Trimite invitație"}
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Utilizator
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Departament
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {user.firstName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.email}
                        {user.jobTitle ? ` · ${user.jobTitle}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_STYLES[user.role]}`}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.department?.name ?? "—"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[user.status]}`}
                  >
                    {STATUS_LABELS[user.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
