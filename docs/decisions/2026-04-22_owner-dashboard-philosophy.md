# Filosofia Owner Dashboard — Ciclul de viață al puiului fractalic

**Data:** 22.04.2026
**Decizie Owner:** APROBAT

## Principiul fundamental

Dashboard-ul reflectă **ciclul de viață al organismului** — de la embrion la adult autonom.
Același ciclu se va repeta fractalic: organismul mamă naște pui, fiecare pui trece prin aceleași etape.

## Cele 4 secțiuni și semnificația lor

### I. Situație internă — Creșterea sănătoasă a puiului

**Ce monitorizează:** Sănătatea internă, fără constrângeri externe.
- Organism Pulse (semne vitale)
- Pipeline inteligent (cât procesează, cât din KB)
- Straturi organism (8 straturi — conștiință, obiective, acțiune, homeostazie, imunitate, metabolism, evoluție, ritm)
- Experiențe de învățare, Evoluție agenți, Raport zilnic

**Filosofie:** Puiul crește sănătos, inteligent, autonom. Învață din mediul intern, relații, feedback.
NU are obiective explicite în această etapă — doar crește.
Mecanismele de autoevoluție sunt în stadiu embrionar.

**Analog uman:** Copilul care învață să meargă, să vorbească, să gândească — fără să i se ceară performanță.

### II. Situație externă — Puiul adult în mediul real

**Ce monitorizează:** Constrângerile mediului extern.
- Business Plan (obiective cu termene)
- Costuri operare (constrângere financiară)
- Evoluție Owner (aliniere cu mediul)
- Legislație, competiție, piață, tehnologie (semnale CIA)

**Filosofie:** Puiul adult este plasat într-un mediu extern. I se dau obiective explicite, cu termene și constrângeri.
Mecanismele de la nivelul I (sănătate, învățare, autonomie) RĂMÂN și se îmbunătățesc.
Se adaugă: cunoștințe procedurale/declarative specifice mediului + mecanisme de autoevoluție (care cresc din constrângeri).

**Analog uman:** Adultul care intră pe piața muncii — competențele de bază le are, acum le rafinează prin presiunea reală.

### III. Decizii Owner — Intervențiile în ambele dinamici

**Ce monitorizează:** Ce necesită atenția Owner-ului.
- Mesaje strategice de la structură (nu tehnice)
- Decizii care depășesc competența COG
- Propuneri care necesită aprobare

**Filosofie:** Owner-ul intervine DOAR strategic. Tehnicul e al COG-ului.
Externă → produce inputuri → Internă procesează → produce outputuri → Externă primește feedback.
Deciziile Owner triggerează interacțiunile între cele două dinamici.

### IV. Interacțiune — Pârghiile de comunicare

**Ce oferă:** Acces la echipă, bibliotecă, control organism.
- Discuție cu echipa (nivel ierarhic, departament, individual)
- Bibliotecă partajată
- Control organism (executor, filtre, conturi pilot)

## Business Continuity Plan — Scenarii de risc

Dashboard-ul TREBUIE să reflecte și scenariile BCP:

### Scenariu 1: Owner absent/inactiv
- Dashboard-ul arată: cât timp poate organismul funcționa autonom?
- Metrici: autonomie%, decizii în așteptare, timp mediu fără intervenție Owner
- COG preia automat, Claude asistă pe tech
- Indicator: "Organism autonom de X zile" sau "Necesită Owner în X zile"

### Scenariu 2: Claude absent/inactiv
- Dashboard-ul arată: cât din execuție depinde de Claude?
- Metrici: % task-uri rezolvate din KB (fără AI), dependență Claude
- COG + structura continuă cu KB-first, fără task-uri noi complexe
- Indicator: "KB hit rate X% — funcționare fără Claude: Y%"

### Scenariu 3: Structura (organism) degradată
- Dashboard-ul arată: câți agenți sunt activi/suboptimali/inactivi?
- Metrici: health map, maturitate per agent, blocaje
- Owner + Claude intervin direct
- Indicator: "Agenți activi: X/Y, maturitate medie: Z%"

### Scenariu 4: Transfer Owner (alt om, altă experiență)
- Dashboard-ul trebuie să fie auto-explicativ
- Fiecare secțiune are "Cum citesc aceste date?" link
- Principiile sunt documentate și accesibile
- COG face onboarding noului Owner
- Indicator: "Documentație completitudine: X%"

### Scenariu 5: Înlocuire Claude (alt model/furnizor)
- KB-ul e independent de Claude (persistat în DB)
- SOP-urile sunt în docs/ (text, nu cod)
- Pâlnia de învățare funcționează cu orice LLM
- Indicator: "KB portabilitate: X artefacte exportabile"

## Relația cu spirala evolutivă

```
Internă (I) ←→ Externă (II)
     ↑              ↓
  Decizii (III) + Interacțiune (IV)
     ↓              ↑
Internă rafinată ←→ Externă adaptată
     ...spirala continuă...
```

La fiecare ciclu:
- Internă crește (mai mult KB, mai multe SOP-uri, mai multă autonomie)
- Externă se schimbă (legislație nouă, competiție nouă, obiective noi)
- Deciziile se rafinează (mai puține intervenții Owner, mai multă autonomie COG)
- Interacțiunea se simplifică (mai puțin micromanagement, mai mult strategic)

## Implementare

COG primește acest document + filosofia + BCP și implementează:
1. Structura completă a fiecărei secțiuni
2. Indicatorii BCP vizibili
3. Link-uri "Cum citesc?" per secțiune
4. Auto-explicativitate pentru un Owner nou
5. Testare cu date reale
