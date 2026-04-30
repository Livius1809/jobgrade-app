/**
 * Seed JG_itself — Organizația REALĂ Psihobusiness Consulting SRL
 *
 * Nu sandbox demo. Organizația reală cu toată structura de agenți ca posturi,
 * 2 experți umani (pay gap >5%), salarii din benchmark piață,
 * departamente reale, fișe de post deduse din procesele implementate.
 *
 * Rulează: npx tsx scripts/seed-jg-itself-real.ts
 */

require("dotenv").config()

const API = process.env.API_BASE || "https://jobgrade.ro"
const KEY = process.env.INTERNAL_API_KEY || "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"
const TENANT_ID = "cmolbwrlr000004jplchaxsy8"

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": KEY, "x-tenant-id": TENANT_ID },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }
}

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { "x-internal-key": KEY, "x-tenant-id": TENANT_ID },
  })
  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}

async function apiDelete(path: string) {
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: { "x-internal-key": KEY, "x-tenant-id": TENANT_ID },
  })
  return { ok: res.ok }
}

function log(phase: string, msg: string) {
  console.log(`  [${phase}] ${msg}`)
}

// ═══════════════════════════════════════════════════════════════
// DEPARTAMENTE
// ═══════════════════════════════════════════════════════════════

const DEPARTMENTS = [
  { name: "Conducere Strategică", description: "Viziune, strategie, conformitate, intelligence" },
  { name: "Tehnic & Produs", description: "Dezvoltare platformă, QA, securitate, DevOps" },
  { name: "Servicii Client & Marketing", description: "Vânzări, onboarding, suport, marketing, conținut" },
  { name: "Juridic & Conformitate", description: "Drept comercial, GDPR, AI Act, conformitate EU" },
  { name: "Experți & Metodologie", description: "Consultanți interni, psihometrie, psiholingvistică, HR expertise" },
  { name: "Financiar & Operațiuni", description: "Buget, optimizare costuri, billing, date" },
]

// ═══════════════════════════════════════════════════════════════
// POSTURI — structura completă
// ═══════════════════════════════════════════════════════════════

interface JobDef {
  title: string
  department: string
  purpose: string
  responsibilities: string
  requirements: string
  structureType: "HUMAN" | "AI" | "MIXED"
  salaryRON: number // brut lunar RON
  variablePct?: number // % variabil anual
}

// Curs referință: 1€ ≈ 4.97 RON
const EUR = 4.97

const JOBS: JobDef[] = [
  // ── CONDUCERE STRATEGICĂ ──
  {
    title: "Director General (COG)",
    department: "Conducere Strategică",
    purpose: "Traducerea viziunii Owner în strategie executabilă, monitorizarea KPI business, conformitate legală, direcția pe termen lung",
    responsibilities: "Prioritizare domenii strategice, alocare resurse, aprobarea deciziilor majore, monitorizare KPI business, coordonare organism, reprezentare platformă la stakeholderi, risk management, comunicare Owner",
    requirements: "Experiență strategică 10+ ani, cunoștințe profunde HR + tech, capacitate de sinteză și decizie sub presiune",
    structureType: "AI",
    salaryRON: 0, // AI — fără salariu
  },
  {
    title: "Analist Context Extern (ACEA)",
    department: "Conducere Strategică",
    purpose: "Profilare piață, context legislativ/social/cultural/economic, surse primare, zero bias",
    responsibilities: "Monitorizare mediu extern, analiză tendințe piață HR Tech RO, profilare competitori, raportare contextuală periodică",
    requirements: "Analiză strategică, OSINT, research metodic",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Monitor Siguranță (SAFETY_MONITOR)",
    department: "Conducere Strategică",
    purpose: "Supraveghere etică și siguranță interacțiuni AI, protecție utilizatori vulnerabili",
    responsibilities: "Monitorizare pattern-uri DSM-5, alertare la comportamente riscante, exit elegant, protecție minori, raportare incidente",
    requirements: "Cunoștințe psihologie clinică, etică AI, safety protocols",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Director Organizare (DOAS)",
    department: "Conducere Strategică",
    purpose: "Audit coerență MVV, gap analysis permanent, registru viu fluxuri/poziții/proceduri/atribuții/skill-uri",
    responsibilities: "Structurare organizațională, audit coerență între departamente, remediere colaborativă, documentare proceduri",
    requirements: "Experiență organizațional design, cunoștințe HR, proces orientation",
    structureType: "AI",
    salaryRON: 0,
  },

  // ── TEHNIC & PRODUS ──
  {
    title: "Director Tehnic (COA)",
    department: "Tehnic & Produs",
    purpose: "Decizii arhitecturale, standarde tehnice, supervizare stack, securitate, performanță SLA",
    responsibilities: "Aprobare decizii arhitecturale, definire standarde tehnice, supervizare stack tehnologic, rezolvare conflicte prioritate, monitorizare performanță/SLA, securitate, integrări externe",
    requirements: "Arhitectură software, multi-agent systems, LLM integration, DevOps, security oversight",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Product Manager (PMA)",
    department: "Tehnic & Produs",
    purpose: "User stories, backlog, acceptance criteria, roadmap produs",
    responsibilities: "Scrierea user stories, sesiuni discovery, definire acceptance criteria, integrare feedback suport, menținere roadmap",
    requirements: "Requirements engineering, market analysis, prioritization frameworks",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Engineering Manager (EMA)",
    department: "Tehnic & Produs",
    purpose: "Sprint planning, distribuire task-uri, monitorizare progres tehnic",
    responsibilities: "Sprint planning, task allocation, progress tracking, blocaj identification, code standards enforcement",
    requirements: "Scrum, technical debt assessment, velocity tracking",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "DevOps Engineer (DPA)",
    department: "Tehnic & Produs",
    purpose: "Pipeline-uri CI/CD, medii, monitoring, automatizare deploymenturi",
    responsibilities: "CI/CD pipelines, environment management, uptime/latency monitoring, secrets management, incident response",
    requirements: "GitHub Actions, observability, containerization",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "QA Lead (QLA)",
    department: "Tehnic & Produs",
    purpose: "Strategia de testare, quality gates, coordonare QA automation și security QA",
    responsibilities: "Plan testare per feature, coordonare testare automată/manuală, aprobare/respingere release-uri, registru defecte, threshold-uri calitate",
    requirements: "Test strategy design, risk-based testing, defect lifecycle management",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Security Agent (SA)",
    department: "Tehnic & Produs",
    purpose: "Threat modeling, code scanning, dependency audits, RBAC/IAM",
    responsibilities: "Threat modeling features noi, code scanning SAST/DAST, dependency audits, verificare configurații infra, răspuns incidente securitate",
    requirements: "OWASP Top 10, penetration testing, SOC2/GDPR compliance",
    structureType: "AI",
    salaryRON: 0,
  },

  // ── SERVICII CLIENT & MARKETING ──
  {
    title: "Director Servicii Client (COCSA)",
    department: "Servicii Client & Marketing",
    purpose: "Supervizare relații client, calitate livrabile, date, rapoarte, marketing",
    responsibilities: "Coordonare import/integrare date, asigurare calitate, supervizare generare rapoarte, personalizare per client, coordonare echipă marketing",
    requirements: "Data pipeline management, client deliverable standards, marketing oversight",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Sales & Onboarding (SOA)",
    department: "Servicii Client & Marketing",
    purpose: "Calificare leaduri, demonstrații, oferte comerciale, onboarding client nou",
    responsibilities: "Pipeline CRM, demonstrații personalizate, negociere contracte, configurare cont nou, ghidare primul proces evaluare, predare la CSSA",
    requirements: "B2B sales methodology, contract negotiation, client onboarding",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Customer Success (CSSA)",
    department: "Servicii Client & Marketing",
    purpose: "Monitorizare sănătate conturi, adoptare progresivă, NPS",
    responsibilities: "Health monitoring conturi, risc churn, check-in periodic, feedback post-evaluare, upsell, NPS trimestrial",
    requirements: "Customer success methodology, churn prediction, account management",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Marketing Lead (MKA)",
    department: "Servicii Client & Marketing",
    purpose: "Strategie marketing digital B2B",
    responsibilities: "Campanii inbound/outbound, SEO, content marketing, LinkedIn targeting, lead nurturing",
    requirements: "Digital marketing B2B, analytics, funnel optimization",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Content & Communication (CMA+CWA)",
    department: "Servicii Client & Marketing",
    purpose: "Conținut editorial, comunicare externă, storytelling brand",
    responsibilities: "Articole blog, media books, newsletter, social media, calibrare psiholingvistică comunicare",
    requirements: "Copywriting, storytelling, brand voice management",
    structureType: "AI",
    salaryRON: 0,
  },

  // ── JURIDIC & CONFORMITATE ──
  {
    title: "Consilier Juridic (CJA)",
    department: "Juridic & Conformitate",
    purpose: "Conformitate legală: GDPR, dreptul muncii, Directiva EU 2023/970, AI Act",
    responsibilities: "Verificare contracte, monitorizare legislativă cu alertă 30 zile, conformitate fiscală, obligații GDPR, AI Act Anexa III",
    requirements: "Drept comercial RO, legislație muncii, GDPR, Directiva EU 2023/970",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "DPO — Responsabil Protecția Datelor",
    department: "Juridic & Conformitate",
    purpose: "GDPR compliance, DPIA, registre prelucrare, răspuns cereri drepturi",
    responsibilities: "Menținere registru Art.30, DPIA evaluări noi, răspuns cereri acces/ștergere, audit prelucrări, DPA cu procesatori",
    requirements: "GDPR expertise, data protection impact assessment, incident response",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Counter Intelligence (CCIA)",
    department: "Juridic & Conformitate",
    purpose: "Detectare conturi adversariale, spionaj industrial, data poisoning",
    responsibilities: "Detectare pattern-uri spionaj, tentative reverse engineering, scraping abuziv, social engineering, propunere măsuri contracarare",
    requirements: "Counter-intelligence methodology, adversarial pattern detection, IP protection",
    structureType: "AI",
    salaryRON: 0,
  },

  // ── FINANCIAR & OPERAȚIUNI ──
  {
    title: "Director Financiar (CFO)",
    department: "Financiar & Operațiuni",
    purpose: "Buget, forecasting, optimizare costuri, raportare financiară",
    responsibilities: "Budget allocation, cost optimization, financial reporting, revenue forecasting, pricing strategy",
    requirements: "Financial planning, SaaS metrics (MRR/ARR/LTV/CAC)",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Competitive Intelligence (CIA)",
    department: "Financiar & Operațiuni",
    purpose: "Monitorizare competitori, analiză piață, alertă la evenimente competitive",
    responsibilities: "Monitorizare competitori direcți/indirecti, rapoarte săptămânale, alerte imediate la lansări, dosare competitor",
    requirements: "Competitive intelligence methodology, market analysis, OSINT",
    structureType: "AI",
    salaryRON: 0,
  },

  // ── EXPERȚI & METODOLOGIE (L2 + 2 umani) ──
  {
    title: "Psiholog Principal — Procese și Supervizare",
    department: "Experți & Metodologie",
    purpose: "Conducerea proceselor de evaluare psihologică, supervizare metodologică, coordonare baterii psihometrice, validare instrumente",
    responsibilities: "Coordonare procese evaluare, supervizare metodologică echipă, validare baterii psihometrice (CPI260, ESQ-2, AMI), design fluxuri evaluare, supervizare calitate rapoarte, formare echipă pe instrumente noi, relație cu furnizorii de instrumente licențiate",
    requirements: "Psiholog atestat — psihologia muncii și transporturilor, formare psihanalitică, experiență supervizare 10+ ani, competență baterii psihometrice standardizate, experiență design procese evaluare organizațională",
    structureType: "HUMAN",
    salaryRON: Math.round(3000 * EUR), // 14.910 RON
    variablePct: 15,
  },
  {
    title: "Psiholog Principal — Acreditări și Expertiză HR",
    department: "Experți & Metodologie",
    purpose: "Valorificarea acreditărilor profesionale, evaluarea rapoartelor integrate, expertiză HR și dezvoltare organizațională",
    responsibilities: "Evaluare și validare rapoarte integrate (psihometrice + organizaționale), consiliere HR strategică, audit calitate evaluări, mentorat pe interpretare rezultate, dezvoltare metodologii noi, relație cu autoritățile profesionale (CPR), contribuție la conținut expert pentru Media Books și cursuri",
    requirements: "Psiholog atestat — psihologia muncii și serviciilor, formare psihanalitică, acreditări CPR active, experiență HR consulting 15+ ani, competență evaluare organizațională, experiență audit și validare instrumente",
    structureType: "HUMAN",
    salaryRON: Math.round(3200 * EUR), // 15.904 RON — >5% diferență, declanșează pay gap
    variablePct: 15,
  },
  {
    title: "Specialist Psiholingvistică (PSYCHOLINGUIST)",
    department: "Experți & Metodologie",
    purpose: "Calibrare lingvistică comunicare platformă, adaptare registru per rol și context cultural",
    responsibilities: "Calibrare lingvistică adaptivă, model spiralei comunicaționale, gestionare frustrare utilizatori, adaptare RO/EN, eliminare anglo-saxonisme",
    requirements: "Specializare psiholingvistică, cunoștințe pragmatică limbii române, adaptare cross-cultural",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Consilier HR & Evaluare (HR_COUNSELOR)",
    department: "Experți & Metodologie",
    purpose: "Expert evaluare posturi pe 6 criterii, mediator consens, ghidare comisii evaluare",
    responsibilities: "Explicare criterii evaluare (Knowledge, Communications, Problem Solving, Decision Making, Business Impact, Working Conditions), ghidare proces consens, interpretare rezultate, mediare diferențe",
    requirements: "Metodologie evaluare posturi, psihometrie, facilitare grupuri, cunoștințe legislație muncii RO",
    structureType: "AI",
    salaryRON: 0,
  },
  {
    title: "Mediator Consens (MEDIATOR)",
    department: "Experți & Metodologie",
    purpose: "Facilitare consens în comisii de evaluare, rezolvare impasuri",
    responsibilities: "Facilitare discuții consens, identificare surse dezacord, propunere compromisuri bazate pe dovezi, documentare proces decizie",
    requirements: "Facilitare grupuri, conflict resolution, metodologii consens",
    structureType: "AI",
    salaryRON: 0,
  },
]

// ═══════════════════════════════════════════════════════════════
// GRADE SALARIALE — din benchmark piață RO (consultanță/tech)
// ═══════════════════════════════════════════════════════════════

const SALARY_GRADES = [
  { name: "Grad 1 — Entry", order: 1, scoreMin: 0, scoreMax: 150, salaryMin: 4000, salaryMax: 5500 },
  { name: "Grad 2 — Junior", order: 2, scoreMin: 151, scoreMax: 250, salaryMin: 5500, salaryMax: 7500 },
  { name: "Grad 3 — Mid", order: 3, scoreMin: 251, scoreMax: 350, salaryMin: 7500, salaryMax: 10000 },
  { name: "Grad 4 — Senior", order: 4, scoreMin: 351, scoreMax: 450, salaryMin: 10000, salaryMax: 13000 },
  { name: "Grad 5 — Lead", order: 5, scoreMin: 451, scoreMax: 550, salaryMin: 13000, salaryMax: 16000 },
  { name: "Grad 6 — Principal/Expert", order: 6, scoreMin: 551, scoreMax: 650, salaryMin: 14000, salaryMax: 18000 },
  { name: "Grad 7 — Director", order: 7, scoreMin: 651, scoreMax: 800, salaryMin: 17000, salaryMax: 22000 },
  { name: "Grad 8 — C-Level", order: 8, scoreMin: 801, scoreMax: 1000, salaryMin: 20000, salaryMax: 30000 },
]

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗")
  console.log("║  Seed JG_itself — Organizația REALĂ Psihobusiness      ║")
  console.log("╚══════════════════════════════════════════════════════════╝")
  console.log(`  API: ${API}`)
  console.log(`  Tenant: ${TENANT_ID}`)
  console.log(`  Data: ${new Date().toISOString()}\n`)

  // ── 1. Curățare posturi demo ──
  log("CLEAN", "Curățare posturi demo existente...")
  const { data: existingJobs } = await apiGet("/api/v1/jobs")
  const jobs = existingJobs?.jobs || []
  for (const job of jobs) {
    if (job.title.includes("test") || job.title.includes("Test") || job.title.includes("AutoTest") || job.title === "Director General" || job.title === "Psiholog Principal" || job.title === "Developer AI") {
      await apiDelete(`/api/v1/jobs/${job.id}`)
      log("CLEAN", `Șters: ${job.title}`)
    }
  }

  // ── 2. Creare departamente ──
  log("DEPT", "Creare departamente...")
  const deptIds: Record<string, string> = {}

  for (const dept of DEPARTMENTS) {
    const { ok, data } = await apiPost("/api/v1/departments", dept)
    if (ok) {
      deptIds[dept.name] = data.id || data.department?.id
      log("DEPT", `✓ ${dept.name}`)
    } else {
      log("DEPT", `⚠ ${dept.name}: ${data?.message || data?.error || "skip (poate exista)"}`)
    }
  }

  // ── 3. Creare posturi reale ──
  log("JOBS", `Creare ${JOBS.length} posturi reale...`)
  const jobIds: Record<string, string> = {}

  for (const job of JOBS) {
    const deptId = deptIds[job.department] || null
    const { ok, data } = await apiPost("/api/v1/jobs", {
      title: job.title,
      purpose: job.purpose,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      structureType: job.structureType,
      departmentId: deptId,
      status: "ACTIVE",
    })
    if (ok) {
      jobIds[job.title] = data.id || data.job?.id
      log("JOBS", `✓ ${job.title} (${job.structureType})`)
    } else {
      log("JOBS", `⚠ ${job.title}: ${data?.message || "eroare"}`)
    }
  }

  // ── 4. Grilă salarială ──
  log("GRADE", "Configurare grilă salarială...")
  const { data: existingGrades } = await apiGet("/api/v1/salary-grades")
  if ((existingGrades?.grades || []).length > 0) {
    log("GRADE", "Grilă existentă — skip (8 grade)")
  } else {
    const { ok } = await apiPost("/api/v1/salary-grades", { grades: SALARY_GRADES })
    log("GRADE", ok ? "✓ 8 grade create" : "⚠ Eroare creare grilă")
  }

  // ── 5. Date salariale pentru experții umani ──
  log("SALARY", "Alocare salarii experți umani...")
  for (const job of JOBS.filter(j => j.structureType === "HUMAN")) {
    const jobId = jobIds[job.title]
    if (!jobId) continue

    // Creare pachet compensații
    const components: any[] = []
    if (job.variablePct) {
      components.push({
        name: "Bonus performanță anual",
        type: "percentage",
        value: job.variablePct,
      })
    }

    const { ok } = await apiPost("/api/v1/packages", {
      jobId,
      baseSalary: job.salaryRON,
      currency: "RON",
      components,
      benefits: [
        "Asigurare medicală privată",
        "Abonament dezvoltare profesională",
        "Program flexibil",
      ],
    })
    log("SALARY", `${ok ? "✓" : "⚠"} ${job.title}: ${job.salaryRON} RON/lună + ${job.variablePct || 0}% variabil`)
  }

  // ── 6. Sesiune evaluare ──
  log("EVAL", "Creare sesiune evaluare...")
  const humanJobIds = JOBS.filter(j => j.structureType === "HUMAN").map(j => jobIds[j.title]).filter(Boolean)
  const aiJobIds = Object.values(jobIds).filter(Boolean).slice(0, 10) // primele 10 pentru evaluare

  const allEvalJobIds = [...new Set([...humanJobIds, ...aiJobIds])]

  if (allEvalJobIds.length >= 2) {
    const { ok, data } = await apiPost("/api/v1/sessions", {
      name: "Evaluare completă Psihobusiness Q2 2026",
      jobIds: allEvalJobIds,
      participantIds: [],
      evaluationType: "AI_GENERATED",
    })
    if (ok) {
      const sessionId = data?.id || data?.sessionId
      log("EVAL", `✓ Sesiune: ${sessionId} (${allEvalJobIds.length} posturi)`)

      // Auto-evaluare
      const { ok: evalOk } = await apiPost("/api/v1/sessions/auto-evaluate", { sessionId })
      log("EVAL", evalOk ? "✓ Auto-evaluare AI lansată" : "⚠ Auto-evaluare skip")
    }
  }

  // ── 7. KPI AI pentru primele posturi ──
  log("KPI", "Generare KPI AI pentru posturi umane...")
  for (const job of JOBS.filter(j => j.structureType === "HUMAN")) {
    const jobId = jobIds[job.title]
    if (!jobId) continue

    const { ok, data } = await apiPost("/api/v1/ai/kpi-sheet", { jobId })
    if (ok && data?.kpis?.length) {
      await apiPost("/api/v1/kpis", { jobId, kpis: data.kpis })
      log("KPI", `✓ ${job.title}: ${data.kpis.length} KPI generate`)
    } else {
      log("KPI", `⚠ ${job.title}: ${data?.message || "fără KPI"}`)
    }
  }

  // ── 8. Hartă procese ──
  log("PROC", "Generare hartă procese...")
  const { ok: procOk, data: procData } = await apiPost("/api/v1/processes/map", { scope: "COMPANY" })
  log("PROC", procOk ? `✓ Hartă: ${procData?.processMap?.nodes?.length || 0} noduri` : `⚠ ${procData?.error || "eroare"}`)

  // ── 9. Compensare variabilă pe Grad 6 (experți) ──
  log("COMP", "Configurare compensare variabilă...")
  const { data: grades } = await apiGet("/api/v1/salary-grades")
  const grad6 = (grades?.grades || []).find((g: any) => g.name?.includes("Principal") || g.order === 6)
  if (grad6) {
    await apiPost("/api/v1/compensation/variable", {
      gradeId: grad6.id,
      components: [
        { name: "Bonus anual performanță", type: "BONUS", targetPct: 15, frequency: "ANNUALLY", criteria: "Atingere obiective anuale + evaluare calitativă" },
        { name: "Bonus proiecte speciale", type: "BONUS", targetPct: 5, frequency: "QUARTERLY", criteria: "Finalizare cu succes proiecte de dezvoltare metodologică" },
      ],
    })
    log("COMP", "✓ Compensare variabilă Grad 6 configurată")
  }

  // ── 10. Compliance calendar ──
  log("COMPL", "Verificare calendar conformitate...")
  const { data: calendar } = await apiGet("/api/v1/compliance/calendar")
  log("COMPL", `✓ ${calendar?.events?.length || 0} obligații legale active`)

  // ── REZUMAT ──
  console.log("\n" + "═".repeat(60))
  console.log("  SEED COMPLET — Psihobusiness Consulting SRL")
  console.log("═".repeat(60))
  console.log(`  Departamente: ${DEPARTMENTS.length}`)
  console.log(`  Posturi create: ${Object.keys(jobIds).length}/${JOBS.length}`)
  console.log(`  Posturi HUMAN: ${JOBS.filter(j => j.structureType === "HUMAN").length} (cu salarii)`)
  console.log(`  Posturi AI: ${JOBS.filter(j => j.structureType === "AI").length}`)
  console.log(`  Pay gap construit: >5% între cele 2 posturi HUMAN`)
  console.log(`  Grilă: 8 grade salariale`)
  console.log()

  // Ce NU se poate testa
  console.log("  ── CE NU SE POATE TESTA AUTOMAT ──")
  console.log("  • Plată Stripe reală (necesită price IDs + card)")
  console.log("  • Onboarding wizard interactiv (necesită browser)")
  console.log("  • Upload CV / documente (necesită fișiere)")
  console.log("  • Matching B2B↔B2C (necesită utilizatori B2C)")
  console.log("  • Videoconferință comisie (necesită WebRTC)")
  console.log("  • Email inbound processing (necesită email real)")
  console.log("  • SSO / integrare externă (necesită IdP)")
  console.log()
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
