# TODO — Verificare cu structura

**Status:** PENDING verificare
**Data creare:** 21.04.2026
**Termen recomandat:** înainte de lansare pilot

## Verificări necesare

### COG (Chief Operations)
- [ ] Validare flow-uri automate (cron jobs suspendare/ștergere)
- [ ] Procedură escalare când clientul nu răspunde la notificări
- [ ] Procedură manuală de reactivare (cazuri speciale)
- [ ] Impact asupra KPI-urilor operaționale (churn rate, reactivare)
- [ ] Resurse necesare: nr. emailuri/lună, load server cleanup

### CJA (Chief Juridic)
- [ ] Validare conformitate GDPR Art. 17, 20 (ștergere + portabilitate)
- [ ] Redactare secțiuni T&C: credite, abonament, ștergere, export
- [ ] Clauza de nerambursare credite — formulare juridică
- [ ] Clauza grace period 7 zile — bază legală
- [ ] Retenție facturi 10 ani — confirmare Cod fiscal
- [ ] Procedură cerere GDPR formală — template răspuns
- [ ] Verificare e-Factura / SPV obligații 2026

### COA (Chief Operations Architect)
- [ ] Validare schema DB (câmpuri noi, migrări)
- [ ] Design API export (format, dimensiune, storage temporar)
- [ ] Cron jobs: suspendare, ștergere, notificări
- [ ] Middleware status check pe fiecare request
- [ ] Stripe webhooks: invoice.payment_failed, customer.subscription.deleted
- [ ] Backup strategy: ce păstrăm, cât, unde

### CFO (Chief Financial)
- [ ] Tratament contabil credite nefolosite
- [ ] Momentul recunoașterii venitului (la plată vs la prestare)
- [ ] Stornare parțială la upgrade (prorated)
- [ ] Evidență separată: abonamente / credite / servicii one-time
- [ ] Integrare facturier RO (SmartBill / Oblio) — timeline

### DMA (Marketing & Communication)
- [ ] Template-uri email per scenariu (7 template-uri minim)
- [ ] Tonul comunicării — aliniere cu brand voice JobGrade
- [ ] Secvența de re-engagement (abandon → reactivare)
- [ ] Pagină T&C — design, lizibilitate, secțiuni expandabile
- [ ] In-app messaging — banner-uri portal per status cont

## Dependențe între verificări
```
CJA (T&C) ──→ DMA (template-uri email + pagină T&C)
CJA (GDPR) ──→ COA (API export + ștergere selectivă)
CFO (facturare) ──→ COA (integrare facturier)
COG (proceduri) ──→ COA (cron jobs) ──→ DMA (notificări)
```

## Notă
Aceste scenarii sunt BLOCANTE pentru lansare comercială. Contul Pilot poate funcționa fără ele, dar primul client plătitor le necesită pe toate.
