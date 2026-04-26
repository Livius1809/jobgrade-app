/**
 * B2C Credits API
 *
 * GET  — sold curent
 * POST — debitare credite (la cumpărare raport sau activare card)
 *
 * Achiziția de credite vine prin Stripe webhook (separat).
 * Aici doar: consultare sold + debitare la consum.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"

export const dynamic = "force-dynamic"

// GET — sold curent
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId necesar" }, { status: 400 })

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const p = prisma as any

  const balance = await p.b2CCreditBalance.findUnique({ where: { userId } })
  const recentTxns = await p.b2CCreditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { type: true, amount: true, description: true, card: true, createdAt: true },
  })

  return NextResponse.json({
    balance: balance?.balance || 0,
    transactions: recentTxns,
  })
}

// POST — debitare credite
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, amount, description, card, reportId } = body

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: "userId, amount (>0) și description obligatorii" }, { status: 400 })
  }

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const p = prisma as any

  // Verifică sold
  const balance = await p.b2CCreditBalance.findUnique({ where: { userId } })
  const currentBalance = balance?.balance || 0

  if (currentBalance < amount) {
    return NextResponse.json({
      error: "Credite insuficiente",
      balance: currentBalance,
      needed: amount,
      deficit: amount - currentBalance,
    }, { status: 402 })
  }

  // Debitare atomică
  await p.b2CCreditBalance.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  })

  // Înregistrare tranzacție
  await p.b2CCreditTransaction.create({
    data: {
      userId,
      type: reportId ? "SERVICE" : card ? "CARD_ACTIVATION" : "SERVICE",
      amount: -amount,
      description: description || `Debitare ${amount} credite`,
      card: card || null,
      sourceId: reportId || null,
    },
  })

  return NextResponse.json({
    ok: true,
    debited: amount,
    newBalance: currentBalance - amount,
  })
}
