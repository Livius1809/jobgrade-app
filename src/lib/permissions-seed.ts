/**
 * permissions-seed.ts — Populează tabelul permission_rules din PERMISSION_MATRIX.
 *
 * Rulat:
 *   npx tsx src/lib/permissions-seed.ts
 *   sau importat din API route /api/v1/admin/seed-permissions
 */

import { PrismaClient } from "@/generated/prisma"
import { PERMISSION_MATRIX } from "./permissions"

export async function seedPermissions(prisma: PrismaClient): Promise<{
  deleted: number
  inserted: number
}> {
  // Clear existing rules
  const { count: deleted } = await prisma.permissionRule.deleteMany()

  // Insert all rules from matrix
  const inserted = await prisma.permissionRule.createMany({
    data: PERMISSION_MATRIX.map((rule) => ({
      orgRole: rule.orgRole,
      resource: rule.resource,
      action: rule.action,
      minLayer: rule.minLayer,
      condition: rule.condition ?? null,
    })),
    skipDuplicates: true,
  })

  return { deleted, inserted: inserted.count }
}

// Direct execution
if (require.main === module) {
  const prisma = new PrismaClient()
  seedPermissions(prisma)
    .then((result) => {
      console.log(`Permissions seeded: ${result.deleted} deleted, ${result.inserted} inserted`)
    })
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
