# Ghid de Testare Securitate — JobGrade Platform

## 1. OWASP ZAP Baseline Scan

### Ce este
OWASP ZAP (Zed Attack Proxy) este un instrument open-source pentru testarea securitatii aplicatiilor web. Scanul de tip **baseline** verifica headere HTTP, cookie-uri, configurari si vulnerabilitati comune fara a face teste intruzive.

### Cerinte
- Docker instalat si pornit
- Aplicatia JobGrade ruland pe `http://localhost:3000`

### Cum se ruleaza

```bash
# 1. Porneste aplicatia
npm run dev

# 2. Intr-un alt terminal, ruleaza scanul
chmod +x scripts/owasp-zap-scan.sh
./scripts/owasp-zap-scan.sh
```

Raportul HTML va fi generat in: `reports/owasp-zap-report.html`

### Variabile de mediu optionale

| Variabila        | Default                            | Descriere                    |
|------------------|------------------------------------|------------------------------|
| `ZAP_TARGET_URL` | `http://host.docker.internal:3000` | URL-ul tinta pentru scanare  |

Exemplu scanare pe alt port:
```bash
ZAP_TARGET_URL=http://host.docker.internal:8080 ./scripts/owasp-zap-scan.sh
```

---

## 2. Interpretarea rezultatelor

### Coduri de iesire
| Cod | Semnificatie                                   |
|-----|------------------------------------------------|
| 0   | PASS — fara vulnerabilitati                    |
| 1   | WARN — avertismente, de investigat             |
| 2   | FAIL — vulnerabilitati gasite, actiune necesara|

### Niveluri de risc in raport
- **High** — Vulnerabilitati critice. Trebuie rezolvate INAINTE de deploy.
- **Medium** — Vulnerabilitati importante. Rezolvare inainte de urmatorul release.
- **Low** — Riscuri minore. Planificare in backlog.
- **Informational** — Observatii fara impact direct.

### Sectiuni raport
1. **Alerts** — Lista vulnerabilitatilor gasite, grupate pe severitate
2. **Alert Details** — Descrierea detaliata, URL-urile afectate, remediere recomandata
3. **Statistics** — Sumar numeric per nivel de risc

---

## 3. False pozitive comune

Aceste alerte pot fi ignorate in contextul platformei JobGrade:

| ID    | Alerta                              | Motiv ignorare                                            |
|-------|-------------------------------------|-----------------------------------------------------------|
| 10098 | Cross-Domain Misconfiguration       | False positive pe localhost                                |
| 10049 | Non-Storable Content                | Normal pentru API-uri dinamice                             |
| 40025 | Proxy Disclosure                    | False positive pe environment de dezvoltare                |
| 90033 | Loosely Scoped Cookie               | Normal pe localhost, nu se aplica in productie cu domeniu  |
| 10036 | Server Leaks Version Information    | Header `x-powered-by` — dezactivat in `next.config.ts`    |

Regulile de ignorare/avertisment sunt configurate in `scripts/zap-rules.conf`.

---

## 4. Testare E2E securitate

Pe langa OWASP ZAP, platforma include teste E2E Playwright care verifica:

```bash
# Ruleaza toate testele E2E
npx playwright test

# Ruleaza doar testele de fluxuri critice
npx playwright test tests/e2e/critical-flows.spec.ts
```

### Ce verifica testele E2E de securitate
- **API Protection** — endpoint-urile protejate returneaza 401 fara autentificare
- **Security Headers** — X-Frame-Options, X-Content-Type-Options, HSTS prezente
- **Informații sensibile** — health check nu expune connection strings sau chei API
- **X-Powered-By** — header-ul nu este expus

---

## 5. Planificare scanari

### Inainte de fiecare release major
1. Ruleaza `scripts/owasp-zap-scan.sh`
2. Ruleaza `npx playwright test tests/e2e/critical-flows.spec.ts`
3. Verifica raportul — **zero alerte High**
4. Investiga si documenteaza orice alerta Medium noua

### Saptamanal (recomandat)
- Scan baseline pe environment de staging
- Review alerte noi vs. scan anterior

### Dupa modificari majore
- Modificari la middleware de autentificare/autorizare
- Actualizari dependente (npm audit)
- Modificari la headere HTTP sau CORS
- Adaugare endpoint-uri API noi

---

## 6. Resurse suplimentare

- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Playwright Testing](https://playwright.dev/docs/intro)
