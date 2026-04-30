/**
 * /api/v1/compliance/gdpr-ai-act
 *
 * Audit GDPR + AI Act — checklist conformitate.
 * Sectiunea AI Act se activeaza DOAR daca organizatia are toggle MIXT sau AI.
 *
 * GET  — Checklist cu status per element
 * PATCH — Actualizeaza status element individual
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

type OrgStructureType = "UMAN" | "MIXT" | "AI"

interface AuditItem {
  id: string
  section: "GDPR" | "AI_ACT"
  article: string
  requirement: string
  description: string
  applicableTo: OrgStructureType[] // pentru cine e relevant
  status: "NOT_CHECKED" | "COMPLIANT" | "NON_COMPLIANT" | "IN_PROGRESS" | "NOT_APPLICABLE"
  notes: string | null
}

const AUDIT_CHECKLIST: Omit<AuditItem, "status" | "notes">[] = [
  // GDPR — aplicabil tuturor
  {
    id: "gdpr_art30",
    section: "GDPR",
    article: "GDPR Art.30",
    requirement: "Registru activitati prelucrare date personale",
    description: "Registru actualizat cu toate prelucrarile: scop, categorii date, destinatari, termene stergere, masuri securitate.",
    applicableTo: ["UMAN", "MIXT", "AI"],
  },
  {
    id: "gdpr_art35",
    section: "GDPR",
    article: "GDPR Art.35",
    requirement: "Evaluare de impact (DPIA)",
    description: "Obligatorie pentru prelucrari cu risc ridicat: profilare, monitorizare sistematica, date sensibile la scara mare.",
    applicableTo: ["UMAN", "MIXT", "AI"],
  },
  {
    id: "gdpr_art37",
    section: "GDPR",
    article: "GDPR Art.37-39",
    requirement: "Responsabil protectia datelor (DPO)",
    description: "Obligatoriu pentru: autoritati publice, prelucrare la scara mare de date sensibile, monitorizare sistematica la scara mare.",
    applicableTo: ["UMAN", "MIXT", "AI"],
  },
  {
    id: "gdpr_art13",
    section: "GDPR",
    article: "GDPR Art.13-14",
    requirement: "Informarea persoanelor vizate",
    description: "Angajatii informati despre: ce date prelucrezi, de ce, cat timp, cui le transferi, drepturile lor.",
    applicableTo: ["UMAN", "MIXT", "AI"],
  },
  {
    id: "gdpr_art15",
    section: "GDPR",
    article: "GDPR Art.15-22",
    requirement: "Drepturi persoane vizate (acces, rectificare, stergere, portabilitate)",
    description: "Procedura clara pentru exercitarea drepturilor angajatilor: acces la date, corectare, stergere, export.",
    applicableTo: ["UMAN", "MIXT", "AI"],
  },
  {
    id: "gdpr_art32",
    section: "GDPR",
    article: "GDPR Art.32",
    requirement: "Masuri tehnice si organizatorice de securitate",
    description: "Criptare, pseudonimizare, backup, control acces, testare periodica a masurilor.",
    applicableTo: ["UMAN", "MIXT", "AI"],
  },
  {
    id: "gdpr_art28",
    section: "GDPR",
    article: "GDPR Art.28",
    requirement: "Contracte cu imputernicitii (DPA)",
    description: "Contract de prelucrare date cu fiecare furnizor care proceseaza date personale (cloud, payroll extern, AI providers).",
    applicableTo: ["UMAN", "MIXT", "AI"],
  },
  {
    id: "gdpr_breach",
    section: "GDPR",
    article: "GDPR Art.33-34",
    requirement: "Procedura notificare incidente (breach)",
    description: "Procedura de notificare ANSPDCP in 72h + notificare persoane afectate daca risc ridicat.",
    applicableTo: ["UMAN", "MIXT", "AI"],
  },

  // AI ACT — doar MIXT si AI
  {
    id: "aiact_art14",
    section: "AI_ACT",
    article: "AI Act Art.14",
    requirement: "Supraveghere umana a sistemelor AI",
    description: "Sisteme AI folosite in HR (recrutare, evaluare, promovare) = risc ridicat. Obligatorie supravegherea umana: un om verifica deciziile AI.",
    applicableTo: ["MIXT", "AI"],
  },
  {
    id: "aiact_annex4",
    section: "AI_ACT",
    article: "AI Act Anexa IV",
    requirement: "Documentatie tehnica sisteme AI",
    description: "Documentatie completa: scop, date de antrenament, performanta, limitari, masuri de risc, instructiuni utilizare.",
    applicableTo: ["MIXT", "AI"],
  },
  {
    id: "aiact_annex3",
    section: "AI_ACT",
    article: "AI Act Anexa III, pct.4",
    requirement: "Clasificare sisteme AI HR ca risc ridicat",
    description: "Sisteme AI folosite pentru: recrutare, selectie, evaluare candidati, evaluare performanta, promovare, concediere = risc ridicat obligatoriu.",
    applicableTo: ["MIXT", "AI"],
  },
  {
    id: "aiact_art13",
    section: "AI_ACT",
    article: "AI Act Art.13",
    requirement: "Transparenta — informare utilizatori",
    description: "Angajatii trebuie informati ca interactioneaza cu un sistem AI si ce decizii influenteaza AI-ul.",
    applicableTo: ["MIXT", "AI"],
  },
  {
    id: "aiact_art9",
    section: "AI_ACT",
    article: "AI Act Art.9",
    requirement: "Sistem de management al riscurilor",
    description: "Proces continuu de identificare, evaluare si atenuare a riscurilor legate de sistemele AI utilizate.",
    applicableTo: ["MIXT", "AI"],
  },
  {
    id: "aiact_art10",
    section: "AI_ACT",
    article: "AI Act Art.10",
    requirement: "Calitatea datelor de antrenament",
    description: "Date de antrenament relevante, reprezentative, fara erori. Monitorizare bias: gen, varsta, etnie.",
    applicableTo: ["MIXT", "AI"],
  },
  {
    id: "aiact_art12",
    section: "AI_ACT",
    article: "AI Act Art.12",
    requirement: "Pastrare jurnale (logging)",
    description: "Sistemele AI de risc ridicat trebuie sa pastreze jurnale automate pentru trasabilitate si audit.",
    applicableTo: ["MIXT", "AI"],
  },
]

async function getOrgStructureType(tenantId: string): Promise<OrgStructureType> {
  return await getTenantData<OrgStructureType>(tenantId, "ORG_STRUCTURE_TYPE") || "UMAN"
}

async function getAuditState(tenantId: string): Promise<Record<string, { status: string; notes: string | null }>> {
  return await getTenantData<Record<string, { status: string; notes: string | null }>>(tenantId, "GDPR_AI_ACT_AUDIT") || {}
}

async function saveAuditState(tenantId: string, state: Record<string, { status: string; notes: string | null }>): Promise<void> {
  await setTenantData(tenantId, "GDPR_AI_ACT_AUDIT", state)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const orgType = await getOrgStructureType(session.user.tenantId)
  const savedState = await getAuditState(session.user.tenantId)

  // Filtram checklist-ul pe baza tipului de organizatie
  const applicable = AUDIT_CHECKLIST.filter(item => item.applicableTo.includes(orgType))

  const checklist: AuditItem[] = applicable.map(item => ({
    ...item,
    status: (savedState[item.id]?.status as AuditItem["status"]) || "NOT_CHECKED",
    notes: savedState[item.id]?.notes || null,
  }))

  const gdprItems = checklist.filter(i => i.section === "GDPR")
  const aiActItems = checklist.filter(i => i.section === "AI_ACT")
  const compliantCount = checklist.filter(i => i.status === "COMPLIANT").length

  return NextResponse.json({
    orgStructureType: orgType,
    aiActEnabled: orgType !== "UMAN",
    checklist,
    stats: {
      total: checklist.length,
      gdpr: gdprItems.length,
      aiAct: aiActItems.length,
      compliant: compliantCount,
      nonCompliant: checklist.filter(i => i.status === "NON_COMPLIANT").length,
      notChecked: checklist.filter(i => i.status === "NOT_CHECKED").length,
      score: checklist.length > 0 ? Math.round((compliantCount / checklist.length) * 100) : 0,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { id, status, notes } = body

  if (!id || !status) {
    return NextResponse.json({ error: "id si status obligatorii" }, { status: 400 })
  }

  const savedState = await getAuditState(session.user.tenantId)
  savedState[id] = { status, notes: notes !== undefined ? notes : (savedState[id]?.notes || null) }
  await saveAuditState(session.user.tenantId, savedState)

  return NextResponse.json({ ok: true })
}
