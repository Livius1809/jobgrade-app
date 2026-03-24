"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Department {
  id: string
  name: string
  isActive: boolean
  _count: { jobs: number; users: number }
}

export default function DepartmentsManager({
  departments: initial,
}: {
  departments: Department[]
}) {
  const router = useRouter()
  const [departments, setDepartments] = useState(initial)
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  async function addDepartment() {
    if (!newName.trim()) return
    setAdding(true)
    setError("")

    try {
      const res = await fetch("/api/v1/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Eroare la adăugare.")
        setAdding(false)
        return
      }

      setNewName("")
      router.refresh()
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await fetch(`/api/v1/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      router.refresh()
    } catch {
      setError("Eroare la actualizare.")
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add new */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDepartment()}
            type="text"
            placeholder="Numele departamentului..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addDepartment}
            disabled={adding || !newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? "Se adaugă..." : "+ Adaugă"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {departments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Niciun departament adăugat.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <div
                    className={`font-medium text-sm ${
                      dept.isActive ? "text-gray-900" : "text-gray-400 line-through"
                    }`}
                  >
                    {dept.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {dept._count.jobs} joburi · {dept._count.users} utilizatori
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(dept.id, dept.isActive)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    dept.isActive
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {dept.isActive ? "Dezactivează" : "Activează"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
