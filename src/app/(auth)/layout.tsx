export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Stânga — branding */}
      <div className="hidden lg:flex lg:w-2/5 bg-slate-900 text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 bg-blue-500 rounded-lg" />
            <span className="text-xl font-bold">JobGrade</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Structurează echitatea salarială în compania ta
          </h1>
          <p className="text-slate-400 text-lg">
            Evaluare structurată. Consens automat. Clase salariale.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">✓</div>
            <span>Evaluare structurată pe criterii</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">✓</div>
            <span>Mecanism de consens automat</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">✓</div>
            <span>Clase salariale și rapoarte</span>
          </div>
        </div>
      </div>

      {/* Dreapta — formular */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo pe mobil */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-lg" />
            <span className="text-xl font-bold">JobGrade</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
