import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const CreateSchema = z.object({
  requestedBy: z.string().min(2),
  requestEmail: z.string().email(),
  salaryGradeId: z.string().optional(),
  requestDetails: z.string().min(10).max(2000),
})

// GET — list all requests for HR managers
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { role, tenantId } = session.user
  if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
    return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  // Mark overdue requests
  await prisma.employeeRequest.updateMany({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_REVIEW"] },
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  })

  const requests = await prisma.employeeRequest.findMany({
    where: {
      tenantId,
      ...(status ? { status: status as never } : {}),
    },
    include: { salaryGrade: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ requests })
}

// POST — employee submits Art. 7 request (public endpoint, no auth required)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantSlug, ...rest } = body

    if (!tenantSlug) {
      return NextResponse.json({ message: "tenantSlug lipsă." }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) {
      return NextResponse.json({ message: "Companie negăsită." }, { status: 404 })
    }

    const parsed = CreateSchema.safeParse(rest)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Date invalide.", errors: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // Due date = 2 months from now (Art. 7.4 — response within 2 months)
    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + 2)

    const request = await prisma.employeeRequest.create({
      data: {
        tenantId: tenant.id,
        requestedBy: parsed.data.requestedBy,
        requestEmail: parsed.data.requestEmail,
        requestDetails: parsed.data.requestDetails,
        salaryGradeId: parsed.data.salaryGradeId,
        dueDate,
      },
    })

    // Notify HR admins (US-042)
    const admins = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        role: { in: ["COMPANY_ADMIN", "OWNER"] },
        status: "ACTIVE",
      },
      select: { id: true, email: true, firstName: true },
    })

    // In-app notifications
    await prisma.notification.createMany({
      data: admins.map((u) => ({
        userId: u.id,
        type: "EMPLOYEE_REQUEST_RECEIVED" as const,
        title: "Cerere nouă Art. 7 — Transparență salarială",
        body: `${parsed.data.requestedBy} (${parsed.data.requestEmail}) a solicitat informații despre remunerare. Termen de răspuns: ${dueDate.toLocaleDateString("ro-RO")}.`,
        link: "/employee-portal",
        sourceRole: "CCO",
        requestKind: "ACTION" as const,
        requestData: JSON.stringify({
          whatIsNeeded: `Furnizati informatiile salariale solicitate de ${parsed.data.requestedBy} conform Art. 7 Directiva Transparenta Salariala`,
          context: `Cerere legala cu termen obligatoriu. Trebuie furnizate: grila salariala aplicabila, media remuneratiei pe categorie, criteriile de determinare a salariului.`,
          deadline: dueDate.toLocaleDateString("ro-RO"),
          resourceLabel: `Cerere Art. 7 — ${parsed.data.requestedBy}`,
        }),
      })),
    })

    // Email notification
    if (resend && admins.length > 0) {
      try {
        await resend.emails.send({
          from: "JobGrade <noreply@jobgrade.ro>",
          to: admins.map((u) => u.email),
          subject: `Cerere nouă Art. 7 — ${parsed.data.requestedBy}`,
          html: `
            <p>Bună ziua,</p>
            <p><strong>${parsed.data.requestedBy}</strong> (${parsed.data.requestEmail}) a transmis o cerere de informații salariale în baza Art. 7 al Directivei EU 2023/970.</p>
            <p><strong>Detalii cerere:</strong> ${parsed.data.requestDetails}</p>
            <p><strong>Termen legal de răspuns:</strong> ${dueDate.toLocaleDateString("ro-RO")} (2 luni)</p>
            <p>Accesați platforma pentru a răspunde cererii.</p>
          `,
        })
      } catch (emailErr) {
        console.error("[EMPLOYEE REQUEST EMAIL]", emailErr)
      }
    }

    // Confirm to employee
    if (resend) {
      try {
        await resend.emails.send({
          from: "JobGrade <noreply@jobgrade.ro>",
          to: [parsed.data.requestEmail],
          subject: "Cererea dvs. Art. 7 a fost înregistrată",
          html: `
            <p>Stimate/Stimată ${parsed.data.requestedBy},</p>
            <p>Cererea dvs. de informații privind remunerarea a fost înregistrată.</p>
            <p>Conform Art. 7.4 al Directivei EU 2023/970, veți primi răspuns în termen de 2 luni (până la <strong>${dueDate.toLocaleDateString("ro-RO")}</strong>).</p>
            <p>Număr cerere: <strong>${request.id}</strong></p>
          `,
        })
      } catch (emailErr) {
        console.error("[EMPLOYEE REQUEST CONFIRM EMAIL]", emailErr)
      }
    }

    return NextResponse.json(
      { message: "Cererea a fost înregistrată.", requestId: request.id, dueDate },
      { status: 201 }
    )
  } catch (error) {
    console.error("[EMPLOYEE REQUESTS POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
