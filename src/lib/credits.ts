import { prisma } from "@/lib/prisma"
import { CreditTxnType } from "@/generated/prisma"

export const CREDIT_COSTS = {
  JOB_AD: 4,
  SOCIAL_MEDIA_PER_PLATFORM: 2,
  KPI_SHEET: 3,
  SESSION_ANALYSIS: 4,
  JOB_ANALYSIS: 4,
  COMPANY_EXTRACT: 2,
  GENERATE_GRADES: 5,
  SIMULATE_REMUNERATION: 3,
  EXPORT_PDF: 5,
  EXPORT_EXCEL: 5,
  EXPORT_JSON: 5,
  EXPORT_XML: 5,
  PAY_GAP_REPORT: 3,
  RECALIBRATION_ROUND: 2,
  AI_MEDIATION_ROUND: 2,
  VIDEO_CONFERENCE_SESSION: 0,  // Faza 1: gratuit (Jitsi). Faza 2: 2 cr/sesiune (LiveKit infra)
  VOICE_AI_MINUTE: 3,           // Faza 2: voce ElevenLabs (STT+TTS+Claude), planificat
} as const

export async function getBalance(tenantId: string): Promise<number> {
  const balance = await prisma.creditBalance.findUnique({
    where: { tenantId },
  })
  return balance?.balance ?? 0
}

export async function hasCredits(tenantId: string, amount: number): Promise<boolean> {
  const balance = await getBalance(tenantId)
  return balance >= amount
}

export async function deductCredits(
  tenantId: string,
  amount: number,
  description: string,
  sourceId?: string
): Promise<boolean> {
  const balance = await getBalance(tenantId)
  if (balance < amount) return false

  await prisma.$transaction([
    prisma.creditBalance.update({
      where: { tenantId },
      data: { balance: { decrement: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        tenantId,
        type: CreditTxnType.USAGE,
        amount: -amount,
        description,
        sourceId,
      },
    }),
  ])

  return true
}

export async function addCredits(
  tenantId: string,
  amount: number,
  description: string,
  type: CreditTxnType = CreditTxnType.PURCHASE
): Promise<void> {
  await prisma.$transaction([
    prisma.creditBalance.upsert({
      where: { tenantId },
      update: { balance: { increment: amount } },
      create: { tenantId, balance: amount },
    }),
    prisma.creditTransaction.create({
      data: { tenantId, type, amount, description },
    }),
  ])
}
