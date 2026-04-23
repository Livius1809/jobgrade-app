/**
 * generate-icon-set-2.jsx — ExtendScript pentru Adobe Illustrator
 * Set suplimentar: 8 iconuri pentru Pachet 2 + Portal + Dashboard
 *
 * Stil: Line art, 2px stroke, colțuri rotunjite, grid 24×24px
 * Culoare: Indigo (#4F46E5) + Coral (#E85D43) accent
 *
 * Rulare: Illustrator → File → Scripts → Other Script → selectează
 * Export: Rulează export-svgs.jsx → salvează în public/icons/
 */

var ARTBOARD_SIZE = 24;
var STROKE_WIDTH = 2;
var ICON_COLOR = new RGBColor();
ICON_COLOR.red = 79; ICON_COLOR.green = 70; ICON_COLOR.blue = 229;

var CORAL_COLOR = new RGBColor();
CORAL_COLOR.red = 232; CORAL_COLOR.green = 93; CORAL_COLOR.blue = 67;

var GRID_COLS = 4;
var SPACING = 40;
var SCALE = 10;

var docWidth = (ARTBOARD_SIZE * SCALE * GRID_COLS) + (SPACING * (GRID_COLS - 1));
var docHeight = (ARTBOARD_SIZE * SCALE * 2) + SPACING;

var doc = app.documents.add(
    DocumentColorSpace.RGB, docWidth, docHeight,
    8, DocumentArtboardLayout.GridByCol, SPACING, GRID_COLS
);

var iconNames = [
    "pay-gap",            // 1. Balanță cu diferență
    "semnatura",          // 2. Creion/stilou pe linie
    "clase-salariale",    // 3. Trepte crescătoare
    "benchmark",          // 4. Grafic bare comparativ
    "credite",            // 5. Monede stivuite
    "download",           // 6. Săgeată descărcare
    "comisie",            // 7. Grup 3 persoane
    "consens",            // 8. Două cercuri care se suprapun
];

for (var i = 0; i < 8; i++) {
    doc.artboards[i].name = "icon-" + iconNames[i];
}

function setStroke(item, color, width) {
    item.stroked = true; item.strokeColor = color;
    item.strokeWidth = width;
    item.strokeCap = StrokeCap.ROUNDENDCAP;
    item.strokeJoin = StrokeJoin.ROUNDENDJOIN;
    item.filled = false;
}
function noFillStroke(item, color, width) { setStroke(item, color, width); item.filled = false; }
function getArtboardOrigin(index) {
    var rect = doc.artboards[index].artboardRect;
    return { x: rect[0], y: rect[1] };
}
function S(val) { return val * SCALE; }

// ICON 1: Pay Gap — Balanță cu diferență
(function() {
    var o = getArtboardOrigin(0);
    // Axă verticală
    var axis = doc.pathItems.add();
    axis.setEntirePath([[o.x + S(12), o.y - S(3)], [o.x + S(12), o.y - S(14)]]);
    noFillStroke(axis, ICON_COLOR, STROKE_WIDTH);
    // Braț orizontal (înclinat)
    var arm = doc.pathItems.add();
    arm.setEntirePath([[o.x + S(4), o.y - S(8)], [o.x + S(20), o.y - S(10)]]);
    noFillStroke(arm, ICON_COLOR, STROKE_WIDTH);
    // Taler stânga (mai jos = mai mic)
    var left = doc.pathItems.ellipse(o.y - S(15), o.x + S(2), S(6), S(3));
    noFillStroke(left, CORAL_COLOR, STROKE_WIDTH * 0.8);
    // Taler dreapta (mai sus = mai mare)
    var right = doc.pathItems.ellipse(o.y - S(17), o.x + S(16), S(6), S(3));
    noFillStroke(right, ICON_COLOR, STROKE_WIDTH * 0.8);
    // Bază triunghi
    var base = doc.pathItems.add();
    base.setEntirePath([[o.x + S(8), o.y - S(21)], [o.x + S(12), o.y - S(14)], [o.x + S(16), o.y - S(21)]]);
    noFillStroke(base, ICON_COLOR, STROKE_WIDTH * 0.6);
})();

// ICON 2: Semnătură — Stilou pe linie
(function() {
    var o = getArtboardOrigin(1);
    // Linie semnătură
    var line = doc.pathItems.add();
    line.setEntirePath([[o.x + S(3), o.y - S(18)], [o.x + S(21), o.y - S(18)]]);
    noFillStroke(line, ICON_COLOR, STROKE_WIDTH * 0.6);
    // Stilou (simplificat)
    var pen = doc.pathItems.add();
    pen.setEntirePath([
        [o.x + S(8), o.y - S(16)],
        [o.x + S(6), o.y - S(6)],
        [o.x + S(5), o.y - S(3)],
        [o.x + S(8), o.y - S(5)],
        [o.x + S(18), o.y - S(15)],
    ]);
    noFillStroke(pen, ICON_COLOR, STROKE_WIDTH);
    // Punct vârf
    var dot = doc.pathItems.ellipse(o.y - S(15.5), o.x + S(7), S(2), S(2));
    dot.stroked = false; dot.filled = true; dot.fillColor = CORAL_COLOR;
})();

// ICON 3: Clase salariale — Trepte crescătoare
(function() {
    var o = getArtboardOrigin(2);
    var steps = [[3, 18, 6, 3], [8, 14, 6, 7], [13, 9, 6, 12], [18, 4, 3, 17]];
    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var rect = doc.pathItems.rectangle(o.y - S(s[1]), o.x + S(s[0]), S(s[2]), S(s[3]));
        noFillStroke(rect, i === 3 ? CORAL_COLOR : ICON_COLOR, STROKE_WIDTH);
    }
})();

// ICON 4: Benchmark — Grafic bare comparativ
(function() {
    var o = getArtboardOrigin(3);
    // Axe
    var axisY = doc.pathItems.add();
    axisY.setEntirePath([[o.x + S(4), o.y - S(3)], [o.x + S(4), o.y - S(19)]]);
    noFillStroke(axisY, ICON_COLOR, STROKE_WIDTH * 0.6);
    var axisX = doc.pathItems.add();
    axisX.setEntirePath([[o.x + S(4), o.y - S(19)], [o.x + S(20), o.y - S(19)]]);
    noFillStroke(axisX, ICON_COLOR, STROKE_WIDTH * 0.6);
    // Bare
    var bars = [[7, 8], [11, 14], [15, 10], [19, 16]];
    for (var i = 0; i < bars.length; i++) {
        var rect = doc.pathItems.rectangle(o.y - S(19 - bars[i][1]), o.x + S(bars[i][0]), S(3), S(bars[i][1]));
        noFillStroke(rect, i === 1 ? CORAL_COLOR : ICON_COLOR, STROKE_WIDTH);
    }
})();

// ICON 5: Credite — Monede stivuite
(function() {
    var o = getArtboardOrigin(4);
    for (var i = 0; i < 3; i++) {
        var coin = doc.pathItems.ellipse(o.y - S(6 + i * 5), o.x + S(6), S(12), S(6));
        noFillStroke(coin, i === 0 ? CORAL_COLOR : ICON_COLOR, STROKE_WIDTH);
    }
})();

// ICON 6: Download — Săgeată descărcare
(function() {
    var o = getArtboardOrigin(5);
    // Săgeată
    var arrow = doc.pathItems.add();
    arrow.setEntirePath([[o.x + S(12), o.y - S(3)], [o.x + S(12), o.y - S(15)]]);
    noFillStroke(arrow, ICON_COLOR, STROKE_WIDTH);
    var head = doc.pathItems.add();
    head.setEntirePath([[o.x + S(7), o.y - S(11)], [o.x + S(12), o.y - S(15)], [o.x + S(17), o.y - S(11)]]);
    noFillStroke(head, ICON_COLOR, STROKE_WIDTH);
    // Linie bază
    var base = doc.pathItems.add();
    base.setEntirePath([[o.x + S(5), o.y - S(19)], [o.x + S(19), o.y - S(19)]]);
    noFillStroke(base, CORAL_COLOR, STROKE_WIDTH);
})();

// ICON 7: Comisie — 3 persoane
(function() {
    var o = getArtboardOrigin(6);
    var positions = [6, 12, 18];
    for (var i = 0; i < 3; i++) {
        // Cap
        var head = doc.pathItems.ellipse(o.y - S(4), o.x + S(positions[i] - 2.5), S(5), S(5));
        noFillStroke(head, i === 1 ? CORAL_COLOR : ICON_COLOR, STROKE_WIDTH);
        // Corp
        var body = doc.pathItems.add();
        body.setEntirePath([
            [o.x + S(positions[i] - 3), o.y - S(20)],
            [o.x + S(positions[i] - 1), o.y - S(12)],
            [o.x + S(positions[i] + 1), o.y - S(12)],
            [o.x + S(positions[i] + 3), o.y - S(20)],
        ]);
        noFillStroke(body, i === 1 ? CORAL_COLOR : ICON_COLOR, STROKE_WIDTH * 0.8);
    }
})();

// ICON 8: Consens — Două cercuri suprapuse (Venn)
(function() {
    var o = getArtboardOrigin(7);
    var c1 = doc.pathItems.ellipse(o.y - S(4), o.x + S(4), S(12), S(14));
    noFillStroke(c1, ICON_COLOR, STROKE_WIDTH);
    var c2 = doc.pathItems.ellipse(o.y - S(4), o.x + S(8), S(12), S(14));
    noFillStroke(c2, CORAL_COLOR, STROKE_WIDTH);
    // Punct central (acord)
    var dot = doc.pathItems.ellipse(o.y - S(10), o.x + S(10.5), S(3), S(3));
    dot.stroked = false; dot.filled = true; dot.fillColor = CORAL_COLOR;
})();

alert("✅ 8 iconuri suplimentare generate!\n\n" +
    "Pași:\n" +
    "1. Verifică vizual\n" +
    "2. Rulează export-svgs.jsx\n" +
    "3. Salvează în public/icons/");
