/**
 * tenant-storage.ts — Stocare date per tenant in SystemConfig (zero migrare schema).
 *
 * Pattern: cheie = "TENANT_{tenantId}_{feature}", valoare = JSON.
 * Inlocuieste CompanyProfile.aiAnalysis care nu exista in schema.
 */

import { prisma } from "@/lib/prisma"

export async function getTenantData<T = unknown>(tenantId: string, feature: string): Promise<T | null> {
  try {
    const key = `TENANT_${tenantId}_${feature}`
    const config = await prisma.systemConfig.findUnique({ where: { key } })
    if (!config) return null
    return JSON.parse(config.value) as T
  } catch {
    return null
  }
}

export async function setTenantData(tenantId: string, feature: string, data: unknown): Promise<void> {
  const key = `TENANT_${tenantId}_${feature}`
  const value = JSON.stringify(data)
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

export async function mergeTenantData(tenantId: string, feature: string, partial: Record<string, unknown>): Promise<void> {
  const existing = await getTenantData<Record<string, unknown>>(tenantId, feature)
  await setTenantData(tenantId, feature, { ...(existing || {}), ...partial })
}
