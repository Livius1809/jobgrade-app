/**
 * wif-engine.ts — What-If Engine (Simulator de Impact)
 *
 * Motor unic de simulare. TOATE simularile din C1-C4 sunt preset-uri ale aceluiasi motor.
 * Accepta un input (schimbare propusa) si calculeaza cascada de impact pe toate nivelurile.
 *
 * Arhitectura: CORE (organism-mama) — deserveste toate businesses.
 * Clientul vede REZULTATELE, nu mecanismul (secret de serviciu).
 *
 * Preseturi:
 *   - Schimb responsabilitati pe post → impact grad + grila + pay gap + echipa + proces
 *   - Pozitie vacanta → cost REAL (distorsiune proces)
 *   - Schimb angajat pe pozitie → impact echipa + sociograma + proces
 *   - Schimb structura departament → impact procese + cultura
 *   - Obiective strategice top-down → cascada operational
 *   - Toggle UMAN→MIXT → impact legal + productivitate + cultura
 *
 * Toggle-uri aplicate pe fiecare simulare:
 *   - CLASIC: impact operational + financiar
 *   - TRANSFORMATIONAL: + impact pe oameni, cultura, sens
 */

import { prisma } from "@/lib/prisma"

// ═══ TIPURI ═══

export type SimulationPreset =
  | "CHANGE_RESPONSIBILITIES"  // schimb responsabilitati pe un post
  | "VACANT_POSITION"          // pozitie vacanta
  | "CHANGE_PERSON"            // schimb om pe pozitie
  | "CHANGE_SALARY"            // ajustez salariu
  | "CHANGE_STRUCTURE"         // reorganizare departament
  | "STRATEGIC_OBJECTIVES"     // obiective noi top-down
  | "TOGGLE_HUMAN_AI"          // trec de la uman la mixt/AI
  | "ADD_POSITION"             // adaug post nou
  | "REMOVE_POSITION"          // scot post

export type SimulationMode = "CLASIC" | "TRANSFORMATIONAL"

export interface SimulationInput {
  preset: SimulationPreset
  mode: SimulationMode
  tenantId: string
  params: Record<string, any>
  // Parametri comuni:
  //   jobId?: string — postul afectat
  //   departmentId?: string — departamentul afectat
  //   newValue?: any — valoarea noua (salariu, responsabilitati etc)
}

export interface ImpactItem {
  area: string            // "C1_ORGANIZARE" | "C2_CONFORMITATE" | "C3_COMPETITIVITATE" | "C4_DEZVOLTARE"
  level: "DIRECT" | "CASCADA" | "INDIRECT"
  severity: "POZITIV" | "NEUTRU" | "ATENTIE" | "RISC"
  title: string
  detail: string
  metric?: { before: number | string; after: number | string; delta: string }
}

export interface SimulationResult {
  preset: SimulationPreset
  mode: SimulationMode
  timestamp: string
  impacts: ImpactItem[]
  summary: {
    totalImpacts: number
    pozitive: number
    riscuri: number
    areasAffected: string[]
  }
  transformationalInsight?: string  // doar la TRANSFORMATIONAL
}

// ═══ MOTOR ═══

export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
  const impacts: ImpactItem[] = []
  const { preset, mode, params } = input

  // Dispatch per preset
  switch (preset) {
    case "CHANGE_RESPONSIBILITIES":
      await simulateChangeResponsibilities(params, mode, impacts)
      break
    case "VACANT_POSITION":
      await simulateVacantPosition(params, mode, impacts)
      break
    case "CHANGE_SALARY":
      await simulateChangeSalary(params, mode, impacts)
      break
    case "ADD_POSITION":
      await simulateAddPosition(params, mode, impacts)
      break
    case "REMOVE_POSITION":
      await simulateRemovePosition(params, mode, impacts)
      break
    case "CHANGE_PERSON":
      await simulateChangePerson(params, mode, impacts)
      break
    case "CHANGE_STRUCTURE":
      await simulateChangeStructure(params, mode, impacts)
      break
    case "STRATEGIC_OBJECTIVES":
      await simulateStrategicObjectives(params, mode, impacts)
      break
    case "TOGGLE_HUMAN_AI":
      await simulateToggleHumanAI(params, mode, impacts)
      break
  }

  const areas = [...new Set(impacts.map(i => i.area))]

  const result: SimulationResult = {
    preset,
    mode,
    timestamp: new Date().toISOString(),
    impacts,
    summary: {
      totalImpacts: impacts.length,
      pozitive: impacts.filter(i => i.severity === "POZITIV").length,
      riscuri: impacts.filter(i => i.severity === "RISC").length,
      areasAffected: areas,
    },
  }

  if (mode === "TRANSFORMATIONAL") {
    result.transformationalInsight = generateTransformationalInsight(preset, impacts)
  }

  return result
}

// ═══ SIMULARI PER PRESET ═══

async function simulateChangeResponsibilities(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C1_ORGANIZARE", level: "DIRECT", severity: "ATENTIE",
    title: "Fisa post se modifica",
    detail: "Responsabilitatile postului se schimba. Gradul poate fi recalculat.",
  })
  impacts.push({
    area: "C2_CONFORMITATE", level: "CASCADA", severity: "RISC",
    title: "Act aditional contract munca necesar",
    detail: "Modificarea fisei post necesita act aditional la CIM. Acordul angajatului e obligatoriu.",
  })
  impacts.push({
    area: "C2_CONFORMITATE", level: "CASCADA", severity: "ATENTIE",
    title: "Grila salariala poate fi afectata",
    detail: "Daca gradul se schimba, salariul trebuie ajustat conform grilei.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "ATENTIE",
    title: "Procesele se reconfigureaza",
    detail: "Nodul din proces se schimba. Furnizorii si clientii interni trebuie notificati.",
  })
  if (mode === "TRANSFORMATIONAL") {
    impacts.push({
      area: "C4_DEZVOLTARE", level: "INDIRECT", severity: "NEUTRU",
      title: "Schimbarea serveste evolutia persoanei?",
      detail: "Noile responsabilitati dezvolta omul sau il consuma? Rolul serveste cresterea sau doar nevoile organizatiei?",
    })
  }
}

async function simulateVacantPosition(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C1_ORGANIZARE", level: "DIRECT", severity: "RISC",
    title: "Pozitie vacanta in stat functii",
    detail: "Statul de functii are o pozitie neocupata. Impact pe organigrama.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "RISC",
    title: "Cost REAL al neocuparii",
    detail: "Distorsiune in proces: furnizorii interni nu au cui sa livreze, clientii interni nu primesc inputul necesar.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "ATENTIE",
    title: "Echipa afectata — redistribuire sarcini",
    detail: "Colegii preiau responsabilitati suplimentare. Risc suprasarcina si scadere calitate.",
  })
  if (mode === "TRANSFORMATIONAL") {
    impacts.push({
      area: "C4_DEZVOLTARE", level: "INDIRECT", severity: "NEUTRU",
      title: "Ce pierde echipa, nu doar procesul",
      detail: "Dincolo de productivitate: se pierde o perspectiva, un stil, o chimie. Sociograma se schimba.",
    })
  }
}

async function simulateChangeSalary(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C2_CONFORMITATE", level: "DIRECT", severity: "ATENTIE",
    title: "Impact pay gap",
    detail: "Ajustarea salariului afecteaza raportul pay gap pe gen si pe grad.",
  })
  impacts.push({
    area: "C2_CONFORMITATE", level: "DIRECT", severity: "ATENTIE",
    title: "Echitate interna afectata",
    detail: "Verifica daca ajustarea mentine echitatea interna (posturi similare, salariu similar).",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "NEUTRU",
    title: "Benchmark vs piata",
    detail: "Noul salariu se compara cu piata — esti sub, peste sau in linie?",
  })
}

async function simulateAddPosition(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C1_ORGANIZARE", level: "DIRECT", severity: "POZITIV",
    title: "Post nou in stat functii",
    detail: "Ierarhia se recalculeaza cu postul nou. Grad si grila se determina.",
  })
  impacts.push({
    area: "C2_CONFORMITATE", level: "CASCADA", severity: "NEUTRU",
    title: "CIM nou necesar",
    detail: "Angajarea pe postul nou necesita contract individual de munca.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "POZITIV",
    title: "Procesul se imbunatateste",
    detail: "Nod nou in proces — poate rezolva un bottleneck existent.",
  })
}

async function simulateRemovePosition(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C1_ORGANIZARE", level: "DIRECT", severity: "RISC",
    title: "Post scos din stat functii",
    detail: "Ierarhia se recalculeaza. Responsabilitatile trebuie redistribuite.",
  })
  impacts.push({
    area: "C2_CONFORMITATE", level: "CASCADA", severity: "RISC",
    title: "Concediere — implicatii legale",
    detail: "Preaviz, compensatii, legislatia muncii. Procedura de concediere individuala sau colectiva.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "RISC",
    title: "Distorsiune proces + echipa",
    detail: "Nodul scos din proces afecteaza cascada. Echipa pierde un membru.",
  })
  if (mode === "TRANSFORMATIONAL") {
    impacts.push({
      area: "C4_DEZVOLTARE", level: "INDIRECT", severity: "RISC",
      title: "Mesajul pentru cultura organizationala",
      detail: "Ce comunica aceasta decizie echipei? Securitate sau insecuritate? Eficienta sau frica?",
    })
  }
}

async function simulateChangePerson(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "DIRECT", severity: "ATENTIE",
    title: "Sociograma se recalculeaza",
    detail: "Noua persoana aduce alta chimie in echipa. Preferinte si respingeri se schimba.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "ATENTIE",
    title: "Compatibilitate post — de evaluat",
    detail: "Noul angajat trebuie evaluat pe cele 6 criterii JE vs cerinte post.",
  })
  if (mode === "TRANSFORMATIONAL") {
    impacts.push({
      area: "C4_DEZVOLTARE", level: "INDIRECT", severity: "NEUTRU",
      title: "Fit cultural vs agent al schimbarii",
      detail: "Noul angajat se potriveste culturii existente sau aduce schimbare? Ambele au valoare — depinde de intentie.",
    })
  }
}

async function simulateChangeStructure(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C1_ORGANIZARE", level: "DIRECT", severity: "RISC",
    title: "Reorganizare departament",
    detail: "Structura ierarhica se schimba. Stat functii se reconfigureaza.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "RISC",
    title: "Procesele se reconfigureaza complet",
    detail: "Fluxurile furnizor-client se schimba. Manual calitate trebuie actualizat.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "ATENTIE",
    title: "Echipele se recompun",
    detail: "Sociogramele se invalideaza. Dinamica echipelor se reseteaza (Tuckman: forming).",
  })
  if (mode === "TRANSFORMATIONAL") {
    impacts.push({
      area: "C4_DEZVOLTARE", level: "INDIRECT", severity: "ATENTIE",
      title: "Structura noua serveste misiunea sau inernia?",
      detail: "Reorganizarea e pentru obiective noi sau pentru a reduce costuri? Mesajul conteaza.",
    })
  }
}

async function simulateStrategicObjectives(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C4_DEZVOLTARE", level: "DIRECT", severity: "POZITIV",
    title: "Obiective strategice noi",
    detail: "Obiectivele CA se traduc in plan operational: resurse, timeline, responsabili per nivel.",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "ATENTIE",
    title: "Echipele primesc obiective derivate",
    detail: "Fiecare departament primeste sub-obiective. KPI-urile se actualizeaza.",
  })
  impacts.push({
    area: "C1_ORGANIZARE", level: "CASCADA", severity: "ATENTIE",
    title: "Posturi noi sau reconfigurari necesare?",
    detail: "Obiectivele noi pot necesita competente noi → posturi noi sau reconfigurate.",
  })
  if (mode === "TRANSFORMATIONAL") {
    impacts.push({
      area: "C4_DEZVOLTARE", level: "INDIRECT", severity: "NEUTRU",
      title: "Obiectivele cer schimbare de cultura?",
      detail: "Organizatia e pregatita pentru aceste obiective? Sau cultura actuala le va sabota?",
    })
  }
}

async function simulateToggleHumanAI(params: any, mode: SimulationMode, impacts: ImpactItem[]) {
  impacts.push({
    area: "C1_ORGANIZARE", level: "DIRECT", severity: "RISC",
    title: "Fisa post se schimba radical",
    detail: "Postul devine mixt: responsabilitati partajate om + AI. Handoff-uri de definit.",
  })
  impacts.push({
    area: "C2_CONFORMITATE", level: "CASCADA", severity: "RISC",
    title: "AI Act Art.14 — supraveghere umana obligatorie",
    detail: "Daca AI decide (recrutare, evaluare, promovare) → documentatie Anexa IV + supraveghere.",
  })
  impacts.push({
    area: "C2_CONFORMITATE", level: "CASCADA", severity: "ATENTIE",
    title: "Contract munca — modificare CIM",
    detail: "Angajatul trebuie informat si de acord cu noile responsabilitati (partajate cu AI).",
  })
  impacts.push({
    area: "C3_COMPETITIVITATE", level: "CASCADA", severity: "POZITIV",
    title: "Productivitate potentiala crescuta",
    detail: "AI prelueaza repetitivul. Omul se concentreaza pe judecata, creativitate, relatii.",
  })
  if (mode === "TRANSFORMATIONAL") {
    impacts.push({
      area: "C4_DEZVOLTARE", level: "INDIRECT", severity: "ATENTIE",
      title: "Impact pe identitatea profesionala",
      detail: "Cine sunt eu cand o parte din munca mea o face un AI? Ce ramane al meu? Cultura emergenta.",
    })
  }
}

// ═══ INSIGHT TRANSFORMATIONAL ═══

function generateTransformationalInsight(preset: SimulationPreset, impacts: ImpactItem[]): string {
  const riscuri = impacts.filter(i => i.severity === "RISC").length
  const pozitive = impacts.filter(i => i.severity === "POZITIV").length
  const areas = [...new Set(impacts.map(i => i.area))].length

  if (riscuri > pozitive) {
    return `Aceasta schimbare are mai multe riscuri (${riscuri}) decat beneficii (${pozitive}) si afecteaza ${areas} arii. Intrebarea nu e "putem?", ci "ar trebui?". Ce pierderi invizibile acceptam?`
  }
  if (pozitive > riscuri) {
    return `Schimbarea are potential pozitiv (${pozitive} beneficii vs ${riscuri} riscuri). Intrebarea transformationala: aceasta schimbare ne face mai buni sau doar mai eficienti? Exista diferenta.`
  }
  return `Impact echilibrat (${pozitive} beneficii, ${riscuri} riscuri). Decizia nu e tehnica — e despre ce fel de organizatie vrem sa fim.`
}
