import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
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

const el = React.createElement

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: "#111827",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#7C3AED",
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#7C3AED",
    marginBottom: 3,
  },
  subtitle: { fontSize: 10, color: "#6B7280" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  visitRow: {
    flexDirection: "row" as const,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  cell: { fontSize: 8, color: "#374151" },
  cellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111827" },
  meta: { fontSize: 7, color: "#9CA3AF" },
  guideBlock: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#DDD6FE",
  },
  userBlock: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#7C3AED",
  },
  assistantBlock: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#E0E7FF",
  },
  footer: {
    position: "absolute" as const,
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#9CA3AF",
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  summary: {
    backgroundColor: "#F5F3FF",
    padding: 10,
    borderRadius: 4,
    marginTop: 12,
  },
})

interface Message {
  role: string
  content: string
  timestamp: string
  page?: string
  consumesMinutes: boolean
}

interface Visit {
  page: string
  title: string
  enteredAt: string
  leftAt?: string
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  })

const fmtFull = (d: string) => `${fmtDate(d)} ${fmtTime(d)}`

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session)
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const body = await req.json()
    const messages: Message[] = body.messages ?? []
    const visits: Visit[] = body.visits ?? []

    const now = new Date()
    const userName = session.user.name ?? session.user.email
    const generatedAt = fmtFull(now.toISOString())

    const userQuestions = messages.filter((m) => m.role === "user")
    const assistantAnswers = messages.filter((m) => m.role === "assistant")
    const guides = messages.filter((m) => m.role === "guide")

    // ── Build PDF ──

    const doc = el(
      Document,
      {},

      // Page 1: Vizite + Sumar
      el(
        Page,
        { size: "A4", style: s.page },

        el(
          View,
          { style: s.header },
          el(Text, { style: s.title }, "Jurnal Flying Wheels"),
          el(
            Text,
            { style: s.subtitle },
            `${userName} · ${generatedAt} · v${now.getTime().toString(36)}`
          )
        ),

        // Sumar
        el(
          View,
          { style: s.summary },
          el(
            Text,
            { style: s.cellBold },
            `Pagini vizitate: ${visits.length} | Ghidaje primite: ${guides.length} | Intrebari: ${userQuestions.length} | Raspunsuri: ${assistantAnswers.length}`
          )
        ),

        // Vizite
        el(Text, { style: s.sectionTitle }, `1. PAGINI VIZITATE (${visits.length})`),
        ...visits.map((v, i) =>
          el(
            View,
            { key: `v${i}`, style: s.visitRow },
            el(Text, { style: { ...s.cellBold, width: "30%" } }, v.title),
            el(Text, { style: { ...s.cell, width: "35%" } }, v.page),
            el(Text, { style: { ...s.meta, width: "17%" } }, fmtTime(v.enteredAt)),
            el(
              Text,
              { style: { ...s.meta, width: "18%" } },
              v.leftAt ? fmtTime(v.leftAt) : "—"
            )
          )
        ),

        el(View, { style: s.footer, fixed: true },
          el(Text, {}, "JobGrade — Flying Wheels Journal"),
          el(Text, {
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber}/${totalPages}`,
          }),
        )
      ),

      // Page 2: Conversatie completa
      el(
        Page,
        { size: "A4", style: s.page },

        el(Text, { style: s.sectionTitle }, "2. CONVERSATIE COMPLETA"),

        ...messages.slice(0, 100).map((m, i) => {
          const blockStyle =
            m.role === "user"
              ? s.userBlock
              : m.role === "guide"
              ? s.guideBlock
              : s.assistantBlock

          const roleLabel =
            m.role === "user"
              ? "INTREBARE"
              : m.role === "guide"
              ? "GHIDAJ AUTOMAT"
              : "RASPUNS"

          return el(
            View,
            { key: `m${i}`, style: blockStyle },
            el(
              Text,
              { style: s.meta },
              `${roleLabel} · ${fmtTime(m.timestamp)}${m.page ? ` · ${m.page}` : ""}${m.consumesMinutes ? " · 1 min" : " · gratuit"}`
            ),
            el(
              Text,
              { style: s.cell },
              m.content.substring(0, 500)
            )
          )
        }),

        el(View, { style: s.footer, fixed: true },
          el(Text, {}, "JobGrade — Flying Wheels Journal"),
          el(Text, {
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber}/${totalPages}`,
          }),
        )
      )
    )

    const buffer = await renderToBuffer(doc as any)
    const version = now.getTime().toString(36)
    const filename = `jurnal-flying-wheels-${fmtDate(now.toISOString()).replace(/\./g, "-")}-v${version}.pdf`

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[FLYING-WHEELS JOURNAL]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
