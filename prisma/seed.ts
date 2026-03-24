import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding criteria and subfactors...");

  const criteriaData = [
    {
      name: "Educație / Experiență",
      description:
        "Reflectă ce trebuie să știe un individ pentru a-și îndeplini atribuțiile satisfăcător și cu competență. Evaluează ce tip de educație/experiență este necesară pentru a îndeplini responsabilitățile poziției și a atinge obiectivele.",
      category: "Cunoștințe",
      order: 1,
      subfactors: [
        {
          code: "A",
          points: 16,
          order: 1,
          description:
            "Liceu nefinalizat sau echivalent / Fără experiență. Aceste poziții urmează instrucțiuni detaliate. Sunt necesare aptitudini de citire, scriere, matematică.",
        },
        {
          code: "B",
          points: 32,
          order: 2,
          description:
            "Liceu absolvit sau echivalent / 6-12 luni experiență. Aceste poziții urmează instrucțiuni și înțeleg proceduri.",
        },
        {
          code: "C",
          points: 48,
          order: 3,
          description:
            "Liceu absolvit sau echivalent (plus cursuri de specialitate) / 1-2 ani experiență. Aceste poziții urmează procedurile generale ale biroului și responsabilitățile variate aparținând propriului domeniu de expertiză.",
        },
        {
          code: "D",
          points: 64,
          order: 4,
          description:
            "Absolvent învățământ superior (colegiu) sau echivalent / 2-3 ani experiență. Aceste poziții urmează proceduri cu grad de complexitate moderat și repartizări de activități. Necesită înțelegerea nivelului profesional de bază și sunt orientate tactic.",
        },
        {
          code: "E",
          points: 80,
          order: 5,
          description:
            "Studii superioare nefinalizate sau echivalent / 4-6 ani experiență. Aceste poziții sunt destinate profesioniștilor experimentați sau managerilor de departamente.",
        },
        {
          code: "F",
          points: 96,
          order: 6,
          description:
            "Studii superioare nefinalizate sau echivalent / 8-10 ani experiență. Aceste poziții sunt destinate pozițiilor de management și sunt orientate strategic în aria responsabilităților.",
        },
        {
          code: "G",
          points: 112,
          order: 7,
          description:
            "Studii superioare absolvite / peste 10 ani experiență. Aceste poziții sunt de conducere superioară cu impact strategic major asupra organizației.",
        },
      ],
    },
    {
      name: "Comunicare",
      description:
        "Complexitatea și importanța abilităților de comunicare internă și externă necesare în exercitarea rolului.",
      category: "Relații",
      order: 2,
      subfactors: [
        {
          code: "A",
          points: 17,
          order: 1,
          description:
            "Abilități conversaționale și de scriere (bază). Comunicare de bază în cadrul echipei directe. Schimb de informații simple, urmărire de instrucțiuni scrise.",
        },
        {
          code: "B",
          points: 34,
          order: 2,
          description:
            "Abilități conversaționale și de scriere (moderate). Comunicare cu colegi din departamente diferite. Redactare de documente interne, rapoarte de rutină.",
        },
        {
          code: "C",
          points: 51,
          order: 3,
          description:
            "Abilități de persuasiune. Capacitatea de a convinge, influența sau negocia cu colegi sau parteneri externi în situații obișnuite.",
        },
        {
          code: "D",
          points: 68,
          order: 4,
          description:
            "Abilități de comunicare dezvoltate. Comunicare complexă cu multiple audiențe interne și externe. Prezentări, negocieri de nivel mediu, reprezentare echipă.",
        },
        {
          code: "E",
          points: 85,
          order: 5,
          description:
            "Abilități de comunicare critică. Comunicare strategică cu impact direct asupra afacerii. Negocieri majore, reprezentare organizațională la nivel înalt, comunicare de criză.",
        },
      ],
    },
    {
      name: "Rezolvarea problemelor",
      description:
        "Complexitatea problemelor întâlnite și gradul de creativitate/analiză necesar pentru soluționarea lor.",
      category: "Cognitive",
      order: 3,
      subfactors: [
        {
          code: "A",
          points: 16,
          order: 1,
          description:
            "Cerințe reduse pentru abilitate analitică. Sarcini de rutină cu soluții predefinite, fără necesitate de analiză.",
        },
        {
          code: "B",
          points: 32,
          order: 2,
          description:
            "Oarecare abilitate analitică. Situații ușor variate față de rutină, necesitând o minimă judecată.",
        },
        {
          code: "C",
          points: 48,
          order: 3,
          description:
            "Abilitate analitică moderată. Probleme cu variabile multiple în aria de competență, necesitând analiză și interpretare.",
        },
        {
          code: "D",
          points: 64,
          order: 4,
          description:
            "Probleme diferite în aria de competență. Situații complexe și variate, necesitând judecată profesională și creativitate.",
        },
        {
          code: "E",
          points: 80,
          order: 5,
          description:
            "Probleme diferite. Probleme complexe care depășesc limitele unui singur domeniu, necesitând abordare interdisciplinară.",
        },
        {
          code: "F",
          points: 96,
          order: 6,
          description:
            "Probleme foarte diferite. Situații ambigue cu precedente limitate, necesitând inovație și gândire strategică.",
        },
        {
          code: "G",
          points: 112,
          order: 7,
          description:
            "Probleme strategice. Provocări organizaționale majore fără precedent, cu impact pe termen lung asupra companiei.",
        },
      ],
    },
    {
      name: "Luarea deciziilor",
      description:
        "Nivelul de autonomie și impactul deciziilor luate în exercitarea rolului.",
      category: "Responsabilitate",
      order: 4,
      subfactors: [
        {
          code: "A",
          points: 16,
          order: 1,
          description:
            "Câteva decizii simple. Execută instrucțiuni clare, deciziile sunt limitate la alegeri simple și bine definite.",
        },
        {
          code: "B",
          points: 32,
          order: 2,
          description:
            "Decizii de rutină. Decizii operaționale repetitive în cadrul procedurilor stabilite.",
        },
        {
          code: "C",
          points: 48,
          order: 3,
          description:
            "Decizii standard. Decizii în situații uzuale, cu aplicarea judecății profesionale în cadrul ghidurilor existente.",
        },
        {
          code: "D",
          points: 64,
          order: 4,
          description:
            "Decizii independente. Autonomie semnificativă în luarea deciziilor operaționale și tactice fără aprobare superioară.",
        },
        {
          code: "E",
          points: 80,
          order: 5,
          description:
            "Decizii complexe. Decizii cu impact major asupra echipei sau departamentului, cu consecințe semnificative.",
        },
        {
          code: "F",
          points: 96,
          order: 6,
          description:
            "Multe decizii complexe. Decizii multiple cu impact cross-departamental și consecințe financiare importante.",
        },
        {
          code: "G",
          points: 112,
          order: 7,
          description:
            "Decizii strategice. Decizii cu impact major asupra direcției și performanței întregii organizații.",
        },
      ],
    },
    {
      name: "Impact asupra afacerii",
      description:
        "Măsura în care rolul contribuie direct la rezultatele financiare și strategice ale companiei.",
      category: "Responsabilitate",
      order: 5,
      subfactors: [
        {
          code: "A",
          points: 28,
          order: 1,
          description:
            "Impact limitat. Contribuție indirectă, rolul susține activitățile altora fără impact direct măsurabil.",
        },
        {
          code: "B",
          points: 56,
          order: 2,
          description:
            "Impact minor. Contribuție la rezultatele echipei sau departamentului, cu impact financiar redus.",
        },
        {
          code: "C",
          points: 84,
          order: 3,
          description:
            "Impact de influențare. Rolul influențează semnificativ rezultatele unui departament sau ale unor proiecte importante.",
        },
        {
          code: "D",
          points: 112,
          order: 4,
          description:
            "Impact direct. Rolul are responsabilitate directă și majoră asupra performanței financiare și strategice a organizației.",
        },
      ],
    },
    {
      name: "Condiții de lucru",
      description:
        "Natura mediului de lucru, riscurile fizice sau psihologice asociate rolului și cerințele de disponibilitate.",
      category: "Condiții",
      order: 6,
      subfactors: [
        {
          code: "A",
          points: 9,
          order: 1,
          description:
            "Minimale. Mediu de lucru standard de birou, fără riscuri fizice sau psihologice deosebite, program regulat.",
        },
        {
          code: "B",
          points: 18,
          order: 2,
          description:
            "Moderate. Expunere ocazională la condiții neplăcute, deplasări sau program extins ocazional.",
        },
        {
          code: "C",
          points: 27,
          order: 3,
          description:
            "Considerabile. Expunere frecventă la condiții dificile, risc fizic sau psihologic ridicat, disponibilitate extinsă.",
        },
      ],
    },
  ];

  for (const crit of criteriaData) {
    const criterion = await prisma.criterion.upsert({
      where: { name: crit.name },
      update: {
        description: crit.description,
        category: crit.category,
        order: crit.order,
      },
      create: {
        name: crit.name,
        description: crit.description,
        category: crit.category,
        order: crit.order,
        isActive: true,
      },
    });

    for (const sf of crit.subfactors) {
      await prisma.subfactor.upsert({
        where: {
          criterionId_code: {
            criterionId: criterion.id,
            code: sf.code,
          },
        },
        update: {
          description: sf.description,
          points: sf.points,
          order: sf.order,
        },
        create: {
          criterionId: criterion.id,
          code: sf.code,
          description: sf.description,
          points: sf.points,
          order: sf.order,
        },
      });
    }

    console.log(
      `✅ ${crit.name} — ${crit.subfactors.length} subfactori (max ${Math.max(...crit.subfactors.map((s) => s.points))} pct)`
    );
  }

  const totalMax = criteriaData.reduce(
    (sum, c) => sum + Math.max(...c.subfactors.map((s) => s.points)),
    0
  );
  console.log(`\n✅ Seed complet — Total maxim posibil: ${totalMax} puncte`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
