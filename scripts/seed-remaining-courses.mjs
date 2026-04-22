import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({ connectionString: 'postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require' });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

const BASE = 'C:/Users/Liviu/OneDrive/Desktop/exercitiu instalare_visual/jobgrade_team';
const PERSKILL = 'C:/Users/Liviu/OneDrive/Desktop/exercitiu instalare_visual/documentare/knowledge-base/per-skill';

// Cursuri
const courses = [
  { file: path.join(BASE, 'kb/courses/var_primara/customer_relations.txt'), name: 'customer-relations',
    agents: ['soa-agent','hr-counselor-agent','COCSA','CSM','CSA','CSSA','CCO','cog-agent'] },
  { file: path.join(BASE, 'kb/courses/var_primara/interpersonal_skills.txt'), name: 'interpersonal-skills',
    agents: ['soa-agent','hr-counselor-agent','COCSA','CSM','CSA','CSSA','CCO','cog-agent','cma-agent','DVB2B'] },
];

// Skills mapping
const skillMap = {
  'customer-success-methodology': ['COCSA','CSM','CSA','CSSA'],
  'conflict-harmonization': ['hr-counselor-agent','COCSA','CSM'],
  'counselor-guidance': ['hr-counselor-agent','soa-agent'],
  'hr-psychology': ['hr-counselor-agent','DOA'],
  'organizational-behavior': ['hr-counselor-agent','DOA','cog-agent'],
  'organizational-culture-assessment': ['hr-counselor-agent','DOA','COCSA'],
  'cultural-competence-framework': ['hr-counselor-agent','soa-agent','CCO'],
  'stakeholder-communication': ['cog-agent','CCO','soa-agent'],
  'competitive-objection-handling': ['soa-agent','DMA'],
  'b2b-sales-methodology': ['soa-agent','DVB2B','DMA'],
  'upsell-expansion-strategies': ['soa-agent','COCSA','DMA'],
  'market-analysis': ['CIA','DMA','RDA'],
  'sentiment-analysis': ['CIA','COCSA','cma-agent'],
  'multigenerational-team-management': ['hr-counselor-agent','DOA'],
  'generational-diversity-consulting': ['hr-counselor-agent','DOA'],
  'group-dynamics-analysis': ['hr-counselor-agent'],
  'behavioral-pattern-analysis': ['hr-counselor-agent','CCIA'],
  'socio-professional-profiling': ['hr-counselor-agent','soa-agent'],
  'strategic-planning-okr': ['cog-agent','PMA'],
  'prioritization-frameworks': ['PMA','cog-agent'],
  'risk-assessment': ['CJA','SVHA','cog-agent'],
  'budget-allocation': ['CFO','cog-agent'],
  'statistical-analysis': ['RDA','CFO'],
  'ticket-triage-escalation': ['CSM','CSSA','cog-agent'],
  'incident-response': ['SVHA','coa-agent'],
  'knowledge-base-authoring': ['cog-agent','coa-agent'],
};

// Per-skill RO
const perSkillMap = {
  'evaluare-posturi': ['hr-counselor-agent','soa-agent','cog-agent'],
  'benchmarking-salarial': ['hr-counselor-agent','CFO','RDA'],
  'transparenta-salariala-eu': ['CJA','hr-counselor-agent','soa-agent'],
  'gdpr-confidentialitate': ['CJA','DPA'],
  'analiza-piata-munca': ['CIA','RDA','DMA'],
  'analiza-psihometrica': ['hr-counselor-agent'],
  'dezvoltare-personala': ['hr-counselor-agent','COCSA'],
  'orientare-vocationala': ['hr-counselor-agent'],
  'planificare-cariera': ['hr-counselor-agent','soa-agent'],
  'competitive-intelligence-methodology': ['CIA','CCIA'],
  'counter-intelligence-methodology': ['CCIA'],
};

let count = 0;

// 1. Cursuri
for (const { file, name, agents } of courses) {
  const content = fs.readFileSync(file, 'utf8');
  const chunks = [];
  for (let i = 0; i < content.length; i += 8000) chunks.push(content.slice(i, i + 8000));
  const top = chunks.slice(0, 3);
  for (const agent of agents) {
    for (let ci = 0; ci < top.length; ci++) {
      await p.learningArtifact.create({
        data: { studentRole: agent, teacherRole: 'course-owner', problemClass: 'course-' + name,
          rule: top[ci], example: name + ' part ' + (ci+1), antiPattern: 'Aplica in contextul JobGrade.',
          sourceType: 'POST_EXECUTION', effectivenessScore: 0.95 },
      });
      count++;
    }
  }
  console.log('Course:', name, '->', agents.length, 'agents x', top.length, 'chunks');
}

// 2. Skills
for (const [skillName, agents] of Object.entries(skillMap)) {
  let content = '';
  try { content = fs.readFileSync(path.join(BASE, 'skills', skillName + '.md'), 'utf8'); } catch {
    try { content = fs.readFileSync(path.join(BASE, 'skills', skillName, 'SKILL.md'), 'utf8'); } catch { continue; }
  }
  if (content.length < 50) continue;
  for (const agent of agents) {
    await p.learningArtifact.create({
      data: { studentRole: agent, teacherRole: 'skill-library', problemClass: 'skill-' + skillName,
        rule: content.slice(0, 10000), example: 'Skill: ' + skillName, antiPattern: 'Adapteaza la JobGrade.',
        sourceType: 'POST_EXECUTION', effectivenessScore: 0.95 },
    });
    count++;
  }
  console.log('Skill:', skillName, '->', agents.length, 'agents');
}

// 3. Per-skill RO
for (const [skillName, agents] of Object.entries(perSkillMap)) {
  let content = '';
  try {
    const dir = path.join(PERSKILL, skillName);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const f of files.slice(0, 3)) content += fs.readFileSync(path.join(dir, f), 'utf8') + '\n\n';
  } catch { continue; }
  if (content.length < 50) continue;
  for (const agent of agents) {
    await p.learningArtifact.create({
      data: { studentRole: agent, teacherRole: 'kb-ro', problemClass: 'domain-ro-' + skillName,
        rule: content.slice(0, 10000), example: 'Cunostinte RO: ' + skillName, antiPattern: 'Sursa verificabila.',
        sourceType: 'POST_EXECUTION', effectivenessScore: 0.95 },
    });
    count++;
  }
  console.log('Per-skill RO:', skillName, '->', agents.length, 'agents');
}

console.log('\nTotal seeded:', count);
await p.$disconnect();
pool.end();
