# Backup & Restore — JobGrade Production

Ghid complet pentru backup-uri și recuperare date în caz de incident.

## Strategia cu 3 layere

### Layer 1 — Neon Pro native (automat)
Plan Neon Pro include:
- **Point-in-time restore 7 zile** — granularitate de 1 secundă
- Branch-uri nelimitate (poți crea un branch-restore la orice moment)
- Zero intervenție din partea ta

Asta acoperă **99% din scenariile de incident** (delete accidental, migrare greșită, corrupție de schemă).

### Layer 2 — Backup manual la milestone-uri (scripting)
Pentru backup-uri explicite înainte de:
- Deploy producție cu schimbări majore
- Migrare Prisma cu `ALTER TABLE` destructiv
- Acțiuni bulk (import masiv, delete many, update many)
- Milestone-uri contractuale (ex: la sfârșitul fiecărui trimestru)

Script: `scripts/backup-neon-prod.ts`

### Layer 3 — Archivare off-site (opțional, recomandat post-scale)
Pentru backup-uri lunare în afara Neon (ransomware protection, provider lock-in protection):
- S3 (cu lifecycle la Glacier)
- Tenant Neon secundar (alt project)
- Local NAS / Hetzner Storage Box

Frecvență: **lunar** primele 6 luni, **săptămânal** după primii 5 clienți plătitori.

## Prerequisite

### pg_dump instalat
Backup-urile manuale necesită `pg_dump` în PATH.

**Windows:**
1. Download: https://www.postgresql.org/download/windows/
2. Installer include pg_dump în `C:\Program Files\PostgreSQL\xx\bin\`
3. Adaugă la PATH

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql-client
```

**Verificare:**
```bash
pg_dump --version
# PostgreSQL pg_dump (15.x) sau superior
```

### gzip (pentru compresie)
- **Windows Git Bash:** inclus
- **macOS/Linux:** inclus
- **Windows PowerShell:** nu inclus — folosește WSL sau instalează

## Backup manual

### Comandă simplă
```bash
DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler.../neondb?sslmode=require" \
  npx tsx scripts/backup-neon-prod.ts
```

### Cu label descriptiv
```bash
DATABASE_URL="..." \
  npx tsx scripts/backup-neon-prod.ts --label="pre-deploy-v1.2"
```

### Output
```
backups/neon-2026-04-10T17-45-00-pre-deploy-v1.2.sql.gz
```

Script-ul păstrează automat **ultimele 10 backup-uri** local. Pentru istoric mai lung, copiază în S3.

### Ce include backup-ul
- **Schema completă** (CREATE TABLE, INDEX, enum-uri, sequences)
- **Toate datele** din toate tabelele
- **NU include** owner/privileges (compatibil cross-environment)
- **NU include** connection credentials (safe de commit dacă criptat)

## Restore

### Opțiunea A — Point-in-time (Neon Pro, recomandat)
**Cel mai rapid și safe.** Zero downtime dacă faci pe branch nou.

1. **Neon Console** → Project → Branches → `production` → **Restore**
2. Selectează timestamp-ul exact (UTC)
3. **Create branch** cu nume descriptiv (`restored-2026-04-10-before-bug`)
4. Testează pe branch-ul nou (cu un environment Vercel Preview)
5. Dacă e OK:
   - **Opțiunea 1 (cleanup):** promote branch-ul restored ca nou `production` (rename)
   - **Opțiunea 2 (merge parțial):** copiază doar tabelele afectate via script
6. Update Vercel env `DATABASE_URL` cu noul pooler endpoint
7. Vercel re-deploy → live

**Timp total: 10-20 minute.**

### Opțiunea B — Restore din backup manual (pg_dump)
Pentru incident grav unde nici Neon Pro nu mai are date (scenariu extrem).

1. **Crează DB nou gol** (Neon project nou sau alt provider)
2. Obține `DATABASE_URL` pentru DB-ul nou
3. Restore:
   ```bash
   gunzip -c backups/neon-2026-04-10-xxx.sql.gz | psql "postgresql://..."
   ```
4. Verifică:
   ```bash
   DATABASE_URL="new-url" npx prisma db pull
   DATABASE_URL="new-url" npx tsx scripts/verify-demo-session.ts
   ```
5. Update Vercel env → re-deploy

**Timp total: 30-60 minute** (depinde de dimensiunea DB).

## Verificare integritate backup

După fiecare backup manual, rulează:
```bash
# Verifică fișierul e valid SQL compresat
gunzip -t backups/neon-xxx.sql.gz && echo "✅ gzip valid"

# Count linii (doar pentru ordine de mărime)
gunzip -c backups/neon-xxx.sql.gz | wc -l

# Verifică că include schemele principale
gunzip -c backups/neon-xxx.sql.gz | grep -E "CREATE TABLE.*(User|Job|EvaluationSession|JobResult)" | wc -l
# Ar trebui 4+ linii
```

## Automation (viitor — după Vercel deploy)

Pentru backup-uri automate zilnice/săptămânale, poți folosi:

### Opțiunea 1 — Vercel Cron
```json
// vercel.json
{
  "crons": [{
    "path": "/api/v1/admin/backup",
    "schedule": "0 3 * * *"
  }]
}
```

Endpoint `/api/v1/admin/backup/route.ts` care:
1. Verifică INTERNAL_API_KEY
2. Conectează la Neon → `pg_dump` via sub-process
3. Upload la S3 bucket (via aws-sdk)
4. Notifică ntfy/Resend despre success/fail

### Opțiunea 2 — n8n workflow
FLUX-040-daily-backup există deja în `n8n-workflows/`. Verifică + activează când ai Hetzner VPS gata.

## Retention policy recomandat

| Tip backup | Frecvență | Retention | Storage |
|---|---|---|---|
| Point-in-time Neon | continuu | 7 zile | Neon Pro (inclus) |
| Manual pre-deploy | ad-hoc | ultimele 10 | local `backups/` |
| Manual milestone | lunar | ultimele 12 | local + S3 |
| Archivare long-term | anual | indefinit | S3 Glacier / off-site |

## Incident response

Dacă descoperi că DB a fost corupt:

1. **STOP deployments** (Vercel → pause production)
2. **Alertează Owner** (email + ntfy)
3. **Identifică momentul incidentului** (logs Vercel, logs Neon)
4. **Decide scope:**
   - Întreaga DB afectată → restore complet
   - Doar câteva tabele → restore selectiv
   - Doar câteva rows → reparare manuală cu script
5. **Rulează restore** (Opțiunea A sau B)
6. **Verifică integritatea** cu smoke tests
7. **Re-deploy Vercel**
8. **Post-mortem** (ce a cauzat, cum prevenim)

## GDPR compliance

Backup-urile conțin date personale (nume, email, evaluări).

**Obligații:**
- Criptare la rest (gzip nu e criptare! Pentru S3, folosește SSE-KMS)
- Retention maxim 7 ani (după care ștergere obligatorie)
- Acces limitat (doar Owner + DPO)
- Registru ștergere (când a fost șters fiecare backup)
- Export pentru subject-access-request (DPO cere, tu îi dai datele exacte)

Pentru backup-uri off-site criptate:
```bash
# Criptare backup cu gpg
gpg --symmetric --cipher-algo AES256 backup.sql.gz
# Decriptare
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

---

**Ultima actualizare:** 10.04.2026
**Responsabil:** Owner + DPO
**Vezi și:** `docs/DEPLOY-GUIDE.md`, `docs/DPIA-draft.md`
