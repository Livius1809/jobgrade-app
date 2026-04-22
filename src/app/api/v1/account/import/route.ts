/**
 * POST /api/v1/account/import
 *
 * Reimportare pachet de portabilitate.
 * Clientul revine, încarcă pachetul criptat + parola,
 * și reia de unde a rămas.
 *
 * Restaurează: profil companie, MVV, KB, snapshots evoluție.
 * NU restaurează: credite, rapoarte (sunt în pachet ca arhivă).
 *
 * Body: { package: { encrypted, iv, authTag }, secret: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { decryptPackage, importPortabilityPackage } from "@/lib/company-profiler/portability"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const { package: pkg, secret } = body

    if (!pkg?.encrypted || !pkg?.iv || !pkg?.authTag || !secret) {
      return NextResponse.json(
        { message: "Pachet sau parolă lipsă." },
        { status: 400 },
      )
    }

    const tenantId = session.user.tenantId

    // 1. Decriptăm
    let data
    try {
      data = decryptPackage(pkg.encrypted, pkg.iv, pkg.authTag, tenantId, secret)
    } catch {
      return NextResponse.json(
        { message: "Parola incorectă sau pachet corupt. Verificați parola folosită la export." },
        { status: 400 },
      )
    }

    // 2. Validare versiune
    if (data.version !== "1.0") {
      return NextResponse.json(
        { message: `Versiune pachet nesuportată: ${data.version}` },
        { status: 400 },
      )
    }

    // 3. Import
    const result = await importPortabilityPackage(tenantId, data)

    return NextResponse.json({
      success: true,
      message: "Pachetul a fost importat. Continuați de unde ați rămas.",
      restored: result.restored,
      originalExport: data.exportedAt,
      company: data.company.name,
    })
  } catch (error) {
    console.error("[ACCOUNT IMPORT]", error)
    return NextResponse.json({ message: "Eroare la import." }, { status: 500 })
  }
}
