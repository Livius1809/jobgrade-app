

# BRIEF CREATIV COMPLET — JOBGRADE.RO
## Cele 3 pagini fundamentale: Design, Conținut, Experiență

---

# ═══════════════════════════════════════════════════════════════
# PAGINA 1: PAGINA DE ÎNTÂLNIRE (jobgrade.ro — homepage)
# ═══════════════════════════════════════════════════════════════

---

## A. STRUCTURA PAGINII (wireframe descriptiv)

### Desktop (1440px referință)

**ZONA 1 — HEADER NAVIGARE (5% din viewport, fix/sticky)**
- Stânga: Logo spirală coral-to-indigo + wordmark „JobGrade" în Inter SemiBold
- Centru: Navigare minimală — „Despre" | „Pentru companii" | „Pentru tine" | „Contact"
- Dreapta: Buton „Intră în cont" (ghost/outline, Indigo) + Selector limbă RO/EN (discret, doar inițiale)
- La scroll: header-ul capătă un fond alb cu 2% opacitate blur (glassmorphism subtil), iar spirala logo se micșorează ușor (de la 40px la 28px)
- Separare: NU linie, ci doar shadow subtilă (0 2px 8px rgba(79,70,229,0.06))

**ZONA 2 — HERO / PRIMA RESPIRAȚIE (90% din primul viewport)**
- Fundal: gradient extrem de subtil — de la alb-cald (#FEFDFB) la o nuanță abia perceptibilă de lavandă (#F8F7FF) pe verticală
- Centru-stânga (55% lățime): Textul principal, aliniat stânga
  - Pre-heading (Inter Regular, 16px, Coral #E85D43): „Evaluăm posturi. Construim echitate."
  - Heading principal (Inter SemiBold, 56px, Indigo #1E1B4B — mai închis decât brandul pentru contrast): mesaj de întâlnire (vezi secțiunea B)
  - Paragraf (Inter Regular, 20px, gri cald #4A4458, line-height 1.6, max 520px lățime): textul filozofic
  - Sub paragraf: două butoane (vezi secțiunea E)
- Centru-dreapta (45% lățime): Ilustrație hero (vezi secțiunea D)
- NU există săgeată „scroll down". Curiozitatea naturală trage în jos.
- Efect subtil: la prima încărcare, textul apare cu un fade-in de 0.6s (nu slide, nu bounce — doar opacitate), ilustrația cu 0.3s întârziere

**ZONA 3 — PUNTE DE CURIOZITATE (10% viewport, apare la scroll)**
- O singură propoziție centrată, Inter Regular 24px, Indigo
- Funcționează ca un „hm, interesant" care face trecerea de la filozofie la concret
- Fundal: continuă gradientul subtil
- Padding generos sus-jos (80px)

**ZONA 4 — CELE DOUĂ DRUMURI (50% viewport)**
- Layout: două carduri mari, side by side, cu 32px gap între ele
- Card stânga: „Pentru companii" (B2B) — 50% lățime
- Card dreapta: „Pentru tine" (B2C) — 50% lățime
- Fiecare card: 
  - Colț rotunjit 16px
  - Fundal alb cu border 1px solid rgba(79,70,229,0.08)
  - Ilustrație/icon în partea de sus (200px înălțime)
  - Heading (Inter SemiBold, 28px)
  - Paragraf scurt (Inter Regular, 16px, 3-4 rânduri max)
  - CTA în partea de jos
  - La hover: shadow ușoară + border devine mai vizibil + micro-translație Y de -4px (tranziție 0.3s ease)
- Între cele două carduri, vizual: spirala logo se regăsește subtil ca element decorativ (opacity 5%, blur, în background)

**ZONA 5 — SOCIAL PROOF DISCRET (30% viewport)**
- NU testimoniale clasice cu ghilimele și poze stock
- În schimb: o secțiune „Ce întrebări își pun cei care ajung aici" — 3-4 întrebări reale (vezi secțiunea C)
- Sub fiecare întrebare: un răspuns scurt, uman, la obiect
- Layout: o coloană centrată, max 720px, spațiere generoasă
- Fundal: o nuanță abia mai caldă (#FBF9F7)
- Dacă/când vom avea clienți reali: se transformă în citate reale, dar fără format de testimonial clasic — mai degrabă format conversațional

**ZONA 6 — FOOTER (15% viewport)**
- Fundal: Indigo închis (#1E1B4B)
- Text alb
- 4 coloane: 
  - Col 1: Logo alb + tagline + „© 2026 Psihobusiness Consulting SRL"
  - Col 2: Linkuri platformă (Despre, Prețuri, Contact, FAQ)
  - Col 3: Legal (Termeni, Confidențialitate, Cookies, GDPR)
  - Col 4: Contact (email, telefon) + Social media icons (dacă există)
- Sub coloane: o linie subțire albă (opacity 10%) + rând cu CIF-ul și badge-uri conformitate (GDPR, AI Act)
- Tonul din footer: nu juridic-rece, ci scurt și clar

### Mobile (375px referință)

- Header: Logo + hamburger menu (meniul se deschide full-screen, fond Indigo, linkuri albe, animație slide-from-right 0.3s)
- Hero: textul ocupă 100% lățime, ilustrația trece DEASUPRA textului (dar la 60% dimensiune), heading devine 36px, paragraf 17px
- Cele două drumuri: cardurile se stivuiesc vertical, B2B primul
- Social proof: se păstrează identic, funcționează bine pe o coloană
- Footer: coloanele devin acordeon (tap to expand)
- Butoanele: devin full-width pe mobile, cu 56px înălțime (touch-friendly)
- Distanțele se reduc cu ~40% pe verticală

### Flow vizual (eye-tracking anticipat)

1. **Prima fixare**: Heading-ul principal (cel mai mare, cel mai contrastant)
2. **A doua fixare**: Ilustrația hero (culoare, formă organică)
3. **A treia fixare**: Paragraful sub heading (dacă heading-ul a rezonat)
4. **A patra fixare**: Butoanele CTA
5. **La scroll**: Propoziția-punte de curiozitate oprește scroll-ul rapid
6. **Cardurile B2B/B2C**: scanare stânga-dreapta, heading-urile cardurilor
7. **Final**: secțiunea de întrebări ține atenția prin format conversațional

---

## B. CATEGORII DE CONȚINUT

### Text de filozofie/brand

**Heading hero (max 8 cuvinte):**
> „Fiecare post merită o evaluare corectă."

Alternativă:
> „Echitatea salarială începe cu o întrebare."

Alternativă (mai caldă):
> „Știi cât valorează fiecare rol din echipa ta?"

**Paragraf filozofic (sub heading, max 3 rânduri la 520px):**
> „JobGrade este un instrument de evaluare a posturilor, construit pentru realitățile de aici. Ajută companiile să construiască grile salariale coerente — nu din obligație, ci din convingerea că echitatea ține oamenii aproape."

**Pre-heading (deasupra heading-ului):**
> „Evaluăm posturi. Construim echitate."

### Text informativ

**Card B2B — heading:** „Pentru companii"
**Card B2B — text:**
> „Evaluezi posturile sistematic. Construiești o grilă salarială coerentă. Demonstrezi conformitatea cu Directiva UE 2023/970. Totul într-un singur loc, cu suport AI la fiecare pas."

**Card B2C — heading:** „Pentru tine"
**Card B2C — text:**
> „Explorează-ți punctele forte. Descoperă ce rol ți se potrivește. Construiește-ți un profil profesional pe care să-l înțelegi cu adevărat — nu doar un CV, ci o hartă a ta."

### Text de curiozitate (puntea)

> „Cele mai multe companii plătesc pe simț. Noi propunem o alternativă."

Alternativă:
> „Între «plătesc cât pot» și «plătesc cât trebuie» există un instrument."

### Social proof — format conversațional

**Secțiunea: „Întrebări pe care le auzim des"**

*Î: „De ce aș avea nevoie de asta? Am funcționat bine și fără."*
R: „Poate că da. Dar vine un moment în care un coleg bun pleacă, și nu înțelegi de ce. De multe ori, răspunsul e în grila salarială."

*Î: „E complicat? N-am echipă de HR structurată."*
R: „Instrumentul e construit tocmai pentru companiile care nu au departament de HR dedicat. Interfața te ghidează pas cu pas."

*Î: „Asta e doar pentru Directiva UE?"*
R: „Directiva e un context. Dar evaluarea posturilor e utilă indiferent de legislație — ajută la retenție, la decizii corecte, la claritate internă."

### CTA-uri (text exact, vezi și secțiunea E)

- **Primar (hero, B2B):** „Începe evaluarea" — buton solid Coral
- **Secundar (hero, B2C):** „Descoperă-ți profilul" — buton outline Indigo
- **Card B2B:** „Intră în platformă" — buton solid Indigo
- **Card B2C:** „Explorează (în curând)" — buton outline, cu badge „În curând" integrat

### Micro-copy

- Selector limbă: „RO" / „EN" (fără steaguri, fără dropdown elaborat)
- Sub CTA primar: „Fără card. Fără obligații. Începi cu un cont gratuit." (Inter Regular, 13px, gri, centrat sub buton)
- Cookie banner: „Folosim cookie-uri strict necesare pentru funcționarea platformei. Fără tracking, fără publicitate." + buton „Am înțeles"
- 404 (dacă cineva ajunge pe pagină inexistentă): „Pagina asta nu există încă. Dar noi suntem aici →" + link „Acasă"

---

## C. SALES HOOKS & CURIOSITY TRIGGERS

### 5+ formulări de tip hook (fără frică, fără urgență)

1. **„Când doi oameni fac același lucru, dar unul câștigă cu 40% mai mult — problema nu e la ei. E la grilă."**
   — Concret, provocator, fără a blama pe nimeni.

2. **„Echitatea nu e un beneficiu. E fundația."**
   — Scurt, filozofic, rămâne în minte.

3. **„Directiva UE 2023/970 nu cere perfecțiune. Cere transparență. Noi te ajutăm cu ambele."**
   — Contextualizează legislația fără panică.

4. **„Știi de ce pleacă oamenii buni? Rareori e doar despre bani. Dar aproape întotdeauna e și despre bani."**
   — Storytelling micro, recunoaștere imediată.

5. **„O evaluare de post durează 15 minute. O decizie proastă de salarizare costă 12 luni."**
   — Concret, fără dramă, proporțional.

6. **„Ai construit afacerea cu instinct. Grila salarială merită aceeași atenție."**
   — Respect pentru antreprenor + provocare blândă.

7. **„Nu vindem conformitate. Construim sisteme care fac conformitatea un efect secundar."**
   — Repoziționare: de la obligație la rezultat natural.

### Curiosity triggers (întrebări care deschid)

- „Ce ar spune o evaluare obiectivă despre posturile din firma ta?"
- „Dacă ai construi grila salarială de la zero azi — ar arăta la fel?"
- „Cine din echipa ta e sub-evaluat fără să știi?"
- „Ce-ar fi dacă echitatea salarială ar fi cel mai simplu lucru de demonstrat la un audit?"

### Storytelling elements (micro-narații)

**Narațiune pentru pagina de întâlnire (NU pe homepage direct, dar pregătită pentru pagina „Despre"):**
> „Am construit JobGrade după zeci de conversații cu manageri care spuneau: «Știu că nu plătesc corect, dar nu am un instrument pe care să-l înțeleg.» Am înțeles că problema nu era lipsa de bună-voință — era lipsa unui cadru. Așa am ajuns aici."

**Micro-narațiune integrabilă în cardul B2B:**
> „O companie cu 85 de angajați a descoperit, după prima evaluare, că avea 3 posturi identice plătite la 3 niveluri diferite. Nu din rea-voință — din lipsa unui sistem."

### Anti-patterns: CE NU PUNEM (și de ce)

| NU punem | De ce |
|----------|-------|
| „Prima platformă românească de..." | Declanșează auto-denigrarea. Românii nu au încredere în „prima" din România. Spunem „construită pentru realitățile de aici". |
| Countdown timer / „Ofertă limitată" | Exploatează frica. Contravine valorii „Echitabil". |
| Banner roșu cu suma amenzii GDPR/Directivă | Fear-based selling. Directiva e un context, nu o amenințare. |
| „Peste 500 de companii ne-au ales" | Dacă nu e adevărat, e minciună. Dacă e adevărat dar e mic, sună defensiv. Când vom avea cifre reale, le vom folosi natural. |
| Testimoniale fabricate | Niciodată. Mai bine secțiunea de social proof rămâne cu formatul „Întrebări frecvente" până avem citate reale. |
| Animații agresive (bouncing CTAs, shake effects) | Manipulare vizuală. Contravine „precizie" și „eleganță". |
| Stock photos cu oameni în costume la birou | Generice, neautentice, nu rezonează cultural. |
| „Inteligența Artificială va..." | Nu menționăm AI ca feature principal. E un instrument, nu un argument de vânzare. |
| Pop-up la 3 secunde cu „Vrei o demonstrație?" | Întrerupe, irită, contravine „relație > tranzacție". |
| „Partenerul tău de încredere" | Clișeu. Încrederea se câștigă, nu se declară. |

---

## D. ELEMENTE VIZUALE (pentru Adobe)

### Ilustrație Hero (concept detaliat)

**Concept: „Constelația rolurilor"**
- O ilustrație abstractă-organică care sugerează o rețea de noduri conectate
- Fiecare nod = un cerc de dimensiuni variate (sugerând roluri diferite), colorat în nuanțe din spectrul coral-to-indigo
- Conexiunile dintre noduri = linii subțiri, curbate, cu gradient
- Unele noduri au un cerc concentric (sugerând evaluarea/stratificarea)
- Compoziția e asimetrică, organică — NU diagramă corporatistă
- Stil: line art cu fills subtile, reminiscent de constelații, dar cu căldura culorilor brand
- Dimensiune: 600x500px la export, SVG pentru scalabilitate
- Animație subtilă (CSS, nu After Effects): nodurile „respiră" ușor (scale 1.0 → 1.02, ritm diferit pentru fiecare, 4-6s cycle)

**Alternativă de concept: „Cântarul calibrat"**
- NU un cântar clasic de justiție
- Un obiect abstract care sugerează echilibrul: două forme organice, suspendate, în echilibru dinamic
- Una coral, una indigo, conectate de o linie subțire
- Sugerează evaluare, echilibru, precizie — fără simbolism juridic
- Stil: minimal, geometric-organic

### Ilustrații carduri B2B și B2C

**Card B2B: „Structura care crește"**
- Forme geometrice (dreptunghiuri cu colțuri rotunjite) aranjate în trepte/niveluri
- Sugerează: ierarhie, organizare, grilă — dar organic, nu rigid
- Culoare dominantă: Indigo cu accente Coral
- Dimensiune: 400x200px, SVG

**Card B2C: „Spirala descoperirii"**
- O spirală (evocând logo-ul) din care pornesc ramificații, ca o plantă
- Sugerează: creștere personală, explorare, desfășurare
- Culoare dominantă: Coral cu accente Indigo
- Dimensiune: 400x200px, SVG

### Iconografie custom

**Set necesar pentru homepage: 8 iconuri**
1. Evaluare (două cercuri concentrice cu o bifă subtilă)
2. Echitate (două linii orizontale la același nivel)
3. Conformitate (un scut rotunjit, fără exclamație)
4. Ghidare (o cale curbată cu un punct pe ea)
5. Profil (un cerc cu o formă organică înăuntru — nu siluetă umană clasică)
6. Limbă RO (litera „R" stilizată)
7. Limbă EN (litera „E" stilizată)
8. Meniu hamburger (3 linii, colțuri rotunjite, linie din mijloc mai scurtă)

**Stil iconuri:** Line art, 2px stroke, colțuri rotunjite, monocrom (Indigo), 24x24px grid. La hover: stroke devine Coral (tranziție 0.2s).

### Fotografii/imagini

- **NU folosim fotografii pe homepage.** Ilustrațiile custom sunt mai autentice și mai controlabile.
- **Excepție viitoare:** Când vom avea fotografii reale de la clienți/evenimente, le vom integra în secțiunea de social proof, dar procesate: desaturate ușor, cu overlay subtil cald, colțuri rotunjite 12px.

### Animații și micro-interacțiuni

1. **Logo la încărcare:** Spirala se desenează (stroke-dasharray animation) în 1.2s, de la exterior la centru, apoi se umple cu gradient coral-to-indigo
2. **Scroll progress:** O linie subțire Coral în partea de sus a paginii (2px, sub header) care crește cu scroll-ul — discretă, utilă
3. **Carduri B2B/B2C hover:** Micro-translație Y -4px + shadow + border mai vizibil (0.3s ease)
4. **Butoane hover:** Coral devine mai închis (#D4482E), scală 1.02 (0.2s ease). Nu bounce, nu shake.
5. **Secțiunea de întrebări:** Fiecare întrebare apare cu un fade-in ușor la scroll (Intersection Observer, threshold 0.3, fade+translate-Y de 20px, 0.4s ease)
6. **Noduri hero (dacă se alege „Constelația"):** Respirație lentă, asincronă. Fiecare nod are un delay și o durată diferită. Unele noduri își schimbă ușor opacitatea (0.7 → 1.0 → 0.7).

### Gradienți și texturi

- **Gradient primar (hero background):** linear-gradient(180deg, #FEFDFB 0%, #F8F7FF 100%) — abia perceptibil
- **Gradient accent (butoane, hover effects):** linear-gradient(135deg, #E85D43 0%, #D4482E 100%)
- **Gradient spiral (logo):** conic-gradient sau SVG gradient de la Coral la Indigo, urmărind curba spiralei
- **Textură:** NU textură vizibilă. Suprafețele sunt curate. Singura „textură" este jocul subtil de umbre și opacități.
- **Noise:** NU adăugăm grain/noise. Estetica e curată, modernă, fără artificii retro.

### Video

**NU pentru homepage la lansare.** Prioritatea e performanța (LCP sub 2.5s). Un video hero ar încetini prima încărcare.

**Pregătire viitoare:** Un video scurt (30-45s) cu conceptul „De la suprafață la esență" — camera care „intră" într-o spirală abstractă, cu voice-over care spune esența brandului. Dar asta e pentru Q3 2026, nu pentru lansare.

---

## E. AMPLASAREA BUTOANELOR ȘI ACȚIUNILOR

### Butoane Hero (zona 2)

**Buton primar: „Începe evaluarea"**
- Tip: Solid
- Fundal: Coral #E85D43
- Text: Alb #FFFFFF, Inter SemiBold, 16px
- Dimensiune: padding 16px 32px, border-radius 10px
- Poziție: sub paragraf, stânga, primul din rând
- Hover: fundal #D4482E, shadow 0 4px 12px rgba(232,93,67,0.3), scală 1.02
- Active (click): fundal #C0401F, scală 0.98
- Focus: outline 2px solid Indigo, offset 2px (accesibilitate)
- Sub buton: text mic „Fără card. Fără obligații." (13px, gri #8A8494)

**Buton secundar: „Descoperă-ți profilul"**
- Tip: Outline/Ghost
- Border: 2px solid Indigo #4F46E5
- Text: Indigo #4F46E5, Inter SemiBold, 16px
- Fundal: transparent
- Dimensiune: padding 16px 32px, border-radius 10px
- Poziție: lângă butonul primar, cu 16px gap
- Hover: fundal Indigo #4F46E5, text alb, shadow 0 4px 12px rgba(79,70,229,0.3)
- Badge: „În curând" — un tag mic (10px, uppercase, letter-spacing 1px) în colțul dreapta-sus al butonului, Coral pe fond alb, border-radius 4px
- Disabled state (dacă B2C nu e activ): opacity 0.6, cursor not-allowed, hover fără efect

### Butoane carduri (zona 4)

**Card B2B — „Intră în platformă"**
- Tip: Solid Indigo
- Dimensiune: full-width în card, padding 14px 0
- Poziție: partea de jos a cardului, cu 24px de la text

**Card B2C — „Explorează"**
- Tip: Outline Indigo
- Badge „În curând" integrat
- Comportament: la click, un tooltip apare „Lucrăm la asta. Lasă-ne emailul și te anunțăm." + input email + buton „Anunță-mă"

### Buton navigare — „Intră în cont"
- Tip: Ghost/Text button cu border subtil
- Text: Indigo, Inter Medium, 14px
- Border: 1px solid rgba(79,70,229,0.2), border-radius 8px
- Padding: 8px 20px
- Hover: fundal rgba(79,70,229,0.05), border mai vizibil
- Poziție: dreapta header, înainte de selector limbă

### Ierarhia vizuală completă

1. **Primar:** Coral solid — acțiunea principală pe care o dorim
2. **Secundar:** Indigo solid — acțiunea alternativă importantă
3. **Terțiar:** Indigo outline — acțiuni complementare
4. **Ghost:** Text cu hover subtil — navigare, link-uri contextuale

### Mobile — transformări

- Butoanele hero: se stivuiesc vertical, fiecare full-width, 56px înălțime, 12px gap între ele
- „Începe evaluarea" rămâne primul (coral)
- „Descoperă-ți profilul" al doilea (outline)
- Butoanele din carduri: rămân full-width (deja sunt)
- „Intră în cont": se mută în meniul hamburger, devine primul item, cu accent vizual
- Selector limbă: rămâne vizibil în header, lângă hamburger

---

## F. TIPURI DE TEXT ȘI REGISTRU

### Sistem tipografic complet

**Display heading (hero):**
- Font: Inter SemiBold
- Dimensiune desktop: 56px / Mobile: 36px
- Line-height: 1.1
- Letter-spacing: -0.02em
- Culoare: Indigo închis #1E1B4B
- Max caractere: 50 (forțat prin copy, nu CSS)

**H2 (titluri secțiuni):**
- Font: Inter SemiBold
- Dimensiune desktop: 36px / Mobile: 28px
- Line-height: 1.2
- Culoare: Indigo #1E1B4B
- Max caractere: 40

**H3 (titluri carduri/subsecțiuni):**
- Font: Inter SemiBold
- Dimensiune desktop: 24px / Mobile: 20px
- Line-height: 1.3
- Culoare: Indigo #1E1B4B

**Body large (paragrafe sub headings):**
- Font: Inter Regular
- Dimensiune desktop: 20px / Mobile: 17px
- Line-height: 1.6
- Culoare: Gri cald #4A4458
- Max lățime: 620px (measure optimal pentru lizibilitate)

**Body (text general):**
- Font: Inter Regular
- Dimensiune desktop: 16px / Mobile: 15px
- Line-height: 1.6
- Culoare: Gri cald #4A4458
- Max lățime: 680px

**Small / Micro-copy:**
- Font: Inter Regular
- Dimensiune: 13px
- Line-height: 1.4
- Culoare: Gri deschis #8A8494

**CTA text:**
- Font: Inter SemiBold
- Dimensiune: 16px
- Letter-spacing: 0.01em
- Text-transform: none (NU uppercase — e prea agresiv)

### Registru și ton

**Tonul general: Conversație între profesioniști.**
- Nu academic, nu casual. Ca o conversație cu un consultant care te respectă.
- Propoziții scurte. Paragrafe de max 3 rânduri.
- Persoana a II-a plural politicos (nu „dumneavoastră", nu „tu" — „vă", „voi" contextual, dar mai ales construcții impersonale sau cu „noi").

**Accent text:**
- Bold: folosit RAR, doar pentru concepte cheie (max 2-3 cuvinte bold per paragraf)
- Culoare Coral: pentru cuvinte-cheie în context (ex: „echitate", „corect", „evaluare")
- Italic: NICIODATĂ în interfață. Italic e greu de citit pe ecran.

### Placeholder text (input-uri)

- Email: „adresa@companie.ro"
- Parolă: „••••••••" (8 buline)
- Căutare: „Caută un serviciu..."
- Nume companie: „Numele companiei tale"

### Empty states

**Când un utilizator B2B intră prima dată și nu are date:**
> Heading: „Aici vor apărea evaluările tale"
> Text: „Începe prima evaluare de post și rezultatele vor fi vizibile aici."
> CTA: „Evaluează primul post" (buton Coral, centrat)
> Ilustrație: un cerc simplu cu o linie punctată în interior (sugestie de „loc rezervat"), stilizat, nu generic

**Când B2C nu e disponibil:**
> Heading: „Lucrăm la ceva special pentru tine"
> Text: „Portalul personal e în construcție. Lasă-ne adresa de email și vei fi printre primii care îl explorează."
> Input: email + buton „Anunță-mă"
> Ilustrație: spirala brand (mare, centrată, opacity 15%, ca fundal)

---

## G. EXPERIENȚA COMPLETĂ

### Scenariul 1: Maria, HR Director, prima vizită, nu știe ce e JobGrade

**Context:** Maria are 42 de ani, lucrează la o companie de producție cu 200 de angajați. A auzit de Directiva UE de la un coleg la o conferință. Caută pe Google „evaluare posturi România". Ajunge pe jobgrade.ro.

**Secunda 1-3: Prima impresie**
- Vede un header curat, fără clutter
- Ochii cad pe heading: „Fiecare post merită o evaluare corectă."
- Simte: „OK, nu e un site agresiv. Par serioși."

**Secunda 3-7: Scanare rapidă**
- Citește paragraful: „construit pentru realitățile de aici"
- Vede butonul „Începe evaluarea" dar nu apasă încă
- Observă ilustrația — e diferită de ce vede pe site-urile de soft HR. E mai... umană.
- Simte: „Interesant. Nu par a fi un ERP deghizat."

**Secunda 7-15: Scroll și explorare**
- Scrollează și întâlnește puntea: „Cele mai multe companii plătesc pe simț. Noi propunem o alternativă."
- Se oprește. Recunoaște situația. Simte: „Da, exact asta facem."
- Vede cardurile B2B/B2C. Se duce natural spre „Pentru companii".

**Secunda 15-30: Decizie**
- Citește cardul B2B. Vede: „Evaluezi posturile sistematic. Construiești o grilă salarială coerentă."
- Vede: „Intră în platformă"
- Scrollează mai jos, vede secțiunea de întrebări. Citește „E complicat? N-am echipă de HR structurată." — răspunsul o liniștește.
- Simte: „Mă înțeleg. Pare construit pentru cineva ca mine."

**Acțiune:** Click pe „Intră în platformă" sau „Începe evaluarea". Ajunge pe pagina de înregistrare.

**Emoția finală: „Am ajuns acasă. Cineva mă înțelege."**

---

### Scenariul 2: Andrei, CEO, a auzit de Directiva UE, curios dar sceptic

**Context:** Andrei are 48 de ani, companie de IT cu 50 de angajați. CFO-ul i-a menționat Directiva. E sceptic la „încă un soft de HR". Caută „directiva transparență salarială instrument" pe Google.

**Secunda 1-3:**
- Vede heading-ul. Se gândește: „Bine, dar ce face concret?"
- NU citește paragraful filozofic, scanează rapid în jos.

**Secunda 3-10:**
- Ajunge la puntea de curiozitate: „Cele mai multe companii plătesc pe simț. Noi propunem o alternativă."
- Se oprește. Se recunoaște. Dar: „OK, și care e alternativa?"

**Secunda 10-20:**
- Vede cardul B2B. Citește: „Demonstrezi conformitatea cu Directiva UE 2023/970."
- Asta era ce căuta. Dar nu e singurul lucru — vede și „grilă salarială coerentă", „suport AI".
- Se gândește: „Deci nu e doar compliance. E un instrument real."

**Secunda 20-40:**
- Scrollează la întrebări. Citește: „Asta e doar pentru Directiva UE?" — „Directiva e un context. Dar evaluarea posturilor e utilă indiferent de legislație."
- Simte: „Bun. Nu mă tratează ca pe un idiot. Nu mă sperie cu amenzi."

**Acțiune:** Click pe „Intră în platformă". Vrea să vadă ce e înăuntru. Dacă înregistrarea e simplă (max 3 câmpuri), o face. Dacă nu — pleacă.

**Emoția finală: „Par pragmatici. Dau o șansă."**

---

### Scenariul 3: Elena, persoană fizică, caută dezvoltare personală

**Context:** Elena are 29 de ani, lucrează în marketing, simte că nu e pe drumul potrivit. Caută „descoperire vocație" sau „profil profesional" pe Google. Ajunge (eventual) pe jobgrade.ro.

**Secunda 1-5:**
- Heading-ul e despre evaluarea posturilor. Nu e exact ce căuta.
- Dar vede „Descoperă-ți profilul" — asta rezonează.
- Vede cardul B2C: „Explorează-ți punctele forte. Descoperă ce rol ți se potrivește."

**Secunda 5-15:**
- Citește textul B2C: „nu doar un CV, ci o hartă a ta"
- Simte: „Asta vreau. Dar ce e cu «În curând»?"
- Click pe „Explorează" — apare tooltip-ul cu „Lucrăm la asta. Lasă-ne emailul."

**Acțiune:** Lasă emailul. Simte că nu a pierdut timpul. Pagina nu a fost un dead end — i-a dat ceva de făcut.

**Emoția finală: „Arată promițător. Sper să termine repede."**

---

---

# ═══════════════════════════════════════════════════════════════
# PAGINA 2: PORTALUL B2B (dashboard — /dashboard)
# ═══════════════════════════════════════════════════════════════

---

## A. STRUCTURA PAGINII (wireframe descriptiv)

### Desktop (1440px referință)

**LAYOUT GENERAL: Sidebar + Main Content**

Aceasta e o aplicație, nu un site. Logica vizuală se schimbă: funcționalitate > storytelling, eficiență > eleganță contemplativă. Dar principiile de bază rămân: respect, claritate, căldură.

**SIDEBAR STÂNGA (240px lățime, fixă)**
- Fundal: Indigo foarte deschis (#F8F7FF) sau alb cu un accent lateral
- Top: Logo spirală mic (28px) + „JobGrade" wordmark + numele companiei (truncat la 20 caractere cu tooltip la hover)
- Separator vizual: linie 1px, opacity 8%
- Navigare verticală:
  - ● Acasă (dashboard overview)
  - ● Evaluare posturi (expandabil: Listă posturi / Evaluare nouă / Rezultate)
  - ● Grilă salarială
  - ● Rapoarte
  - ● Setări companie
  - ● Ajutor
- Fiecare item: icon 20px (din setul custom) + text Inter Medium 14px
- Item activ: fundal Indigo 8% opacity, text Indigo, bară laterală stânga 3px Coral
- Item hover: fundal Indigo 4% opacity
- Bottom sidebar:
  - Avatar utilizator (cerc 36px, inițiale dacă nu are poză) + Nume + Rol
  - Buton „Ieși din cont" (text, fără icon, gri, hover coral)
- Sidebar e colapsabilă: la click pe un buton „«" devine 64px (doar iconuri), cu tooltip la hover

**ZONA PRINCIPALĂ — HEADER SUPERIOR (64px înălțime)**
- Stânga: Breadcrumb (ex: „Acasă > Evaluare posturi > Rezultate"), Inter Regular 13px, gri
- Dreapta: Notificări (clopoțel, badge roșu dacă sunt noi) + Quick search (lupă, expandabil)

**ZONA PRINCIPALĂ — CONȚINUT (sub header, scrollabil)**

La prima vizitare (cont nou), structura e:

**Card de bun venit (full-width, top)**
- Heading: „Bine ai venit, [Prenume]. Hai să începem."
- Text: „Primul pas e simplu: evaluezi un post. Durează aproximativ 15 minute și la final vei avea prima referință pentru grila ta salarială."
- CTA: „Evaluează primul post" (buton Coral, dimensiune medie)
- Buton secundar: „Descoperă platforma mai întâi" (text link, Indigo)
- Ilustrație mică dreapta: un element din constelația hero, stilizat, 120px
- Card-ul poate fi dismissuit (x în colțul dreapta-sus, cu „Poți reveni oricând din Ajutor")

**Grilă de servicii/module (sub cardul de bun venit)**
- Layout: 3 coloane, carduri egale
- Fiecare card modul:
  - Icon (din setul custom, 48px, Indigo)
  - Titlu modul (Inter SemiBold, 18px)
  - Descriere scurtă (Inter Regular, 14px, gri, 2 rânduri max)
  - Status: „Activ" (badge verde) / „Disponibil" (badge Indigo) / „În curând" (badge gri)
  - La hover: shadow + border, ca pe homepage

**Module afișate (în ordine):**

| Modul | Titlu | Status | Descriere |
|-------|-------|--------|-----------|
| 1 | Evaluare posturi | Activ | Evaluează sistematic fiecare post din organizație |
| 2 | Grilă salarială | Activ | Construiește și vizualizează grila pe baza evaluărilor |
| 3 | Raport conformitate | Activ | Generează raportul pentru Directiva UE 2023/970 |
| 4 | Benchmark salarial | În curând | Compară grila ta cu piața |
| 5 | Analiză echitate | În curând | Identifică discrepanțe salariale pe gen, vârstă, experiență |
| 6 | Suport AI | Activ | Întreabă orice despre evaluare, legislație, metodologie |

**Card-urile „În curând":**
- Opacity 0.7, dar NU gri complet. Textul e lizibil.
- La hover: tooltip „Lucrăm la acest modul. Va fi disponibil în curând."
- NU click, NU pagină goală. Hover = informare.

**PANOUL AI CHAT (dreapta, opțional)**
- Buton flotant în colțul dreapta-jos: cerc 56px, Indigo, icon chat alb
- La click: se deschide un panou lateral (360px lățime, full height)
- Slide-in de la dreapta, 0.3s ease
- Header panou: „Asistent JobGrade" + buton închidere (x)
- Zona de chat: mesaje cu bulele standard
  - AI: fundal #F3F2FF (lavandă), text Indigo, border-radius 12px 12px 12px 4px
  - Utilizator: fundal Coral 10% opacity, text #1E1B4B, border-radius 12px 12px 4px 12px
- Input jos: „Scrie o întrebare..." + buton trimitere (icon săgeată, Indigo)
- Mesaj inițial (pre-populat): „Bună! Sunt aici să te ajut cu orice întrebare despre evaluarea posturilor, grila salarială sau conformitatea cu Directiva UE. Cu ce pot începe?"
- Panoul NU acoperă sidebar-ul. Main content se comprimă ușor.

**ZONA — SUMAR RAPID (sub grilă, dacă utilizatorul are date)**
- 4 carduri mici, orizontal:
  - „Posturi evaluate: X din Y"
  - „Grad completare grilă: X%"
  - „Ultima evaluare: [dată]"
  - „Status conformitate: [în progres/complet]"
- Carduri: fundal alb, border subtil, icon mic stânga, cifră mare (Inter SemiBold, 28px), label dedesubt (Inter Regular, 13px, gri)

### Mobile (375px referință)

- Sidebar dispare → devine bottom tab bar (5 itemi: Acasă, Evaluare, Grilă, Rapoarte, Mai mult)
- Bottom tab bar: 56px, fundal alb, shadow sus, iconuri 24px + label 10px
- Header-ul superior: breadcrumb dispare, rămâne doar titlul paginii + notificări
- Grila de module: o singură coloană, carduri full-width, stivuite
- Panoul AI: devine full-screen overlay (nu panou lateral)
- Sumar rapid: 2x2 grid (2 coloane, 2 rânduri)
- Cardul de bun venit: ilustrația dispare, textul ocupă full-width

### Flow vizual

1. **Prima fixare:** Cardul de bun venit cu CTA-ul Coral
2. **A doua fixare:** Grila de module (scanare sus-jos, stânga-dreapta)
3. **A treia fixare:** Badge-urile de status (activ/în curând)
4. **Dacă are date:** Sumarul rapid cu cifrele

---

## B. CATEGORII DE CONȚINUT

### Text de filozofie/brand (minimal în dashboard)

- Dashboard-ul NU e loc de filozofie. E loc de muncă.
- Singurele momente de „brand voice": cardul de bun venit + empty states
- Tonul: eficient, prietenos, la obiect. Ca un coleg bun care știe ce are de făcut.

### Text informativ

**Cardul de bun venit — variante contextuale:**

*Cont nou, nicio evaluare:*
> „Bine ai venit, [Prenume]. Hai să începem."
> „Primul pas e simplu: evaluezi un post. Durează aproximativ 15 minute."

*Cont cu evaluări în progres:*
> „Bine te-am regăsit, [Prenume]. Ai [X] evaluări în așteptare."

*Cont cu totul completat:*
> „Totul e la zi, [Prenume]. Grila ta salarială e actualizată."

### CTA-uri

- „Evaluează primul post" (Coral solid) — cont nou
- „Continuă evaluarea" (Coral solid) — evaluare neterminată
- „Vezi grila salarială" (Indigo solid) — evaluări complete, grilă de văzut
- „Generează raport" (Indigo outline) — tot completat, poate genera raport

### Micro-copy

- Tooltip modul „În curând": „Acest modul va fi disponibil în curând. Te vom anunța."
- Tooltip notificări fără notificări: „Nicio notificare nouă"
- Badge „Activ": verde (#22C55E) pe fundal verde 10% opacity
- Badge „În curând": gri (#9CA3AF) pe fundal gri 10% opacity
- Sidebar collapse tooltip: „Restrânge meniul"

---

## C. SALES HOOKS & CURIOSITY TRIGGERS

Dashboard-ul nu e spațiu de vânzare. Dar sunt momente de „discovery":

### Hooks contextuale (în cardul de bun venit sau tooltips)

1. **„O evaluare durează cât o cafea. Efectele durează un an."** — motivează prima acțiune
2. **„Grila salarială nu e un tabel. E o conversație cu echipa ta."** — repoziționează grila
3. **„Fiecare post evaluat e un pas spre conformitate."** — conectează acțiunea cu obiectivul
4. **„Rezultatele evaluării nu sunt note. Sunt coordonate pe o hartă."** — destigmatizează
5. **„Ai terminat evaluarea. Acum hai să vedem ce spune grila."** — tranziție naturală

### Anti-patterns dashboard

| NU punem | De ce |
|----------|-------|
| „Ai evaluat doar 3 din 20 de posturi!" (bară de progres roșie) | Pressure tactic. În schimb: bară de progres neutră + text „3 din 20 posturi evaluate" fără judecată |
| Notificări push cu „Nu uita să..." | Hărțuire. Notificările sunt doar pentru evenimente reale (evaluare completată, raport generat) |
| Gamification (puncte, trofee, streak-uri) | Trivializează un proces serios. Dashboard-ul e un instrument de lucru, nu un joc |
| Pop-up upsell „Vrei modulul Premium?" | Nu la prima vizită. Modulele indisponibile sunt marcate „În curând", fără presiune |

---

## D. ELEMENTE VIZUALE (pentru Adobe)

### Ilustrații dashboard

**Card bun venit (cont nou):**
- O formă abstractă compusă din 3-4 cercuri concentrice (evocând evaluarea/stratificarea), Coral-to-Indigo gradient
- Stil: simplu, lin, minimal — nu distrage de la CTA
- Dimensiune: 120x120px

**Empty state — evaluare posturi:**
- Un cerc punctat cu o săgeată ușoară spre interior (sugestie: „adaugă ceva aici")
- Text: „Niciun post evaluat încă"
- Stil: line art, Indigo 30% opacity, dimensiune 80x80px

**Empty state — grilă salarială:**
- O grilă 3x3 cu celule goale, una dintre ele are un cerc mic Coral
- Text: „Grila se construiește pe măsură ce evaluezi posturi"
- Stil: line art, aceleași principii

### Iconografie module (48px, set custom)

1. **Evaluare posturi:** Două cercuri suprapuse cu un check subtil
2. **Grilă salarială:** Bare verticale de înălțimi diferite, aliniate pe o bază
3. **Raport conformitate:** Document cu un scut rotunjit mic
4. **Benchmark:** Două bare alăturate (comparație)
5. **Analiză echitate:** Balanță stilizată (forme geometrice, nu balanță clasică)
6. **Suport AI:** Bulă conversație cu 3 puncte

### Animații dashboard

1. **Carduri la prima încărcare:** Staggered fade-in (fiecare card cu 0.1s delay față de precedentul)
2. **Bară progres (dacă există):** Animație de umplere de la 0 la valoare, 0.8s ease-out
3. **Buton AI chat:** Pulsație subtilă (shadow Indigo se extinde/contractă, 2s cycle) — se oprește după 10 secunde
4. **Sidebar collapse:** Animație 0.2s ease, content-ul principal se extinde fluid
5. **Status badge:** Micro-fade-in la prima apariție

### Gradienți

- Sidebar: linear-gradient(180deg, #FAFAFE 0%, #F3F2FF 100%) — extrem de subtil
- Card bun venit: border-left 3px gradient Coral-to-Indigo (singurul element „decorativ" puternic)

---

## E. AMPLASAREA BUTOANELOR ȘI ACȚIUNILOR

### Acțiuni primare per context

**Cont nou:** „Evaluează primul post" — Coral solid, în cardul de bun venit, centrat sau stânga
**Evaluare în curs:** „Continuă evaluarea" — Coral solid, same position
**Post-evaluare:** „Vezi rezultatele" — Indigo solid

### Butoane secundare

- „Descoperă platforma mai întâi" — text link Indigo, sub butonul primar
- „Adaugă un post" — buton mic Indigo outline, în modulul de evaluare
- „Exportă" — icon download + text, Indigo ghost, în rapoarte

### Butonul AI Chat

- Flotant, dreapta-jos, 56px cerc Indigo, icon alb
- Z-index: deasupra conținutului, sub modale
- Shadow: 0 4px 16px rgba(79,70,229,0.3)
- Hover: scală 1.05, shadow mai pronunțată
- Active: scală 0.95
- Mobile: aceeași poziție, dar 48px

### Sidebar — itemi

- Click area: full-width, 44px înălțime (touch-friendly)
- Active state: bară Coral stânga 3px, fundal Indigo 8%, text Indigo SemiBold
- Hover: fundal Indigo 4%
- Disabled (module indisponibile): text gri 50%, icon gri, click → tooltip „În curând"

---

## F. TIPURI DE TEXT ȘI REGISTRU

### Sistem tipografic dashboard

**Titlu pagină:**
- Inter SemiBold, 28px desktop / 22px mobile
- Culoare: #1E1B4B

**Titlu secțiune:**
- Inter SemiBold, 20px
- Culoare: #1E1B4B

**Titlu card modul:**
- Inter SemiBold, 18px
- Culoare: #1E1B4B

**Descriere modul:**
- Inter Regular, 14px, line-height 1.5
- Culoare: #6B7280 (gri neutru)
- Max 2 rânduri (truncat cu „..." dacă e mai lung)

**Cifre sumar:**
- Inter SemiBold, 28px
- Culoare: Indigo #4F46E5

**Label sumar:**
- Inter Regular, 13px
- Culoare: #9CA3AF

**Breadcrumb:**
- Inter Regular, 13px
- Culoare: #9CA3AF, link activ #4F46E5

### Registru

- **Eficient.** Propoziții scurte. Fără flori. Fără motivational.
- **Cald fără a fi familiar.** „Bine ai venit, Maria" — nu „Hei, Maria!" și nu „Bun venit, doamnă Maria."
- **Orientat acțiune.** Fiecare text din dashboard trebuie să răspundă la: „Și ce fac acum?"

---

## G. EXPERIENȚA COMPLETĂ

### Scenariul 1: Maria, HR Director, primul login

**Momentul 0: Pagina de login**
- 2 câmpuri: Email + Parolă
- Buton: „Intră în cont" (Indigo solid)
- Sub buton: „Nu ai cont? Creează unul gratuit" (text link Coral)
- Sub asta: „Ai uitat parola?" (text link gri)
- Stânga ecranului (50%): formularul
- Dreapta ecranului (50%): ilustrația din constelația hero + un citat scurt: „Evaluăm posturi. Construim echitate."

**Momentul 1: Prima vedere a dashboard-ului**
- Sidebar e deschisă, primul item („Acasă") activ
- Cardul de bun venit e vizibil, cu CTA Coral
- Maria citește: „Hai să începem." — simte: „OK, simplu."
- Vede grila de module. Scanează badge-urile: „Activ", „Activ", „În curând"...
- Observă butonul AI chat în colț — nu apasă încă.

**Momentul 2: Prima acțiune**
- Click pe „Evaluează primul post" SAU pe modulul „Evaluare posturi" din grilă
- Ambele duc în același loc: pagina de evaluare
- Dacă alege „Descoperă platforma mai întâi": un mic tour (3 pași, overlay subtil, nu pop-up agresiv)
  - Pas 1: „Aici sunt modulele disponibile" (highlight grilă)
  - Pas 2: „Aici poți oricând cere ajutor" (highlight buton AI)
  - Pas 3: „Iar aici găsești toate setările" (highlight sidebar „Setări")
  - Buton: „Am înțeles, începe evaluarea" (Coral)

**Emoția finală: „E curat, e simplu, nu mă copleșește."**

### Scenariul 2: Andrei, CEO, sceptic, explorează

**Momentul 1:** Intră în dashboard. Ignoră cardul de bun venit. Merge direct la „Raport conformitate" din grilă.
**Momentul 2:** Vede că raportul necesită evaluări complete. Citește: „Pentru a genera raportul de conformitate, evaluează cel puțin 3 posturi."
**Momentul 3:** Se întoarce la „Evaluare posturi". Începe una. Vede că e ghidat pas cu pas. Nu e abandonat.
**Momentul 4:** Deschide panoul AI. Întreabă: „Ce cerințe are Directiva?" Primește un răspuns clar.
**Momentul 5:** Termină evaluarea. Vede rezultatul. Se gândește: „OK, asta chiar funcționează."

**Emoția finală: „Efectiv. Fără prostii."**

---

---

# ═══════════════════════════════════════════════════════════════
# PAGINA 3: PORTALUL B2C (personal — /personal)
# ═══════════════════════════════════════════════════════════════

---

## A. STRUCTURA PAGINII (wireframe descriptiv)

### Filozofia designului B2C

B2C-ul e fundamental diferit de B2B. Aici nu e vorba de eficiență, ci de **descoperire**. Ritmul e mai lent, spațiul e mai generos, aerul e mai mult. Persoana care ajunge aici caută ceva despre sine — și merită un spațiu care o respectă.

Versiunea „În curând" trebuie să fie mai mult decât un placeholder. Trebuie să fie o **promisiune vizuală** — suficient de frumoasă încât persoana să vrea să revină.

### Desktop (1440px referință) — Versiunea „În curând"

**ZONA 1 — HEADER MINIMAL (5% viewport)**
- Logo spirală + „JobGrade" + navigare minimală: „Acasă" | „Înapoi la jobgrade.ro"
- Fără sidebar. Pagina B2C e un spațiu deschis, nu o aplicație.

**ZONA 2 — HERO CONTEMPLATIV (80% din primul viewport)**
- Centru absolut al ecranului: spirala brand, mare (300px), cu animație lentă de rotație (60s per rotație completă, imperceptibilă dacă nu stai), gradient Coral-to-Indigo
- Sub spirală (centrat):
  - Heading (Inter SemiBold, 44px, Indigo): „Cine alegi să fii?"
  - Paragraf (Inter Regular, 20px, gri cald, max 480px centrat): textul filozofic B2C
  - Un separator vizual: o linie orizontală scurtă (40px), Coral, centrată, cu 32px sus-jos
  - Sub separator: mesajul „În curând"
- Fundal: gradient radial extrem de subtil — centrul e ușor mai cald, marginile ușor mai reci. Ca și cum spirala emite căldură.

**ZONA 3 — CE VA FI AICI (30% viewport, sub hero)**
- Heading: „Ce pregătim pentru tine"
- 3 carduri orizontale (preview-uri ale modulelor viitoare):
  - Card 1: „Profilul tău profesional" — „O hartă a punctelor tale forte, nu doar o listă de skill-uri."
  - Card 2: „Explorare vocație" — „Ce rol ți se potrivește? Răspunsul nu e unul singur."
  - Card 3: „Dezvoltare ghidată" — „Un drum de creștere construit pe cine ești, nu pe ce se cere."
- Cardurile au opacity 0.85, un efect de glass/blur subtil, sugestia de „viitor, dar real"
- Fiecare card: icon abstract (linie, formă organică) + titlu + o propoziție
- NU au butoane de acțiune. Sunt preview-uri.

**ZONA 4 — LISTA DE AȘTEPTARE (20% viewport)**
- Heading centrat: „Fii printre primii"
- Paragraf: „Lasă-ne adresa de email și te vom anunța când portalul personal e gata. Fără spam — doar o singură notificare."
- Input email (centrat, 400px max, border Indigo subtil, border-radius 10px)
- Placeholder: „adresa@email.ro"
- Buton: „Anunță-mă" (Coral solid, lângă input pe desktop, sub input pe mobile)
- Sub buton: „Datele tale sunt în siguranță. Citește politica de confidențialitate." (13px, gri, link)

**ZONA 5 — FOOTER (identic cu homepage)**

### Mobile (375px referință)

- Spirala: se micșorează la 200px, rămâne centrată
- Heading: 32px
- Cardurile preview: coloană unică, stivuite
- Input email: full-width cu 16px padding lateral
- Butonul „Anunță-mă": full-width, sub input, 56px

### Versiunea POST-LANSARE (wireframe pregătitor)

Când B2C devine funcțional, structura se transformă:

**Layout: Full-width, fără sidebar**
- Navigare top: „Profilul meu" | „Explorare" | „Dezvoltare" | „Setări"
- Conținutul: zone ample, cu mult spațiu alb
- Elementele vizuale: mai organice decât B2B (curbe, forme fluide vs. dreptunghiuri)
- Tonul: mai cald, mai personal, mai contemplativ
- Culorile: Coral mai prezent decât în B2B (B2B = Indigo dominant, B2C = Coral dominant)

---

## B. CATEGORII DE CONȚINUT

### Text de filozofie (dominant pe B2C)

**Heading hero:**
> „Cine alegi să fii?"

Alternativă:
> „Tu ești mai mult decât un CV."

Alternativă (legată de slogan):
> „Începe cu cine alegi să fii."

**Paragraf sub heading:**
> „Portalul personal JobGrade e un spațiu al tău. Un loc în care să explorezi ce te face unic profesional — nu pentru un angajator, ci pentru tine. Să înțelegi ce ți se potrivește și să crești în direcția ta."

**Mesaj „În curând":**
> „Construim ceva cu grijă. Portalul personal va fi gata în curând."

NU spunem:
- „Coming soon!" (englezisme inutile)
- „Lucrăm din greu!" (dramatizare)
- „Revino în curând!" (comandă)

### Text carduri preview

**Card 1 — Profilul tău profesional:**
> „O hartă a punctelor tale forte. Nu o listă — o structură. Nu pentru alții — pentru tine."

**Card 2 — Explorare vocație:**
> „Ce rol ți se potrivește cu adevărat? Poate nu e unul singur. Poate e o combinație pe care n-ai explorat-o încă."

**Card 3 — Dezvoltare ghidată:**
> „Un drum de creștere care pornește de la cine ești, nu de la ce se cere pe piață. Cu pași mici, măsurabili, ai tăi."

### CTA

- „Anunță-mă" — singurul CTA pe pagină. Coral solid. Simplu.
- NU „Înscrie-te" (prea formal), NU „Vreau acces" (prea agresiv), NU „Join the waitlist" (englezism)

### Micro-copy

- Input email placeholder: „adresa@email.ro"
- După trimitere (success state): „Gata! Te vom anunța. ✉" (singurul loc unde un emoji e acceptabil — și doar dacă designerul decide)
- Alternativă fără emoji: „Gata. Vei primi un singur email când portalul e gata."
- Error (email invalid): „Hmm, adresa nu pare completă. Verifică și încearcă din nou."

---

## C. SALES HOOKS & CURIOSITY TRIGGERS

### Hooks B2C (profunzime, nu vânzare)

1. **„Ultimul test de carieră pe care l-ai făcut ți-a spus ceva util? Noi vrem să facem diferit."**
   — Recunoaștere + promisiune.

2. **„Nu e un test. E o conversație cu tine."**
   — Destigmatizează instrumentul.

3. **„Ce-ar fi dacă ai avea o hartă a ta — nu trasată de alții, ci descoperită de tine?"**
   — Empowerment, nu dependență.

4. **„Vocația nu se găsește. Se construiește. Și se începe cu o întrebare sinceră."**
   — Filozofic, dar accesibil.

5. **„Profilul tău profesional nu e un rezultat. E un început."**
   — Repoziționează așteptarea.

### Curiosity triggers B2C

- „Ce-ar spune punctele tale forte despre tine — dacă le-ai lăsa să vorbească?"
- „Știi ce te face unic? Nu la nivel de CV. La nivel de structură."
- „Dacă ți-ar fi permis să fii exact cine ești la locul de muncă — ce s-ar schimba?"

### Storytelling element (pentru pagina completă, nu „În curând")

> „Am întâlnit oameni care știau ce nu le place, dar nu știau ce le-ar plăcea. Am întâlnit oameni care știau ce vor, dar nu și de ce. Portalul ăsta e pentru toți — pentru cei cu întrebări, nu doar pentru cei cu răspunsuri."

### Anti-patterns B2C

| NU punem | De ce |
|----------|-------|
| „Descoperă-ți potențialul ASCUNS" | Manipulare emoțională. „Ascuns" implică că ceva e greșit. |
| „Ești pe drumul greșit?" | Fear-based. Nimeni nu e pe drumul „greșit". |
| „10.000 de oameni au făcut deja testul" | Presiune socială. Și probabil nu e adevărat la început. |
| Quiz rapid cu rezultat vag | Trivializează procesul. JobGrade B2C e profund, nu un BuzzFeed quiz. |
| Comparații cu alți useri | Nu comparăm oameni. Fiecare profil e unic. |

---

## D. ELEMENTE VIZUALE (pentru Adobe)

### Spirala hero (element central)

- Spirala Arhimedeană din logo, dar MARE (300px desktop)
- Gradient: Coral (#E85D43) de la exterior → Indigo (#4F46E5) spre centru
- Animație: rotație completă lentă (60s), imperceptibilă la privire directă, dar simțită subliminal
- Efect suplimentar: la hover (pe desktop) — spirala accelerează ușor (30s) și revine la normal când mouse-ul iese
- Opțional: particule subtile (dot-uri de 2px, Coral și Indigo, opacity 20%) care orbitează în jurul spiralei, pe traiectorii circulare diferite. Viteze diferite. Efect cosmic, subtil.

### Ilustrații carduri preview

**Card 1 — Profilul:**
- O amprentă stilizată (nu amprentă digitală literală, ci forme concentrice unice, asimetrice)
- Linii fine, gradient Coral-to-Indigo
- Sugerează unicitate

**Card 2 — Explorare:**
- O busolă stilizată, dar cu mai multe ace (nu unul) — sugerând direcții multiple, toate valide
- Line art, Coral dominant

**Card 3 — Dezvoltare:**
- O spirală mică care se desfășoară într-o linie ascendentă (nu escalator, ci cale organică)
- Line art, Indigo dominant

### Animații B2C

1. **Spirala hero:** Rotație lentă continuă (CSS animation, infinite, linear)
2. **Particule (dacă se adoptă):** Orbite CSS cu keyframes individuali, viteze 20-40s per rotație, delay-uri diferite
3. **Carduri preview la scroll:** Fade-in + ușor scale (de la 0.95 la 1.0), staggered cu 0.15s delay
4. **Input email la focus:** Border se colorează gradient Coral-to-Indigo (tranziție 0.3s)
5. **Buton „Anunță-mă" la hover:** Fundal mai închis + shadow
6. **Success state (după submit email):** Butonul se transformă în check + text „Gata!", Coral → verde (#22C55E), 0.5s

### Gradienți B2C

- **Fundal hero:** radial-gradient(circle at 50% 40%, rgba(232,93,67,0.03) 0%, rgba(79,70,229,0.02) 50%, transparent 70%) — abia vizibil
- **Carduri preview:** fundal alb cu backdrop-filter: blur(10px) + border 1px rgba(255,255,255,0.5) (glassmorphism dacă sunt pe fundal cu gradient)

### Video concept (pentru viitor, nu pentru „În curând")

**Titlu: „Din interior spre exterior"**
- Durată: 30 secunde
- Concept: camera pornește din centrul spiralei (abstract, forme de culoare, blur) și se depărtează lent, dezvăluind forme din ce în ce mai clare, până la o imagine de claritate completă (sugerând auto-descoperire)
- Fără voice-over. Doar muzică ambientală (pian + sintetizator subtil, in-house sau licențiat)
- Final: logo + „Cine alegi să fii?"
- Utilizare: background video autoplay (muted) pe versiunea completă a B2C, sau ca intro la prima vizită

---

## E. AMPLASAREA BUTOANELOR ȘI ACȚIUNILOR

### Versiunea „În curând" — un singur CTA

**„Anunță-mă"**
- Tip: Coral solid
- Dimensiune: padding 14px 32px, border-radius 10px
- Poziție: lângă input pe desktop (dreapta), sub input pe mobile
- Hover: #D4482E, shadow
- Active: #C0401F, scală 0.98
- Disabled (când inputul e gol): opacity 0.5, cursor not-allowed
- Loading (la submit): text se înlocuiește cu un spinner mic (cerc animat, 16px, alb)
- Success: butonul devine verde (#22C55E), text „Gata!", apoi revine la starea inițială după 3s

**Link „Înapoi la jobgrade.ro"**
- Header, tip text link
- Inter Medium, 14px, Indigo
- Hover: underline

**Link „Politica de confidențialitate"**
- Sub input, Inter Regular, 13px, gri
- Hover: Indigo, underline

### Ierarhia vizuală B2C

1. **Spirala** — elementul central, contemplativ, ține atenția
2. **Heading** — „Cine alegi să fii?" atrage imediat după spirală
3. **Paragraf + mesaj „În curând"** — informează
4. **Carduri preview** — arată ce va fi (creează anticipare)
5. **Input + CTA** — acțiunea simplă

---

## F. TIPURI DE TEXT ȘI REGISTRU

### Sistem tipografic B2C

Identic cu homepage ca font family și weights, dar:

**Display heading:**
- 44px desktop / 32px mobile (mai mic decât homepage — mai intim)
- Line-height: 1.15
- Centrat (vs. stânga pe homepage)

**Body large:**
- 20px desktop / 17px mobile
- Centrat
- Max lățime: 480px (mai îngust — crează intimitate)

**Text carduri preview:**
- 16px, centrat în card
- Line-height: 1.5
- Max lățime: 280px per card

### Registru B2C

- **Contemplativ, dar nu pretențios.** Ca un jurnal, nu ca un tratat.
- **Persoana a II-a singular ȘI impersonal.** „Ce te face unic" (nu „Ce vă face unici" — B2C e intim).
- **Propoziții scurte, spațiere generoasă.** Fiecare propoziție e un micro-moment de reflecție.
- **Fără exclamări.** Punctul e suficient. Dacă textul e bun, nu are nevoie de „!".

---

## G. EXPERIENȚA COMPLETĂ

### Scenariul 3 (detaliat): Elena, 29 ani, caută direcție

**Cum ajunge:** De pe homepage (card B2C) sau din Google ("profil profesional descoperire").

**Secunda 1-3: Prima impresie**
- Vede spirala mare, centrată. E diferit de orice site de carieră văzut până acum.
- Simte: „Hmm, asta arată... frumos. Nu e un site de joburi."

**Secunda 3-7: Citește**
- „Cine alegi să fii?" — întrebarea o oprește. Nu e retorică. O simte.
- Citește paragraful: „un loc în care să explorezi ce te face unic profesional"
- Simte: „Da. Asta caut."

**Secunda 7-12: Descoperă că e „În curând"**
- „Construim ceva cu grijă. Va fi gata în curând."
- Dezamăgire ușoară. Dar nu frustrantă — tonul e respectuos.
- Scrollează să vadă ce va fi.

**Secunda 12-25: Cardurile preview**
- „O hartă a punctelor tale forte" — da.
- „Ce rol ți se potrivește? Poate nu e unul singur." — relevantă, recunoaștere.
- „Un drum de creștere care pornește de la cine ești" — asta e ceea ce lipsește pe piață.
- Simte: „Vreau asta. Când e gata?"

**Secunda 25-35: Lasă emailul**
- Vede inputul. Completează. Click „Anunță-mă".
- Mesaj: „Gata. Vei primi un singur email când portalul e gata."
- Simte: „Bun, nu o să mă bombardeze."

**Acțiune finală:** Închide pagina. Dar o memorează. Verifică periodic. Povestește unei prietene.

**Emoția finală: „Cineva construiește ceva serios. Și am fost invitată."**

---

---

# ═══════════════════════════════════════════════════════════════
# ANEXE TRANSVERSALE
# ═══════════════════════════════════════════════════════════════

---

## ANEXA 1: PALETĂ CROMATICĂ COMPLETĂ

| Culoare | Hex | Utilizare |
|---------|-----|-----------|
| Coral (primar) | #E85D43 | CTA-uri primare, accente, spirală exterior |
| Coral hover | #D4482E | Hover state butoane coral |
| Coral active | #C0401F | Active/pressed state |
| Coral 10% | rgba(232,93,67,0.1) | Fundal bule chat user, accent subtil |
| Indigo (primar) | #4F46E5 | Elemente UI, butoane secundare, spirală interior |
| Indigo închis | #1E1B4B | Text heading, sidebar active, footer |
| Indigo hover | #4338CA | Hover state butoane indigo |
| Indigo 8% | rgba(79,70,229,0.08) | Fundal sidebar active, borders |
| Indigo 4% | rgba(79,70,229,0.04) | Hover backgrounds |
| Lavandă | #F3F2FF | Fundal bule chat AI, cards subtile |
| Lavandă deschis | #F8F7FF | Fundal sidebar, gradient hero |
| Alb cald | #FEFDFB | Fundal hero top |
| Crem | #FBF9F7 | Fundal secțiuni alternate |
| Gri cald | #4A4458 | Body text |
| Gri mediu | #6B7280 | Descrieri secundare |
| Gri deschis | #8A8494 | Labels, micro-copy, breadcrumbs |
| Gri pal | #9CA3AF | Placeholder, disabled text |
| Verde succes | #22C55E | Badge „Activ", success states |
| Alb | #FFFFFF | Fundal carduri, text pe fundal închis |

---

## ANEXA 2: SPACING SYSTEM (bazat pe 8px grid)

| Token | Valoare | Utilizare |
|-------|---------|-----------|
| space-1 | 4px | Între icon și text mic |
| space-2 | 8px | Între elemente foarte apropiate |
| space-3 | 12px | Gap între butoane mobile |
| space-4 | 16px | Padding butoane, gap între elemente |
| space-5 | 24px | Padding carduri, gap între secțiuni mici |
| space-6 | 32px | Gap între carduri, padding secțiuni |
| space-8 | 48px | Spațiu între secțiuni majore |
| space-10 | 64px | Header height, separări mari |
| space-12 | 80px | Padding secțiuni majore |
| space-16 | 120px | Separări între zone vizuale (hero → content) |

---

## ANEXA 3: BREAKPOINTS

| Breakpoint | Lățime | Comportament |
|------------|--------|-------------|
| Mobile | < 640px | Coloană unică, butoane full-width, hamburger menu |
| Tablet | 640-1024px | 2 coloane, sidebar colapsată, adaptări intermediare |
| Desktop | 1024-1440px | Layout complet, sidebar deschisă |
| Wide | > 1440px | Conținut centrat la max 1440px, fundal extins |

---

## ANEXA 4: ACCESIBILITATE

- **Contrast ratio:** Toate combinațiile text/fundal respectă WCAG 2.1 AA (minim 4.5:1 pentru text normal, 3:1 pentru text mare)
- **Focus states:** Toate elementele interactive au outline vizibil la focus (2px solid Indigo, 2px offset)
- **Alt text:** Fiecare ilustrație va avea alt text descriptiv
- **Keyboard navigation:** Tab order logic, skip-to-content link ascuns dar accesibil
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` — toate animațiile se dezactivează
- **Screen reader:** Heading-urile urmează ierarhia H1→H2→H3 strict. ARIA labels pe butoane iconice.
- **Dimensiune minimă touch target:** 44x44px pe mobile (WCAG 2.5.5)

---

## ANEXA 5: PERFORMANȚĂ

- **LCP (Largest Contentful Paint):** Sub 2.5 secunde. Hero-ul se încarcă prioritar. Ilustrațiile sunt SVG inline (nu imagini externe).
- **CLS (Cumulative Layout Shift):** Sub 0.1. Toate dimensiunile sunt definite. Font-urile au `font-display: swap` cu fallback metric-compatible.
- **FID (First Input Delay):** Sub 100ms. JavaScript minim pe prima încărcare.
- **Imagini:** SVG unde posibil. PNG/WebP pentru fotografii (când vor fi), cu `loading="lazy"` sub fold.
- **Fonturi:** Inter subset doar cu caracterele necesare (latin + diacritice românești). Preload pe heading weight.

---

## ANEXA 6: CHECKLIST FINAL PENTRU DESIGNER

Înainte de livrare, verifică:

- [ ] Logo-ul spirală se vede clar la 28px (sidebar) și la 300px (B2C hero)
- [ ] Toate textele au diacritice complete (ă, â, î, ș, ț)
- [ ] Niciun text nu conține cuvintele: „primul", „unic", „revoluționar", „disruptiv"
- [ ] Niciun element nu folosește roșu (red) ca semnalizare de urgență/pericol
- [ ] Niciun pop-up nu apare fără acțiunea utilizatorului
- [ ] Butoanele au toate cele 4 stări: default, hover, active, focus
- [ ] Empty states au ilustrație + text + CTA
- [ ] Fiecare pagină funcționează fără JavaScript (conținutul e vizibil)
- [ ] Mobile-first: fiecare element a fost gândit pentru 375px mai întâi
- [ ] Tonul e consistent: conversațional, respectuos, la obiect
- [ ] Niciun element nu menționează: CÂMP, Hawkins, Hermann, Umbra, agenți, layer-uri, metodologie internă
- [ ] Nicio imagine stock cu oameni în costume la birou

---

Acest brief conține tot ce un designer are nevoie pentru a implementa cele 3 pagini. Fiecare decizie vizuală, de conținut și de interacțiune este ancorată în identitatea de brand, în calibrarea culturală pentru piața românească și în principiile de eleganță stabilite.

**Întrebarea centrală la care fiecare pixel trebuie să răspundă:**

*„Dacă un HR Director deschide jobgrade.ro pentru prima dată — simte că a ajuns acasă?"*

Dacă da, designul e corect.

---

*Document generat de Departamentul Comercial JobGrade — 1 aprilie 2026*
*CCO + DMA + DVB2B + CSM + REVOPS + PCA cu suport CMA + CWA + MKA + ACA*