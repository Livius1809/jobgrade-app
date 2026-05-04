/**
 * KB Seed: Specialist Dezvoltare Organizațională (SDO) — Poziție L2 CPU
 *
 * MISIUNE: Validează lanțurile cauzale de SCHIMBARE:
 *   Diagnostic (3C gap, climat, profil)
 *     → Intervenție propusă (training, restructurare, coaching)
 *       → Mecanism de schimbare (cum produce intervenția efectul)
 *         → Rezultat așteptat (cu timeline, condiții, riscuri)
 *
 * DIFERENȚIERE:
 *   - PSEC = cuantifică COSTUL problemei (cât te costă să NU schimbi)
 *   - SDO = validează că SOLUȚIA propusă CHIAR produce schimbarea
 *
 * Include competența de CALIBRARE CULTURALĂ RO (Hofstede/David/GLOBE aplicat)
 *
 * POZIȚIE: L2 (Cunoaștere), servește C4 (Dezvoltare) + intervenții
 * CONSUMĂ DIN: 3C, climat, profil echipe, N3, KPI, literatura OD
 * PRODUCE: Validări intervenții, calibrări cultural RO, modele schimbare
 *
 * Source: INTERNAL_DISTILLATION
 * Confidence: 0.85
 */

interface KBSeedEntry {
  agentRole: string
  kbType: "PERMANENT" | "SHARED_DOMAIN"
  content: string
  tags: string[]
  confidence: number
  source: "INTERNAL_DISTILLATION"
}

export const SDO_SEED_ENTRIES: KBSeedEntry[] = [

  // ═══════════════════════════════════════════════════════════
  // IDENTITATE ȘI MANDAT (5 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "Specialistul în Dezvoltare Organizațională (SDO) validează că intervențiile propuse de platformă (C4 F5) CHIAR PRODUC schimbarea promisă. PSEC cuantifică problema. SDO validează SOLUȚIA. Întrebarea SDO: 'Dacă clientul face X, va obține Y? Prin ce mecanism? În ce condiții? Cu ce riscuri?'",
    tags: ["sdo", "identitate", "mandat", "validare-interventii"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "Lanțul cauzal de schimbare SDO: Diagnostic (gap 3C, climat scăzut, tensiuni N2/N4) → Intervenție propusă (tip, intensitate, durată) → Mecanism de schimbare (cum produce efectul — Lewin, Kotter, ADKAR) → Condiții necesare (leadership support, buget, timp) → Rezultat așteptat (delta pe indicatori, timeline) → Riscuri (ce poate merge prost).",
    tags: ["sdo", "lant-cauzal", "schimbare", "structura"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "SDO integrează competența de CALIBRARE CULTURALĂ RO: adaptează modelele occidentale de schimbare la specificul românesc. Ce funcționează în SUA/UK poate eșua în RO din cauza: distanța mare față de putere (Hofstede), evitare incertitudine ridicată, colectivism familial, neîncredere instituțională. SDO calibrează intervențiile.",
    tags: ["sdo", "calibrare-culturala", "romania", "hofstede"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "Diferența critică SDO vs consultant generic: consultantul spune 'faceți training de leadership'. SDO spune 'training de leadership TIP X (nu Y) cu DURATA Z luni, FRECVENȚĂ bilunară, CONDIȚIONAT de suport CEO activ, va produce delta +0.4 pe dimensiunea Leadership din CO în 6 luni, NUMAI DACĂ managerii aplică ce învață între sesiuni. Risc principal: leadership support scade după luna 2.'",
    tags: ["sdo", "diferentiere", "specificitate", "exemplu"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "SDO operează pe 5 niveluri de intervenție (conform C4 F5): (1) Strategic — CA/DG, viziune, direcție; (2) Tactic — middle management, traducere strategie în acțiune; (3) Operațional — echipe, procese, zi de zi; (4) Individual — coaching, dezvoltare personală; (5) Transversal — comunicare, cultură, valori. Fiecare nivel are mecanisme diferite de schimbare.",
    tags: ["sdo", "5-niveluri", "interventie", "multi-nivel"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // MECANISME DE SCHIMBARE (10 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Modelul Lewin aplicat: (1) Unfreeze — creează urgență, arată gap-ul (3C report + ROI cultură servesc asta); (2) Change — implementează intervenția (training, restructurare, coaching); (3) Refreeze — consolidează noile comportamente (monitorizare F7, recompense aliniate). SDO verifică că TOATE 3 fazele sunt acoperite. Skip unfreeze = rezistență. Skip refreeze = revenire.",
    tags: ["sdo", "lewin", "unfreeze-change-refreeze", "model"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Kotter 8 pași — verificare SDO: (1) Urgență creată? (2) Coaliție conducătoare formată? (3) Viziune și strategie articulate? (4) Comunicare suficientă? (5) Obstacole eliminate? (6) Victorii rapide planificate? (7) Consolidare câștiguri? (8) Ancorare în cultură? SDO nu cere toți 8 simultan dar verifică că nu lipsesc critici (ex: fără coaliție = eșec garantat).",
    tags: ["sdo", "kotter", "8-pasi", "verificare"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Rezistența la schimbare — calibrare RO: în România, rezistența se manifestă prin COMPLIANȚĂ APARENTĂ (da verbal, nu comportamental). SDO alertează: 'Angajații par de acord dar nu aplică' ≠ 'Nu au înțeles'. = 'Nu au încredere că schimbarea le servește.' Soluție: demonstrare beneficiu personal (nu doar organizațional), victorie rapidă vizibilă.",
    tags: ["sdo", "rezistenta", "compliant-aparenta", "romania"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Training ca intervenție — când funcționează vs nu: FUNCȚIONEAZĂ dacă gap-ul e de COMPETENȚĂ (nu știu cum). NU FUNCȚIONEAZĂ dacă gap-ul e de MOTIVAȚIE (nu vreau) sau CONTEXT (nu pot — sisteme/procese blochează). SDO identifică tipul gap-ului ÎNAINTE de a valida training-ul ca soluție.",
    tags: ["sdo", "training", "gap-competenta", "gap-motivatie", "gap-context"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Coaching ca intervenție — când funcționează: individul are COMPETENȚĂ dar comportamentul nu se manifestă din cauza: (a) lipsa awareness (nu știe că face greșit); (b) pattern automatizat (știe dar nu controlează); (c) conflict intern valori-comportament. Coaching funcționează pe (a) și (b), mai puțin pe (c) care necesită terapie/maturizare.",
    tags: ["sdo", "coaching", "awareness", "pattern", "conditii"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Restructurare ca intervenție — riscuri majore: (1) Pierdere cunoaștere tacită (oamenii care pleacă iau know-how-ul); (2) Anxiety generalizat (restul se tem că sunt următorii); (3) Productivitate scade 20-40% timp de 3-6 luni post-restructurare; (4) Cei mai buni pleacă primii (au alternative). SDO impune: plan retenție talente + comunicare transparentă ÎNAINTE.",
    tags: ["sdo", "restructurare", "riscuri", "cunoastere-tacita"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Timeline realist per tip intervenție: Training impact vizibil: 3-6 luni. Coaching comportament schimbat: 6-12 luni. Schimbare cultură (refreeze): 18-36 luni. Restructurare stabilizată: 6-12 luni. SDO respinge orice claim de 'schimbare culturală în 3 luni' — e imposibil neurobiologic (traseele se formează lent).",
    tags: ["sdo", "timeline", "realism", "tipuri-interventie"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Psychological safety (Edmondson) ca PRECONDIȚIE: SDO verifică că ÎNAINTE de orice intervenție de schimbare, există suficientă siguranță psihologică. Fără ea: angajații nu raportează probleme, nu propun soluții, nu experimentează. Primul pas în orice plan de schimbare = asigurare safety. Se măsoară prin clima + observație.",
    tags: ["sdo", "psychological-safety", "edmondson", "preconditie"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Calibrare RO — dimensiuni Hofstede relevante: (1) Power Distance Index mare (60-70) → deciziile vin de sus, middle management nu inițiază → intervenție trebuie să aibă VIZIBIL suport CEO; (2) Uncertainty Avoidance mare (90) → schimbarea generează anxietate excesivă → comunicare excesivă + predictibilitate; (3) Masculinity moderată → competiție dar nu extremă → echilibru rezultate/relații.",
    tags: ["sdo", "calibrare-ro", "hofstede", "pdi", "uai"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "SHARED_DOMAIN",
    content: "Efectul cascadă: SDO validează că intervenția la nivel tactic (middle management) se PROPAGĂ în jos (operațional). Condiții: (a) managerii chiar aplică ce au învățat (nu doar în sesiune); (b) au incentive aliniate (performanța lor se măsoară și pe propagare); (c) au timp alocat (nu doar 'faceți și asta pe lângă restul'). Fără cascadă reală = training izolat fără impact org.",
    tags: ["sdo", "cascada", "propagare", "middle-management"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // INTEGRARE SISTEM (5 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "SDO alimentează: (1) C4 F5 Plan intervenție — validare fiecare acțiune propusă; (2) Simulatorul organizațional — 'impactPerUnit' per intervenție calibrat de SDO; (3) F7.3 Impact intervenții — criteriile de succes definite de SDO; (4) Narativ org — mecanismul de schimbare explicat pe înțelesul clientului; (5) Timeline din slider lateral.",
    tags: ["sdo", "integrare", "consumatori", "output"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "SDO se auto-perfecționează: fiecare intervenție completată (F7.3) oferă un data point real. SDO compară predicția (delta estimat) cu rezultatul (delta real). Diferența alimentează modelul. După 10+ intervenții validate → SDO-ul devine FOARTE precis pe organizații similare (sector, mărime, cultură).",
    tags: ["sdo", "auto-perfectare", "data-point", "precizie"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "SDO colaborează cu: PSEC (cost gap — motivează urgența), PPMO (profil echipă — informează tip intervenție), JDM (legalitate intervenție — restructurarea respectă Codul Muncii?), agentul calibrare culturală (adaptare RO), COG (prioritizare — ce intervenție prima?). SDO e orchestratorul schimbării.",
    tags: ["sdo", "colaborare", "orchestrator"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "Regula anti-superficialitate SDO: NU validăm intervenții 'happy path'. Fiecare intervenție propusă trebuie să aibă: (a) Plan B dacă nu funcționează; (b) Indicatori de abandon (când ne oprim dacă nu merge); (c) Efecte secundare anticipate; (d) Cost real complet (nu doar trainer, și timp angajați + productivitate pierdută în sesiuni).",
    tags: ["sdo", "anti-superficialitate", "plan-b", "cost-complet"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SDO",
    kbType: "PERMANENT",
    content: "Secret de serviciu SDO: clientul vede 'Recomandare: Program dezvoltare leadership, 6 luni, ROI estimat 180%, investiție X RON'. NU vede: analiza tipului de gap (competență vs motivație vs context), selecția mecanismului de schimbare (Kotter pas 1-3 coaliție), calibrarea culturală (PDI mare → vizibilitate CEO obligatorie), timeline cu milestone-uri de abandon.",
    tags: ["sdo", "secret-serviciu", "invizibil", "diferentiator"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
]

export default SDO_SEED_ENTRIES
