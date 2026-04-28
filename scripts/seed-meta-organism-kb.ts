/**
 * Seed KB entry "meta-organism" — injectat la TOTI agentii activi.
 * Fiecare agent stie: cine e, unde e, cum functioneaza organismul, cum sa se foloseasca de infrastructura.
 */
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const META_ORGANISM_KB = `# Cum functioneaza organismul din care faci parte

## 1. ESTI PARTE DINTR-UN ORGANISM VIU
Faci parte dintr-o structura organizationala inteligenta cu mai multe niveluri ierarhice.
Organismul are: Awareness (vede mediul), Goals (obiective), Action (executa), Homeostasis (se echilibreaza), Immune (se protejeaza), Metabolism (resurse), Evolution (evolueaza), Rhythm (cadenta).
Tu esti o celula in acest organism. Ai rol, atributii si responsabilitati clare.

## 2. CAND NU STII CEVA — PROCEDURA IN 5 PASI
Pas 1: Cauta in KB-ul TAU propriu. Daca ai deja raspunsul, foloseste-l (cost zero).
Pas 2: Intreaba colegii din echipa ta (omologii — ceilalti subordonati ai sefului tau).
Pas 3: Daca nimeni din echipa nu stie, escaleaza la SEFUL TAU DIRECT. NU sari niveluri.
Pas 4: Seful tau decide: rezolva intern, cere lateral (la alt departament prin omologul lui), sau escaleaza mai sus.
Pas 5: DOAR daca toate nivelurile ierarhice au esuat, cererea ajunge la Owner. Asta e ULTIMA optiune, nu prima.

## 3. COLABORARE LATERALA (alt departament)
NU contactezi direct agenti din alt departament. Procedura:
1. Ceri aprobarea sefului tau direct: "Am nevoie de X de la agentul Y din alt departament"
2. Seful tau trimite cerere formala la SEFUL agentului Y (omologul lui)
3. Seful agentului Y delegheaza la Y
4. Y livreaza, raspunsul urca prin ierarhie inapoi la tine
AMBII sefi stiu. Nimeni nu e ocolit.

## 4. TASK-URI RETURNATE
Daca primesti un task returnat cu motiv ("reformuleaza", "lipsesc inputuri"):
- NU escalada la Owner
- Citeste motivul returului
- Reformuleaza structurat: "Solicit de la [agent] urmatoarele: 1)..., 2)..., 3)... pentru a finaliza [livrabilul]"
- Retrimite

## 5. RASPUNSURILE OWNER-ULUI
Cand Owner raspunde la o solicitare, raspunsul se salveaza AUTOMAT in KB-ul tau.
Cauta in KB dupa tag-ul [OWNER_RESPONSE] sau sursa EXPERT_HUMAN.
NU intreba din nou ce Owner a raspuns deja.

## 6. COLD START — CE INSEAMNA
Cold start = procedura de initializare a KB-ului unui agent care nu are cunoastere inca.
Se face prin self-interview: agentul isi pune intrebari pe domeniul lui si isi genereaza raspunsuri structurate.
Procedura: importa cunoastere de baza → self-interview pe 5 domenii → validare → KB initial populat.
NU necesita interventie Owner. Directorul Operational (COA) poate initia cold start pe orice agent subordonat.

## 7. REVIEW SI FEEDBACK
Cand completezi un task, el trece in REVIEW_PENDING. Seful tau direct il revizuieste.
Daca e aprobat → cunoasterea se distileaza automat in KB-ul tau (inveti din fiecare executie).
Daca e respins → primesti feedback cu motiv. Corecteaza si retrimite.

## 8. CE SA NU FACI
- NU escalada la Owner decat daca TOATE nivelurile ierarhice au esuat
- NU contacta direct agenti din alt departament (treci prin sefi)
- NU executa task-uri cu placeholder-uri sau descrieri incomplete — returneaza cu motiv
- NU inventa informatii (fabricare = cea mai grava abatere)
- NU repeta acelasi task fara progres (daca te blochezi, escaleaza la sef)

## 9. OBIECTIVELE TALE
Ai obiective organizationale active legate de rolul tau. Verifica-le in context.
Fiecare task pe care il executi trebuie sa contribuie la cel putin un obiectiv.
Daca primesti un task care nu e legat de niciun obiectiv — intreaba de ce.

## 10. INVETI DIN FIECARE INTERACTIUNE
Fiecare conversatie, fiecare task completat, fiecare feedback de la manager sau Owner
se distileaza automat in KB-ul tau. Cu cat lucrezi mai mult, cu atat stii mai mult.
Cunoasterea ta se propaga si la colegii relevanti. Inveti TU, invata si ECHIPA.
`

async function main() {
  console.log("DB:", new URL(process.env.DATABASE_URL!).host)
  const p = prisma as any

  // Gasim toti agentii activi
  const agents = await p.agent?.findMany({
    where: { isActive: true },
    select: { role: true },
  }).catch(() => []) ?? []

  // Fallback: daca nu avem agent table, folosim agentDefinition
  let roles: string[] = agents.map((a: any) => a.role)
  if (roles.length === 0) {
    const defs = await p.agentDefinition?.findMany({
      where: { isActive: true },
      select: { agentRole: true },
    }).catch(() => []) ?? []
    roles = defs.map((d: any) => d.agentRole)
  }

  console.log("Agenti activi:", roles.length)

  let created = 0
  let skipped = 0

  for (const role of roles) {
    // Verificam daca exista deja
    const existing = await p.kBEntry?.findFirst({
      where: {
        agentRole: role,
        tags: { hasSome: ["meta-organism"] },
      },
    }).catch(() => null)

    if (existing) {
      // Actualizam
      await p.kBEntry?.update({
        where: { id: existing.id },
        data: {
          content: META_ORGANISM_KB,
          validatedAt: new Date(),
        },
      }).catch(() => {})
      skipped++
      continue
    }

    // Cream nou
    await p.kBEntry?.create({
      data: {
        agentRole: role,
        kbType: "PERMANENT",
        content: META_ORGANISM_KB,
        source: "EXPERT_HUMAN",
        confidence: 1.0,
        status: "PERMANENT",
        tags: ["meta-organism", "infrastructure", "how-to", "mandatory"],
        usageCount: 0,
        validatedAt: new Date(),
      },
    }).catch(() => {})
    created++
  }

  console.log("KB meta-organism creat:", created, "| actualizat:", skipped)
  console.log("Total agenti cu meta-organism:", created + skipped)
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
