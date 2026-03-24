import { auth } from "@/lib/auth"
import SecurityForm from "@/components/settings/SecurityForm"

export const metadata = { title: "Securitate" }

export default async function SecurityPage() {
  const session = await auth()
  const user = session!.user

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profilul meu</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestionează datele contului și parola
        </p>
      </div>
      <SecurityForm
        userId={user.id}
        name={user.name ?? ""}
        email={user.email ?? ""}
      />
    </div>
  )
}
