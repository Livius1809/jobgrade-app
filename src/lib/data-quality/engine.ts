/**
 * DATA QUALITY ENGINE — Detecție inconsistențe post-import
 *
 * "Începem cu CINE alegi să FII... Evoluăm împreună!"
 *
 * Principiu: nu respingem datele clientului. Le primim, analizăm,
 * și ghidăm spre corectare — fără judecată, cu onestitate.
 *
 * Rulează automat după import fișe post + stat funcții.
 * Produce DataQualityReport cu probleme clasificate + întrebări de clarificare.
 */

import { prisma } from "@/lib/prisma"
import { getTenantData } from "@/lib/tenant-storage"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type IssueSeverity = "BLOCKER" | "IMPORTANT" | "QUESTION" | "INFO"
export type IssueCategory =
  | "TERMINOLOGY"        // Terminologie inconsistentă
  | "DUPLICATE"          // Duplicate potențiale
  | "MISSING_CRITICAL"   // Lipsuri care blochează C1
  | "MISSING_OPTIONAL"   // Lipsuri non-blocante (C2/C3)
  | "STRUCTURE"          // Neclarități structurale
  | "CROSS_CHECK"        // Inconsistență între surse (stat funcții vs fișe)
  | "FORMAT"             // Probleme de format/formalizare

export interface DataQualityIssue {
  id: string
  category: IssueCategory
  severity: IssueSeverity
  /** Descriere accesibilă (ce am observat) */
  description: string
  /** Detalii (unde anume, ce date) */
  details: string
  /** Întrebarea de clarificare pentru client */
  clarificationQuestion?: string
  /** Opțiuni de răspuns (dacă e întrebare cu variante) */
  options?: string[]
  /** Acțiune automată dacă clientul confirmă */
  autoFixAction?: string
  /** Posturi/fișe afectate */
  affectedItems: string[]
  /** Rezolvat? */
  resolved: boolean
  /** Răspunsul clientului (dacă a fost dat) */
  clientResponse?: string
}

export interface DataQualityReport {
  tenantId: string
  generatedAt: string
  /** Scor general 0-100 (100 = date perfecte) */
  overallScore: number
  /** Rezumat per severitate */
  summary: {
    blockers: number
    important: number
    questions: number
    info: number
    total: number
    resolved: number
  }
  /** Toate problemele detectate */
  issues: DataQualityIssue[]
  /** Mesaj ghidare general */
  guidanceMessage: string
  /** Gata pentru C1? */
  readyForEvaluation: boolean
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════

export async function runDataQualityCheck(tenantId: string): Promise<DataQualityReport> {
  // Colectăm toate datele disponibile
  const [jobs, statFunctii] = await Promise.all([
    prisma.job.findMany({
      where: { tenantId, isActive: true },
      include: { department: true },
    }),
    getTenantData(tenantId, "STAT_FUNCTII"),
  ])

  const issues: DataQualityIssue[] = []
  let issueCounter = 0
  const nextId = () => `DQ-${++issueCounter}`

  // ─── 1. TERMINOLOGIE — titluri similare dar diferite ───
  const titleGroups = detectSimilarTitles(jobs.map(j => ({ id: j.id, title: j.title, dept: j.department?.name || "" })))
  for (const group of titleGroups) {
    issues.push({
      id: nextId(),
      category: "TERMINOLOGY",
      severity: "QUESTION",
      description: `Titluri similare detectate — posibil același post cu denumiri diferite`,
      details: `"${group.titles.join('" și "')}" (${group.departments.join(", ")})`,
      clarificationQuestion: `"${group.titles[0]}" și "${group.titles[1]}" sunt posturi distincte sau e același post cu denumiri diferite?`,
      options: ["Posturi distincte (păstrăm ambele)", "Același post (unificăm)", "Nu sunt sigur (revenim mai târziu)"],
      autoFixAction: "merge_jobs",
      affectedItems: group.jobIds,
      resolved: false,
    })
  }

  // ─── 2. DUPLICATE — fișe cu overlap >80% ───
  const duplicates = detectDuplicateContent(jobs.map(j => ({
    id: j.id,
    title: j.title,
    purpose: j.purpose || "",
    responsibilities: j.responsibilities || "",
  })))
  for (const dup of duplicates) {
    issues.push({
      id: nextId(),
      category: "DUPLICATE",
      severity: "IMPORTANT",
      description: `Fișe cu conținut foarte similar (~${dup.similarity}% overlap)`,
      details: `"${dup.title1}" și "${dup.title2}" au responsabilități aproape identice`,
      clarificationQuestion: `"${dup.title1}" și "${dup.title2}" par să aibă același conținut. Sunt posturi diferite cu responsabilități distincte sau e o duplicare?`,
      options: ["Posturi diferite (lăsăm ambele)", "Duplicat (ștergem pe al doilea)", "Fuzionăm într-una singură"],
      autoFixAction: "remove_duplicate",
      affectedItems: [dup.id1, dup.id2],
      resolved: false,
    })
  }

  // ─── 3. LIPSURI CRITICE (blochează C1) ───
  const jobsWithoutPurpose = jobs.filter(j => !j.purpose || j.purpose.trim().length < 10)
  if (jobsWithoutPurpose.length > 0) {
    issues.push({
      id: nextId(),
      category: "MISSING_CRITICAL",
      severity: jobsWithoutPurpose.length > jobs.length * 0.5 ? "BLOCKER" : "IMPORTANT",
      description: `${jobsWithoutPurpose.length} fișe de post fără scop/obiectiv definit`,
      details: `Posturi afectate: ${jobsWithoutPurpose.slice(0, 5).map(j => j.title).join(", ")}${jobsWithoutPurpose.length > 5 ? ` și alte ${jobsWithoutPurpose.length - 5}` : ""}`,
      clarificationQuestion: "Puteți adăuga un scop/obiectiv scurt (1-2 propoziții) pentru aceste posturi? AI-ul poate genera propuneri pe care le validați.",
      autoFixAction: "ai_generate_purpose",
      affectedItems: jobsWithoutPurpose.map(j => j.id),
      resolved: false,
    })
  }

  const jobsWithoutResponsibilities = jobs.filter(j => !j.responsibilities || j.responsibilities.trim().length < 20)
  if (jobsWithoutResponsibilities.length > 0) {
    issues.push({
      id: nextId(),
      category: "MISSING_CRITICAL",
      severity: jobsWithoutResponsibilities.length > jobs.length * 0.3 ? "BLOCKER" : "IMPORTANT",
      description: `${jobsWithoutResponsibilities.length} fișe fără responsabilități detaliate`,
      details: `Evaluarea pe criteriul "Cunoștințe" necesită responsabilități clare. Posturi afectate: ${jobsWithoutResponsibilities.slice(0, 5).map(j => j.title).join(", ")}`,
      clarificationQuestion: "Responsabilitățile sunt esențiale pentru evaluarea corectă. Puteți completa manual sau AI-ul generează propuneri din titlu + departament.",
      autoFixAction: "ai_generate_responsibilities",
      affectedItems: jobsWithoutResponsibilities.map(j => j.id),
      resolved: false,
    })
  }

  // ─── 4. LIPSURI NON-CRITICE (C2/C3) ───
  const jobsWithoutRequirements = jobs.filter(j => !j.requirements || j.requirements.trim().length < 10)
  if (jobsWithoutRequirements.length > 0) {
    issues.push({
      id: nextId(),
      category: "MISSING_OPTIONAL",
      severity: "INFO",
      description: `${jobsWithoutRequirements.length} fișe fără cerințe (studii, experiență, competențe)`,
      details: `Non-blocant pentru C1, dar necesar pentru C3 (evaluare personal). Poate fi completat ulterior.`,
      affectedItems: jobsWithoutRequirements.map(j => j.id),
      resolved: false,
    })
  }

  // ─── 5. STRUCTURĂ — departamente fără consistență ───
  const departments = [...new Set(jobs.map(j => j.department?.name).filter(Boolean))] as string[]
  const jobsWithoutDept = jobs.filter(j => !j.department)
  if (jobsWithoutDept.length > 0) {
    issues.push({
      id: nextId(),
      category: "STRUCTURE",
      severity: "IMPORTANT",
      description: `${jobsWithoutDept.length} posturi fără departament atribuit`,
      details: `Posturi: ${jobsWithoutDept.slice(0, 5).map(j => j.title).join(", ")}. Departamente existente: ${departments.join(", ")}`,
      clarificationQuestion: `Căror departamente aparțin aceste posturi?`,
      affectedItems: jobsWithoutDept.map(j => j.id),
      resolved: false,
    })
  }

  // Departamente cu un singur post (posibil greșeală de scriere)
  const smallDepts = departments.filter(d => jobs.filter(j => j.department?.name === d).length === 1)
  if (smallDepts.length > 0 && departments.length > 3) {
    issues.push({
      id: nextId(),
      category: "STRUCTURE",
      severity: "QUESTION",
      description: `${smallDepts.length} departamente cu un singur post — posibilă eroare de denumire`,
      details: `Departamente: ${smallDepts.join(", ")}. Dacă sunt corecte, nu e o problemă. Dacă sunt variante de scriere ale altor departamente, corectăm.`,
      clarificationQuestion: `Departamentele cu un singur post sunt corecte sau sunt variante de scriere?`,
      options: smallDepts.map(d => `"${d}" — corect / e de fapt "${findSimilarDept(d, departments)}"`) ,
      affectedItems: smallDepts,
      resolved: false,
    })
  }

  // ─── 6. CROSS-CHECK — stat funcții vs fișe importate ───
  const statRows = (statFunctii as any)?.rows
  if (statRows) {
    const statTitles = new Set(statRows.map((r: any) => r.title.toLowerCase().trim()))
    const jobTitles = new Set(jobs.map(j => j.title.toLowerCase().trim()))

    // Posturi din stat fără fișă
    const inStatNotInJobs = statRows.filter((r: any) => !jobTitles.has(r.title.toLowerCase().trim()))
    if (inStatNotInJobs.length > 0) {
      issues.push({
        id: nextId(),
        category: "CROSS_CHECK",
        severity: "IMPORTANT",
        description: `${inStatNotInJobs.length} posturi din statul de funcții fără fișă de post corespunzătoare`,
        details: `Posturi: ${inStatNotInJobs.slice(0, 5).map((r: any) => r.title).join(", ")}`,
        clarificationQuestion: "Aceste posturi au fișe de post? Dacă da, le puteți încărca. Dacă nu, AI-ul poate genera drafturi.",
        options: ["Am fișele (le încarc)", "Nu au fișe (generați draft AI)", "Posturi inactive (ignorăm)"],
        autoFixAction: "create_missing_jobs",
        affectedItems: inStatNotInJobs.map((r: any) => r.jobId || r.title),
        resolved: false,
      })
    }

    // Fișe fără corespondent în stat
    const inJobsNotInStat = jobs.filter(j => !statTitles.has(j.title.toLowerCase().trim()))
    if (inJobsNotInStat.length > 0) {
      issues.push({
        id: nextId(),
        category: "CROSS_CHECK",
        severity: "QUESTION",
        description: `${inJobsNotInStat.length} fișe de post care nu apar în statul de funcții`,
        details: `Posturi: ${inJobsNotInStat.slice(0, 5).map(j => j.title).join(", ")}. Pot fi posturi noi, redenumite sau greșeli.`,
        clarificationQuestion: "Aceste posturi sunt active în organizație? Trebuie adăugate în stat?",
        options: ["Da, sunt active (adăugați în stat)", "Nu mai sunt active (dezactivăm)", "Sunt redenumiri (indicați numele corect)"],
        affectedItems: inJobsNotInStat.map(j => j.id),
        resolved: false,
      })
    }

    // Diferențe de headcount
    const statTotal = statRows.reduce((s: number, r: any) => s + (r.positionCount || 0), 0)
    if (statTotal > 0 && Math.abs(statTotal - jobs.length) > statTotal * 0.3) {
      issues.push({
        id: nextId(),
        category: "CROSS_CHECK",
        severity: "INFO",
        description: `Diferență semnificativă între nr. posturi din stat (${statTotal}) și nr. fișe importate (${jobs.length})`,
        details: `Asta poate fi normal (un post poate avea mai multe poziții ocupate) sau poate indica lipsuri. Statul de funcții conține ${statRows.length} posturi distincte cu ${statTotal} poziții totale.`,
        affectedItems: [],
        resolved: false,
      })
    }
  }

  // ─── 7. FORMAT — niveluri ierarhice lipsă ───
  const jobsWithoutLevel = jobs.filter(j => !(j as any).hierarchyLevel && (j as any).hierarchyLevel !== 0)
  if (jobsWithoutLevel.length > jobs.length * 0.5) {
    issues.push({
      id: nextId(),
      category: "FORMAT",
      severity: "IMPORTANT",
      description: `${jobsWithoutLevel.length} posturi fără nivel ierarhic definit`,
      details: `Nivelul ierarhic ajută la evaluarea criteriului "Luarea deciziilor" și la vizualizarea organigramei.`,
      clarificationQuestion: "Puteți indica nivelul ierarhic? (1=top management, 2=middle, 3=supervizor, 4=specialist, 5=execuție)",
      autoFixAction: "ai_infer_hierarchy",
      affectedItems: jobsWithoutLevel.map(j => j.id),
      resolved: false,
    })
  }

  // ─── Calculare scor general ───
  const blockerCount = issues.filter(i => i.severity === "BLOCKER").length
  const importantCount = issues.filter(i => i.severity === "IMPORTANT").length
  const questionCount = issues.filter(i => i.severity === "QUESTION").length
  const infoCount = issues.filter(i => i.severity === "INFO").length

  const overallScore = Math.max(0, Math.round(
    100 - (blockerCount * 25) - (importantCount * 10) - (questionCount * 3) - (infoCount * 1)
  ))

  const readyForEvaluation = blockerCount === 0

  // ─── Mesaj ghidare ───
  let guidanceMessage: string
  if (overallScore >= 80) {
    guidanceMessage = "Datele sunt în formă bună. Am câteva clarificări minore care pot îmbunătăți precizia evaluării."
  } else if (overallScore >= 50) {
    guidanceMessage = "Am importat datele cu succes. Am identificat câteva aspecte care necesită atenția dvs. înainte de a lansa evaluarea. Cele mai simple primele — rezolvăm pas cu pas."
  } else {
    guidanceMessage = "Am primit datele și le-am analizat. Există câteva neclarități pe care trebuie să le rezolvăm împreună înainte de a continua. Nu vă faceți griji — e normal pentru un prim import. Rezolvăm totul pas cu pas."
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    overallScore,
    summary: {
      blockers: blockerCount,
      important: importantCount,
      questions: questionCount,
      info: infoCount,
      total: issues.length,
      resolved: issues.filter(i => i.resolved).length,
    },
    issues,
    guidanceMessage,
    readyForEvaluation,
  }
}

// ═══════════════════════════════════════════════════════════════
// DETECTION HELPERS
// ═══════════════════════════════════════════════════════════════

interface JobTitleEntry { id: string; title: string; dept: string }

function detectSimilarTitles(jobs: JobTitleEntry[]): Array<{ titles: string[]; jobIds: string[]; departments: string[] }> {
  const groups: Array<{ titles: string[]; jobIds: string[]; departments: string[] }> = []

  for (let i = 0; i < jobs.length; i++) {
    for (let j = i + 1; j < jobs.length; j++) {
      const similarity = calculateTitleSimilarity(jobs[i].title, jobs[j].title)
      if (similarity > 0.7 && similarity < 1.0) {
        // Similar but not identical
        const existing = groups.find(g => g.jobIds.includes(jobs[i].id) || g.jobIds.includes(jobs[j].id))
        if (existing) {
          if (!existing.jobIds.includes(jobs[i].id)) {
            existing.jobIds.push(jobs[i].id)
            existing.titles.push(jobs[i].title)
            existing.departments.push(jobs[i].dept)
          }
          if (!existing.jobIds.includes(jobs[j].id)) {
            existing.jobIds.push(jobs[j].id)
            existing.titles.push(jobs[j].title)
            existing.departments.push(jobs[j].dept)
          }
        } else {
          groups.push({
            titles: [jobs[i].title, jobs[j].title],
            jobIds: [jobs[i].id, jobs[j].id],
            departments: [jobs[i].dept, jobs[j].dept].filter(Boolean),
          })
        }
      }
    }
  }

  return groups
}

function calculateTitleSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-zăâîșț0-9\s]/g, "").trim()
  const na = normalize(a)
  const nb = normalize(b)

  if (na === nb) return 1.0

  // Word-level Jaccard
  const wordsA = new Set(na.split(/\s+/))
  const wordsB = new Set(nb.split(/\s+/))
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size

  return union > 0 ? intersection / union : 0
}

interface JobContentEntry { id: string; title: string; purpose: string; responsibilities: string }

function detectDuplicateContent(jobs: JobContentEntry[]): Array<{ id1: string; id2: string; title1: string; title2: string; similarity: number }> {
  const duplicates: Array<{ id1: string; id2: string; title1: string; title2: string; similarity: number }> = []

  for (let i = 0; i < jobs.length; i++) {
    for (let j = i + 1; j < jobs.length; j++) {
      const contentA = `${jobs[i].purpose} ${jobs[i].responsibilities}`.toLowerCase()
      const contentB = `${jobs[j].purpose} ${jobs[j].responsibilities}`.toLowerCase()

      if (contentA.length < 20 || contentB.length < 20) continue

      const similarity = calculateContentSimilarity(contentA, contentB)
      if (similarity > 0.8) {
        duplicates.push({
          id1: jobs[i].id,
          id2: jobs[j].id,
          title1: jobs[i].title,
          title2: jobs[j].title,
          similarity: Math.round(similarity * 100),
        })
      }
    }
  }

  return duplicates
}

function calculateContentSimilarity(a: string, b: string): number {
  // Trigram similarity (fast approximation)
  const trigramsA = new Set(getTrigrams(a))
  const trigramsB = new Set(getTrigrams(b))
  const intersection = [...trigramsA].filter(t => trigramsB.has(t)).length
  const union = new Set([...trigramsA, ...trigramsB]).size
  return union > 0 ? intersection / union : 0
}

function getTrigrams(text: string): string[] {
  const trigrams: string[] = []
  for (let i = 0; i < text.length - 2; i++) {
    trigrams.push(text.slice(i, i + 3))
  }
  return trigrams
}

function findSimilarDept(dept: string, allDepts: string[]): string {
  let bestMatch = dept
  let bestScore = 0
  for (const d of allDepts) {
    if (d === dept) continue
    const sim = calculateTitleSimilarity(dept, d)
    if (sim > bestScore) {
      bestScore = sim
      bestMatch = d
    }
  }
  return bestMatch
}
