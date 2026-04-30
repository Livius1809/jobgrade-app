/**
 * /api/v1/compliance/contract-audit
 *
 * Audit conformitate contracte munca (C2) — verifica coerenta intre:
 *   - CIM (contract individual de munca)
 *   - Fisa postului (descriere + responsabilitati)
 *   - Gradul salarial (din evaluare JobGrade)
 *   - Grila salariala (salaryMin-salaryMax per grad)
 *   - Cod COR (nomenclator)
 *
 * POST — Audit complet pe baza jobId
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCORByCode, suggestCOR, type COREntry } from "@/lib/cor/nomenclator"

export const dynamic = "force-dynamic"

// Niveluri de severitate pentru problemele gasite
type IssueSeverity = "INFO" | "WARNING" | "CRITICAL"

interface AuditIssue {
  field: string
  expected: string
  actual: string
  severity: IssueSeverity
  recommendation: string
}

// POST — Audit conformitate contract munca
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { jobId } = body

  if (!jobId) {
    return NextResponse.json({ error: "jobId obligatoriu" }, { status: 400 })
  }

  // Incarcam job-ul cu toate relatiile necesare
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      tenantId: session.user.tenantId,
    },
    include: {
      department: true,
      jobResults: {
        include: {
          salaryGrade: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1, // cel mai recent rezultat
      },
    },
  })

  if (!job) {
    return NextResponse.json({ error: "Job negasit sau nu apartine tenant-ului" }, { status: 404 })
  }

  const issues: AuditIssue[] = []

  // ──────────────────────────────────────────
  // Verificare 1: Job are descriere (purpose + responsibilities)
  // ──────────────────────────────────────────
  if (!job.purpose || job.purpose.trim().length < 10) {
    issues.push({
      field: "purpose",
      expected: "Descrierea scopului postului (minim 10 caractere)",
      actual: job.purpose ? `"${job.purpose.slice(0, 50)}"` : "(lipsa)",
      severity: "CRITICAL",
      recommendation: "Completati scopul postului in fisa de post. Conform Codului Muncii Art.17 alin.3, angajatorul trebuie sa informeze salariatul asupra descrierii muncii.",
    })
  }

  if (!job.responsibilities || job.responsibilities.trim().length < 10) {
    issues.push({
      field: "responsibilities",
      expected: "Lista responsabilitatilor postului (minim 10 caractere)",
      actual: job.responsibilities ? `"${job.responsibilities.slice(0, 50)}"` : "(lipsa)",
      severity: "CRITICAL",
      recommendation: "Completati responsabilitatile postului. Fisa postului trebuie sa contina atributiile concrete ale salariatului.",
    })
  }

  // ──────────────────────────────────────────
  // Verificare 2: Job-ul a fost evaluat (are JobResult)
  // ──────────────────────────────────────────
  const latestResult = job.jobResults[0] || null

  if (!latestResult) {
    issues.push({
      field: "evaluare",
      expected: "Job-ul sa fi trecut printr-o sesiune de evaluare/ierarhizare",
      actual: "(neevaluat — nu exista JobResult)",
      severity: "WARNING",
      recommendation: "Includeti postul intr-o sesiune de evaluare pentru a-i stabili gradul salarial. Fara evaluare, nu se poate verifica coerenta cu grila salariala.",
    })
  }

  // ──────────────────────────────────────────
  // Verificare 3: Salariul se incadreaza in grila gradului
  // ──────────────────────────────────────────
  if (latestResult?.salaryGrade) {
    const grade = latestResult.salaryGrade

    // Cautam angajati cu acest job (prin potrivire department + jobCategory)
    const salaryRecords = await prisma.employeeSalaryRecord.findMany({
      where: {
        tenantId: session.user.tenantId,
        salaryGradeId: grade.id,
      },
    })

    if (salaryRecords.length > 0 && grade.salaryMin != null && grade.salaryMax != null) {
      // Verificam daca salariile angajatilor se incadreaza in grilă
      for (const record of salaryRecords) {
        if (record.baseSalary < grade.salaryMin) {
          issues.push({
            field: "salariu_sub_minim",
            expected: `Salariu >= ${grade.salaryMin} RON (minim grad "${grade.name}")`,
            actual: `${record.baseSalary} RON (angajat ${record.employeeCode})`,
            severity: "CRITICAL",
            recommendation: `Salariul angajatului ${record.employeeCode} este sub minimul grilei pentru gradul "${grade.name}". Ajustati salariul sau reclasificati postul.`,
          })
        }

        if (record.baseSalary > grade.salaryMax) {
          issues.push({
            field: "salariu_peste_maxim",
            expected: `Salariu <= ${grade.salaryMax} RON (maxim grad "${grade.name}")`,
            actual: `${record.baseSalary} RON (angajat ${record.employeeCode})`,
            severity: "WARNING",
            recommendation: `Salariul angajatului ${record.employeeCode} depaseste maximul grilei pentru gradul "${grade.name}". Evaluati daca postul necesita reclasificare sau daca grila trebuie actualizata.`,
          })
        }
      }
    } else if (grade.salaryMin == null || grade.salaryMax == null) {
      issues.push({
        field: "grila_salariala",
        expected: "Grad salarial cu salaryMin si salaryMax definite",
        actual: `Grad "${grade.name}" — salaryMin: ${grade.salaryMin ?? "(nedefinit)"}, salaryMax: ${grade.salaryMax ?? "(nedefinit)"}`,
        severity: "INFO",
        recommendation: "Completati limitele grilei salariale (salaryMin/salaryMax) pentru gradul asignat, pentru a putea verifica automat conformitatea salariilor.",
      })
    }
  }

  // ──────────────────────────────────────────
  // Verificare 4: Titlul job-ului corespunde codului COR
  // ──────────────────────────────────────────
  if (job.code) {
    // Verificam daca codul asociat job-ului este un cod COR valid
    const corEntry = getCORByCode(job.code)

    if (corEntry) {
      // Cod COR valid — verificam potrivirea cu titlul
      const corTitle = corEntry.name

      // Verificare simpla: titlul job-ului ar trebui sa fie similar cu denumirea COR
      const jobTitleNorm = job.title.toLowerCase().trim()
      const corTitleNorm = corTitle.toLowerCase().trim()

      if (!corTitleNorm.includes(jobTitleNorm) && !jobTitleNorm.includes(corTitleNorm)) {
        issues.push({
          field: "cor_code_match",
          expected: `Titlu COR: "${corTitle}" (cod ${job.code})`,
          actual: `Titlu job: "${job.title}"`,
          severity: "INFO",
          recommendation: `Titlul postului "${job.title}" nu corespunde exact cu denumirea COR "${corTitle}" (cod ${job.code}). Verificati daca codul COR este corect sau actualizati titlul conform nomenclatorului.`,
        })
      }
    } else {
      // Codul nu e un cod COR valid — sugerare
      const suggestions = suggestCOR(job.title)
      const suggestionText = suggestions.length > 0
        ? `Sugestii: ${suggestions.slice(0, 3).map((s: COREntry) => `${s.code} - ${s.name}`).join("; ")}`
        : "Nu s-au gasit sugestii automate."

      issues.push({
        field: "cor_code",
        expected: "Cod COR valid din nomenclatorul Clasificarii Ocupatiilor din Romania",
        actual: `Cod "${job.code}" — nu este un cod COR valid`,
        severity: "WARNING",
        recommendation: `Codul "${job.code}" nu a fost gasit in nomenclatorul COR. ${suggestionText}`,
      })
    }
  } else {
    // Nu are cod deloc — sugerare pe baza titlului
    const suggestions = suggestCOR(job.title)
    const suggestionText = suggestions.length > 0
      ? `Sugestii automate: ${suggestions.slice(0, 3).map((s: COREntry) => `${s.code} - ${s.name}`).join("; ")}`
      : "Cautati manual in nomenclatorul COR."

    issues.push({
      field: "cor_code",
      expected: "Postul sa aiba un cod COR asociat",
      actual: "(lipsa cod COR)",
      severity: "WARNING",
      recommendation: `Asociati un cod COR postului "${job.title}". ${suggestionText}`,
    })
  }

  // ──────────────────────────────────────────
  // Rezultat final
  // ──────────────────────────────────────────
  const coherent = issues.length === 0 || issues.every(i => i.severity === "INFO")

  return NextResponse.json({
    coherent,
    jobId: job.id,
    jobTitle: job.title,
    department: job.department?.name || null,
    evaluationGrade: latestResult?.salaryGrade?.name || null,
    totalScore: latestResult?.totalScore || null,
    issues,
    stats: {
      total: issues.length,
      critical: issues.filter(i => i.severity === "CRITICAL").length,
      warning: issues.filter(i => i.severity === "WARNING").length,
      info: issues.filter(i => i.severity === "INFO").length,
    },
    auditedAt: new Date().toISOString(),
  })
}
