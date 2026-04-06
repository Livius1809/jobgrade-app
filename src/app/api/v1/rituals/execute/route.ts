import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/rituals/execute?code=...&businessId=...
 *
 * Execută un ritual: coagulează datele relevante și le trimite la outputTarget.
 * Increment #8 — închide bucla sensing → sense-making → notification.
 *
 * Pentru ritualul `strategic-weekly-review`:
 *  1. Citește /strategic-themes (COSO output)
 *  2. Citește /disfunctions/situations (aggregator)
 *  3. Citește /wild-card-explorer (conexiuni neașteptate)
 *  4. Citește /outcomes (starea metricilor)
 *  5. Compune raport text
 *  6. Trimite la ntfy
 *
 * Poate fi apelat de n8n cron sau manual.
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

async function fetchInternal(path: string, apiKey: string): Promise<unknown> {
  const base = `http://localhost:${process.env.PORT ?? 3001}`
  const res = await fetch(`${base}${path}`, {
    headers: { "x-internal-key": apiKey },
  })
  if (!res.ok) return { error: `${res.status} ${res.statusText}` }
  return res.json()
}

function formatStrategicReport(data: {
  themes: unknown
  situations: unknown
  wildCards: unknown
  outcomes: unknown
  ritual: { name: string; code: string }
}): string {
  const lines: string[] = []
  const now = new Date().toLocaleDateString("ro-RO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Europe/Bucharest",
  })

  lines.push(`📋 ${data.ritual.name}`)
  lines.push(`📅 ${now}`)
  lines.push("")

  // Strategic Themes
  const th = data.themes as { themes?: Array<{ title: string; confidence: string; severity: string }> }
  if (th?.themes?.length) {
    lines.push(`🔭 TEME STRATEGICE (${th.themes.length})`)
    for (const t of th.themes.slice(0, 5)) {
      lines.push(`  • [${t.confidence}/${t.severity}] ${t.title}`)
    }
    lines.push("")
  } else {
    lines.push("🔭 Fără teme strategice noi.")
    lines.push("")
  }

  // Situations
  const sit = data.situations as {
    summary?: { total: number; decisionRequired: number; autoRemediating: number; knownGap: number }
    situations?: Array<{ classification: string; severity: string; title: string }>
  }
  if (sit?.summary) {
    lines.push(`⚡ SITUAȚII (${sit.summary.total})`)
    lines.push(`  Decizie necesară: ${sit.summary.decisionRequired} | Auto-remediere: ${sit.summary.autoRemediating} | Gap cunoscut: ${sit.summary.knownGap}`)
    const dr = sit.situations?.filter(s => s.classification === "DECISION_REQUIRED") ?? []
    for (const s of dr.slice(0, 3)) {
      lines.push(`  ⚠️ [${s.severity}] ${s.title}`)
    }
    lines.push("")
  }

  // Outcomes
  const oc = data.outcomes as {
    outcomes?: Array<{ serviceCode: string; currentValue: number | null; targetValue: number; metricUnit: string }>
    withCurrentValue?: number; onTarget?: number
  }
  if (oc?.withCurrentValue) {
    lines.push(`📊 OUTCOMES (${oc.withCurrentValue} măsurate, ${oc.onTarget} on target)`)
    const measured = oc.outcomes?.filter(o => o.currentValue !== null) ?? []
    for (const o of measured) {
      const status = (o.currentValue ?? 0) >= o.targetValue ? "✅" : "⚠️"
      lines.push(`  ${status} ${o.serviceCode}: ${o.currentValue}/${o.targetValue} ${o.metricUnit}`)
    }
    lines.push("")
  }

  // Wild Cards
  const wc = data.wildCards as {
    summary?: { total: number; topQuestion: string | null }
    wildCards?: Array<{ pair: string[]; question: string; surpriseScore: number }>
  }
  if (wc?.wildCards?.length) {
    lines.push(`🎲 WILD CARDS (${wc.summary?.total ?? wc.wildCards.length})`)
    for (const w of wc.wildCards.slice(0, 3)) {
      lines.push(`  💡 ${w.pair.join(" ↔ ")} (s:${w.surpriseScore})`)
      lines.push(`     ${w.question}`)
    }
    lines.push("")
  }

  lines.push("—")
  lines.push("Generat automat de organism viu. Verifică cockpit pentru detalii.")

  return lines.join("\n")
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const businessId = url.searchParams.get("businessId")
  const dryRun = url.searchParams.get("dryRun") === "true"

  if (!code || !businessId) {
    return NextResponse.json({ error: "missing code or businessId" }, { status: 400 })
  }

  const ritual = await prisma.ritual.findUnique({
    where: { businessId_code: { businessId, code } },
  })
  if (!ritual) {
    return NextResponse.json({ error: "ritual_not_found" }, { status: 404 })
  }
  if (!ritual.isActive) {
    return NextResponse.json({ error: "ritual_inactive" }, { status: 409 })
  }

  const apiKey = process.env.INTERNAL_API_KEY!

  // Colectare date paralel
  const [themes, situations, wildCards, outcomes] = await Promise.all([
    fetchInternal("/api/v1/strategic-themes?windowHours=168", apiKey),
    fetchInternal("/api/v1/disfunctions/situations", apiKey),
    fetchInternal("/api/v1/wild-card-explorer?windowDays=7&maxResults=3&seed=" + Date.now(), apiKey),
    fetchInternal(`/api/v1/outcomes?businessId=${businessId}&includeMeasurements=false`, apiKey),
  ])

  const report = formatStrategicReport({
    themes, situations, wildCards, outcomes,
    ritual: { name: ritual.name, code: ritual.code },
  })

  let sent = false
  if (!dryRun && ritual.outputTarget === "ntfy") {
    const ntfyTopic = process.env.NTFY_TOPIC ?? "jobgrade-owner-liviu-2026"
    const ntfyBase = process.env.NTFY_URL ?? "https://ntfy.sh"
    try {
      const res = await fetch(`${ntfyBase}/${ntfyTopic}`, {
        method: "POST",
        headers: {
          "Title": `${ritual.name} - ${new Date().toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" })}`,
          "Priority": "3",
          "Tags": "clipboard,chart_with_upwards_trend",
        },
        body: report,
      })
      sent = res.ok
    } catch {
      // ntfy down — raportăm dar nu blocăm
      sent = false
    }
  }

  // Mark as run
  await prisma.ritual.update({
    where: { id: ritual.id },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: sent || dryRun ? "success" : "ntfy_failed",
      runCount: { increment: 1 },
    },
  })

  return NextResponse.json({
    executedAt: new Date().toISOString(),
    ritual: { code: ritual.code, name: ritual.name },
    dryRun,
    sent,
    reportLength: report.length,
    report: dryRun ? report : undefined,
  })
}
