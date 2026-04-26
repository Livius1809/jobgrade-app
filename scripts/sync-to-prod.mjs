const PROD_URL = "https://jobgrade.ro"
const KEY = "94486c2998cdccae76cbce90168ff8d0072c97b42e7bf407b4445e03adfad688"

async function exec(operation, data) {
  const res = await fetch(`${PROD_URL}/api/v1/admin/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": KEY },
    body: JSON.stringify({ operation, data }),
  })
  return res.json()
}

// 1. COG KB
const r1 = await exec("kb-seed", { entries: [
  {
    agentRole: "COG",
    content: `PIPELINE PRIMUL CLIENT B2B — Status complet (creat 26.04.2026)

TIER 1 — BLOCKER (fara astea nu putem vinde):
- CJA: FAQ legal + conformitate B2B (IMPORTANT_URGENT)
- CMA: MB-R1 Media Book Job Grading storytelling copy (IMPORTANT_URGENT)
- CWA: MB-R1 copy final + calibrare psiholingvistica + adaptare culturala (IMPORTANT_URGENT)
- GDA: MB-R1 materiale vizuale design coerenta brand identitate vizuala (IMPORTANT_URGENT)
- PSYCHOLINGUIST: Calibrare lingvistica + culturala toate materialele Tier 1 (IMPORTANT_URGENT)
- CSM: Onboarding setup template executabil (URGENT)
- COCSA: Audit coerenta brand + identitate vizuala (IMPORTANT_URGENT)

TIER 2 — Prima saptamana:
- DVB2B: Pipeline primii 20 prospectivi B2B (URGENT)
- CMA: Secventa email outreach 3 emails (URGENT)
- GDA: Pitch deck + infografice (IMPORTANT)

TIER 3 — Prima luna:
- CMA: Media Books R2 R3 S1-S4 draft (IMPORTANT)
- CSEO: SEO on-page + pregatire ads (IMPORTANT)
- SMMA: Campanie awareness LinkedIn (IMPORTANT)
- CWA: Ghiduri HR descarcabile lead magnets (NECESAR)

COORDONARE: COA coordoneaza tot. Dependente: CMA draft, CWA calibreaza, GDA design, PSYCHOLINGUIST review, COCSA audit.
Dashboard: /owner/pipeline`,
    tags: ["pipeline", "first-client", "tier1", "tier2", "tier3", "coordonare", "status-live"],
    confidence: 1.0,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "COG",
    content: "PROCEDURA: Interogare pipeline primul client. Verifici statusul taskurilor pipeline prin interogarea agent_tasks cu tags tier1, tier2, tier3, pipeline. Responsabilitatea ta: (1) monitorizeaza progresul zilnic, (2) escaleaza blocaje la Owner, (3) asigura-te ca COA coordoneaza efectiv, (4) verifica ca TIER 1 se finalizeaza inainte de TIER 2/3. Dashboard Owner: /owner/pipeline.",
    tags: ["procedura", "pipeline", "interogare", "monitorizare"],
    confidence: 1.0,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "COG",
    content: "HANDOVER 25-26.04.2026: (1) Chestionare B2C Card 3 Hermann+MBTI. (2) Palnia cunoastere 4 moduri. (3) Infuzia Rocco 47 entries pe 7 L2. (4) Organism 75 agenti cold start 100%. (5) Raport Experienta invatare fixat. (6) Owner Inbox rapoarte bidirectionale. (7) Prioritizare Eisenhower. (8) Cicluri evolutie per echipa 14 manageri + safety net. (9) Self-cycle pe obiective + auto-completare KB. (10) Mod bibliografie. Self-check orar 13 verificari + auto-repair.",
    tags: ["handover", "sesiune-25-26-apr-2026", "organism", "status-live"],
    confidence: 1.0,
    source: "EXPERT_HUMAN",
  },
]})
console.log("COG KB:", JSON.stringify(r1))

// 2. COA KB
const r2 = await exec("kb-seed", { entries: [{
  agentRole: "COA",
  content: "PIPELINE PRIMUL CLIENT B2B — 15 taskuri pe 3 tiers. TIER 1 (BLOCKER, 7): FAQ legal, MB-R1 (storytelling+copy+design+calibrare culturala+audit coerenta brand), onboarding. TIER 2 (3): pipeline prospecti, outreach, pitch deck. TIER 3 (4): alte Media Books, SEO, LinkedIn, lead magnets. TU COORDONEZI. Dependente: CMA draft, CWA calibreaza, GDA design, PSYCHOLINGUIST review, COCSA audit. Raporteaza zilnic in Inbox Owner.",
  tags: ["pipeline", "first-client", "coordonare", "status-live"],
  confidence: 1.0,
  source: "EXPERT_HUMAN",
}]})
console.log("COA KB:", JSON.stringify(r2))

// 3. Tasks
const tasks = [
  { assignedTo: "CJA", assignedBy: "COA", title: "FAQ legal + conformitate B2B", taskType: "CONTENT_CREATION", priority: "CRITICAL", tags: ["tier1", "blocker", "legal", "first-client"] },
  { assignedTo: "CMA", assignedBy: "COA", title: "MB-R1 Media Book Job Grading — storytelling copy", taskType: "CONTENT_CREATION", priority: "CRITICAL", tags: ["tier1", "blocker", "media-book", "mb-r1"] },
  { assignedTo: "CWA", assignedBy: "COA", title: "MB-R1 copy final + calibrare culturala", taskType: "CONTENT_CREATION", priority: "CRITICAL", tags: ["tier1", "blocker", "copy", "cultural"] },
  { assignedTo: "GDA", assignedBy: "COA", title: "MB-R1 design coerenta brand + identitate vizuala", taskType: "CONTENT_CREATION", priority: "CRITICAL", tags: ["tier1", "blocker", "design", "brand"] },
  { assignedTo: "PSYCHOLINGUIST", assignedBy: "COA", title: "Calibrare lingvistica + culturala materiale Tier 1", taskType: "REVIEW", priority: "CRITICAL", tags: ["tier1", "blocker", "calibrare"] },
  { assignedTo: "CSM", assignedBy: "COA", title: "Onboarding setup template executabil", taskType: "PROCESS_EXECUTION", priority: "HIGH", tags: ["tier1", "blocker", "onboarding"] },
  { assignedTo: "COCSA", assignedBy: "COA", title: "Audit coerenta brand + identitate vizuala", taskType: "REVIEW", priority: "CRITICAL", tags: ["tier1", "blocker", "brand-coherence"] },
  { assignedTo: "DVB2B", assignedBy: "COA", title: "Pipeline primii 20 prospectivi B2B", taskType: "DATA_ANALYSIS", priority: "HIGH", tags: ["tier2", "pipeline", "prospects"] },
  { assignedTo: "CMA", assignedBy: "COA", title: "Secventa email outreach (3 emails)", taskType: "CONTENT_CREATION", priority: "HIGH", tags: ["tier2", "outreach", "email"] },
  { assignedTo: "GDA", assignedBy: "COA", title: "Pitch deck + infografice", taskType: "CONTENT_CREATION", priority: "MEDIUM", tags: ["tier2", "design", "pitch-deck"] },
  { assignedTo: "CMA", assignedBy: "COA", title: "Media Books R2, R3, S1-S4 draft", taskType: "CONTENT_CREATION", priority: "MEDIUM", tags: ["tier3", "media-books"] },
  { assignedTo: "CSEO", assignedBy: "DMA", title: "SEO on-page + pregatire ads", taskType: "DATA_ANALYSIS", priority: "MEDIUM", tags: ["tier3", "seo"] },
  { assignedTo: "SMMA", assignedBy: "DMA", title: "Campanie awareness LinkedIn organic", taskType: "CONTENT_CREATION", priority: "MEDIUM", tags: ["tier3", "social-media"] },
  { assignedTo: "CWA", assignedBy: "DMA", title: "Ghiduri HR descarcabile (lead magnets)", taskType: "CONTENT_CREATION", priority: "LOW", tags: ["tier3", "lead-magnets"] },
  { assignedTo: "COA", assignedBy: "OWNER", title: "Coordoneaza pipeline primul client B2B", taskType: "PROCESS_EXECUTION", priority: "CRITICAL", tags: ["pipeline", "coordonare", "first-client"] },
]
const r3 = await exec("create-tasks-batch", { tasks })
console.log("Tasks:", JSON.stringify(r3))

// 4. Notificare
const r4 = await exec("create-notification", {
  title: "Pipeline primul client B2B sincronizat pe PROD",
  body: "15 taskuri + KB COG/COA sincronizate pe DB prod. Dashboard: /owner/pipeline. COG si COA au primit context operational.",
  sourceRole: "SYSTEM",
})
console.log("Notificare:", JSON.stringify(r4))
