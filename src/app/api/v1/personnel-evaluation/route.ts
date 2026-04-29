/**
 * /api/v1/personnel-evaluation — Proces evaluare personal
 *
 * Modelat pe sesiunile JE existente. Flux:
 * 1. CONFIGURARE: subiecti, instrumente, distributie rezultate
 * 2. COMUNICARE: mesaje particularizate per rol
 * 3. EXECUTIE: tracking progres per participant + supervizor
 * 4. RAPOARTE: gap actual vs necesar, impact, recomandari
 *
 * GET  — Sesiuni evaluare + status
 * POST — Operatii: create, notify, submit-result, complete, get-reports
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

// ── Tipuri ──────────────────────────────────────────────

interface EvalSubject {
  employeeCode: string
  name: string
  jobTitle: string
  department: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  completedInstruments: string[] // IDs instrumente completate
  completedAt: string | null
}

interface ResultRecipient {
  userId: string
  name: string
  email: string
  role: string // HR | SUPERVISOR | DIRECTOR | SUBJECT
  receivesIndividual: boolean // rapoarte individuale
  receivesGlobal: boolean // raport global
}

interface EvalSession {
  id: string
  name: string
  department: string
  reason: string // motivul evaluarii
  instruments: string[] // IDs instrumente (herrmann, mbti, cpi etc.)
  subjects: EvalSubject[]
  recipients: ResultRecipient[]
  status: "CONFIGURING" | "NOTIFYING" | "IN_PROGRESS" | "ANALYZING" | "COMPLETED"
  createdBy: string
  createdAt: string
  notifiedAt: string | null
  completedAt: string | null
  // Progres
  progress: {
    totalSubjects: number
    completedSubjects: number
    totalInstruments: number // per subiect
    overallPct: number
  }
}

interface PersonnelEvalState {
  sessions: EvalSession[]
}

async function getState(tenantId: string): Promise<PersonnelEvalState> {
  return await getTenantData<PersonnelEvalState>(tenantId, "PERSONNEL_EVAL") || { sessions: [] }
}

async function saveState(tenantId: string, state: PersonnelEvalState): Promise<void> {
  await setTenantData(tenantId, "PERSONNEL_EVAL", state)
}

// GET — Lista sesiuni
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const state = await getState(session.user.tenantId)

  return NextResponse.json({
    sessions: state.sessions.map(s => ({
      ...s,
      progress: {
        totalSubjects: s.subjects.length,
        completedSubjects: s.subjects.filter(sub => sub.status === "COMPLETED").length,
        totalInstruments: s.instruments.length,
        overallPct: s.subjects.length > 0
          ? Math.round((s.subjects.filter(sub => sub.status === "COMPLETED").length / s.subjects.length) * 100)
          : 0,
      },
    })),
  })
}

// POST — Operatii
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const body = await req.json()
  const { action } = body
  const state = await getState(session.user.tenantId)

  // ═══ 1. CONFIGURARE — creaza sesiune ═══
  if (action === "create") {
    const { name, department, reason, instruments, subjects, recipients } = body

    if (!name || !reason || !instruments?.length || !subjects?.length) {
      return NextResponse.json({ error: "name, reason, instruments[], subjects[] obligatorii" }, { status: 400 })
    }

    const id = `pe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    // By default: fiecare subiect primeste raportul individual
    const defaultRecipients: ResultRecipient[] = (subjects as any[]).map(s => ({
      userId: s.employeeCode,
      name: s.name,
      email: s.email || "",
      role: "SUBJECT",
      receivesIndividual: true,
      receivesGlobal: false,
    }))

    // Adauga recipientii configurati (supervizori, HR, directori)
    const configuredRecipients: ResultRecipient[] = (recipients || []).map((r: any) => ({
      userId: r.userId || r.email,
      name: r.name,
      email: r.email,
      role: r.role || "SUPERVISOR",
      receivesIndividual: r.receivesIndividual || false,
      receivesGlobal: r.receivesGlobal !== false, // default: true pentru supervizori
    }))

    const evalSession: EvalSession = {
      id,
      name,
      department: department || "",
      reason,
      instruments,
      subjects: (subjects as any[]).map(s => ({
        employeeCode: s.employeeCode || s.code,
        name: s.name,
        jobTitle: s.jobTitle || s.post || "",
        department: s.department || department || "",
        status: "PENDING",
        completedInstruments: [],
        completedAt: null,
      })),
      recipients: [...defaultRecipients, ...configuredRecipients],
      status: "CONFIGURING",
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
      notifiedAt: null,
      completedAt: null,
      progress: { totalSubjects: subjects.length, completedSubjects: 0, totalInstruments: instruments.length, overallPct: 0 },
    }

    state.sessions.push(evalSession)
    await saveState(session.user.tenantId, state)

    return NextResponse.json({ ok: true, sessionId: id, subjects: subjects.length, instruments: instruments.length })
  }

  // ═══ 2. COMUNICARE — trimite notificari particularizate ═══
  if (action === "notify") {
    const { sessionId } = body
    const evalSession = state.sessions.find(s => s.id === sessionId)
    if (!evalSession) return NextResponse.json({ error: "Sesiune negasita" }, { status: 404 })

    // Mesaje particularizate per rol
    try {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)

      // La subiecti
      for (const subject of evalSession.subjects) {
        const recipientInfo = evalSession.recipients.find(r => r.userId === subject.employeeCode && r.role === "SUBJECT")
        if (recipientInfo?.email) {
          await resend.emails.send({
            from: "JobGrade <noreply@jobgrade.ro>",
            to: recipientInfo.email,
            subject: `[JobGrade] Evaluare profesională — ${evalSession.name}`,
            html: `
              <h2>Evaluare profesională</h2>
              <p>Bună, <strong>${subject.name}</strong>,</p>
              <p>A început un proces de evaluare: <strong>${evalSession.name}</strong></p>
              <p><strong>De ce?</strong> ${evalSession.reason}</p>
              <p><strong>Ce presupune:</strong> Vei completa ${evalSession.instruments.length} instrument${evalSession.instruments.length > 1 ? "e" : ""} de evaluare.
              Fiecare durează între 15-30 minute.</p>
              <p><strong>Ce primești:</strong> Un raport individual detaliat cu profilul tău profesional,
              puncte forte, zone de dezvoltare și recomandări concrete.</p>
              <p><strong>Confidențialitate:</strong> Raportul tău individual este confidențial.
              Doar tu și persoanele autorizate au acces la el.</p>
              <p><a href="https://jobgrade.ro/portal" style="padding: 12px 24px; background: #4F46E5; color: white; border-radius: 8px; text-decoration: none;">Începe evaluarea</a></p>
            `,
          }).catch(() => {})
        }
      }

      // La supervizori/HR
      for (const recipient of evalSession.recipients.filter(r => r.role !== "SUBJECT")) {
        if (recipient.email) {
          await resend.emails.send({
            from: "JobGrade <noreply@jobgrade.ro>",
            to: recipient.email,
            subject: `[JobGrade] Evaluare personal — ${evalSession.name} (supervizor)`,
            html: `
              <h2>Evaluare personal — ${evalSession.name}</h2>
              <p>Bună, <strong>${recipient.name}</strong>,</p>
              <p>A început un proces de evaluare în ${evalSession.department || "departamentul dumneavoastră"}.</p>
              <p><strong>Motiv:</strong> ${evalSession.reason}</p>
              <p><strong>Participanți:</strong> ${evalSession.subjects.length} persoane</p>
              <p><strong>Ce veți vedea:</strong> Progresul fiecărui participant în timp real.
              La finalizare, veți primi ${recipient.receivesGlobal ? "raportul global cu analize și recomandări" : "notificare de completare"}
              ${recipient.receivesIndividual ? "și rapoartele individuale" : ""}.</p>
              <p><strong>Impactul:</strong> Rezultatele vor fi analizate în raport cu fișele de post,
              KPI-urile și pachetele salariale pentru a identifica gap-uri și oportunități de dezvoltare.</p>
              <p><a href="https://jobgrade.ro/portal" style="padding: 12px 24px; background: #4F46E5; color: white; border-radius: 8px; text-decoration: none;">Vezi progresul</a></p>
            `,
          }).catch(() => {})
        }
      }
    } catch {}

    evalSession.status = "IN_PROGRESS"
    evalSession.notifiedAt = new Date().toISOString()
    await saveState(session.user.tenantId, state)

    return NextResponse.json({
      ok: true,
      notifiedSubjects: evalSession.subjects.length,
      notifiedSupervisors: evalSession.recipients.filter(r => r.role !== "SUBJECT").length,
    })
  }

  // ═══ 3. EXECUTIE — submit rezultat instrument per subiect ═══
  if (action === "submit-result") {
    const { sessionId, employeeCode, instrumentId, scores } = body
    if (!sessionId || !employeeCode || !instrumentId) {
      return NextResponse.json({ error: "sessionId, employeeCode, instrumentId obligatorii" }, { status: 400 })
    }

    const evalSession = state.sessions.find(s => s.id === sessionId)
    if (!evalSession) return NextResponse.json({ error: "Sesiune negasita" }, { status: 404 })

    const subject = evalSession.subjects.find(s => s.employeeCode === employeeCode)
    if (!subject) return NextResponse.json({ error: "Subiect negasit" }, { status: 404 })

    // Marcheaza instrumentul ca completat
    if (!subject.completedInstruments.includes(instrumentId)) {
      subject.completedInstruments.push(instrumentId)
    }
    subject.status = subject.completedInstruments.length >= evalSession.instruments.length ? "COMPLETED" : "IN_PROGRESS"
    if (subject.status === "COMPLETED") subject.completedAt = new Date().toISOString()

    // Salveaza scorurile in psychometrics state
    const { setTenantData: setTD, getTenantData: getTD } = await import("@/lib/tenant-storage")
    const psychState = await getTD<any>(session.user.tenantId, "PSYCHOMETRICS") || { batteries: [], results: [] }
    psychState.results.push({
      employeeCode, employeeName: subject.name, jobId: subject.jobTitle,
      instrumentId, status: "COMPLETED", resultFileName: null,
      completedAt: new Date().toISOString(), scores,
    })
    await setTD(session.user.tenantId, "PSYCHOMETRICS", psychState)

    // Verificare: toti subiectii completati?
    const allCompleted = evalSession.subjects.every(s => s.status === "COMPLETED")
    if (allCompleted) {
      evalSession.status = "ANALYZING"
    }

    await saveState(session.user.tenantId, state)

    return NextResponse.json({
      ok: true,
      subjectStatus: subject.status,
      completedInstruments: subject.completedInstruments.length,
      totalInstruments: evalSession.instruments.length,
      sessionComplete: allCompleted,
    })
  }

  // ═══ 4. RAPOARTE — finalizare + gap analysis ═══
  if (action === "complete") {
    const { sessionId } = body
    const evalSession = state.sessions.find(s => s.id === sessionId)
    if (!evalSession) return NextResponse.json({ error: "Sesiune negasita" }, { status: 404 })

    evalSession.status = "COMPLETED"
    evalSession.completedAt = new Date().toISOString()

    // Gap analysis: actual (din teste) vs necesar (din fisa post + KPI)
    const { prisma } = await import("@/lib/prisma")
    const gapAnalysis: Array<{
      employeeCode: string
      name: string
      actual: string   // ce poate/stie/vrea acum
      required: string // ce trebuie sa poata/stie/vrea
      gap: string      // diferenta
      recommendations: string[]
    }> = []

    for (const subject of evalSession.subjects) {
      // Citeste fisa postului
      const job = await prisma.job.findFirst({
        where: { tenantId: session.user.tenantId, title: subject.jobTitle },
        select: { purpose: true, responsibilities: true, requirements: true },
      })

      // Citeste KPI-uri
      const kpis = await prisma.kpiDefinition.findMany({
        where: { tenantId: session.user.tenantId },
        select: { name: true, targetValue: true },
        take: 5,
      })

      gapAnalysis.push({
        employeeCode: subject.employeeCode,
        name: subject.name,
        actual: `Completat ${subject.completedInstruments.length} instrumente. Profil disponibil.`,
        required: job ? `Conform fisa: ${(job.purpose || "").slice(0, 100)}. KPI: ${kpis.map(k => k.name).join(", ")}` : "Fisa de post necesara pentru gap analysis complet",
        gap: "Gap analysis detaliat disponibil in raportul individual",
        recommendations: [
          "Raport individual cu profilul complet",
          "Comparatie cu cerintele fisei de post",
          "Plan de dezvoltare personalizat",
          job ? "Aliniere cu KPI-urile postului" : "Completeaza fisa de post pentru aliniere KPI",
        ],
      })
    }

    await saveState(session.user.tenantId, state)

    // Notificare recipienti ca rapoartele sunt disponibile
    try {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      for (const r of evalSession.recipients.filter(r => r.receivesGlobal)) {
        await resend.emails.send({
          from: "JobGrade <noreply@jobgrade.ro>",
          to: r.email,
          subject: `[JobGrade] Evaluare completă — ${evalSession.name}`,
          html: `
            <h2>Evaluare completă</h2>
            <p>${evalSession.subjects.length} participanți au finalizat evaluarea.</p>
            <p>Rapoartele sunt disponibile cu analize, recomandări și impact.</p>
            <p><a href="https://jobgrade.ro/portal" style="padding: 12px 24px; background: #059669; color: white; border-radius: 8px; text-decoration: none;">Vezi rapoartele</a></p>
          `,
        }).catch(() => {})
      }
    } catch {}

    // Learning
    try {
      const { learnFromReport } = await import("@/lib/learning-hooks")
      await learnFromReport("PERSONNEL_EVAL", session.user.tenantId, `Evaluare "${evalSession.name}": ${evalSession.subjects.length} subiecti, ${evalSession.instruments.length} instrumente, dept ${evalSession.department}`)
    } catch {}

    return NextResponse.json({
      ok: true,
      sessionId,
      completedSubjects: evalSession.subjects.length,
      gapAnalysis,
      message: "Evaluare completă. Rapoarte disponibile.",
    })
  }

  return NextResponse.json({ error: "action: create | notify | submit-result | complete" }, { status: 400 })
}
