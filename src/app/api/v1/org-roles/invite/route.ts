import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { OrgRole } from "@/generated/prisma"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const InviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).optional().default(""),
  lastName: z.string().min(1).optional().default(""),
  orgRole: z.nativeEnum(OrgRole),
})

/**
 * POST /api/v1/org-roles/invite
 * Creează un user INVITED + alocă rolul organizațional + trimite email invitație
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId, id: currentUserId } = session.user
    if (!["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const body = await req.json()
    const parsed = InviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    // Verifică dacă emailul există deja în tenant
    const existing = await prisma.user.findFirst({
      where: { tenantId, email: parsed.data.email },
    })

    if (existing) {
      // User existent — doar adaugă rolul
      const existingRole = await prisma.userOrgRole.findFirst({
        where: { userId: existing.id, orgRole: parsed.data.orgRole },
      })
      if (existingRole) {
        return NextResponse.json(
          { message: "Acest utilizator are deja rolul alocat." },
          { status: 409 }
        )
      }

      await prisma.userOrgRole.create({
        data: {
          userId: existing.id,
          tenantId,
          orgRole: parsed.data.orgRole,
          assignedBy: currentUserId,
        },
      })

      return NextResponse.json({
        message: "Rolul a fost alocat utilizatorului existent.",
        userId: existing.id,
        isNew: false,
      })
    }

    // User nou — crează cu status INVITED
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    })

    // Mapare OrgRole → UserRole platformă
    const platformRole = mapOrgRoleToPlatformRole(parsed.data.orgRole)

    const newUser = await prisma.user.create({
      data: {
        tenantId,
        email: parsed.data.email,
        firstName: parsed.data.firstName || parsed.data.email.split("@")[0],
        lastName: parsed.data.lastName || "",
        role: platformRole,
        status: "INVITED",
      },
    })

    // Alocă rolul organizațional
    await prisma.userOrgRole.create({
      data: {
        userId: newUser.id,
        tenantId,
        orgRole: parsed.data.orgRole,
        assignedBy: currentUserId,
      },
    })

    // Notificare in-app
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        type: "AGENT_MESSAGE",
        title: "Invitatie in platforma JobGrade",
        body: `Ati fost invitat in platforma JobGrade de ${tenant?.name ?? "companie"}.`,
        link: "/portal",
        sourceRole: "SYSTEM",
      },
    })

    // Email invitație
    if (resend && tenant) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://jobgrade.ro"
      try {
        await resend.emails.send({
          from: "JobGrade <noreply@jobgrade.ro>",
          to: [parsed.data.email],
          subject: `Invitatie in platforma JobGrade — ${tenant.name}`,
          html: `
            <p>Buna ziua${parsed.data.firstName ? ` ${parsed.data.firstName}` : ""},</p>
            <p>Ati fost invitat de <strong>${tenant.name}</strong> sa utilizati platforma JobGrade.</p>
            <p>Rol alocat: <strong>${getRoleLabel(parsed.data.orgRole)}</strong></p>
            <p>Pentru a va activa contul, accesati:</p>
            <p><a href="${appUrl}/register?email=${encodeURIComponent(parsed.data.email)}&tenant=${tenant.slug}" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Activare cont →</a></p>
            <p style="font-size:12px;color:#666;margin-top:24px;">Daca nu ati solicitat aceasta invitatie, ignorati acest email.</p>
          `,
        })
      } catch (emailErr) {
        console.error("[ORG-ROLES INVITE EMAIL]", emailErr)
      }
    }

    return NextResponse.json({
      message: "Invitatie trimisa.",
      userId: newUser.id,
      isNew: true,
    }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { message: "Acest email exista deja in organizatie." },
        { status: 409 }
      )
    }
    console.error("[ORG-ROLES INVITE]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}

function mapOrgRoleToPlatformRole(orgRole: OrgRole): "OWNER" | "COMPANY_ADMIN" | "FACILITATOR" | "REPRESENTATIVE" {
  switch (orgRole) {
    case "DG":
      return "OWNER"
    case "IDG":
    case "DHR":
    case "RSAL":
    case "RREC":
    case "RAP":
    case "RLD":
      return "COMPANY_ADMIN"
    case "FJE":
    case "FA10":
    case "CEXT":
      return "FACILITATOR"
    case "REPS":
    case "REPM":
    case "SAL":
    default:
      return "REPRESENTATIVE"
  }
}

function getRoleLabel(orgRole: OrgRole): string {
  const labels: Record<string, string> = {
    DG: "Director General / Owner",
    IDG: "Imputernicit DG",
    DHR: "Director HR",
    RSAL: "Responsabil Salarizare",
    RREC: "Responsabil Recrutare",
    RAP: "Responsabil Administrare Personal",
    RLD: "Responsabil Learning & Development",
    FJE: "Facilitator Evaluare Posturi",
    FA10: "Facilitator Evaluare Comuna",
    REPS: "Reprezentant Salariati",
    REPM: "Reprezentant Management",
    CEXT: "Consultant Extern",
    SAL: "Salariat",
  }
  return labels[orgRole] ?? orgRole
}
