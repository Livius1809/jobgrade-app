/**
 * permissions.ts — Sistem centralizat de permisiuni bazat pe roluri organizaționale
 *
 * Arhitectura:
 *   1. Utilizatorul are roluri organizaționale (OrgRole) — alocate la onboarding
 *   2. Fiecare OrgRole are drepturi (R/W/M) pe resurse (PermResource)
 *   3. Fiecare drept are un layer minim (0-4) — funcția trebuie să fie cumpărată
 *   4. checkPermission() verifică: user.orgRoles → matrice → tenant.layer
 *
 * Folosire:
 *   const ok = await checkPermission(userId, "PAY_GAP_REPORT", "READ")
 *   if (!ok) return 403
 */

import { prisma } from "@/lib/prisma"
import type { OrgRole, PermAction, PermResource } from "@/generated/prisma"
import { ORG_ROLE_DEFINITIONS } from "@/lib/permissions-definitions"

export { ORG_ROLE_DEFINITIONS }
export type { OrgRoleType, PermActionType, PermResourceType, OrgRoleDefinition } from "@/lib/permissions-definitions"

// ── Cache permisiuni (in-memory, per-request) ───────────────────────────

const ruleCache = new Map<string, { allowed: boolean; minLayer: number; condition: string | null }>()
let ruleCacheLoaded = false

async function loadRuleCache(): Promise<void> {
  if (ruleCacheLoaded) return
  const rules = await prisma.permissionRule.findMany()
  for (const r of rules) {
    const key = `${r.orgRole}:${r.resource}:${r.action}`
    ruleCache.set(key, { allowed: true, minLayer: r.minLayer, condition: r.condition })
  }
  ruleCacheLoaded = true
}

// ── Core check ──────────────────────────────────────────────────────────

export interface PermissionResult {
  allowed: boolean
  reason?: string
  matchedRole?: OrgRole
}

/**
 * Verifică dacă un user are dreptul să execute o acțiune pe o resursă.
 *
 * @param userId - ID-ul utilizatorului
 * @param resource - Resursa accesată
 * @param action - Acțiunea dorită (READ, WRITE, MODIFY)
 * @param context - Context opțional (ex: { ownerId: "..." } pentru condiția "own")
 */
export async function checkPermission(
  userId: string,
  resource: PermResource,
  action: PermAction,
  context?: { ownerId?: string; tenantId?: string }
): Promise<PermissionResult> {
  await loadRuleCache()

  // Fetch user org roles + tenant layer
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      role: true,
      orgRoles: { select: { orgRole: true } },
    },
  })

  if (!user) return { allowed: false, reason: "Utilizator inexistent" }

  // SUPER_ADMIN bypass — acces total
  if (user.role === "SUPER_ADMIN") {
    return { allowed: true, matchedRole: "DG" as OrgRole }
  }

  // Tenant isolation
  if (context?.tenantId && context.tenantId !== user.tenantId) {
    return { allowed: false, reason: "Acces cross-tenant interzis" }
  }

  // Get purchased layer
  const purchase = await prisma.servicePurchase.findUnique({
    where: { tenantId: user.tenantId },
    select: { layer: true },
  })
  const currentLayer = purchase?.layer ?? 0

  // Get user's org roles
  const userOrgRoles = user.orgRoles.map((r) => r.orgRole)

  // Fallback: dacă nu are roluri organizaționale alocate, mapează din UserRole vechi
  if (userOrgRoles.length === 0) {
    const fallbackRoles = mapLegacyRole(user.role)
    userOrgRoles.push(...fallbackRoles)
  }

  // Check fiecare rol — e suficient ca UN rol să aibă dreptul
  for (const orgRole of userOrgRoles) {
    const key = `${orgRole}:${resource}:${action}`
    const rule = ruleCache.get(key)

    if (!rule) continue
    if (currentLayer < rule.minLayer) continue

    // Verifică condiție suplimentară
    if (rule.condition === "own" && context?.ownerId && context.ownerId !== userId) {
      continue
    }

    return { allowed: true, matchedRole: orgRole }
  }

  return {
    allowed: false,
    reason: `Niciun rol din [${userOrgRoles.join(", ")}] nu are dreptul ${action} pe ${resource} (layer curent: ${currentLayer})`,
  }
}

/**
 * Verifică permisiunea și returnează 403 NextResponse dacă nu e permis.
 * Folosit în API routes.
 */
export async function requirePermission(
  userId: string,
  resource: PermResource,
  action: PermAction,
  context?: { ownerId?: string; tenantId?: string }
): Promise<PermissionResult & { denied?: Response }> {
  const result = await checkPermission(userId, resource, action, context)
  if (!result.allowed) {
    const { NextResponse } = await import("next/server")
    return {
      ...result,
      denied: NextResponse.json(
        { message: `Acces interzis: ${result.reason}` },
        { status: 403 }
      ),
    }
  }
  return result
}

// ── Fallback mapping din rolul vechi ────────────────────────────────────

function mapLegacyRole(role: string): OrgRole[] {
  switch (role) {
    case "OWNER":
      return ["DG" as OrgRole]
    case "COMPANY_ADMIN":
      return ["DHR" as OrgRole]
    case "FACILITATOR":
      return ["FJE" as OrgRole]
    case "REPRESENTATIVE":
      return ["SAL" as OrgRole]
    default:
      return ["SAL" as OrgRole]
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Returnează toate drepturile efective ale unui user (pentru UI).
 */
export async function getUserPermissions(
  userId: string
): Promise<{ resource: PermResource; action: PermAction; orgRole: OrgRole }[]> {
  await loadRuleCache()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      tenantId: true,
      orgRoles: { select: { orgRole: true } },
    },
  })
  if (!user) return []

  const purchase = await prisma.servicePurchase.findUnique({
    where: { tenantId: user.tenantId },
    select: { layer: true },
  })
  const currentLayer = purchase?.layer ?? 0

  let userOrgRoles = user.orgRoles.map((r) => r.orgRole)
  if (userOrgRoles.length === 0) {
    userOrgRoles = mapLegacyRole(user.role)
  }

  const permissions: { resource: PermResource; action: PermAction; orgRole: OrgRole }[] = []

  for (const [key, rule] of ruleCache.entries()) {
    if (currentLayer < rule.minLayer) continue
    const [orgRole, resource, action] = key.split(":") as [OrgRole, PermResource, PermAction]
    if (userOrgRoles.includes(orgRole)) {
      permissions.push({ resource, action, orgRole })
    }
  }

  return permissions
}

/**
 * Returnează rolurile organizaționale lipsă (obligatorii) pentru un tenant.
 */
export async function getMissingRoles(
  tenantId: string
): Promise<{ role: OrgRole; label: string; required: boolean }[]> {
  const assigned = await prisma.userOrgRole.findMany({
    where: { tenantId },
    select: { orgRole: true },
    distinct: ["orgRole"],
  })
  const assignedRoles = new Set(assigned.map((r) => r.orgRole))

  return ORG_ROLE_DEFINITIONS.filter((def) => !assignedRoles.has(def.role)).map((def) => ({
    role: def.role,
    label: def.label,
    required: def.required,
  }))
}

/**
 * Resetează cache-ul (folosit la teste sau după seed).
 */
export function clearPermissionCache(): void {
  ruleCache.clear()
  ruleCacheLoaded = false
}

// ── Matrice completă de permisiuni (pentru seed) ────────────────────────

export const PERMISSION_MATRIX: {
  orgRole: OrgRole
  resource: PermResource
  action: PermAction
  minLayer: number
  condition?: string
}[] = [
  // ════════════════ DG (Director General) ════════════════
  // Layer 1
  { orgRole: "DG", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "DG", resource: "JOBS", action: "WRITE", minLayer: 1 },
  { orgRole: "DG", resource: "JOBS", action: "MODIFY", minLayer: 1 },
  { orgRole: "DG", resource: "JOB_POSTINGS", action: "READ", minLayer: 1 },
  { orgRole: "DG", resource: "SESSIONS", action: "READ", minLayer: 1 },
  { orgRole: "DG", resource: "SESSIONS", action: "WRITE", minLayer: 1 },
  { orgRole: "DG", resource: "SESSIONS", action: "MODIFY", minLayer: 1 },
  { orgRole: "DG", resource: "EMPLOYEE_REQUESTS", action: "READ", minLayer: 1 },
  { orgRole: "DG", resource: "EMPLOYEE_REQUESTS", action: "WRITE", minLayer: 1 },
  { orgRole: "DG", resource: "SETTINGS", action: "READ", minLayer: 1 },
  { orgRole: "DG", resource: "SETTINGS", action: "WRITE", minLayer: 1 },
  { orgRole: "DG", resource: "SETTINGS", action: "MODIFY", minLayer: 1 },
  { orgRole: "DG", resource: "BILLING", action: "READ", minLayer: 1 },
  { orgRole: "DG", resource: "BILLING", action: "WRITE", minLayer: 1 },
  { orgRole: "DG", resource: "USERS", action: "READ", minLayer: 1 },
  { orgRole: "DG", resource: "USERS", action: "WRITE", minLayer: 1 },
  { orgRole: "DG", resource: "USERS", action: "MODIFY", minLayer: 1 },
  { orgRole: "DG", resource: "AUDIT_TRAIL", action: "READ", minLayer: 1 },
  // Layer 2
  { orgRole: "DG", resource: "SALARY_GRADES", action: "READ", minLayer: 2 },
  { orgRole: "DG", resource: "SALARY_GRADES", action: "WRITE", minLayer: 2 },
  { orgRole: "DG", resource: "SALARY_DATA", action: "READ", minLayer: 2 },
  { orgRole: "DG", resource: "PAY_GAP_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "DG", resource: "PAY_GAP_REPORT", action: "WRITE", minLayer: 2 },
  { orgRole: "DG", resource: "PAY_GAP_JUSTIFICATIONS", action: "READ", minLayer: 2 },
  { orgRole: "DG", resource: "PAY_GAP_JUSTIFICATIONS", action: "WRITE", minLayer: 2 },
  { orgRole: "DG", resource: "JOINT_ASSESSMENT", action: "READ", minLayer: 2 },
  { orgRole: "DG", resource: "JOINT_ASSESSMENT", action: "WRITE", minLayer: 2 },
  { orgRole: "DG", resource: "JOINT_ASSESSMENT", action: "MODIFY", minLayer: 2 },
  { orgRole: "DG", resource: "COMPLIANCE_REPORT", action: "READ", minLayer: 2 },
  // Layer 3
  { orgRole: "DG", resource: "BENCHMARK", action: "READ", minLayer: 3 },
  // Layer 4
  { orgRole: "DG", resource: "PERSONNEL_EVAL", action: "READ", minLayer: 4 },
  { orgRole: "DG", resource: "PERSONNEL_EVAL", action: "WRITE", minLayer: 4 },
  { orgRole: "DG", resource: "ORG_DEVELOPMENT", action: "READ", minLayer: 4 },
  { orgRole: "DG", resource: "ORG_DEVELOPMENT", action: "WRITE", minLayer: 4 },

  // ════════════════ IDG (Împuternicit DG) ════════════════
  // Moștenește drepturile DG minus BILLING WRITE și SETTINGS MODIFY
  { orgRole: "IDG", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "IDG", resource: "JOBS", action: "WRITE", minLayer: 1 },
  { orgRole: "IDG", resource: "JOBS", action: "MODIFY", minLayer: 1 },
  { orgRole: "IDG", resource: "JOB_POSTINGS", action: "READ", minLayer: 1 },
  { orgRole: "IDG", resource: "SESSIONS", action: "READ", minLayer: 1 },
  { orgRole: "IDG", resource: "SESSIONS", action: "WRITE", minLayer: 1 },
  { orgRole: "IDG", resource: "SESSIONS", action: "MODIFY", minLayer: 1 },
  { orgRole: "IDG", resource: "EMPLOYEE_REQUESTS", action: "READ", minLayer: 1 },
  { orgRole: "IDG", resource: "EMPLOYEE_REQUESTS", action: "WRITE", minLayer: 1 },
  { orgRole: "IDG", resource: "SETTINGS", action: "READ", minLayer: 1 },
  { orgRole: "IDG", resource: "SETTINGS", action: "WRITE", minLayer: 1 },
  { orgRole: "IDG", resource: "BILLING", action: "READ", minLayer: 1 },
  { orgRole: "IDG", resource: "USERS", action: "READ", minLayer: 1 },
  { orgRole: "IDG", resource: "USERS", action: "WRITE", minLayer: 1 },
  { orgRole: "IDG", resource: "AUDIT_TRAIL", action: "READ", minLayer: 1 },
  { orgRole: "IDG", resource: "SALARY_GRADES", action: "READ", minLayer: 2 },
  { orgRole: "IDG", resource: "SALARY_GRADES", action: "WRITE", minLayer: 2 },
  { orgRole: "IDG", resource: "SALARY_DATA", action: "READ", minLayer: 2 },
  { orgRole: "IDG", resource: "PAY_GAP_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "IDG", resource: "PAY_GAP_JUSTIFICATIONS", action: "READ", minLayer: 2 },
  { orgRole: "IDG", resource: "JOINT_ASSESSMENT", action: "READ", minLayer: 2 },
  { orgRole: "IDG", resource: "JOINT_ASSESSMENT", action: "WRITE", minLayer: 2 },
  { orgRole: "IDG", resource: "COMPLIANCE_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "IDG", resource: "BENCHMARK", action: "READ", minLayer: 3 },
  { orgRole: "IDG", resource: "PERSONNEL_EVAL", action: "READ", minLayer: 4 },
  { orgRole: "IDG", resource: "ORG_DEVELOPMENT", action: "READ", minLayer: 4 },

  // ════════════════ DHR (Director HR) ════════════════
  { orgRole: "DHR", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "DHR", resource: "JOBS", action: "WRITE", minLayer: 1 },
  { orgRole: "DHR", resource: "JOBS", action: "MODIFY", minLayer: 1 },
  { orgRole: "DHR", resource: "JOB_POSTINGS", action: "READ", minLayer: 1 },
  { orgRole: "DHR", resource: "JOB_POSTINGS", action: "WRITE", minLayer: 1 },
  { orgRole: "DHR", resource: "SESSIONS", action: "READ", minLayer: 1 },
  { orgRole: "DHR", resource: "SESSIONS", action: "WRITE", minLayer: 1 },
  { orgRole: "DHR", resource: "EMPLOYEE_REQUESTS", action: "READ", minLayer: 1 },
  { orgRole: "DHR", resource: "EMPLOYEE_REQUESTS", action: "WRITE", minLayer: 1 },
  { orgRole: "DHR", resource: "SETTINGS", action: "READ", minLayer: 1 },
  { orgRole: "DHR", resource: "SETTINGS", action: "WRITE", minLayer: 1 },
  { orgRole: "DHR", resource: "USERS", action: "READ", minLayer: 1 },
  { orgRole: "DHR", resource: "USERS", action: "WRITE", minLayer: 1 },
  { orgRole: "DHR", resource: "AUDIT_TRAIL", action: "READ", minLayer: 1 },
  { orgRole: "DHR", resource: "SALARY_GRADES", action: "READ", minLayer: 2 },
  { orgRole: "DHR", resource: "SALARY_GRADES", action: "WRITE", minLayer: 2 },
  { orgRole: "DHR", resource: "SALARY_DATA", action: "READ", minLayer: 2 },
  { orgRole: "DHR", resource: "SALARY_DATA", action: "WRITE", minLayer: 2 },
  { orgRole: "DHR", resource: "PAY_GAP_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "DHR", resource: "PAY_GAP_REPORT", action: "WRITE", minLayer: 2 },
  { orgRole: "DHR", resource: "PAY_GAP_JUSTIFICATIONS", action: "READ", minLayer: 2 },
  { orgRole: "DHR", resource: "PAY_GAP_JUSTIFICATIONS", action: "WRITE", minLayer: 2 },
  { orgRole: "DHR", resource: "JOINT_ASSESSMENT", action: "READ", minLayer: 2 },
  { orgRole: "DHR", resource: "JOINT_ASSESSMENT", action: "WRITE", minLayer: 2 },
  { orgRole: "DHR", resource: "COMPLIANCE_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "DHR", resource: "BENCHMARK", action: "READ", minLayer: 3 },
  { orgRole: "DHR", resource: "BENCHMARK", action: "WRITE", minLayer: 3 },
  { orgRole: "DHR", resource: "PERSONNEL_EVAL", action: "READ", minLayer: 4 },
  { orgRole: "DHR", resource: "PERSONNEL_EVAL", action: "WRITE", minLayer: 4 },
  { orgRole: "DHR", resource: "ORG_DEVELOPMENT", action: "READ", minLayer: 4 },
  { orgRole: "DHR", resource: "ORG_DEVELOPMENT", action: "WRITE", minLayer: 4 },

  // ════════════════ RSAL (Responsabil Salarizare) ════════════════
  { orgRole: "RSAL", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "RSAL", resource: "SESSIONS", action: "READ", minLayer: 1 },
  { orgRole: "RSAL", resource: "EMPLOYEE_REQUESTS", action: "READ", minLayer: 1 },
  { orgRole: "RSAL", resource: "EMPLOYEE_REQUESTS", action: "WRITE", minLayer: 1 },
  { orgRole: "RSAL", resource: "SALARY_GRADES", action: "READ", minLayer: 2 },
  { orgRole: "RSAL", resource: "SALARY_GRADES", action: "WRITE", minLayer: 2 },
  { orgRole: "RSAL", resource: "SALARY_DATA", action: "READ", minLayer: 2 },
  { orgRole: "RSAL", resource: "SALARY_DATA", action: "WRITE", minLayer: 2 },
  { orgRole: "RSAL", resource: "PAY_GAP_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "RSAL", resource: "PAY_GAP_JUSTIFICATIONS", action: "READ", minLayer: 2 },
  { orgRole: "RSAL", resource: "PAY_GAP_JUSTIFICATIONS", action: "WRITE", minLayer: 2 },
  { orgRole: "RSAL", resource: "COMPLIANCE_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "RSAL", resource: "BENCHMARK", action: "READ", minLayer: 3 },

  // ════════════════ RREC (Responsabil Recrutare) ════════════════
  { orgRole: "RREC", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "RREC", resource: "JOBS", action: "WRITE", minLayer: 1 },
  { orgRole: "RREC", resource: "JOB_POSTINGS", action: "READ", minLayer: 1 },
  { orgRole: "RREC", resource: "JOB_POSTINGS", action: "WRITE", minLayer: 1 },
  { orgRole: "RREC", resource: "SALARY_GRADES", action: "READ", minLayer: 2 },
  { orgRole: "RREC", resource: "BENCHMARK", action: "READ", minLayer: 3 },

  // ════════════════ RAP (Responsabil Administrare Personal) ════════════════
  { orgRole: "RAP", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "RAP", resource: "EMPLOYEE_REQUESTS", action: "READ", minLayer: 1 },
  { orgRole: "RAP", resource: "EMPLOYEE_REQUESTS", action: "WRITE", minLayer: 1 },
  { orgRole: "RAP", resource: "SALARY_DATA", action: "READ", minLayer: 2 },
  { orgRole: "RAP", resource: "SALARY_DATA", action: "WRITE", minLayer: 2 },
  { orgRole: "RAP", resource: "AUDIT_TRAIL", action: "READ", minLayer: 1 },

  // ════════════════ RLD (Responsabil L&D) ════════════════
  { orgRole: "RLD", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "RLD", resource: "SESSIONS", action: "READ", minLayer: 1 },
  { orgRole: "RLD", resource: "PERSONNEL_EVAL", action: "READ", minLayer: 4 },
  { orgRole: "RLD", resource: "PERSONNEL_EVAL", action: "WRITE", minLayer: 4 },
  { orgRole: "RLD", resource: "ORG_DEVELOPMENT", action: "READ", minLayer: 4 },
  { orgRole: "RLD", resource: "ORG_DEVELOPMENT", action: "WRITE", minLayer: 4 },

  // ════════════════ FJE (Facilitator Evaluare Posturi) ════════════════
  { orgRole: "FJE", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "FJE", resource: "SESSIONS", action: "READ", minLayer: 1 },
  { orgRole: "FJE", resource: "SESSIONS", action: "WRITE", minLayer: 1 },
  { orgRole: "FJE", resource: "SESSIONS", action: "MODIFY", minLayer: 1 },

  // ════════════════ FA10 (Facilitator Evaluare Comună) ════════════════
  { orgRole: "FA10", resource: "JOINT_ASSESSMENT", action: "READ", minLayer: 2 },
  { orgRole: "FA10", resource: "JOINT_ASSESSMENT", action: "WRITE", minLayer: 2 },
  { orgRole: "FA10", resource: "JOINT_ASSESSMENT", action: "MODIFY", minLayer: 2 },
  { orgRole: "FA10", resource: "PAY_GAP_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "FA10", resource: "SALARY_GRADES", action: "READ", minLayer: 2 },

  // ════════════════ REPS (Reprezentant Salariați) ════════════════
  { orgRole: "REPS", resource: "JOINT_ASSESSMENT", action: "READ", minLayer: 2 },
  { orgRole: "REPS", resource: "JOINT_ASSESSMENT", action: "WRITE", minLayer: 2 }, // vot + semnătură
  { orgRole: "REPS", resource: "PAY_GAP_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "REPS", resource: "COMPLIANCE_REPORT", action: "READ", minLayer: 2 },

  // ════════════════ REPM (Reprezentant Management) ════════════════
  { orgRole: "REPM", resource: "JOINT_ASSESSMENT", action: "READ", minLayer: 2 },
  { orgRole: "REPM", resource: "JOINT_ASSESSMENT", action: "WRITE", minLayer: 2 },
  { orgRole: "REPM", resource: "PAY_GAP_REPORT", action: "READ", minLayer: 2 },

  // ════════════════ CEXT (Consultant Extern) ════════════════
  { orgRole: "CEXT", resource: "JOBS", action: "READ", minLayer: 1 },
  { orgRole: "CEXT", resource: "SESSIONS", action: "READ", minLayer: 1 },
  { orgRole: "CEXT", resource: "SESSIONS", action: "WRITE", minLayer: 1, condition: "own" },
  { orgRole: "CEXT", resource: "SALARY_GRADES", action: "READ", minLayer: 2 },
  { orgRole: "CEXT", resource: "PAY_GAP_REPORT", action: "READ", minLayer: 2 },
  { orgRole: "CEXT", resource: "JOINT_ASSESSMENT", action: "READ", minLayer: 2 },
  { orgRole: "CEXT", resource: "BENCHMARK", action: "READ", minLayer: 3 },

  // ════════════════ SAL (Salariat) ════════════════
  { orgRole: "SAL", resource: "JOB_POSTINGS", action: "READ", minLayer: 0 },
  { orgRole: "SAL", resource: "EMPLOYEE_REQUESTS", action: "WRITE", minLayer: 0 },
] as { orgRole: OrgRole; resource: PermResource; action: PermAction; minLayer: number; condition?: string }[]
