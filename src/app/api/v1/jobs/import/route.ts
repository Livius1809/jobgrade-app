import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ message: "Fișierul lipsește." }, { status: 400 })
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { message: "Fișierul trebuie să fie .xlsx" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      return NextResponse.json({ message: "Fișierul Excel este gol." }, { status: 400 })
    }

    // Fetch existing departments for name lookup
    const departments = await prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    })
    const deptByName = Object.fromEntries(
      departments.map((d) => [d.name.toLowerCase().trim(), d.id])
    )

    // Expected columns: Titlu* | Cod | Departament | Scop | Responsabilități | Cerințe | Status
    const results: {
      imported: number
      skipped: number
      errors: { row: number; message: string }[]
    } = { imported: 0, skipped: 0, errors: [] }

    const rows: {
      title: string
      code?: string
      departmentId?: string
      purpose?: string
      responsibilities?: string
      requirements?: string
      isActive: boolean
    }[] = []

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // skip header

      const title = String(row.getCell(1).value ?? "").trim()
      if (!title) {
        results.skipped++
        return
      }

      const code = String(row.getCell(2).value ?? "").trim() || undefined
      const deptName = String(row.getCell(3).value ?? "").trim().toLowerCase()
      const purpose = String(row.getCell(4).value ?? "").trim() || undefined
      const responsibilities = String(row.getCell(5).value ?? "").trim() || undefined
      const requirements = String(row.getCell(6).value ?? "").trim() || undefined
      const statusCell = String(row.getCell(7).value ?? "").trim().toLowerCase()
      const isActive = statusCell !== "inactiv" && statusCell !== "false"

      const departmentId = deptName ? deptByName[deptName] : undefined

      rows.push({
        title,
        code,
        departmentId,
        purpose,
        responsibilities,
        requirements,
        isActive,
      })
    })

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Nicio înregistrare validă găsită în fișier." },
        { status: 400 }
      )
    }

    // Import using createMany
    await prisma.job.createMany({
      data: rows.map((r) => ({
        tenantId,
        title: r.title,
        code: r.code ?? null,
        departmentId: r.departmentId ?? null,
        purpose: r.purpose ?? null,
        responsibilities: r.responsibilities ?? null,
        requirements: r.requirements ?? null,
        isActive: r.isActive,
        createdBy: session.user.id,
      })),
      skipDuplicates: true,
    })

    results.imported = rows.length

    return NextResponse.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
    })
  } catch (error) {
    console.error("[JOBS IMPORT]", error)
    return NextResponse.json({ message: "Eroare la procesarea fișierului." }, { status: 500 })
  }
}
