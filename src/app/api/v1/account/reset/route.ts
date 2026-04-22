/**
 * POST /api/v1/account/reset
 *
 * Flow complet cu consimțământ explicit:
 *
 * 1. action: "preview"  — informare: ce se va întâmpla, ce date avem, ce pierde
 * 2. action: "data"     — ștergere date de lucru (păstrează cont + profil)
 * 3. action: "account"  — ștergere completă (cu export opțional)
 *
 * La "account", clientul TREBUIE să confirme cu:
 *   confirmed: true
 *   acknowledgement: "Am luat la cunoștință..."
 *
 * Fără confirmare explicită → 400.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  action: z.enum(["preview", "data", "account"]),
  /** Confirmare explicită — obligatorie la "account" */
  confirmed: z.boolean().optional(),
  /** Text de confirmare — clientul scrie/acceptă */
  acknowledgement: z.string().optional(),
  /** Parolă pentru pachetul de portabilitate */
  exportSecret: z.string().min(8).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const { action, confirmed, acknowledgement, exportSecret } = schema.parse(body)
    const tenantId = session.user.tenantId

    // ═══ PREVIEW — Informare completă ═══════════════════════════════
    if (action === "preview") {
      const [
        jobCount, sessionCount, reportCount, transactionCount,
        payrollCount, kbCount, profile,
      ] = await Promise.all([
        prisma.job.count({ where: { tenantId } }).catch(() => 0),
        prisma.evaluationSession.count({ where: { tenantId } }).catch(() => 0),
        prisma.aiGeneration.count({ where: { tenantId } }).catch(() => 0),
        prisma.creditTransaction.count({ where: { tenantId } }).catch(() => 0),
        prisma.payrollEntry.count({ where: { tenantId } }).catch(() => 0),
        prisma.kBEntry.count({ where: { tags: { has: tenantId } } }).catch(() => 0),
        prisma.companyProfile.findUnique({
          where: { tenantId },
          select: { mvvMaturity: true, mvvCoherenceScore: true, mvvValidatedAt: true },
        }).catch(() => null),
      ])

      return NextResponse.json({
        action: "preview",
        whatWeHave: {
          posturi: jobCount,
          sesiuniEvaluare: sessionCount,
          rapoarteGenerate: reportCount,
          tranzactiiCredite: transactionCount,
          datePayroll: payrollCount,
          cunostinteAcumulate: kbCount,
          maturitateMVV: (profile as any)?.mvvMaturity || "IMPLICIT",
          coerentaOrganizationala: (profile as any)?.mvvCoherenceScore || 0,
          mvvValidat: !!(profile as any)?.mvvValidatedAt,
        },
        whatYouLose: {
          data: [
            "Toate sesiunile de evaluare și rezultatele",
            "Fișele de post și departamentele",
            "Datele salariale și rapoartele pay gap",
            "Simulările și scenariile",
            "Creditele și istoricul tranzacțiilor",
            "Memoria acumulată despre organizația dumneavoastră",
          ],
          account: [
            "Tot ce e listat mai sus",
            "Profilul companiei (CAEN, CUI, misiune, viziune, valori)",
            "Contul de utilizator și accesul la platformă",
            "Coerența organizațională construită în timp",
            "Traiectoria de maturitate (nivelul atins)",
          ],
        },
        whatYouKeep: {
          data: "Profilul companiei, contul, utilizatorii",
          account: "Nimic. Un cont nou pornește de la zero.",
        },
        options: {
          exportPachet: {
            available: true,
            description: "Puteți descărca un pachet criptat cu toate datele organizației. La reactivare, îl reîncărcați cu aceeași parolă și reluați de unde ați rămas.",
            howTo: "Adăugați exportSecret (minim 8 caractere) la cererea de ștergere",
          },
          stergereDate: {
            description: "Șterge datele de lucru dar păstrează contul și profilul. Puteți începe un ciclu nou.",
            action: "data",
          },
          stergereCont: {
            description: "Șterge totul. Ireversibil fără pachet de portabilitate.",
            action: "account",
            requiresConfirmation: true,
          },
        },
        nextStep: "Trimiteți din nou cu action: 'data' sau 'account', confirmed: true, și acknowledgement cu textul de confirmare.",
      })
    }

    // ═══ DATA — Ștergere date de lucru ══════════════════════════════
    if (action === "data") {
      const deletes = [
        { sql: "DELETE FROM salary_steps WHERE \"salaryGradeId\" IN (SELECT id FROM salary_grades WHERE \"tenantId\" = $1)", label: "salary_steps" },
        { sql: "DELETE FROM session_jobs WHERE \"sessionId\" IN (SELECT id FROM evaluation_sessions WHERE \"tenantId\" = $1)", label: "session_jobs" },
        { sql: "DELETE FROM kpi_definitions WHERE \"jobId\" IN (SELECT id FROM jobs WHERE \"tenantId\" = $1)", label: "kpi_definitions" },
        { sql: "DELETE FROM compensation_packages WHERE \"jobId\" IN (SELECT id FROM jobs WHERE \"tenantId\" = $1)", label: "compensation_packages" },
        { sql: "DELETE FROM salary_grades WHERE \"tenantId\" = $1", label: "salary_grades" },
        { sql: "DELETE FROM pay_gap_reports WHERE \"tenantId\" = $1", label: "pay_gap_reports" },
        { sql: "DELETE FROM joint_pay_assessments WHERE \"tenantId\" = $1", label: "joint_assessments" },
        { sql: "DELETE FROM employee_salary_records WHERE \"tenantId\" = $1", label: "employee_salary_records" },
        { sql: "DELETE FROM simulation_scenarios WHERE \"tenantId\" = $1", label: "simulation_scenarios" },
        { sql: "DELETE FROM reports WHERE \"tenantId\" = $1", label: "reports" },
        { sql: "DELETE FROM ai_generations WHERE \"tenantId\" = $1", label: "ai_generations" },
        { sql: "DELETE FROM evaluation_sessions WHERE \"tenantId\" = $1", label: "evaluation_sessions" },
        { sql: "DELETE FROM jobs WHERE \"tenantId\" = $1", label: "jobs" },
        { sql: "DELETE FROM service_purchases WHERE \"tenantId\" = $1", label: "service_purchases" },
        { sql: "DELETE FROM credit_transactions WHERE \"tenantId\" = $1", label: "credit_transactions" },
        { sql: "DELETE FROM credit_balances WHERE \"tenantId\" = $1", label: "credit_balances" },
        { sql: "DELETE FROM revenue_entries WHERE \"tenantId\" = $1", label: "revenue_entries" },
        { sql: "DELETE FROM payroll_entries WHERE \"tenantId\" = $1", label: "payroll_entries" },
        { sql: "DELETE FROM payroll_import_batches WHERE \"tenantId\" = $1", label: "payroll_import_batches" },
        { sql: "DELETE FROM employee_requests WHERE \"tenantId\" = $1", label: "employee_requests" },
        { sql: "DELETE FROM client_memories WHERE \"tenantId\" = $1", label: "client_memories" },
        { sql: "DELETE FROM company_profile_snapshots WHERE \"tenantId\" = $1", label: "profiler_snapshots" },
        { sql: "DELETE FROM departments WHERE \"tenantId\" = $1", label: "departments" },
      ]

      const results: string[] = []
      for (const { sql, label } of deletes) {
        try {
          const result = await prisma.$executeRawUnsafe(sql, tenantId)
          if (result > 0) results.push(`${label}: ${result}`)
        } catch (e: any) {
          const msg = e.message?.slice(0, 100) || "unknown"
          console.log(`[ACCOUNT RESET] Skip ${label}: ${msg}`)
          results.push(`${label}: SKIP (${msg.slice(0, 40)})`)
        }
      }

      // Invalidare cache profiler
      import("@/lib/company-profiler").then(m => m.invalidateProfileCache(tenantId)).catch(() => {})

      console.log(`[ACCOUNT] Data reset → tenant ${tenantId}:`, results.join(", "))
      return NextResponse.json({
        success: true,
        message: "Datele de lucru au fost șterse. Profilul companiei a fost păstrat.",
        details: results,
      })
    }

    // ═══ ACCOUNT — Ștergere completă (cu consimțământ) ═════════════
    if (action === "account") {
      // Verificare consimțământ explicit
      if (!confirmed) {
        return NextResponse.json({
          message: "Ștergerea contului necesită confirmare explicită.",
          required: {
            confirmed: true,
            acknowledgement: "Am luat la cunoștință că toate datele vor fi șterse ireversibil și că fără pachetul de portabilitate voi porni de la zero.",
          },
          suggestion: "Rulați mai întâi action: 'preview' pentru a vedea ce date aveți.",
        }, { status: 400 })
      }

      if (!acknowledgement || acknowledgement.length < 20) {
        return NextResponse.json({
          message: "Confirmarea necesită un text de luare la cunoștință (minim 20 caractere).",
          example: "Am luat la cunoștință că toate datele vor fi șterse ireversibil.",
        }, { status: 400 })
      }

      // Export portabilitate (dacă solicitat)
      let portabilityPackage = null
      if (exportSecret) {
        try {
          const { buildPortabilityPackage, encryptPackage } = await import("@/lib/company-profiler/portability")
          const pkg = await buildPortabilityPackage(tenantId)
          portabilityPackage = encryptPackage(pkg, tenantId, exportSecret)
        } catch (e) {
          console.log("[ACCOUNT] Portability export failed:", (e as Error).message?.slice(0, 80))
        }
      }

      // Log confirmare înainte de ștergere
      console.log(`[ACCOUNT] Delete confirmed → tenant ${tenantId}, acknowledgement: "${acknowledgement.slice(0, 100)}", hasExport: ${!!portabilityPackage}`)

      // Ștergere
      await prisma.tenant.delete({ where: { id: tenantId } })

      return NextResponse.json({
        success: true,
        message: "Contul a fost șters complet.",
        portabilityPackage: portabilityPackage || undefined,
        portabilityNote: portabilityPackage
          ? "Salvați acest pachet. La reactivare, încărcați-l cu aceeași parolă la /api/v1/account/import pentru a relua de unde ați rămas."
          : "Nu ați solicitat pachet de portabilitate. Un cont nou va porni de la zero — fără memorie, fără istoric.",
      })
    }

    return NextResponse.json({ message: "Acțiune invalidă." }, { status: 400 })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[ACCOUNT RESET]", errMsg)
    return NextResponse.json({ message: `Eroare: ${errMsg}` }, { status: 500 })
  }
}
