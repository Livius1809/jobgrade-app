import Image from "next/image"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Stanga — branding */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-coral to-indigo text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <Image src="/logo-white.svg" alt="JobGrade" width={32} height={32} />
            <span className="text-xl font-bold">JobGrade</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Evaluam posturi. Construim echitate.
          </h1>
          <p className="text-white/70 text-lg">
            Construit pentru realitatile de aici.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span>Evaluare pe criterii obiective</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span>Consens colaborativ in echipa</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span>Ierarhie salariala transparenta</span>
          </div>
        </div>
      </div>

      {/* Dreapta — formular */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Logo pe mobil */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Image src="/logo.svg" alt="JobGrade" width={32} height={32} />
            <span className="text-xl font-bold text-foreground">JobGrade</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
