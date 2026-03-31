import { config } from "dotenv"
config()
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ═══════════════════════════════════════════════════════════════════════════
// 1) PPMO — Psihologia muncii + Psihologia organizationala
// ═══════════════════════════════════════════════════════════════════════════

const ppmoEntries = [
  // PSIHOLOGIA MUNCII
  { content: "[PPMO] Analiza muncii (job analysis): fundament HR — descrierea sistematica a sarcinilor, responsabilitatilor, competentelor necesare. Metode: observatie, interviu, chestionar (PAQ, O*NET). Baza pentru: fise post, recrutare, evaluare, compensatii. JobGrade automatizeaza acest proces.", tags: ["psih-muncii", "job-analysis", "fundament"], confidence: 0.90 },
  { content: "[PPMO] Selectia profesionala: predictori validati — teste cognitive (g factor, cel mai predictiv r=.51), interviuri structurate (r=.51), work samples (r=.54), assessment centers (r=.37). Interviurile nestructurate: r=.20 — aproape inutile. Recomandare: structurare maxima + criterii obiective.", tags: ["psih-muncii", "selectie", "predictori"], confidence: 0.90 },
  { content: "[PPMO] Teoria echitatiilui (Adams): angajatii compara raportul input/output propriu cu al altora. Inechitate perceputa → demotivare, sabotaj, plecare. Transparenta salariala (Directiva EU) poate amplifica perceptia de inechitate DACA nu e insotita de explicatii corecte. JobGrade ofera baza obiectiva.", tags: ["psih-muncii", "echitate", "adams", "salarizare"], confidence: 0.90 },
  { content: "[PPMO] Stresul ocupational (Karasek, demand-control model): stres apare cand cerinte mari + control mic. Cel mai daunator: high demand + low control + low support (iso-strain). Solutii: redesign post (mai mult control), suport social, resurse adecvate. Burnout (Maslach): epuizare + cinism + ineficienta.", tags: ["psih-muncii", "stres", "karasek", "burnout", "maslach"], confidence: 0.90 },
  { content: "[PPMO] Satisfactia in munca (Herzberg, two-factor theory): factori de igiena (salariu, conditii, securitate) — absenta lor produce insatisfactie dar prezenta nu produce satisfactie. Factori motivatori (realizare, recunoastere, responsabilitate, crestere) — produc satisfactie reala. Implicatie: salariul corect e necesar dar insuficient.", tags: ["psih-muncii", "satisfactie", "herzberg", "motivatie"], confidence: 0.90 },
  { content: "[PPMO] Evaluarea performantei: surse de eroare — halo effect, lenienta/severitate, tendinta centrala, recency effect, similar-to-me bias. Solutii: criterii comportamentale ancorate (BARS), evaluare multi-sursa (360), calibrare intre evaluatori. JobGrade reduce bias prin structurare obiectiva.", tags: ["psih-muncii", "evaluare", "bias", "performanta"], confidence: 0.85 },
  { content: "[PPMO] Ergonomia cognitiva: designul interfetelor si proceselor sa fie aliniat cu capacitatile cognitive umane. Limita memoriei de lucru: 7±2 elemente. Implicatie UI JobGrade: nu mai mult de 7 criterii vizibile simultan, progres vizual clar, feedback imediat.", tags: ["psih-muncii", "ergonomie", "cognitiv", "UX"], confidence: 0.85 },
  // PSIHOLOGIA ORGANIZATIONALA
  { content: "[PPMO] Cultura organizationala (Schein, 3 niveluri): (1) artefacte vizibile (birou, dress code, ritualuri), (2) valori declarate (MVV), (3) asumptii fundamentale (incontstiente, cele mai puternice). Schimbarea culturala reala = schimbarea nivelului 3, nu doar 1+2.", tags: ["psih-org", "schein", "cultura", "niveluri"], confidence: 0.95 },
  { content: "[PPMO] Contractul psihologic (Rousseau): acordul nescris intre angajat si organizatie — asteptari reciproce. Tranzactional (bani pt munca) vs relational (loialitate pt dezvoltare). Incalcarea contractului psihologic: cea mai frecventa cauza de demisie. Transparenta salariala poate incalca sau intari contractul.", tags: ["psih-org", "rousseau", "contract-psihologic"], confidence: 0.90 },
  { content: "[PPMO] Leadership transformational (Bass): 4I — Idealized Influence (model de rol), Inspirational Motivation (viziune), Intellectual Stimulation (provocare gandire), Individual Consideration (atentie personala). Produce performanta superioara vs leadership tranzactional (recompensa pt efort).", tags: ["psih-org", "leadership", "bass", "transformational"], confidence: 0.90 },
  { content: "[PPMO] Schimbarea organizationala (Lewin, 3 etape): Unfreeze (dezgheata status quo, creeaza urgenta) → Change (implementeaza schimbarea) → Refreeze (stabilizeaza noul echilibru). Kotter: 8 pasi pentru schimbare de succes. Cele mai frecvente greseli: lipsa urgentei si declararea victoriei prematur.", tags: ["psih-org", "schimbare", "lewin", "kotter"], confidence: 0.90 },
  { content: "[PPMO] Justitia organizationala (Colquitt): 4 dimensiuni — distributiva (corectitudinea rezultatelor), procedurala (corectitudinea proceselor), interpersonala (tratament respectuos), informationala (explicatii adecvate). JobGrade contribuie la toate 4 prin evaluare obiectiva + transparenta.", tags: ["psih-org", "justitie", "colquitt"], confidence: 0.90 },
  { content: "[PPMO] Angajamentul organizational (Meyer & Allen, 3 componente): afectiv (vreau sa raman), de continuitate (trebuie sa raman — costuri), normativ (ar trebui sa raman — obligatie). Cel mai productiv: afectiv. Se construieste prin: justitie, suport, dezvoltare, sens.", tags: ["psih-org", "angajament", "meyer-allen"], confidence: 0.85 },
]

// ═══════════════════════════════════════════════════════════════════════════
// 2) HR_COUNSELOR — Legislatia muncii + Fiscalitate
// ═══════════════════════════════════════════════════════════════════════════

const hrEntries = [
  // LEGISLATIA MUNCII RO
  { content: "[HR] Codul Muncii RO (Legea 53/2003): contractul individual de munca (CIM) — obligatoriu scris, inregistrat in REVISAL inainte de inceperea activitatii. Elemente obligatorii: functie, atributii, salariu, durata, loc munca, program. Modificare doar prin act aditional.", tags: ["legislatie", "codul-muncii", "CIM", "revisal"], confidence: 0.95 },
  { content: "[HR] Timpul de munca: 8h/zi, 40h/saptamana standard. Ore suplimentare: maxim 8h/saptamana, compensate cu timp liber sau spor minim 75%. Munca de noapte (22-06): spor minim 25%. Pauza de masa: minim 30 min dupa 6h munca.", tags: ["legislatie", "timp-munca", "ore-suplimentare"], confidence: 0.90 },
  { content: "[HR] Concediul de odihna: minim 20 zile lucratoare/an. Programare: pana la sfarsitul anului curent pentru anul urmator. Compensare in bani: DOAR la incetarea CIM. Concediu medical: certificat de la medic, platit 75% din baza de calcul (primele 5 zile angajator, restul FNUASS).", tags: ["legislatie", "concediu", "medical"], confidence: 0.90 },
  { content: "[HR] Incetarea CIM: (1) de drept (deces, pensionare, expirare termen), (2) acordul partilor, (3) concediere individuala/colectiva (preaviz 20 zile lucratoare), (4) demisie (preaviz 20 zile, 45 pt functii conducere). Concedierea disciplinara: cercetare prealabila obligatorie.", tags: ["legislatie", "incetare-CIM", "concediere", "demisie"], confidence: 0.90 },
  { content: "[HR] Salariul minim brut pe economie 2026: actualizat anual prin HG. Salariul nu poate fi sub minim. Plata: cel putin o data pe luna. Retineri: maxim 50% din salariu. Discriminare salariala interzisa (gen, varsta, etnie) — Directiva EU 2023/970 intareste asta.", tags: ["legislatie", "salariu-minim", "discriminare"], confidence: 0.90 },
  { content: "[HR] Directiva EU 2023/970 transpusa in RO: transparenta salariala obligatorie pentru companii 100+ angajati. Raportare pay gap pe gen, acces angajati la informatii salariale pe categorie. Termen implementare: 7 iunie 2026. Sanctiuni: amenzi + daune.", tags: ["legislatie", "directiva-EU", "transparenta", "2026"], confidence: 0.95 },
  { content: "[HR] Regulamentul intern: obligatoriu la 21+ salariati. Cuprinde: reguli disciplinare, program lucru, proceduri plangeri, protectia datelor, SSM. Se aduce la cunostinta fiecarui angajat. Modificare: consultare sindicate/reprezentanti.", tags: ["legislatie", "regulament-intern"], confidence: 0.85 },
  { content: "[HR] Protectia datelor angajatilor (GDPR): baza legala = executarea contractului + obligatie legala. Date minime necesare. Informare transparenta. Drepturi: acces, rectificare, stergere (limitat). Dosarul personal: pastrat 75 ani (legea arhivelor). Transfer international: reguli stricte.", tags: ["legislatie", "GDPR", "date-angajati"], confidence: 0.90 },
  // FISCALITATE MUNCII
  { content: "[HR/FISC] Structura cost salarial RO 2026: Salariu brut → minus CAS 25% (pensie) → minus CASS 10% (sanatate) → minus impozit 10% pe venitul net → Salariu net. Angajatorul plateste suplimentar: CAM 2.25% (asigurare munca). Total cost angajator ≈ brut × 1.0225.", tags: ["fiscalitate", "cost-salarial", "CAS", "CASS", "impozit"], confidence: 0.95 },
  { content: "[HR/FISC] Beneficii extrasalariale defiscalizate: tichete de masa (max 40 RON/zi), tichete cadou (max 300 RON/eveniment), abonament sport (400 RON/an), asigurare sanatate voluntara (400 EUR/an), contributii pensie voluntara (400 EUR/an). Nu se datoreaza CAS/CASS/impozit.", tags: ["fiscalitate", "beneficii", "defiscalizare"], confidence: 0.90 },
  { content: "[HR/FISC] Declaratia 112: depusa lunar pana pe 25 ale lunii urmatoare. Cuprinde: contributii sociale, impozit pe venit din salarii, date identificare angajati. Penalitati: 0.01%/zi intarziere + amenzi contraventionale.", tags: ["fiscalitate", "declaratia-112", "termene"], confidence: 0.85 },
  { content: "[HR/FISC] Scutiri fiscale IT: angajatii din domeniul IT cu studii superioare — scutiti de impozit pe venit (10%). Conditii: activitate de creatie programe calculator, salariu brut minim conform HG. Economie angajat: ~10% din brut.", tags: ["fiscalitate", "scutire-IT", "programatori"], confidence: 0.85 },
]

// ═══════════════════════════════════════════════════════════════════════════
// 3) PCM — Psiholog Mecanisme Cognitive (NOU — resursa suport)
// ═══════════════════════════════════════════════════════════════════════════

const pcmEntries = [
  { content: "[PCM] Sistemul dual de gandire (Kahneman): Sistem 1 (rapid, automat, intuitiv, predispus la erori) vs Sistem 2 (lent, deliberat, analitic, eficient dar lenes). Majoritatea deciziilor organizationale: Sistem 1. Implicatie: biasurile cognitive vin din Sistem 1 — trebuie activat Sistem 2 pentru decizii importante.", tags: ["cognitiv", "kahneman", "sistem-dual", "bias"], confidence: 0.95 },
  { content: "[PCM] Biasuri cognitive frecvente in HR: anchoring (prima informatie domina), disponibilitate (judeci pe baza a ce-ti vine in minte usor), confirmare (cauti ce confirma), halo/horn effect (o trasatura coloreaza totul), framing (formularea schimba decizia), dunning-kruger (incompetentii se supraestimeaza).", tags: ["cognitiv", "biasuri", "HR", "lista"], confidence: 0.95 },
  { content: "[PCM] Memoria de lucru (Baddeley): capacitate limitata (~4 chunks), durata scurta (~20s fara repetitie). Implicatii: interfete simple, instructiuni scurte, chunking informatie, suport vizual. Evaluarile complexe (6 criterii × 7 subfactori) trebuie ghidate pas cu pas.", tags: ["cognitiv", "memorie", "baddeley", "UX"], confidence: 0.90 },
  { content: "[PCM] Teorii ale atentiei: atentia e resursa limitata (Broadbent, Treisman). Multitasking = iluzie — creierul comuta rapid intre taskuri cu cost cognitiv (task switching cost). Implicatie: designul proceselor HR sa nu ceara atentie simultana pe mai multe dimensiuni.", tags: ["cognitiv", "atentie", "multitasking"], confidence: 0.85 },
  { content: "[PCM] Metacognitia: gandirea despre propria gandire. Monitorizare (stiu ce stiu si ce nu stiu) + control (aleg strategia de gandire). Oamenii cu metacognitie dezvoltata: iau decizii mai bune, invata mai eficient, detecteaza propriile biasuri. Se poate antrena.", tags: ["cognitiv", "metacognitie", "gandire"], confidence: 0.90 },
  { content: "[PCM] Rationamentul: deductiv (de la general la particular — sigur dar rigid), inductiv (de la particular la general — flexibil dar incert), abductiv (cea mai buna explicatie). In organizatii: managerii folosesc preponderent abductiv (inferenta la cea mai probabila cauza). Erori frecvente: suprageneralizare, neglijarea ratei de baza.", tags: ["cognitiv", "rationament", "tipuri", "erori"], confidence: 0.85 },
  { content: "[PCM] Rezolvarea problemelor: algoritmi (garanteaza solutie dar lent) vs euristici (rapid dar imprecis). Euristici comune: means-ends analysis, analogie, decomposition. Blocaje: fixitate functionala (nu vezi alte utilizari), set mental (repeti strategia chiar daca nu merge), Einstellung effect.", tags: ["cognitiv", "problem-solving", "euristici", "blocaje"], confidence: 0.85 },
  { content: "[PCM] Luarea deciziilor (Tversky & Kahneman): prospect theory — pierderile dor de 2x mai mult decat castigurile echivalente (loss aversion). In organizatii: angajatii rezista schimbarii pentru ca pierderea status quo e perceputa ca mai mare decat castigul potential. Reframing: prezinta schimbarea ca evitare a pierderii.", tags: ["cognitiv", "decizii", "prospect-theory", "loss-aversion"], confidence: 0.90 },
  { content: "[PCM] Heuristici de judecata: reprezentativitate (judeci pe baza de cat de tipic pare), ancorare (prima cifra influenteaza), disponibilitate (ce-mi vine in minte e mai frecvent), affect (starea emotionala coloreaza judecata). Toate opereaza inconststient — constientizarea e primul pas.", tags: ["cognitiv", "heuristici", "judecata", "kahneman"], confidence: 0.90 },
  { content: "[PCM] Conexiune Hawkins: biasurile cognitive opereaza predominant sub 200 (gandire automata, Sistem 1). Metacognitia si gandirea deliberata (Sistem 2) calibreaza la 400+ (Ratiune). Trecerea de la reactie automata la raspuns constient = trecerea peste pragul de 200.", tags: ["hawkins", "conexiune-camp", "sistem-dual"], confidence: 0.85 },
]

// ═══════════════════════════════════════════════════════════════════════════
// 4) NSA — Specialist Neurostiinte (NOU — resursa suport)
// ═══════════════════════════════════════════════════════════════════════════

const nsaEntries = [
  { content: "[NSA] Neuroplasticitatea: creierul se remodeleaza continuu in functie de experienta. Sinaptic (conexiuni noi) si structural (volum materie cenusie). Implicatie: orice abilitate se poate invata la orice varsta — not hardwired. Organizatii: investitia in dezvoltare functioneaza neurologic.", tags: ["neuro", "neuroplasticitate", "invatare"], confidence: 0.95 },
  { content: "[NSA] Sistemul de recompensa (dopamina): nucleus accumbens, VTA (ventral tegmental area). Dopamina = nu placere ci ANTICIPARE — motivatia de a actiona. Feedback pozitiv → dopamina → repetare comportament. Gamification, recognition, micro-progres — toate activeaza sistemul de recompensa.", tags: ["neuro", "dopamina", "recompensa", "motivatie"], confidence: 0.90 },
  { content: "[NSA] Amigdala si raspunsul la amenintare: fight-flight-freeze. Se activeaza in 12ms — INAINTE de gandire constienta. In organizatii: feedback negativ, evaluare, schimbare — toate pot activa amigdala. Hijack amigdala: reactie emotionala disproportionata. Solutie: siguranta psihologica, predictibilitate.", tags: ["neuro", "amigdala", "fight-flight", "stres"], confidence: 0.90 },
  { content: "[NSA] Cortexul prefrontal (PFC): sediul functiilor executive — planificare, decizie, inhibitie impulsuri, gandire abstracta. Ultimul care se maturizeaza (~25 ani). Se degradeaza sub stres, oboseala, privare somn. Implicatie: deciziile importante nu se iau obosit sau sub presiune.", tags: ["neuro", "prefrontal", "functii-executive", "decizie"], confidence: 0.90 },
  { content: "[NSA] Neuronii oglinda (Rizzolatti): se activeaza identic cand FACI o actiune si cand OBSERVI pe altcineva facand-o. Baza neurologica a empatiei, invatarii prin modelare, contagiunii emotionale. In organizatii: liderii sunt modele neurologice — starea lor se propaga in echipa.", tags: ["neuro", "neuroni-oglinda", "empatie", "leadership"], confidence: 0.90 },
  { content: "[NSA] Modelul SCARF (Rock, 2008): 5 domenii ale experientei sociale procesate de creier ca recompensa/amenintare — Status, Certainty, Autonomy, Relatedness, Fairness. Evaluarea performantei ameninta Status + Certainty. Transparenta salariala ameninta Status dar intareste Fairness.", tags: ["neuro", "SCARF", "rock", "social", "recompensa"], confidence: 0.90 },
  { content: "[NSA] Somnul si performanta cognitiva: 7-9 ore necesare. Sub 6 ore: echivalentul cognitive al 0.1% alcoolemie. Privarea cronica de somn: degradare memorie, atentie, decizie, reglare emotionala. In organizatii: cultura overtime = cultura degradarii cognitive.", tags: ["neuro", "somn", "performanta", "overtime"], confidence: 0.85 },
  { content: "[NSA] Emisferele cerebrale si modelul Hermann: emisfera stanga — secvential, analitic, verbal, temporal. Emisfera dreapta — holistic, intuitiv, spatial, atemporal. NU sunt separate — comunicare permanenta prin corpus callosum. Dominanta = preferinta, nu exclusivitate. Creierul total: acces la toate 4 cadranele.", tags: ["neuro", "emisfere", "hermann", "creier-total"], confidence: 0.90 },
  { content: "[NSA] Oxitocina si increderea (Zak): oxitocina creste increderea, empatia, cooperarea. Se elibereaza prin: contact uman, gesturi de generozitate, povesti emotionante, atingere. In organizatii: ritualuri de echipa, storytelling, recunoastere publica — toate cresc oxitocina → cresc increderea.", tags: ["neuro", "oxitocina", "incredere", "cooperare"], confidence: 0.85 },
  { content: "[NSA] Conexiune Hawkins: nivelurile de constiinta Hawkins corespund activarii diferitelor structuri cerebrale. Sub 200 (Forta): predominant amigdala + sistem limbic (reactie, supravietuire). Peste 200 (Putere): cortex prefrontal activ (gandire, decizie, empatie). Peste 500: integrare completa — creier total.", tags: ["hawkins", "conexiune-camp", "structuri-cerebrale"], confidence: 0.85 },
]

async function main() {
  // Helper: copy Hawkins KB
  async function copyHawkins(targetRole: string) {
    const hawkins = await prisma.kBEntry.findMany({
      where: { agentRole: "PSYCHOLINGUIST", tags: { has: "hawkins" }, status: "PERMANENT" },
      select: { content: true, tags: true, confidence: true },
    })
    let n = 0
    for (const e of hawkins) {
      try {
        await prisma.kBEntry.create({ data: {
          agentRole: targetRole, kbType: "METHODOLOGY", content: e.content,
          source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
          tags: e.tags, usageCount: 0, validatedAt: new Date(),
        }})
        n++
      } catch {}
    }
    return n
  }

  // Helper: seed entries
  async function seedEntries(role: string, entries: any[], tags: string[]) {
    let n = 0
    for (const e of entries) {
      try {
        await prisma.kBEntry.create({ data: {
          agentRole: role, kbType: "METHODOLOGY", content: e.content,
          source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
          tags: [...e.tags, ...tags, "field-knowledge"],
          usageCount: 0, validatedAt: new Date(),
        }})
        n++
      } catch {}
    }
    return n
  }

  // 1) PPMO
  console.log("1) PPMO — Psihologia muncii + organizationala...")
  const ppmo = await seedEntries("PPMO", ppmoEntries, ["psih-muncii", "psih-organizationala"])
  const ppmoTotal = await prisma.kBEntry.count({ where: { agentRole: "PPMO", status: "PERMANENT" } })
  console.log(`   +${ppmo} entries | Total: ${ppmoTotal}`)

  // 2) HR_COUNSELOR
  console.log("2) HR_COUNSELOR — Legislatie munca + fiscalitate...")
  const hr = await seedEntries("HR_COUNSELOR", hrEntries, ["legislatie", "fiscalitate"])
  const hrTotal = await prisma.kBEntry.count({ where: { agentRole: "HR_COUNSELOR", status: "PERMANENT" } })
  console.log(`   +${hr} entries | Total: ${hrTotal}`)

  // 3) PCM — creare agent + seed
  console.log("3) PCM (Psiholog Mecanisme Cognitive) — creare + seed...")
  try {
    await prisma.agentDefinition.create({ data: {
      agentRole: "PCM", displayName: "Psiholog Mecanisme Cognitive",
      description: "Psiholog cognitiv — mecanisme de gandire, biasuri cognitive, memorie, atentie, metacognitie, rationament, luarea deciziilor, rezolvarea problemelor, Sistem 1/Sistem 2",
      level: "OPERATIONAL", isManager: false, isActive: true, objectives: [], coldStartPrompts: [], createdBy: "OWNER",
    }})
    await prisma.agentRelationship.create({ data: { parentRole: "PMA", childRole: "PCM", relationType: "REPORTS_TO", isActive: true } })
  } catch { console.log("   PCM already exists") }
  const pcmH = await copyHawkins("PCM")
  const pcm = await seedEntries("PCM", pcmEntries, ["psihologie-cognitiva"])
  const pcmTotal = await prisma.kBEntry.count({ where: { agentRole: "PCM", status: "PERMANENT" } })
  console.log(`   +${pcmH} Hawkins +${pcm} domain | Total: ${pcmTotal}`)

  // 4) NSA — creare agent + seed
  console.log("4) NSA (Specialist Neurostiinte) — creare + seed...")
  try {
    await prisma.agentDefinition.create({ data: {
      agentRole: "NSA", displayName: "Specialist Neurostiinte",
      description: "Specialist neurostiinte — neuroplasticitate, sisteme de recompensa, amigdala, cortex prefrontal, neuroni oglinda, SCARF, emisfere cerebrale, oxitocina, baze neurologice ale comportamentului organizational",
      level: "OPERATIONAL", isManager: false, isActive: true, objectives: [], coldStartPrompts: [], createdBy: "OWNER",
    }})
    await prisma.agentRelationship.create({ data: { parentRole: "PMA", childRole: "NSA", relationType: "REPORTS_TO", isActive: true } })
  } catch { console.log("   NSA already exists") }
  const nsaH = await copyHawkins("NSA")
  const nsa = await seedEntries("NSA", nsaEntries, ["neurostiinte"])
  const nsaTotal = await prisma.kBEntry.count({ where: { agentRole: "NSA", status: "PERMANENT" } })
  console.log(`   +${nsaH} Hawkins +${nsa} domain | Total: ${nsaTotal}`)

  console.log("\n=== DONE ===")
  const totalAgents = await prisma.agentDefinition.count({ where: { isActive: true } })
  const totalKB = await prisma.kBEntry.count({ where: { status: "PERMANENT" } })
  console.log(`Total agenti: ${totalAgents}`)
  console.log(`Total KB entries: ${totalKB}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error("ERR:", e.message); process.exit(1) })
