import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const ConfigSchema = z.object({
  companyName: z.string().min(1),
  adminEmail: z.string().email(),
  customMessage: z.string().optional(),
  gdprConfirmed: z.boolean(),
})

/**
 * GET — configurare curentă notificare anuală
 */
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const config = await prisma.systemConfig.findUnique({
    where: { key: `ANNUAL_NOTIFICATION_${session.user.tenantId}` },
  }).catch(() => null)

  return NextResponse.json({
    config: config ? JSON.parse(config.value) : null,
  })
}

/**
 * POST — generează template email + trimite la admin + loghează
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId } = session.user
    if (!["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const body = await req.json()
    const parsed = ConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    if (!parsed.data.gdprConfirmed) {
      return NextResponse.json(
        { message: "Confirmarea GDPR este obligatorie." },
        { status: 400 }
      )
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://jobgrade.ro"
    const requestUrl = `${appUrl}/portal/${tenant?.slug}`

    // Template email HTML pe care adminul il da forward
    const emailTemplate = buildAnnualNotificationTemplate({
      companyName: parsed.data.companyName,
      requestUrl,
      customMessage: parsed.data.customMessage,
      year: new Date().getFullYear(),
    })

    // Salvăm configurarea
    const configKey = `ANNUAL_NOTIFICATION_${tenantId}`
    await prisma.systemConfig.upsert({
      where: { key: configKey },
      create: {
        key: configKey,
        value: JSON.stringify({
          companyName: parsed.data.companyName,
          adminEmail: parsed.data.adminEmail,
          customMessage: parsed.data.customMessage,
          lastSentAt: new Date().toISOString(),
          sentCount: 1,
        }),
        label: "Configurare notificare anuala Art. 6",
      },
      update: {
        value: JSON.stringify({
          companyName: parsed.data.companyName,
          adminEmail: parsed.data.adminEmail,
          customMessage: parsed.data.customMessage,
          lastSentAt: new Date().toISOString(),
          sentCount: 1, // incrementat la fiecare send
        }),
      },
    })

    // Trimitem email-ul LA ADMIN (nu la angajați)
    if (resend) {
      try {
        await resend.emails.send({
          from: "JobGrade <noreply@jobgrade.ro>",
          to: [parsed.data.adminEmail],
          subject: `Template notificare anuala Art. 6 — de distribuit angajatilor ${parsed.data.companyName}`,
          html: `
            <p>Buna ziua,</p>
            <p>Mai jos gasiti template-ul de notificare anuala conform Art. 6 Directiva EU 2023/970.</p>
            <p><strong>Ce trebuie sa faceti:</strong> Copiati continutul de mai jos si trimiteti-l tuturor angajatilor din organizatie (forward/mail merge din email-ul organizatiei).</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
            ${emailTemplate}
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 11px; color: #666;">
              Acest email a fost generat automat de platforma JobGrade.
              Actiunea a fost inregistrata in jurnalul de conformitate.
            </p>
          `,
        })
      } catch (emailErr) {
        console.error("[ANNUAL NOTIFICATION EMAIL]", emailErr)
      }
    }

    // Jurnal
    await prisma.interactionLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        eventType: "FEATURE_USE",
        entityType: "compliance",
        detail: `Template notificare anuala Art. 6 trimis la ${parsed.data.adminEmail} pentru distribuire.`,
      },
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      message: "Template-ul a fost trimis la adresa dvs. de email. Distribuiti-l angajatilor.",
      emailTemplate,
    })
  } catch (error) {
    console.error("[ANNUAL NOTIFICATION]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}

// ── Template email ──────────────────────────────────────────────────────

function buildAnnualNotificationTemplate(opts: {
  companyName: string
  requestUrl: string
  customMessage?: string
  year: number
}): string {
  return `
<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937;">
  <div style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); padding: 32px 24px; border-radius: 16px 16px 0 0;">
    <h1 style="color: white; font-size: 20px; margin: 0 0 8px 0;">Dreptul dvs. la informatii salariale</h1>
    <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">
      ${opts.companyName} · Notificare anuala ${opts.year}
    </p>
  </div>

  <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Stimate/Stimata coleg/colega,
    </p>

    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Va informam ca, in conformitate cu <strong>Art. 7 al Directivei (UE) 2023/970</strong>
      privind transparenta salariala, aveti dreptul sa solicitati urmatoarele informatii:
    </p>

    <div style="background: #F5F3FF; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <ul style="font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px; color: #374151;">
        <li><strong>Nivelul dvs. salarial actual</strong> — salariul de baza brut lunar aferent pozitiei dvs.</li>
        <li><strong>Media salariala pe categoria dvs., defalcata pe gen</strong> — media remuneratiei pentru colegii din aceeasi categorie de munca, separat barbati/femei (date agregate, anonimizate)</li>
        <li><strong>Clasa salariala si intervalul salarial</strong> — in ce clasa sunteti incadrat si care e intervalul minim-maxim</li>
        <li><strong>Criteriile de progresie salariala</strong> — criteriile obiective pe baza carora se stabileste si progreseaza salariul</li>
        <li><strong>Pachetul de beneficii</strong> — compensatia variabila si beneficiile aferente categoriei dvs.</li>
      </ul>
    </div>

    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      <strong>Angajatorul are obligatia de a va raspunde in termen de maximum 2 luni</strong> de la primirea cererii (Art. 7 alin. 4).
    </p>

    ${opts.customMessage ? `
    <div style="background: #FFF7ED; border-left: 3px solid #F59E0B; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
      <p style="font-size: 13px; color: #92400E; margin: 0;">${opts.customMessage}</p>
    </div>
    ` : ""}

    <div style="text-align: center; margin: 24px 0;">
      <a href="${opts.requestUrl}"
         style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7C3AED, #5B21B6); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
        Trimiteti o cerere de informatii
      </a>
    </div>

    <p style="font-size: 12px; color: #6B7280; line-height: 1.5; margin-top: 20px;">
      Cererea este confidentiala si nu va afecta in niciun fel raportul dvs. de munca.
      Datele sunt procesate conform GDPR si Directivei EU 2023/970.
      In cazul in care nu primiti raspuns in termenul legal, puteti contacta Inspectia Muncii sau autoritatea nationala de egalitate.
    </p>

    <hr style="margin: 20px 0; border: none; border-top: 1px solid #f3f4f6;" />

    <p style="font-size: 11px; color: #9CA3AF; text-align: center;">
      ${opts.companyName} · Notificare anuala conform Art. 6 Directiva (UE) 2023/970
    </p>
  </div>
</div>`
}
