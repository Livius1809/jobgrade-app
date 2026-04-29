import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DocsClient from "./DocsClient"

export const dynamic = "force-dynamic"

export default async function DocsPage() {
  const session = await auth()
  if (!session || !["OWNER", "SUPER_ADMIN"].includes(session.user.role || "")) {
    redirect("/login")
  }

  // Cheia e pasată direct din Server Component — nu mai depinde de API route auth
  const ingestKey = process.env.INTERNAL_API_KEY || ""

  return <DocsClient ingestKey={ingestKey} />
}
