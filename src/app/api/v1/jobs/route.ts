import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { JobStatus } from "@/generated/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const jobs = await prisma.job.findMany({
      where: { tenantId: session.user.tenantId, status: { in: ["ACTIVE", "DRAFT"] } },
      select: { id: true, title: true, departmentId: true, status: true, createdAt: true },
      orderBy: { title: "asc" },
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error("[JOBS GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

const schema = z.object({
  title: z.string().min(2),
  code: z.string().optional(), // Cod COR (ex: "2514")
  corName: z.string().optional(), // Denumire COR (ex: "Programatori")
  departmentId: z.string().optional(),
  representativeId: z.string().optional(),
  purpose: z.string().optional(),
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
  aiAnalysis: z.any().optional(),
  aiAnalyzed: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    // Sugestie COR automată dacă nu e specificat
    let corCode = data.code || null
    let corName = data.corName || null
    if (!corCode && data.title) {
      try {
        const { suggestCOR } = await import("@/lib/cor/nomenclator")
        const suggestions = suggestCOR(data.title)
        if (suggestions.length > 0) {
          corCode = suggestions[0].code
          corName = suggestions[0].name
        }
      } catch {}
    }

    const job = await prisma.job.create({
      data: {
        tenantId: session.user.tenantId,
        title: data.title,
        code: corCode,
        departmentId: data.departmentId || null,
        representativeId: data.representativeId || null,
        purpose: data.purpose || null,
        responsibilities: data.responsibilities || null,
        requirements: data.requirements || null,
        status: data.status,
        aiAnalysis: data.aiAnalysis || undefined,
        aiAnalyzed: data.aiAnalyzed || false,
      },
    })

    // Hook: rebuild MVV progresiv + invalidare profil companie (non-blocking)
    import("@/lib/mvv/builder").then(m => m.mvvRebuildIfNeeded(session.user.tenantId)).catch(() => {})
    import("@/lib/company-profiler").then(m => m.onSignificantAction(session.user.tenantId)).catch(() => {})

    // Job creat = cunoaștere despre structura organizațională a clientului
    try {
      const { learnFromClientInput } = await import("@/lib/learning-hooks")
      await learnFromClientInput(session.user.tenantId, "JOB", `Post creat: ${data.title}${data.departmentId ? ` (dept ${data.departmentId})` : ""}, scop: ${(data.purpose || "nespecificat").slice(0, 200)}`)
    } catch {}

    return NextResponse.json({ id: job.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[JOBS POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
