/**
 * POST /api/v1/account/export
 *
 * Art. 20 GDPR — Portabilitate date.
 * Exportă tot ce știm despre firmă într-un pachet criptat.
 * Clientul îl descarcă înainte de ștergerea contului.
 * Poate fi reimportat la reactivare.
 *
 * EXCLUDE: date despre persoane (evaluatori, admin, angajați).
 * INCLUDE: date firmă, rapoarte, KB, jurnal, stare profiler, MVV.
 *
 * Body: { secret: string } — parola clientului pentru criptare
 * Response: { package: { encrypted, iv, authTag }, summary: {...} }
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { buildPortabilityPackage, encryptPackage } from "@/lib/company-profiler/portability"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { secret } = await req.json()
    if (!secret || typeof secret !== "string" || secret.length < 8) {
      return NextResponse.json(
        { message: "Parola de criptare trebuie să aibă minim 8 caractere." },
        { status: 400 },
      )
    }

    const tenantId = session.user.tenantId

    // 1. Construim pachetul
    const pkg = await buildPortabilityPackage(tenantId)

    // 2. Criptăm
    const encrypted = encryptPackage(pkg, tenantId, secret)

    // 3. Rezumat (necriptat — clientul vede ce conține)
    const summary = {
      exportedAt: pkg.exportedAt,
      company: pkg.company.name,
      cui: pkg.company.cui,
      reportsCount: pkg.reports.length,
      kbEntriesCount: pkg.knowledgeBase.length,
      journalEntriesCount: pkg.journal.length,
      maturity: pkg.profilerState.maturity,
      coherenceScore: pkg.profilerState.coherenceScore,
      snapshotsCount: pkg.profilerState.snapshots.length,
      mvvValidated: !!pkg.mvv.validatedAt,
    }

    // 4. Log activitate
    const { prisma } = await import("@/lib/prisma")
    await prisma.creditTransaction.create({
      data: {
        tenantId,
        type: "USAGE",
        amount: 0,
        description: "[PORTABILITY_EXPORT] Pachet portabilitate exportat",
      },
    }).catch(() => {})

    return NextResponse.json({
      package: encrypted,
      summary,
      instructions: {
        ro: "Salvați acest fișier. La reactivarea contului, încărcați-l cu aceeași parolă pentru a relua de unde ați rămas.",
        important: "Fără acest pachet, un cont nou va porni de la zero — fără memorie, fără istoric, fără coerența acumulată.",
      },
    })
  } catch (error) {
    console.error("[ACCOUNT EXPORT]", error)
    return NextResponse.json({ message: "Eroare la export." }, { status: 500 })
  }
}
