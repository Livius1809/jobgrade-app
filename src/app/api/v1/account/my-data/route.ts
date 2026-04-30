/**
 * GET /api/v1/account/my-data
 *
 * Art. 15 GDPR — Dreptul de acces.
 * Returnează ce știm despre FIRMĂ.
 *
 * EXCLUDE EXPLICIT:
 * - Date despre persoane care au interacționat (evaluatori, admin, owner)
 * - Conversații individuale
 * - Scoruri personale
 * - Identitatea membrilor comisiei
 *
 * INCLUDE:
 * - Date organizaționale (CAEN, industrie, dimensiune)
 * - MVV (misiune, viziune, valori — draft + validat)
 * - Nivel maturitate + scor coerență
 * - Servicii active
 * - Număr rapoarte, KB entries, tranzacții jurnal
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { getCompanyDataForAccess } from "@/lib/company-profiler/portability"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const data = await getCompanyDataForAccess(session.user.tenantId)

    return NextResponse.json({
      ...data,
      gdprNote: {
        article: "Art. 15 Reg. (UE) 2016/679",
        explanation: "Acestea sunt datele pe care le deținem despre organizația dumneavoastră. Nu includem date cu caracter personal ale utilizatorilor individuali (evaluatori, administratori, membri comisie).",
        rights: {
          rectificare: "Art. 16 — Puteți corecta oricând datele din secțiunea Profil Companie",
          stergere: "Art. 17 — Puteți solicita ștergerea completă din Setări → Cont → Șterge cont",
          portabilitate: "Art. 20 — Puteți descărca datele în format criptat din Setări → Cont → Exportă date",
        },
      },
    })
  } catch (error) {
    console.error("[MY-DATA]", error)
    return NextResponse.json({ message: "Eroare." }, { status: 500 })
  }
}
