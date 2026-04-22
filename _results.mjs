import { PrismaClient } from './src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const completed = await prisma.agentTask.findMany({
  where: { status: 'COMPLETED' },
  orderBy: { updatedAt: 'desc' },
  select: { title: true, assignedTo: true, result: true, updatedAt: true },
});

console.log(`=== ${completed.length} COMPLETED tasks ===\n`);
for (const t of completed) {
  const time = t.updatedAt?.toISOString()?.slice(11, 16);
  const len = t.result?.length || 0;
  const preview = t.result?.slice(0, 800) || '(no result)';
  console.log('='.repeat(60));
  console.log(`[${time}] ${t.assignedTo}: ${t.title}`);
  console.log(`Output (${len} chars):\n`);
  console.log(preview);
  if (len > 800) console.log(`\n... +${len - 800} chars truncated`);
  console.log();
}

const blocked = await prisma.agentTask.findMany({
  where: { status: 'BLOCKED' },
  select: { title: true, assignedTo: true, blockerDescription: true },
});
if (blocked.length) {
  console.log(`\n=== ${blocked.length} BLOCKED ===\n`);
  for (const t of blocked) console.log(`${t.assignedTo}: ${t.title}\n  Blocked: ${t.blockerDescription?.slice(0, 300)}\n`);
}

const failed = await prisma.agentTask.findMany({
  where: { status: 'FAILED' },
  select: { title: true, assignedTo: true, failureReason: true },
});
if (failed.length) {
  console.log(`\n=== ${failed.length} FAILED ===\n`);
  for (const t of failed) console.log(`${t.assignedTo}: ${t.title}\n  Reason: ${t.failureReason?.slice(0, 300)}\n`);
}

await prisma.$disconnect();
