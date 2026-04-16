import { redirect } from "next/navigation"

// /gdpr e un alias istoric — redirect permanent la /privacy
export default function GdprRedirect() {
  redirect("/privacy")
}
