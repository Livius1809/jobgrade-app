import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ActivateForm from "./ActivateForm"

export const metadata = { title: "Activare cont" }

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    redirect("/login")
  }

  // Verify token exists and is not expired
  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      expires: { gt: new Date() },
    },
  })

  if (!verificationToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-600 text-xl">✕</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Link expirat</h1>
          <p className="text-sm text-gray-500">
            Link-ul de activare a expirat sau este invalid.
            Contactează administratorul pentru o nouă invitație.
          </p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Mergi la autentificare
          </a>
        </div>
      </div>
    )
  }

  // Find the user by email
  const user = await prisma.user.findFirst({
    where: {
      email: verificationToken.identifier,
      status: "INVITED",
    },
    select: { firstName: true, email: true },
  })

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Activează-ți contul</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bun venit, <strong>{user.firstName}</strong>! Setează o parolă pentru contul tău.
          </p>
        </div>
        <ActivateForm token={token} email={user.email} />
      </div>
    </div>
  )
}
