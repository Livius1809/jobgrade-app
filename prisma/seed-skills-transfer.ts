import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import * as fs from "fs"
import * as path from "path"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const COURSE_BASE = "C:/Users/Liviu/OneDrive/Desktop/exercitiu instalare_visual/curs_AI Silviu Popescu"

// Skill → Agent mapping
const SKILL_MAPPING: Array<{ file: string; agents: string[]; skillName: string }> = [
  // Marketing skills
  { file: "marketing-20260318T204921Z-1-001/marketing/ad-copy-creator.md", agents: ["ACA", "DMM", "EMAS"], skillName: "ad-copy-creator" },
  { file: "marketing-20260318T204921Z-1-001/marketing/blog-writer.md", agents: ["CMA", "CSEO", "PMRA"], skillName: "blog-writer" },
  { file: "marketing-20260318T204921Z-1-001/marketing/copywriter.md", agents: ["CWA", "ACA", "SEBC"], skillName: "copywriter" },
  { file: "marketing-20260318T204921Z-1-001/marketing/email-writer.md", agents: ["EMAS", "CMA", "ACA"], skillName: "email-writer" },
  { file: "marketing-20260318T204921Z-1-001/marketing/landing-page-writer.md", agents: ["CWA", "ACA", "DMM"], skillName: "landing-page-writer" },
  { file: "marketing-20260318T204921Z-1-001/marketing/seo-optimizer.md", agents: ["CSEO", "CMA", "DMM"], skillName: "seo-optimizer" },
  { file: "marketing-20260318T204921Z-1-001/marketing/social-media-creator.md", agents: ["SMMA", "ACA", "CMA"], skillName: "social-media-creator" },
  // Business skills
  { file: "business-20260318T204906Z-1-001/business/business-model-analyzer.md", agents: ["CCO", "DMA", "PMP_B2B", "PMP_B2C"], skillName: "business-model-analyzer" },
  { file: "business-20260318T204906Z-1-001/business/financial-planner.md", agents: ["CFO", "FPA", "RPA_FIN"], skillName: "financial-planner" },
  { file: "business-20260318T204906Z-1-001/business/market-researcher.md", agents: ["PMRA", "DMA", "PMP_B2B", "PMP_B2C"], skillName: "market-researcher" },
  { file: "business-20260318T204906Z-1-001/business/pricing-strategist.md", agents: ["DMA", "CCO", "PMP_B2B", "PMP_B2C", "RPA_FIN"], skillName: "pricing-strategist" },
  // Skill pack skills
  { file: "Skill pack_brainstorming-20260318T204935Z-1-001/Skill pack_brainstorming/.claude/skills/analyzing-financial-statements/SKILL.md", agents: ["CFO", "FPA", "RPA_FIN"], skillName: "analyzing-financial-statements" },
  { file: "Skill pack_brainstorming-20260318T204935Z-1-001/Skill pack_brainstorming/.claude/skills/applying-brand-guidelines/SKILL.md", agents: ["GDA", "SEBC", "ACA"], skillName: "applying-brand-guidelines" },
  { file: "Skill pack_brainstorming-20260318T204935Z-1-001/Skill pack_brainstorming/.claude/skills/competitive-ads-extractor/SKILL.md", agents: ["DMM", "ACA", "PMRA", "CIA"], skillName: "competitive-ads-extractor" },
  { file: "Skill pack_brainstorming-20260318T204935Z-1-001/Skill pack_brainstorming/.claude/skills/creating-financial-models/SKILL.md", agents: ["CFO", "FPA", "RPA_FIN"], skillName: "creating-financial-models" },
  { file: "Skill pack_brainstorming-20260318T204935Z-1-001/Skill pack_brainstorming/.claude/skills/deep-researcher/SKILL.md", agents: ["PMRA", "RDA", "CIA", "DMA"], skillName: "deep-researcher" },
]

async function main() {
  console.log("═══ TRANSFER SKILLS → AGENȚI ═══\n")

  let totalEntries = 0
  let totalAgents = new Set<string>()

  for (const mapping of SKILL_MAPPING) {
    const filePath = path.join(COURSE_BASE, mapping.file)

    let content: string
    try {
      content = fs.readFileSync(filePath, "utf8")
    } catch {
      console.log(`⚠ Skip ${mapping.skillName} — file not found`)
      continue
    }

    // Extract skill description (first 500 chars after frontmatter)
    const bodyStart = content.indexOf("---", 3)
    const body = bodyStart > 0 ? content.substring(bodyStart + 3).trim() : content
    const summary = body.substring(0, 400).replace(/\n/g, " ").trim()

    // Seed to each target agent
    for (const agent of mapping.agents) {
      try {
        await prisma.kBEntry.create({
          data: {
            agentRole: agent,
            kbType: "METHODOLOGY",
            content: `[SKILL: ${mapping.skillName}] ${summary}`,
            source: "EXPERT_HUMAN",
            confidence: 0.80,
            status: "PERMANENT",
            tags: ["skill", mapping.skillName, "silviu-popescu-course"],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        totalEntries++
        totalAgents.add(agent)
      } catch { /* duplicate */ }
    }

    console.log(`✅ ${mapping.skillName} → ${mapping.agents.join(", ")}`)
  }

  const totalKB = await prisma.kBEntry.count({ where: { status: "PERMANENT" } })
  console.log(`\n═══ REZULTAT ═══`)
  console.log(`Skills transferate: ${SKILL_MAPPING.length}`)
  console.log(`KB entries create: ${totalEntries}`)
  console.log(`Agenți beneficiari: ${totalAgents.size}`)
  console.log(`Total KB: ${totalKB}`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1) })
