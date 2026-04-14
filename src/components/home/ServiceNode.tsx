"use client"

import { ScrollReveal } from "./ScrollReveal"

/* ── Micro-icons per serviciu ───────────────────────────────────── */

const serviceIcons: Record<string, string> = {
  // B2C — personal, cald
  "Drumul către mine":          "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 10c-2.5 0-4.7-1.3-6-3.2.03-2 4-3.1 6-3.1s5.97 1.1 6 3.1A7.5 7.5 0 0 1 12 17z", // persoană
  "Profilul tău profesional":   "M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM10 4h4v2h-4z", // servietă
  "Eu și ceilalți":             "M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-.9.1 1.1.8 1.9 1.9 1.9 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z", // grup
  "Oameni de succes / Oameni de valoare": "M12 2L9.2 8.6 2 9.2l5.5 4.7L5.8 21 12 17.3 18.2 21l-1.7-7.1L22 9.2l-7.2-.6z", // stea
  "Antreprenoriat transformațional": "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 17.9c-3.9-.5-7-3.9-7-7.9 0-.6.1-1.2.2-1.8L9 15v1c0 1.1.9 2 2 2zm6.9-2.5c-.3-.8-1-1.4-1.9-1.4h-1v-3c0-.6-.4-1-1-1H8v-2h2c.6 0 1-.4 1-1V7h2c1.1 0 2-.9 2-2v-.4c2.9 1.2 5 4.1 5 7.4 0 2.1-.8 4-2.1 5.4z", // glob
  "Spune-mi despre mine":       "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm0-4h-2V7h2z", // oglindă/info

  // B2B — structural, profesional
  "Evaluarea posturilor":       "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.9 0 3.5 1.6 3.5 3.5S13.9 13 12 13s-3.5-1.6-3.5-3.5S10.1 6 12 6zm7 13H5v-.8c0-1.3 2.2-2.5 3.5-3 1-.4 2.2-.7 3.5-.7s2.5.2 3.5.7c1.3.5 3.5 1.6 3.5 3z", // evaluare
  "Structuri salariale echitabile": "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 17h-2v-1h2zm0-3h-2V7h2z", // balanță simplificată
  "Evaluarea personalului": "M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-5 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8c-2 0-6 1-6 3v2h12v-2c0-2-4-3-6-3zm-8 5c-1.3.7-3 1.7-3 3v2h5v-2c0-1.2.5-2.2 1.3-3zm13.7 0c.8.8 1.3 1.8 1.3 3v2h5v-2c0-1.3-1.7-2.3-3-3z", // echipă
  "Evaluarea personalului și armonizarea echipelor de lucru": "M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-5 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8c-2 0-6 1-6 3v2h12v-2c0-2-4-3-6-3zm-8 5c-1.3.7-3 1.7-3 3v2h5v-2c0-1.2.5-2.2 1.3-3zm13.7 0c.8.8 1.3 1.8 1.3 3v2h5v-2c0-1.3-1.7-2.3-3-3z", // echipă
  "Cultură organizațională și performanță": "M3 13h2v-2H3zm0 4h2v-2H3zm0-8h2V7H3zm4 4h14v-2H7zm0 4h14v-2H7zM7 7v2h14V7z", // cultură/linii
  "Armonizarea proceselor interne și Manualul calității": "M19.4 5.4L18 4l-6 6-6-6L4.6 5.4 10.6 11.4l-6 6L6 18.8l6-6 6 6 1.4-1.4-6-6z", // proces/flux — folosim altceva
  "Management multigenerațional": "M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-.9.1 1.1.8 1.9 1.9 1.9 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z", // generații
  "Conformitate și transparență salarială": "M12 1L3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5zm0 10.9h7c-.5 4-3.3 7.5-7 8.8V12H5V6.3l7-3.1v8.7z", // scut
  "Diagnoză organizațională":   "M19.4 10.4L12 3 4.6 10.4A2 2 0 0 0 4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7c0-.6-.2-1.1-.6-1.6zM12 18c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z", // diagnoză/casă
}

// Fallback: selectează path-ul cel mai potrivit folosind lookup, sau dot implicit
function getIconPath(service: string): string | null {
  return serviceIcons[service] ?? null
}

interface ServiceNodeProps {
  side: "left" | "right"
  evocative: string
  service: string
  delay?: number
  active?: boolean
}

export function ServiceNode({ side, evocative, service, delay = 0, active = true }: ServiceNodeProps) {
  const isLeft = side === "left"
  const iconPath = getIconPath(service)

  return (
    <ScrollReveal delay={delay} direction={isLeft ? "left" : "right"}>
      <div className={`flex flex-col ${isLeft ? "items-end text-right" : "items-start text-left"} ${!active ? "opacity-50" : ""}`}>
        {/* Icon or connector dot */}
        {iconPath ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`mb-4 ${isLeft ? "text-coral/40" : "text-indigo/40"}`}
            style={{ animation: "breatheSlow 4s ease-in-out infinite" }}
          >
            <path d={iconPath} />
          </svg>
        ) : (
          <div
            className={`w-2.5 h-2.5 rounded-full mb-4 ${
              isLeft ? "bg-coral/60" : "bg-indigo/60"
            }`}
            style={{ animation: "breatheSlow 4s ease-in-out infinite" }}
          />
        )}
        {/* Evocative phrase — curiosity */}
        <p
          className={`text-[15px] italic leading-relaxed mb-4 ${
            isLeft ? "text-coral-dark" : "text-indigo"
          }`}
        >
          {evocative}
        </p>
        {/* Service name + badge */}
        <div className={`flex items-center gap-2 ${isLeft ? "flex-row-reverse" : ""}`}>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${
              isLeft ? "text-coral/50" : "text-indigo/50"
            }`}
          >
            {service}
          </p>
          {!active && (
            <span
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                isLeft ? "bg-coral/10 text-coral/60" : "bg-indigo/10 text-indigo/60"
              }`}
            >
              în curând
            </span>
          )}
        </div>
      </div>
    </ScrollReveal>
  )
}
