/**
 * export-svgs.jsx — ExtendScript pentru Adobe Illustrator
 * Exportă fiecare artboard ca SVG individual optimizat
 *
 * Rulare: Illustrator → File → Scripts → Other Script → selectează acest fișier
 * Output: Un folder pe Desktop cu SVG-uri individuale per artboard
 */

// ── Configurare export ──────────────────────────────────────
var doc = app.activeDocument;
var outputFolder = Folder.selectDialog("Selectează folderul de export:");

if (outputFolder) {
    for (var i = 0; i < doc.artboards.length; i++) {
        doc.artboards.setActiveArtboardIndex(i);
        var artboardName = doc.artboards[i].name;

        // Configurare SVG export
        var svgOptions = new ExportOptionsSVG();
        svgOptions.embedRasterImages = false;
        svgOptions.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES;
        svgOptions.fontType = SVGFontType.OUTLINEFONT;
        svgOptions.coordinatePrecision = 2;
        svgOptions.documentEncoding = SVGDocumentEncoding.UTF8;
        svgOptions.DTD = SVGDTDVersion.SVG1_1;
        svgOptions.preserveEditability = false;
        svgOptions.slices = false;
        svgOptions.sVGAutoKerning = true;
        svgOptions.sVGTextOnPath = false;
        svgOptions.artboardRange = String(i + 1);

        // Export
        var exportFile = new File(outputFolder + "/" + artboardName + ".svg");
        doc.exportFile(exportFile, ExportType.SVG, svgOptions);
    }

    alert("✅ " + doc.artboards.length + " SVG-uri exportate în:\n" + outputFolder.fsName);
}
