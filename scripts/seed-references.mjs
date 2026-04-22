import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({ connectionString: 'postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require' });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

const DOC = 'C:/Users/Liviu/OneDrive/Desktop/exercitiu instalare_visual/documentare';
const KB = path.join(DOC, 'knowledge-base');

let count = 0;

async function seedFile(file, problemClass, agents, teacher) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { return; }
  if (content.length < 100) return;

  // Chunk la 10K dacă e mare
  const chunks = [];
  for (let i = 0; i < Math.min(content.length, 30000); i += 10000) {
    chunks.push(content.slice(i, i + 10000));
  }

  for (const agent of agents) {
    for (let ci = 0; ci < chunks.length; ci++) {
      await p.learningArtifact.create({
        data: {
          studentRole: agent, teacherRole: teacher, problemClass,
          rule: chunks[ci], example: path.basename(file) + (chunks.length > 1 ? ' part ' + (ci+1) : ''),
          antiPattern: 'Sursa verificabila. Zero inventii.',
          sourceType: 'POST_EXECUTION', effectivenessScore: 0.95,
        },
      });
      count++;
    }
  }
  console.log('OK:', path.basename(file), '->', agents.join(', '), '(' + chunks.length + ' chunks)');
}

// 1. Pitariu — metodologie evaluare posturi (sursa de adevăr)
// Primele 30K (fundamentele) — nu tot (747KB)
await seedFile(
  path.join(DOC, '15-owner-inputs/Pitariu-text.txt'),
  'reference-pitariu',
  ['hr-counselor-agent', 'soa-agent', 'cog-agent', 'DOA'],
  'reference-book'
);

// 2. Owner inputs — decizii strategice
await seedFile(
  path.join(DOC, '15-owner-inputs/owner-inputs-pre-filled.md'),
  'owner-decisions',
  ['cog-agent', 'COG', 'coa-agent', 'DMA', 'CFO', 'CJA'],
  'owner'
);

// 3. CCIA — counter-intelligence
await seedFile(
  path.join(KB, 'per-agent/ccia/kb-ccia-analiza-riscuri.md'),
  'agent-kb-ccia',
  ['CCIA'],
  'kb-seed'
);
await seedFile(
  path.join(KB, 'per-agent/ccia/kb-ccia-metodologie.md'),
  'agent-kb-ccia',
  ['CCIA'],
  'kb-seed'
);

// 4. CI — competitive intelligence
await seedFile(
  path.join(KB, 'per-agent/competitive-intelligence/kb-ci-metodologie.md'),
  'agent-kb-ci',
  ['CIA', 'CDIA'],
  'kb-seed'
);
await seedFile(
  path.join(KB, 'per-agent/competitive-intelligence/kb-ci-reguli-operationale.md'),
  'agent-kb-ci',
  ['CIA', 'CDIA'],
  'kb-seed'
);

// 5. LLEAC — principii, strategii
const lleacDir = path.join(DOC, '14-knowledge-base/LLEAC');
for (const subdir of ['principii', 'strategii']) {
  const dir = path.join(lleacDir, subdir);
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      await seedFile(
        path.join(dir, f),
        'lleac-' + subdir,
        ['cog-agent', 'hr-counselor-agent', 'soa-agent'],
        'lleac'
      );
    }
  } catch {}
}

// 6. Per-skill RO rămase (cele care nu au fost infuzate)
const perSkillDir = path.join(KB, 'per-skill');
const perSkillAgents = {
  'analiza-piata-munca': ['CIA', 'RDA', 'DMA'],
  'analiza-psihometrica': ['hr-counselor-agent'],
  'benchmarking-salarial': ['hr-counselor-agent', 'CFO', 'RDA'],
  'dezvoltare-personala': ['hr-counselor-agent', 'COCSA'],
  'evaluare-posturi': ['hr-counselor-agent', 'soa-agent', 'cog-agent'],
  'gdpr-confidentialitate': ['CJA', 'DPA'],
  'orientare-vocationala': ['hr-counselor-agent'],
  'planificare-cariera': ['hr-counselor-agent', 'soa-agent'],
  'transparenta-salariala-eu': ['CJA', 'hr-counselor-agent', 'soa-agent'],
};

for (const [skill, agents] of Object.entries(perSkillAgents)) {
  const dir = path.join(perSkillDir, skill);
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      await seedFile(path.join(dir, f), 'domain-ro-' + skill, agents, 'kb-ro');
    }
  } catch {}
}

// 7. Brand brief
await seedFile(
  path.join(DOC, '16-brand/brand-brief-final.md'),
  'brand-guidelines',
  ['cma-agent', 'CWA', 'CCO', 'DMA', 'soa-agent'],
  'brand'
);

// 8. Competitive intelligence report
await seedFile(
  path.join(DOC, 'competitive-intelligence/CI-001-intellijes-microcare.md'),
  'competitive-intel',
  ['CIA', 'DMA', 'cog-agent'],
  'ci-report'
);

console.log('\nTotal reference artifacts seeded:', count);
await p.$disconnect();
pool.end();
