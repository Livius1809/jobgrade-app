import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  tenantName: z.string().min(2).optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  cui: z.string().optional(),
  regCom: z.string().optional(),
  address: z.string().optional(),
  county: z.string().optional(),
  caenCode: z.string().optional(),
  caenName: z.string().optional(),
  isVATPayer: z.boolean().optional(),
  anafSyncedAt: z.string().datetime().optional(),
})

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    await prisma.$transaction(async (tx: any) => {
      if (data.tenantName) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { name: data.tenantName },
        })
      }

      const sharedFields = {
        website: data.website || null,
        description: data.description || null,
        mission: data.mission || null,
        vision: data.vision || null,
        industry: data.industry || null,
        size: data.size || null,
        cui: data.cui || null,
        regCom: data.regCom || null,
        address: data.address || null,
        county: data.county || null,
        caenCode: data.caenCode || null,
        caenName: data.caenName || null,
        isVATPayer: data.isVATPayer ?? null,
        anafSyncedAt: data.anafSyncedAt ? new Date(data.anafSyncedAt) : null,
      }

      await tx.companyProfile.upsert({
        where: { tenantId },
        update: sharedFields,
        create: { tenantId, ...sharedFields },
      })
    })

    // Company Profiler: profil actualizat = acțiune semnificativă
    import("@/lib/company-profiler").then(m => m.onSignificantAction(tenantId)).catch(() => {})
    // MVV rebuild
    import("@/lib/mvv/builder").then(m => m.mvvRebuildIfNeeded(tenantId)).catch(() => {})
    // CUI tracking — verificăm dacă CUI-ul a mai fost văzut (alt cont, aceeași firmă)
    if (data.cui) {
      import("@/lib/company-profiler/portability").then(async ({ trackCUIPresence }) => {
        await trackCUIPresence(data.cui!, tenantId)
      }).catch(() => {})
    }

    // Profiler B2B alimenteaza learning — ce aflam despre client e cunoastere universala
    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      const profileSummary = [data.industry, data.size, data.description?.slice(0, 100)].filter(Boolean).join(". ")
      if (profileSummary.length > 20) {
        await learningFunnel({
          agentRole: "SOA", type: "FEEDBACK",
          input: `Profil companie actualizat: ${data.cui || "fara CUI"}`,
          output: profileSummary,
          success: true,
          metadata: { source: "company-profiler", tenantId, industry: data.industry },
        })
      }
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[COMPANY PUT]", errMsg, error)
    return NextResponse.json(
      {
        message: `Eroare internă: ${errMsg.slice(0, 200)}`,
      },
      { status: 500 }
    )
  }
}
