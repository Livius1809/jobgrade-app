import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits, CREDIT_COSTS } from "@/lib/credits"
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import React from "react"

const CREDIT_COST = CREDIT_COSTS.EXPORT_PDF

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: "#111827",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#1D4ED8",
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1D4ED8",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#6B7280",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1D4ED8",
    marginTop: 16,
    marginBottom: 8,
  },
  table: {
    width: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1D4ED8",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  tableRowAlt: {
    backgroundColor: "#F9FAFB",
  },
  tableHeaderCell: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  colRank: { width: "8%" },
  colCode: { width: "12%" },
  colTitle: { width: "32%" },
  colDept: { width: "22%" },
  colScore: { width: "12%" },
  colNorm: { width: "14%" },
  colGrade: { width: "16%" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9CA3AF",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    paddingTop: 6,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    padding: 8,
  },
  infoLabel: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
})

// ─── Metodologia de evaluare — 4 criterii principale (document opozabil) ───

const METHODOLOGY_CRITERIA = [
  {
    name: "I. Competență profesională",
    subcriteria: ["Educație / Experiență", "Comunicare"],
    description: "Evaluarea nivelului de cunoștințe, calificări, experiență profesională și abilități de comunicare necesare pentru exercitarea atribuțiilor postului. Include formarea inițială, perfecționarea continuă, experiența relevantă și capacitatea de a comunica eficient la toate nivelurile organizației.",
  },
  {
    name: "II. Complexitatea muncii",
    subcriteria: ["Rezolvarea problemelor", "Luarea deciziilor"],
    description: "Evaluarea gradului de complexitate a sarcinilor, nivelul de analiză și sinteză necesar, precum și autonomia în luarea deciziilor. Include tipul problemelor de rezolvat (rutine vs. strategice), gradul de supervizare și impactul deciziilor asupra organizației.",
  },
  {
    name: "III. Responsabilitate și impact",
    subcriteria: ["Impact asupra afacerii"],
    description: "Evaluarea nivelului de responsabilitate asumat și a impactului direct sau indirect al activității asupra rezultatelor organizației. Include contribuția la obiectivele strategice, gestionarea resurselor și consecințele erorilor profesionale.",
  },
  {
    name: "IV. Condiții de muncă",
    subcriteria: ["Condiții de lucru"],
    description: "Evaluarea condițiilor fizice și psihice în care se desfășoară activitatea: mediul de lucru, riscurile profesionale, nivelul de stres, programul de lucru și cerințele speciale ale postului.",
  },
]

function SessionPDFDocument({
  sessionName,
  status,
  completedAt,
  participantCount,
  jobResults,
  generatedAt,
  companyName,
  companyCUI,
  companyAddress,
  validatedBy,
  jobs,
}: {
  sessionName: string
  status: string
  completedAt: string
  participantCount: number
  jobResults: {
    rank: number
    code: string
    title: string
    department: string
    totalScore: number
    normalizedScore: string
    grade: string
  }[]
  generatedAt: string
  companyName: string
  companyCUI: string | null
  companyAddress: string | null
  validatedBy: string | null
  jobs: { title: string; department: string; purpose: string | null; responsibilities: string | null; requirements: string | null }[]
}) {
  return React.createElement(
    Document,
    { title: `Raport de Diagnostic Analitic — ${companyName}` },

    // ═══ PAGINA 1: Copertă + Date companie + Metodologie ═══
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header cu date companie
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, "Raport de Diagnostic Analitic (RDA)"),
        React.createElement(Text, { style: styles.subtitle }, `${companyName}${companyCUI ? ` · CUI: ${companyCUI}` : ""}${companyAddress ? ` · ${companyAddress}` : ""}`),
        React.createElement(Text, { style: { ...styles.subtitle, marginTop: 4 } }, `Sesiune: ${sessionName} · Generat: ${generatedAt}`),
      ),
      // Metodologie — 4 criterii principale
      React.createElement(Text, { style: styles.sectionTitle }, "Metodologia de evaluare"),
      React.createElement(Text, { style: { fontSize: 8, color: "#4B5563", marginBottom: 10, lineHeight: 1.4 } },
        "Evaluarea posturilor se realizează prin metoda analitică pe puncte, utilizând 4 criterii principale descompuse în 6 subcriterii. Fiecare subcriteriu este evaluat pe o scală cu niveluri (litere A-G), fiecare nivel având un descriptor care definește cerințele postului."
      ),
      ...METHODOLOGY_CRITERIA.flatMap((mc) => [
        React.createElement(Text, { key: `mc-${mc.name}`, style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1D4ED8", marginTop: 8, marginBottom: 2 } }, mc.name),
        React.createElement(Text, { key: `mc-sub-${mc.name}`, style: { fontSize: 7, color: "#6B7280", marginBottom: 3 } }, `Subcriterii: ${mc.subcriteria.join(", ")}`),
        React.createElement(Text, { key: `mc-desc-${mc.name}`, style: { fontSize: 8, color: "#374151", marginBottom: 6, lineHeight: 1.4 } }, mc.description),
      ]),
      // Disclaimer
      React.createElement(View, { style: { marginTop: 16, padding: 8, backgroundColor: "#FEF3C7", borderRadius: 4 } },
        React.createElement(Text, { style: { fontSize: 7, color: "#92400E", lineHeight: 1.4 } },
          "CONFIDENȚIAL — Acest document conține informații confidențiale destinate exclusiv conducerii organizației. " +
          "Reproducerea, distribuirea sau divulgarea fără acordul scris al emitentului este interzisă. " +
          "Documentul are caracter opozabil organelor competente conform legislației muncii în vigoare."
        ),
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, `JobGrade.ro — ${companyName}`),
        React.createElement(Text, null, "Pagina 1")
      ),
    ),

    // ═══ PAGINA 2: Ierarhia posturilor ═══
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, `Ierarhia posturilor`),
        React.createElement(
          Text,
          { style: styles.subtitle },
          `${companyName} · ${generatedAt}`
        )
      ),
      // Info cards
      React.createElement(
        View,
        { style: styles.infoGrid },
        React.createElement(
          View,
          { style: styles.infoCard },
          React.createElement(Text, { style: styles.infoLabel }, "STATUS"),
          React.createElement(Text, { style: styles.infoValue }, status)
        ),
        React.createElement(
          View,
          { style: styles.infoCard },
          React.createElement(Text, { style: styles.infoLabel }, "FINALIZAT"),
          React.createElement(Text, { style: styles.infoValue }, completedAt)
        ),
        React.createElement(
          View,
          { style: styles.infoCard },
          React.createElement(Text, { style: styles.infoLabel }, "PARTICIPANȚI"),
          React.createElement(Text, { style: styles.infoValue }, String(participantCount))
        ),
        React.createElement(
          View,
          { style: styles.infoCard },
          React.createElement(Text, { style: styles.infoLabel }, "JOBURI EVALUATE"),
          React.createElement(Text, { style: styles.infoValue }, String(jobResults.length))
        )
      ),
      // Section title
      React.createElement(Text, { style: styles.sectionTitle }, "Ierarhia posturilor"),
      // Table
      React.createElement(
        View,
        { style: styles.table },
        // Header row
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colRank] }, "Rang"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colCode] }, "Cod"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colTitle] }, "Post"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colDept] }, "Departament"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colScore] }, "Scor"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colNorm] }, "Normalizat"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colGrade] }, "Grupă sal.")
        ),
        // Data rows
        ...jobResults.map((jr, idx) =>
          React.createElement(
            View,
            {
              key: jr.rank,
              style: idx % 2 === 1
                ? [styles.tableRow, styles.tableRowAlt]
                : styles.tableRow,
            },
            React.createElement(Text, { style: [styles.tableCell, styles.colRank] }, String(jr.rank)),
            React.createElement(Text, { style: [styles.tableCell, styles.colCode] }, jr.code),
            React.createElement(Text, { style: [styles.tableCell, styles.colTitle] }, jr.title),
            React.createElement(Text, { style: [styles.tableCell, styles.colDept] }, jr.department),
            React.createElement(Text, { style: [styles.tableCell, styles.colScore] }, String(jr.totalScore)),
            React.createElement(Text, { style: [styles.tableCell, styles.colNorm] }, jr.normalizedScore),
            React.createElement(Text, { style: [styles.tableCell, styles.colGrade] }, jr.grade)
          )
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, `JobGrade.ro — ${companyName}`),
        React.createElement(Text, null, "Pagina 2")
      ),
    ),

    // ═══ PAGINA 3+: Fișe de post ═══
    ...(jobs.length > 0 ? [
      React.createElement(
        Page,
        { key: "jobs-page", size: "A4", style: styles.page },
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(Text, { style: styles.title }, "Fișele posturilor evaluate"),
          React.createElement(Text, { style: styles.subtitle }, `${companyName} · ${jobs.length} posturi`),
        ),
        ...jobs.flatMap((job, idx) => [
          React.createElement(View, { key: `job-${idx}`, style: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: idx < jobs.length - 1 ? 0.5 : 0, borderBottomColor: "#E5E7EB" } },
            React.createElement(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 2 } }, `${idx + 1}. ${job.title}`),
            React.createElement(Text, { style: { fontSize: 7, color: "#6B7280", marginBottom: 6 } }, job.department),
            ...(job.purpose ? [React.createElement(Text, { key: `p-${idx}`, style: { fontSize: 8, color: "#374151", marginBottom: 4, lineHeight: 1.4 } }, `Scop: ${job.purpose}`)] : []),
            ...(job.responsibilities ? [React.createElement(Text, { key: `r-${idx}`, style: { fontSize: 8, color: "#374151", marginBottom: 4, lineHeight: 1.4 } }, `Responsabilități: ${job.responsibilities.substring(0, 500)}`)] : []),
            ...(job.requirements ? [React.createElement(Text, { key: `req-${idx}`, style: { fontSize: 8, color: "#374151", lineHeight: 1.4 } }, `Cerințe: ${job.requirements.substring(0, 300)}`)] : []),
          ),
        ]),
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(Text, null, `JobGrade.ro — ${companyName}`),
          React.createElement(Text, null, "Fișe posturi")
        ),
      ),
    ] : []),

    // ═══ ULTIMA PAGINĂ: Semnătură și validare ═══
    React.createElement(
      Page,
      { key: "sign-page", size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, "Validare și semnătură"),
        React.createElement(Text, { style: styles.subtitle }, `${companyName} · ${generatedAt}`),
      ),
      // Info validare
      React.createElement(View, { style: { marginBottom: 20 } },
        React.createElement(Text, { style: { fontSize: 9, color: "#374151", lineHeight: 1.6 } },
          "Subsemnatul/a, în calitate de Director General / Reprezentant legal al organizației, " +
          "certific că am verificat ierarhia posturilor rezultată din procesul de evaluare și " +
          "confirm că aceasta reflectă structura organizațională și nivelurile de complexitate ale posturilor."
        ),
      ),
      // Câmpuri semnătură
      React.createElement(View, { style: { marginTop: 40, flexDirection: "row" as const, justifyContent: "space-between" as const } },
        React.createElement(View, { style: { width: "45%" } },
          React.createElement(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 8 } }, "Director General / Reprezentant legal"),
          validatedBy
            ? React.createElement(Text, { style: { fontSize: 9, color: "#374151", marginBottom: 4 } }, `Validat de: ${validatedBy}`)
            : null,
          React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: "#374151", width: "100%", marginTop: 40, marginBottom: 4 } }),
          React.createElement(Text, { style: { fontSize: 7, color: "#9CA3AF" } }, "Semnătură și ștampilă"),
        ),
        React.createElement(View, { style: { width: "45%" } },
          React.createElement(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 8 } }, "Data"),
          React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: "#374151", width: "100%", marginTop: 40, marginBottom: 4 } }),
          React.createElement(Text, { style: { fontSize: 7, color: "#9CA3AF" } }, "Data semnării"),
        ),
      ),
      // Nota
      React.createElement(View, { style: { marginTop: 40, padding: 8, backgroundColor: "#F3F4F6", borderRadius: 4 } },
        React.createElement(Text, { style: { fontSize: 7, color: "#6B7280", lineHeight: 1.4 } },
          "Acest document a fost generat automat de platforma JobGrade.ro pe baza evaluărilor realizate. " +
          "Procesul verbal al evaluării (jurnalul procesului) este disponibil ca anexă separată. " +
          "Documentul devine opozabil după semnarea de către reprezentantul legal al organizației."
        ),
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, `JobGrade.ro — Document opozabil`),
        React.createElement(Text, null, generatedAt)
      ),
    ),
  )
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId } = await params
    const tenantId = session.user.tenantId

    const sufficient = await hasCredits(tenantId, CREDIT_COST)
    if (!sufficient) {
      return NextResponse.json(
        { message: `Credite insuficiente. Necesari: ${CREDIT_COST}.` },
        { status: 402 }
      )
    }

    // Fetch company data
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    })
    const company = await prisma.companyProfile.findFirst({
      where: { tenantId },
      select: { cui: true, address: true, regCom: true },
    })

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        jobResults: {
          include: {
            job: {
              select: {
                title: true,
                code: true,
                purpose: true,
                responsibilities: true,
                requirements: true,
                department: { select: { name: true } },
              },
            },
            salaryGrade: { select: { name: true } },
          },
          orderBy: { rank: "asc" },
        },
        participants: { select: { id: true } },
        validator: { select: { firstName: true, lastName: true } },
      },
    })

    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    const generatedAt = new Date().toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const jobResults = evalSession.jobResults.map((jr) => ({
      rank: jr.rank,
      code: jr.job.code ?? "—",
      title: jr.job.title,
      department: jr.job.department?.name ?? "—",
      totalScore: jr.totalScore,
      normalizedScore: jr.normalizedScore.toFixed(2),
      grade: jr.salaryGrade?.name ?? "—",
    }))

    const companyName = tenant?.name ?? "—"

    const jobs = evalSession.jobResults.map((jr) => ({
      title: jr.job.title,
      department: jr.job.department?.name ?? "—",
      purpose: jr.job.purpose,
      responsibilities: jr.job.responsibilities,
      requirements: jr.job.requirements,
    }))

    const doc = SessionPDFDocument({
      sessionName: evalSession.name,
      status: evalSession.status,
      completedAt: evalSession.completedAt
        ? evalSession.completedAt.toLocaleDateString("ro-RO")
        : "—",
      participantCount: evalSession.participants.length,
      jobResults,
      generatedAt,
      companyName,
      companyCUI: company?.cui ?? null,
      companyAddress: company?.address ?? null,
      validatedBy: evalSession.validator
        ? `${evalSession.validator.firstName} ${evalSession.validator.lastName}`
        : null,
      jobs,
    })

    const buffer = await renderToBuffer(doc)

    await deductCredits(
      tenantId,
      CREDIT_COST,
      `Export PDF: ${evalSession.name}`,
      sessionId
    )

    const filename = `${evalSession.name.replace(/[^a-zA-Z0-9]/g, "_")}_raport.pdf`

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    })
  } catch (error) {
    console.error("[EXPORT PDF]", error)
    return NextResponse.json({ message: "Eroare la generarea PDF-ului." }, { status: 500 })
  }
}
