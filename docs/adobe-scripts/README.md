# Scripturi Adobe — JobGrade Brand Assets

## Instrumente necesare
- **Adobe Creative Cloud Pro** ($69.99/lună) — include Illustrator, Photoshop, 4.000 credite Firefly
- **Adobe Illustrator 2026** — cu Firefly Text-to-Vector Model 2
- **Adobe Photoshop 2026** — cu Generative Fill

## Ordinea de execuție

### Pas 1: Generare AI (Firefly Text-to-Vector în Illustrator)
Folosește prompturile din `firefly-prompts.md` — deschide Illustrator, activează Text-to-Vector, copiază promptul.

### Pas 2: Generare iconuri (ExtendScript în Illustrator)
Rulează `generate-icon-set.jsx` în Illustrator: File → Scripts → Other Script → selectează fișierul.

### Pas 3: Animare logo (CSS)
Copiază `logo-animation.css` în proiect.

### Pas 4: Export și optimizare
Rulează `export-svgs.jsx` pentru export batch din Illustrator.

## Structura fișiere
```
adobe-scripts/
├── README.md (acest fișier)
├── firefly-prompts.md (prompturi pentru Firefly Text-to-Vector)
├── generate-icon-set.jsx (ExtendScript — set 12 iconuri)
├── export-svgs.jsx (ExtendScript — export batch SVG)
└── logo-animation.css (animație stroke drawing pentru logo)
```
