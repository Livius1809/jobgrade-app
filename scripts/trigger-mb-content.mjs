/**
 * trigger-mb-content.mjs — Delegare conținut Media Books S1-S4 la structura de agenți.
 *
 * Verifică dacă există deja taskuri ASSIGNED/ACCEPTED pentru S1-S4.
 * Dacă nu, le creează cu CWA ca autor principal + template 7 secțiuni.
 * Pipeline-ul autonom (task-executor) le va executa fără intervenție Owner.
 *
 * Usage: node scripts/trigger-mb-content.mjs [--force]
 *   --force  recrează taskurile chiar dacă există deja (ASSIGNED/ACCEPTED)
 */

import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const SERVICES = [
  { code: 'MB-S1', name: 'Evaluarea personalului', slug: 'evaluare-personal',
    context: 'Evaluarea competențelor, armonizarea echipelor, baterie psihometrică' },
  { code: 'MB-S2', name: 'Managementul structurilor și echipelor mixte om-AI', slug: 'analiza-multigenerationala',
    context: 'Dinamica echipelor multigeneraționale, colaborarea om-AI, factori rezultantă' },
  { code: 'MB-S3', name: 'Procese interne și Manualul calității', slug: 'procese-calitate',
    context: 'Armonizarea proceselor furnizor-client, sistem calitate, SOP+KPI+RACI' },
  { code: 'MB-S4', name: 'Cultură organizațională și performanță', slug: 'cultura-performanta',
    context: 'Adaptare la piață, audit cultural, organism viu adaptativ, ROI cultură' },
]

const TEMPLATE_7_SECTIONS = `Scrie conținutul complet pentru acest Media Book. Structura OBLIGATORIE pe 7 secțiuni:

a) CONTEXTUL CARE GENEREAZĂ NEVOIA
   Ce se întâmplă pe piața din România acum care face acest serviciu relevant. Cadru legislativ (Directiva EU 2023/970, Codul Muncii). Fără generalități — concret, cu referințe verificabile.

b) NEVOIA + IMPACTUL ORGANIZAȚIONAL
   Ce pierde o companie de 100-500 angajați fără acest serviciu. Impact pe cifre reale (fluctuație, productivitate, conformitate). Trei perspective: CEO, HR Director, angajat.

c) CE SE ÎNTÂMPLĂ DACĂ AMÂNI
   Consecințe concrete ale amânării: riscuri juridice, costuri ascunse, pierdere competitivitate. Ton urgent dar nu alarmist — onest.

d) DE CE AM CREAT ACEST SERVICIU
   Motivația Psihobusiness Consulting SRL. Experiența în psihologia muncii. Valorile echipei. Ton emoțional dar autentic — fără superlative americane.

e) CUM AJUTĂ CONCRET
   Ce face serviciul tehnic: input → proces → output. Exemple practice de rezultate. Ce primește clientul (rapoarte, recomandări, plan acțiune).

f) CE AȘTEPTĂRI SĂ AIBĂ CLIENTUL
   Termene realiste, efort necesar din partea clientului, ce NU rezolvă acest serviciu. Onestitate radicală.

g) CINE SUNTEM
   Psihobusiness Consulting SRL. Personal specializat acreditat în psihologia muncii, transporturilor și serviciilor, cu formare psihanalitică. ZERO nume proprii, ZERO branduri externe. Platformă JobGrade cu evaluare AI + umană.

REGULI:
- Limba română, ton natural, fără anglo-saxonisme
- Două variante: concis (2-3 paragrafe/secțiune) + extins (detaliu complet)
- NU inventa cifre, certificări sau testimoniale
- Poveste cu fir narativ — experiență memorabilă, nu broșură
- Fără virgulă înainte de "și"`

const TAGS = ['media-book', 'autonomous-generation', 'structure-delegated']

const forceMode = process.argv.includes('--force')

let created = 0
let skipped = 0

for (const svc of SERVICES) {
  // Verifică dacă există deja taskuri active pentru acest MB
  const existing = await pool.query(
    `SELECT id, status, "assignedTo" FROM agent_tasks
     WHERE tags @> $1 AND status IN ('ASSIGNED', 'ACCEPTED', 'REVIEW_PENDING')
     ORDER BY "createdAt" DESC`,
    [JSON.stringify([svc.code, 'media-book'])]
  )

  if (existing.rows.length > 0 && !forceMode) {
    console.log(`  ⏭ ${svc.code} — ${existing.rows.length} taskuri active deja (${existing.rows.map(r => `${r.assignedTo}:${r.status}`).join(', ')})`)
    skipped++
    continue
  }

  // CWA — autor principal, storytelling complet
  await pool.query(
    `INSERT INTO agent_tasks (id, "businessId", "assignedTo", "assignedBy", title, description, "taskType", priority, status, tags, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::"AgentTaskType", $7::"AgentTaskPriority", 'ASSIGNED'::"AgentTaskStatus", $8, NOW(), NOW())`,
    [
      'biz_jobgrade',
      'CWA',           // autor principal
      'CMA',           // asignat de Content Manager
      `[${svc.code}] Copy storytelling autonom — ${svc.name}`,
      `Context specific: ${svc.context}\n\n${TEMPLATE_7_SECTIONS}`,
      'CONTENT_CREATION',
      'HIGH',
      [...TAGS, svc.code, 'cwa-primary-author'],
    ]
  )

  // HR_COUNSELOR — conținut expert secțiunile b, c, e
  await pool.query(
    `INSERT INTO agent_tasks (id, "businessId", "assignedTo", "assignedBy", title, description, "taskType", priority, status, tags, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::"AgentTaskType", $7::"AgentTaskPriority", 'ASSIGNED'::"AgentTaskStatus", $8, NOW(), NOW())`,
    [
      'biz_jobgrade',
      'HR_COUNSELOR',
      'PMP_B2B',
      `[${svc.code}] Conținut expert HR — ${svc.name}`,
      `Furnizează conținut de specialitate pentru Media Book "${svc.name}".\nContext: ${svc.context}\n\nSecțiuni de responsabilitate:\n- b) Impact organizațional real (exemple practice din experiență)\n- c) Consecințe concrete ale amânării\n- e) Ce face serviciul tehnic\n\nConcretizează: ce pățește o companie fără ${svc.name}. NU inventa cifre sau studii de caz.`,
      'CONTENT_CREATION',
      'MEDIUM',
      [...TAGS, svc.code, 'hr-expert-content'],
    ]
  )

  // CJA — context legal secțiunile a, c
  await pool.query(
    `INSERT INTO agent_tasks (id, "businessId", "assignedTo", "assignedBy", title, description, "taskType", priority, status, tags, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::"AgentTaskType", $7::"AgentTaskPriority", 'ASSIGNED'::"AgentTaskStatus", $8, NOW(), NOW())`,
    [
      'biz_jobgrade',
      'CJA',
      'COG',
      `[${svc.code}] Context legal — ${svc.name}`,
      `Furnizează context legal pentru Media Book "${svc.name}".\nContext: ${svc.context}\n\nSecțiuni:\n- a) Cadru legislativ (Directiva EU 2023/970, Codul Muncii, GDPR)\n- c) Riscuri juridice ale amânării\n\nLimbaj accesibil, nu juridic. Linkuri către surse legislative verificabile.`,
      'CONTENT_CREATION',
      'MEDIUM',
      [...TAGS, svc.code, 'legal-context'],
    ]
  )

  // PSYCHOLINGUIST — review calibrare (DUPĂ CWA)
  await pool.query(
    `INSERT INTO agent_tasks (id, "businessId", "assignedTo", "assignedBy", title, description, "taskType", priority, status, tags, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::"AgentTaskType", $7::"AgentTaskPriority", 'ASSIGNED'::"AgentTaskStatus", $8, NOW(), NOW())`,
    [
      'biz_jobgrade',
      'PSYCHOLINGUIST',
      'CMA',
      `[${svc.code}] Calibrare psiholingvistică — ${svc.name}`,
      `Review și calibrare finală pe Media Book "${svc.name}":\n1) Adaptat cultural RO (zero anglo-saxonisme)\n2) Fir narativ coerent — poveste, nu listing\n3) Ton diferențiat per secțiune (d=emoțional, e=concret, c=urgent dar nu alarmist)\n4) Experiență memorabilă — clientul zâmbește\n\nReview DUPĂ ce CWA livrează draft-ul.`,
      'REVIEW',
      'MEDIUM',
      [...TAGS, svc.code, 'psycholinguistic-review'],
    ]
  )

  created += 4
  console.log(`  ✓ ${svc.code} — ${svc.name}: 4 taskuri create (CWA, HR_COUNSELOR, CJA, PSYCHOLINGUIST)`)
}

console.log(`\nRezultat: ${created} taskuri create, ${skipped} MB-uri cu taskuri deja active`)
if (created > 0) {
  console.log(`Pipeline autonom: task-executor va prelua taskurile ASSIGNED la următorul ciclu proactiv.`)
  console.log(`Conținutul completat va fi vizibil prin getMediaBookContent() pe paginile Media Books.`)
}

pool.end()
