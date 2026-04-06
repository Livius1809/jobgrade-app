import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import Anthropic from "@anthropic-ai/sdk"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

const client = new Anthropic()

async function main() {
  // 1. Fetch all DRAFT proposals
  const drafts = await prisma.orgProposal.findMany({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "asc" },
  })

  process.stdout.write(`\n=== COG REVIEW — ${drafts.length} propuneri DRAFT ===\n\n`)

  for (const proposal of drafts) {
    process.stdout.write(`Reviewing: ${proposal.title.substring(0, 60)}... `)

    try {
      // COG auto-review via Claude
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Ca COG (Chief Orchestrator General) al platformei JobGrade, evaluează această propunere:

Tip: ${proposal.proposalType}
Titlu: ${proposal.title}
Descriere: ${proposal.description.substring(0, 2000)}
Rațional: ${proposal.rationale}
Spec: ${JSON.stringify(proposal.changeSpec)}

Evaluează:
1. E necesar? (gap real sau optimizare prematură?)
2. E fezabil cu resursele existente (47 agenți AI)?
3. Riscuri?
4. Prioritate (1-5)?

Răspunde JSON: {"approved": true/false, "comment": "explicație scurtă max 200 chars", "priority": 1-5, "risks": ["risc1"]}`,
        }],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : "{}"
      const match = text.match(/\{[\s\S]*\}/)

      if (match) {
        const parsed = JSON.parse(match[0])
        const approved = parsed.approved ?? true
        const cogComment = `${parsed.comment || ""}${parsed.risks?.length ? ` Riscuri: ${parsed.risks.join("; ")}` : ""} [Prioritate: ${parsed.priority || "?"}]`

        await prisma.orgProposal.update({
          where: { id: proposal.id },
          data: {
            status: approved ? "COG_REVIEWED" : "REJECTED",
            reviewedByCog: true,
            cogComment,
          },
        })

        process.stdout.write(approved ? "✅ APPROVED" : "❌ REJECTED")
        process.stdout.write(` — ${cogComment.substring(0, 80)}\n`)
      } else {
        process.stdout.write("⚠️ Parse failed, skipping\n")
      }
    } catch (e: any) {
      process.stdout.write(`❌ Error: ${e.message.substring(0, 60)}\n`)
    }

    // Rate limit: 1s pause between reviews
    await new Promise(r => setTimeout(r, 1000))
  }

  // 2. Summary
  const reviewed = await prisma.orgProposal.findMany({
    where: { status: { in: ["COG_REVIEWED", "REJECTED"] }, reviewedByCog: true },
    orderBy: { updatedAt: "desc" },
    take: 15,
    select: { title: true, status: true, cogComment: true },
  })

  process.stdout.write(`\n=== REZUMAT ===\n`)
  const approved = reviewed.filter((r: any) => r.status === "COG_REVIEWED").length
  const rejected = reviewed.filter((r: any) => r.status === "REJECTED").length
  process.stdout.write(`Approved: ${approved} | Rejected: ${rejected}\n`)
  process.stdout.write(`\nAșteaptă decizia Owner (approve/reject/defer) pe cele COG_REVIEWED.\n`)

  await prisma.$disconnect()
}

main()
