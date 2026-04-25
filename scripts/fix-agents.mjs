import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// ═══ 1. Creăm CALAUZA, PROFILER, COSO ═══

const newAgents = [
  {
    agentRole: 'CALAUZA', displayName: 'Calauza B2C (Card 1)',
    description: 'Ghid de auto-cunoastere B2C - Card 1 Drumul catre mine. Dialog non-directiv, faciliteaza alinierea gand-vorba-fapta, detecteaza autenticitate vs bypass spiritual.',
    level: 'OPERATIONAL', isManager: false, activityMode: 'REACTIVE_TRIGGERED',
    prompts: [
      'Genereaza pattern-uri de ghidare non-directiva pentru auto-cunoastere: cum facilitezi fara a da raspunsuri, cum detectezi bypass spiritual, cum calibrezi profunzimea dialogului.',
      'Descrie cum folosesti scala Hawkins in dialog B2C fara a o mentiona explicit: indicatori comportamentali sub-200 vs supra-200, ce limbaj functioneaza la fiecare nivel.',
      'Genereaza abordari de explorare a alinierii gand-vorba-fapta: intrebari care dezvaluie incongruente fara a judeca, cum creezi spatiu sigur.',
      'Descrie mecanismul spiralei de evolutie B2C: cum treci clientul prin etapele crisalida, fluture, zbor, ce semnale indica pregatirea pentru tranzitie.',
      'Genereaza principii de comunicare empatica pentru dezvoltare personala: cum echilibrezi caldura cu provocarea, cum cultivi autonomia clientului.',
    ],
  },
  {
    agentRole: 'PROFILER', displayName: 'Profiler Shadow B2C',
    description: 'Observator invizibil pe toate cardurile B2C. Analizeaza post-sesiune: ajustari Herrmann, Hawkins, VIA strengths, congruenta, faza spirala. Nu interactioneaza direct cu clientul.',
    level: 'OPERATIONAL', isManager: false, activityMode: 'REACTIVE_TRIGGERED',
    prompts: [
      'Genereaza pattern-uri de observare invizibila: ce indicatori extragi din limbajul clientului pentru Herrmann HBDI, cum ponderi observatia vs auto-raportare.',
      'Descrie cum estimezi nivelul Hawkins din conversatie fara test explicit: markeri lingvistici per nivel (sub-200 victimizare, 200-350 rationalitate, 350+ acceptare).',
      'Genereaza metode de detectare VIA Character Strengths din comportament conversational: ce reactii indica curiozitate, bravura, bunatate, intelepciune.',
      'Descrie cum detectezi congruenta (alinierea declaratii si comportament) din dialog: diferente intre ce spune clientul ca valorizeaza si cum actioneaza.',
      'Genereaza abordari de agregare profil din date sparse: cum combini observatii din carduri diferite, cum gestionezi contradictiile, cum estimezi trend-ul evolutiv.',
    ],
  },
  {
    agentRole: 'COSO', displayName: 'Chief Operating & Strategy Officer',
    description: 'Coordonator operatiuni si strategie - monitorizare semnale externe, declansare actiuni proactive, bridge intre strategie (COG) si executie (agenti operationali).',
    level: 'TACTICAL', isManager: true, activityMode: 'PROACTIVE_CYCLIC',
    prompts: [
      'Genereaza pattern-uri de monitorizare semnale externe: cum detectezi schimbari legislative, de piata sau competitive care necesita actiune, cum prioritizezi semnalele.',
      'Descrie cum faci bridge intre decizie strategica (COG) si executie operationala: cum traduci directii strategice in taskuri concrete, cum verifici implementarea.',
      'Genereaza mecanisme de coordonare transversala: cum asiguri coerenta intre departamente, cum detectezi conflicte de prioritizare.',
      'Descrie cum gestionezi cicluri proactive: ce verifici la 4h/12h/24h, ce metrici monitorizezi, cand intervii vs cand lasi procesul sa curga.',
      'Genereaza pattern-uri de raportare operationala eficienta: ce informatie e critica pentru Owner, cum sintetizezi fara a pierde nuante.',
    ],
  },
]

// ═══ 2. Cold start prompts pentru cei 24 fără ═══

const promptsMap = {
  CCO: [
    'Genereaza strategii de coordonare comerciala: cum aliniezi marketing, vanzari B2B/B2C, customer success sub o viziune unitara.',
    'Descrie mecanisme de pipeline management: cum monitorizezi funnel-ul de la lead la revenue, ce metrici conteaza.',
    'Genereaza abordari de pricing strategic: cum echilibrezi volum vs marja, cum testezi preturi, cum gestionezi discounturile.',
    'Descrie cum construiesti parteneriate comerciale: identificare parteneri, structurare deal, win-win, co-marketing.',
    'Genereaza pattern-uri de customer success proactiv: cum masori sanatatea contului, semnale de churn, interventii de retentie.',
  ],
  CFO: [
    'Genereaza cunoastere despre planificare financiara SaaS: MRR, ARR, churn rate, LTV, CAC, LTV/CAC ratio, runway, break-even.',
    'Descrie mecanisme de bugetare si prognoze: buget bottom-up vs top-down, gestionarea variantelor, rolling forecast.',
    'Genereaza pattern-uri de pricing analysis: modelarea impactului schimbarilor de pret pe revenue, simulare scenarii.',
    'Descrie cadrul fiscal RO relevant: TVA servicii digitale, impozit profit, contributii, facturare electronica, obligatii raportare.',
    'Genereaza abordari de revenue recognition: recunoastere venituri din abonamente, credite prepaid, servicii pro.',
  ],
  CSM: [
    'Genereaza pattern-uri de onboarding client: primele 30/60/90 zile, milestones, health scoring, interventii proactive.',
    'Descrie mecanisme de retentie: semnale de churn (scadere utilizare, tichete suport), interventii, playbook-uri per segment.',
    'Genereaza abordari de customer health scoring: ce metrici compun scorul, cum le ponderi, praguri de alerta.',
    'Descrie cum faci expansion revenue: identificare oportunitati upsell/cross-sell naturale, timing, propunere de valoare.',
    'Genereaza principii de relatie client pe termen lung: cum construiesti incredere, cum gestionezi nemultumirile.',
  ],
  DMA: [
    'Genereaza strategie marketing 7P Kotler aplicata la HR SaaS: Product, Price, Place, Promotion, People, Process, Physical Evidence.',
    'Descrie coordonarea echipei marketing: cum delegi content, SEO, performance, social media, cum asiguri coerenta de brand.',
    'Genereaza abordari de go-to-market: lansare serviciu nou, segmentare audienta, mesaje per segment, canale, calendar.',
    'Descrie cum construiesti brand awareness in nisa HR Romania: canale eficiente, conferinte, comunitati, thought leadership.',
    'Genereaza pattern-uri de lead generation B2B: content marketing, LinkedIn, webinars, SEO, referral in piata RO.',
  ],
  DPO: [
    'Genereaza cunoastere GDPR practica: registrul prelucrarilor Art 30, baze legale per tip de date, termene retentie, drepturi.',
    'Descrie procesul DPIA: cand e obligatoriu, cum se face, evaluare risc, masuri de mitigare, consultare ANSPDCP.',
    'Genereaza proceduri de breach notification: detectare, evaluare severitate, notificare ANSPDCP 72h, notificare persoane vizate.',
    'Descrie privacy by design: principii, implementare practica in software, minimizare date, pseudonimizare, criptare.',
    'Genereaza cunoastere despre transferuri internationale de date: clauzele contractuale standard, decizie adecvare, TIA.',
  ],
  DVB2B: [
    'Genereaza ciclul complet de vanzare B2B in HR: prospectare, calificare, demo, propunere, negociere, contractare, handoff la CS.',
    'Descrie tehnici de prospectare B2B eficiente in RO: LinkedIn outreach, cold email, evenimente, referral.',
    'Genereaza abordari de calificare lead: BANT, MEDDIC, CHAMP in context HR SaaS, red flags, cand descalifici elegant.',
    'Descrie cum faci demo-uri care convertesc: personalizare, storytelling cu problema lor, show not tell, next steps clare.',
    'Genereaza pattern-uri de negociere: cum gestionezi obiectiile de pret, cum justifici ROI, discount guidelines.',
  ],
  DVB2C: [
    'Genereaza ciclul de vanzare B2C individual: achizitie, prima impresie, activare, conversie free-paid, retentie, advocacy.',
    'Descrie mecanisme de conversie B2C: freemium-premium, trial funnel, pricing psychology, social proof.',
    'Genereaza abordari de retentie B2C: engagement hooks, progress visibility, community, gamification subtila, valoare continua.',
    'Descrie cum masori experienta B2C: NPS, CSAT, CES, cohort analysis, retention curves, monetization rate.',
    'Genereaza pattern-uri de comunicare B2C: tonul vocii (cald, personal), secvente email, push notifications non-intruzive.',
  ],
  CSEO: [
    'Genereaza strategie SEO pentru HR SaaS Romania: keyword research HR, content pillars, link building, technical SEO.',
    'Descrie cum creezi content editorial de autoritate: whitepapers, studii de caz, ghiduri practice - structura, ton, distributie.',
    'Genereaza abordari de content marketing B2B: blog cadence, topic clustering, CTAs, lead magnets, nurturing funnels.',
    'Descrie optimizare on-page: meta tags, heading structure, internal linking, schema markup, Core Web Vitals.',
    'Genereaza calendar editorial: teme sezoniere HR, continut evergreen, repurposing, distributie multi-canal.',
  ],
  DDA: [
    'Genereaza reguli de validare oferte: ce necesita aprobare, praguri discount, structuri deal atipice, conformitate pricing.',
    'Descrie procesul deal desk: request, analiza, aprobare, contractare, SLA-uri, escalare, documentare decizii.',
    'Genereaza pattern-uri de structurare deal-uri complexe: multi-serviciu, multi-an, enterprise, volume discounts.',
    'Descrie cum analizezi profitabilitatea unui deal: cost marginal, LTV proiectat, risc client, impact portfolio.',
    'Genereaza guidelines discount: cand se justifica, cum le structurezi, cum eviti precedente daunatoare.',
  ],
  DMM: [
    'Genereaza strategie performance marketing: Google Ads, LinkedIn Ads, Meta Ads - specificitati B2B HR SaaS.',
    'Descrie cum optimizezi campanii digitale: A/B testing, bid strategies, audience segmentation, remarketing, attribution.',
    'Genereaza abordari de testare canale noi: criteriu go/no-go, buget test, KPI-uri, timeline, decizie scale vs kill.',
    'Descrie mecanisme de lead generation digitala: landing pages, forms, lead magnets, UTM tracking, CRM integration.',
    'Genereaza pattern-uri de buget performance marketing: alocare per canal, ROAS target, cost per lead, cost per acquisition.',
  ],
  EMAS: [
    'Genereaza fluxuri de marketing automation: welcome series, lead nurturing, onboarding drips, re-engagement, win-back.',
    'Descrie lead scoring model: ce actiuni scoreaza (page views, email opens, form fills, demo request), praguri MQL-SQL.',
    'Genereaza abordari de lifecycle marketing: awareness, consideration, decision, retention - continut per etapa, trigger-based.',
    'Descrie email best practices B2B: subject lines, personalizare, timing, frequency, deliverability.',
    'Genereaza handoff MQL-SQL: criterii, procesul de transfer, SLA response time, feedback loop vanzari-marketing.',
  ],
  FPA: [
    'Genereaza modele de prognoza financiara SaaS: bottom-up per client/cohort, top-down TAM/penetrare, scenario planning.',
    'Descrie KPI-uri financiare esentiale: gross margin, net margin, burn rate, months of runway, payback period, rule of 40.',
    'Genereaza abordari de dashboard financiar: ce arati Owner-ului, ce arati echipei, cadenta raportarii.',
    'Descrie cum faci analiza unit economics: cost per client, revenue per client, contribution margin, break-even per segment.',
    'Genereaza principii de cash flow management: timing incasari vs plati, working capital, buffer de siguranta.',
  ],
  GDA: [
    'Genereaza principii de design grafic pentru HR SaaS: clean, profesional, trustworthy - palette de culori, tipografie, spatiu alb.',
    'Descrie cum creezi vizuale ads eficiente: hierarchy, contrast, CTA vizibil, brand consistency, format per platforma.',
    'Genereaza abordari de branding vizual: logo usage, brand guidelines, tone visual, consistenta cross-channel.',
    'Descrie template-uri prezentari: slide design, data visualization, infografice - cum faci datele HR atractive.',
    'Genereaza principii UI/UX pentru dashboard-uri: readability, hierarchy informatie, culori pentru status, accesibilitate.',
  ],
  NSA: [
    'Genereaza cunoastere neurostiinte aplicate: neuroplasticitate si invatare la adulti, cum se formeaza obiceiuri noi.',
    'Descrie modelul SCARF (Rock): Status, Certainty, Autonomy, Relatedness, Fairness - cum influenteaza comportamentul la locul de munca.',
    'Genereaza cunoastere despre sistemul de recompensa: dopamina, motivatie intrinseca vs extrinseca, designul job-ului.',
    'Descrie rolul amigdalei si cortexului prefrontal in decizie: fight/flight/freeze, cum creezi safety neurobiologic.',
    'Genereaza abordari neuroscience-based de wellbeing: sleep, exercise, nutrition, social connection - impact pe performanta.',
  ],
  PCA: [
    'Genereaza strategie de parteneriate HR: identificare cabinete consultanta/recrutare, propunere de valoare mutuala.',
    'Descrie programe de afiliere/referral: mecanica, recompense, tracking, comunicare, onboarding parteneri.',
    'Genereaza abordari de canal indirect: consultanti certificati, integratori HRIS, reselleri - avantaje, riscuri.',
    'Descrie cum lucrezi cu asociatii profesionale HR: prezente, sponsorizari, contributii de continut, networking strategic.',
    'Genereaza pattern-uri de co-marketing cu parteneri: webinars comune, studii de caz, referral reciproc.',
  ],
  PCM: [
    'Genereaza cunoastere despre mecanisme cognitive: biasuri frecvente in evaluare (halo, recency, anchoring), cum le atenuezi.',
    'Descrie metacognitia aplicata: cum faci oamenii constienti de propriul proces de gandire in context profesional.',
    'Genereaza pattern-uri de decizie rationala: dual process theory Kahneman System 1/2, cand intuitia functioneaza.',
    'Descrie mecanisme de memorie relevante pentru training: spaced repetition, interleaving, testing effect.',
    'Genereaza abordari de reducere a erorilor cognitive: checklists, pre-mortem, devils advocate.',
  ],
  PMP_B2B: [
    'Genereaza strategie de produs B2B: discovery, packaging, pricing, positioning - cum le aplici in HR SaaS.',
    'Descrie cum colectezi feedback client B2B: interviuri, surveys, usage analytics, support tickets, win/loss analysis.',
    'Genereaza abordari de prioritizare features: RICE, MoSCoW, impact vs effort, customer value vs business value.',
    'Descrie cum faci lansare serviciu nou B2B: beta group, soft launch, GTM plan, sales enablement, measurement.',
    'Genereaza pattern-uri de product-led growth B2B: free tier design, activation metrics, conversion triggers.',
  ],
  PMP_B2C: [
    'Genereaza strategie de produs B2C: user persona, jobs-to-be-done, free vs paid boundary, engagement loops.',
    'Descrie mecanisme de onboarding B2C: first-time experience, aha moment, time-to-value, progressive disclosure.',
    'Genereaza abordari de monetizare B2C: freemium, credits, subscription, pay-per-use in self-development.',
    'Descrie cum masori engagement B2C: DAU/MAU, session length, feature adoption, retention cohorts.',
    'Genereaza pattern-uri de experienta utilizator B2C: personalizare, recommendations, progress tracking, social proof.',
  ],
  PMRA: [
    'Genereaza metode de cercetare piata HR: secondary research, primary (interviuri, surveys), competitive analysis.',
    'Descrie cum monitorizezi tendinte HR SaaS: surse, indicatori, early signals, reporting cadence.',
    'Genereaza abordari de segmentare piata: criterii (marime companie, industrie, maturitate HR), segment sizing.',
    'Descrie cum faci analiza competitiva: feature comparison, pricing intelligence, positioning map, diferentiere.',
    'Genereaza pattern-uri de business case: TAM, adoption estimate, revenue impact, cost estimate, go/no-go.',
  ],
  PTA: [
    'Genereaza cunoastere psihodinamica aplicabila: transfert in relatia profesionala, mecanisme de aparare frecvente la locul de munca.',
    'Descrie contributii Jung relevante: arhetipuri, Persona vs Self, Shadow, individuare - cum se manifesta in cariera.',
    'Genereaza cunoastere CBT aplicabila: distorsiuni cognitive frecvente, reframing, behavioral experiments.',
    'Descrie mecanismele rezistentei la schimbare: ambivalenta, campuri de forte Lewin, cum facilitezi schimbarea.',
    'Genereaza principii terapeutice utile in coaching fara a face terapie: ascultare activa, validare, congruenta Rogers.',
  ],
  REVOPS: [
    'Genereaza principii revenue operations: cum aliniezi marketing, sales, CS intr-un pipeline unitar, CRM ca single source of truth.',
    'Descrie automatizari pipeline: lead routing, deal stage progression, activity tracking, forecast roll-up.',
    'Genereaza abordari de handoff eficient: lead-opportunity-customer, SLA-uri, ownership clar, feedback loops.',
    'Descrie metrici RevOps: velocity metrics, conversion rates per stage, cycle time, win rate, forecast accuracy.',
    'Genereaza pattern-uri de data hygiene: deduplicare, enrichment, decay management, mandatory fields.',
  ],
  RPA_FIN: [
    'Genereaza modele de pricing: cost-plus, value-based, competitive, penetration - cand se aplica fiecare in SaaS HR.',
    'Descrie revenue recognition specifica: abonamente lunare/anuale, credite, servicii pro.',
    'Genereaza abordari de analiza discount impact: waterfall pricing, pocket margin, discount distribution.',
    'Descrie cum modelezi scenarii financiare: best/base/worst case, sensitivity analysis, variable key drivers.',
    'Genereaza principii de viabilitate deal: minimum deal size, contribution margin threshold, strategic vs transactional.',
  ],
  SEBC: [
    'Genereaza materiale sales enablement: pitch decks, one-pagers, battlecards, objection handling sheets, ROI calculators.',
    'Descrie cum asiguri consistenta de brand: voice and tone guidelines, do/dont, templates, review process.',
    'Genereaza abordari prezenta la evenimente: stand design, materiale, elevator pitch, follow-up process.',
    'Descrie cum creezi materiale co-branded cu parteneri: guidelines, approval process, quality standards.',
    'Genereaza pattern-uri de sales enablement continuous: training cadence, content updates, competitive intel, win stories.',
  ],
  SMMA: [
    'Genereaza strategie social media organic HR: LinkedIn primar B2B, Instagram employer branding, Facebook groups, content pillars.',
    'Descrie calendar social media: frecventa, timing, mix continut educativ/inspirational/promotional, engagement hooks.',
    'Genereaza abordari de community management: raspuns la comentarii, gestionare criticism, tone of voice, escalare.',
    'Descrie trend monitoring social media: cum identifici teme relevante, cum reactionezi rapid dar cu bun gust.',
    'Genereaza metrici social media: engagement rate, reach, impressions, click-through, follower growth, content performance.',
  ],
}

async function run() {
  // 1. Creăm cei 3 agenți noi
  for (const agent of newAgents) {
    const existing = await pool.query('SELECT id FROM agent_definitions WHERE "agentRole" = $1', [agent.agentRole])
    if (existing.rows.length > 0) {
      console.log(agent.agentRole, '— deja exista, skip')
      continue
    }
    const id = 'def_' + agent.agentRole.toLowerCase() + '_' + Date.now()
    await pool.query(`
      INSERT INTO agent_definitions (id, "agentRole", "displayName", description, level, "isManager", "isActive", "coldStartDescription", "coldStartPrompts", "createdBy", "createdAt", "updatedAt", "activityMode")
      VALUES ($1, $2, $3, $4, $5, $6, true, $4, $7, 'OWNER', NOW(), NOW(), $8)
    `, [id, agent.agentRole, agent.displayName, agent.description, agent.level, agent.isManager, agent.prompts, agent.activityMode])
    console.log(agent.agentRole, '— CREAT')
  }

  console.log('')

  // 2. Adăugăm cold start prompts la cei 24
  let updated = 0
  for (const [role, prompts] of Object.entries(promptsMap)) {
    await pool.query(
      'UPDATE agent_definitions SET "coldStartPrompts" = $1, "coldStartDescription" = description WHERE "agentRole" = $2 AND (array_length("coldStartPrompts", 1) IS NULL OR array_length("coldStartPrompts", 1) = 0)',
      [prompts, role]
    )
    updated++
    process.stdout.write(role + ' ')
  }
  console.log('\n\nPrompts adaugate la', updated, 'agenti')

  // 3. Verificare finală
  const check = await pool.query(`
    SELECT "agentRole", array_length("coldStartPrompts", 1) as prompts
    FROM agent_definitions
    WHERE array_length("coldStartPrompts", 1) IS NULL OR array_length("coldStartPrompts", 1) = 0
    ORDER BY "agentRole"
  `)
  if (check.rows.length === 0) {
    console.log('\n✅ TOȚI agenții au cold start prompts')
  } else {
    console.log('\n⚠ Încă fără prompts:', check.rows.map(r => r.agentRole).join(', '))
  }

  const total = await pool.query('SELECT COUNT(*)::int as cnt FROM agent_definitions')
  console.log('Total agenți:', total.rows[0].cnt)

  pool.end()
}

run().catch(e => { console.error('ERR:', e.message); pool.end() })
