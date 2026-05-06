import Card2Chat from "@/components/b2c/Card2Chat"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Eu si ceilalti | JobGrade",
  description: "Exploreaza relatiile tale interpersonale — comunicare, empatie, rezolvare conflicte.",
}

export default function Card2Page({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Eu si ceilalti</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consilierul tau de relatii — descopera cum comunici, cum asculti si cum construiesti relatii sanatoase.
        </p>
      </div>
      <Card2Chat userId="demo-user" />
    </div>
  )
}
