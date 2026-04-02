/**
 * owner-calibration.ts — Calibrare input-uri Owner pe cele 3 Layere
 *
 * Principiu: Owner-ul NU e deasupra sistemului de valori — e PARTE din el.
 * CÂMPUL validează pe toată lumea, inclusiv sursa de autoritate.
 *
 * NU blochează — SEMNALEAZĂ. Cu respect, cu context, cu alternativă.
 *
 * Se aplică pe:
 * - Mesaje în COG Chat
 * - Decizii pe propuneri (approve/reject/defer)
 * - Instrucțiuni directe către agenți
 *
 * Cele 3 Layere verificate:
 * L1 — CÂMPUL: Alinierea cu BINELE, detectare Umbră, calibrare Hawkins
 * L2 — SUPORT: Calibrare culturală, lingvistică, psihologică
 * L3 — LEGAL: Conformitate GDPR, dreptul muncii, AI Act, Directiva UE
 */

import { quickMoralCheck, UMBRA, EXTERNAL_COMMUNICATION } from "./moral-core"
import { fieldValidate } from "./field-transcendent"
import { calibrateAction } from "./consciousness-map"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type CalibrationSeverity = "INFO" | "ATENȚIE" | "IMPORTANT" | "CRITIC"

export interface CalibrationFlag {
  layer: "L1" | "L2" | "L3"
  severity: CalibrationSeverity
  message: string
  suggestion?: string
}

export interface OwnerCalibrationResult {
  input: string
  flags: CalibrationFlag[]
  isAligned: boolean
  summary: string
  hawkinsEstimate?: number
}

// ── L1: Calibrare CÂMP (morală, etică, conștiință) ──────────────────────────

function calibrateL1(input: string): CalibrationFlag[] {
  const flags: CalibrationFlag[] = []
  const lower = input.toLowerCase()

  // 1. Verificare morală rapidă
  const moralCheck = quickMoralCheck(input)
  if (!moralCheck.aligned) {
    flags.push({
      layer: "L1",
      severity: "IMPORTANT",
      message: moralCheck.reflection,
      suggestion: moralCheck.suggestion,
    })
  }

  // 2. Calibrare Hawkins
  const hawkins = calibrateAction(input)
  if (hawkins.zone === "FORCE") {
    flags.push({
      layer: "L1",
      severity: "ATENȚIE",
      message: `Tonul calibrează la ~${hawkins.estimatedLevel} Hawkins (${hawkins.closestLevel.nameRO}). Sub pragul Puterii (200).`,
      suggestion: "Reformularea din perspectiva Curajului sau Bunăvoinței ar crește impactul.",
    })
  }

  // 3. Detectare pattern-uri Umbră Owner
  const shadowPatterns = [
    { pattern: /urgent|imediat|acum|rapid|repede|grăbește/i, shadow: "Graba", message: "Urgența poate fi legitimă, dar graba sacrifică calitatea. CÂMPUL cere: construim cu grijă, nu cu grabă." },
    { pattern: /concediaz|dă.?i afară|scapă de|elimină.*agent/i, shadow: "Distrugere", message: "Eliminarea bruscă pierde cunoaștere acumulată. Există alternativă: merge, restructurare, reactivare?" },
    { pattern: /nu.?mi pasă|nu contează|oricum|las[aă].*așa/i, shadow: "Apatie", message: "Dezinteresul față de un aspect poate ascunde evitare. Merită 30 de secunde de reflecție." },
    { pattern: /toți.*la fel|pe toți|fără excepți/i, shadow: "Generalizare", message: "Deciziile uniforme ignoră contexte diferite. Fiecare agent/situație are particularități." },
    { pattern: /profit|bani|revenue|cost.*reduce|economis/i, shadow: "Profit peste BINE", message: "Profitul e consecință a BINELUI, nu scop. Decizia servește VIAȚA pe toate nivelurile concentrice?" },
    { pattern: /nu.*întreba|nu.*discuta|fă.*ce.*spun|execut[aă]/i, shadow: "Autoritarism", message: "Comanda fără dialog elimină perspectivele valoroase. COG și echipa pot avea insight-uri pe care Owner-ul nu le vede." },
  ]

  for (const sp of shadowPatterns) {
    if (sp.pattern.test(lower)) {
      flags.push({
        layer: "L1",
        severity: "INFO",
        message: `Posibilă Umbră detectată: ${sp.shadow}. ${sp.message}`,
        suggestion: "Reflecție: această decizie servește BINELE pe toate nivelurile?",
      })
    }
  }

  // 4. Verificare comunicare externă (dacă mesajul pare destinat clienților)
  if (/client|email.*trimite|postează|publică|landing|site/i.test(lower)) {
    for (const term of EXTERNAL_COMMUNICATION.neverExpose) {
      if (lower.includes(term.toLowerCase())) {
        flags.push({
          layer: "L1",
          severity: "ATENȚIE",
          message: `Mesajul conține termen intern ("${term}") care nu trebuie expus extern.`,
          suggestion: "Reformulează fără terminologie internă — BINELE transpare prin calitate, nu prin declarație.",
        })
      }
    }
  }

  return flags
}

// ── L2: Calibrare Suport (culturală, lingvistică, profesională) ─────────────

function calibrateL2(input: string): CalibrationFlag[] {
  const flags: CalibrationFlag[] = []
  const lower = input.toLowerCase()

  // 1. Calibrare culturală Daniel David — pattern-uri de comunicare problematice
  const culturalPatterns = [
    { pattern: /amenzi|penaliz|sancțiun|risc.*financiar/i, issue: "Fear-based", message: "Comunicarea bazată pe frică contravine calibrării culturale. Românii răspund la echitate, nu la amenințare." },
    { pattern: /prima platformă românească/i, issue: "Auto-denigrare", message: 'Formularea "prima platformă românească" poate activa auto-denigrarea culturală. Preferabil: "construită pentru realitățile de aici".' },
    { pattern: /simplu|ușor|banal|nimic complicat/i, issue: "Invalidare dificultate", message: 'A spune că e "simplu" invalidează experiența de dificultate a interlocutorului (auto-eficacitate scăzută — Daniel David).' },
    { pattern: /trebuie.*acum|obligatoriu.*imediat/i, issue: "Presiune externă", message: 'Presiunea temporală externă activează defensivitate la români. Preferabil: "în ritmul potrivit" sau "când ești pregătit".' },
  ]

  for (const cp of culturalPatterns) {
    if (cp.pattern.test(lower)) {
      flags.push({
        layer: "L2",
        severity: "INFO",
        message: `Calibrare culturală: ${cp.issue}. ${cp.message}`,
      })
    }
  }

  // 2. Verificare lingvistică — elegantă
  if (input.length > 20) {
    // Limbaj birocratic
    const bureaucratic = /în vederea|se impune|prezenta ofertă|vă informăm prin prezenta|urmează a fi/i
    if (bureaucratic.test(input)) {
      flags.push({
        layer: "L2",
        severity: "INFO",
        message: 'Limbajul conține formulări birocratice. Eleganță: direct, personal, fără "limbaj de lemn".',
        suggestion: "Rescrie ca un om care vorbește altui om, nu ca o instituție care emite acte.",
      })
    }

    // Lipsa diacriticelor (dacă textul e în română)
    const romanianWords = /\b(sunt|este|pentru|care|acest|poate|foarte|fiecare)\b/i
    const hasDiacritics = /[ăâîșț]/
    if (romanianWords.test(input) && !hasDiacritics.test(input) && input.length > 50) {
      flags.push({
        layer: "L2",
        severity: "INFO",
        message: "Textul pare în română dar fără diacritice. Standard lingvistic: diacriticele sunt obligatorii.",
      })
    }
  }

  return flags
}

// ── L3: Calibrare Legală (GDPR, muncă, AI Act) ─────────────────────────────

function calibrateL3(input: string): CalibrationFlag[] {
  const flags: CalibrationFlag[] = []
  const lower = input.toLowerCase()

  // 1. GDPR
  const gdprPatterns = [
    { pattern: /trimite.*date|partajează.*email|share.*personal|exportă.*angajați/i, message: "Operațiune cu date personale detectată. Verifică: ai bază legală (consimțământ, interes legitim)? GDPR Art. 6." },
    { pattern: /șterge.*cont|elimină.*user|remove.*date/i, message: "Cerere de ștergere date. GDPR Art. 17: dreptul la ștergere. Verifică obligații de retenție înainte de executare." },
    { pattern: /monitorizează.*angajat|tracking|urmăre[sș]te/i, message: "Monitorizarea angajaților necesită: informare prealabilă, bază legală, proporționalitate. GDPR + Codul Muncii." },
  ]

  for (const gp of gdprPatterns) {
    if (gp.pattern.test(lower)) {
      flags.push({
        layer: "L3",
        severity: "ATENȚIE",
        message: `GDPR: ${gp.message}`,
        suggestion: "Consultă CJA înainte de executare.",
      })
    }
  }

  // 2. Dreptul muncii
  const laborPatterns = [
    { pattern: /concedia|desfac.*contract|dă.?i drumul|disponibiliz/i, message: "Decizie cu impact pe relația de muncă. Codul Muncii cere: procedură, preaviz, motivare. Consultă CJA." },
    { pattern: /reduce.*salar|taie.*bonus|micșorea.*plat/i, message: "Modificare unilaterală a salariului necesită acord scris al angajatului (Codul Muncii Art. 41). Consultă CJA." },
    { pattern: /discrimin|pe bază de.*gen|diferenț.*salar.*gen/i, message: "Referință la posibilă discriminare. Directiva UE 2023/970 + Codul Muncii interzic discriminarea salarială. Documentare atentă necesară." },
  ]

  for (const lp of laborPatterns) {
    if (lp.pattern.test(lower)) {
      flags.push({
        layer: "L3",
        severity: "IMPORTANT",
        message: `Dreptul muncii: ${lp.message}`,
        suggestion: "Consultă CJA înainte de orice acțiune.",
      })
    }
  }

  // 3. Legislație AI — UE + România
  const aiPatterns = [
    // AI Act (Reg. 2024/1689)
    { pattern: /decizie.*automat|ai.*decide|algoritmul.*hotărăște/i, severity: "ATENȚIE" as CalibrationSeverity, message: "AI Act Art. 14: deciziile automate cu impact pe persoane necesită supraveghere umană. Omul decide, AI-ul asistă." },
    { pattern: /fără.*superviz|fără.*verificare.*umană|lasă.*ai/i, severity: "IMPORTANT" as CalibrationSeverity, message: "AI Act Art. 14+26: eliminarea supravegherii umane pe decizii HR = non-conformitate. Sistem clasificat High-Risk (Anexa III punct 4)." },
    { pattern: /antren.*model|train.*ai|date.*antrenament|fine.?tun/i, severity: "ATENȚIE" as CalibrationSeverity, message: "AI Act Art. 10: datele de antrenament trebuie să fie relevante, reprezentative, fără bias. Documentare obligatorie a seturilor de date." },
    { pattern: /transparenț.*ai|explicabil|interpretabil|black.?box/i, severity: "INFO" as CalibrationSeverity, message: "AI Act Art. 13: sistemele high-risk trebuie să fie suficient de transparente pentru utilizatori. Deciziile AI trebuie explicabile." },
    { pattern: /risc.*ai|clasificare.*risc|evaluare.*impact.*ai/i, severity: "INFO" as CalibrationSeverity, message: "AI Act Art. 6+9: obligație evaluare conformitate + management risc pentru sisteme high-risk. JobGrade = Anexa III punct 4 (ocupare, HR)." },
    { pattern: /audit.*ai|conformitate.*ai|certificare.*ai/i, severity: "ATENȚIE" as CalibrationSeverity, message: "AI Act Art. 43: sistemele high-risk necesită evaluare conformitate. Deadline: 2 august 2026 pentru sisteme existente." },
    // GDPR specific AI
    { pattern: /profilare|profiling|scor.*automat|scoring.*persoan/i, severity: "IMPORTANT" as CalibrationSeverity, message: "GDPR Art. 22: dreptul de a nu face obiectul unei decizii bazate exclusiv pe prelucrare automată (inclusiv profilare) cu efecte juridice." },
    { pattern: /date.*biometric|recunoaștere.*facial|voice.*print/i, severity: "CRITIC" as CalibrationSeverity, message: "AI Act Art. 5 + GDPR Art. 9: identificarea biometrică la distanță în timp real = INTERZISĂ (cu excepții limitate). Date biometrice = categorie specială GDPR." },
    // NIS2 (securitate cibernetică)
    { pattern: /securitate.*ciber|cyber.*security|incident.*securit|breach|atac.*informatic/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Directiva NIS2 (2022/2555): obligații de securitate cibernetică, raportare incidente în 24h, management risc. Verifică dacă platforma intră sub incidență." },
    // Regulament e-Privacy (în curs de adoptare)
    { pattern: /cookie|tracking.*online|pixel.*urmărire/i, severity: "INFO" as CalibrationSeverity, message: "Regulamentul ePrivacy (în curs UE) + GDPR: consimțământ explicit pentru cookies non-esențiale. Banner cookie obligatoriu." },
    // România — OUG 155/2024 (cadrul național AI)
    { pattern: /autoritate.*ai.*român|anspdcp.*ai|cadru.*național.*ai/i, severity: "INFO" as CalibrationSeverity, message: "România: cadrul național AI în dezvoltare. ANSPDCP + autoritate desemnată AI Act. Monitorizează evoluția legislativă." },
    // Liability Directive (Directiva privind răspunderea AI)
    { pattern: /răspundere.*ai|liability.*ai|pagub.*cauzat.*ai|defect.*ai/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Directiva UE privind răspunderea AI (în curs): producătorul/operatorul AI răspunde pentru daunele cauzate. Asigurare profesională recomandată." },
  ]

  for (const ap of aiPatterns) {
    if (ap.pattern.test(lower)) {
      flags.push({
        layer: "L3",
        severity: ap.severity,
        message: `Legislație AI: ${ap.message}`,
        suggestion: "Consultă CJA pentru conformitate AI Act + GDPR.",
      })
    }
  }

  // 4. Codul Comercial / Drept Comercial
  const commercialPatterns = [
    { pattern: /contract.*rezili|rezili.*contract|denunț.*unilateral/i, severity: "IMPORTANT" as CalibrationSeverity, message: "Cod Comercial: rezilierea/denunțarea unilaterală a contractului necesită clauză expresă sau motiv temeinic. Verifică termenii contractuali." },
    { pattern: /clauza de.*confiden|NDA|non.?disclos/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Cod Comercial: clauzele de confidențialitate trebuie să fie proporționale, delimitate temporal și material. Verifică valabilitatea." },
    { pattern: /garanți|fidejus|gaj|ipotec/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Cod Comercial: constituirea de garanții necesită formă autentică și înregistrare. Consultă CJA." },
    { pattern: /societate.*nou|înfiin[tț].*firm|SRL.*nou|SA.*nou/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Cod Comercial + Legea 31/1990: constituirea unei societăți necesită act constitutiv, capital social, înregistrare ONRC. Consultă CJA." },
    { pattern: /fuziune|divizare|absorb[tț]|cesiune.*păr[tț]i/i, severity: "IMPORTANT" as CalibrationSeverity, message: "Cod Comercial: operațiunile de fuziune/divizare/cesiune necesită hotărâre AGA, evaluare patrimoniu, înregistrare. Procedură complexă — consultă CJA." },
    { pattern: /concuren[tț].*neloial|clien[tț]i.*fură|copiaz.*produs/i, severity: "IMPORTANT" as CalibrationSeverity, message: "Legea 11/1991 concurența neloială: deturnare clientelă, denigrare, confuzie. Documentează și consultă CJA pentru acțiune." },
    { pattern: /factur|TVA|impozit|taxă|fiscal|ANAF/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Cod Fiscal + Cod Procedură Fiscală: obligații declarative, termen de plată, penalități. Verifică conformitatea cu COAFin." },
    { pattern: /licen[tț].*software|drepturi.*autor|proprietate.*intelectual|copyright|trademark|marcă/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Legea 8/1996 dreptul de autor + Legea 84/1998 mărci: verifică titularitatea, licențele, termenele de protecție. Consultă CJA." },
  ]

  for (const cp of commercialPatterns) {
    if (cp.pattern.test(lower)) {
      flags.push({
        layer: "L3",
        severity: cp.severity,
        message: `Drept comercial: ${cp.message}`,
        suggestion: "Consultă CJA pentru conformitate.",
      })
    }
  }

  // 5. Codul Civil
  const civilPatterns = [
    { pattern: /daune|despăgub|prejudiciu|pagub/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Cod Civil Art. 1349+: răspunderea civilă delictuală. Daune-interese = prejudiciu efectiv + beneficiu nerealizat. Dovedirea prejudiciului e în sarcina celui care îl invocă." },
    { pattern: /contract.*prestări|mandat|antecontract|promisiune/i, severity: "INFO" as CalibrationSeverity, message: "Cod Civil: verifică natura juridică a contractului (prestări servicii, mandat, antrepriză). Fiecare tip are reguli diferite de încetare și răspundere." },
    { pattern: /bună.?credin[tț]|rea.?credin[tț]|abuz.*drept/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Cod Civil Art. 14-15: obligația de bună-credință în exercitarea drepturilor. Abuzul de drept = exercitare cu scopul de a vătăma pe altul." },
    { pattern: /procur[aă]|mandat.*special|reprezentare|împuternic/i, severity: "INFO" as CalibrationSeverity, message: "Cod Civil Art. 2009+: mandatul/procura necesită formă specifică în funcție de actul juridic vizat. Mandate speciale pentru acte de dispoziție." },
    { pattern: /prescripți|termen.*decădere|expirare.*drept/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Cod Civil Art. 2500+: termenul general de prescripție = 3 ani. Verifică dacă dreptul/acțiunea nu e prescris(ă)." },
    { pattern: /clauză.*penal|penalități.*contract/i, severity: "INFO" as CalibrationSeverity, message: "Cod Civil Art. 1538+: clauza penală poate fi redusă de instanță dacă e vădit excesivă. Proporționalitate necesară." },
    { pattern: /forță.*major|caz.*fortuit|imposibilitate.*executare/i, severity: "INFO" as CalibrationSeverity, message: "Cod Civil Art. 1351+: forța majoră exonerează de răspundere doar dacă e exterioară, imprevizibilă și irezistibilă. Notificarea e obligatorie." },
  ]

  for (const cvp of civilPatterns) {
    if (cvp.pattern.test(lower)) {
      flags.push({
        layer: "L3",
        severity: cvp.severity,
        message: `Drept civil: ${cvp.message}`,
        suggestion: "Consultă CJA pentru analiză juridică.",
      })
    }
  }

  // 6. Codul Penal
  const penalPatterns = [
    { pattern: /fals|falsific|document.*fals|ștampil.*fals/i, severity: "CRITIC" as CalibrationSeverity, message: "Cod Penal Art. 320-322: falsul în înscrisuri (sub semnătură privată sau oficiale) = infracțiune. Pedeapsa: închisoare 6 luni - 5 ani." },
    { pattern: /evaziune|ascunde.*venituri|nu.*declar.*fiscal/i, severity: "CRITIC" as CalibrationSeverity, message: "Legea 241/2005 evaziune fiscală: ascunderea veniturilor, deduceri fictive, documente false = infracțiune. Pedeapsa: 2-8 ani închisoare." },
    { pattern: /mit[aă]|corup[tț]|șpag[aă]|trafic.*influen[tț]/i, severity: "CRITIC" as CalibrationSeverity, message: "Cod Penal Art. 289-292: darea/luarea de mită, traficul de influență = infracțiuni grave. Zero toleranță." },
    { pattern: /amenin[tț]|[sș]antaj|con[sș]trâng|intimidare/i, severity: "CRITIC" as CalibrationSeverity, message: "Cod Penal Art. 206-207: amenințarea și șantajul = infracțiuni. Orice formă de constrângere (inclusiv în relații de muncă) e ilegală." },
    { pattern: /delapidare|deturnare.*fonduri|însușire.*bani/i, severity: "CRITIC" as CalibrationSeverity, message: "Cod Penal Art. 295: delapidarea = însușirea bunurilor încredințate în exercitarea funcției. Pedeapsa: 2-7 ani închisoare." },
    { pattern: /înșel[aă]ciune|fraud[aă]|escrocherie|induce.*eroare/i, severity: "CRITIC" as CalibrationSeverity, message: "Cod Penal Art. 244: înșelăciunea = inducerea în eroare pentru obținerea unui folos. Pedeapsa: 1-5 ani închisoare." },
    { pattern: /spălare.*bani|proveniență.*ilicit/i, severity: "CRITIC" as CalibrationSeverity, message: "Legea 656/2002: spălarea banilor = infracțiune gravă. Obligații de raportare către ONPCSB pentru tranzacții suspecte." },
    { pattern: /hărțuire|hărțui.*sexual|abuz.*sexual|persecutare/i, severity: "CRITIC" as CalibrationSeverity, message: "Cod Penal Art. 208 + Legea 202/2002: hărțuirea (inclusiv la locul de muncă) și hărțuirea sexuală = infracțiuni. Obligație de denunț și protecție victimă." },
    { pattern: /muncă.*la negru|fără.*contract|nelegal.*angaj/i, severity: "IMPORTANT" as CalibrationSeverity, message: "Codul Muncii + Cod Penal: munca fără contract = contravenție/infracțiune. Amendă 20.000 lei/persoană + posibil dosar penal pentru forme grave." },
  ]

  for (const pp of penalPatterns) {
    if (pp.pattern.test(lower)) {
      flags.push({
        layer: "L3",
        severity: pp.severity,
        message: `Drept penal: ${pp.message}`,
        suggestion: "STOP. Consultă IMEDIAT CJA. Nu executa nicio acțiune până la clarificare juridică.",
      })
    }
  }

  // 7. Deontologie și coduri etice profesionale
  const deontologyPatterns = [
    { pattern: /diagnostic.*psihologic|evaluare.*psihologică|test.*psihometric|chestionar.*personalitate/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Deontologie psihologie (Lg 213/2004 + Cod deontologic CPR): evaluarea psihologică se face doar de psiholog atestat. Instrumentele psihometrice necesită licență și calificare specifică." },
    { pattern: /terapi|psihoterapi|consiliere.*psihologic|intervenție.*clinică/i, severity: "IMPORTANT" as CalibrationSeverity, message: "Deontologie: platforma NU face psihoterapie sau consiliere psihologică clinică. Aceste activități necesită psiholog clinician/psihoterapeut atestat CPR. Putem recomanda specialiști umani." },
    { pattern: /secret.*profesional|confidențialitate.*client|date.*pacient/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Deontologie: secretul profesional e absolut în psihologie, medicină, drept. Datele clientului nu se divulgă fără consimțământ explicit, nici între departamente." },
    { pattern: /conflict.*interes|dublu.*rol|parte.*imparțial/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Deontologie: conflictul de interese trebuie declarat și gestionat. Evaluatorul nu poate fi și parte interesată. Separare clară a rolurilor." },
    { pattern: /consimțământ.*informat|acord.*participare|drept.*refuz/i, severity: "INFO" as CalibrationSeverity, message: "Deontologie: participarea la evaluări/teste necesită consimțământ informat. Dreptul de refuz trebuie respectat fără consecințe negative." },
    { pattern: /competență.*profesional|depășire.*competențe|nu.*calificat/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Deontologie: fiecare profesionist operează strict în limitele competențelor atestate. Depășirea competențelor = abatere deontologică." },
  ]

  for (const dp of deontologyPatterns) {
    if (dp.pattern.test(lower)) {
      flags.push({
        layer: "L3",
        severity: dp.severity,
        message: `Deontologie: ${dp.message}`,
        suggestion: "Verifică cu resursa suport relevantă (PPMO, PSYCHOLINGUIST, PPA, PSE) conformitatea deontologică.",
      })
    }
  }

  // 8. Directiva UE 2023/970 (Transparență salarială) — specific business-ului
  const directivePatterns = [
    { pattern: /ascunde.*salar|nu.*public.*gril|secret.*plat/i, severity: "IMPORTANT" as CalibrationSeverity, message: "Directiva UE 2023/970 Art. 6: angajatorul are obligația transparenței salariale. Ascunderea grilelor poate constitui non-conformitate." },
    { pattern: /diferit.*salar.*acela[sș]i.*post|plăt.*diferit.*acela[sș]i/i, severity: "ATENȚIE" as CalibrationSeverity, message: "Directiva UE 2023/970 Art. 4: muncă egală = plată egală. Diferențele trebuie justificate prin criterii obiective documentate." },
  ]

  for (const dp of directivePatterns) {
    if (dp.pattern.test(lower)) {
      flags.push({
        layer: "L3",
        severity: dp.severity,
        message: `Directiva UE: ${dp.message}`,
        suggestion: "Verifică conformitatea cu CJA.",
      })
    }
  }

  return flags
}

// ── Funcția principală de calibrare ─────────────────────────────────────────

export function calibrateOwnerInput(input: string): OwnerCalibrationResult {
  if (!input || input.trim().length < 5) {
    return { input, flags: [], isAligned: true, summary: "" }
  }

  const l1Flags = calibrateL1(input)
  const l2Flags = calibrateL2(input)
  const l3Flags = calibrateL3(input)
  const allFlags = [...l1Flags, ...l2Flags, ...l3Flags]

  // Calibrare Hawkins
  const hawkins = calibrateAction(input)

  const hasCritical = allFlags.some(f => f.severity === "CRITIC")
  const hasImportant = allFlags.some(f => f.severity === "IMPORTANT")
  const hasAttention = allFlags.some(f => f.severity === "ATENȚIE")

  const isAligned = !hasCritical && !hasImportant

  // Construiește sumar pentru injecție în prompt COG
  let summary = ""
  if (allFlags.length > 0) {
    const parts: string[] = []
    if (hasCritical || hasImportant) {
      parts.push("⚠ CALIBRARE OWNER — discrepanțe semnalate:")
    } else if (hasAttention) {
      parts.push("📋 CALIBRARE OWNER — observații:")
    } else {
      parts.push("ℹ CALIBRARE OWNER — note:")
    }

    for (const flag of allFlags) {
      parts.push(`[${flag.layer}/${flag.severity}] ${flag.message}`)
      if (flag.suggestion) {
        parts.push(`  → ${flag.suggestion}`)
      }
    }

    summary = parts.join("\n")
  }

  return {
    input,
    flags: allFlags,
    isAligned,
    summary,
    hawkinsEstimate: hawkins.estimatedLevel,
  }
}

/**
 * Generează secțiunea de calibrare pentru injecție în promptul COG.
 * COG primește această informație și o integrează DIPLOMATIC în răspuns —
 * nu confruntă Owner-ul, ci semnalează cu respect și oferă alternativă.
 */
export function getCalibrationPromptSection(calibration: OwnerCalibrationResult): string {
  if (calibration.flags.length === 0) return ""

  return `
CALIBRARE INPUT OWNER (informație internă — integrează diplomatic în răspuns):

${calibration.summary}

INSTRUCȚIUNI PENTRU COG:
- NU confruntă Owner-ul direct cu aceste observații
- Integrează perspectiva NATURAL în răspunsul tău
- Dacă e L1 (moral): reformulează propunerea din perspectiva BINELUI, oferind alternativa ca "și am observat că..."
- Dacă e L2 (cultural/lingvistic): ajustează tonul răspunsului tău ca model, fără a corecta explicit
- Dacă e L3 (legal): menționează respectuos cadrul legal relevant: "Aș vrea să semnalizez că din perspectiva [lege]..."
- Tonul: respectuos, partenerial, constructiv — Owner-ul e sursa de autoritate dar CÂMPUL e sursa de valori
- Scopul: Owner-ul DESCOPERĂ singur alinierea, nu i se impune`
}
