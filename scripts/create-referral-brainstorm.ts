import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  const bs = await prisma.brainstormSession.create({
    data: {
      topic: "Program Referral B2B + B2C — creare masa critica",
      context: JSON.stringify({
        context: "JobGrade are nevoie de masa critica. Owner solicita brainstorming pe program referral dual B2B+B2C.",
        b2b: "Companii RO 50-250 angajati. Pachete credite: Starter 29RON, Business 79RON, Enterprise 229RON.",
        b2c: "Indivizi cu pseudonim (alias@jobgrade.ro). 6 carduri. Comunitatea crisalidelor planificata.",
        diferentiatori: "Echipa mixta AI + 2 psihologi CPR. SVHA holistic. Dialog-centric. Spirala invatarii.",
        intrebari: [
          "Ce mecanisme referral functioneaza pe B2B HR SaaS?",
          "Cum adaptam referral pentru B2C cu pseudonim?",
          "Cum legam de metafora crisalida/fluture (un fluture aduce o crisalida)?",
          "Ce recompense: credite gratuite, acces premium, badge comunitate?",
          "Cum evitam spam si gaming?",
          "Referral B2B->B2C cross (HR recomanda angajatilor platforma personala)?",
          "Cum integram referral in dialog-centric engine (asistentul sugereaza natural)?",
          "Timing: la pilot sau dupa product-market fit?",
        ],
      }),
      level: "TACTICAL",
      status: "GENERATING",
      initiatedBy: "MKA",
      participantRoles: ["MKA", "ACA", "CMA", "CWA", "SOA", "CSSA", "ACEA", "COG"],
    },
  })
  process.stdout.write("Brainstorm referral creat: " + bs.id + "\n")
  await prisma.$disconnect()
}

main()
