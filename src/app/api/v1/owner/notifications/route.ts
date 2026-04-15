import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const notifications = await (prisma as any).notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json({ notifications })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "id obligatoriu" }, { status: 400 })

  await (prisma as any).notification.update({
    where: { id },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}
