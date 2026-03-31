import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Agenți noi de creat ──────────────────────────────────────────────────────

const NEW_AGENTS = [
  // Sub COG direct
  { role: "CFO", name: "Chief Financial Officer", desc: "Director Financiar — buget, P&L, facturare, pricing, revenue recognition, raportare financiară, prognoze", level: "TACTICAL", isManager: true },
  { role: "DPO", name: "Data Protection Officer", desc: "Responsabil protecția datelor — GDPR independent Art. 38(3), registru prelucrări, DPIA, notificări breach, audit conformitate", level: "TACTICAL", isManager: false },

  // Sub CFO
  { role: "FPA", name: "Financial Planning & Analysis", desc: "Planificare financiară, prognoze lunare/trimestriale, KPI SaaS (MRR, ARR, churn revenue), dashboard financiar, documentație audit", level: "OPERATIONAL", isManager: false },
  { role: "RPA_FIN", name: "Revenue & Pricing Analysis", desc: "Strategie pricing, modelare venituri, revenue recognition, validare oferte comerciale cu discount, analiză viabilitate financiară features noi", level: "OPERATIONAL", isManager: false },

  // Sub COCSA → CCO
  { role: "CCO", name: "Chief Commercial Officer", desc: "Director Comercial — coordonează marketing, vânzări B2B/B2C, customer success, parteneriate, revenue operations. Asigură creșterea veniturilor și expansiunea bazei de clienți.", level: "TACTICAL", isManager: true },

  // Sub CCO → DMA
  { role: "DMA", name: "Director Marketing", desc: "Director Marketing — strategie marketing 7P Kotler, buget marketing, coordonare echipă marketing, plan go-to-market, brand positioning", level: "TACTICAL", isManager: true },
  { role: "PMP_B2B", name: "Product Manager Piață B2B", desc: "Product Manager Piață B2B — design ofertă B2B, pachete servicii, pricing B2B, feedback client→produs, poziționare segment organizații", level: "OPERATIONAL", isManager: false },
  { role: "PMP_B2C", name: "Product Manager Piață B2C", desc: "Product Manager Piață B2C — design ofertă B2C, positioning individual, pricing B2C credite/abonamente, experiență utilizator", level: "OPERATIONAL", isManager: false },
  { role: "PMRA", name: "Product Marketing & Research Analyst", desc: "Cercetare piață continuă, tendințe HR SaaS, segmente noi, nevoi nesatisfăcute, interfață CIA, analiză poziționare, business case produse noi", level: "OPERATIONAL", isManager: false },
  { role: "DMM", name: "Digital Marketing Manager", desc: "Campanii digitale Google Ads/LinkedIn/Meta, buget performance marketing, testare canale noi, generare lead-uri calificate", level: "OPERATIONAL", isManager: false },
  { role: "CSEO", name: "Content & SEO Specialist", desc: "Content editorial blog/whitepapers/studii de caz, SEO on/off-page, vizibilitate organică, calendar editorial, nurturing assets", level: "OPERATIONAL", isManager: false },
  { role: "EMAS", name: "Email & Marketing Automation Specialist", desc: "Fluxuri marketing automation, nurturing, lead scoring, drip campaigns, lifecycle marketing, handoff MQL→SQL", level: "OPERATIONAL", isManager: false },
  { role: "SEBC", name: "Sales Enablement & Brand Coordinator", desc: "Materiale vânzări, consistență brand, prezență evenimente/conferințe, materiale co-branded parteneri", level: "OPERATIONAL", isManager: false },

  // Sub CCO → DVB2B, DVB2C
  { role: "DVB2B", name: "Director Vânzări B2B", desc: "Ciclu complet vânzare organizații: prospectare, calificare, demo, propunere, negociere, contractare, onboarding. Pipeline B2B.", level: "TACTICAL", isManager: true },
  { role: "DVB2C", name: "Director Vânzări B2C", desc: "Ciclu vânzare individual: achiziție, conversie, activare, retenție, upsell. Experiență comercială utilizatori individuali.", level: "TACTICAL", isManager: true },
  { role: "DDA", name: "Deal Desk Analyst", desc: "Validare oferte complexe/atipice, conformitate politici discount, coordonare contractare derogări, structurare deal-uri", level: "OPERATIONAL", isManager: false },

  // Sub CCO → CSM, REVOPS, PCA
  { role: "CSM", name: "Customer Success Manager", desc: "Experiență post-vanzare: onboarding, adoptie, sănătate cont, retenție, NRR prin upsell/cross-sell, transformare clienți în ambasadori", level: "TACTICAL", isManager: true },
  { role: "REVOPS", name: "Revenue Operations Manager", desc: "Coerență operațională funcție comercială: CRM unitar, automatizări pipeline, handoff lead→oportunitate→client, KPI comerciali MRR/ARR/CAC/LTV", level: "OPERATIONAL", isManager: false },
  { role: "PCA", name: "Partnerships & Channels Agent", desc: "Parteneriate cabinete HR/consultanță, integratori HRIS/ERP, asociații profesionale, programe afiliere/referral, canal indirect", level: "OPERATIONAL", isManager: false },
]

// ── Relații ierarhice noi ────────────────────────────────────────────────────

const NEW_RELATIONSHIPS = [
  // Sub COG direct
  { parent: "COG", child: "CFO" },
  { parent: "COG", child: "DPO" },
  // DOAS deja mutat la COG

  // Sub CFO
  { parent: "CFO", child: "BCA" },
  { parent: "CFO", child: "FPA" },
  { parent: "CFO", child: "RPA_FIN" },

  // Sub COCSA → CCO
  { parent: "COCSA", child: "CCO" },

  // Sub CCO
  { parent: "CCO", child: "DMA" },
  { parent: "CCO", child: "DVB2B" },
  { parent: "CCO", child: "DVB2C" },
  { parent: "CCO", child: "CSM" },
  { parent: "CCO", child: "REVOPS" },
  { parent: "CCO", child: "PCA" },

  // Sub DMA
  { parent: "DMA", child: "PMP_B2B" },
  { parent: "DMA", child: "PMP_B2C" },
  { parent: "DMA", child: "PMRA" },
  { parent: "DMA", child: "ACA" },
  { parent: "DMA", child: "DMM" },
  { parent: "DMA", child: "CSEO" },
  { parent: "DMA", child: "SMMA" },
  { parent: "DMA", child: "CMA" },
  { parent: "DMA", child: "MKA" },
  { parent: "DMA", child: "EMAS" },
  { parent: "DMA", child: "SEBC" },

  // Sub PMP_B2B
  { parent: "PMP_B2B", child: "HR_COUNSELOR" },

  // Sub CMA
  { parent: "CMA", child: "CWA" },
  { parent: "CMA", child: "GDA" },

  // Sub DVB2B
  { parent: "DVB2B", child: "SOA" },
  { parent: "DVB2B", child: "CDIA" },
  { parent: "DVB2B", child: "DDA" },

  // Sub CSM
  { parent: "CSM", child: "CSSA" },

  // Sub CSSA
  { parent: "CSSA", child: "CSA" },

  // Ops direct sub COCSA
  { parent: "COCSA", child: "ISA" },
  { parent: "COCSA", child: "MOA" },
  { parent: "COCSA", child: "IRA" },
  { parent: "COCSA", child: "MDA" },
]

// ── Relații vechi de șters ────────────────────────────────────────────────────

const OLD_RELATIONSHIPS_TO_REMOVE = [
  // BCA era sub COCSA, acum sub CFO
  { child: "BCA" },
  // ACA, CMA, CWA, MKA erau direct sub COCSA
  { child: "ACA" },
  { child: "CMA" },
  { child: "CWA" },
  { child: "MKA" },
  // SOA, CDIA erau direct sub COCSA
  { child: "SOA" },
  { child: "CDIA" },
  // CSSA era direct sub COCSA
  { child: "CSSA" },
  { child: "CSA" },
  // ISA, MOA, IRA, MDA — refresh relationships
  { child: "ISA" },
  { child: "MOA" },
  { child: "IRA" },
  { child: "MDA" },
  // HR_COUNSELOR era sub PMA
  { child: "HR_COUNSELOR" },
  // GDA, SMMA — no old relationships but clean up
  { child: "GDA" },
  { child: "SMMA" },
  // COAFin — rămâne sub COA, dar curățăm duplicatele
]

async function main() {
  console.log("═══ ACTIVARE NOUA ORGANIGRAMĂ SC ═══\n")

  // 1. Creare agenți noi
  console.log("1) Creare agenți noi...")
  let created = 0
  for (const a of NEW_AGENTS) {
    try {
      await prisma.agentDefinition.create({
        data: {
          agentRole: a.role,
          displayName: a.name,
          description: a.desc,
          level: a.level as any,
          isManager: a.isManager,
          isActive: true,
          objectives: [],
          coldStartPrompts: [],
          createdBy: "OWNER",
        },
      })
      created++
      console.log(`   ✅ ${a.role} — ${a.name}`)
    } catch (e: any) {
      if (e.message.includes("Unique")) {
        // Update existing
        await prisma.agentDefinition.update({
          where: { agentRole: a.role },
          data: { displayName: a.name, description: a.desc, level: a.level as any, isManager: a.isManager },
        })
        console.log(`   🔄 ${a.role} — updated`)
      } else {
        console.log(`   ❌ ${a.role} — ${e.message}`)
      }
    }
  }
  console.log(`   Total: ${created} creați\n`)

  // 2. Ștergere relații vechi
  console.log("2) Curățare relații vechi...")
  for (const r of OLD_RELATIONSHIPS_TO_REMOVE) {
    const deleted = await prisma.agentRelationship.deleteMany({
      where: { childRole: r.child },
    })
    if (deleted.count > 0) console.log(`   🗑 ${r.child} — ${deleted.count} relații șterse`)
  }

  // 3. Creare relații noi
  console.log("\n3) Creare relații noi...")
  let relsCreated = 0
  for (const r of NEW_RELATIONSHIPS) {
    try {
      await prisma.agentRelationship.create({
        data: { parentRole: r.parent, childRole: r.child, relationType: "REPORTS_TO", isActive: true },
      })
      relsCreated++
    } catch (e: any) {
      if (e.message.includes("Unique")) {
        console.log(`   ⚠ ${r.child} → ${r.parent} — exists, updating`)
        await prisma.agentRelationship.updateMany({
          where: { childRole: r.child },
          data: { parentRole: r.parent, isActive: true },
        })
      }
    }
  }
  console.log(`   Total: ${relsCreated} relații create\n`)

  // 4. Seed KB — Hawkins + domeniu pentru agenți noi
  console.log("4) Seed KB pentru agenți noi...")
  const hawkins = await prisma.kBEntry.findMany({
    where: { agentRole: "PSYCHOLINGUIST", tags: { has: "hawkins" }, status: "PERMANENT" },
    select: { content: true, tags: true, confidence: true },
  })

  for (const a of NEW_AGENTS) {
    let kbCount = 0

    // Hawkins KB
    for (const h of hawkins) {
      try {
        await prisma.kBEntry.create({
          data: {
            agentRole: a.role, kbType: "METHODOLOGY", content: h.content,
            source: "EXPERT_HUMAN", confidence: h.confidence, status: "PERMANENT",
            tags: h.tags, usageCount: 0, validatedAt: new Date(),
          },
        })
        kbCount++
      } catch {}
    }

    // Domain KB (basic — from description)
    const domainEntries = [
      `[${a.role}] Rol: ${a.name}. ${a.desc}. Calibrare CÂMP: orice acțiune susține VIAȚA? Operăm mereu peste 200 Hawkins.`,
      `[${a.role}] Principiu comunicare externă: niciodată CE să gândească clientul, mereu CUM. BINELE transpare prin calitatea interacțiunii, nu prin declarație.`,
    ]
    for (const content of domainEntries) {
      try {
        await prisma.kBEntry.create({
          data: {
            agentRole: a.role, kbType: "METHODOLOGY", content,
            source: "EXPERT_HUMAN", confidence: 0.80, status: "PERMANENT",
            tags: ["domain", "role-definition", "field-knowledge"],
            usageCount: 0, validatedAt: new Date(),
          },
        })
        kbCount++
      } catch {}
    }

    console.log(`   ${a.role}: ${kbCount} KB entries`)
  }

  // 5. Update manageri existenți care devin manageri
  console.log("\n5) Update flags manageri...")
  const newManagers = ["CCO", "DMA", "DVB2B", "DVB2C", "CSM", "CFO"]
  for (const m of newManagers) {
    await prisma.agentDefinition.update({
      where: { agentRole: m },
      data: { isManager: true },
    }).catch(() => {})
    console.log(`   ${m} → isManager: true`)
  }

  // 6. Statistici finale
  console.log("\n═══ STATISTICI FINALE ═══")
  const totalAgents = await prisma.agentDefinition.count({ where: { isActive: true } })
  const totalManagers = await prisma.agentDefinition.count({ where: { isActive: true, isManager: true } })
  const totalRels = await prisma.agentRelationship.count({ where: { isActive: true } })
  const totalKB = await prisma.kBEntry.count({ where: { status: "PERMANENT" } })

  console.log(`Agenți activi: ${totalAgents}`)
  console.log(`Manageri: ${totalManagers}`)
  console.log(`Relații: ${totalRels}`)
  console.log(`KB entries: ${totalKB}`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1) })
