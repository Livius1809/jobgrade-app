"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ORG_ROLE_DEFINITIONS, type OrgRoleType } from "@/lib/permissions-definitions"

type OrgRole = OrgRoleType

interface UserInfo {
  id: string
  firstName: string
  lastName: string
  email: string
  jobTitle: string | null
  role: string
  orgRoles: { id: string; orgRole: OrgRole; assignedAt: string }[]
}

interface Props {
  users: UserInfo[]
  assignedRoles: OrgRole[]
  currentLayer: number
  currentUserId: string
  isOnboarding?: boolean
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  management: { label: "Management", color: "bg-blue-100 text-blue-700" },
  hr: { label: "Departament HR", color: "bg-violet-100 text-violet-700" },
  process: { label: "Roluri de proces", color: "bg-amber-100 text-amber-700" },
  external: { label: "Extern", color: "bg-gray-100 text-gray-600" },
  employee: { label: "Angajat", color: "bg-green-100 text-green-700" },
}

export default function RolesConfigClient({
  users,
  assignedRoles,
  currentLayer,
  currentUserId,
  isOnboarding = false,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [step, setStep] = useState<"overview" | "assign" | "invite">(
    isOnboarding ? "overview" : "overview"
  )
  // Invitare persoane noi
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteFirstName, setInviteFirstName] = useState("")
  const [inviteLastName, setInviteLastName] = useState("")
  const [inviteRole, setInviteRole] = useState<OrgRole | "">("")
  const [inviteError, setInviteError] = useState("")

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !inviteRole) {
      setInviteError("Email si rol sunt obligatorii.")
      return
    }
    setInviteError("")
    setSaving(true)
    try {
      const res = await fetch("/api/v1/org-roles/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          firstName: inviteFirstName.trim(),
          lastName: inviteLastName.trim(),
          orgRole: inviteRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.message ?? "Eroare la invitare.")
      } else {
        setInviteEmail("")
        setInviteFirstName("")
        setInviteLastName("")
        setInviteRole("")
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }, [inviteEmail, inviteFirstName, inviteLastName, inviteRole, router])

  const missingRequired = ORG_ROLE_DEFINITIONS
    .filter((d) => d.required && !assignedRoles.includes(d.role))

  const handleAssignRole = useCallback(
    async (userId: string, orgRole: OrgRole) => {
      setSaving(true)
      try {
        await fetch("/api/v1/org-roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, orgRole }),
        })
        router.refresh()
      } finally {
        setSaving(false)
      }
    },
    [router]
  )

  const handleRemoveRole = useCallback(
    async (assignmentId: string) => {
      setSaving(true)
      try {
        await fetch(`/api/v1/org-roles/${assignmentId}`, { method: "DELETE" })
        router.refresh()
      } finally {
        setSaving(false)
      }
    },
    [router]
  )

  // Grupează definiții pe categorii
  const categories = Object.entries(CATEGORY_LABELS).map(([key, cfg]) => ({
    key,
    ...cfg,
    roles: ORG_ROLE_DEFINITIONS.filter((d) => d.category === key),
  }))

  return (
    <div className="space-y-6">
      {/* Banner onboarding */}
      {isOnboarding && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
          <h3 className="text-base font-semibold text-violet-900 mb-2">
            Configurati echipa inainte de a incepe
          </h3>
          <p className="text-sm text-violet-700 mb-3">
            Alocati rolurile organizationale persoanelor din echipa HR. Platforma va
            activa automat functiunile corespunzatoare fiecarui rol. Puteti reveni
            oricand la aceasta pagina din Setari.
          </p>
          <div className="flex gap-2">
            <a
              href="/portal"
              className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Am terminat, mergi la portal →
            </a>
            <span className="text-xs text-violet-500 self-center">
              (puteti continua si dupa ce alocati cel putin DG si DHR)
            </span>
          </div>
        </div>
      )}

      {/* Roluri lipsă obligatorii */}
      {missingRequired.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Roluri obligatorii nealocate
          </h3>
          <div className="flex gap-2 flex-wrap">
            {missingRequired.map((d) => (
              <span
                key={d.role}
                className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium"
              >
                {d.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Alocati aceste roluri pentru a debloca toate functiunile platformei.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["overview", "assign", "invite"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStep(tab)}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              step === tab
                ? "bg-violet-600 text-white border-violet-600"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab === "overview"
              ? "Vedere per rol"
              : tab === "assign"
              ? "Alocare per persoana"
              : "Invita persoana noua"}
          </button>
        ))}
      </div>

      {/* STEP 1: Overview per rol */}
      {step === "overview" && (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat.key}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded ${cat.color}`}>{cat.label}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cat.roles.map((def) => {
                  const assignedUsers = users.filter((u) =>
                    u.orgRoles.some((r) => r.orgRole === def.role)
                  )
                  const isAssigned = assignedRoles.includes(def.role)

                  return (
                    <div
                      key={def.role}
                      className={`border rounded-lg p-4 ${
                        isAssigned
                          ? "border-green-200 bg-green-50/30"
                          : def.required
                          ? "border-amber-200 bg-amber-50/30"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {def.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {def.description}
                          </div>
                        </div>
                        {def.required && !isAssigned && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                            Obligatoriu
                          </span>
                        )}
                        {isAssigned && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                            Alocat
                          </span>
                        )}
                      </div>

                      {/* Persoane alocate */}
                      {assignedUsers.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {assignedUsers.map((u) => {
                            const assignment = u.orgRoles.find(
                              (r) => r.orgRole === def.role
                            )!
                            return (
                              <div
                                key={u.id}
                                className="flex items-center justify-between text-xs bg-white rounded px-2 py-1"
                              >
                                <span className="text-gray-700">
                                  {u.firstName} {u.lastName}
                                  <span className="text-gray-400 ml-1">
                                    {u.jobTitle ?? u.email}
                                  </span>
                                </span>
                                <button
                                  onClick={() => handleRemoveRole(assignment.id)}
                                  disabled={saving}
                                  className="text-red-400 hover:text-red-600 text-[10px]"
                                >
                                  Retrage
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Quick assign */}
                      {!isAssigned && (
                        <div className="mt-2">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignRole(e.target.value, def.role)
                                e.target.value = ""
                              }
                            }}
                            disabled={saving}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-violet-500"
                          >
                            <option value="">+ Aloca o persoana...</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.firstName} {u.lastName} ({u.email})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 2: Assign per persoana */}
      {step === "assign" && (
        <div className="space-y-4">
          {/* User selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Selectati persoana
            </label>
            <select
              value={selectedUser ?? ""}
              onChange={(e) => setSelectedUser(e.target.value || null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">— Alegeti —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} — {u.jobTitle ?? u.email} ({u.orgRoles.length} roluri)
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (() => {
            const user = users.find((u) => u.id === selectedUser)
            if (!user) return null
            const userRoles = user.orgRoles.map((r) => r.orgRole)

            return (
              <div className="space-y-4">
                {/* Roluri curente */}
                {user.orgRoles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Roluri alocate
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {user.orgRoles.map((r) => {
                        const def = ORG_ROLE_DEFINITIONS.find((d) => d.role === r.orgRole)
                        return (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full"
                          >
                            {def?.label ?? r.orgRole}
                            <button
                              onClick={() => handleRemoveRole(r.id)}
                              disabled={saving}
                              className="text-violet-400 hover:text-red-600 ml-1"
                            >
                              x
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Roluri disponibile */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Roluri disponibile
                  </h4>
                  <div className="space-y-2">
                    {ORG_ROLE_DEFINITIONS
                      .filter((d) => !userRoles.includes(d.role))
                      .map((def) => {
                        // Verifică cumulabilitate cu rolurile existente
                        const canCumulate = userRoles.every(
                          (existing) =>
                            def.cumulableWith.includes(existing) ||
                            ORG_ROLE_DEFINITIONS
                              .find((d) => d.role === existing)
                              ?.cumulableWith.includes(def.role)
                        )

                        return (
                          <div
                            key={def.role}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              canCumulate
                                ? "border-gray-200 hover:border-violet-300"
                                : "border-red-100 bg-red-50/30 opacity-60"
                            }`}
                          >
                            <div>
                              <div className="text-sm text-gray-900">{def.label}</div>
                              <div className="text-xs text-gray-500">{def.description}</div>
                              {!canCumulate && (
                                <div className="text-[10px] text-red-600 mt-1">
                                  Incompatibil cu rolurile existente
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleAssignRole(user.id, def.role)}
                              disabled={saving || !canCumulate}
                              className="px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors shrink-0"
                            >
                              Aloca
                            </button>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* STEP 3: Invitare persoana noua */}
      {step === "invite" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Invitati o persoana noua in platforma
          </h3>
          <p className="text-xs text-gray-500">
            Persoana va primi un email cu link de autentificare. Rolul organizational
            va fi alocat automat la crearea contului.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 font-medium">Prenume</label>
              <input
                type="text"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
                placeholder="ex: Maria"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Nume</label>
              <input
                type="text"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
                placeholder="ex: Ionescu"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@companie.ro"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 font-medium">
              Rol organizational <span className="text-red-500">*</span>
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">— Selectati rolul —</option>
              {ORG_ROLE_DEFINITIONS.map((def) => (
                <option key={def.role} value={def.role}>
                  {def.label}
                </option>
              ))}
            </select>
          </div>

          {inviteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {inviteError}
            </div>
          )}

          <button
            onClick={handleInvite}
            disabled={saving || !inviteEmail.trim() || !inviteRole}
            className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Se trimite..." : "Trimite invitatie"}
          </button>
        </div>
      )}

      {/* Layer info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500">
        <strong>Layer curent: {currentLayer}</strong> — Drepturile efective depind de modulele cumparate.
        {currentLayer < 4 && (
          <span> Achizitionati module suplimentare pentru a debloca mai multe functiuni.</span>
        )}
      </div>
    </div>
  )
}
