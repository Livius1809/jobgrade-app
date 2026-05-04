/**
 * job-auto-evaluator.ts — Evaluare automată AI a posturilor
 *
 * Citește fișa de post (descriere, responsabilități, cerințe) și propune
 * subfactorul potrivit per criteriu, bazat pe conținutul real, nu pe titlu.
 *
 * Criteriile de evaluare (6) — bareme Connex GSM JE Manual (max total 2800 pct):
 * 1. Educație/Experiență (A-G, 80-560 pct)
 * 2. Comunicare (A-E, 85-425 pct)
 * 3. Rezolvarea problemelor (A-G, 80-560 pct)
 * 4. Luarea deciziilor (A-G, 80-560 pct)
 * 5. Impact asupra afacerii (A-D, 140-560 pct) ← criteriu cheie încadrare
 * 6. Condiții de lucru (A-C, 45-135 pct)
 */

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"

const MODEL = "claude-haiku-4-5-20251001"

interface EvaluationResult {
  criterionId: string
  criterionName: string
  selectedSubfactorId: string
  selectedCode: string
  selectedPoints: number
  justification: string
}

export async function autoEvaluateJob(jobId: string): Promise<EvaluationResult[]> {
  // 1. Load job details
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      title: true,
      purpose: true,
      description: true,
      responsibilities: true,
      requirements: true,
    },
  })

  if (!job) throw new Error("Post negăsit: " + jobId)

  // 2. Load criteria + subfactors
  const criteria = await prisma.criterion.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      subfactors: { orderBy: { order: "asc" } },
    },
  })

  // 3. Build prompt
  const jobDescription = [
    `TITLU: ${job.title}`,
    job.purpose ? `SCOP: ${job.purpose}` : "",
    job.description ? `DESCRIERE: ${job.description}` : "",
    job.responsibilities ? `RESPONSABILITĂȚI: ${job.responsibilities}` : "",
    job.requirements ? `CERINȚE: ${job.requirements}` : "",
  ].filter(Boolean).join("\n")

  const criteriaDescription = criteria.map(c => {
    const levels = c.subfactors.map(sf =>
      `  ${sf.code}: ${sf.description || "Nivel " + sf.order}`
    ).join("\n")
    return `CRITERIU: ${c.name}\nNiveluri (alege UNUL):\n${levels}`
  }).join("\n\n")

  const prompt = `Ești expert în evaluarea posturilor de muncă. Analizează fișa postului de mai jos și selectează nivelul potrivit per criteriu.

IMPORTANT:
- Evaluezi POSTUL (cerințele poziției), nu o persoană
- Citește CONȚINUTUL fișei, nu te baza doar pe TITLUL funcției
- Un "Manager de magazin" poate fi operațional (nivel B-C la Impact), nu strategic
- Criteriul "Impact asupra afacerii" diferențiază clar nivelul operațional de cel strategic
- Alege nivelul care corespunde cel mai bine cerințelor REALE din fișă
- ATENȚIE la calificativele din titlu sau paranteze: "studii medii", "studii superioare", "specialist", "rezident" etc.
  Acestea sunt indicatori direcți pentru criteriile de evaluare:
  * "studii medii" → Educație/Experiență: nivel C-D
  * "studii superioare" → Educație/Experiență: nivel E-G
  * "rezident" → experiență limitată, nivel mai scăzut pe Decizie și Impact
  * "specialist" → experiență confirmată, nivel mai ridicat
  Compară aceste calificative cu descrierile subfactorilor și scorează corespunzător

FIȘA POSTULUI:
${jobDescription}

CRITERII DE EVALUARE:
${criteriaDescription}

Răspunde STRICT în format JSON — un array cu câte un obiect per criteriu:
[
  {"criterionName": "Educație / Experiență", "selectedCode": "D", "justification": "...motivul alegerii pe scurt..."},
  ...
]

Evaluează toate cele ${criteria.length} criterii. Justificarea trebuie să fie scurtă (1 frază) și să facă referire la elemente concrete din fișa postului.`

  // 4. Call Claude
  const client = new Anthropic()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  // 5. Parse response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("AI nu a returnat JSON valid")

  let parsed: Array<{ criterionName: string; selectedCode: string; justification: string }>
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    // Retry: curăță JSON malformat (ghilimele neînchise, virgule trailing)
    const cleaned = jsonMatch[0]
      .replace(/,\s*([}\]])/g, "$1")          // trailing commas
      .replace(/[\u201C\u201D\u201E]/g, '"')  // ghilimele românești
      .replace(/[\u2018\u2019]/g, "'")         // apostrofe fancy
      .replace(/\n/g, " ")                     // newlines în stringuri
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error(`JSON malformat de la AI: ${jsonMatch[0].slice(0, 200)}...`)
    }
  }

  // 6. Map to criterion + subfactor IDs
  const results: EvaluationResult[] = []

  for (const item of parsed) {
    const crit = criteria.find(c =>
      c.name.toLowerCase().includes(item.criterionName.toLowerCase().split("/")[0].trim()) ||
      item.criterionName.toLowerCase().includes(c.name.toLowerCase().split("/")[0].trim())
    )
    if (!crit) continue

    const sf = crit.subfactors.find(s => s.code === item.selectedCode)
    if (!sf) continue

    results.push({
      criterionId: crit.id,
      criterionName: crit.name,
      selectedSubfactorId: sf.id,
      selectedCode: sf.code,
      selectedPoints: sf.points,
      justification: item.justification,
    })
  }

  return results
}

/**
 * Evaluează automat toate posturile dintr-o sesiune
 */
export async function autoEvaluateSession(sessionId: string, userId: string): Promise<{
  jobsEvaluated: number
  errors: number
  scores: Record<string, number>
  totalScore: Record<string, number>
}> {
  const sessionJobs = await prisma.sessionJob.findMany({
    where: { sessionId },
    include: { job: { select: { id: true, title: true } } },
  })

  const totalScore: Record<string, number> = {}

  let errors = 0
  for (const sj of sessionJobs) {
    // Skip dacă deja evaluat
    const existingAssignment = await prisma.jobAssignment.findFirst({
      where: { sessionJobId: sj.id, userId },
      include: { evaluations: { select: { id: true } } },
    })
    if (existingAssignment && existingAssignment.evaluations.length >= 5) {
      // Deja evaluat, recalculăm scorul
      const evals = await prisma.evaluation.findMany({
        where: { assignmentId: existingAssignment.id },
        include: { subfactor: { select: { points: true, code: true } } },
      })
      const jobTotal = evals.reduce((s: number, e: any) => s + (e.subfactor?.points || 0), 0)
      totalScore[sj.job.title] = jobTotal
      console.log(`  ${sj.job.title}: ${jobTotal} pct (deja evaluat)`)
      continue
    }

    let results
    try {
      results = await autoEvaluateJob(sj.job.id)
    } catch (e: any) {
      console.error(`  ✗ ${sj.job.title}: ${e.message.slice(0, 80)}`)
      // Retry o dată
      try {
        results = await autoEvaluateJob(sj.job.id)
      } catch {
        console.error(`  ✗ ${sj.job.title}: retry failed — skip`)
        errors++
        continue
      }
    }

    // Create or get assignment
    let assignment = await prisma.jobAssignment.findFirst({
      where: { sessionJobId: sj.id, userId },
    })

    if (!assignment) {
      assignment = await prisma.jobAssignment.create({
        data: { sessionJobId: sj.id, userId, submittedAt: new Date() },
      })
    } else {
      // Clear existing evaluations for re-evaluation
      await prisma.evaluation.deleteMany({
        where: { assignmentId: assignment.id },
      })
      await prisma.jobAssignment.update({
        where: { id: assignment.id },
        data: { submittedAt: new Date() },
      })
    }

    // Create evaluations
    let jobTotal = 0
    for (const r of results) {
      await prisma.evaluation.create({
        data: {
          sessionId,
          assignmentId: assignment.id,
          criterionId: r.criterionId,
          subfactorId: r.selectedSubfactorId,
          justification: `[AI] ${r.justification}`,
        },
      })
      jobTotal += r.selectedPoints
    }

    totalScore[sj.job.title] = jobTotal
    console.log(`  ${sj.job.title}: ${jobTotal} pct (${results.map(r => r.selectedCode).join(",")})`)
  }

  return { jobsEvaluated: sessionJobs.length - errors, errors, scores: totalScore, totalScore }
}
