import { config } from "dotenv"
config()

import { PrismaClient } from "./src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { searchKB, getKBHealth } from "./src/lib/kb/search"
import { buildKBContext } from "./src/lib/kb/inject"
import { analyzeLinguisticProfile } from "./src/lib/kb/linguistic-profile"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=== TEST KB — QUERY & INJECT ===\n")

  // Test 1: Health per agent
  console.log("1. Health check per agent...")
  for (const role of ["HR_COUNSELOR", "PSYCHOLINGUIST", "DOAS", "SAFETY_MONITOR", "SYSTEM"]) {
    const h = await getKBHealth(role)
    console.log(`   ${role}: ${h.permanentCount} permanent, ${h.bufferCount} buffer, confidence avg=${h.avgConfidence.toFixed(2)}`)
  }

  // Test 2: Căutare semantică (full-text)
  console.log("\n2. Căutare full-text...")

  const searches = [
    { role: "HR_COUNSELOR", query: "evaluator diferenta subfactor consens" },
    { role: "HR_COUNSELOR", query: "pay gap EU transparenta salariala" },
    { role: "PSYCHOLINGUIST", query: "registru formal romana calibrare" },
    { role: "PSYCHOLINGUIST", query: "frustrare client escaladare operator" },
    { role: "SAFETY_MONITOR", query: "trigger autoagresiune escaladare" },
    { role: "SYSTEM", query: "criterii evaluare metodologie JobGrade" },
  ]

  for (const s of searches) {
    const results = await searchKB(s.role, s.query, 3)
    console.log(`   [${s.role}] "${s.query.slice(0, 40)}" → ${results.length} rezultate`)
    if (results.length > 0) {
      console.log(`      Top: ${results[0].content.slice(0, 80)}...`)
    }
  }

  // Test 3: buildKBContext (injectare în system prompt)
  console.log("\n3. Injectare context în system prompt...")
  const ctx = await buildKBContext({
    agentRole: "HR_COUNSELOR",
    context: "Am nevoie de ajutor cu procesul de consens — evaluatorii nu se înțeleg pe scoruri",
    limit: 3,
  })
  if (ctx) {
    console.log(`   ✅ Context generat (${ctx.length} caractere):`)
    console.log("   ---")
    console.log(ctx.slice(0, 400) + "...")
    console.log("   ---")
  } else {
    console.log("   ❌ Context gol")
  }

  // Test 4: Profil lingvistic
  console.log("\n4. Analiză profil lingvistic...")
  const profiles = [
    {
      label: "Expert HR (formal, EN+RO)",
      expect: "FORMAL/VERY_FORMAL + EXPERT",
      msgs: ["Am nevoie de o metodologie de job grading aliniată cu benchmark-ul Hay Group. Avem 3 grade definite, dar structura nu reflectă ierarhia reală."],
    },
    {
      label: "Novice informal (fără diacritice)",
      expect: "INFORMAL/CASUAL + NOVICE",
      msgs: ["buna! vreau sa stiu cum se face evaluarea joburilor la noi in firma, nu am mai facut asta niciodata"],
    },
    {
      label: "Manager multinațional (cod-switching)",
      expect: "FORMAL + PROFESSIONAL",
      msgs: ["We need to align our grading approach cu ce face grupul. Avem o directivă de la HQ, dar nu știm cum să o implementăm local în contextul organizației."],
    },
    {
      label: "B2C casual tânăr",
      expect: "CASUAL + NOVICE",
      msgs: ["salut! am nevoie de ajutor cu cariera mea, nu stiu ce sa fac mai departe 😅"],
    },
    {
      label: "B2C frustrat",
      expect: "INFORMAL + NOVICE",
      msgs: ["nu ma descurc deloc, am incercat de mai multe ori si nu merge nimic, nu stiu ce sa fac"],
    },
    {
      label: "HR Director very formal",
      expect: "VERY_FORMAL + EXPERT",
      msgs: ["Doresc să implementăm o strategie de evaluare a posturilor care să fie aliniată cu obiectivele organizației și să respecte metodologia point-factor în contextul directivei EU 2023/970 privind transparența salarială. Avem în vedere o abordare structurată pe mai multe etape."],
    },
  ]

  for (const p of profiles) {
    const profile = analyzeLinguisticProfile(p.msgs)
    const ok = true // vizual
    console.log(`   [${p.label}]`)
    console.log(`      expect: ${p.expect}`)
    console.log(`      got:    formality=${profile.formalityLevel}, domain=${profile.domainKnowledge}, complexity=${profile.textComplexity}, avgLen=${profile.avgSentenceLength}`)
    console.log(`      score:  ${profile.indicators.join(" | ") || "—"}`)
  }

  console.log("\n=== DONE ===")
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
