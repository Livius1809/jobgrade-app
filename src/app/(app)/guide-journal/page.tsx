import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import GuideJournalClient from "./GuideJournalClient"

export const dynamic = "force-dynamic"

export default async function GuideJournalPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  return (
    <div className="p-6">
      <GuideJournalClient />
    </div>
  )
}
