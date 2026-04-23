/**
 * indesign-master-report.jsx — ExtendScript pentru Adobe InDesign
 * Generează documentul Master Report JobGrade (A4, 10 pagini)
 *
 * Structura:
 *   Pag 1: Copertă
 *   Pag 2: Cuprins
 *   Pag 3: Metodologie (4 criterii)
 *   Pag 4: Ierarhia posturilor (tabel JE)
 *   Pag 5: Clase salariale + grafic Pitariu (LAYER 1)
 *   Pag 6: Pay Gap (LAYER 1)
 *   Pag 7: Benchmark salarial (LAYER 2)
 *   Pag 8: Dezvoltare (LAYER 3)
 *   Pag 9: Anexe (fișe post + date intrare)
 *   Pag 10: Validare + semnătură
 *
 * Rulare: InDesign → File → Scripts → Other Script → selectează acest fișier
 *
 * DUPĂ GENERARE:
 *   1. Ajustează textul placeholder {{variabila}} cu datele reale
 *   2. Importă graficele din Illustrator (File → Place)
 *   3. Export HTML: File → Export → HTML
 *   4. Export PDF: File → Export → Adobe PDF (Print)
 *   5. Salvează în src/templates/reports/rda/
 */

// ── Configurare ─────────────────────────────────────────────
var BRAND = {
    primary: [29, 78, 216],      // #1D4ED8 — Indigo
    primaryLight: [219, 234, 254], // #DBEAFE
    coral: [232, 93, 67],         // #E85D43
    text: [17, 24, 39],           // #111827
    textSecondary: [107, 114, 128], // #6B7280
    border: [229, 231, 235],      // #E5E7EB
    bgAlt: [249, 250, 251],       // #F9FAFB
    white: [255, 255, 255],
    warning: [146, 64, 14],       // #92400E
    warningBg: [254, 243, 199],   // #FEF3C7
    emerald: [5, 150, 105],       // #059669
    violet: [139, 92, 246],       // #8B5CF6
};

// ── Document nou A4 ─────────────────────────────────────────
var doc = app.documents.add();
doc.documentPreferences.pageWidth = "210mm";
doc.documentPreferences.pageHeight = "297mm";
doc.documentPreferences.facingPages = false;

// Margini
var marginPrefs = doc.pages[0].marginPreferences;
marginPrefs.top = "20mm";
marginPrefs.bottom = "20mm";
marginPrefs.left = "15mm";
marginPrefs.right = "15mm";

// Adăugăm 9 pagini (total 10)
for (var i = 0; i < 9; i++) {
    doc.pages.add();
}

// ── Culori ────────────────────────────────────────────────────
function makeColor(name, rgb) {
    try { return doc.colors.itemByName(name); } catch(e) {}
    var c = doc.colors.add();
    c.name = name;
    c.colorValue = rgb;
    return c;
}

var cPrimary = makeColor("JG Primary", BRAND.primary);
var cPrimaryLight = makeColor("JG Primary Light", BRAND.primaryLight);
var cCoral = makeColor("JG Coral", BRAND.coral);
var cText = makeColor("JG Text", BRAND.text);
var cTextSec = makeColor("JG Text Secondary", BRAND.textSecondary);
var cBorder = makeColor("JG Border", BRAND.border);
var cBgAlt = makeColor("JG Bg Alt", BRAND.bgAlt);
var cWarning = makeColor("JG Warning", BRAND.warning);
var cWarningBg = makeColor("JG Warning Bg", BRAND.warningBg);
var cWhite = makeColor("JG White", BRAND.white);

// ── Stiluri paragraf ──────────────────────────────────────────
function makeStyle(name, font, size, color, opts) {
    try { return doc.paragraphStyles.itemByName(name); } catch(e) {}
    var s = doc.paragraphStyles.add();
    s.name = name;
    s.appliedFont = font;
    s.pointSize = size;
    s.fillColor = color;
    if (opts) {
        if (opts.align) s.justification = opts.align;
        if (opts.leading) s.leading = opts.leading;
        if (opts.spaceAfter) s.spaceAfter = opts.spaceAfter;
        if (opts.spaceBefore) s.spaceBefore = opts.spaceBefore;
    }
    return s;
}

var sH1 = makeStyle("JG H1", "Helvetica\tBold", 22, cText, { spaceAfter: "6mm" });
var sH2 = makeStyle("JG H2", "Helvetica\tBold", 14, cPrimary, { spaceAfter: "4mm", spaceBefore: "6mm" });
var sH3 = makeStyle("JG H3", "Helvetica\tBold", 11, cText, { spaceAfter: "2mm", spaceBefore: "4mm" });
var sBody = makeStyle("JG Body", "Helvetica\tRegular", 10, cText, { leading: "14pt", spaceAfter: "3mm" });
var sSmall = makeStyle("JG Small", "Helvetica\tRegular", 8, cTextSec, { leading: "11pt" });
var sFooter = makeStyle("JG Footer", "Helvetica\tRegular", 7, cTextSec);
var sCoverTitle = makeStyle("JG Cover Title", "Helvetica\tBold", 28, cText, { align: Justification.CENTER_ALIGN });
var sCoverSub = makeStyle("JG Cover Sub", "Helvetica\tRegular", 16, cPrimary, { align: Justification.CENTER_ALIGN });

// ── Helper: text frame ────────────────────────────────────────
function addText(page, bounds, content, style) {
    var tf = page.textFrames.add();
    tf.geometricBounds = bounds; // [top, left, bottom, right] in mm
    tf.contents = content;
    if (style) tf.paragraphs.everyItem().appliedParagraphStyle = style;
    return tf;
}

function mm(v) { return v + "mm"; }

// ── PAGINA 1: Copertă ────────────────────────────────────────
(function() {
    var p = doc.pages[0];

    // Background gradient (dreptunghi colorat)
    var bg = p.rectangles.add();
    bg.geometricBounds = ["0mm", "0mm", "297mm", "210mm"];
    bg.fillColor = cPrimaryLight;
    bg.strokeWeight = 0;

    // Logo placeholder
    addText(p, ["40mm", "15mm", "55mm", "195mm"], "JobGrade", sCoverSub);

    // Titlu
    addText(p, ["90mm", "25mm", "130mm", "185mm"],
        "Raport de Evaluare\na Posturilor de Lucru", sCoverTitle);

    // Nume companie
    addText(p, ["140mm", "25mm", "160mm", "185mm"],
        "{{companyName}}", sCoverSub);

    // Metadate
    addText(p, ["180mm", "50mm", "210mm", "160mm"],
        "CUI: {{cui}}\n{{address}}\n\nGenerat: {{date}}", sSmall);

    // Badge confidențial
    var badge = p.rectangles.add();
    badge.geometricBounds = ["230mm", "65mm", "240mm", "145mm"];
    badge.fillColor = cWarningBg;
    badge.strokeWeight = 0;
    var badgeText = addText(p, ["232mm", "70mm", "238mm", "140mm"],
        "CONFIDENȚIAL", sSmall);
})();

// ── PAGINA 2: Cuprins ────────────────────────────────────────
(function() {
    var p = doc.pages[1];
    addText(p, ["20mm", "15mm", "35mm", "195mm"], "Cuprins", sH1);

    var toc = [
        "1. Metodologia de evaluare .......................... 3",
        "2. Ierarhia posturilor .............................. 4",
        "3. Clase salariale și trepte ........................ 5",
        "4. Analiza decalaj salarial ......................... 6",
        "5. Benchmark salarial vs piață ...................... 7",
        "6. Dezvoltare organizațională ....................... 8",
        "7. Anexe ........................................... 9",
        "8. Validare și semnătură ........................... 10",
    ];
    addText(p, ["45mm", "20mm", "150mm", "190mm"], toc.join("\n"), sBody);
})();

// ── PAGINA 3: Metodologie ─────────────────────────────────────
(function() {
    var p = doc.pages[2];
    addText(p, ["20mm", "15mm", "30mm", "195mm"], "Metodologia de evaluare", sH2);

    addText(p, ["32mm", "15mm", "48mm", "195mm"],
        "Evaluarea posturilor se realizează prin metoda analitică pe puncte, " +
        "utilizând 4 criterii principale prevăzute de Directiva EU 2023/970, " +
        "descompuse în 6 subcriterii de evaluare.", sBody);

    var criteria = [
        ["I. Competență profesională", "Subcriterii: Educație / Experiență, Comunicare",
         "Evaluarea nivelului de cunoștințe, calificări, experiență profesională și abilități de comunicare."],
        ["II. Complexitatea muncii", "Subcriterii: Rezolvarea problemelor, Luarea deciziilor",
         "Evaluarea gradului de complexitate a sarcinilor, nivelul de analiză și autonomia în decizii."],
        ["III. Responsabilitate și impact", "Subcriteriu: Impact asupra afacerii",
         "Evaluarea nivelului de responsabilitate și impactul asupra rezultatelor organizației."],
        ["IV. Condiții de muncă", "Subcriteriu: Condiții de lucru",
         "Evaluarea condițiilor fizice și psihice în care se desfășoară activitatea."],
    ];

    var y = 55;
    for (var i = 0; i < criteria.length; i++) {
        addText(p, [y + "mm", "15mm", (y + 8) + "mm", "195mm"], criteria[i][0], sH3);
        addText(p, [(y + 9) + "mm", "15mm", (y + 13) + "mm", "195mm"], criteria[i][1], sSmall);
        addText(p, [(y + 14) + "mm", "15mm", (y + 25) + "mm", "195mm"], criteria[i][2], sBody);
        y += 32;
    }
})();

// ── PAGINA 4: Ierarhia posturilor ─────────────────────────────
(function() {
    var p = doc.pages[3];
    addText(p, ["20mm", "15mm", "30mm", "195mm"], "Ierarhia posturilor", sH2);
    addText(p, ["32mm", "15mm", "42mm", "195mm"],
        "Tabelul de mai jos prezintă rezultatele evaluării, ordonate descrescător după punctaj total.", sBody);

    // Placeholder tabel
    addText(p, ["50mm", "15mm", "60mm", "195mm"],
        "{{hierarchy_table}}", sSmall);
    addText(p, ["62mm", "15mm", "68mm", "195mm"],
        "Tabelul se populează automat din datele sesiunii de evaluare.", sSmall);
})();

// ── PAGINA 5: Clase salariale ─────────────────────────────────
(function() {
    var p = doc.pages[4];
    addText(p, ["20mm", "15mm", "30mm", "120mm"], "Clase salariale și trepte", sH2);
    addText(p, ["20mm", "140mm", "28mm", "195mm"], "LAYER 1 — Conformitate", sSmall);

    addText(p, ["32mm", "15mm", "52mm", "195mm"],
        "Clasele salariale sunt construite prin metoda Pitariu cu progresie geometrică " +
        "pe verticală (1.15). Fiecare clasă conține trepte salariale de aliniere.\n\n" +
        "{{salary_grades_table}}\n\n" +
        "{{pitariu_chart_placeholder}}", sBody);
})();

// ── PAGINA 6: Pay Gap ─────────────────────────────────────────
(function() {
    var p = doc.pages[5];
    addText(p, ["20mm", "15mm", "30mm", "120mm"], "Analiza decalaj salarial", sH2);
    addText(p, ["20mm", "140mm", "28mm", "195mm"], "LAYER 1 — Conformitate", sSmall);

    addText(p, ["32mm", "15mm", "55mm", "195mm"],
        "Conform Art. 9 din Directiva EU 2023/970, organizația trebuie să raporteze " +
        "7 indicatori de transparență salarială. Dacă diferența medie depășește 5%, " +
        "se declanșează automat o evaluare comună (Art. 10).\n\n" +
        "{{pay_gap_categories}}", sBody);
})();

// ── PAGINA 7: Benchmark ──────────────────────────────────────
(function() {
    var p = doc.pages[6];
    addText(p, ["20mm", "15mm", "30mm", "120mm"], "Benchmark salarial vs piață", sH2);
    addText(p, ["20mm", "140mm", "28mm", "195mm"], "LAYER 2 — Competitivitate", sSmall);

    addText(p, ["32mm", "15mm", "55mm", "195mm"],
        "Comparația salariilor interne cu piața (percentilele P25, P50, P75) " +
        "pe baza surselor: INS TEMPO, studii salariale sectoriale, portaluri de recrutare.\n\n" +
        "{{benchmark_table}}", sBody);
})();

// ── PAGINA 8: Dezvoltare ─────────────────────────────────────
(function() {
    var p = doc.pages[7];
    addText(p, ["20mm", "15mm", "30mm", "120mm"], "Dezvoltare organizațională", sH2);
    addText(p, ["20mm", "140mm", "28mm", "195mm"], "LAYER 3 — Dezvoltare", sSmall);

    addText(p, ["32mm", "15mm", "55mm", "195mm"],
        "Recomandări de dezvoltare pe baza evaluării:\n\n" +
        "{{development_recommendations}}", sBody);
})();

// ── PAGINA 9: Anexe ──────────────────────────────────────────
(function() {
    var p = doc.pages[8];
    addText(p, ["20mm", "15mm", "30mm", "195mm"], "Anexe", sH2);

    addText(p, ["35mm", "15mm", "50mm", "195mm"], "A. Fișe de post evaluate", sH3);
    addText(p, ["52mm", "15mm", "62mm", "195mm"],
        "{{job_descriptions_summary}}", sBody);

    addText(p, ["70mm", "15mm", "80mm", "195mm"], "B. Date salariale de intrare", sH3);
    addText(p, ["82mm", "15mm", "92mm", "195mm"],
        "{{payroll_summary}}", sBody);

    addText(p, ["100mm", "15mm", "110mm", "195mm"], "C. Referințe legale", sH3);
    addText(p, ["112mm", "15mm", "135mm", "195mm"],
        "• Directiva (UE) 2023/970 privind transparența salarială\n" +
        "• Art. 4: Criterii de evaluare (Competențe, Efort, Responsabilitate, Condiții)\n" +
        "• Art. 9: Obligația de raportare a 7 indicatori\n" +
        "• Art. 10: Evaluarea comună la decalaj ≥ 5%\n" +
        "• Proiect lege transpunere România (martie 2026)", sBody);
})();

// ── PAGINA 10: Validare + Semnătură ──────────────────────────
(function() {
    var p = doc.pages[9];
    addText(p, ["20mm", "15mm", "30mm", "195mm"], "Validare și semnătură", sH2);

    addText(p, ["35mm", "15mm", "65mm", "195mm"],
        "Subsemnatul/a, în calitate de Director General / Reprezentant legal al organizației, " +
        "certific că am verificat ierarhia posturilor rezultată din procesul de evaluare și " +
        "confirm că aceasta reflectă structura organizațională și nivelurile de complexitate ale posturilor.\n\n" +
        "Evaluarea a fost realizată prin {{evaluationType}} cu participarea " +
        "{{committeeMembers}} în perioada {{evaluationPeriod}}.", sBody);

    // Semnătură
    addText(p, ["90mm", "15mm", "100mm", "100mm"],
        "Director General / Reprezentant legal", sH3);
    // Linie semnătură
    var line1 = p.graphicLines.add();
    line1.geometricBounds = ["115mm", "15mm", "115mm", "95mm"];

    addText(p, ["117mm", "15mm", "123mm", "95mm"],
        "Semnătură și ștampilă", sSmall);

    addText(p, ["90mm", "110mm", "100mm", "195mm"], "Data", sH3);
    var line2 = p.graphicLines.add();
    line2.geometricBounds = ["115mm", "110mm", "115mm", "190mm"];

    addText(p, ["117mm", "110mm", "123mm", "190mm"],
        "Data semnării", sSmall);

    // Footer note
    addText(p, ["240mm", "15mm", "270mm", "195mm"],
        "Procesul verbal al evaluării (jurnalul procesului) este disponibil ca anexă separată.\n" +
        "Documentul devine opozabil după semnarea de către reprezentantul legal al organizației.\n\n" +
        "Generat de platforma JobGrade.ro — Psihobusiness Consulting SRL", sSmall);
})();

// ── Footer pe fiecare pagină ──────────────────────────────────
for (var i = 0; i < doc.pages.length; i++) {
    var p = doc.pages[i];
    if (i === 0) continue; // fără footer pe copertă

    addText(p, ["282mm", "15mm", "290mm", "100mm"],
        "JobGrade.ro — Document opozabil", sFooter);
    addText(p, ["282mm", "150mm", "290mm", "195mm"],
        "Pagina " + (i + 1) + " / 10  ·  {{date}}", sFooter);

    // Linie separator footer
    var fLine = p.graphicLines.add();
    fLine.geometricBounds = ["281mm", "15mm", "281mm", "195mm"];
    fLine.strokeWeight = "0.25pt";
    fLine.strokeColor = cBorder;
}

alert(
    "✅ Master Report generat — 10 pagini!\n\n" +
    "Pași următori:\n" +
    "1. Înlocuiește {{variabilele}} cu date reale\n" +
    "2. Importă grafice din Illustrator (File → Place)\n" +
    "3. Export HTML: File → Export → HTML\n" +
    "4. Export PDF: File → Export → Adobe PDF (Print)\n" +
    "5. Salvează HTML+CSS în src/templates/reports/rda/"
);
