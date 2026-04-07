import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const mediaBooks = [
  { code: 'MB-S1', name: 'Evaluare Personal' },
  { code: 'MB-S2', name: 'Analiza Multigenerațională' },
  { code: 'MB-S3', name: 'Procese Calitate' },
  { code: 'MB-S4', name: 'Cultură și Performanță' },
  { code: 'MB-R1', name: 'Job Grading' },
  { code: 'MB-R2', name: 'Pay Gap Analysis' },
  { code: 'MB-R3', name: 'Joint Assessment' },
]

// Taskuri per echipă (aplicate pe FIECARE media book)
const teamTaskTemplates = [
  // PMP_B2B coordonează fiecare MB
  { assignedTo: 'PMP_B2B', assignedBy: 'CCO', taskType: 'PROCESS_EXECUTION', priority: 'HIGH',
    titleFn: (mb) => `[${mb.code}] Coordonare Media Book — ${mb.name}`,
    descFn: (mb) => `Coordonare echipă interdisciplinară pentru Media Book "${mb.name}". Asigură coerența pe cele 7 secțiuni (context, nevoie, cost amânare, motivație, cum ajută, așteptări, cine suntem). Integrează contribuțiile CWA, HR_COUNSELOR, CJA, DOA, PSYCHOLINGUIST. Versiuni: concis (toggle) + extins. Format: HTML interactiv + PDF.` },

  // CWA — copy/storytelling
  { assignedTo: 'CWA', assignedBy: 'CMA', taskType: 'CONTENT_CREATION', priority: 'HIGH',
    titleFn: (mb) => `[${mb.code}] Copy storytelling — ${mb.name}`,
    descFn: (mb) => `Scrie povestea pentru Media Book "${mb.name}". 7 secțiuni: a) Contextul care generează nevoia, b) Nevoia + impact organizațional, c) Ce se întâmplă dacă amâni, d) De ce am creat asta (emoțional, valori), e) Cum ajută concret, f) Ce așteptări are clientul, g) Cine suntem. Două variante: concis (2-3 paragrafe/secțiune) + extins (detaliu complet). NU template completat — poveste autentică. Ton: ghid muzeu, experiență memorabilă. Clientul zâmbește.` },

  // HR_COUNSELOR — conținut expert
  { assignedTo: 'HR_COUNSELOR', assignedBy: 'PMP_B2B', taskType: 'CONTENT_CREATION', priority: 'MEDIUM',
    titleFn: (mb) => `[${mb.code}] Conținut expert HR — ${mb.name}`,
    descFn: (mb) => `Furnizează conținut de specialitate pentru secțiunile b) (impact organizațional real), c) (consecințe concrete ale amânării) și e) (ce face produsul tehnic). Exemple practice din experiență, nu teorie. Concretizează: ce pățește o companie de 300 angajați fără ${mb.name}.` },

  // CJA — conținut legal
  { assignedTo: 'CJA', assignedBy: 'COG', taskType: 'CONTENT_CREATION', priority: 'MEDIUM',
    titleFn: (mb) => `[${mb.code}] Context legal — ${mb.name}`,
    descFn: (mb) => `Furnizează context legal pentru secțiunile a) (cadru legislativ) și c) (riscuri juridice ale amânării). Directiva EU 2023/970, Codul Muncii, GDPR unde e cazul. Limbaj accesibil, nu juridic. Linkuri către surse legislative.` },

  // PSYCHOLINGUIST — calibrare
  { assignedTo: 'PSYCHOLINGUIST', assignedBy: 'CMA', taskType: 'REVIEW', priority: 'MEDIUM',
    titleFn: (mb) => `[${mb.code}] Calibrare psiholingvistică — ${mb.name}`,
    descFn: (mb) => `Review și calibrare finală pe Media Book "${mb.name}": 1) Adaptat cultural RO (zero anglo-saxonisme), 2) Fir narativ coerent — poveste, nu listing, 3) Ton diferențiat per secțiune (d=emoțional, e=concret, c=urgent dar nu alarmist), 4) Experiență memorabilă — clientul zâmbește. Review DUPĂ ce CWA livrează draft-ul.` },

  // DOA — design
  { assignedTo: 'DOA', assignedBy: 'PMA', taskType: 'CONTENT_CREATION', priority: 'MEDIUM',
    titleFn: (mb) => `[${mb.code}] Design vizual + layout — ${mb.name}`,
    descFn: (mb) => `Design pentru Media Book "${mb.name}": 1) Layout HTML interactiv cu toggle concis/extins (expandare elegantă, naturală), 2) Imagini/ilustrații per secțiune, 3) Ghidaj vizual navigare (clientul știe unde e în poveste), 4) Export PDF interactiv, 5) Stil consistent brand JobGrade dar unic per MB. Inspirație: experiență premium, nu broșură.` },
]

let created = 0

for (const mb of mediaBooks) {
  for (const tmpl of teamTaskTemplates) {
    const title = tmpl.titleFn(mb)
    const description = tmpl.descFn(mb)

    await pool.query(
      `INSERT INTO agent_tasks (id, "businessId", "assignedTo", "assignedBy", title, description, "taskType", priority, status, tags, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::"AgentTaskType", $7::"AgentTaskPriority", 'ASSIGNED'::"AgentTaskStatus", $8, NOW(), NOW())`,
      ['biz_jobgrade', tmpl.assignedTo, tmpl.assignedBy, title, description, tmpl.taskType, tmpl.priority, ['media-book', mb.code, 'interdisciplinary', 'memorable-experience']]
    )
    created++
  }
  console.log(`  ✓ ${mb.code} — ${mb.name}: 6 taskuri (PMP_B2B, CWA, HR_COUNSELOR, CJA, PSYCHOLINGUIST, DOA)`)
}

console.log(`\nTotal: ${created} taskuri create (${mediaBooks.length} MB × 6 agenți)`)
pool.end()
