import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import React from "react"
import type { PayGapIndicators } from "@/lib/pay-gap"

export const dynamic = "force-dynamic"

const ADMIN_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.COMPANY_ADMIN,
  UserRole.SUPER_ADMIN,
]

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
    paddingTop: 120,
    paddingBottom: 50,
    paddingHorizontal: 60,
    color: "#111827",
    justifyContent: "flex-start" as const,
    alignItems: "center" as const,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#4F46E5",
    textAlign: "center" as const,
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center" as const,
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 6,
  },
  coverConfidential: {
    fontSize: 8,
    color: "#DC2626",
    textAlign: "center" as const,
    marginTop: 60,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#4F46E5",
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#4F46E5",
    marginBottom: 2,
  },
  subtitle: { fontSize: 9, color: "#6B7280" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    marginTop: 18,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionSubtitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginTop: 10,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row" as const,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rowAlt: {
    flexDirection: "row" as const,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: "#F9FAFB",
  },
  headerRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: "#F3F4F6",
  },
  cell: { fontSize: 8, color: "#374151" },
  cellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111827" },
  cellRight: { fontSize: 8, color: "#374151", textAlign: "right" as const },
  cellCenter: { fontSize: 8, color: "#374151", textAlign: "center" as const },
  meta: { fontSize: 7, color: "#9CA3AF" },
  paragraph: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 6,
    lineHeight: 1.5,
  },
  legalNote: {
    fontSize: 7,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic" as const,
    lineHeight: 1.4,
  },
  alertBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 4,
    padding: 8,
    marginVertical: 6,
  },
  alertText: { fontSize: 8, color: "#991B1B" },
  successBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 4,
    padding: 8,
    marginVertical: 6,
  },
  successText: { fontSize: 8, color: "#166534" },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 4,
    padding: 8,
    marginVertical: 6,
  },
  infoText: { fontSize: 8, color: "#1E40AF" },
  signatureBlock: {
    flexDirection: "row" as const,
    marginTop: 12,
    gap: 20,
  },
  signatureSlot: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    paddingTop: 6,
  },
  signatureLabel: { fontSize: 7, color: "#6B7280" },
  signatureName: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111827" },
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
  badge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  badgeRed: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  badgeGreen: { backgroundColor: "#DCFCE7", color: "#166534" },
  badgeAmber: { backgroundColor: "#FEF3C7", color: "#92400E" },
})

// ── Helpers ─────────────────────────────────────────────────

const fmt = (d: Date | string) =>
  new Date(d).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const fmtFull = (d: Date | string) =>
  new Date(d).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const pct = (v: number | null): string =>
  v === null ? "N/A (k<5)" : `${v.toFixed(1)}%`

const el = React.createElement

// ── Route ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session)
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    if (!ADMIN_ROLES.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { message: "Acces restrictionat." },
        { status: 403 }
      )
    }

    const tenantId = session.user.tenantId
    const url = new URL(req.url)
    const yearParam = url.searchParams.get("year")

    // Fetch company info
    const tenantRaw = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, company: { select: { cui: true, address: true } } },
    })

    if (!tenantRaw) {
      return NextResponse.json({ message: "Companie negasita." }, { status: 404 })
    }

    const tenant = {
      name: tenantRaw.name,
      cui: tenantRaw.company?.cui ?? null,
      address: tenantRaw.company?.address ?? null,
    }

    // Fetch latest pay gap report
    const report = yearParam
      ? await prisma.payGapReport.findFirst({
          where: { tenantId, reportYear: parseInt(yearParam) },
        })
      : await prisma.payGapReport.findFirst({
          where: { tenantId },
          orderBy: { reportYear: "desc" },
        })

    if (!report) {
      return NextResponse.json(
        { message: "Niciun raport pay gap disponibil." },
        { status: 404 }
      )
    }

    const indicators = report.indicators as unknown as PayGapIndicators

    // Fetch salary grades
    const salaryGrades = await prisma.salaryGrade.findMany({
      where: { tenantId },
      orderBy: { order: "asc" },
      select: {
        name: true,
        order: true,
        salaryMin: true,
        salaryMax: true,
      },
    })

    // Fetch justifications — stored in PayGapReport.indicators.justifications + SystemConfig
    const reportIndicators = (report.indicators as Record<string, unknown>) ?? {}
    const reportJustifications = (reportIndicators.justifications ?? []) as Array<Record<string, unknown>>

    // Also fetch equal-work justifications from SystemConfig
    const justConfigKey = `PAY_GAP_JUSTIFICATIONS_${tenantId}`
    const justConfig = await prisma.systemConfig.findUnique({ where: { key: justConfigKey } }).catch(() => null)
    const equalWorkJustifications = justConfig ? JSON.parse(justConfig.value) as Array<Record<string, unknown>> : []

    const justifications = [...reportJustifications, ...equalWorkJustifications]

    // Fetch joint assessments (Art. 10)
    const assessments = await prisma.jointPayAssessment.findMany({
      where: { tenantId },
      orderBy: { triggeredAt: "desc" },
      select: {
        id: true,
        status: true,
        triggerReason: true,
        triggeredAt: true,
        dueDate: true,
        resolvedAt: true,
        rootCause: true,
        actionPlan: true,
      },
    })

    const now = new Date()
    const generatedAt = fmtFull(now)

    // ── Build PDF ─────────────────────────────────────────

    const pages: React.ReactElement[] = []

    // ════════════════════════════════════════════════════════
    // PAGINA 0: COPERTA
    // ════════════════════════════════════════════════════════

    pages.push(
      el(Page, { key: "cover", size: "A4", style: s.coverPage },
        el(Text, { style: s.coverTitle }, "Raport de Conformitate"),
        el(Text, { style: s.coverSubtitle },
          `Transparenta Salariala — Directiva EU 2023/970`
        ),
        el(View, { style: { marginTop: 30 } },
          el(Text, { style: s.coverMeta }, `Companie: ${tenant.name}`),
          tenant.cui && el(Text, { style: s.coverMeta }, `CUI: ${tenant.cui}`),
          tenant.address && el(Text, { style: s.coverMeta }, `Adresa: ${tenant.address}`),
          el(Text, { style: s.coverMeta }, `An raport: ${report.reportYear}`),
          el(Text, { style: s.coverMeta }, `Angajati in analiza: ${indicators.total_employees}`),
          el(Text, { style: s.coverMeta }, `Generat: ${generatedAt}`),
        ),
        el(Text, { style: s.coverConfidential },
          "Document confidential — Opozabil legal conform Art. 9-10 Directiva (UE) 2023/970"
        ),
        el(View, { style: s.footer, fixed: true },
          el(Text, {}, `JobGrade — Raport Conformitate ${report.reportYear}`),
          el(Text, {
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber}/${totalPages}`,
          }),
        ),
      )
    )

    // ════════════════════════════════════════════════════════
    // PAGINA 1: INDICATORI PAY GAP (Art. 9)
    // ════════════════════════════════════════════════════════

    const indicatorRows: { label: string; article: string; value: string; alert: boolean }[] = [
      {
        label: "Decalaj mediu salariu de baza",
        article: "Art. 9.1(a)",
        value: pct(indicators.a_mean_base_gap),
        alert: (indicators.a_mean_base_gap ?? 0) > 5,
      },
      {
        label: "Decalaj mediu compensatie variabila",
        article: "Art. 9.1(b)",
        value: pct(indicators.b_mean_variable_gap),
        alert: (indicators.b_mean_variable_gap ?? 0) > 5,
      },
      {
        label: "Decalaj median salariu de baza",
        article: "Art. 9.1(c)",
        value: pct(indicators.c_median_base_gap),
        alert: (indicators.c_median_base_gap ?? 0) > 5,
      },
      {
        label: "Decalaj median compensatie variabila",
        article: "Art. 9.1(d)",
        value: pct(indicators.d_median_variable_gap),
        alert: (indicators.d_median_variable_gap ?? 0) > 5,
      },
      {
        label: "Proportie beneficiari comp. variabila (B)",
        article: "Art. 9.1(e)",
        value: `M: ${pct(indicators.e_variable_proportion.male)} / F: ${pct(indicators.e_variable_proportion.female)}`,
        alert: false,
      },
    ]

    const quartileRows = indicators.f_quartile_distribution
      ? Object.entries(indicators.f_quartile_distribution).map(([q, data]) => ({
          quartile: q.toUpperCase(),
          male: pct(data.male),
          female: pct(data.female),
        }))
      : []

    pages.push(
      el(Page, { key: "indicators", size: "A4", style: s.page },
        el(View, { style: s.header },
          el(Text, { style: s.title }, "Sectiunea 1: Indicatori Pay Gap"),
          el(Text, { style: s.subtitle },
            `Conform Art. 9 Directiva (UE) 2023/970 — An ${report.reportYear}`
          ),
        ),

        el(Text, { style: s.paragraph },
          `Analiza se bazeaza pe ${indicators.total_employees} angajati ` +
          `(${indicators.total_male} barbati, ${indicators.total_female} femei). ` +
          `Salariul mediu de baza: barbati ${indicators.mean_base_male.toFixed(0)} RON, ` +
          `femei ${indicators.mean_base_female.toFixed(0)} RON. ` +
          `K-anonimitate aplicata: grupuri cu mai putin de 5 membri sunt suprimate.`
        ),

        // Tabel indicatori a-e
        el(Text, { style: s.sectionSubtitle }, "Indicatori Art. 9.1(a)-(e)"),
        el(View, { style: s.headerRow },
          el(Text, { style: { ...s.cellBold, width: "40%" } }, "Indicator"),
          el(Text, { style: { ...s.cellBold, width: "15%" } }, "Articol"),
          el(Text, { style: { ...s.cellBold, width: "25%", textAlign: "right" as const } }, "Valoare"),
          el(Text, { style: { ...s.cellBold, width: "20%", textAlign: "center" as const } }, "Status"),
        ),
        ...indicatorRows.map((row, i) =>
          el(View, { key: `ind${i}`, style: i % 2 === 0 ? s.row : s.rowAlt },
            el(Text, { style: { ...s.cell, width: "40%" } }, row.label),
            el(Text, { style: { ...s.cell, width: "15%" } }, row.article),
            el(Text, { style: { ...s.cellRight, width: "25%" } }, row.value),
            el(Text, {
              style: {
                ...s.badge,
                width: "20%",
                textAlign: "center" as const,
                ...(row.alert ? s.badgeRed : s.badgeGreen),
              },
            }, row.alert ? "> 5%" : "OK"),
          )
        ),

        // Distributie quartile Art. 9.1(f)
        el(Text, { style: s.sectionSubtitle }, "Distributie pe quartile salariale — Art. 9.1(f)"),
        el(View, { style: s.headerRow },
          el(Text, { style: { ...s.cellBold, width: "34%" } }, "Quartila"),
          el(Text, { style: { ...s.cellBold, width: "33%", textAlign: "center" as const } }, "Barbati (%)"),
          el(Text, { style: { ...s.cellBold, width: "33%", textAlign: "center" as const } }, "Femei (%)"),
        ),
        ...quartileRows.map((row, i) =>
          el(View, { key: `q${i}`, style: i % 2 === 0 ? s.row : s.rowAlt },
            el(Text, { style: { ...s.cellBold, width: "34%" } }, row.quartile),
            el(Text, { style: { ...s.cellCenter, width: "33%" } }, row.male),
            el(Text, { style: { ...s.cellCenter, width: "33%" } }, row.female),
          )
        ),

        // Per-grade Art. 9.1(g)
        ...(indicators.g_by_grade.length > 0
          ? [
              el(Text, { key: "g-title", style: s.sectionSubtitle },
                "Decalaj per grad salarial — Art. 9.1(g)"
              ),
              el(View, { key: "g-header", style: s.headerRow },
                el(Text, { style: { ...s.cellBold, width: "30%" } }, "Grad"),
                el(Text, { style: { ...s.cellBold, width: "15%", textAlign: "center" as const } }, "B"),
                el(Text, { style: { ...s.cellBold, width: "15%", textAlign: "center" as const } }, "F"),
                el(Text, { style: { ...s.cellBold, width: "20%", textAlign: "right" as const } }, "Gap medie"),
                el(Text, { style: { ...s.cellBold, width: "20%", textAlign: "center" as const } }, "Status"),
              ),
              ...indicators.g_by_grade.map((g, i) =>
                el(View, { key: `g${i}`, style: i % 2 === 0 ? s.row : s.rowAlt },
                  el(Text, { style: { ...s.cell, width: "30%" } }, g.grade),
                  el(Text, { style: { ...s.cellCenter, width: "15%" } },
                    g.suppressed ? "k<5" : String(g.count_male)
                  ),
                  el(Text, { style: { ...s.cellCenter, width: "15%" } },
                    g.suppressed ? "k<5" : String(g.count_female)
                  ),
                  el(Text, { style: { ...s.cellRight, width: "20%" } }, pct(g.mean_base_gap)),
                  el(Text, {
                    style: {
                      ...s.badge,
                      width: "20%",
                      textAlign: "center" as const,
                      ...(g.suppressed
                        ? s.badgeAmber
                        : Math.abs(g.mean_base_gap ?? 0) > 5
                        ? s.badgeRed
                        : s.badgeGreen),
                    },
                  }, g.suppressed ? "Suprimat" : Math.abs(g.mean_base_gap ?? 0) > 5 ? "> 5%" : "OK"),
                )
              ),
            ]
          : []),

        el(Text, { style: s.legalNote },
          "Nota: Valorile N/A indica grupuri cu mai putin de 5 membri (k-anonimitate). " +
          "Decalajele > 5% impun evaluare comuna conform Art. 10."
        ),

        el(View, { style: s.footer, fixed: true },
          el(Text, {}, `JobGrade — Raport Conformitate ${report.reportYear}`),
          el(Text, {
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber}/${totalPages}`,
          }),
        ),
      )
    )

    // ════════════════════════════════════════════════════════
    // PAGINA 2: CLASE SALARIALE
    // ════════════════════════════════════════════════════════

    if (salaryGrades.length > 0) {
      pages.push(
        el(Page, { key: "grades", size: "A4", style: s.page },
          el(View, { style: s.header },
            el(Text, { style: s.title }, "Sectiunea 2: Clase Salariale"),
            el(Text, { style: s.subtitle }, "Structura de trepte salariale aplicata"),
          ),

          el(Text, { style: s.paragraph },
            `Organizatia are definite ${salaryGrades.length} clase salariale. ` +
            `Fiecare clasa are un interval minim-maxim si un punct mediu de referinta.`
          ),

          el(View, { style: s.headerRow },
            el(Text, { style: { ...s.cellBold, width: "10%" } }, "#"),
            el(Text, { style: { ...s.cellBold, width: "40%" } }, "Clasa"),
            el(Text, { style: { ...s.cellBold, width: "25%", textAlign: "right" as const } }, "Minim"),
            el(Text, { style: { ...s.cellBold, width: "25%", textAlign: "right" as const } }, "Maxim"),
          ),

          ...salaryGrades.map((g, i) =>
            el(View, { key: `sg${i}`, style: i % 2 === 0 ? s.row : s.rowAlt },
              el(Text, { style: { ...s.cellCenter, width: "10%" } }, String(g.order)),
              el(Text, { style: { ...s.cellBold, width: "40%" } }, g.name),
              el(Text, { style: { ...s.cellRight, width: "25%" } },
                g.salaryMin ? `${Number(g.salaryMin).toFixed(0)} RON` : "—"
              ),
              el(Text, { style: { ...s.cellRight, width: "25%" } },
                g.salaryMax ? `${Number(g.salaryMax).toFixed(0)} RON` : "—"
              ),
            )
          ),

          el(View, { style: s.footer, fixed: true },
            el(Text, {}, `JobGrade — Raport Conformitate ${report.reportYear}`),
            el(Text, {
              render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `${pageNumber}/${totalPages}`,
            }),
          ),
        )
      )
    }

    // ════════════════════════════════════════════════════════
    // PAGINA 3: JUSTIFICARI DIFERENTE
    // ════════════════════════════════════════════════════════

    if (justifications.length > 0) {
      pages.push(
        el(Page, { key: "justifications", size: "A4", style: s.page },
          el(View, { style: s.header },
            el(Text, { style: s.title }, "Sectiunea 3: Justificari Diferente Salariale"),
            el(Text, { style: s.subtitle },
              "Criterii obiective documentate conform Art. 4 si Art. 9"
            ),
          ),

          el(Text, { style: s.paragraph },
            `Au fost documentate ${justifications.length} justificari ` +
            `pentru diferentele salariale identificate.`
          ),

          ...justifications.slice(0, 30).map((j, i) => {
            const category = String(j.category ?? j.groupLabel ?? "—")
            const justText = String(j.justification ?? "")
            const criteria = Array.isArray(j.criteria) ? j.criteria.join(", ") : String(j.criteria ?? "")
            const updatedAt = j.updatedAt ? String(j.updatedAt) : j.createdAt ? String(j.createdAt) : null
            const authorName = String(j.authorName ?? j.createdBy ?? "—")

            return el(View, {
              key: `just${i}`,
              style: {
                marginBottom: 8,
                paddingLeft: 8,
                borderLeftWidth: 2,
                borderLeftColor: "#6366F1",
              },
            },
              el(View, { style: { flexDirection: "row" as const, justifyContent: "space-between" as const } },
                el(Text, { style: s.cellBold }, category),
                el(Text, { style: s.meta }, authorName),
              ),
              el(Text, { style: { ...s.cell, marginTop: 2 } },
                justText.substring(0, 250)
              ),
              criteria && el(Text, { style: s.meta },
                `Criterii obiective: ${criteria}`
              ),
              updatedAt && el(Text, { style: s.meta }, `Documentat: ${fmt(updatedAt)}`),
            )
          }),

          el(View, { style: s.footer, fixed: true },
            el(Text, {}, `JobGrade — Raport Conformitate ${report.reportYear}`),
            el(Text, {
              render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `${pageNumber}/${totalPages}`,
            }),
          ),
        )
      )
    }

    // ════════════════════════════════════════════════════════
    // PAGINA 4: EVALUARI COMUNE Art. 10
    // ════════════════════════════════════════════════════════

    if (assessments.length > 0) {
      const assessmentElements: React.ReactElement[] = []

      for (const a of assessments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plan = (a.actionPlan as any) ?? {}
        const participants = plan.participanti ?? plan.participants ?? []
        const jurnal = plan.jurnal ?? []
        const votes = plan.votes ?? []
        const sigs = plan.signatures ?? []

        assessmentElements.push(
          el(View, {
            key: a.id,
            style: {
              marginBottom: 14,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            },
          },
            // Status + trigger
            el(View, { style: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 4 } },
              el(Text, {
                style: {
                  ...s.badge,
                  ...(a.status === "RESOLVED" ? s.badgeGreen :
                      a.status === "CLOSED" ? s.badgeAmber : s.badgeRed),
                },
              }, a.status),
              el(Text, { style: s.meta },
                `Declansat: ${fmt(a.triggeredAt)}` +
                (a.dueDate ? ` | Termen: ${fmt(a.dueDate)}` : "") +
                (a.resolvedAt ? ` | Rezolvat: ${fmt(a.resolvedAt)}` : "")
              ),
            ),

            el(Text, { style: { ...s.cell, marginBottom: 4 } },
              a.triggerReason.substring(0, 200)
            ),

            // Root cause
            a.rootCause && el(View, { style: { marginBottom: 4 } },
              el(Text, { style: s.cellBold }, "Cauza radacina:"),
              el(Text, { style: s.cell }, a.rootCause.substring(0, 300)),
            ),

            // Participanti
            participants.length > 0 && el(View, { style: { marginBottom: 4 } },
              el(Text, { style: s.cellBold }, `Echipa evaluare (${participants.length} membri):`),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...participants.map((p: any, i: number) =>
                el(Text, { key: `p${i}`, style: s.cell },
                  `  ${p.name ?? p.email} — ${p.role}`
                )
              ),
            ),

            // Voturi sumar
            votes.length > 0 && el(Text, { style: s.cell },
              `Voturi inregistrate: ${votes.length}`
            ),

            // Semnaturi
            sigs.length > 0 && el(Text, { style: s.cell },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              `Semnaturi: ${sigs.map((sg: any) => `${sg.memberName} (V${sg.version})`).join(", ")}`
            ),

            // Jurnal sumar
            jurnal.length > 0 && el(Text, { style: s.meta },
              `Jurnal: ${jurnal.length} intrari | ` +
              `Prima: ${fmtFull(jurnal[0].timestamp)} | ` +
              `Ultima: ${fmtFull(jurnal[jurnal.length - 1].timestamp)}`
            ),
          )
        )
      }

      pages.push(
        el(Page, { key: "assessments", size: "A4", style: s.page },
          el(View, { style: s.header },
            el(Text, { style: s.title }, "Sectiunea 4: Evaluari Comune — Art. 10"),
            el(Text, { style: s.subtitle },
              "Procese de remediere pentru decalaje > 5%"
            ),
          ),

          el(Text, { style: s.paragraph },
            `Au fost identificate ${assessments.length} evaluari comune. ` +
            `Conform Art. 10 alin. 3, fiecare evaluare trebuie finalizata ` +
            `in maximum 6 luni (90 zile lucratoare) de la declansare.`
          ),

          // Sumar status
          el(View, { style: { flexDirection: "row" as const, gap: 10, marginBottom: 12 } },
            el(View, { style: s.successBox },
              el(Text, { style: s.successText },
                `Rezolvate: ${assessments.filter((a) => a.status === "RESOLVED").length}`
              ),
            ),
            el(View, { style: s.alertBox },
              el(Text, { style: s.alertText },
                `Deschise: ${assessments.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS").length}`
              ),
            ),
            el(View, { style: s.infoBox },
              el(Text, { style: s.infoText },
                `Inchise: ${assessments.filter((a) => a.status === "CLOSED").length}`
              ),
            ),
          ),

          ...assessmentElements,

          el(View, { style: s.footer, fixed: true },
            el(Text, {}, `JobGrade — Raport Conformitate ${report.reportYear}`),
            el(Text, {
              render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `${pageNumber}/${totalPages}`,
            }),
          ),
        )
      )
    }

    // ════════════════════════════════════════════════════════
    // PAGINA FINALA: SEMNATURI + DECLARATIE
    // ════════════════════════════════════════════════════════

    pages.push(
      el(Page, { key: "signatures", size: "A4", style: s.page },
        el(View, { style: s.header },
          el(Text, { style: s.title }, "Declaratie si Semnaturi"),
          el(Text, { style: s.subtitle }, "Responsabilitate legala"),
        ),

        el(Text, { style: { ...s.paragraph, marginTop: 16 } },
          "Subsemnatii declaram ca informatiile continute in prezentul raport " +
          "sunt complete, corecte si reflecta situatia reala a structurii salariale " +
          "din cadrul organizatiei, in conformitate cu prevederile Directivei (UE) 2023/970 " +
          "privind transparenta salariala."
        ),

        el(Text, { style: { ...s.paragraph } },
          "Raportul a fost generat automat pe baza datelor salariale inregistrate in " +
          "platforma JobGrade si verificat de persoanele autorizate enumerate mai jos."
        ),

        // Spatii semnatura
        el(View, { style: { ...s.signatureBlock, marginTop: 40 } },
          el(View, { style: s.signatureSlot },
            el(Text, { style: s.signatureLabel }, "Administrator cont"),
            el(Text, { style: { ...s.signatureName, marginTop: 4 } }, session.user.name ?? ""),
            el(Text, { style: s.meta }, `Data: ${generatedAt}`),
          ),
          el(View, { style: s.signatureSlot },
            el(Text, { style: s.signatureLabel }, "Reprezentant HR"),
            el(Text, { style: { ...s.signatureName, marginTop: 4 } }, "___________________"),
            el(Text, { style: s.meta }, "Data: ___/___/______"),
          ),
        ),

        el(View, { style: { ...s.signatureBlock, marginTop: 30 } },
          el(View, { style: s.signatureSlot },
            el(Text, { style: s.signatureLabel }, "Reprezentant management"),
            el(Text, { style: { ...s.signatureName, marginTop: 4 } }, "___________________"),
            el(Text, { style: s.meta }, "Data: ___/___/______"),
          ),
          el(View, { style: s.signatureSlot },
            el(Text, { style: s.signatureLabel }, "Reprezentant salariati"),
            el(Text, { style: { ...s.signatureName, marginTop: 4 } }, "___________________"),
            el(Text, { style: s.meta }, "Data: ___/___/______"),
          ),
        ),

        el(Text, { style: { ...s.legalNote, marginTop: 40 } },
          "Acest document constituie proba legala in sensul Art. 9 si Art. 10 " +
          "din Directiva (UE) 2023/970. Pastrarea lui in format electronic este " +
          "obligatorie pe o durata de minimum 5 ani de la generare. " +
          "Orice modificare ulterioara invalideaza documentul si necesita regenerare."
        ),

        el(Text, { style: { ...s.meta, marginTop: 12, textAlign: "center" as const } },
          `Document generat automat de platforma JobGrade | ${generatedAt} | ID: ${report.id}`
        ),

        el(View, { style: s.footer, fixed: true },
          el(Text, {}, `JobGrade — Raport Conformitate ${report.reportYear}`),
          el(Text, {
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber}/${totalPages}`,
          }),
        ),
      )
    )

    // ── Render PDF ──────────────────────────────────────────

    const doc = el(Document, {}, ...pages)
    const buffer = await renderToBuffer(doc as any)

    const filename = `raport-conformitate-${tenant.name.replace(/[^a-zA-Z0-9]/g, "-")}-${report.reportYear}.pdf`

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[COMPLIANCE REPORT PDF]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
