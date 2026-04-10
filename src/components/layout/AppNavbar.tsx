"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { UserRole } from "@/generated/prisma"

interface AppNavbarProps {
  user: {
    id: string
    name: string
    email: string
    tenantId: string
    role: UserRole
  }
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  COMPANY_ADMIN: "Administrator",
  OWNER: "Owner",
  FACILITATOR: "Facilitator",
  REPRESENTATIVE: "Reprezentant",
}

export default function AppNavbar({ user }: AppNavbarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Breadcrumb placeholder */}
      <div />

      {/* Dreapta */}
      <div className="flex items-center gap-4">
        {/* Notificări */}
        <Link
          href="/app/notifications"
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          🔔
        </Link>

        {/* Credite */}
        <Link
          href="/settings/billing"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          💳 <span>credite</span>
        </Link>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</div>
          </div>
          <div className="relative group">
            <button className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-blue-700 transition-colors">
              {user.name?.charAt(0).toUpperCase()}
            </button>
            {/* Dropdown */}
            <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-50">
              <Link
                href="/settings/security"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Profilul meu
              </Link>
              <hr className="my-1" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Deconectare
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
