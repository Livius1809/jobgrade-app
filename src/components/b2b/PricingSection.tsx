"use client"

import Link from "next/link"
import { BillingToggle } from "./BillingToggle"

export function PricingSection() {
  return (
    <section id="abonament" className="py-24">
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
          Abonamentul
        </h2>
        <p className="text-center text-slate-500 text-sm mb-8 max-w-xl mx-auto">
          Același preț pentru toți. Diferența o faci prin ce servicii consumi.
        </p>

        <BillingToggle>
          {(isAnnual) => (
            <div className="rounded-2xl p-8 border-2 border-indigo-500 shadow-xl shadow-indigo-100">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900">Abonament JobGrade</h3>
                <p className="text-sm text-slate-500 mt-2">Tot ce ai nevoie pentru a începe</p>
              </div>

              <div className="mt-6 text-center">
                <span className="text-4xl font-extrabold text-slate-900">—</span>
                <span className="text-lg text-slate-500"> RON/{isAnnual ? "an" : "lună"}</span>
                {isAnnual && (
                  <p className="text-sm text-emerald-600 mt-1">Echivalent — RON/lună (economisești 20%)</p>
                )}
              </div>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Feature text="Acces complet la portal" />
                  <Feature text="Găzduire date securizată (GDPR)" />
                  <Feature text="1h consultanță HR/lună" />
                  <Feature text="Suport email + chat" />
                </div>
                <div className="space-y-3">
                  <Feature text="Actualizări legislative automate" />
                  <Feature text="Export PDF/Excel" />
                  <Feature text="Acces la toate serviciile (cu credite)" />
                  <Feature text="Fără limită de poziții sau angajați" />
                </div>
              </div>

              <div className="mt-8 text-center">
                <Link href="/register" className="inline-flex items-center justify-center px-8 py-3 rounded-xl text-base font-semibold text-white transition-all hover:shadow-xl bg-[#E85D43] hover:bg-[#d04e36]">
                  Creează cont
                </Link>
                <p className="text-xs text-slate-400 mt-3">
                  {isAnnual ? "Facturare anuală (plată unică). Fără angajament ulterior." : "Facturare lunară. Poți anula oricând."}
                </p>
              </div>
            </div>
          )}
        </BillingToggle>
      </div>
    </section>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-600">
      <span className="text-indigo-500 mt-0.5 shrink-0">&#10003;</span>
      <span>{text}</span>
    </div>
  )
}
