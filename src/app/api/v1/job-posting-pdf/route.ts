import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
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
import { CRITERION_DESCRIPTIONS, CRITERION_LABELS } from "@/lib/evaluation/criterion-descriptions"

export const dynamic = "force-dynamic"

// ── Stiluri ─────────────────────────────────────────────────

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
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#374151",
    textAlign: "center" as const,
    marginBottom: 30,
  },
  coverMeta: {
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 4,
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
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  text: { fontSize: 9, lineHeight: 1.5, color: "#374151", marginBottom: 4 },
  textBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1F2937" },
  criterionRow: {
    flexDirection: "row" as const,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  criterionRowAlt: {
    flexDirection: "row" as const,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#F9FAFB",
  },
  criterionName: { width: "35%", fontSize: 9, color: "#374151" },
  criterionLevel: { width: "10%", fontSize: 9, fontFamily: "Helvetica-Bold", color: "#4F46E5", textAlign: "center" as const },
  criterionDesc: { width: "55%", fontSize: 8, color: "#6B7280" },
  salaryBand: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "#EEF2FF",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  salaryText: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#4F46E5" },
  salaryLabel: { fontSize: 8, color: "#6B7280", textAlign: "center" as const, marginTop: 2 },
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

// ── Route ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { tenantId, role } = session.user
  if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
    return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
  }

  const body = await req.json()
  const { jobId, narration } = body as { jobId: string; narration?: string }

  // Preluăm datele postului
  const job = await prisma.job.findFirst({
    where: { id: jobId, tenantId },
    include: {
      department: true,
      jobResults: {
        include: { salaryGrade: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!job) return NextResponse.json({ message: "Post negasit." }, { status: 404 })

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  const companyName = tenant?.name || "Compania"

  // Scoruri per criteriu (din ultima evaluare)
  const criteriaLevels = await getCriteriaLevels(job.id)
  const salaryGrade = job.jobResults[0]?.salaryGrade
  const isFromJE = Object.keys(criteriaLevels).length > 0

  // ── Generare PDF ──
  const doc = React.createElement(
    Document,
    {},
    // Pagina 1: Cover + Bandă salarială
    React.createElement(
      Page,
      { size: "A4", style: s.coverPage },
      React.createElement(Text, { style: s.coverTitle }, job.title),
      React.createElement(Text, { style: s.coverSubtitle }, "Anunt de angajare"),
      React.createElement(Text, { style: s.coverMeta }, companyName),
      job.department && React.createElement(Text, { style: s.coverMeta }, `Departament: ${job.department.name}`),
      job.code && React.createElement(Text, { style: s.coverMeta }, `Cod post: ${job.code}`),
      React.createElement(Text, { style: { ...s.coverMeta, marginTop: 8 } }, `Generat: ${new Date().toLocaleDateString("ro-RO")}`),
      // Bandă salarială
      salaryGrade && React.createElement(
        View,
        { style: s.salaryBand },
        React.createElement(
          View,
          { style: { alignItems: "center" as const } },
          React.createElement(
            Text,
            { style: s.salaryText },
            `${(salaryGrade.scoreMin * 10).toLocaleString("ro-RO")} - ${(salaryGrade.scoreMax * 10).toLocaleString("ro-RO")} RON`
          ),
          React.createElement(Text, { style: s.salaryLabel }, "Banda salariala brut/luna (Art. 5)")
        )
      ),
      React.createElement(
        Text,
        { style: { ...s.legal, marginTop: 40 } },
        "Conform Directivei (UE) 2023/970 privind transparenta salariala.\n" +
        "Criteriile de evaluare sunt obiective si neutre din punct de vedere al genului.\n" +
        "Art. 5 alin. (2): Angajatorul nu solicita informatii privind remuneratia anterioara."
      ),
      React.createElement(
        View,
        { style: s.footer },
        React.createElement(Text, {}, companyName),
        React.createElement(Text, {}, "Confidential")
      )
    ),

    // Pagina 2: Narare sau descriere structurată
    React.createElement(
      Page,
      { size: "A4", style: s.page },
      React.createElement(
        View,
        { style: s.header },
        React.createElement(Text, { style: s.title }, job.title),
        React.createElement(Text, { style: s.subtitle }, `${companyName} | ${job.department?.name || ""} | ${new Date().toLocaleDateString("ro-RO")}`)
      ),
      // Nararea (dacă există) sau descriere brută
      narration
        ? React.createElement(
            View,
            {},
            ...narration.split("\n\n").map((para: string, i: number) =>
              React.createElement(Text, { key: `n${i}`, style: s.text }, para)
            )
          )
        : React.createElement(
            View,
            {},
            job.purpose && React.createElement(
              View,
              {},
              React.createElement(Text, { style: s.sectionTitle }, "Scopul postului"),
              React.createElement(Text, { style: s.text }, job.purpose)
            ),
            job.description && React.createElement(
              View,
              {},
              React.createElement(Text, { style: s.sectionTitle }, "Descriere"),
              React.createElement(Text, { style: s.text }, job.description)
            ),
            job.responsibilities && React.createElement(
              View,
              {},
              React.createElement(Text, { style: s.sectionTitle }, "Responsabilitati"),
              React.createElement(Text, { style: s.text }, job.responsibilities)
            ),
            job.requirements && React.createElement(
              View,
              {},
              React.createElement(Text, { style: s.sectionTitle }, "Cerinte"),
              React.createElement(Text, { style: s.text }, job.requirements)
            )
          ),
      React.createElement(
        View,
        { style: s.footer },
        React.createElement(Text, {}, companyName),
        React.createElement(Text, {}, "Pagina 2")
      )
    ),

    // Pagina 3: Criterii de evaluare
    isFromJE ? React.createElement(
      Page,
      { size: "A4", style: s.page },
      React.createElement(
        View,
        { style: s.header },
        React.createElement(Text, { style: s.title }, "Criterii obiective de evaluare"),
        React.createElement(Text, { style: s.subtitle }, "Directiva (UE) 2023/970, Art. 4 — criterii neutre din punct de vedere al genului")
      ),
      // Tabel criterii
      ...Object.entries(criteriaLevels).map(([criterionKey, level], idx) => {
        const label = CRITERION_LABELS[criterionKey] || criterionKey
        const descriptions = CRITERION_DESCRIPTIONS[criterionKey] || []
        const desc = descriptions.find((d) => d.letter === level)

        return React.createElement(
          View,
          { key: criterionKey, style: idx % 2 === 0 ? s.criterionRow : s.criterionRowAlt },
          React.createElement(Text, { style: s.criterionName }, label),
          React.createElement(Text, { style: s.criterionLevel }, level),
          React.createElement(Text, { style: s.criterionDesc }, desc?.description || "")
        )
      }),
      React.createElement(
        Text,
        { style: s.legal },
        "Nivelul exact al salariului se stabileste pe baza acestor criterii obiective: " +
        "complexitatea postului, responsabilitatile aferente, competentele cerute si " +
        "conditiile de munca. Criteriile sunt aplicate fara discriminare."
      ),
      React.createElement(
        View,
        { style: s.footer },
        React.createElement(Text, {}, companyName),
        React.createElement(Text, {}, "Pagina 3")
      )
    ) : null
  )

  const buffer = await renderToBuffer(doc as any)

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="anunt-${job.code || job.id.slice(-6)}-art5.pdf"`,
    },
  })
}

// ── Helper: criterii din ultima evaluare ─────────────────────

async function getCriteriaLevels(jobId: string): Promise<Record<string, string>> {
  const evaluations = await prisma.evaluation.findMany({
    where: {
      assignment: {
        sessionJob: { jobId },
      },
    },
    include: {
      criterion: true,
      subfactor: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  // Deduplicare: ultimul scor per criteriu
  const levels: Record<string, string> = {}
  for (const ev of evaluations) {
    if (!levels[ev.criterion.name]) {
      levels[ev.criterion.name] = ev.subfactor.code
    }
  }
  return levels
}
