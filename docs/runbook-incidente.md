# Runbook Incidente — JobGrade

**Versiune:** 1.0  
**Data:** 2026-04-08  
**Audienta:** Echipa tehnica (Owner, Claude, COG)

---

## Structura per incident

Fiecare incident este documentat cu:
- **Simptome** — ce observi cand se intampla
- **Verificare** — cum confirmi problema
- **Cauze frecvente** — ce provoaca de obicei situatia
- **Raspuns automat** — ce face platforma singura (daca exista)
- **Rezolvare manuala** — pasi de urmat
- **Prevenire** — cum eviti pe viitor

---

## 1. Next.js app nu porneste

### Simptome
- Pagina nu se incarca (ERR_CONNECTION_REFUSED sau timeout)
- Dashboard-ul nu raspunde
- Utilizatorii raporteaza "site-ul nu merge"

### Verificare
```bash
# Verificare daca aplicatia raspunde
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# Verificare daca portul e ocupat
lsof -i :3000
# sau pe Windows:
netstat -ano | findstr :3000

# Verificare procese Node.js active
ps aux | grep next
# sau pe Windows:
tasklist | findstr node
```

### Cauze frecvente

| Cauza | Indiciu | Rezolvare |
|-------|---------|-----------|
| Port 3000 ocupat de alt proces | `lsof` arata PID diferit | Kill procesul: `kill -9 <PID>` |
| Eroare de compilare TypeScript | Erori rosii in terminal | Citeste erorile, corecteaza fisierul indicat |
| Variabile de mediu lipsa | Eroare "env variable X is not defined" | Verifica `.env.local` contine toate variabilele din `.env.example` |
| `node_modules` corupte | Erori de import/module not found | `rm -rf node_modules && npm install` |
| Versiune Node.js incompatibila | Erori de sintaxa neasteptate | Verifica `node -v`, necesara >= 18.x |
| Baza de date inaccesibila | Eroare Prisma la startup | Vezi Incidentul #3 |

### Raspuns automat
- FLUX-041 (healthcheck n8n) monitorizeaza endpoint-ul `/api/health`
- Daca detecteaza DOWN, trimite notificare pe ntfy.sh/jobgrade-owner-liviu-2026

### Rezolvare manuala
```bash
# Pas 1: Opreste orice proces pe portul 3000
kill -9 $(lsof -t -i:3000) 2>/dev/null

# Pas 2: Verifica variabilele de mediu
cat .env.local | head -20

# Pas 3: Reporneste aplicatia
npm run dev

# Pas 4: Verifica in browser
curl http://localhost:3000/api/health
```

### Prevenire
- Mentine FLUX-041 healthcheck activ (interval: 5 minute)
- Pastreaza `.env.example` sincronizat cu `.env.local`
- Ruleaza `npm run build` inainte de deploy pentru a detecta erori de compilare

---

## 2. Claude API nu raspunde

### Simptome
- Functiile AI nu raspund (generare fisa post, analiza, chat)
- Timeout la apelurile AI (> 30 secunde fara raspuns)
- Mesaje de eroare "AI temporarily unavailable" in UI

### Verificare
```bash
# Verificare health check
curl http://localhost:3000/api/health

# Verificare directa API Anthropic
curl -s https://status.anthropic.com/api/v2/status.json | jq '.status'

# Verificare API key
echo $ANTHROPIC_API_KEY | head -c 10
# Trebuie sa inceapa cu "sk-ant-"
```

### Cauze frecvente

| Cauza | Indiciu | Rezolvare |
|-------|---------|-----------|
| Anthropic API down | status.anthropic.com arata incident | Asteptare + degraded mode |
| API key expirat/invalid | Eroare 401 Unauthorized | Regenereaza key din console.anthropic.com |
| Rate limit atins | Eroare 429 Too Many Requests | Asteapta cooldown (1-5 min) |
| Timeout retea | Eroare ETIMEDOUT | Verifica conexiunea la internet |
| Credit epuizat | Eroare 402 | Adauga credit in contul Anthropic |

### Raspuns automat
- **Circuit breaker**: dupa 3 esecuri consecutive, API-ul AI intra in **degraded mode**
- In degraded mode: functiile AI sunt dezactivate temporar, utilizatorii vad mesaj "Functia AI este temporar indisponibila, va reveni in curand"
- Circuit breaker-ul reincearca automat la fiecare 60 de secunde

### Rezolvare manuala
1. Verifica https://status.anthropic.com — daca e incident activ, asteapta rezolvarea
2. Daca nu e incident Anthropic, verifica API key:
   ```bash
   # Test simplu
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "content-type: application/json" \
     -H "anthropic-version: 2023-06-01" \
     -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
   ```
3. Daca API key-ul e invalid, genereaza unul nou din console.anthropic.com si actualizeaza `.env.local`
4. Reporneste aplicatia

### Prevenire
- Monitorizeaza https://status.anthropic.com (subscribe la updates)
- Mentine un API key de backup
- Configureaza alerte pe rate limit (80% din cota)

---

## 3. Database connection failure

### Simptome
- Erori "PrismaClientKnownRequestError" in logs
- Pagini care incarca la infinit sau returneaza 500
- Erori "Connection pool exhausted" sau "Connection timed out"

### Verificare
```bash
# Verificare conexiune DB
npx prisma db execute --stdin <<< "SELECT 1"

# Verificare connection string
echo $DATABASE_URL | sed 's/:[^@]*@/:*****@/'

# Verificare health endpoint
curl http://localhost:3000/api/health
```

### Cauze frecvente

| Cauza | Indiciu | Rezolvare |
|-------|---------|-----------|
| Neon outage | console.neon.tech arata incident | Asteptare + notificare clienti |
| Connection pool epuizat | "Too many connections" | Restart aplicatie (elibereaza pool) |
| Credentials rotite | "authentication failed" | Actualizeaza DATABASE_URL din Neon console |
| SSL certificate issues | "SSL connection error" | Adauga `?sslmode=require` la connection string |
| Branch Neon suspendata | Timeout la conectare | Acceseaza Neon console, activeaza branch-ul |

### Raspuns automat
- Health check verifica conexiunea DB la fiecare 5 minute
- La esec, se trimite notificare pe ntfy.sh/jobgrade-owner-liviu-2026

### Rezolvare manuala
```bash
# Pas 1: Verifica Neon dashboard
# https://console.neon.tech — verifica status branch + compute

# Pas 2: Testeaza conexiunea
npx prisma db execute --stdin <<< "SELECT NOW()"

# Pas 3: Daca connection pool e epuizat, reporneste app
# (Prisma elibereaza conexiunile la restart)
kill -9 $(lsof -t -i:3000) 2>/dev/null
npm run dev

# Pas 4: Daca credentials s-au schimbat
# Copieaza noul connection string din Neon console
# Actualizeaza .env.local: DATABASE_URL="noul_string"

# Pas 5: Verifica schema
npx prisma db pull
npx prisma generate
```

### Prevenire
- Configureaza connection pool limit adecvat (recomandat: 10-20 pentru dezvoltare, 50-100 pentru productie)
- Monitorizeaza Neon dashboard regulat
- Nu roti credentials fara a actualiza toate mediile (.env.local, Vercel env vars)

---

## 4. n8n workflows esueaza

### Simptome
- Notificari automate nu mai ajung
- Rapoarte COG nu se genereaza la timp
- FLUX-041 healthcheck nu mai trimite alerte
- Cron-uri zilnice nu se executa

### Verificare
```bash
# Verificare n8n running
curl -s http://localhost:5678/healthz

# Verificare workflows active (din n8n CLI)
n8n list:workflow

# Verificare ultimele executii
# Accesati n8n UI: http://localhost:5678 > Executions
```

### Cauze frecvente

| Cauza | Indiciu | Rezolvare |
|-------|---------|-----------|
| API endpoint down | Eroare HTTP 5xx in executie | Verifica endpoint-ul tinta, reporneste daca necesar |
| Timeout la executie | "Execution timed out" | Creste timeout in workflow settings |
| Auth token expirat | Eroare 401 in executie | Actualizeaza credentials in n8n |
| n8n service oprit | healthz nu raspunde | Reporneste container Docker / serviciul n8n |
| Webhook URL schimbat | Triggerul nu se mai declanseaza | Actualizeaza URL-ul in sursa (Stripe, GitHub etc.) |

### Raspuns automat
- FLUX-043 (monitoring) verifica periodic statusul celorlalte workflow-uri
- La esec repetat, trimite notificare Owner

### Rezolvare manuala
```bash
# Pas 1: Verifica daca n8n ruleaza
docker ps | grep n8n
# sau
curl http://localhost:5678/healthz

# Pas 2: Daca nu ruleaza, reporneste
docker restart n8n
# Asteapta 30 secunde

# Pas 3: Verifica workflow-ul specific in n8n UI
# http://localhost:5678 > Workflows > [workflow-ul care a esuat]
# Deschide > Executions > vezi ultima eroare

# Pas 4: Re-ruleaza manual workflow-ul
# Din n8n UI: deschide workflow > Execute Workflow

# Pas 5: Daca auth e expirat
# n8n UI > Credentials > [credential-ul afectat] > Update
```

### Prevenire
- Verifica zilnic n8n executions (cel putin un check dimineata)
- Configureaza retry automat pe workflow-uri critice (max 3 retry, backoff exponential)
- Pastreaza un calendar cu expirarea credentials (API keys, tokens)

---

## 5. Stripe webhook failure

### Simptome
- Plati procesate dar contul clientului nu se activeaza
- Stripe dashboard arata webhooks cu status "Failed"
- Clientii raporteaza ca au platit dar nu au acces

### Verificare
```
1. Accesati Stripe Dashboard > Developers > Webhooks
2. Verificati Events > filtrare pe "Failed"
3. Verificati endpoint URL — trebuie sa fie https://app.jobgrade.ro/api/webhooks/stripe
4. Verificati Signing Secret — trebuie sa corespunda cu STRIPE_WEBHOOK_SECRET din .env
```

### Cauze frecvente

| Cauza | Indiciu | Rezolvare |
|-------|---------|-----------|
| Webhook secret expirat | Signature verification failed (400) | Genereaza nou secret in Stripe, actualizeaza .env |
| Endpoint down | Delivery attempts returning 5xx | Verifica ca app-ul ruleaza (Incident #1) |
| Signature mismatch | "No signatures found matching" | Verifica STRIPE_WEBHOOK_SECRET in .env.local |
| Timeout la procesare | "Timed out" in Stripe events | Optimizeaza handler-ul (procesare async) |
| URL gresit | 404 Not Found | Corecteaza URL-ul webhook-ului in Stripe dashboard |

### Raspuns automat
- Stripe reincearca automat livrarea webhook-urilor esuate (pana la 3 zile, cu backoff)

### Rezolvare manuala
```bash
# Pas 1: Verificare secret
echo $STRIPE_WEBHOOK_SECRET | head -c 10
# Trebuie sa inceapa cu "whsec_"

# Pas 2: Resend event din Stripe
# Stripe Dashboard > Developers > Events > selecteaza event-ul > Resend

# Pas 3: Daca secretul s-a schimbat
# Stripe Dashboard > Developers > Webhooks > [endpoint] > Signing secret > Reveal
# Copiaza si actualizeaza STRIPE_WEBHOOK_SECRET in .env.local
# Reporneste aplicatia

# Pas 4: Verificare manuala dupa resend
# Verifica in baza de date ca subscription/plata s-a inregistrat
npx prisma studio
# Cauta in tabelul payments/subscriptions
```

### Prevenire
- Configureaza alertare in Stripe pentru webhook failures
- Testeaza webhook-urile cu `stripe listen --forward-to localhost:3000/api/webhooks/stripe` in dezvoltare
- Implementeaza idempotency pe handler (acelasi event procesat de 2 ori nu creeaza duplicat)

---

## 6. Email nu se trimit (Resend)

### Simptome
- Utilizatorii nu primesc emailuri de invitatie/activare
- Emailuri de notificare nu ajung
- Resend dashboard arata erori de livrare

### Verificare
```
1. Accesati Resend Dashboard > Logs
2. Verificati statusul ultimelor emailuri (Delivered, Bounced, Failed)
3. Verificati domeniul: Resend > Domains > jobgrade.ro — Status: Verified?
```

### Cauze frecvente

| Cauza | Indiciu | Rezolvare |
|-------|---------|-----------|
| API key invalid | Eroare 401 in logs aplicatie | Regenereaza key din Resend dashboard |
| Domeniu neverificat | Eroare "Domain not verified" | Adauga/verifica inregistrarile DNS |
| Rate limit depasit | Eroare 429 | Asteapta reset (de obicei 1 min) sau upgradeaza planul |
| SPF/DKIM incorect | Emailuri ajung in Spam | Verifica inregistrarile DNS (SPF, DKIM, DMARC) |
| Adresa destinatar invalida | Bounce hard | Verifica adresa de email a destinatarului |
| Sandbox mode activ | Doar emailuri catre adresa verificata | Treci pe production mode in Resend |

### Raspuns automat
- Nu exista raspuns automat. Emailurile esuate sunt logate.

### Rezolvare manuala
```bash
# Pas 1: Verifica API key
echo $RESEND_API_KEY | head -c 10
# Trebuie sa inceapa cu "re_"

# Pas 2: Test trimitere email
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@jobgrade.ro",
    "to": "test@example.com",
    "subject": "Test",
    "text": "Test email"
  }'

# Pas 3: Verificare DNS (din terminal)
dig TXT jobgrade.ro | grep spf
dig TXT resend._domainkey.jobgrade.ro

# Pas 4: Daca domeniul nu e verificat
# Resend Dashboard > Domains > Add Domain > jobgrade.ro
# Adauga inregistrarile DNS indicate (SPF, DKIM, DMARC)
# Asteapta propagare DNS (pana la 48 ore, de obicei 1-2 ore)
```

### Prevenire
- Monitorizeaza Resend dashboard saptamanal (bounce rate, delivery rate)
- Configureaza DMARC policy
- Testeaza emailurile cu mail-tester.com inainte de campaniile mari

---

## 7. Keycloak down

### Status actual
**N/A** — Platforma foloseste exclusiv **NextAuth** pentru autentificare. Keycloak nu este in stiva curenta.

Daca in viitor se reintroduce Keycloak:

### Note pentru referinta
- Keycloak in Docker nu are `curl` instalat — foloseste `bash /dev/tcp/localhost/8080` pentru healthcheck
- `start_period` recomandat: 180 secunde (Keycloak porneste lent)
- Busybox `wget` are un pitfall cu IPv6 localhost — foloseste `127.0.0.1` explicit

---

## 8. SafetyMonitor CRITICAL alert (B2C)

### Simptome
- Notificare CRITICA pe ntfy.sh/jobgrade-owner-liviu-2026
- Log marcat cu nivel CRITIC in sistem
- Utilizator B2C a declansat un trigger de siguranta

### Niveluri de alerta

| Nivel | Ce inseamna | Actiune |
|-------|------------|---------|
| **CRITIC** | Pattern DSM-5 detectat (risc auto-vatamre, criza acuta) | Imediat: exit elegant + resurse de criza |
| **RIDICAT** | Distres emotional sever, gandire dezorganizata | Monitorizare activa, ghidare catre profesionist |
| **MODERAT** | Frustrare crescuta, limbaj agresiv | De-escaladare, ajustare interactiune |
| **INFORMATIV** | Pattern de interes (schimbare ton, retragere) | Logare, monitorizare pasiva |

### Raspuns automat (nivel CRITIC)
Platforma face automat urmatoarele in ordinea indicata:

1. **Opreste interactiunea AI** — agentul nu mai raspunde cu continut de coaching
2. **Afiseaza mesaj de criza** — text pre-definit cu:
   - Numarul national de urgenta: 112
   - Telefonul de prevenire a suicidului: 0800 801 200
   - Mesaj empatic, non-judicativ
3. **Initiaza rambursare** — daca exista plata activa, se initiaza rambursare automata
4. **Logheaza incidentul** — detalii complete (timestamp, context, trigger)
5. **Notifica Owner** — notificare imediata pe ntfy.sh

### Verificare
```
1. Verifica notificarea pe ntfy.sh/jobgrade-owner-liviu-2026
2. Acceseaza logurile de siguranta: Admin > SafetyMonitor > Incidents
3. Citeste contextul incidentului (ultimele 10 mesaje anonimizate)
```

### Rezolvare manuala

**In primele 30 de minute:**
1. Citeste logul incidentului complet
2. Evalueaza daca mesajul automat de criza a fost afisat corect
3. Verifica daca rambursarea a fost initiata

**In primele 24 de ore:**
1. Discuta cu psihologul acreditat din echipa
2. Psihologul decide daca e necesara actiune suplimentara:
   - Daca utilizatorul a lasat date de contact voluntar: psihologul poate contacta
   - Daca nu: se pastreaza doar logul anonim
3. Documenteaza incidentul in registrul de siguranta

**Follow-up (7 zile):**
1. Review intern: a functionat corect mecanismul?
2. Ajustari la triggere daca au fost false pozitive
3. Update training data SafetyMonitor daca e cazul

### Prevenire
- Mentine lista de triggere DSM-5 actualizata (review trimestrial cu psihologul)
- Testeaza mecanismul de exit elegant lunar (cu scenarii simulate)
- Asigura ca mesajele de criza contin numere de telefon actualizate
- Pastreaza contul Stripe configurat pentru rambursari automate

---

## Checklist de raspuns rapid

Cand primesti o alerta, urmeaza acesti pasi in ordine:

1. **Identifica incidentul** — ce componenta e afectata?
2. **Verifica** — ruleaza comenzile de verificare din sectiunea relevanta
3. **Evalueaza impactul** — cati utilizatori sunt afectati? e productia sau dezvoltarea?
4. **Aplica rezolvarea** — urmeaza pasii din "Rezolvare manuala"
5. **Confirma rezolvarea** — ruleaza din nou comenzile de verificare
6. **Documenta** — noteaza ce s-a intamplat, cand, cum s-a rezolvat
7. **Previne** — aplica masurile din "Prevenire" daca nu sunt deja active

---

## Contacte escalare

| Nivel | Cine | Canal | Timp raspuns |
|-------|------|-------|-------------|
| L1 — Prima linie | COG (AI) | Automat | Imediat |
| L2 — Tehnic | Claude (co-admin) | Sesiune Claude Code | < 15 min |
| L3 — Owner | Liviu | ntfy.sh + email | < 1 ora |
| L4 — Extern | Provider (Neon, Anthropic, Stripe) | Support ticket | Depinde de SLA provider |

---

*Runbook actualizat la data de 2026-04-08. Se revizuieste dupa fiecare incident major.*
