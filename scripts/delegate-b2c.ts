import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  const description = [
    "PMA (Product Manager B2C) + DOA + PSYCHOLINGUIST + PPA + SVHA:",
    "",
    "TASK: Preluați metafora crisalidei și implementați-o complet în secțiunea B2C.",
    "",
    "METAMORFOZA (3 faze):",
    "1. CRISALIDĂ — clientul nu știe că nu știe (inconștient incompetent)",
    "   Se transformă în fluture (descoperă ce nu știa despre sine)",
    "2. FLUTURELE — clientul știe că nu știe SAU nu știe că știe",
    "   Învață să zboare (conștientizare + practică)",
    "3. ZBORUL — clientul știe că știe (competent, integrat)",
    "   Apoi urcă la nivelul următor al spiralei → o nouă crisalidă",
    "",
    "MODEL SUPRAPUS:",
    "- Cele 4 cadrane competență (Gordon): inconștient incompetent → conștient incompetent → conștient competent → inconștient competent",
    "- Se REPLICĂ pe verticală: fiecare nivel N are toate 4 cadranele",
    "- Etapa 4 pe nivelul N = poarta spre Etapa 1 pe nivelul N+1 (complexitate superioară)",
    "- Harta conștiinței Hawkins: nivelurile verticale corespund cu scalele de conștiință",
    "- Spirala = mișcarea prin cadrane + ascensiunea pe niveluri Hawkins",
    "",
    "CARDURI B2C existente pe /personal: Profil profesional, Traiectorie carieră, Dezvoltare personală",
    "De propus: carduri care reflectă cele 4 planuri (fizic, mental, emoțional, spiritual) — SVHA informează",
    "",
    "UX PRINCIPII:",
    '- Clientul NU vede termeni tehnici (Hawkins, Gordon, Herrmann)',
    '- Vede POVESTEA LUI: "Înainte să știi", "Ai văzut", "Mergi conștient", "A devenit firesc", "Ești gata pentru mai mult"',
    "- Super simplu, invitant, cald, personal",
    "- Spirala vizuală SVG clickabilă pe profil",
    "- Dialog-centric: Călăuza ghidează, SVHA oferă perspective holistice",
    "- Regula de aur: contextul INVIZIBIL — nu transpare urmărirea",
    "",
    "REFERINȚE:",
    "- docs/brand-identity-revizuita-post-infuzare.md",
    "- Hawkins: 96 KB entries în CÂMP",
    "- SVHA: Yoga (Jnana/Karma/Bhakti), Tao (Wu Wei/Ziran), Ayurveda (Prakriti)",
    "",
    "LIVRABIL: Propunere completă cu: structura cardurilor, flow utilizator, conținut per card, integrare spirală vizuală, rol Călăuza + SVHA.",
  ].join("\n")

  const p = await prisma.orgProposal.create({
    data: {
      proposalType: "MODIFY_OBJECTIVES",
      status: "DRAFT",
      proposedBy: "CLAUDE",
      title: "B2C Metamorfoză — Spirala învățării cu crisalidă + Hawkins",
      description,
      rationale: "Owner solicită implementarea metaforei crisalidei în B2C cu spirala fractală suprapusă pe Hawkins",
      changeSpec: { action: "B2C_DESIGN", assignTo: ["PMA", "DOA", "PSYCHOLINGUIST", "PPA", "SVHA"], deadline: "2026-04-20" },
    },
  })

  console.log("✅", p.title)
  console.log("   ID:", p.id)
  await prisma.$disconnect()
}

main().catch((e) => { console.error("Eroare:", e.message); process.exit(1) })
