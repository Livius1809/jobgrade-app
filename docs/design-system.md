# DESIGN SYSTEM — JobGrade Portal
## Referință permanentă pentru consistență vizuală

**Data:** 23.04.2026
**Extras din:** cod sursă implementat
**Obligatoriu:** Orice componentă nouă TREBUIE să respecte aceste pattern-uri

---

## 1. LAYOUT & SPACING

### Container principal
- `max-w-4xl mx-auto`
- Gap vertical între secțiuni: `style={{ display: "flex", flexDirection: "column", gap: "32px" }}`

### Secțiuni / Carduri
- Padding standard: `style={{ padding: "28px" }}`
- Border radius: `rounded-2xl`
- Border: `border border-slate-200`
- Background: `bg-white` (neutru) sau gradient per secțiune

### Separatoare verticale
**REGULĂ:** Se folosesc `div` cu `style={{ height: "Xpx" }}` — NU Tailwind `mb-X` / `mt-X`

Valori standard (multipli de 4):
- 4px — între label și valoare
- 8px — între elemente mici
- 12px — între câmpuri formular
- 16px — între grupuri de conținut
- 20px — între secțiuni interne
- 24px — între blocuri majore
- 32px — între secțiuni de nivel 1

---

## 2. PANOURI LATERALE (pattern portal)

```tsx
createPortal(
  <div
    style={{
      borderWidth: "3px",
      top: "100px",
      left: `${panelLeft}px`,
      right: "24px",
      maxHeight: "calc(100vh - 130px)",
      padding: "28px"
    }}
    className="fixed rounded-2xl border-[color]-400 bg-[color]-50 overflow-y-auto shadow-xl z-40"
  >
    {/* Header */}
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-block bg-indigo-100 text-indigo-700">
            {badge}
          </span>
        </div>
      </div>
      <button className="text-[color]-700 hover:opacity-70 text-xl font-bold">✕</button>
    </div>
    <div style={{ height: "20px" }} />
    {/* Conținut */}
  </div>,
  document.body
)
```

### Reguli panouri:
- **Un singur panou activ** la un moment dat (activePanel state)
- Deschiderea unui panou închide automat pe cel precedent
- `panelLeft` calculat din `sectionRef.current.getBoundingClientRect().right + 24`
- Border 3px cu culoarea secțiunii
- Background `[color]-50`
- Z-index: `z-40`

---

## 3. CULORI PER CONTEXT

### Secțiuni principale
| Context | Background | Border | Text accent |
|---------|-----------|--------|-------------|
| Profil companie | `bg-white` / `bg-emerald-50` (done) | `border-indigo-200` / `border-emerald-200` | `text-indigo-700` |
| Pachete servicii | `bg-gradient-to-br from-indigo-50 to-violet-50` | `border-indigo-100` | `text-indigo-700` |
| Date intrare client | `bg-amber-50` | `border-amber-200` | `text-amber-700` |
| Evaluare | `bg-white` → `bg-indigo-50` → `bg-emerald-50` | progresiv | `text-indigo-700` |
| Rapoarte | `bg-white` → `bg-indigo-50` | `border-indigo-200` | `text-indigo-700` |

### Carduri pachete (PackageExplorer)
| Pachet | Culoare | Background | Border | Badge |
|--------|---------|-----------|--------|-------|
| 1. Ordine internă | indigo | `bg-indigo-50` | `border-indigo-400` | `bg-indigo-100 text-indigo-700` |
| 2. Conformitate | violet | `bg-violet-50` | `border-violet-400` | `bg-violet-100 text-violet-700` |
| 3. Competitivitate | fuchsia | `bg-fuchsia-50` | `border-fuchsia-400` | `bg-fuchsia-100 text-fuchsia-700` |
| 4. Dezvoltare | orange/coral | `bg-orange-50` | `border-orange-400` | `bg-orange-100 text-orange-700` |

### Status (universal)
| Status | Dot | Background | Text |
|--------|-----|-----------|------|
| Done / Success | `bg-emerald-500` | `bg-emerald-50` | `text-emerald-700` |
| Active / In progress | `bg-indigo-500` | `bg-indigo-50` | `text-indigo-700` |
| Warning | `bg-amber-400` | `bg-amber-50` | `text-amber-700` |
| Error / Critical | `bg-red-500` | `bg-red-50` | `text-red-700` |
| Inactive / Locked | `bg-slate-200` | `bg-slate-50` | `text-slate-400` + `opacity-60` |

### Notificări (OwnerInbox)
| Tip | Background | Border | Text |
|-----|-----------|--------|------|
| INFORMATION | `bg-blue-50` | `border-blue-200` | `text-blue-700` |
| ACCESS | `bg-purple-50` | `border-purple-200` | `text-purple-700` |
| DECISION | `bg-red-50` | `border-red-200` | `text-red-700` |
| ACTION | `bg-amber-50` | `border-amber-200` | `text-amber-700` |
| VALIDATION | `bg-emerald-50` | `border-emerald-200` | `text-emerald-700` |

---

## 4. TIPOGRAFIE

| Nivel | Clasa | Unde |
|-------|-------|------|
| H1 (pagină) | `text-2xl font-bold text-slate-900` | Titlu pagină |
| H2 (secțiune) | `text-lg font-bold text-slate-900` | Titlu secțiune |
| H3 (card) | `text-base font-bold text-slate-900` | Titlu card/subsecțiune |
| H4 (sub-card) | `text-sm font-bold text-slate-800` | Titlu tabel/grup |
| Body | `text-sm text-slate-500` sau `text-xs text-slate-600` | Text descriptiv |
| Label secțiune | `text-[10px] font-bold uppercase tracking-wide` | Headers secțiuni interne |
| Micro label | `text-[9px] text-slate-400` | Metadata, timestamps |
| Micro-micro | `text-[8px]` | Status subtitlu |

---

## 5. BUTOANE

### Primar
```
bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm
rounded-lg px-4 py-2 text-xs font-semibold
disabled:opacity-40
```

### Secundar
```
bg-white border border-slate-200 text-slate-600 hover:bg-slate-50
rounded-lg px-4 py-2 text-xs font-semibold
```

### Acțiune per status
- Success: `bg-emerald-600 text-white hover:bg-emerald-700`
- Success light: `bg-emerald-100 text-emerald-700 hover:bg-emerald-200`
- Warning: `bg-amber-100 text-amber-700 hover:bg-amber-200`
- Danger: `bg-red-100 text-red-700 hover:bg-red-200`

### Full-width (acțiune principală în panou)
```
w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold
hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40
```

---

## 6. FORMULARE (input client)

### Container formular
```
bg-amber-50 rounded-xl border border-amber-200 style={{ padding: "16px" }}
```

### Header formular
```
text-[10px] text-amber-700 font-bold uppercase tracking-wide
```

### Input
```
w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2
focus:ring-2 focus:ring-amber-200 bg-white
```

### Label
```
text-xs text-slate-600 font-medium
```
Separator label → input: `div style={{ height: "4px" }}`
Separator input → input: `div style={{ height: "12px" }}`

---

## 7. DRAG & DROP ZONE

```tsx
<div
  className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center
    text-center transition-colors ${
    dragOver ? "border-indigo-400 bg-indigo-50" : "border-amber-300 bg-amber-50"
  }`}
  style={{ padding: "32px" }}
>
  <span className="text-3xl">{icon}</span>
  <div style={{ height: "12px" }} />
  <p className="text-sm font-medium text-slate-700">Trageți fișierul aici</p>
  <p className="text-xs text-slate-400">sau</p>
  <div style={{ height: "8px" }} />
  <button className="px-4 py-2 rounded-lg bg-white border border-amber-300
    text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
    Alegeți fișier
  </button>
  <div style={{ height: "8px" }} />
  <p className="text-[10px] text-slate-400">{formatHint}</p>
</div>
```

---

## 8. TABEL DATE

```tsx
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table className="w-full text-xs">
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200">
        <th className="text-left py-2.5 px-3 font-semibold text-slate-500">{col}</th>
      </tr>
    </thead>
    <tbody>
      <tr className={`border-b border-slate-50 ${i % 2 ? "bg-slate-50/50" : ""}`}>
        <td className="py-2 px-3 font-medium text-slate-800">{val}</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 9. PROGRES VIZUAL

### Step circles (portal header)
```tsx
// Done
<div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">✓</div>
// Active
<div className="w-8 h-8 rounded-full bg-indigo-500 text-white ring-4 ring-indigo-100 flex items-center justify-center text-sm">{icon}</div>
// Pending
<div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm">{nr}</div>
// Connector
<div className={`flex-1 h-1 rounded ${done ? "bg-emerald-300" : "bg-slate-100"}`} />
```

### Progress bar
```tsx
<div className="h-2 bg-slate-100 rounded-full overflow-hidden">
  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
</div>
```

---

## 10. PRINCIPII DE INTERACȚIUNE

1. **Clientul muncește cât mai puțin** — AI completează, sugerează, pre-populează
2. **Tot pe aceeași pagină** — panouri laterale, nu navigare externă
3. **Un singur panou activ** — nu suprapuneri
4. **Feedback imediat** — loading states, success toasts, error inline
5. **Progres vizibil** — steps, progress bars, badge-uri status
6. **Gratuit vizibil** — badge-uri `GRATUIT` / `Inclus în pachet` pe acțiunile gratuite
7. **Cost transparent** — credite afișate înainte de consum, confirmare la tranziție
8. **Zero jargon tehnic** — tot ce vede clientul e în limbaj business/HR
9. **Responsive** — flexbox/grid adaptiv, nu breakpoints rigide

---

---

## 11. PRINCIPII EXPERIENȚĂ CLIENT (din discuții Owner)

1. **Experiență memorabilă** — clientul zâmbește când vorbește de JobGrade. Nu e "un soft", e o experiență.
2. **Storytelling** — tot ce comunicăm e POVESTE cu fir narativ, nu înlănțuire de fraze
3. **Interes crescător** — fiecare paragraf crește interesul, ca o carte pe care nu o poți lăsa din mână
4. **Bunul gust și dreapta măsură** — zero exagerări, zero superlative americane ("Perfect!", "Amazing!")
5. **Limbaj adaptat** — HR Dir = specialist, CEO = business, Consultant = tehnic
6. **Ghidaj muzeu** — arată nu descrie, duce clientul la răspuns, nu-i spune unde să caute
7. **Efecte concrete** — comportamente/trăsături = efecte concrete (performanță, relații, apreciere)
8. **Curba interesului** — fiecare interacțiune lasă clientul cu dorința de a continua
9. **Fără virgulă înainte de "și"** — regulă gramaticală română respectată peste tot
10. **Terminologie RO** — "Evaluare posturi" nu "job grading", "Clasament" nu "ranking"

### Fluxul experiență → specificații → implementare:
```
Marketing (MKA/CMA) definește experiența dorită per pagină/flow
  → COA traduce în specificații tehnice (cu design system atașat)
  → Claude Code implementează conform specificațiilor
  → QAA testează E2E
  → L2 verifică ton și limbaj
```

---

*Acest document se actualizează la fiecare pattern nou introdus.*
*COA atașează acest document la fiecare specificație de dezvoltare.*
*Marketing definește experiența, COA traduce în specificații, Claude Code implementează.*
