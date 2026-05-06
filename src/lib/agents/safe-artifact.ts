/**
 * safe-artifact.ts — Safe wrapper for LearningArtifact operations
 *
 * Problem: businessId column was added to schema but not yet migrated on prod DB.
 * This wrapper catches column-not-found errors and retries without businessId.
 * Remove this wrapper after running `prisma migrate deploy` on production.
 */

import { prisma } from "@/lib/prisma"

/**
 * Safe create: tries with all fields, retries without businessId if column missing
 */
export async function safeCreateArtifact(data: Record<string, any>): Promise<any> {
  try {
    return await (prisma as any).learningArtifact.create({ data })
  } catch (e: any) {
    if (e?.message?.includes("does not exist in the current database") || e?.code === "P2022") {
      const { businessId, ...safeData } = data
      return await (prisma as any).learningArtifact.create({ data: safeData }).catch(() => null)
    }
    throw e
  }
}

/**
 * Safe findFirst: tries with all where conditions, retries without businessId filter
 */
export async function safeFindArtifact(where: Record<string, any>, options?: Record<string, any>): Promise<any> {
  try {
    return await (prisma as any).learningArtifact.findFirst({ where, ...options })
  } catch (e: any) {
    if (e?.message?.includes("does not exist in the current database") || e?.code === "P2022") {
      const { businessId, OR, ...safeWhere } = where
      return await (prisma as any).learningArtifact.findFirst({ where: safeWhere, ...options }).catch(() => null)
    }
    throw e
  }
}

/**
 * Safe findMany: same pattern
 */
export async function safeFindManyArtifacts(where: Record<string, any>, options?: Record<string, any>): Promise<any[]> {
  try {
    return await (prisma as any).learningArtifact.findMany({ where, ...options })
  } catch (e: any) {
    if (e?.message?.includes("does not exist in the current database") || e?.code === "P2022") {
      const { businessId, OR, ...safeWhere } = where
      return await (prisma as any).learningArtifact.findMany({ where: safeWhere, ...options }).catch(() => [])
    }
    throw e
  }
}
