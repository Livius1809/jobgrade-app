import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import React from "react"

export const dynamic = "force-dynamic"

const MODULE_LABELS: Record<string, string> = {
  JOB_EVALUATION: "Evaluare posturi",
  SALARY_TRANSPARENCY: "Transparenta salariala",
  PAY_GAP: "Raport pay gap",
  JOINT_ASSESSMENT: "Evaluare comuna Art. 10",
  BENCHMARK: "Benchmark piata",
  PERSONNEL_EVAL: "Evaluare personal",
  ORG_DEVELOPMENT: "Dezvoltare organizationala",
  CUSTOM: "Sectiune personalizata",
}

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: "#111827",
  },
  coverPage: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 50,
    color: "#111827",
    justifyContent: "flex-start" as const,
    alignItems: "center" as const,
  },
  coverTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#4F46E5",
    textAlign: "center" as const,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#374151",
    textAlign: "center" as const,
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 3,
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#4F46E5",
    paddingBottom: 6,
  },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#4F46E5",
    marginBottom: 2,
  },
  subtitle: { fontSize: 8, color: "#6B7280" },
  moduleTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginTop: 8,
    marginBottom: 4,
  },
  text: { fontSize: 9, lineHeight: 1.5, color: "#374151", marginBottom: 4 },
  metricRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  metricLabel: { fontSize: 8, color: "#6B7280", width: "60%" },
  metricValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#4F46E5", width: "40%", textAlign: "right" as const },
  detail: {
    flexDirection: "row" as const,
    paddingVertical: 2,
    paddingLeft: 8,
  },
  detailBullet: { fontSize: 8, color: "#4F46E5", marginRight: 4 },
  detailLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151", marginRight: 4 },
  detailValue: { fontSize: 8, color: "#6B7280" },
  badge: {
    fontSize: 7,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    alignSelf: "flex-start" as const,
    marginBottom: 4,
  },
  legal: {
    fontSize: 7,
    color: "#9CA3AF",
    lineHeight: 1.4,
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  footer: {
    position: "absolute" as const,
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    fontSize: 7,
    color: "#D1D5DB",
  },
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { id } = await params
  const { tenantId } = session.user

  const report = await prisma.employeeContinuousReport.findFirst({
    where: { id, tenantId },
    include: {
      sections: { orderBy: [{ order: "asc" }, { updatedAt: "desc" }] },
    },
  })

  if (!report) return NextResponse.json({ message: "Raport negasit." }, { status: 404 })

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  const companyName = tenant?.name || "Compania"

  // Grupare secțiuni per modul
  const grouped: Record<string, typeof report.sections> = {}
  for (const sec of report.sections) {
    if (!grouped[sec.module]) grouped[sec.module] = []
    grouped[sec.module].push(sec)
  }

  const doc = React.createElement(
    Document,
    {},
    // Cover page
    React.createElement(
      Page,
      { size: "A4", style: s.coverPage },
      React.createElement(Text, { style: s.coverTitle }, "Raport angajat"),
      React.createElement(Text, { style: s.coverSubtitle }, report.employeeName),
      report.jobTitle && React.createElement(Text, { style: s.coverMeta }, report.jobTitle),
      report.department && React.createElement(Text, { style: s.coverMeta }, report.department),
      React.createElement(Text, { style: { ...s.coverMeta, marginTop: 12 } }, companyName),
      React.createElement(Text, { style: s.coverMeta }, `Generat: ${new Date().toLocaleDateString("ro-RO")}`),
      React.createElement(Text, { style: s.coverMeta }, `${report.sections.length} sectiuni din ${Object.keys(grouped).length} module`),
      React.createElement(
        Text,
        { style: { ...s.legal, marginTop: 40 } },
        "Document generat automat din platforma JobGrade.\n" +
        "Informatiile se actualizeaza pe masura ce modulele platformei sunt utilizate.\n" +
        (report.visibleToEmployee
          ? "Acest raport este accesibil angajatului in temeiul Art. 15 GDPR."
          : "Acest raport NU este accesibil angajatului.")
      ),
      React.createElement(
        View,
        { style: s.footer },
        React.createElement(Text, {}, companyName),
        React.createElement(Text, {}, "Confidential")
      )
    ),

    // Content pages — una per modul
    ...Object.entries(grouped).map(([mod, sections], pageIdx) =>
      React.createElement(
        Page,
        { key: mod, size: "A4", style: s.page },
        React.createElement(
          View,
          { style: s.header },
          React.createElement(Text, { style: s.title }, report.employeeName),
          React.createElement(Text, { style: s.subtitle }, `${report.jobTitle || ""} | ${report.department || ""} | ${new Date().toLocaleDateString("ro-RO")}`)
        ),
        React.createElement(Text, { style: s.moduleTitle }, MODULE_LABELS[mod] || mod),
        ...sections.map((sec) => {
          const content = sec.content as Record<string, unknown>
          const elements: React.ReactElement[] = []

          elements.push(
            React.createElement(Text, { key: `t-${sec.id}`, style: s.sectionTitle }, sec.title)
          )
          elements.push(
            React.createElement(Text, { key: `v-${sec.id}`, style: s.badge }, `v${sec.version} | ${new Date(sec.updatedAt).toLocaleDateString("ro-RO")}`)
          )

          // Summary
          if (content.summary) {
            elements.push(
              React.createElement(Text, { key: `s-${sec.id}`, style: s.text }, String(content.summary))
            )
          }

          // Details
          if (Array.isArray(content.details)) {
            for (const [i, d] of (content.details as { label?: string; value?: string }[]).entries()) {
              elements.push(
                React.createElement(
                  View,
                  { key: `d-${sec.id}-${i}`, style: s.detail },
                  React.createElement(Text, { style: s.detailBullet }, "•"),
                  d.label ? React.createElement(Text, { style: s.detailLabel }, `${d.label}:`) : null,
                  React.createElement(Text, { style: s.detailValue }, String(d.value || ""))
                )
              )
            }
          }

          // Metrics
          if (Array.isArray(content.metrics)) {
            for (const [i, m] of (content.metrics as { label?: string; value?: string | number }[]).entries()) {
              elements.push(
                React.createElement(
                  View,
                  { key: `m-${sec.id}-${i}`, style: s.metricRow },
                  React.createElement(Text, { style: s.metricLabel }, String(m.label || "")),
                  React.createElement(Text, { style: s.metricValue }, String(m.value || ""))
                )
              )
            }
          }

          // Fallback: chei JSON
          if (!content.summary && !content.details && !content.metrics) {
            for (const [key, val] of Object.entries(content)) {
              elements.push(
                React.createElement(
                  View,
                  { key: `f-${sec.id}-${key}`, style: s.detail },
                  React.createElement(Text, { style: s.detailLabel }, `${key}:`),
                  React.createElement(Text, { style: s.detailValue }, typeof val === "object" ? JSON.stringify(val) : String(val))
                )
              )
            }
          }

          return React.createElement(View, { key: sec.id }, ...elements)
        }),
        React.createElement(
          View,
          { style: s.footer },
          React.createElement(Text, {}, companyName),
          React.createElement(Text, {}, `Pagina ${pageIdx + 2}`)
        )
      )
    )
  )

  const buffer = await renderToBuffer(doc as any)

  const safeName = report.employeeName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="raport-${safeName}.pdf"`,
    },
  })
}
