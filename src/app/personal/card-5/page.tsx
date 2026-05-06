import Card5Chat from "@/components/b2c/Card5Chat"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Antreprenoriat transformational | JobGrade",
  description: "Transforma cunoasterea de sine intr-un proiect care serveste si pe altii.",
}

export default function Card5Page({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Antreprenoriat transformational</h1>
        <p className="text-sm text-gray-500 mt-1">
          Coach-ul tau antreprenorial — construieste ceva de valoare in lume.
        </p>
      </div>
      <Card5Chat userId="demo-user" />
    </div>
  )
}
