# Procedură Backup și Restore — JobGrade

**Versiune:** 1.0  
**Data:** 2026-04-08  
**Responsabil:** Owner (Liviu)

---

## 1. Strategia de Backup

JobGrade folosește o strategie de backup pe două niveluri:

| Nivel | Metodă | Frecvență | Retenție | Automatizare |
|-------|--------|-----------|----------|-------------|
| **Primar** | Neon PITR (Point-in-Time Recovery) | Continuu (WAL) | 7 zile (Free) / 30 zile (Pro) | Automată |
| **Secundar** | pg_dump manual | Săptămânal (recomandat) | Nedeterminată (stocare locală/cloud) | Manuală |

---

## 2. Neon PITR — Backup Automat

### Ce este
Neon menține un backup continuu prin WAL (Write-Ahead Log). Permite restaurarea bazei de date la orice moment din ultimele 7/30 zile, la nivel de secundă.

### Configurare
- PITR este activ implicit pe toate proiectele Neon
- Nu necesită configurare suplimentară
- Verificare: Neon Console → Project → Settings → Point-in-time Recovery

### Limitări
- Free tier: retenție 7 zile
- Pro tier: retenție 30 zile
- Nu protejează împotriva ștergerii proiectului Neon

---

## 3. Backup Manual cu pg_dump

### Cerințe
- `pg_utils` / `psql` instalat local (PostgreSQL client tools)
- Connection string Neon (din variabilele de mediu: `DATABASE_URL`)

### Procedura de backup

```bash
# 1. Setare variabile
export NEON_DB_URL="postgresql://user:pass@host/dbname?sslmode=require"
export BACKUP_DIR="/path/to/backups"
export DATE=$(date +%Y%m%d_%H%M%S)

# 2. Creare director backup (dacă nu există)
mkdir -p $BACKUP_DIR

# 3. Backup complet (format custom — comprimat)
pg_dump "$NEON_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_DIR/jobgrade_${DATE}.dump"

# 4. Verificare dimensiune
ls -lh "$BACKUP_DIR/jobgrade_${DATE}.dump"

# 5. (Opțional) Backup în format SQL text (pentru inspecție)
pg_dump "$NEON_DB_URL" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_DIR/jobgrade_${DATE}.sql"
```

### Frecvența recomandată
- **Săptămânal:** backup complet (duminică seara sau luni dimineața)
- **Înainte de orice migrare Prisma:** backup obligatoriu
- **Înainte de orice modificare manuală a bazei de date:** backup obligatoriu

### Stocare backup-uri
- Local: director dedicat, exclus din git (`.gitignore`)
- Cloud (recomandat): Google Drive / OneDrive — folder dedicat, acces restricționat
- Retenție recomandată: ultimele 4 backup-uri săptămânale + ultimul backup lunar (3 luni)

---

## 4. Restore din Neon PITR

### Când se folosește
- Erori de date cauzate de un bug în cod
- Migrări Prisma eșuate
- Ștergere accidentală de date
- Corupție de date

### Procedura

1. **Accesare Neon Console:** https://console.neon.tech
2. **Navigare:** Project → Branches
3. **Creare branch din punct în timp:**
   - Click "Create Branch"
   - Selectare "From a point in time"
   - Alegere data și ora dorită (momentul ÎNAINTE de incident)
   - Confirmare creare
4. **Verificare date pe branch-ul nou:**
   - Conectare la branch-ul nou cu `psql` sau din aplicație (modificare temporară `DATABASE_URL`)
   - Verificare că datele sunt corecte
5. **Decizie:**
   - **Opțiunea A — Promovare branch:** dacă branch-ul restaurat e corect, se poate face swap cu branch-ul principal
     - Branches → branch restaurat → "Set as primary"
   - **Opțiunea B — Export selectiv:** dacă doar anumite tabele/date trebuie restaurate
     ```bash
     # Export tabel specific din branch-ul restaurat
     pg_dump "$RESTORED_BRANCH_URL" \
       --table=numetabel \
       --data-only \
       --file=tabel_restaurat.sql
     
     # Import în branch-ul principal
     psql "$MAIN_BRANCH_URL" < tabel_restaurat.sql
     ```
6. **Curățare:** ștergere branch temporar dacă nu mai e necesar

### Atenție
- Operația de swap la branch-ul principal necesită restart scurt al conexiunilor
- Verificare conexiunea aplicației după swap (poate necesita redeploy Vercel)

---

## 5. Restore din pg_dump

### Când se folosește
- PITR nu mai acoperă perioada dorită (> 7/30 zile)
- Restaurare pe un alt proiect/server
- Migrare de la Neon la alt provider

### Procedura

```bash
# 1. Setare variabile
export TARGET_DB_URL="postgresql://user:pass@host/dbname?sslmode=require"
export BACKUP_FILE="/path/to/backups/jobgrade_20260408_030000.dump"

# 2. (OPȚIONAL) Creare bază de date nouă / branch Neon nou
# Recomandat: restaurare pe un branch separat pentru verificare

# 3. Restore din format custom
pg_restore "$BACKUP_FILE" \
  --dbname="$TARGET_DB_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists

# SAU din format SQL text:
# psql "$TARGET_DB_URL" < /path/to/backups/jobgrade_20260408_030000.sql

# 4. Verificare
psql "$TARGET_DB_URL" -c "SELECT count(*) FROM \"Organization\";"
psql "$TARGET_DB_URL" -c "SELECT count(*) FROM \"Job\";"
```

### Atenție
- `--clean` va șterge obiectele existente înainte de restaurare
- Dacă schema s-a schimbat între backup și prezent, pot apărea conflicte
- Rulați `npx prisma migrate deploy` după restaurare dacă sunt migrări noi

---

## 6. Test Restore — Procedura de Verificare

### Frecvență: trimestrial (minim)

### Pași

1. **Creare branch Neon de test:**
   - Neon Console → Create Branch → "Empty" sau "From backup"
   
2. **Restore backup pe branch-ul de test:**
   ```bash
   pg_restore "$BACKUP_FILE" \
     --dbname="$TEST_BRANCH_URL" \
     --no-owner \
     --no-privileges
   ```

3. **Verificări:**
   - [ ] Restaurarea s-a finalizat fără erori
   - [ ] Numărul de organizații corespunde
   - [ ] Numărul de posturi corespunde
   - [ ] Numărul de evaluări corespunde
   - [ ] Datele unui client specific sunt corecte (verificare manuală)
   - [ ] Aplicația pornește cu branch-ul de test (test local)

4. **Documentare:**
   - Data testului
   - Backup folosit (dată, dimensiune)
   - Rezultat: SUCCES / EȘEC + detalii
   - Timp total restaurare

5. **Curățare:**
   - Ștergere branch de test din Neon Console

### Registru teste restore

| Data test | Backup folosit | Rezultat | Timp restore | Observații |
|-----------|---------------|----------|-------------|------------|
| _pending_ | — | — | — | Primul test la 20+ date în producție |

---

## 7. Situații Speciale

### Migrare Prisma eșuată
1. **NU** rulați `prisma migrate reset` în producție
2. Backup PITR (branch nou din momentul dinaintea migrării)
3. Fix migrare pe branch de development
4. Re-aplicare migrare corectată

### Ștergere accidentală tenant/organizație
1. PITR restore pe branch separat
2. Export datele organizației șterse
3. Import selectiv pe branch-ul principal

### Disaster recovery complet
1. Creare proiect Neon nou (dacă proiectul original e compromis)
2. Restore din ultimul pg_dump
3. Aplicare migrări Prisma (`npx prisma migrate deploy`)
4. Update `DATABASE_URL` în Vercel
5. Redeploy aplicație

---

## 8. Checklist Săptămânal (uz intern)

- [ ] Verificare că PITR Neon e activ (Neon Console → Settings)
- [ ] Rulare pg_dump săptămânal
- [ ] Verificare dimensiune backup (creștere anormală = investigare)
- [ ] Copiere backup în locație secundară (cloud)

---

*Document viu — se actualizează la fiecare schimbare de infrastructură sau lecție învățată.*
