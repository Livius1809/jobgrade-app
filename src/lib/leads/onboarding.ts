/**
 * Lead Onboarding — creează Tenant + User când Lead ajunge la CLOSED_WON.
 *
 * Livrat: 06.04.2026, Pas 4 "Primul Client".
 *
 * Reutilizează logica de creare tenant din register flow.
 */

import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { randomBytes } from "crypto"
import { sendInviteEmail } from "@/lib/email"

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40)
}

function generateTempPassword(): string {
  return randomBytes(12).toString("base64url")
}

export async function createTenantFromLead(leadId: string): Promise<{
  tenantId: string
  userId: string
  inviteSent: boolean
}> {
  const lead = await (prisma as any).lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error(`Lead ${leadId} not found`)
  if (lead.tenantId) throw new Error(`Lead ${leadId} already has tenant ${lead.tenantId}`)

  const tempPassword = generateTempPassword()
  const hashedPassword = await hash(tempPassword, 12)

  let slug = generateSlug(lead.companyName)
  // Handle collision
  const existing = await prisma.tenant.findUnique({ where: { slug } })
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  // Transaction: create Tenant + User + Credits + link Lead
  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: lead.companyName,
        slug,
        plan: "STARTER",
        locale: "ro",
      },
    })

    const names = lead.contactName.split(" ")
    const firstName = names[0] ?? lead.contactName
    const lastName = names.slice(1).join(" ") || "-"

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: lead.contactEmail,
        firstName,
        lastName,
        role: "COMPANY_ADMIN",
        status: "ACTIVE",
        passwordHash: hashedPassword,
      },
    })

    await tx.creditBalance.create({
      data: {
        tenantId: tenant.id,
        balance: 100,
      },
    })

    await tx.creditTransaction.create({
      data: {
        tenantId: tenant.id,
        amount: 100,
        type: "PURCHASE",
        description: "Credite inițiale plan STARTER (onboarding automat)",
      },
    })

    // Link lead to tenant
    await (tx as any).lead.update({
      where: { id: leadId },
      data: { tenantId: tenant.id },
    })

    return { tenant, user }
  })

  // Send invite email (non-blocking)
  let inviteSent = false
  try {
    const token = randomBytes(32).toString("hex")
    await prisma.verificationToken.create({
      data: {
        identifier: lead.contactEmail,
        token,
        expires: new Date(Date.now() + 7 * 24 * 3600000),
      },
    })

    await sendInviteEmail({
      to: lead.contactEmail,
      firstName: lead.contactName.split(" ")[0] ?? lead.contactName,
      inviterName: "JobGrade",
      companyName: lead.companyName,
      token,
    })
    inviteSent = true
  } catch {
    // Email failure doesn't block onboarding
  }

  return {
    tenantId: result.tenant.id,
    userId: result.user.id,
    inviteSent,
  }
}
