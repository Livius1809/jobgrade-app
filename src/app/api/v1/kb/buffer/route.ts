import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  agentRole: z.string().min(1),
  rawContent: z.string().min(10),
  sessionRef: z.string().optional(),
  // Dacă experiența mai există în buffer, incrementează occurrences în loc să creeze duplicat
  mergeIfExists: z.boolean().optional().default(true),
})

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (data.mergeIfExists) {
      // Caută un buffer existent similar (primele 100 caractere ca fingerprint aproximativ)
      const fingerprint = data.rawContent.slice(0, 100).trim()
      const existing = await prisma.kBBuffer.findFirst({
        where: {
          agentRole: data.agentRole,
          status: "PENDING",
          rawContent: { startsWith: fingerprint },
        },
      })

      if (existing) {
        const updated = await prisma.kBBuffer.update({
          where: { id: existing.id },
          data: { occurrences: { increment: 1 } },
        })
        return NextResponse.json({ action: "merged", buffer: updated })
      }
    }

    const buffer = await prisma.kBBuffer.create({
      data: {
        agentRole: data.agentRole,
        rawContent: data.rawContent,
        sessionRef: data.sessionRef,
      },
    })

    return NextResponse.json({ action: "created", buffer }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[KB BUFFER]", error)
    return NextResponse.json({ message: "Eroare la adăugare în buffer." }, { status: 500 })
  }
}
