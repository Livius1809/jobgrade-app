/**
 * Company Profiler — Jurnal client complet
 *
 * Nu doar credite — tot: ce a făcut, ce a plătit, ce a refuzat,
 * ce a amânat, ce a validat. Narativ, nu tabel.
 *
 * Arată traiectoria clientului — "a început cu 3 posturi,
 * a generat fișe, a evaluat, dar nu a validat MVV-ul încă".
 *
 * Alimentează SOA și HR_COUNSELOR — știu unde e clientul
 * fără să-l întrebe.
 */

import { prisma } from "@/lib/prisma"
import type { ClientJournal, ClientJournalEntry, ServiceType } from "./types"

/**
 * Construiește jurnalul complet al clientului
 */
export async function buildClientJournal(
  tenantId: string,
  limitDays = 90,
): Promise<ClientJournal> {
  const since = new Date()
  since.setDate(since.getDate() - limitDays)

  // Colectăm din toate sursele în paralel
  const [credits, sessions, jobs, mvvData, profile] = await Promise.all([
    // Tranzacții credite
    prisma.creditTransaction.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { type: true, amount: true, description: true, createdAt: true },
    }).catch(() => []),

    // Sesiuni evaluare
    prisma.evaluationSession.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { name: true, status: true, createdAt: true, completedAt: true },
    }).catch(() => []),

    // Posturi adăugate
    prisma.job.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { title: true, status: true, createdAt: true, purpose: true },
    }).catch(() => []),

    // Stare MVV
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        mvvMaturity: true, mvvValidatedAt: true, mvvLastBuiltAt: true,
        mission: true, vision: true, values: true,
      },
    }).catch(() => null),

    // Sold credite
    prisma.creditBalance?.findUnique({
      where: { tenantId },
      select: { balance: true },
    }).catch(() => null),
  ])

  const entries: ClientJournalEntry[] = []

  // Posturi adăugate
  for (const job of jobs as any[]) {
    const hasFisa = !!job.purpose
    entries.push({
      date: job.createdAt,
      category: "ACȚIUNE",
      action: `Post adăugat: ${job.title}`,
      detail: hasFisa ? "Cu fișă de post completă" : "Fără fișă de post — de completat",
      credits: 0,
      service: hasFisa ? "JOB_DESCRIPTION_AI" : null,
    })
  }

  // Sesiuni evaluare
  for (const session of sessions as any[]) {
    if (session.status === "COMPLETED" && session.completedAt) {
      entries.push({
        date: session.completedAt,
        category: "SERVICIU",
        action: `Evaluare finalizată: ${session.name}`,
        detail: "Sesiune de evaluare completă — grade calculate",
        credits: 0, // creditele sunt pe tranzacții separate
        service: "JOB_EVALUATION",
      })
    } else {
      entries.push({
        date: session.createdAt,
        category: "ACȚIUNE",
        action: `Evaluare creată: ${session.name}`,
        detail: `Status: ${session.status}`,
        credits: 0,
        service: "JOB_EVALUATION",
      })
    }
  }

  // Tranzacții credite
  for (const tx of credits as any[]) {
    entries.push({
      date: tx.createdAt,
      category: "CREDIT",
      action: tx.type === "PURCHASE" ? "Achiziție credite" : tx.type === "USAGE" ? "Consum credite" : tx.description,
      detail: tx.description,
      credits: Math.abs(tx.amount),
      service: inferServiceFromDescription(tx.description),
    })
  }

  // MVV
  if (mvvData) {
    if ((mvvData as any).mvvValidatedAt) {
      entries.push({
        date: (mvvData as any).mvvValidatedAt,
        category: "MVV",
        action: "MVV validat de client",
        detail: `Misiune, viziune și ${((mvvData as any).values || []).length} valori confirmate`,
        credits: 0,
        service: null,
      })
    }
    if ((mvvData as any).mvvLastBuiltAt && !(mvvData as any).mvvValidatedAt) {
      entries.push({
        date: (mvvData as any).mvvLastBuiltAt,
        category: "MVV",
        action: "MVV generat automat (draft)",
        detail: "AI a construit un draft MVV din datele disponibile — în așteptare validare client",
        credits: 0,
        service: null,
      })
    }
  }

  // Sortare cronologică (cele mai recente primele)
  entries.sort((a, b) => b.date.getTime() - a.date.getTime())

  // Calcul total credite
  const totalCreditsUsed = (credits as any[])
    .filter((tx: any) => tx.type === "USAGE")
    .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)

  const creditBalance = (profile as any)?.balance ?? 0

  // Narativ traiectorie
  const trajectory = buildTrajectoryNarrative(entries, jobs.length, sessions.length, mvvData)

  return {
    entries,
    trajectory,
    creditBalance,
    totalCreditsUsed,
    period: {
      from: since,
      to: new Date(),
    },
  }
}

function inferServiceFromDescription(desc: string): ServiceType | null {
  if (!desc) return null
  const lower = desc.toLowerCase()
  if (lower.includes("evaluare") || lower.includes("sesiune")) return "JOB_EVALUATION"
  if (lower.includes("fișă") || lower.includes("job_desc")) return "JOB_DESCRIPTION_AI"
  if (lower.includes("pay_gap") || lower.includes("gap")) return "PAY_GAP_ANALYSIS"
  if (lower.includes("benchmark")) return "SALARY_BENCHMARK"
  if (lower.includes("mvv")) return null
  if (lower.includes("export")) return "JOB_EVALUATION"
  return null
}

function buildTrajectoryNarrative(
  entries: ClientJournalEntry[],
  jobCount: number,
  sessionCount: number,
  mvvData: any,
): string {
  const parts: string[] = []

  if (jobCount > 0) {
    parts.push(`a adăugat ${jobCount} ${jobCount === 1 ? "post" : "posturi"}`)
  }

  if (sessionCount > 0) {
    const completed = entries.filter(e => e.category === "SERVICIU" && e.action.includes("finalizată")).length
    if (completed > 0) {
      parts.push(`a finalizat ${completed} ${completed === 1 ? "evaluare" : "evaluări"}`)
    } else {
      parts.push(`a inițiat ${sessionCount} ${sessionCount === 1 ? "sesiune" : "sesiuni"} de evaluare`)
    }
  }

  if (mvvData?.mvvValidatedAt) {
    parts.push("a validat MVV-ul organizației")
  } else if (mvvData?.mvvLastBuiltAt) {
    parts.push("are un draft MVV generat automat, dar nu l-a validat încă")
  }

  if (parts.length === 0) {
    return "Clientul a creat contul dar nu a început încă să adauge date. E în faza de explorare."
  }

  return `Clientul ${parts.join(", ")}.`
}
