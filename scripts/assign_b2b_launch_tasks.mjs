import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const tasks = [
  { assignedTo: 'DMA', assignedBy: 'COG', title: 'Coordonare lansare B2B — plan execuție marketing', description: 'Transformă planul 7P în acțiuni concrete cu timeline săptămânal. Coordonează MKA, ACA, CMA, CWA. Integrează materialele existente (one-pager, pitch deck, email sequences). Livrabil: calendar editorial + campanie awareness per segment.', taskType: 'PROCESS_EXECUTION', priority: 'CRITICAL' },
  { assignedTo: 'MKA', assignedBy: 'DMA', title: 'Campanie awareness B2B — LinkedIn + email outreach', description: 'Pregătire campanie multi-canal per segment (50-200, 200-500, 500-2000 angajați). LinkedIn organic + InMail, email sequences. Mesaj central: Directiva EU 2023/970 + ROI vs consultanță.', taskType: 'OUTREACH', priority: 'HIGH' },
  { assignedTo: 'ACA', assignedBy: 'DMA', title: 'SEO on-page + Google/LinkedIn Ads prep', description: 'Optimizare SEO pe /b2b (keywords: evaluare posturi, transparenta salariala, directiva eu 2023/970). Pregătire campanii Google Ads + LinkedIn Ads per segment. Budget estimat + copy ads.', taskType: 'CONTENT_CREATION', priority: 'HIGH' },
  { assignedTo: 'CMA', assignedBy: 'DMA', title: 'Strategie conținut B2B — calendar editorial 3 luni', description: 'Plan editorial Apr-Iunie 2026: articole blog (2/săpt), studii de caz (1/lună), infografice pay gap, ghiduri practice. Coordonează CWA pentru execuție, GDA pentru design.', taskType: 'CONTENT_CREATION', priority: 'HIGH' },
  { assignedTo: 'CWA', assignedBy: 'CMA', title: 'Copy per pagină platformă + materiale vânzare', description: 'Copy: paginile platformei (about, features, FAQ), primele 4 blog posts, materiale vânzare per rol (HR=conformitate, CEO=risc/ROI, CFO=cost). Ton: ghid muzeu, zero superlative anglo-saxone.', taskType: 'CONTENT_CREATION', priority: 'HIGH' },
  { assignedTo: 'PMP_B2B', assignedBy: 'CCO', title: 'Product positioning B2B — diferențiatori + objection handling', description: 'Document: 5 diferențiatori vs Hay/Mercer/WTW/Excel, objection handling per obiecție tipică, customer journey map prospect-client-advocate. Informează SOA + CWA.', taskType: 'DATA_ANALYSIS', priority: 'HIGH' },
  { assignedTo: 'HR_COUNSELOR', assignedBy: 'PMP_B2B', title: 'Ghiduri practice expert HR pentru prospecți', description: '3 ghiduri: 1) Cum inventariezi pozițiile distincte, 2) Cum formezi comitetul de evaluare, 3) Ce aștepți de la prima sesiune. Ton: consultant care ghidează, nu vinde. Lead magnets via CWA.', taskType: 'CONTENT_CREATION', priority: 'MEDIUM' },
  { assignedTo: 'PSYCHOLINGUIST', assignedBy: 'CMA', title: 'Calibrare ton comunicare B2B — review materiale', description: 'Review psiholingvistic pe toate materialele B2B: adaptat cultural RO, diferențiat pe rol target, fir narativ coerent. Zero clișee americane, poveste nu listing.', taskType: 'REVIEW', priority: 'MEDIUM' },
  { assignedTo: 'DVB2B', assignedBy: 'CCO', title: 'Pipeline primii 20 clienți — lista target + prioritizare', description: 'Lista 50 companii target (200-2000 ang, RO, expunere EU 2023/970), prioritizare top 20, secvență outreach. Surse: RDA market research, CIA competitive intelligence.', taskType: 'DATA_ANALYSIS', priority: 'CRITICAL' },
  { assignedTo: 'SOA', assignedBy: 'DVB2B', title: 'Outreach primii 10 prospecți — contact + demo scheduling', description: 'Contact direct primii 10 din lista DVB2B: InMail/email personalizat, follow-up 3 zile, demo scheduling 20 min. Folosește one-pager + pitch deck + email sequences.', taskType: 'OUTREACH', priority: 'CRITICAL' },
  { assignedTo: 'DOA', assignedBy: 'PMA', title: 'Design assets B2B — infografice + visual pitch deck', description: '3 infografice (ROI, cele 6 criterii, timeline), visual layout pitch deck (10 slides), social media templates. Stil: clean, profesional, brand JobGrade.', taskType: 'CONTENT_CREATION', priority: 'MEDIUM' },
  { assignedTo: 'CJA', assignedBy: 'COG', title: 'Conținut legal B2B — FAQ conformitate + ghid Directiva EU', description: 'FAQ conformitate (10 întrebări EU 2023/970), ghid Directiva pentru non-juriști (2 pag), checklist pregătire conformitate. Materiale educative via CWA.', taskType: 'CONTENT_CREATION', priority: 'HIGH' },
  { assignedTo: 'DOAS', assignedBy: 'COG', title: 'Audit coerență materiale B2B — mesaj unitar', description: 'Audit pe toate materialele B2B: coerență mesaj, consistență pricing/numere, aliniere MVV/brand voice. Raport cu inconsistențe + recomandări corecție.', taskType: 'REVIEW', priority: 'MEDIUM' },
]

let created = 0
for (const t of tasks) {
  await pool.query(
    `INSERT INTO agent_tasks (id, "businessId", "assignedTo", "assignedBy", title, description, "taskType", priority, status, tags, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::"AgentTaskType", $7::"AgentTaskPriority", 'ASSIGNED'::"AgentTaskStatus", $8, NOW(), NOW())`,
    ['biz_jobgrade', t.assignedTo, t.assignedBy, t.title, t.description, t.taskType, t.priority, ['b2b-launch', 'interdisciplinary']]
  )
  created++
  console.log('  ✓', t.assignedTo.padEnd(15), t.title.slice(0, 65))
}

console.log(`\nTotal: ${created} taskuri create pentru echipa interdisciplinară B2B`)
pool.end()
