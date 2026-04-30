import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { calculateTotalMonthlyGross } from "@/lib/payroll/criteria-mapping"
import ExcelJS from "exceljs"
import { validateUpload } from "@/lib/security/upload-validator"

export const maxDuration = 60

// ── Column mapping A-U ──────────────────────────────────────────────────────

const COLUMN_MAP: Record<number, string> = {
  1: "jobCode",
  2: "jobTitle",
  3: "department",
  4: "hierarchyLevel",
  5: "jobFamily",
  6: "gradeExisting",
  7: "baseSalary",
  8: "fixedAllowances",
  9: "annualBonuses",
  10: "annualCommissions",
  11: "benefitsInKind",
  12: "mealVouchers",
  13: "gender",
  14: "workSchedule",
  15: "contractType",
  16: "tenureOrg",
  17: "tenureRole",
  18: "workLocation",
  19: "city",
  20: "education",
  21: "certifications",
}

const REQUIRED_FIELDS = [
  "jobCode",
  "jobTitle",
  "department",
  "hierarchyLevel",
  "jobFamily",
  "baseSalary",
  "fixedAllowances",
  "annualBonuses",
  "annualCommissions",
  "benefitsInKind",
  "mealVouchers",
  "gender",
  "workSchedule",
  "contractType",
  "tenureOrg",
  "tenureRole",
  "workLocation",
  "city",
  "education",
]

// ── Normalization maps ──────────────────────────────────────────────────────

const GENDER_MAP: Record<string, string> = {
  F: "FEMALE",
  M: "MALE",
  FEMALE: "FEMALE",
  MALE: "MALE",
}

const WORK_SCHEDULE_MAP: Record<string, string> = {
  "2h": "H2",
  "4h": "H4",
  "6h": "H6",
  "8h": "H8",
}

const CONTRACT_TYPE_MAP: Record<string, string> = {
  "CIM nedeterminat": "CIM_NEDETERMINAT",
  "CIM determinat": "CIM_DETERMINAT",
  "Convenție": "CONVENTIE",
  Conventie: "CONVENTIE",
}

const WORK_LOCATION_MAP: Record<string, string> = {
  Sediu: "SEDIU",
  Remote: "REMOTE",
  Hibrid: "HIBRID",
}

const EDUCATION_MAP: Record<string, string> = {
  Medii: "MEDII",
  Superioare: "SUPERIOARE",
  Master: "MASTER",
  Doctorat: "DOCTORAT",
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function cellToString(cell: ExcelJS.CellValue): string {
  if (cell == null) return ""
  if (typeof cell === "object" && "result" in cell) return String((cell as any).result ?? "")
  return String(cell).trim()
}

function cellToNumber(cell: ExcelJS.CellValue): number {
  const s = cellToString(cell)
  const n = parseFloat(s.replace(/[^\d.,-]/g, "").replace(",", "."))
  return isNaN(n) ? 0 : n
}

interface RowError {
  row: number
  field: string
  message: string
}

// ── POST: Upload Excel ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const role = session.user.role
    if (!["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"].includes(role)) {
      return NextResponse.json(
        { message: "Acces interzis. Doar OWNER, SUPER_ADMIN sau COMPANY_ADMIN pot importa." },
        { status: 403 }
      )
    }

    const tenantId = session.user.tenantId

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ message: "Fișierul lipsește." }, { status: 400 })
    }

    // Validare strictă: dimensiune + tip + magic bytes
    const uploadCheck = await validateUpload(file, [".xlsx"])
    if (!uploadCheck.valid) {
      return NextResponse.json({ message: uploadCheck.error }, { status: 400 })
    }

    // Read Excel
    const arrayBuf = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuf as any)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ message: "Fișierul nu conține niciun sheet." }, { status: 400 })
    }

    // Parse rows (skip header row 1)
    const errors: RowError[] = []
    const validEntries: Record<string, any>[] = []
    let totalRows = 0

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // skip header
      totalRows++

      // Extract raw values
      const raw: Record<string, string> = {}
      for (let col = 1; col <= 21; col++) {
        const field = COLUMN_MAP[col]
        if (field) {
          raw[field] = cellToString(row.getCell(col).value)
        }
      }

      // Validate required fields
      let rowValid = true
      for (const field of REQUIRED_FIELDS) {
        if (!raw[field]) {
          errors.push({ row: rowNumber, field, message: `Câmpul „${field}" este obligatoriu.` })
          rowValid = false
        }
      }

      if (!rowValid) return

      // Map enums
      const gender = GENDER_MAP[raw.gender]
      if (!gender) {
        errors.push({ row: rowNumber, field: "gender", message: `Valoare invalidă: „${raw.gender}". Acceptat: F, M.` })
        return
      }

      const workSchedule = WORK_SCHEDULE_MAP[raw.workSchedule]
      if (!workSchedule) {
        errors.push({ row: rowNumber, field: "workSchedule", message: `Valoare invalidă: „${raw.workSchedule}". Acceptat: 2h, 4h, 6h, 8h.` })
        return
      }

      const contractType = CONTRACT_TYPE_MAP[raw.contractType]
      if (!contractType) {
        errors.push({ row: rowNumber, field: "contractType", message: `Valoare invalidă: „${raw.contractType}". Acceptat: CIM nedeterminat, CIM determinat, Convenție.` })
        return
      }

      const workLocation = WORK_LOCATION_MAP[raw.workLocation]
      if (!workLocation) {
        errors.push({ row: rowNumber, field: "workLocation", message: `Valoare invalidă: „${raw.workLocation}". Acceptat: Sediu, Remote, Hibrid.` })
        return
      }

      const education = EDUCATION_MAP[raw.education]
      if (!education) {
        errors.push({ row: rowNumber, field: "education", message: `Valoare invalidă: „${raw.education}". Acceptat: Medii, Superioare, Master, Doctorat.` })
        return
      }

      // Parse numeric fields
      const baseSalary = cellToNumber(row.getCell(7).value)
      const fixedAllowances = cellToNumber(row.getCell(8).value)
      const annualBonuses = cellToNumber(row.getCell(9).value)
      const annualCommissions = cellToNumber(row.getCell(10).value)
      const benefitsInKind = cellToNumber(row.getCell(11).value)
      const mealVouchers = cellToNumber(row.getCell(12).value)
      const tenureOrg = cellToNumber(row.getCell(16).value)
      const tenureRole = cellToNumber(row.getCell(17).value)

      // Validate non-negative salary fields
      const salaryFields = { baseSalary, fixedAllowances, annualBonuses, annualCommissions, benefitsInKind, mealVouchers }
      let hasNegative = false
      for (const [field, value] of Object.entries(salaryFields)) {
        if (value < 0) {
          errors.push({ row: rowNumber, field, message: `Valoarea „${field}" nu poate fi negativă (${value}).` })
          hasNegative = true
        }
      }
      if (hasNegative) return

      // Normalize salary to 8h equivalent
      const totalMonthlyGross = calculateTotalMonthlyGross({
        baseSalary,
        fixedAllowances,
        annualBonuses,
        annualCommissions,
        benefitsInKind,
        mealVouchers,
        workSchedule,
      })

      validEntries.push({
        jobCode: raw.jobCode,
        jobTitle: raw.jobTitle,
        department: raw.department,
        hierarchyLevel: raw.hierarchyLevel,
        jobFamily: raw.jobFamily,
        gradeExisting: raw.gradeExisting || null,
        baseSalary,
        fixedAllowances,
        annualBonuses,
        annualCommissions,
        benefitsInKind,
        mealVouchers,
        gender,
        workSchedule,
        contractType,
        tenureOrg,
        tenureRole,
        workLocation,
        city: raw.city,
        education,
        certifications: raw.certifications || null,
        totalMonthlyGross,
      })
    })

    if (totalRows === 0) {
      return NextResponse.json(
        { message: "Fișierul nu conține rânduri de date (doar antet sau gol)." },
        { status: 400 }
      )
    }

    // Create batch and entries in a transaction
    const p = prisma as any
    const batch = await p.$transaction(async (tx: any) => {
      const batchRecord = await tx.payrollImportBatch.create({
        data: {
          tenantId,
          fileName: file.name,
          totalRows,
          validRows: validEntries.length,
          invalidRows: errors.length,
          errors: errors.length > 0 ? errors : [],
          uploadedBy: session.user.id,
          status: validEntries.length > 0 ? "COMPLETED" : "FAILED",
        },
      })

      if (validEntries.length > 0) {
        await tx.payrollEntry.createMany({
          data: validEntries.map((entry) => ({
            batchId: batchRecord.id,
            tenantId,
            ...entry,
          })),
        })
      }

      // Calculate salary quartiles for the batch
      if (validEntries.length > 0) {
        const batchEntries = await tx.payrollEntry.findMany({
          where: { batchId: batchRecord.id },
          orderBy: { totalMonthlyGross: "asc" },
          select: { id: true, totalMonthlyGross: true },
        })

        const total = batchEntries.length
        if (total > 0) {
          const quartileSize = Math.ceil(total / 4)
          await Promise.all(
            batchEntries.map((entry: any, index: number) => {
              const quartile = Math.min(4, Math.floor(index / quartileSize) + 1)
              return tx.payrollEntry.update({
                where: { id: entry.id },
                data: { salaryQuartile: quartile },
              })
            })
          )
        }
      }

      // ═══ BRIDGE: PayrollEntry → EmployeeSalaryRecord (pentru Pay Gap) ═══
      if (validEntries.length > 0) {
        const year = new Date().getFullYear()
        const batchPayroll = await tx.payrollEntry.findMany({
          where: { batchId: batchRecord.id },
          select: {
            jobCode: true, jobTitle: true, department: true, gender: true,
            baseSalary: true, annualBonuses: true, annualCommissions: true,
            workSchedule: true,
          },
        })

        // Scoruri evaluare din ultima sesiune (pentru "muncă egală")
        const latestSession = await tx.evaluationSession.findFirst({
          where: { tenantId, status: { in: ["COMPLETED", "VALIDATED"] } },
          include: { jobResults: { include: { job: { select: { title: true } } } } },
          orderBy: { completedAt: "desc" },
        }).catch(() => null)

        const scoreMap = new Map<string, number>()
        for (const jr of latestSession?.jobResults ?? []) {
          if (jr.job?.title) scoreMap.set(jr.job.title.toLowerCase().trim(), jr.totalScore)
        }

        let missingIdCount = 0
        for (const pe of batchPayroll) {
          const variableComp = ((pe.annualBonuses ?? 0) + (pe.annualCommissions ?? 0)) / 12
          // Fingerprint: hash stabil din date angajat (pt matching fără ID)
          const fingerprint = `${pe.jobTitle}|${pe.department}|${pe.gender}|${pe.baseSalary}`.toLowerCase()
          const hasCompanyId = pe.jobCode && !pe.jobCode.startsWith("EMP") && !pe.jobCode.startsWith("auto-")
          if (!hasCompanyId) missingIdCount++

          // Scor evaluare din Modul 1 (muncă egală)
          const evalScore = scoreMap.get(pe.jobTitle.toLowerCase().trim()) ?? null

          await tx.employeeSalaryRecord.upsert({
            where: {
              tenantId_employeeCode_periodYear: { tenantId, employeeCode: pe.jobCode, periodYear: year },
            },
            create: {
              tenantId,
              employeeCode: pe.jobCode,
              companyEmployeeId: hasCompanyId ? pe.jobCode : null,
              internalFingerprint: fingerprint,
              gender: pe.gender,
              baseSalary: pe.baseSalary,
              variableComp,
              department: pe.department,
              jobCategory: pe.jobTitle,
              workSchedule: pe.workSchedule ?? "FULL_TIME",
              evaluationScore: evalScore,
              periodYear: year,
            },
            update: {
              companyEmployeeId: hasCompanyId ? pe.jobCode : undefined,
              internalFingerprint: fingerprint,
              gender: pe.gender,
              baseSalary: pe.baseSalary,
              variableComp,
              department: pe.department,
              jobCategory: pe.jobTitle,
              workSchedule: pe.workSchedule ?? "FULL_TIME",
              evaluationScore: evalScore,
            },
          }).catch(() => {})
        }

        // Flag: angajați fără ID de firmă
        if (missingIdCount > 0) {
          await tx.notification.create({
            data: {
              userId: session.user.id,
              type: "INFORMATION",
              title: `${missingIdCount} angajați fără cod intern de firmă`,
              body: `Importul conține ${missingIdCount} angajați fără cod de identificare propriu. Platforma a generat coduri interne, dar vă recomandăm să completați codurile de firmă pentru o identificare corectă la importuri ulterioare.`,
              read: false,
            },
          }).catch(() => {})
        }
      }

      return batchRecord
    })

    // Company Profiler: import salarial = acțiune semnificativă
    import("@/lib/company-profiler").then(m => m.onSignificantAction(session.user.tenantId)).catch(() => {})

    return NextResponse.json({
      batchId: batch.id,
      totalRows,
      validRows: validEntries.length,
      invalidRows: errors.length,
      errors: errors.slice(0, 50), // limit errors in response
    })
  } catch (error: any) {
    console.error("[PAYROLL IMPORT]", error)
    return NextResponse.json(
      { message: error.message || "Eroare internă la procesarea fișierului." },
      { status: 500 }
    )
  }
}

// ── GET: List previous import batches ───────────────────────────────────────

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const role = session.user.role
    if (!["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    const p = prisma as any

    const batches = await p.payrollImportBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fileName: true,
        totalRows: true,
        validRows: true,
        invalidRows: true,
        status: true,
        createdAt: true,
        errors: true,
      },
    })

    return NextResponse.json({ batches })
  } catch (error: any) {
    console.error("[PAYROLL IMPORT GET]", error)
    return NextResponse.json(
      { message: error.message || "Eroare internă." },
      { status: 500 }
    )
  }
}
