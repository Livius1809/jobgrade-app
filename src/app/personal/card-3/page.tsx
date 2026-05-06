import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Card3Career from "@/components/b2c/Card3Career"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Îmi asum un rol profesional | JobGrade",
  description: "Descoperă-ți valoarea profesională și găsește-ți locul potrivit.",
}

export default async function Card3Page({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const params = await searchParams
  const userId = params.userId

  // Validate userId exists in DB (B2C JWT auth is enforced on API routes;
  // this page validates the user param until a full cookie-based B2C session is added)
  if (!userId) {
    redirect("/personal")
  }

  const b2cUser = await prisma.b2CUser.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  })

  if (!b2cUser) {
    redirect("/personal")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Imi asum un rol profesional</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consilierul tau de cariera — descopera-ti valoarea si gaseste-ti locul potrivit.
        </p>
      </div>
      <Card3Career userId={b2cUser.id} />
    </div>
  )
}
