/**
 * generate-icon-set.jsx — ExtendScript pentru Adobe Illustrator
 * Generează setul de 12 iconuri custom JobGrade
 *
 * Stil: Line art, 2px stroke, colțuri rotunjite, grid 24×24px
 * Culoare default: Indigo (#4F46E5)
 *
 * Rulare: Illustrator → File → Scripts → Other Script → selectează acest fișier
 */

// ── Configurare ─────────────────────────────────────────────
var ARTBOARD_SIZE = 24; // px
var STROKE_WIDTH = 2;   // px
var ICON_COLOR = new RGBColor();
ICON_COLOR.red = 79;
ICON_COLOR.green = 70;
ICON_COLOR.blue = 229;

var CORAL_COLOR = new RGBColor();
CORAL_COLOR.red = 232;
CORAL_COLOR.green = 93;
CORAL_COLOR.blue = 67;

var GRID_COLS = 4;
var SPACING = 40; // px între iconuri
var SCALE = 10;   // multiplicator pentru precizie (lucăm la 240px, exportăm la 24px)

// ── Document nou ────────────────────────────────────────────
var docWidth = (ARTBOARD_SIZE * SCALE * GRID_COLS) + (SPACING * (GRID_COLS - 1));
var docHeight = (ARTBOARD_SIZE * SCALE * 3) + (SPACING * 2);

var doc = app.documents.add(
    DocumentColorSpace.RGB,
    docWidth,
    docHeight,
    12, // 12 artboard-uri
    DocumentArtboardLayout.GridByCol,
    SPACING,
    GRID_COLS
);

// Redenumim artboard-urile
var iconNames = [
    "evaluare",           // 1. Două cercuri concentrice cu bifă
    "echitate",           // 2. Două linii orizontale la același nivel
    "conformitate",       // 3. Scut rotunjit
    "ghidare",            // 4. Cale curbată cu punct
    "profil",             // 5. Cerc cu formă organică
    "companie",           // 6. Clădire simplificată
    "raport",             // 7. Document cu linii
    "compensatie",        // 8. Monedă/cerc cu linii
    "ai-tool",            // 9. Stea/sparkle
    "securitate",         // 10. Lacăt rotunjit
    "departament",        // 11. Organigramă simplă
    "utilizator"          // 12. Siluetă abstractă
];

for (var i = 0; i < 12; i++) {
    doc.artboards[i].name = "icon-" + iconNames[i];
}

// ── Helper functions ────────────────────────────────────────

function setStroke(item, color, width) {
    item.stroked = true;
    item.strokeColor = color;
    item.strokeWidth = width;
    item.strokeCap = StrokeCap.ROUNDENDCAP;
    item.strokeJoin = StrokeJoin.ROUNDENDJOIN;
    item.filled = false;
}

function noFillStroke(item, color, width) {
    setStroke(item, color, width);
    item.filled = false;
}

function getArtboardOrigin(index) {
    var rect = doc.artboards[index].artboardRect;
    return {
        x: rect[0],
        y: rect[1] // top-left (Illustrator Y is inverted)
    };
}

function S(val) {
    // Scale helper
    return val * SCALE;
}

// ── Generare iconuri ────────────────────────────────────────

// ICON 1: Evaluare — Două cercuri concentrice cu bifă subtilă
(function drawEvaluare() {
    var o = getArtboardOrigin(0);
    var cx = o.x + S(12);
    var cy = o.y - S(12);

    // Cerc exterior
    var outer = doc.pathItems.ellipse(cy + S(9), cx - S(9), S(18), S(18));
    noFillStroke(outer, ICON_COLOR, STROKE_WIDTH);

    // Cerc interior
    var inner = doc.pathItems.ellipse(cy + S(6), cx - S(6), S(12), S(12));
    noFillStroke(inner, ICON_COLOR, STROKE_WIDTH);

    // Bifă mică în centru
    var check = doc.pathItems.add();
    check.setEntirePath([
        [cx - S(2.5), cy - S(0.5)],
        [cx - S(0.5), cy - S(2.5)],
        [cx + S(3), cy + S(2)]
    ]);
    noFillStroke(check, CORAL_COLOR, STROKE_WIDTH);
})();

// ICON 2: Echitate — Două linii orizontale la același nivel
(function drawEchitate() {
    var o = getArtboardOrigin(1);

    // Linia stânga
    var line1 = doc.pathItems.add();
    line1.setEntirePath([
        [o.x + S(3), o.y - S(12)],
        [o.x + S(10), o.y - S(12)]
    ]);
    noFillStroke(line1, ICON_COLOR, STROKE_WIDTH);

    // Linia dreapta
    var line2 = doc.pathItems.add();
    line2.setEntirePath([
        [o.x + S(14), o.y - S(12)],
        [o.x + S(21), o.y - S(12)]
    ]);
    noFillStroke(line2, ICON_COLOR, STROKE_WIDTH);

    // Punct central (echilibru)
    var dot = doc.pathItems.ellipse(o.y - S(11), o.x + S(11), S(2), S(2));
    dot.stroked = false;
    dot.filled = true;
    dot.fillColor = CORAL_COLOR;
})();

// ICON 3: Conformitate — Scut rotunjit (fără exclamație)
(function drawConformitate() {
    var o = getArtboardOrigin(2);

    var shield = doc.pathItems.add();
    shield.setEntirePath([
        [o.x + S(12), o.y - S(3)],
        [o.x + S(20), o.y - S(7)],
        [o.x + S(20), o.y - S(14)],
        [o.x + S(16), o.y - S(19)],
        [o.x + S(12), o.y - S(21)],
        [o.x + S(8), o.y - S(19)],
        [o.x + S(4), o.y - S(14)],
        [o.x + S(4), o.y - S(7)]
    ]);
    shield.closed = true;
    noFillStroke(shield, ICON_COLOR, STROKE_WIDTH);
})();

// ICON 4: Ghidare — Cale curbată cu punct
(function drawGhidare() {
    var o = getArtboardOrigin(3);

    // Cale curbată
    var path = doc.pathItems.add();
    path.setEntirePath([
        [o.x + S(4), o.y - S(18)],
        [o.x + S(8), o.y - S(10)],
        [o.x + S(16), o.y - S(14)],
        [o.x + S(20), o.y - S(6)]
    ]);
    noFillStroke(path, ICON_COLOR, STROKE_WIDTH);

    // Punct pe cale (poziția curentă)
    var dot = doc.pathItems.ellipse(o.y - S(10.5), o.x + S(10.5), S(3), S(3));
    dot.stroked = false;
    dot.filled = true;
    dot.fillColor = CORAL_COLOR;
})();

// ICON 5: Profil — Cerc cu formă organică
(function drawProfil() {
    var o = getArtboardOrigin(4);
    var cx = o.x + S(12);
    var cy = o.y - S(12);

    // Cerc exterior
    var circle = doc.pathItems.ellipse(cy + S(10), cx - S(10), S(20), S(20));
    noFillStroke(circle, ICON_COLOR, STROKE_WIDTH);

    // Formă organică interioară (blob abstract)
    var blob = doc.pathItems.ellipse(cy + S(4), cx - S(4), S(8), S(7));
    noFillStroke(blob, CORAL_COLOR, STROKE_WIDTH * 0.8);
})();

// ICON 6: Companie — Clădire simplificată
(function drawCompanie() {
    var o = getArtboardOrigin(5);

    // Clădire principală
    var building = doc.pathItems.rectangle(o.y - S(5), o.x + S(6), S(12), S(16));
    noFillStroke(building, ICON_COLOR, STROKE_WIDTH);

    // Fereastră stânga
    var win1 = doc.pathItems.rectangle(o.y - S(8), o.x + S(8.5), S(3), S(3));
    noFillStroke(win1, ICON_COLOR, STROKE_WIDTH * 0.6);

    // Fereastră dreapta
    var win2 = doc.pathItems.rectangle(o.y - S(8), o.x + S(12.5), S(3), S(3));
    noFillStroke(win2, ICON_COLOR, STROKE_WIDTH * 0.6);

    // Ușă
    var door = doc.pathItems.rectangle(o.y - S(15), o.x + S(10), S(4), S(6));
    noFillStroke(door, CORAL_COLOR, STROKE_WIDTH * 0.8);
})();

// ICON 7: Raport — Document cu linii
(function drawRaport() {
    var o = getArtboardOrigin(6);

    // Pagină
    var page = doc.pathItems.rectangle(o.y - S(3), o.x + S(5), S(14), S(18));
    noFillStroke(page, ICON_COLOR, STROKE_WIDTH);

    // Linii text
    for (var i = 0; i < 3; i++) {
        var line = doc.pathItems.add();
        var y = o.y - S(8 + i * 3.5);
        line.setEntirePath([
            [o.x + S(8), y],
            [o.x + S(16), y]
        ]);
        noFillStroke(line, ICON_COLOR, STROKE_WIDTH * 0.5);
    }
})();

// ICON 8: Compensație — Cerc cu linii interioare (monedă stilizată)
(function drawCompensatie() {
    var o = getArtboardOrigin(7);
    var cx = o.x + S(12);
    var cy = o.y - S(12);

    // Cerc
    var circle = doc.pathItems.ellipse(cy + S(9.5), cx - S(9.5), S(19), S(19));
    noFillStroke(circle, ICON_COLOR, STROKE_WIDTH);

    // Linie orizontală centrală
    var hLine = doc.pathItems.add();
    hLine.setEntirePath([
        [cx - S(5), cy],
        [cx + S(5), cy]
    ]);
    noFillStroke(hLine, CORAL_COLOR, STROKE_WIDTH);

    // Linie verticală
    var vLine = doc.pathItems.add();
    vLine.setEntirePath([
        [cx, cy + S(5)],
        [cx, cy - S(5)]
    ]);
    noFillStroke(vLine, CORAL_COLOR, STROKE_WIDTH);
})();

// ICON 9: AI Tool — Sparkle/stea
(function drawAiTool() {
    var o = getArtboardOrigin(8);
    var cx = o.x + S(12);
    var cy = o.y - S(12);

    // Sparkle mare (4 ramuri)
    var spark = doc.pathItems.add();
    spark.setEntirePath([
        [cx, cy + S(8)],
        [cx - S(2), cy + S(2)],
        [cx - S(8), cy],
        [cx - S(2), cy - S(2)],
        [cx, cy - S(8)],
        [cx + S(2), cy - S(2)],
        [cx + S(8), cy],
        [cx + S(2), cy + S(2)]
    ]);
    spark.closed = true;
    noFillStroke(spark, ICON_COLOR, STROKE_WIDTH);

    // Punct central
    var dot = doc.pathItems.ellipse(cy + S(1.5), cx - S(1.5), S(3), S(3));
    dot.stroked = false;
    dot.filled = true;
    dot.fillColor = CORAL_COLOR;
})();

// ICON 10: Securitate — Lacăt rotunjit
(function drawSecuritate() {
    var o = getArtboardOrigin(9);

    // Corp lacăt
    var body = doc.pathItems.rectangle(o.y - S(11), o.x + S(6), S(12), S(10));
    noFillStroke(body, ICON_COLOR, STROKE_WIDTH);

    // Arc superior
    var arc = doc.pathItems.ellipse(o.y - S(4), o.x + S(8), S(8), S(10));
    noFillStroke(arc, ICON_COLOR, STROKE_WIDTH);

    // Punct gaură cheie
    var key = doc.pathItems.ellipse(o.y - S(14), o.x + S(11), S(2), S(2));
    key.stroked = false;
    key.filled = true;
    key.fillColor = CORAL_COLOR;
})();

// ICON 11: Departament — Organigramă simplă
(function drawDepartament() {
    var o = getArtboardOrigin(10);

    // Nod central (sus)
    var top = doc.pathItems.ellipse(o.y - S(3), o.x + S(10), S(4), S(4));
    noFillStroke(top, ICON_COLOR, STROKE_WIDTH);

    // Linie verticală
    var vLine = doc.pathItems.add();
    vLine.setEntirePath([
        [o.x + S(12), o.y - S(7)],
        [o.x + S(12), o.y - S(11)]
    ]);
    noFillStroke(vLine, ICON_COLOR, STROKE_WIDTH * 0.8);

    // Linie orizontală
    var hLine = doc.pathItems.add();
    hLine.setEntirePath([
        [o.x + S(5), o.y - S(11)],
        [o.x + S(19), o.y - S(11)]
    ]);
    noFillStroke(hLine, ICON_COLOR, STROKE_WIDTH * 0.8);

    // 3 noduri inferioare
    var positions = [S(5), S(12), S(19)];
    for (var i = 0; i < 3; i++) {
        var vSub = doc.pathItems.add();
        vSub.setEntirePath([
            [o.x + positions[i], o.y - S(11)],
            [o.x + positions[i], o.y - S(15)]
        ]);
        noFillStroke(vSub, ICON_COLOR, STROKE_WIDTH * 0.8);

        var node = doc.pathItems.ellipse(o.y - S(15), o.x + positions[i] - S(2), S(4), S(4));
        noFillStroke(node, i === 1 ? CORAL_COLOR : ICON_COLOR, STROKE_WIDTH);
    }
})();

// ICON 12: Utilizator — Siluetă abstractă (cerc + formă)
(function drawUtilizator() {
    var o = getArtboardOrigin(11);
    var cx = o.x + S(12);

    // Cap (cerc)
    var head = doc.pathItems.ellipse(o.y - S(3), cx - S(4), S(8), S(8));
    noFillStroke(head, ICON_COLOR, STROKE_WIDTH);

    // Corp (arc)
    var body = doc.pathItems.add();
    body.setEntirePath([
        [o.x + S(4), o.y - S(21)],
        [o.x + S(7), o.y - S(14)],
        [o.x + S(12), o.y - S(12)],
        [o.x + S(17), o.y - S(14)],
        [o.x + S(20), o.y - S(21)]
    ]);
    noFillStroke(body, ICON_COLOR, STROKE_WIDTH);
})();

// ── Finalizare ──────────────────────────────────────────────
alert("✅ Set de 12 iconuri generat!\n\nPași următori:\n1. Verifică fiecare icon vizual\n2. Ajustează manual dacă e nevoie\n3. Rulează export-svgs.jsx pentru export batch");
