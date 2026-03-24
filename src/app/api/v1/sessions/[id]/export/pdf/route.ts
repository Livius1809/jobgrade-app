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

function SessionPDFDocument({
  sessionName,
  status,
  completedAt,
  participantCount,
  jobResults,
  generatedAt,
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
}) {
  return React.createElement(
    Document,
    { title: `Raport ierarhie — ${sessionName}` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, `Raport ierarhie: ${sessionName}`),
        React.createElement(
          Text,
          { style: styles.subtitle },
          `Generat: ${generatedAt} · Confidențial — JobGrade.ro`
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
        React.createElement(Text, null, "JobGrade.ro — Confidențial"),
        React.createElement(Text, null, generatedAt)
      )
    )
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

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        jobResults: {
          include: {
            job: {
              select: {
                title: true,
                code: true,
                department: { select: { name: true } },
              },
            },
            salaryGrade: { select: { name: true } },
          },
          orderBy: { rank: "asc" },
        },
        participants: { select: { id: true } },
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

    const doc = SessionPDFDocument({
      sessionName: evalSession.name,
      status: evalSession.status,
      completedAt: evalSession.completedAt
        ? evalSession.completedAt.toLocaleDateString("ro-RO")
        : "—",
      participantCount: evalSession.participants.length,
      jobResults,
      generatedAt,
    })

    const buffer = await renderToBuffer(doc)

    await deductCredits(
      tenantId,
      CREDIT_COST,
      `Export PDF: ${evalSession.name}`,
      sessionId
    )

    const filename = `${evalSession.name.replace(/[^a-zA-Z0-9]/g, "_")}_raport.pdf`

    return new NextResponse(buffer, {
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
