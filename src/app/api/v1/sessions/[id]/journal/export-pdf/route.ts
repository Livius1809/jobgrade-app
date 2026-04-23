import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import React from "react"

export const dynamic = "force-dynamic"

const ADMIN_ROLES: UserRole[] = [UserRole.OWNER, UserRole.COMPANY_ADMIN, UserRole.FACILITATOR]

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, paddingTop: 35, paddingBottom: 45, paddingHorizontal: 35, color: "#111827" },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#4F46E5", paddingBottom: 10 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#4F46E5", marginBottom: 3 },
  subtitle: { fontSize: 10, color: "#6B7280" },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1F2937", marginTop: 16, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  row: { flexDirection: "row" as const, borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6", paddingVertical: 3 },
  cell: { fontSize: 8, color: "#374151" },
  cellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111827" },
  meta: { fontSize: 7, color: "#9CA3AF" },
  comment: { marginBottom: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#E0E7FF" },
  aiComment: { marginBottom: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#DDD6FE" },
  footer: { position: "absolute" as const, bottom: 20, left: 35, right: 35, fontSize: 7, color: "#9CA3AF", flexDirection: "row" as const, justifyContent: "space-between" as const },
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    if (!ADMIN_ROLES.includes(session.user.role as UserRole)) {
      return NextResponse.json({ message: "Acces restricționat." }, { status: 403 })
    }

    const { id: sessionId } = await params
    const tenantId = session.user.tenantId

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { name: true, createdAt: true, status: true },
    })
    if (!evalSession) return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })

    // Fetch all data
    const [participants, sessionJobs, evaluations, comments, votes, decisions, validations] = await Promise.all([
      prisma.sessionParticipant.findMany({
        where: { sessionId },
        include: { user: { select: { firstName: true, lastName: true, jobTitle: true, email: true } } },
      }),
      prisma.sessionJob.findMany({
        where: { sessionId },
        include: { job: { select: { title: true, department: { select: { name: true } } } } },
      }),
      prisma.evaluation.findMany({
        where: { sessionId },
        include: {
          assignment: { include: { user: { select: { firstName: true, lastName: true } }, sessionJob: { include: { job: { select: { title: true } } } } } },
          criterion: { select: { name: true } },
          subfactor: { select: { code: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.discussionComment.findMany({
        where: { sessionId },
        include: { user: { select: { firstName: true, lastName: true } }, criterion: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.vote.findMany({
        where: { sessionId },
        include: { user: { select: { firstName: true, lastName: true } }, criterion: { select: { name: true } }, subfactor: { select: { code: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.facilitatorDecision.findMany({
        where: { sessionId },
        include: { facilitator: { select: { firstName: true, lastName: true } }, criterion: { select: { name: true } }, subfactor: { select: { code: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.memberValidation.findMany({
        where: { sessionId },
        include: { user: { select: { firstName: true, lastName: true } }, criterion: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ])

    const fmt = (d: Date) => d.toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

    const doc = React.createElement(Document, {},
      React.createElement(Page, { size: "A4", style: s.page },
        // Header
        React.createElement(View, { style: s.header },
          React.createElement(Text, { style: s.title }, "Jurnalul Procesului de Evaluare"),
          React.createElement(Text, { style: s.subtitle }, `${evalSession.name} — ${fmt(evalSession.createdAt)} — Status: ${evalSession.status}`),
        ),

        // Setup
        React.createElement(Text, { style: s.sectionTitle }, "1. SETUP"),
        React.createElement(Text, { style: s.cell }, `Membri comisie (${participants.length}):`),
        ...participants.map((p, i) =>
          React.createElement(View, { key: `p${i}`, style: s.row },
            React.createElement(Text, { style: s.cellBold }, `${p.user.firstName} ${p.user.lastName}`),
            React.createElement(Text, { style: s.cell }, ` — ${p.user.jobTitle || p.user.email}`),
          )
        ),
        React.createElement(Text, { style: { ...s.cell, marginTop: 6 } }, `Posturi în evaluare (${sessionJobs.length}):`),
        ...sessionJobs.map((sj, i) =>
          React.createElement(View, { key: `j${i}`, style: s.row },
            React.createElement(Text, { style: s.cellBold }, sj.job.title),
            React.createElement(Text, { style: s.cell }, ` — ${sj.job.department?.name || "—"}`),
          )
        ),

        // Pre-scorare
        React.createElement(Text, { style: s.sectionTitle }, `2. PRE-SCORARE (${evaluations.length} evaluări)`),
        ...evaluations.slice(0, 100).map((ev, i) =>
          React.createElement(View, { key: `e${i}`, style: s.row },
            React.createElement(Text, { style: s.cellBold }, `${ev.assignment.user.firstName} ${ev.assignment.user.lastName}`),
            React.createElement(Text, { style: s.cell }, ` | ${ev.assignment.sessionJob.job.title} | ${ev.criterion.name}: ${ev.subfactor.code}`),
            React.createElement(Text, { style: s.meta }, ` ${fmt(ev.createdAt)}`),
          )
        ),

        // Discuții
        React.createElement(Text, { style: s.sectionTitle }, `3. DISCUȚIE GRUP (${comments.length} mesaje)`),
        ...comments.slice(0, 60).map((c, i) =>
          React.createElement(View, { key: `c${i}`, style: c.isAi ? s.aiComment : s.comment },
            React.createElement(Text, { style: s.cellBold },
              `${c.isAi ? "AI Mediator" : `${c.user?.firstName || ""} ${c.user?.lastName || ""}`} — ${c.criterion.name} — R${c.round}`
            ),
            React.createElement(Text, { style: s.cell }, c.content.substring(0, 300)),
            React.createElement(Text, { style: s.meta }, fmt(c.createdAt)),
          )
        ),

        // Footer
        React.createElement(View, { style: s.footer, fixed: true },
          React.createElement(Text, {}, "JobGrade — Jurnal Proces"),
          React.createElement(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber}/${totalPages}` }),
        ),
      ),

      // Page 2: Votes + Decisions + Validations
      React.createElement(Page, { size: "A4", style: s.page },
        React.createElement(Text, { style: s.sectionTitle }, `4. VOTURI (${votes.length})`),
        ...votes.slice(0, 80).map((v, i) =>
          React.createElement(View, { key: `v${i}`, style: s.row },
            React.createElement(Text, { style: s.cellBold }, `${v.user.firstName} ${v.user.lastName}`),
            React.createElement(Text, { style: s.cell }, ` | ${v.criterion.name}: ${v.subfactor.code} | R${v.round}`),
            React.createElement(Text, { style: s.meta }, ` ${fmt(v.createdAt)}`),
          )
        ),

        React.createElement(Text, { style: s.sectionTitle }, `5. MEDIERE AI (${decisions.length} decizii)`),
        ...decisions.map((fd, i) =>
          React.createElement(View, { key: `d${i}`, style: s.comment },
            React.createElement(Text, { style: s.cellBold }, `${fd.facilitator.firstName} ${fd.facilitator.lastName} — ${fd.criterion.name}: ${fd.subfactor.code}`),
            React.createElement(Text, { style: s.cell }, fd.rationale.substring(0, 200)),
            React.createElement(Text, { style: s.meta }, fmt(fd.createdAt)),
          )
        ),

        React.createElement(Text, { style: s.sectionTitle }, `6. VALIDARE (${validations.length})`),
        ...validations.map((mv, i) =>
          React.createElement(View, { key: `mv${i}`, style: s.row },
            React.createElement(Text, { style: s.cellBold }, `${mv.user.firstName} ${mv.user.lastName}`),
            React.createElement(Text, { style: s.cell }, ` | ${mv.criterion.name} | ${mv.preScore} → ${mv.consensus} | ${mv.accepted ? "Acceptat" : "În așteptare"}`),
            React.createElement(Text, { style: s.meta }, mv.acceptedAt ? ` ${fmt(mv.acceptedAt)}` : ""),
          )
        ),

        React.createElement(View, { style: s.footer, fixed: true },
          React.createElement(Text, {}, "JobGrade — Jurnal Proces"),
          React.createElement(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber}/${totalPages}` }),
        ),
      ),
    )

    const buffer = await renderToBuffer(doc as any)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="jurnal-proces-${sessionId.slice(0, 8)}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[JOURNAL PDF]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
