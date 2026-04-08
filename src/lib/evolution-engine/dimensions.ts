/**
 * dimensions.ts — Definițiile celor 8 dimensiuni per context
 *
 * Fiecare context are propriile dimensiuni, dar structura e identică.
 * Asta e FRACTALUL — aceeași formă la scări diferite.
 */

import type { DimensionDefinition } from "./types"

// ── OWNER — Oglinda personală a fondatorului ───────────────────────────────

export const OWNER_DIMENSIONS: DimensionDefinition[] = [
  {
    code: "profil_decizional",
    name: "Profil decizional",
    weight: 0.10,
    description: "Tipuri de decizii, frecvență, echilibru aprobare/respingere/amânare",
  },
  {
    code: "aliniere_l1",
    name: "Aliniere CÂMPUL",
    weight: 0.20,
    description: "Cât de aliniate sunt input-urile la BINE (moral, etică, conștiință)",
  },
  {
    code: "aliniere_l2",
    name: "Calibrare culturală",
    weight: 0.10,
    description: "Calibrare lingvistică, profesională, stilul Daniel David",
  },
  {
    code: "aliniere_l3",
    name: "Cadrul legal",
    weight: 0.15,
    description: "Conștiință juridică, deontologică, GDPR, AI Act",
  },
  {
    code: "pattern_awareness",
    name: "Conștientizare pattern-uri",
    weight: 0.15,
    description: "Tendințe repetitive (Umbra Owner), auto-observare",
  },
  {
    code: "comunicare",
    name: "Calitatea comunicării",
    weight: 0.10,
    description: "Stil, claritate, concizie, eleganță, storytelling",
  },
  {
    code: "relatie_echipa",
    name: "Relația cu echipa",
    weight: 0.10,
    description: "Prezență, dialog, frecvență interacțiuni, echilibru control/autonomie",
  },
  {
    code: "autenticitate",
    name: "Autenticitate",
    weight: 0.10,
    description: "Coerența între valori declarate și acțiuni, gând-vorbă-faptă",
  },
]

// ── INTERNAL — Evoluția agenților AI ───────────────────────────────────────

export const INTERNAL_DIMENSIONS: DimensionDefinition[] = [
  {
    code: "inteligenta",
    name: "Inteligență",
    weight: 0.15,
    description: "Calitatea cunoașterii acumulate (KB confidence, reflecții, pattern detection)",
  },
  {
    code: "compatibilitate",
    name: "Compatibilitate cu rolul",
    weight: 0.15,
    description: "Activitate aliniată cu atribuțiile, KB coverage, escaladări",
  },
  {
    code: "autonomie",
    name: "Autonomie decizională",
    weight: 0.12,
    description: "Decizii fără escaladare vs. delegate în sus",
  },
  {
    code: "calitate_decizii",
    name: "Calitatea deciziilor",
    weight: 0.15,
    description: "Idei promovate, escaladări rezolvate, cunoaștere exportată",
  },
  {
    code: "rezolvare_probleme",
    name: "Rezolvare probleme",
    weight: 0.13,
    description: "Intervenții, cross-domain insights, complexitate",
  },
  {
    code: "colaborare",
    name: "Colaborare",
    weight: 0.10,
    description: "Cross-pollination, knowledge sharing bidirecțional",
  },
  {
    code: "invatare",
    name: "Învățare și adaptare",
    weight: 0.10,
    description: "Ritm creștere KB, reflecție activă, absorbție de la colegi",
  },
  {
    code: "aliniere_morala",
    name: "Aliniere morală",
    weight: 0.10,
    description: "Coerență cu CÂMPUL, zero incidente etice",
  },
]

// ── B2B — Oglinda organizațională ──────────────────────────────────────────

export const B2B_DIMENSIONS: DimensionDefinition[] = [
  {
    code: "maturitate_evaluare",
    name: "Maturitate evaluare posturi",
    weight: 0.15,
    description: "Câte posturi evaluate, calitate consens, recalibrări, benchmark",
  },
  {
    code: "echitate_salariala",
    name: "Echitate salarială",
    weight: 0.15,
    description: "Gap-uri gen/nivel, trend corecții, conformitate Directiva EU 2023/970",
  },
  {
    code: "transparenta",
    name: "Transparență",
    weight: 0.12,
    description: "Cât de deschis e procesul intern, comunicare cu angajații, rapoarte partajate",
  },
  {
    code: "engagement",
    name: "Engagement echipă",
    weight: 0.13,
    description: "Participare evaluatori, feedback, rata completare, timp răspuns",
  },
  {
    code: "utilizare_instrumente",
    name: "Utilizare instrumente",
    weight: 0.10,
    description: "Superficial vs. profund — câte features folosesc, frecvență, diversitate",
  },
  {
    code: "aliniere_valori",
    name: "Aliniere valori",
    weight: 0.15,
    description: "Valori declarate (MVV) vs. practicate în evaluări și decizii salariale",
  },
  {
    code: "evolutie_timp",
    name: "Evoluție în timp",
    weight: 0.10,
    description: "Îmbunătățire continuă vs. stagnare — trend pe 30/60/90 zile",
  },
  {
    code: "relatie_platforma",
    name: "Relația cu platforma",
    weight: 0.10,
    description: "Parteneriat vs. tranzacție — profunzimea dialogului, feedback, co-creare",
  },
]

// ── B2C — Oglinda personală a individului ──────────────────────────────────

export const B2C_DIMENSIONS: DimensionDefinition[] = [
  {
    code: "auto_cunoastere",
    name: "Auto-cunoaștere",
    weight: 0.15,
    description: "Profil completat, puncte forte identificate, congruență gând-vorbă-faptă",
  },
  {
    code: "claritate_directie",
    name: "Claritate direcție",
    weight: 0.12,
    description: "Traiectorie definită vs. explorare — intenția s-a cristalizat?",
  },
  {
    code: "angajament_proces",
    name: "Angajament în proces",
    weight: 0.13,
    description: "Frecvență interacțiuni, constanță, revine sau abandonează",
  },
  {
    code: "profunzime_reflectie",
    name: "Profunzime reflecție",
    weight: 0.15,
    description: "Superficial vs. insight-uri reale — calitatea dialogului, nu cantitatea",
  },
  {
    code: "transfer_practica",
    name: "Transfer în practică",
    weight: 0.15,
    description: "Ce aplică din ce descoperă — acțiuni în viața reală, nu doar insight-uri",
  },
  {
    code: "rezilienta",
    name: "Reziliență",
    weight: 0.10,
    description: "Cum gestionează frustrarea din proces, regresiile, blocajele",
  },
  {
    code: "deschidere_feedback",
    name: "Deschidere la feedback",
    weight: 0.10,
    description: "Acceptă sau rezistă — reacția la întrebări provocatoare, la vulnerabilitate",
  },
  {
    code: "evolutie_constiinta",
    name: "Evoluție conștiință",
    weight: 0.10,
    description: "Scala Hawkins estimat — intern, NICIODATĂ comunicat clientului",
  },
]

// ── Obținere dimensiuni per context ────────────────────────────────────────

export function getDimensionsForContext(context: "OWNER" | "INTERNAL" | "B2B" | "B2C"): DimensionDefinition[] {
  switch (context) {
    case "OWNER": return OWNER_DIMENSIONS
    case "INTERNAL": return INTERNAL_DIMENSIONS
    case "B2B": return B2B_DIMENSIONS
    case "B2C": return B2C_DIMENSIONS
  }
}
