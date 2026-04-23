# Ghid Design Pipeline — Adobe → JobGrade

## Structura directoare

```
src/templates/
  reports/          ← Rapoarte (InDesign → HTML)
    rda/            ← Raport de Diagnostic Analitic
      index.html    ← HTML principal
      styles.css    ← CSS separat
      images/       ← Imagini folosite în template
  emails/           ← Email templates (Dreamweaver)
    invite.html
    reminder.html

public/
  icons/            ← SVG icons (Illustrator)
    evaluation.svg
    report.svg
    ...
  images/           ← Imagini optimizate (Photoshop → WebP)
    hero.webp
    ...
```

## 1. Icons (Illustrator → SVG)

### Export din Illustrator:
1. File → Export → Export As → SVG
2. Setări SVG:
   - **Styling:** Presentation Attributes
   - **Font:** SVG
   - **Images:** Embed
   - **Object IDs:** Layer Names
   - **Decimal:** 2
   - **Minify:** Da
   - **Responsive:** Da

3. **IMPORTANT:** Setează fill-ul culorilor la `currentColor` pentru a permite stilizare CSS:
   ```xml
   <svg fill="currentColor" viewBox="0 0 24 24">...</svg>
   ```

4. Salvează în `public/icons/{nume}.svg`

### Folosire în cod:
```tsx
import Icon from "@/components/icons/Icon"

<Icon name="evaluation" size={24} className="text-indigo-600" />
```

### Dimensiuni standard:
- **16px** — inline text, butoane mici
- **20px** — butoane, taburi
- **24px** — secțiuni, carduri
- **32px** — headers
- **48px** — pagini goale, features

---

## 2. Rapoarte (InDesign → HTML → PDF)

### Design în InDesign:
1. Creează documentul A4 (210×297mm)
2. Folosește culori din paleta JobGrade:
   - Primary: `#1D4ED8`
   - Text: `#111827`
   - Secondary text: `#6B7280`
   - Border: `#E5E7EB`
   - Background alt: `#F9FAFB`
   - Warning: `#92400E` pe `#FEF3C7`

### Export HTML din InDesign:
1. File → Export → HTML
2. Setări:
   - **Export As:** Single HTML File
   - **Image:** JPEG/PNG, 150 DPI (pentru print quality)
   - **CSS:** External (styles.css)
3. Salvează în `src/templates/reports/{nume}/`
4. Redenumește fișierul principal `index.html`

### Variabile template:
Folosește `{{variabilă}}` în text — vor fi înlocuite automat:
- `{{companyName}}` — numele companiei
- `{{cui}}` — CUI-ul companiei
- `{{address}}` — adresa
- `{{date}}` — data generării
- `{{sessionName}}` — numele sesiunii

### Generare PDF din cod:
```typescript
import { loadTemplate } from "@/lib/pdf/template-loader"
import { renderHtmlToPdf } from "@/lib/pdf/html-to-pdf"

const html = loadTemplate("reports", "rda", {
  companyName: "SC Exemplu SRL",
  cui: "RO12345678",
  date: "23.04.2026",
})
const pdfBuffer = await renderHtmlToPdf(html)
```

---

## 3. Interfață (Dreamweaver → HTML/CSS)

### Workflow:
1. Design secțiunea/pagina în Dreamweaver
2. Folosește clase Tailwind CSS unde posibil
3. Export HTML
4. Integrare ca React component (manual sau cu helper)

### Recomandări:
- **Landing pages:** design complet în Dreamweaver, integrat ca static HTML
- **Secțiuni portal:** design partial, apoi convertit în JSX
- **Email templates:** HTML complet cu inline CSS (pentru compatibilitate email clients)

### Fonturi:
- **Interfață:** Segoe UI / system-ui (default)
- **Rapoarte:** Helvetica / Arial (PDF safe)
- **Headings:** Inter sau Poppins (dacă se adaugă custom font)

---

## 4. Imagini (Photoshop → WebP)

### Export din Photoshop:
1. File → Export → Export As
2. Format: **WebP** (sau PNG pentru transparență)
3. Quality: 80-85% (WebP)
4. Dimensiuni: 2x pentru retina (ex: hero 2400×600 pentru afișare 1200×300)
5. Salvează în `public/images/`

### Optimizare:
- Hero images: max 200KB
- Card images: max 50KB
- Thumbnails: max 20KB
- Next.js Image component se ocupă de lazy loading + responsive

---

## Culori Brand JobGrade

| Rol | Hex | Tailwind |
|-----|-----|----------|
| Primary | `#1D4ED8` | `blue-700` |
| Primary light | `#DBEAFE` | `blue-100` |
| Accent | `#E85D43` | custom `coral` |
| Text | `#111827` | `gray-900` |
| Text secondary | `#6B7280` | `gray-500` |
| Background | `#FFFFFF` | `white` |
| Background alt | `#F9FAFB` | `gray-50` |
| Border | `#E5E7EB` | `gray-200` |
| Success | `#059669` | `emerald-600` |
| Warning | `#D97706` | `amber-600` |
| Error | `#DC2626` | `red-600` |
