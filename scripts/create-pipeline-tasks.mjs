import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const tasks = [
  // TIER 1 — BLOCKER
  { assignedTo: 'CJA', assignedBy: 'COA', title: 'FAQ legal + conformitate B2B — document client-facing',
    description: 'Creaza FAQ legal pentru primul client B2B: baza legala evaluare posturi, conformitate Directiva EU 2023/970, GDPR, AI Act Art.14. Limbaj accesibil, nu juridic. Validare cu PSYCHOLINGUIST pentru ton.',
    taskType: 'CONTENT_CREATION', priority: 'IMPORTANT_URGENT', tags: ['tier1', 'blocker', 'legal', 'first-client'] },
  { assignedTo: 'CMA', assignedBy: 'COA', title: 'MB-R1 Media Book Job Grading — storytelling copy',
    description: 'Scrie cele 7 sectiuni narative ale Media Book-ului R1 (Job Grading): context, nevoie, cost intarziere, motivatie, cum ajuta, asteptari, cine suntem. Ton: poveste cu fir narativ, nu brosura. Coordoneaza cu CWA (copy), PSYCHOLINGUIST (calibrare lingvistica + adaptare culturala RO), GDA (design + coerenta vizuala brand). Adaptare culturala RO: fara superlative americane, dreapta masura, informare nu vanzare.',
    taskType: 'CONTENT_CREATION', priority: 'IMPORTANT_URGENT', tags: ['tier1', 'blocker', 'media-book', 'mb-r1', 'first-client'] },
  { assignedTo: 'CWA', assignedBy: 'COA', title: 'MB-R1 copy final + calibrare psiholingvistica + adaptare culturala',
    description: 'Finalizare copy MB-R1 dupa draft CMA. Calibrare cu PSYCHOLINGUIST: registru adecvat per rol (HR Dir=specialist, CEO=business). Adaptare culturala RO: terminologie precisa, ton profesional fara exagerari, coerenta cu brand voice JobGrade.',
    taskType: 'CONTENT_CREATION', priority: 'IMPORTANT_URGENT', tags: ['tier1', 'blocker', 'media-book', 'mb-r1', 'copy', 'cultural'] },
  { assignedTo: 'GDA', assignedBy: 'COA', title: 'MB-R1 + materiale vizuale — design coerenta brand + identitate vizuala',
    description: 'Design MB-R1: layout HTML interactiv (toggle concis/extins), PDF export. Coerenta cu identitatea vizuala JobGrade: spiral variabil (favicon aprobat), paleta culori brand, tipografie. Armonizare cu tot ce s-a facut vizual pana acum. Infografice explicative pentru metodologia de evaluare. Verifica ca tot ce iese vizual e unitar cu brandul.',
    taskType: 'CONTENT_CREATION', priority: 'IMPORTANT_URGENT', tags: ['tier1', 'blocker', 'design', 'brand', 'visual-identity'] },
  { assignedTo: 'PSYCHOLINGUIST', assignedBy: 'COA', title: 'Calibrare lingvistica + culturala toate materialele Tier 1',
    description: 'Review si calibrare toate materialele client-facing din Tier 1: FAQ legal, MB-R1, landing page. Verificare: ton adecvat per rol destinatar, adaptare culturala RO (zero superlative americane, storytelling nu pitch), coerenta registru intre materiale, terminologie consistenta romana.',
    taskType: 'REVIEW', priority: 'IMPORTANT_URGENT', tags: ['tier1', 'blocker', 'calibrare', 'cultural', 'psiholingvistica'] },
  { assignedTo: 'CSM', assignedBy: 'COA', title: 'Onboarding setup template executabil — primul client',
    description: 'Pregateste template-ul de onboarding executabil: creare cont companie, import posturi, invitare comitet evaluare, prima sesiune evaluare, check-in saptamanal. Pas cu pas, cu checklist.',
    taskType: 'PROCESS_EXECUTION', priority: 'URGENT', tags: ['tier1', 'blocker', 'onboarding', 'first-client'] },
  { assignedTo: 'COCSA', assignedBy: 'COA', title: 'Audit coerenta brand + identitate vizuala — toate materialele Tier 1',
    description: 'Verifica ca TOATE materialele (FAQ, MB-R1, landing, design, infografice) spun acelasi lucru, au aceeasi voce, aceeasi promisiune, aceeasi identitate vizuala. Brand voice unitar. Armonizare cu ce s-a facut anterior. Semnaleaza orice discrepanta.',
    taskType: 'REVIEW', priority: 'IMPORTANT_URGENT', tags: ['tier1', 'blocker', 'brand-coherence', 'audit', 'visual-identity'] },

  // TIER 2 — Prima saptamana
  { assignedTo: 'DVB2B', assignedBy: 'COA', title: 'Pipeline primii 20 prospectivi B2B',
    description: 'Lista cu 20 companii RO 50-250 angajati, prioritizate: industrie, contact HR, probabilitate, note. Coordonare cu CIA (research) si MKA (segmentare).',
    taskType: 'DATA_ANALYSIS', priority: 'URGENT', tags: ['tier2', 'pipeline', 'prospects', 'first-client'] },
  { assignedTo: 'CMA', assignedBy: 'COA', title: 'Secventa email outreach (3 emails)',
    description: '3 email-uri: (1) intro + valoare, (2) studiu de caz/dovada sociala, (3) invitatie demo. Ton: informare nu vanzare, curiozitate, dreapta masura. Coordonare cu SOA pentru personalizare per prospect.',
    taskType: 'CONTENT_CREATION', priority: 'URGENT', tags: ['tier2', 'outreach', 'email', 'sales'] },
  { assignedTo: 'GDA', assignedBy: 'COA', title: 'Pitch deck + infografice prezentare',
    description: 'Slide deck 10-15 slides: problema, solutie, cum functioneaza, echipa, pricing, next steps. Infografice: flux evaluare, cele 6 criterii, cum se obtine ierarhia. Coerenta brand.',
    taskType: 'CONTENT_CREATION', priority: 'IMPORTANT', tags: ['tier2', 'design', 'pitch-deck', 'infographics'] },

  // TIER 3 — Prima luna
  { assignedTo: 'CMA', assignedBy: 'COA', title: 'Media Books R2, R3, S1-S4 (draft)',
    description: 'Draft-uri pentru celelalte 6 Media Books. Prioritate: MB-R2 (Pay Gap), MB-S1 (Evaluare Personal). Aceeasi structura 7 sectiuni ca MB-R1.',
    taskType: 'CONTENT_CREATION', priority: 'IMPORTANT', tags: ['tier3', 'media-books', 'content'] },
  { assignedTo: 'CSEO', assignedBy: 'DMA', title: 'SEO on-page + pregatire ads',
    description: 'Keyword research HR evaluare posturi Romania. Optimizare meta tags, heading structure, content pillars pe blog. Pregatire Google Ads + LinkedIn Ads.',
    taskType: 'DATA_ANALYSIS', priority: 'IMPORTANT', tags: ['tier3', 'seo', 'ads', 'marketing'] },
  { assignedTo: 'SMMA', assignedBy: 'DMA', title: 'Campanie awareness LinkedIn organic',
    description: 'Calendar 4 saptamani LinkedIn: 3 posturi/sapt, mix educativ/inspirational. Teme: de ce conteaza evaluarea posturilor, Directiva EU, echitate salariala.',
    taskType: 'CONTENT_CREATION', priority: 'IMPORTANT', tags: ['tier3', 'social-media', 'linkedin', 'awareness'] },
  { assignedTo: 'CWA', assignedBy: 'DMA', title: 'Ghiduri HR descarcabile (lead magnets)',
    description: '2-3 ghiduri PDF: Ghid evaluare posturi (ce, de ce, cum), Checklist conformitate Directiva EU, Ghid rapid pay gap. Lead magnets pentru landing page.',
    taskType: 'CONTENT_CREATION', priority: 'NECESAR', tags: ['tier3', 'lead-magnets', 'content', 'hr-guides'] },
]

let created = 0
for (const t of tasks) {
  await pool.query(`
    INSERT INTO agent_tasks (id, "businessId", "assignedBy", "assignedTo", title, description, "taskType", priority, status, tags, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'biz_jobgrade', $1, $2, $3, $4, $5, $6, 'ASSIGNED', $7, NOW(), NOW())
  `, [t.assignedBy, t.assignedTo, t.title, t.description, t.taskType, t.priority, t.tags])
  created++
}
console.log('Taskuri create:', created)

// Task COA coordonare
await pool.query(`
  INSERT INTO agent_tasks (id, "businessId", "assignedBy", "assignedTo", title, description, "taskType", priority, status, tags, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, 'biz_jobgrade', 'OWNER', 'COA',
    'Coordoneaza pipeline primul client B2B — propaga taskuri Tier 1/2/3',
    'Au fost create 14 taskuri pe 3 tiers. Responsabilitatea ta:\n1. Verifica ca fiecare agent a primit si inteles taskul\n2. Stabileste dependente (CMA draft → CWA calibreaza → GDA design → PSYCHOLINGUIST review → COCSA audit)\n3. Monitorizeaza progresul zilnic\n4. Escaleaza blocaje la COG\n5. Raporteaza Owner zilnic statusul in Inbox',
    'PROCESS_EXECUTION', 'IMPORTANT_URGENT', 'ASSIGNED',
    ARRAY['pipeline', 'coordonare', 'first-client', 'tier1', 'tier2', 'tier3'],
    NOW(), NOW())
`)
console.log('COA coordonare task creat')

// Notifica Owner
const owner = await pool.query(`SELECT id FROM users WHERE role IN ('OWNER','SUPER_ADMIN') LIMIT 1`)
if (owner.rows[0]) {
  await pool.query(`
    INSERT INTO notifications (id, "userId", type, title, body, read, "sourceRole", "requestKind", "requestData", "createdAt")
    VALUES (gen_random_uuid()::text, $1, 'GENERAL',
      'Pipeline primul client B2B — 15 taskuri create pe 3 tiers',
      E'TIER 1 (BLOCKER, 7 taskuri): FAQ legal, MB-R1 (storytelling+copy+design+calibrare culturala+audit coerenta brand), onboarding\nTIER 2 (Sapt 1, 3 taskuri): pipeline 20 prospecti, outreach 3 emails, pitch deck\nTIER 3 (Luna 1, 4 taskuri): alte Media Books, SEO+ads, LinkedIn, lead magnets\n\nCOA coordoneaza. Raport zilnic in Inbox.',
      false, 'OWNER', 'INFORMATION',
      '{"isReport": true, "category": "pipeline-client"}',
      NOW())
  `, [owner.rows[0].id])
  console.log('Notificare Owner creata')
}

pool.end()
