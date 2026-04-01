# Prompturi Firefly Text-to-Vector — JobGrade

## Cum se folosesc
1. Deschide Adobe Illustrator 2026
2. Creează document nou: 1440×900px (hero), 800×400px (carduri)
3. Du-te la Window → Text to Vector
4. Copiază promptul de mai jos
5. Generează → selectează varianta cea mai potrivită → editează

## Paleta de referință
- Coral: #E85D43
- Indigo: #4F46E5
- Gri cald: #4A4458
- Fond: #FEFDFB

---

## 1. ILUSTRAȚIE HERO — „Constelația rolurilor"

### Prompt (Text-to-Vector):
```
Abstract constellation of interconnected circles, varying sizes from small to large, connected by thin curved lines. Organic asymmetric composition suggesting a network of roles. Color palette: warm coral (#E85D43) to deep indigo (#4F46E5) gradient. Some circles have concentric rings suggesting evaluation layers. Minimal, elegant, professional. Line art style with subtle gradient fills. No text. No people. White background. Clean vector paths.
```

### Varianta alternativă (mai caldă):
```
Organic network of soft rounded nodes connected by gentle curved paths, reminiscent of a living constellation. Warm coral and deep indigo tones. Varying node sizes suggest hierarchy without rigidity. Subtle transparency and layering. Professional, minimal, sophisticated. Clean vector illustration on white background. No text.
```

### După generare:
- Recolorează cu Generative Recolor: „warm coral to deep indigo gradient, professional, calm"
- Ajustează opacitățile nodurilor: cele mari 40-60%, cele mici 15-25%
- Verifică că liniile de conectare sunt curbe, nu drepte
- Export SVG: File → Export As → SVG (Presentation Attributes, Responsive)

---

## 2. ILUSTRAȚIE CARD B2B — „Structura care crește"

### Prompt (Text-to-Vector):
```
Abstract ascending geometric blocks with rounded corners, arranged as growing steps from left to right. Deep indigo (#4F46E5) at varying opacities (15% to 55%). A thin coral (#E85D43) dashed line connects the tops of the blocks suggesting growth trajectory. Small coral dots at each connection point. Minimal, clean, professional. No text. White background.
```

### După generare:
- Verifică alinierea blocurilor (trebuie să crească de la stânga la dreapta)
- Ajustează opacitățile: primul bloc 15%, ultimul 55%
- Linia punctată coral: stroke-dasharray 4 4
- Artboard: 400×200px
- Export SVG optimizat

---

## 3. ILUSTRAȚIE CARD B2C — „Spirala descoperirii"

### Prompt (Text-to-Vector):
```
Elegant spiral path growing outward with small organic branches sprouting from it, like a plant growing from a seed. Warm coral (#E85D43) dominant with indigo (#4F46E5) accent dots at branch tips. The spiral suggests personal growth and discovery. Organic, flowing, warm. Small decorative dots along the path. Minimal line art with subtle fills. No text. White background.
```

### După generare:
- Spirala trebuie să evoce logo-ul JobGrade (de la centru spre exterior)
- Ramificațiile: 4-5 ramuri cu puncte la capăt
- Culorile: spirala coral, punctele alternativ coral/indigo
- Artboard: 400×200px
- Export SVG optimizat

---

## 4. ILUSTRAȚII PREVIEW B2C (3 carduri — pagina /personal)

### Card 1 — „Profilul tău profesional"
```
Abstract human silhouette made of layered concentric rings, suggesting depth and self-discovery. Indigo (#4F46E5) dominant with coral (#E85D43) accent in the innermost ring. Minimal, contemplative, elegant. No facial features. Clean vector. White background.
```

### Card 2 — „Traiectoria de carieră"
```
Abstract winding path from bottom-left to top-right, with branching decision points marked by small circles. Indigo (#4F46E5) path with coral (#E85D43) dots at intersections. Suggests journey and choices. Minimal, optimistic, professional. No text. White background.
```

### Card 3 — „Dezvoltare personală"
```
Abstract plant or tree growing from a small seed, with geometric-organic leaves at varying stages of development. Indigo (#4F46E5) stem and branches, coral (#E85D43) leaves. Suggests growth, stages, progression. Minimal, warm, encouraging. No text. White background.
```

---

## 5. PATTERN DECORATIV — Spirală subtilă

### Prompt (Text-to-Pattern în Illustrator):
```
Subtle repeating spiral motif, very light opacity (5-8%), warm coral tone on white background. Minimal, barely visible, suggests organic growth. Professional texture for background sections. No distinct objects, just a whisper of pattern.
```

### Utilizare:
- Fundal pentru secțiunea FAQ (zona 5)
- Fundal pentru pagina /personal
- Opacitate: 3-5% în implementare

---

## 6. FUNDAL TEXTURAT (Photoshop — raster)

### Prompt (Generative Fill în Photoshop):
```
Extremely subtle warm gradient texture, from off-white (#FEFDFB) transitioning to very faint lavender (#F8F7FF). Organic, soft, like natural light on paper. No distinct shapes or objects. Professional, calming background.
```

### Export:
- Rezoluție: 1920×1080px
- Format: WebP optimizat (quality 80)
- Dimensiune țintă: <100KB

---

## Note importante

### Stil consistent pe toate ilustrațiile:
- **Line art** cu fills subtile (nu flat design pur, nu realist)
- **Colțuri rotunjite** pe orice formă geometrică (min 4px radius echivalent)
- **Opacități** variabile (15-60%) — niciodată 100% pe forme mari
- **Fără text** în ilustrații — textul e în HTML
- **Fără oameni reali** — forme abstracte care sugerează
- **Gradient coral→indigo** ca element unificator
- **Spațiu alb generos** — ilustrația respiră

### Generative Recolor (pentru ajustare post-generare):
Dacă culorile generate nu sunt exacte, folosește Generative Recolor cu:
```
Warm coral #E85D43 and deep indigo #4F46E5, professional, calm, minimal. No bright or neon colors. Soft opacity variations.
```

### Verificare calitate:
- [ ] Culorile sunt în paleta brand (coral/indigo)?
- [ ] Compoziția e asimetrică, organică (nu rigidă)?
- [ ] Opacitățile sunt variate (nu totul la 100%)?
- [ ] Nu are text generat în ilustrație?
- [ ] SVG-ul exportat are paths curate (nu mii de noduri)?
- [ ] Dimensiunea SVG < 50KB per fișier?
