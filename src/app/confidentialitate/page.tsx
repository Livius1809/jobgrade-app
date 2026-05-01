import { redirect } from "next/navigation"

// /confidentialitate → redirect la /privacy (pagina principală de confidențialitate)
export default function ConfidentialitateRedirect() {
  redirect("/privacy")
}
