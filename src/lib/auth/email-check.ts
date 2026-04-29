/**
 * Verificare email activ la login — mecanism revocare acces B2B
 *
 * La fiecare login:
 * 1. Verifică dacă email-ul e încă activ (OAuth token valid)
 * 2. Dacă dezactivat → SUSPENDED imediat
 * 3. Notifică toți adminii tenantului
 * 4. Revocare = confirmare cumulativă (toți adminii)
 */

import { prisma } from "@/lib/prisma"

interface EmailCheckResult {
  valid: boolean
  reason?: string
}

/**
 * Verifică dacă un email pe domeniu corporativ e încă activ.
 * Metodă simplă: verificăm dacă OAuth token e valid la login.
 * Dacă login-ul e cu email+parolă, verificăm prin bounce check.
 */
export async function checkEmailActive(email: string): Promise<EmailCheckResult> {
  // OAuth-based: dacă login-ul reușește, email-ul e activ
  // Această funcție e apelată DUPĂ login reușit — deci email-ul e valid
  // Dar verificăm și periodic (cron) prin bounce check

  // Pentru acum: returnăm valid (verificarea reală se face la OAuth)
  return { valid: true }
}

/**
 * Suspendă un user și notifică toți adminii tenantului.
 * Apelat când se detectează email dezactivat.
 */
export async function suspendUserAndNotifyAdmins(userId: string, reason: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, tenantId: true, role: true },
  })
  if (!user) return

  // Suspendă
  await prisma.user.update({
    where: { id: userId },
    data: { status: "INACTIVE" }, // SUSPENDED — folosim INACTIVE până adăugăm enum
  })

  // Găsește toți adminii din tenant (excepție: userul suspendat)
  const admins = await prisma.user.findMany({
    where: {
      tenantId: user.tenantId,
      role: { in: ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"] },
      id: { not: userId },
      status: "ACTIVE",
    },
    select: { id: true, email: true, firstName: true },
  })

  if (admins.length === 0) {
    console.warn(`[email-check] User ${user.email} suspendat dar ZERO admini activi pe tenant ${user.tenantId}!`)
    return
  }

  // Creează notificare de revocare (necesită confirmare cumulativă)
  const { setTenantData, getTenantData } = await import("@/lib/tenant-storage")
  const revocationKey = `REVOCATION_${userId}`

  await setTenantData(user.tenantId, revocationKey, {
    userId: user.id,
    userEmail: user.email,
    userName: `${user.firstName} ${user.lastName}`,
    userRole: user.role,
    reason,
    suspendedAt: new Date().toISOString(),
    requiredConfirmations: admins.map(a => a.id),
    confirmedBy: [],
    status: "PENDING", // PENDING | CONFIRMED | REACTIVATED
  })

  // Notifică fiecare admin
  for (const admin of admins) {
    try {
      await (prisma as any).notification.create({
        data: {
          tenantId: user.tenantId,
          userId: admin.id,
          type: "AGENT_MESSAGE",
          requestKind: "DECISION",
          title: `Acces suspendat: ${user.firstName} ${user.lastName}`,
          body: `${user.email} nu mai are email activ. Motivul: ${reason}. Confirmați revocarea accesului (necesită confirmarea tuturor adminilor).`,
          metadata: { revocationKey, suspendedUserId: userId },
        },
      })
    } catch {}
  }

  // Email prin Resend
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    for (const admin of admins) {
      await resend.emails.send({
        from: "JobGrade Security <noreply@jobgrade.ro>",
        to: admin.email,
        subject: `[JobGrade] Acces suspendat: ${user.firstName} ${user.lastName}`,
        html: `
          <h2>Acces suspendat automat</h2>
          <p><strong>${user.firstName} ${user.lastName}</strong> (${user.email}) a fost suspendat automat.</p>
          <p><strong>Motiv:</strong> ${reason}</p>
          <p><strong>Rol:</strong> ${user.role}</p>
          <hr/>
          <p>Pentru a revoca definitiv accesul, toți administratorii trebuie să confirme:</p>
          <p><a href="https://jobgrade.ro/portal" style="padding: 10px 20px; background: #DC2626; color: white; border-radius: 8px; text-decoration: none;">Confirmă revocarea</a></p>
          <p style="color: #666; font-size: 12px;">Datele companiei rămân protejate. Contul este suspendat până la confirmarea cumulativă a tuturor administratorilor.</p>
        `,
      }).catch(() => {})
    }
  } catch {}
}

/**
 * Confirmă revocarea unui user suspendat (un admin confirmă).
 * Revocare efectivă doar când TOȚI adminii au confirmat.
 */
export async function confirmRevocation(tenantId: string, suspendedUserId: string, confirmingAdminId: string): Promise<{
  confirmed: boolean
  totalRequired: number
  totalConfirmed: number
  fullyRevoked: boolean
}> {
  const { getTenantData, setTenantData } = await import("@/lib/tenant-storage")
  const revocationKey = `REVOCATION_${suspendedUserId}`
  const data = await getTenantData<any>(tenantId, revocationKey)

  if (!data || data.status !== "PENDING") {
    return { confirmed: false, totalRequired: 0, totalConfirmed: 0, fullyRevoked: false }
  }

  // Adaugă confirmare
  if (!data.confirmedBy.includes(confirmingAdminId)) {
    data.confirmedBy.push(confirmingAdminId)
  }

  const totalRequired = data.requiredConfirmations.length
  const totalConfirmed = data.confirmedBy.length
  const fullyRevoked = totalConfirmed >= totalRequired

  if (fullyRevoked) {
    data.status = "CONFIRMED"
    data.revokedAt = new Date().toISOString()
    // Status rămâne INACTIVE (revocat permanent)
  }

  await setTenantData(tenantId, revocationKey, data)

  return { confirmed: true, totalRequired, totalConfirmed, fullyRevoked }
}
