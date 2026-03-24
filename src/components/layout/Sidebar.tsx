"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserRole } from "@/generated/prisma"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: string
  roles?: UserRole[]
  children?: { href: string; label: string }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "📊",
  },
  {
    href: "/company",
    label: "Companie",
    icon: "🏢",
    roles: [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN],
    children: [
      { href: "/company", label: "Profil" },
      { href: "/company/departments", label: "Departamente" },
    ],
  },
  {
    href: "/jobs",
    label: "Fișe de post",
    icon: "📋",
    roles: [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OWNER],
    children: [
      { href: "/jobs", label: "Toate posturile" },
      { href: "/jobs/import", label: "Import Excel" },
    ],
  },
  {
    href: "/sessions",
    label: "Sesiuni",
    icon: "🎯",
    children: [
      { href: "/sessions?status=active", label: "Active" },
      { href: "/sessions?status=completed", label: "Finalizate" },
    ],
  },
  {
    href: "/compensation",
    label: "Compensații",
    icon: "💰",
    roles: [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OWNER],
    children: [
      { href: "/compensation/packages", label: "Pachete" },
      { href: "/compensation/kpis", label: "KPI-uri" },
      { href: "/compensation/simulations", label: "Simulări" },
      { href: "/compensation/budget", label: "Buget salarii" },
    ],
  },
  {
    href: "/ai-tools",
    label: "AI Tools",
    icon: "🤖",
    roles: [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OWNER],
    children: [
      { href: "/ai-tools/job-ad", label: "Anunț angajare" },
      { href: "/ai-tools/social-media", label: "Social Media" },
      { href: "/ai-tools/kpi-sheet", label: "Fișă KPI" },
      { href: "/ai-tools/analysis", label: "Analiză sesiune" },
    ],
  },
  {
    href: "/reports",
    label: "Rapoarte",
    icon: "📄",
    roles: [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OWNER],
  },
  {
    href: "/settings",
    label: "Setări",
    icon: "⚙️",
    roles: [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN],
    children: [
      { href: "/settings/users", label: "Utilizatori" },
      { href: "/settings/billing", label: "Facturare" },
      { href: "/settings/security", label: "Securitate" },
    ],
  },
]

interface SidebarProps {
  role: UserRole
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  )

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg" />
          <span className="font-bold text-gray-900">JobGrade</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>

              {/* Sub-navigare */}
              {item.children && isActive && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "block px-3 py-1.5 rounded-md text-sm transition-colors",
                        pathname === child.href
                          ? "text-blue-700 font-medium"
                          : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Credits */}
      <div className="p-3 border-t border-gray-200">
        <Link
          href="/settings/billing"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <span>💳</span>
          <span className="font-medium">Credite</span>
        </Link>
      </div>
    </aside>
  )
}
