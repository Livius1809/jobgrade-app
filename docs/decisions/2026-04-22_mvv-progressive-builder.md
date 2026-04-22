# MVV Progressive Builder — Arhitectură

**Data:** 22.04.2026
**Decizie Owner:** Mecanismul există implementat, se activează progresiv pe niveluri.

## Principiul fundamental

La noi am pornit de sus (CÂMPUL → principii → obiective → task-uri).
La client, pornim de unde e el — de obicei de jos (posturi, salarii).
AI construiește MVV progresiv: din datele acumulate, de jos în sus.

## Lanțul complet (de sus în jos — starea ideală)

```
MISIUNE (de ce existăm)
  → VIZIUNE (unde mergem)
    → VALORI (cum ne comportăm)
      → OBIECTIVE (ce realizăm concret)
        → FIȘE DE POST (cine face ce — atribuții aliniate la valori)
          → SCORARE (6 criterii — cât de bine servește postul misiunea)
            → KPI (măsurăm performanța)
              → REMUNERARE (compensăm proporțional cu contribuția)
```

## Realitatea clientului (de jos în sus — construcție progresivă)

### Înregistrare
- **Are:** CUI + CAEN
- **MVV:** GOL — nu forțăm nimic
- **AI:** extrage CAEN, păstrează intern ca context

### Baza (Ordine internă)
- **Are:** + posturi + fișe de post
- **MVV:** IMPLICIT — AI extrage din fișe "ce face firma" fără a afișa MVV explicit
- **Intern:** draft misiune generat automat din: CAEN + titluri posturi + responsabilități
- **Client vede:** nimic despre MVV — doar evaluarea posturilor funcționează

### Nivelul 1 (Conformitate)
- **Are:** + structură salarială + pay gap
- **MVV:** EMERGENT — dacă clientul deschide câmpul, vede draft-ul pre-populat
- **AI:** rafinează misiunea din structura salarială (ce valorizează prin compensare?)
- **Client vede:** "Misiune (opțional)" pre-populat, poate edita

### Nivelul 2 (Competitivitate)  
- **Are:** + benchmark piață + poziționare
- **MVV:** SUBSTANȚIAL — AI propune viziune din poziționarea pe piață
- **AI:** "Compania se poziționează la P50-P75 pe piață → viziunea e de competitivitate"
- **Client:** începe să înțeleagă importanța MVV, editează activ

### Nivelul 3 (Dezvoltare)
- **Are:** + cultură + performanță + echipe
- **MVV:** COMPLET NECESAR — dezvoltarea se face pe baza valorilor
- **AI:** verificare coerență completă pe tot lanțul
- **DOA:** audit permanent misiune↔fișe↔evaluări↔salarii↔KPI
- **Client:** validează MVV final, devine fundament

## Schema internă

### Tabel: mvv_state (per tenant)
```
- tenantId (unique)
- maturityLevel: IMPLICIT | EMERGENT | PARTIAL | SUBSTANTIAL | COMPLETE
- missionDraft: text (generat AI)
- missionValidated: text | null (confirmat client)
- visionDraft: text
- visionValidated: text | null
- valuesDraft: string[]
- valuesValidated: string[] | null
- lastBuiltAt: timestamp
- lastBuiltFrom: string (ce date au contribuit)
- coherenceScore: 0-100 (cât de coerent e MVV cu datele)
- coherenceGaps: json[] (unde sunt inconsistențe)
```

### Rebuild automat MVV
La fiecare acțiune semnificativă (adăugare post, generare fișă, evaluare, structură salarială):
1. AI re-analizează toate datele
2. Recalculează draft MVV
3. Verifică coerență cu nivelul anterior
4. Dacă maturityLevel permite → notifică clientul

### Verificare coerență (DOA)
Per pereche de niveluri:
- Misiune ↔ CAEN: obiectul de activitate reflectat?
- Misiune ↔ Fișe de post: posturile servesc misiunea?
- Viziune ↔ Benchmark: poziționarea reflectă aspirația?
- Valori ↔ Evaluări: criteriile reflectă valorile?
- KPI ↔ Remunerare: compensarea aliniată cu performanța?

### Integrare în servicii

**Baza (evaluare posturi):**
- Evaluarea funcționează fără MVV explicit
- MVV implicit din CAEN + fișe → contextul evaluării

**Nivelul 1 (pay gap):**
- Justificările de diferențe salariale pot referi valorile companiei
- "Diferența e justificată de prioritizarea inovației (valoare declarată)"

**Nivelul 2 (benchmark):**
- Poziționarea pe piață reflectă viziunea
- "Compania se poziționează la P75 pe competențe tehnice, aliniat cu viziunea de lider tehnologic"

**Nivelul 3 (dezvoltare):**
- Planul de dezvoltare derivat din MVV
- KPI-urile reflectă valorile
- Cultura organizațională ancorată în misiune

## Implementare tehnică

### API: /api/v1/mvv/rebuild
POST — recalculează MVV din datele curente
- Citește: CAEN, fișe de post, evaluări, structură salarială, benchmark
- Returnează: draft MVV + coherenceScore + gaps

### API: /api/v1/mvv/validate
POST — clientul confirmă MVV (sau parte din el)
- Salvează: missionValidated, visionValidated, valuesValidated
- Loghează în jurnal activități

### API: /api/v1/mvv/coherence
GET — verificare coerență curentă
- Returnează: scor per pereche de niveluri + gaps detaliate

### Hook în fiecare serviciu
La fiecare acțiune semnificativă:
```typescript
await mvvRebuildIfNeeded(tenantId)
```
Verifică dacă datele noi schimbă MVV-ul → rebuild → notificare dacă e cazul
