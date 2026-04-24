/**
 * onboarding-check.ts — Verifică dacă tenant-ul a configurat rolurile organizaționale.
 *
 * Folosit în paginile principale (portal, dashboard) pentru redirect la wizard.
 * NU în layout (care nu are acces la pathname).
 */

import { prisma } from "@/lib/prisma"

export async function needsRoleOnboarding(tenantId: string): Promise<boolean> {
  const [purchase, roleCount] = await Promise.all([
    prisma.servicePurchase.findUnique({
      where: { tenantId },
      select: { layer: true },
    }),
    prisma.userOrgRole.count({
      where: { tenantId },
    }),
  ])

  // Onboarding necesar dacă: are layer cumpărat, dar 0 roluri alocate
  return !!(purchase && purchase.layer > 0 && roleCount === 0)
}
