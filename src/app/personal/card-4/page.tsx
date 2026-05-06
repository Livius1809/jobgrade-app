import Card4Chat from "@/components/b2c/Card4Chat"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Oameni de succes/valoare | JobGrade",
  description: "Descopera diferenta dintre succes si valoare — drumul de la orgoliu la smerenie.",
}

export default function Card4Page({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Oameni de succes/valoare</h1>
        <p className="text-sm text-gray-500 mt-1">
          Coach-ul tau de dezvoltare personala — descopera ce inseamna cu adevarat valoare.
        </p>
      </div>
      <Card4Chat userId="demo-user" />
    </div>
  )
}
