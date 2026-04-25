/**
 * KB Seed: Mihaela Rocco — "Creativitate și Inteligență Emoțională"
 * Editura Polirom
 *
 * Cunoștințe declarative și procedurale infuzate în L2 consultanți:
 *   PPA  — inteligență emoțională, emoții pozitive, flow
 *   PSE  — dezvoltarea creativității, metode, pedagogie
 *   PSYCHOLINGUIST — comunicare emoțională, markeri lingvistici
 *   SCA  — biasuri, blocaje creative, shadow emoțional
 *   PPMO — EI organizațional, climat creativ, echipe
 *   MGA  — leadership EI, management creativ
 *   SVHA — integrare holistică EI-creativitate
 *
 * Tag-uri noi: rocco, creativitate, inteligenta-emotionala, ei-abilitate,
 *              ei-trasatura, amabile, goleman, salovey-mayer, guilford, flow
 *
 * Source: EXPERT_HUMAN (carte academică publicată)
 * Confidence: 0.75 (sursă validată academic, nu experiență directă)
 */

interface KBSeedEntry {
  agentRole: string
  kbType: "PERMANENT" | "SHARED_DOMAIN"
  content: string
  tags: string[]
  confidence: number
  source: "EXPERT_HUMAN"
}

export const ROCCO_SEED_ENTRIES: KBSeedEntry[] = [

  // ═══════════════════════════════════════════════════════════
  // PPA — Psihologie Pozitivă (12 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Modelul Salovey-Mayer definește inteligența emoțională ca abilitate cognitivă pe 4 ramuri ierarhice: (1) percepția și exprimarea emoțiilor, (2) facilitarea gândirii prin emoții, (3) înțelegerea și analiza emoțiilor, (4) reglarea reflexivă a emoțiilor. Ramurile sunt ierarhice — nu poți regla ce nu percepi. Evaluare: MSCEIT (test de performanță, nu auto-raportare).",
    tags: ["rocco", "inteligenta-emotionala", "salovey-mayer", "ei-abilitate"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Modelul Goleman structurează EI în 5 componente: auto-cunoaștere emoțională (recunoașterea propriilor emoții și efectele lor), auto-reglare (gestionarea impulsurilor și stărilor), motivație intrinsecă (pasiune pentru obiective dincolo de recompense externe), empatie (înțelegerea configurației emoționale a celorlalți), abilități sociale (competență în gestionarea relațiilor). Primele 3 sunt intra-personale, ultimele 2 inter-personale.",
    tags: ["rocco", "inteligenta-emotionala", "goleman"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Distincția EI-trăsătură vs EI-abilitate (Petrides & Furnham): EI-trăsătură = dispoziții emoționale auto-raportate (chestionare: TEIQue, EQ-i Bar-On), EI-abilitate = capacitate cognitivă de procesare emoțională (teste de performanță: MSCEIT). Corelațiile între cele 2 măsurători sunt moderate (~0.35), ceea ce confirmă că măsoară constructe diferite. În practică, ambele perspective sunt utile: trăsătura prezice adaptarea cotidiană, abilitatea prezice performanța în sarcini complexe.",
    tags: ["rocco", "inteligenta-emotionala", "ei-abilitate", "ei-trasatura"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Teoria broaden-and-build (Fredrickson) explică mecanismul prin care emoțiile pozitive potențează creativitatea: emoțiile pozitive extind momentan repertoriul gândire-acțiune (broadening), permițând asocieri mai largi, perspective multiple și flexibilitate cognitivă. În timp, acest efect construiește resurse personale durabile (building) — reziliență, rețele sociale, competențe. Implicație practică: starea emoțională pozitivă nu e un bonus, ci o condiție de operare pentru gândirea creativă.",
    tags: ["rocco", "creativitate", "inteligenta-emotionala", "fredrickson"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Relația EI-creativitate nu e liniară, ci mediată: auto-reglarea emoțională facilitează toleranța la ambiguitate (necesară în faza de incubație), empatia furnizează materie primă pentru insight (înțelegerea perspectivelor diverse), iar motivația intrinsecă susține persistența în fața eșecurilor creative. EI nu produce creativitate direct, ci creează condițiile psihologice optime pentru manifestarea ei.",
    tags: ["rocco", "creativitate", "inteligenta-emotionala"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Flow-ul (Csikszentmihalyi) reprezintă starea optimă de funcționare creativă: absorbție completă, pierderea simțului timpului, echilibru provocare-competență, feedback imediat, fuziune acțiune-conștiință. EI intervine ca reglator: prea multă anxietate sau plictiseală blochează flow-ul. Persoana cu EI ridicat își calibrează mai bine nivelul de provocare și își gestionează frustrarea când iese din flow.",
    tags: ["rocco", "creativitate", "flow", "inteligenta-emotionala"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "EI nu e fixă — se poate dezvolta pe parcursul vieții. Mecanisme: (1) experiențe emoționale diverse care extind vocabularul afectiv, (2) reflecție metacognitivă asupra propriilor reacții, (3) feedback relațional onest, (4) practică deliberată a empatiei (ascultare activă, perspective-taking), (5) jurnalul emoțional care construiește granularitate emoțională. Dezvoltarea EI e mai lentă decât cea cognitivă dar mai stabilă odată dobândită.",
    tags: ["rocco", "inteligenta-emotionala", "dezvoltare"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Modelul componențial al creativității (Amabile) identifică 3 factori necesari: (1) expertiză (cunoștințe de domeniu, abilități tehnice), (2) abilități de gândire creativă (stiluri cognitive, euristici de generare idei, stil de lucru), (3) motivație intrinsecă (interesul pur pentru sarcină). Motivația extrinsecă (recompense, termene, evaluare) poate inhiba creativitatea prin focalizarea pe produs în loc de proces. Motivația intrinsecă este singurul factor pe care mediul social îl poate amplifica sau distruge rapid.",
    tags: ["rocco", "creativitate", "amabile", "motivatie"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Gândirea divergentă (Guilford) operează pe 4 dimensiuni: fluență (câte idei generezi), flexibilitate (câte categorii diferite abordezi), originalitate (cât de neobișnuite sunt ideile), elaborare (cât de detaliat dezvolți fiecare idee). Emoțiile pozitive amplifică fluența și flexibilitatea, dar originalitatea depinde mai mult de toleranța la ambiguitate și disponibilitatea de a abandona soluții familiare — ambele facilitate de auto-reglarea emoțională.",
    tags: ["rocco", "creativitate", "guilford", "gandire-divergenta"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Procesul creativ (Wallas, 1926, reactualizat de Rocco): (1) Pregătire — imersiune în problemă, acumulare de date, emoția dominantă: curiozitate; (2) Incubație — procesare inconștientă, emoția dominantă: toleranță la frustrare (nu știi când vine soluția); (3) Iluminare — insight-ul apare brusc, emoție: bucurie, entuziasm, uneori teamă; (4) Verificare — testare critică, emoție: disciplină, acceptare a imperfecțiunii. Fiecare etapă cere o competență EI diferită.",
    tags: ["rocco", "creativitate", "wallas", "proces-creativ"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Granularitatea emoțională (emotional granularity, Barrett) e un predictor mai bun al creativității decât intensitatea emoțională: persoanele care diferențiază fin între stări emoționale (nu doar 'mă simt bine/rău' ci 'simt o combinație de entuziasm cu o ușoară neliniște') au acces la mai multă informație emoțională pe care o pot folosi în procesul creativ. Dezvoltarea granularității = dezvoltarea vocabularului emoțional + reflecție + expunere la diversitate emoțională.",
    tags: ["rocco", "inteligenta-emotionala", "creativitate", "granularitate"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPA",
    kbType: "SHARED_DOMAIN",
    content: "Reziliența emoțională e fundamentul creativității pe termen lung: procesul creativ implică inevitabil eșec, respingere, frustrare. Rocco argumentează că diferența între oamenii care rămân creativi și cei care abandonează nu e talentul, ci capacitatea de a metaboliza emoțional eșecul — de a-l integra ca informație utilă fără a-l internaliza ca verdict identitar. EI oferă exact acest mecanism: separarea evenimentului de sine.",
    tags: ["rocco", "creativitate", "inteligenta-emotionala", "rezilienta"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },

  // ═══════════════════════════════════════════════════════════
  // PSE — Științe Educaționale (8 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "PSE",
    kbType: "SHARED_DOMAIN",
    content: "Creativitatea se dezvoltă prin practică deliberată, nu prin inspirație spontană. Metode validate: brainstorming (Osborn) — separarea generării de evaluare; sinectică (Gordon) — analogii forțate între domenii diferite; gândire laterală (de Bono) — provocarea asumțiilor implicite; SCAMPER — check-list de transformări sistematice (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse). Toate metodele au în comun: suspendarea temporară a judecății critice.",
    tags: ["rocco", "creativitate", "metode", "brainstorming"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSE",
    kbType: "SHARED_DOMAIN",
    content: "Antrenamentul EI la adulți (andragogie) cere altă abordare decât la copii: adulții învață din experiență, nu din instrucțiune. Program eficient (bazat pe Rocco): (1) conștientizare — jurnal emoțional 2 săptămâni, (2) vocabular — numește 3 emoții distincte pe zi, (3) pattern — identifică triggerele emoționale recurente, (4) experiment — testează o reacție alternativă la un trigger cunoscut, (5) integrare — reflecție pe schimbarea observată. Durata: minim 3 luni pentru rezultate stabile.",
    tags: ["rocco", "inteligenta-emotionala", "dezvoltare", "andragogie"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSE",
    kbType: "SHARED_DOMAIN",
    content: "Reflecția metacognitivă amplifică atât creativitatea cât și EI: capacitatea de a observa propriul proces de gândire și de simțire permite: (a) detectarea momentului când te-ai blocat într-un pattern neproductiv, (b) schimbarea deliberată de perspectivă, (c) recunoașterea momentului de insight înainte de a-l pierde. Instrumentul cel mai simplu: întrebarea 'ce fac acum și de ce?' aplicată periodic în procesul de lucru.",
    tags: ["rocco", "creativitate", "metacognitie", "dezvoltare"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSE",
    kbType: "SHARED_DOMAIN",
    content: "Evaluarea creativității (instrumente din Rocco): Testele Torrance (TTCT) — fluență, flexibilitate, originalitate, elaborare + rezistență la închidere prematură; Remote Associates Test (RAT) — asocieri la distanță; Consensual Assessment Technique (CAT, Amabile) — evaluare de expert, cel mai valid ecologic dar costisitor. Atenție: creativitatea evaluată prin teste standardizate corelează moderat (~0.3) cu creativitatea în viața reală — contextul contează enorm.",
    tags: ["rocco", "creativitate", "evaluare", "torrance"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSE",
    kbType: "SHARED_DOMAIN",
    content: "Teoria investiției creative (Sternberg & Lubart): creativitatea = 'a cumpăra ieftin și a vinde scump' în domeniul ideilor. Necesită 6 resurse: (1) inteligență — sintetică (combini), analitică (evaluezi), practică (implementezi); (2) cunoștințe — suficiente dar nu excesive (expertiza poate genera rigiditate); (3) stiluri de gândire — legislativ (preferința de a crea reguli proprii); (4) personalitate — toleranță la ambiguitate, deschidere; (5) motivație — predominant intrinsecă; (6) mediu — permisiv și stimulant.",
    tags: ["rocco", "creativitate", "sternberg", "investitie-creativa"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSE",
    kbType: "SHARED_DOMAIN",
    content: "Paradoxul expertizei în creativitate (Rocco): cunoștințele de domeniu sunt simultan condiție necesară și potențial inhibitor. Expertul vede mai repede soluțiile familiare dar tocmai de aceea poate rata soluțiile neconvenționale. Soluția: cross-fertilizare — expunere deliberată la domenii adiacente sau complet diferite. Echipele cele mai creative combină specialiști profunzi cu generaliști curioși.",
    tags: ["rocco", "creativitate", "expertiza", "cross-fertilizare"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSE",
    kbType: "SHARED_DOMAIN",
    content: "Incubația creativă nu e pasivitate — e procesare inconștientă activă. Condițiile care o favorizează (din Rocco): (1) imersiune prealabilă suficientă (faza de pregătire completă), (2) activitate ușor captivantă dar ne-legată de problemă (plimbare, duș, treburi casnice), (3) absența presiunii temporale acute, (4) somn adecvat (consolidarea memoriei). Implicație practică: 'lasă problema să lucreze' funcționează doar dacă ai investit anterior efort conștient serios.",
    tags: ["rocco", "creativitate", "incubatie", "proces-creativ"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSE",
    kbType: "SHARED_DOMAIN",
    content: "Jurnalul emoțional-creativ (instrument integrat din Rocco): combină jurnalul emoțional cu jurnalul de idei. Format: (1) situația / sarcina creativă, (2) ce am simțit pe parcurs (3+ emoții distincte), (3) ce am observat despre procesul meu de gândire, (4) ce m-a blocat și ce m-a deblocat, (5) ce aș face diferit. Beneficiu dublu: dezvoltă simultan granularitatea emoțională și conștiința metacognitivă asupra procesului creativ.",
    tags: ["rocco", "creativitate", "inteligenta-emotionala", "jurnal", "dezvoltare"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },

  // ═══════════════════════════════════════════════════════════
  // PSYCHOLINGUIST — Comunicare emoțională (6 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "PSYCHOLINGUIST",
    kbType: "SHARED_DOMAIN",
    content: "Markerii lingvistici ai inteligenței emoționale (Rocco): vocabular emoțional diferențiat (nu 'bine/rău' ci nuanțat), utilizarea pronumelui 'eu' în contexte de asumarea responsabilității emoționale ('eu simt' nu 'tu mă faci să simt'), capacitatea de a numi simultan emoții aparent contradictorii ('sunt bucuros dar și neliniștit'), metafore emoționale elaborate care depășesc clișeele. Un agent client-facing poate detecta nivelul EI al interlocutorului din acești markeri.",
    tags: ["rocco", "inteligenta-emotionala", "lingvistica", "markeri"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSYCHOLINGUIST",
    kbType: "SHARED_DOMAIN",
    content: "Comunicarea empatică eficientă (Rocco, aplicație EI): reflectarea nu e papagalizare ('deci ești trist') ci reformulare cu adâncire ('parcă simți că efortul tău nu e văzut'). Empatia cognitivă (înțeleg perspectiva ta) trebuie precedată de empatia emoțională (simt că asta contează pentru tine). Ordinea contează: dacă sari direct la înțelegere fără validare emoțională, interlocutorul se simte analizat, nu înțeles.",
    tags: ["rocco", "inteligenta-emotionala", "empatie", "comunicare"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSYCHOLINGUIST",
    kbType: "SHARED_DOMAIN",
    content: "Limbajul care blochează creativitatea (Rocco — markeri destructivi): 'da, dar...' (validare falsă urmată de negare), 'nu se poate' (încheiere prematură), 'am mai încercat' (generalizare bazată pe experiență limitată), 'fii realist' (conformism deghizat în pragmatism), 'nu e rolul meu' (evitare). Alternativa constructivă: 'da și...' (build on), 'cum am putea...' (deschidere), 'ce ar trebui să fie adevărat ca să funcționeze?' (testare asumțiilor).",
    tags: ["rocco", "creativitate", "comunicare", "blocaje"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSYCHOLINGUIST",
    kbType: "SHARED_DOMAIN",
    content: "Calibrarea emoțională în dialog (aplicație Rocco pentru agenți): când interlocutorul exprimă frustrare creativă, nu minimiza ('e normal') și nu amplifica ('înțeleg, e groaznic'). Formula calibrată: (1) oglindește intensitatea la ~80% din cea percepută ('asta chiar te consumă'), (2) normalizează fără a banaliza ('procesul creativ are mereu aceste momente de impas'), (3) oferă perspectivă temporală ('în experiența mea, impasul de obicei precede un progres').",
    tags: ["rocco", "inteligenta-emotionala", "calibrare", "comunicare"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSYCHOLINGUIST",
    kbType: "SHARED_DOMAIN",
    content: "Registrul lingvistic al creativității (Rocco): gândirea creativă se manifestă lingvistic prin: metafore noi (nu clișee), juxtapuneri neobișnuite, întrebări de tip 'ce-ar fi dacă', condiționale exploratorii ('ar putea fi și...'), și prin libertatea de a abandona o idee fără a o apăra (non-atașament cognitiv). Un agent care facilitează creativitatea trebuie să modeleze acest registru: să folosească el însuși limbaj exploratoriu, nu directiv.",
    tags: ["rocco", "creativitate", "lingvistica", "registru"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PSYCHOLINGUIST",
    kbType: "SHARED_DOMAIN",
    content: "Alexitimia parțială (Rocco): nu toți oamenii cu dificultăți de exprimare emoțională au alexitimie clinică. Mulți au pur și simplu un vocabular emoțional sărăcit din lipsă de practică (mai ales bărbați socializați în culturi care descurajează exprimarea emoțiilor). Soluția nu e etichetare ('ai alexitimie') ci ghidare treptată: 'ce senzație fizică ai acum?', 'unde o simți în corp?', 'dacă senzația asta ar avea o culoare, care ar fi?'. Corpul e poarta de intrare când mintea e blocată.",
    tags: ["rocco", "inteligenta-emotionala", "alexitimie", "comunicare"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },

  // ═══════════════════════════════════════════════════════════
  // SCA — Shadow Cartographer (6 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "SCA",
    kbType: "SHARED_DOMAIN",
    content: "Perfecționismul disfuncțional ca blocaj creativ (Rocco): perfecționismul adaptativ ('vreau să fac treabă bună') facilitează calitatea; perfecționismul maladaptiv ('dacă nu e perfect nu merit') paralizează. Diagnosticul diferențial: adaptativul permite publicarea/livrarea cu satisfacție; maladaptivul amână la infinit, re-face obsesiv, sau abandonează. La bază: frica de evaluare, nu dorința de excelență. Intervenție: expunere graduală la imperfecțiune deliberată.",
    tags: ["rocco", "creativitate", "perfectionism", "blocaj"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "SCA",
    kbType: "SHARED_DOMAIN",
    content: "Biasuri cognitive care sabotează creativitatea (Rocco): (1) Fixitate funcțională — obiecte/idei au doar rolul lor obișnuit; (2) Anchoring — prima idee devine referință, celelalte se evaluează doar în raport cu ea; (3) Confirmation bias — cauți dovezi doar pentru ideea ta; (4) Sunk cost — 'am investit prea mult ca să abandonez'; (5) Status quo bias — 'ce avem funcționează destul de bine'. Toate au în comun: preferința inconștientă pentru predictibilitate vs. noutate.",
    tags: ["rocco", "creativitate", "bias", "blocaj"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "SCA",
    kbType: "SHARED_DOMAIN",
    content: "Frica de evaluare (evaluation apprehension, Rocco): una din cele mai puternice bariere la creativitate. Se manifestă prin auto-cenzură precoce ('ideea asta e stupidă, nu o zic'), conformism ('ce ar zice ceilalți?'), și procrastinare creativă ('mai cercetez puțin înainte să propun'). Mecanismul: amigdala semnalează pericol social înainte ca ideea să ajungă la cortexul prefrontal. Antidot: norme explicite de siguranță psihologică (Edmondson) + separarea strictă generare/evaluare.",
    tags: ["rocco", "creativitate", "frica-evaluare", "siguranta-psihologica"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "SCA",
    kbType: "SHARED_DOMAIN",
    content: "Conformismul creativ (Rocco): paradoxul prin care încercarea de a fi creativ într-un grup produce conformism — toți se aliniază la 'tipul de creativitate' acceptat în acel grup. Exemplu: echipa de design care produce variații ale aceluiași stil. Mecanismul: normele implicite de grup definesc ce e 'creativ acceptabil'. Detectare: verifică dacă ideile propuse sunt surprinzătoare pentru alți membri sau doar variații predictibile. Intervenție: introduce deliberat perspective externe.",
    tags: ["rocco", "creativitate", "conformism", "bias-grup"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "SCA",
    kbType: "SHARED_DOMAIN",
    content: "Bypass-ul emoțional în procesul creativ (Rocco): unii oameni folosesc creativitatea ca mecanism de evitare emoțională — produc intens dar nu procesează ce simt. Semnale: productivitate foarte mare dar satisfacție foarte mică, teme repetitive fără conștiență a repetiției, incapacitatea de a se opri și reflecta. Diferențierea de flow autentic: în flow există bucurie și prezență; în bypass există agitație și fugă de sine.",
    tags: ["rocco", "creativitate", "inteligenta-emotionala", "bypass-emotional"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "SCA",
    kbType: "SHARED_DOMAIN",
    content: "Umbra creativă (integrare Rocco + Jung): fiecare trăsătură creativă are o umbră. Originalitatea → excentricitate gratuită. Fluența → superficialitate. Flexibilitatea → instabilitate. Elaborarea → obsesie pentru detalii. Independența → izolare. Deschiderea → naivitate. Detectarea umbrei: trăsătura nu mai servește procesul ci servește imaginea de sine ('sunt creativ' devine identitate, nu instrument).",
    tags: ["rocco", "creativitate", "umbra", "shadow"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },

  // ═══════════════════════════════════════════════════════════
  // PPMO — Psihologia Muncii & Organizațiilor (8 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "PPMO",
    kbType: "SHARED_DOMAIN",
    content: "Clima organizațională pentru creativitate (Amabile via Rocco): 6 factori critici — (1) provocare (sarcini care stimulează), (2) libertate (autonomie în cum rezolvi), (3) resurse (timp, informație, instrumente), (4) suport din partea echipei, (5) suport din partea supervizorului (încurajare + non-interferență), (6) absența obstacolelor organizaționale (birocrație, politică internă, competiție destructivă). Creativitatea organizațională nu e un atribut al indivizilor ci al sistemului.",
    tags: ["rocco", "creativitate", "climat-organizational", "amabile"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPMO",
    kbType: "SHARED_DOMAIN",
    content: "EI a liderului și inovația echipei (Rocco): liderul cu EI ridicat creează siguranță psihologică (membrii propun idei fără frică de ridicol), oferă feedback emoțional calibrat (nu doar 'bravo' sau 'nu merge' ci 'văd că ai investit mult în asta — ce te-a ghidat?'), modelează vulnerabilitate intelectuală ('nu știu, hai să explorăm'), și detectează emoțiile neexprimate din echipă înainte ca ele să devină conflicte. EI a liderului prezice inovația echipei mai bine decât IQ-ul agregat al membrilor.",
    tags: ["rocco", "inteligenta-emotionala", "leadership", "inovatie"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPMO",
    kbType: "SHARED_DOMAIN",
    content: "EI ca predictor de performanță profesională (Rocco, meta-analiză): EI prezice performanța mai bine în joburi cu cerințe emoționale ridicate (servicii, management, vânzări, educație, sănătate) decât în joburi tehnice pure. Mecanismul: EI → relații interpersonale mai bune → cooperare → partajare informații → performanță de echipă. EI individuală contează mai puțin în organizațiile cu procese excelente (procesele compensează deficitul individual), dar contează decisiv în organizațiile emergente sau în criză.",
    tags: ["rocco", "inteligenta-emotionala", "performanta", "predictie"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPMO",
    kbType: "SHARED_DOMAIN",
    content: "Diversitatea emoțională în echipe creative (Rocco): echipele omogene emoțional (toți optimiști sau toți critici) performează mai slab creativ decât cele heterogene. Optimiștii generează, criticii filtrează, empații detectează puncte moarte, analiticii structurează. Riscul: conflictul nemediat între stiluri emoționale diferite. Soluția: norme explicite care legitimizează diferența ('avem nevoie de vocea critică la fel ca de cea entuziastă').",
    tags: ["rocco", "creativitate", "echipe", "diversitate-emotionala"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPMO",
    kbType: "SHARED_DOMAIN",
    content: "Barierele organizaționale la creativitate (Rocco, taxonomie): (1) Structurale — ierarhie rigidă, silozuri departamentale, procese excesive de aprobare; (2) Culturale — penalizarea eșecului, cultul eficienței vs. explorare, 'nu e inventat aici'; (3) Temporale — presiune continuă pe termen scurt care elimină incubația; (4) Motivaționale — recompense doar pe rezultate predictibile, nu pe experimentare. Diagnostic: întreabă oamenii 'care e ultima idee neconvențională pe care ai propus-o și ce s-a întâmplat?'",
    tags: ["rocco", "creativitate", "bariere", "organizational"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPMO",
    kbType: "SHARED_DOMAIN",
    content: "Auto-reglarea emoțională în negociere și decizie (aplicație Rocco-Goleman): în procesele organizaționale critice (evaluare, negociere, decizie sub presiune), EI intervine prin: (1) name it to tame it — identificarea emoției reduce intensitatea ei, (2) reappraisal — reinterpretarea situației ('nu e amenințare, e informație'), (3) time-out strategic — recunoașterea momentului când capacitatea de decizie rațională e compromisă emoțional. Implicație pentru evaluarea joburilor: evaluatorul cu EI ridicat produce scoruri mai stabile și mai puțin afectate de efectul de halo.",
    tags: ["rocco", "inteligenta-emotionala", "auto-reglare", "decizie"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPMO",
    kbType: "SHARED_DOMAIN",
    content: "Epuizarea emoțională (burnout emoțional, Rocco): profesiile cu cerințe emoționale mari (învățământ, sănătate, servicii sociale, management) au risc crescut de burnout nu doar din volum de muncă ci din labor emoțional continuu. EI ajută dar nu protejează complet — un nivel EI foarte ridicat fără limite sănătoase poate chiar accelera burnout-ul (empatia nesupravegheată duce la absorbție emoțională). Soluția: EI + limite clare + recuperare activă.",
    tags: ["rocco", "inteligenta-emotionala", "burnout", "labor-emotional"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "PPMO",
    kbType: "SHARED_DOMAIN",
    content: "Selecția și dezvoltarea bazată pe EI (Rocco, aplicație HR): EI poate fi integrată în: (1) Recrutare — situational judgment tests cu scenarii emoționale, (2) Evaluare performanță — 360° care include competențe EI, (3) Dezvoltare — coaching centrat pe conștientizare emoțională, (4) Formarea echipelor — complementaritate în profiluri emoționale, (5) Succesiune — liderii de nivel următor au nevoie de EI proporțional cu complexitatea rolului. Atenție: EI nu poate fi cerută dacă nu e cultivată — cultura organizațională trebuie să o modeleze.",
    tags: ["rocco", "inteligenta-emotionala", "hr", "selectie", "dezvoltare"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },

  // ═══════════════════════════════════════════════════════════
  // MGA — Management & Leadership (4 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "MGA",
    kbType: "SHARED_DOMAIN",
    content: "Leadership-ul EI (Goleman via Rocco): 6 stiluri de leadership, fiecare necesitând competențe EI diferite — (1) Vizionar (auto-încredere, empatie, catalizator al schimbării), (2) Coach (conștiință emoțională, empatie, dezvoltarea altora), (3) Afiliativ (empatie, construire relații, gestionare conflicte), (4) Democratic (colaborare, leadership de echipă, comunicare), (5) Pacesetting (conștiinciozitate, orientare spre rezultate — cel mai puțin EI), (6) Coercitiv (auto-control, inițiativă — cel mai riscant). Liderii eficienți comută între stiluri; EI e abilitatea de a ști CÂND.",
    tags: ["rocco", "inteligenta-emotionala", "leadership", "goleman"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "MGA",
    kbType: "SHARED_DOMAIN",
    content: "Managementul inovației necesită paradoxuri emoționale (Rocco): liderul trebuie simultan să (a) protejeze echipa de presiune externă dar să mențină urgența internă, (b) să tolereze eșecul dar să ceară excelență, (c) să dea libertate dar să mențină direcția, (d) să asculte experții dar să provoace status quo-ul. Gestionarea acestor paradoxuri e o competență EI de nivel superior — necesită toleranță la ambiguitate și capacitatea de a menține tensiuni productive fără a le rezolva prematur.",
    tags: ["rocco", "creativitate", "management", "inovatie", "paradox"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "MGA",
    kbType: "SHARED_DOMAIN",
    content: "Feedback-ul creativ (Rocco, aplicație management): feedback-ul pe produse creative diferă fundamental de feedback-ul pe performanță operațională. Reguli: (1) întâi întreabă procesul ('cum ai ajuns la asta?') apoi evaluează produsul, (2) separă persoana de idee ('ideea are o problemă' nu 'tu ai o problemă'), (3) evaluează pe criterii explicite, nu pe gust ('nu se potrivește obiectivului X' nu 'nu-mi place'), (4) oferă direcție nu soluție ('ce-ar fi dacă explorezi și...' nu 'fă-o așa'). Feedback-ul prost administrat poate distruge motivația intrinsecă în mod ireversibil.",
    tags: ["rocco", "creativitate", "feedback", "management"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "MGA",
    kbType: "SHARED_DOMAIN",
    content: "Contagiunea emoțională în organizații (Rocco): emoțiile se propagă în organizație de sus în jos mai rapid decât de jos în sus (efectul de cascadă emoțională). Starea emoțională a CEO-ului influențează direct C-suite care influențează middle management care influențează front-line. Implicație: investiția în EI a top management-ului are ROI disproporționat de mare. Risc: liderul cu EI scăzut nu doar nu inspiră, ci contaminează activ cu anxietate, frustrare sau cinism.",
    tags: ["rocco", "inteligenta-emotionala", "contagiune-emotionala", "leadership"],
    confidence: 0.75,
    source: "EXPERT_HUMAN",
  },

  // ═══════════════════════════════════════════════════════════
  // SVHA — Integrare Holistică (3 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "SVHA",
    kbType: "SHARED_DOMAIN",
    content: "Convergența EI-creativitate cu tradițiile contemplative (Rocco, capitol final): auto-cunoașterea emoțională (pilonul 1 Goleman) e echivalentul funcțional al mindfulness-ului (sati) din tradiția budistă — observarea non-reactivă a experiențelor interne. Diferența: EI e orientată spre acțiune (observ ca să reglez), mindfulness e orientat spre prezență (observ ca să fiu). Integrarea celor două produce o calitate rară: prezență acționabilă — ești complet aici și complet eficient simultan.",
    tags: ["rocco", "inteligenta-emotionala", "mindfulness", "holistic"],
    confidence: 0.70,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "SVHA",
    kbType: "SHARED_DOMAIN",
    content: "Creativitatea ca expresie a întregului (integrare Rocco-holistic): în viziunea holistică, creativitatea nu e o abilitate izolată ci expresia unei persoane integrate — gândire (cognție), simțire (emoție), voință (acțiune) și intuiție (percepție directă) funcționează armonios. Blocajul creativ nu e un deficit cognitiv ci o disociere: una din cele 4 funcții e suprimată. Implicație B2C: procesul de dezvoltare personală IS procesul de devenire creativă — sunt același lucru văzut din unghiuri diferite.",
    tags: ["rocco", "creativitate", "holistic", "integrare"],
    confidence: 0.70,
    source: "EXPERT_HUMAN",
  },
  {
    agentRole: "SVHA",
    kbType: "SHARED_DOMAIN",
    content: "Emoția ca informație, nu ca obstacol (principiu integrat Rocco): tradițiile sapiențiale și psihologia modernă convergesc: emoția nu trebuie controlată sau transcensă, ci ascultată. Frica semnalează o limită care merită explorată. Furia semnalează o valoare încălcată. Tristețea semnalează o pierdere care cere integrare. Bucuria semnalează alinierea cu valorile autentice. EI nu e managementul emoțiilor ci dialogul cu ele. Creativitatea începe exact acolo unde ascultăm ce ne spun emoțiile.",
    tags: ["rocco", "inteligenta-emotionala", "holistic", "emotie-informatie"],
    confidence: 0.70,
    source: "EXPERT_HUMAN",
  },
]

export default ROCCO_SEED_ENTRIES
