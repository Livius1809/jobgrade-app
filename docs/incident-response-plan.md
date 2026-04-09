# Plan de Răspuns la Incidente — JobGrade

**Versiune:** 1.0  
**Data:** 2026-04-08  
**Responsabil:** Owner (Liviu)

---

## 1. Niveluri de Severitate

| Severitate | Descriere | Exemple |
|------------|-----------|---------|
| **SEV1 — Platforma indisponibilă** | Serviciul principal este complet nefuncțional | Server down, baza de date inaccesibilă, certificat SSL expirat |
| **SEV2 — Funcționalitate critică defectă** | O funcționalitate esențială nu funcționează, dar platforma e accesibilă | Evaluarea posturilor nu se salvează, autentificarea eșuează, rapoartele nu se generează |
| **SEV3 — Performanță degradată** | Platforma funcționează dar cu probleme vizibile | Timpi de răspuns > 5s, erori intermitente, funcționalități secundare nefuncționale |
| **SEV4 — Cosmetic / Minor** | Probleme vizuale sau de experiență utilizator | Alinieri greșite, texte trunchiate, animații nefuncționale |

---

## 2. Detecție

### Metode automate
- **Healthcheck endpoint** (`/api/health`): verificare la fiecare 60 secunde
- **FLUX-041** (n8n bridge): monitorizare continuă stare servicii
- **Agenți AI** (COG, COA): detectează anomalii în loguri și metrici
- **Vercel Analytics**: monitorizare erori în producție (Web Vitals, erori JS)

### Metode manuale
- Raportare de la clienți via email (contact@jobgrade.ro)
- Verificare manuală Owner (dashboard zilnic)
- Alertă ntfy.sh/jobgrade-owner-liviu-2026

---

## 3. Timp de Răspuns și Acțiuni

### SEV1 — Platforma indisponibilă
- **Detectare:** automată (healthcheck + ntfy instant)
- **Timp răspuns:** < 15 minute
- **Cine acționează:** Owner (Liviu)
- **Comunicare:** notificare clienți activi pe email în maxim 30 minute
- **Rezolvare țintă:** < 1 oră
- **Acțiuni:**
  1. Verificare status Vercel (dashboard + `vercel logs`)
  2. Verificare Neon DB (status, conexiuni, stocare)
  3. Verificare Keycloak (autentificare)
  4. Dacă nu se poate rezolva: activare pagină de mentenanță
  5. Rollback la deployment anterior dacă cauza e un deploy recent

### SEV2 — Funcționalitate critică defectă
- **Detectare:** automată (loguri erori) + raportare utilizatori
- **Timp răspuns:** < 1 oră (în orele de lucru)
- **Cine acționează:** Owner
- **Comunicare:** notificare clienților afectați pe email
- **Rezolvare țintă:** < 4 ore
- **Acțiuni:**
  1. Identificare cauză în loguri
  2. Izolare funcționalitate afectată (feature flag dacă e posibil)
  3. Fix + deploy
  4. Verificare post-deploy

### SEV3 — Performanță degradată
- **Detectare:** metrici + raportare utilizatori
- **Timp răspuns:** < 4 ore (în orele de lucru)
- **Cine acționează:** Owner
- **Comunicare:** doar dacă impactul persistă > 24h
- **Rezolvare țintă:** < 24 ore
- **Acțiuni:**
  1. Analiză metrici de performanță
  2. Identificare bottleneck
  3. Optimizare sau scalare

### SEV4 — Cosmetic / Minor
- **Detectare:** raportare utilizatori sau review intern
- **Timp răspuns:** următoarea zi lucrătoare
- **Cine acționează:** Owner
- **Comunicare:** nu necesită
- **Rezolvare țintă:** < 1 săptămână
- **Acțiuni:**
  1. Adăugare în backlog
  2. Rezolvare la următorul ciclu de dezvoltare

---

## 4. Lanț de Escaladare

```
Detecție automată (agenți AI / healthcheck)
    ↓
Alertă email + ntfy.sh/jobgrade-owner-liviu-2026
    ↓
Owner verifică și acționează
    ↓
Dacă Owner indisponibil > 30 min (SEV1):
    → Backup uman (planificat la 20+ clienți)
```

### Risc acceptat la lansare
Owner este singurul punct de defecțiune (single point of failure). Acest risc este acceptat pentru faza inițială. La depășirea pragului de 20 clienți activi se va contracta:
- Un dezvoltator backup cu acces la deployment
- Un punct de contact pentru clienți (suport nivel 1)

---

## 5. Comunicare cu Clienții

### Template notificare incident SEV1/SEV2

**Subiect:** [JobGrade] Întrerupere temporară — {data}

> Stimată echipă,
>
> Vă informăm că platforma JobGrade întâmpină în acest moment dificultăți tehnice care afectează {funcționalitatea}. Echipa noastră lucrează la rezolvare.
>
> Estimăm revenirea la normal în {interval}.
>
> Vă vom notifica imediat ce serviciul este restabilit.
>
> Cu respect,
> Echipa JobGrade

### Template rezolvare

**Subiect:** [JobGrade] Serviciu restabilit — {data}

> Stimată echipă,
>
> Vă informăm că dificultățile tehnice au fost rezolvate. Platforma funcționează normal.
>
> Ne cerem scuze pentru inconvenient.
>
> Cu respect,
> Echipa JobGrade

---

## 6. Post-Incident Review

După fiecare incident SEV1 sau SEV2 se completează:

### Document post-mortem

1. **Cronologie:** ce s-a întâmplat, pas cu pas, cu timestamp-uri
2. **Cauza rădăcină:** de ce s-a întâmplat
3. **Impact:** câți clienți, cât timp, ce funcționalități
4. **Acțiuni corective:** ce facem ca să nu se repete
5. **Lecții învățate:** ce am învățat

### Reguli
- Post-mortem fără blamare — focusul e pe proces nu pe persoane
- Document scris în maxim 48h de la rezolvare
- Acțiunile corective au deadline și responsabil
- COG primește raportul pentru ajustarea ciclurilor proactive

---

## 7. Instrumente și Acces

| Instrument | Scop | Acces |
|------------|------|-------|
| Vercel Dashboard | Deployment, loguri, analytics | Owner |
| Neon Console | Baza de date, PITR | Owner |
| Keycloak Admin | Autentificare, utilizatori | Owner |
| ntfy.sh | Notificări push | Owner (subscribe) |
| n8n | Workflow-uri automatizare | Owner |
| GitHub | Cod sursă, issues | Owner |

---

## 8. Teste periodice

- **Lunar:** verificare manuală că alertele ntfy funcționează
- **Trimestrial:** simulare failover (test restore din backup)
- **La fiecare deploy major:** verificare healthcheck post-deploy

---

*Document viu — se actualizează la fiecare incident sau schimbare de infrastructură.*
