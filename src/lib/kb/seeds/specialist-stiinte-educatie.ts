/**
 * KB Seed: Specialist Științele Educației (SSED) — Poziție L2 CPU
 *
 * MISIUNE: Validează lanțurile cauzale educaționale:
 *   Concept/competență (curriculum)
 *     → Metodă pedagogică/andragogică (Herrmann, contexte)
 *       → Rezultat de învățare măsurabil (achiziție + transfer)
 *
 * DIFERENȚIERE:
 *   - PPMO = măsoară profilul cognitiv/personalitate
 *   - SSED = validează că METODA produce REZULTATUL educațional promis
 *
 * POZIȚIE: L2 (Cunoaștere), adiacent PPMO, servește edu4life + B2C
 * CONSUMĂ DIN: Herrmann, psihologia vârstelor, curriculum formal, Motor Teritorial
 * PRODUCE: Validări metodologice, calibrări edu4life, programe validate
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

export const SSED_SEED_ENTRIES: KBSeedEntry[] = [

  // ═══════════════════════════════════════════════════════════
  // IDENTITATE ȘI MANDAT (5 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "Specialistul în Științele Educației (SSED) validează că metodele pedagogice/andragogice propuse de engine-ul de recontextualizare produc efectiv rezultatele de învățare promise. Nu creează conținut — validează MECANISMUL prin care conținutul produce achiziție și transfer.",
    tags: ["ssed", "identitate", "mandat", "validare-pedagogica"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "Lanțul cauzal educațional standard SSED: Concept (nucleu dur) → Încadrare Herrmann (ce cadrane activează) → Context complementar (activează cadranele lipsă) → Instrument didactic (role-play, studiu de caz, etc.) → Achiziție (individul știe) → Transfer (individul aplică în viață) → Trăsătură cultivată (comportament observabil).",
    tags: ["ssed", "lant-cauzal", "educational", "structura"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "SSED diferențiază PEDAGOGIE (copii/adolescenți) de ANDRAGOGIE (adulți). Principii diferite: copilul are nevoie de ghidare structurată + joc, adultul are nevoie de relevanță imediată + autonomie + conexiune cu experiența anterioară. Engine-ul de recontextualizare TREBUIE să producă instrumente diferite per palier de vârstă.",
    tags: ["ssed", "pedagogie", "andragogie", "diferentiere-varsta"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "SSED validează că repetiția prin contexte variate (principiu edu4life) produce efectiv consolidare neurală. Criteriu: același concept plasat în minimum 3 contexte diferite, din sfere diferite ale vieții individului (academic, relațional, profesional), produce retenție >80% la 30 zile vs. <40% pentru repetiție mecanică.",
    tags: ["ssed", "repetitie-contexte", "consolidare", "validare"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "Diferența critică SSED vs alți agenți: PPMO spune 'elevul e dominant Herrmann B'. Engine-ul produce 'context complementar pe cadranele C+D'. SSED validează: 'contextul produs e adecvat didactic? Instrumentul (role-play) funcționează la vârsta 14? Transferul e realist în 3 contexte variate? Trăsătura vizată (creativitate) chiar se cultivă prin acest exercițiu?'",
    tags: ["ssed", "diferentiere", "validare-completa"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // MECANISME EDUCAȚIONALE VALIDATE (10 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Bloom's taxonomy revisited ca validare output: SSED verifică că fiecare MBook edu4life atinge minimum nivelul 3 (Aplicare), ideal nivelul 4 (Analiză). Simpla memorare (nivel 1) sau înțelegere (nivel 2) fără aplicare = eșec pedagogic. What-if-urile din MBook trebuie să forțeze nivelul Analiză.",
    tags: ["ssed", "bloom", "taxonomie", "nivele-invatare"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Zona proximei dezvoltări (Vygotsky) aplicată pe engine: contextul complementar trebuie să fie în zona proximă — nici prea ușor (plictisitor, fără dezvoltare), nici prea greu (frustrant, abandon). SSED calibrează dificultatea per palier de vârstă × nivel de prerechizite.",
    tags: ["ssed", "vygotsky", "zona-proxima", "calibrare-dificultate"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Learning by doing (Dewey) — validare SSED: minimum 60% din contextele produse de engine trebuie să conțină O ACȚIUNE pe care individul o face (nu doar citește/privește). Acțiunea poate fi: rezolvare problemă, simulare decizie, role-play mental, experiment what-if. Pasivitatea = retenție sub 20%.",
    tags: ["ssed", "dewey", "learning-by-doing", "actiune"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Motivația intrinsecă (Deci & Ryan — Self-Determination Theory): SSED verifică că contextele edu4life satisfac cele 3 nevoi: (1) Autonomie — individul alege, nu e forțat; (2) Competență — simte că progresează; (3) Relaționare — conectat cu alții. Lipsa oricăreia → demotivare → abandon.",
    tags: ["ssed", "motivatie-intrinseca", "sdt", "deci-ryan"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Psihologia vârstelor — praguri SSED: 6-10 ani (concret-operațional, joc structurat, max 15 min focalizare); 11-14 ani (tranziție formal, abstractizare incipientă, identitate, grup); 15-18 ani (formal complet, proiectare viitor, autonomie crescută); 18+ (andragogie, relevanță imediată, experiență anterioară).",
    tags: ["ssed", "psihologia-varstelor", "praguri", "paliere"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Transferul învățării — criteriu SSED: un context educațional e valid doar dacă produce TRANSFER (aplicare în situații noi, non-identice cu cea de antrenament). Verificare: 'Dacă elevul a învățat fracțiile prin context de bucătărie, le poate aplica pe buget personal?' Dacă nu → contextul e prea specific, nu generalizează.",
    tags: ["ssed", "transfer", "generalizare", "validare"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Cultivarea trăsăturilor de caracter (Seligman VIA) — validare SSED: o trăsătură NU se cultivă prin discurs despre ea, ci prin EXERCITARE repetată în contexte variate. Ex: generozitatea nu se predă — se practică. Engine-ul trebuie să creeze SITUAȚII în care comportamentul generos e natural, nu impus.",
    tags: ["ssed", "trasaturi-caracter", "seligman", "exercitare"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Feedback formativ vs sumativ — SSED impune: edu4life folosește EXCLUSIV feedback formativ (te ajută să crești) NICIODATĂ sumativ (te clasifică). Zero note, zero ranking, zero comparație cu alții. Progresul e raportat la sine-anterior, nu la normă de grup.",
    tags: ["ssed", "feedback-formativ", "zero-note", "progres-individual"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Multimodalitate senzorială — SSED verifică: fiecare MBook activează minimum 2 canale (vizual + auditiv, sau vizual + kinestezic-mental). Un singur canal = retenție limitată. MBook-urile interactive cu what-if activează vizual + cognitiv-activ. Video/audio adaugă canal auditiv. Ideal: 3 canale simultan.",
    tags: ["ssed", "multimodalitate", "canale-senzoriale", "mbook"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "SHARED_DOMAIN",
    content: "Spaced repetition calibrată SSED: conceptul reapare la intervale crescătoare (1 zi → 3 zile → 7 zile → 21 zile → 60 zile). Engine-ul trebuie să planifice RE-EXPUNEREA la concepte în contexte noi la aceste intervale. Fără spacing → curba uitării (Ebbinghaus) elimină 80% în 30 zile.",
    tags: ["ssed", "spaced-repetition", "ebbinghaus", "planificare"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // INTEGRARE SISTEM (5 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "SSED validează output-ul engine-ului de recontextualizare ÎNAINTE de publicare. Workflow: Engine produce MBook draft → SSED verifică (adecvare vârstă, Bloom atins, transfer posibil, trăsătură vizată realistă, spacing planificat) → APROBAT/REVIZUIT/RESPINS cu feedback specific.",
    tags: ["ssed", "workflow", "validare-pre-publicare"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "SSED calibrează edu4life sandbox (pilot pe 3 niveluri): definește criteriile de succes per nivel (primar: engagement + retenție concept; gimnaziu: transfer + trăsătură manifestată; liceu: autonomie + aplicare complexă). Fără criterii SSED, sandbox-ul nu are ce măsura.",
    tags: ["ssed", "sandbox", "criterii-succes", "pilot"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "SSED alimentează mecanismul inferențial edu4life: 'Am aplicat metoda X pe conceptul Y la palierul Z → rezultatul a fost W'. Aceste validări devin InferenceUpdate de tip INTERVENTION_RESULT care consolidează sau revizuiesc inferențele educaționale ale platformei.",
    tags: ["ssed", "inferential", "feedback-loop", "auto-perfectare"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "SSED colaborează cu: PPMO (profilul cognitiv al individului), Psiholingvist (formularea accesibilă per vârstă), PSEC (impactul economic al educației — ROI formare), L3 (cadru legal educație, libertatea profesorilor). Nu lucrează izolat — integrează perspectivele.",
    tags: ["ssed", "colaborare", "echipa-l2"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "SSED",
    kbType: "PERMANENT",
    content: "Secret de serviciu SSED: clientul (elevul/părintele/educatorul) NU vede niciodată 'taxonomia Bloom' sau 'zona proximă Vygotsky'. Vede doar rezultatul: un context captivant care produce învățare. SSED e invizibil — calitatea lui se simte în eficiența învățării, nu în jargon expus.",
    tags: ["ssed", "secret-serviciu", "invizibil", "calitate"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
]

export default SSED_SEED_ENTRIES
