# Scenarii ciclul de viață cont client B2B

## S1 — Nu plătește (trial expirat / abandon)

**Situație:** Clientul și-a creat cont, poate a completat profilul, dar nu a cumpărat niciun pachet.

**Întrebări:**
- Cât timp păstrăm datele? → Propunere: 30 zile de la ultima activitate
- Notificăm? → Da: la 7, 3, 1 zile înainte de ștergere
- Ce ștergem? → Datele de profil + orice input. Contul auth rămâne (poate reveni)
- Email reactivare? → Da, la 15 zile și 25 zile

**Implicații CJA (GDPR):**
- Art. 17 — dreptul la ștergere: ștergerea automată la 30 zile satisface cerința
- Art. 13 — informare: trebuie menționat în Termeni și Condiții + Privacy Policy
- Retenție minimă fiscală: NU se aplică (nu a plătit)

**Implicații COA (tehnic):**
- Câmp nou pe Tenant: `lastActivityAt DateTime`
- Cron job zilnic: verifică conturi cu lastActivityAt < 30 zile → marchează → șterge
- Status nou: `INACTIVE` (între 30 zile și ștergere)

**Implicații CFO:**
- Zero — nu a plătit, nu există documente fiscale

---

## S2 — Înainte de ștergere date — dreptul la export

**Situație:** Clientul vrea să renunțe SAU ștergerea automată se apropie.

**Întrebări:**
- Ce poate descărca? → Tot ce a introdus + tot ce am generat pentru el
- Format? → PDF (rapoarte), Excel (date brute: posturi, angajați, evaluări)
- Cât timp e disponibil download-ul? → Până la ștergerea efectivă
- Mecanismul? → Buton "Descarcă arhiva completă" → generează ZIP → link temporar 24h

**Implicații CJA (GDPR):**
- Art. 20 — dreptul la portabilitate: obligatoriu, format structurat (JSON/CSV/Excel)
- Trebuie disponibil ÎNAINTE de ștergere, nu după
- Log: trebuie păstrat jurnal că am oferit posibilitatea de export

**Implicații COA:**
- API: `/api/v1/account/export` → generează ZIP cu toate datele
- Conținut ZIP: profil.json, posturi.xlsx, angajati.xlsx, evaluari.xlsx, rapoarte/*.pdf
- Storage temporar: Vercel Blob sau signed URL 24h

**Implicații CFO:**
- Facturile emise rămân în evidența noastră (obligație fiscală 10 ani)
- Se exportă COPII ale facturilor, nu originalele

---

## S3 — Revine după pauză

**Situație:** A plătit luna 1-3, a generat rapoarte, a descărcat ce avea nevoie, a renunțat. În luna 5 vrea să revină.

**Întrebări:**
- Datele mai există? → DA dacă < 30 zile de la expirare, NU dacă > 30 zile
- Dacă DA: plătește abonament → reactivare instant, acces la datele existente
- Dacă NU: plătește abonament → cont nou, poate face upload datele exportate anterior
- Serviciile anterioare? → Se reactivează la nivelul plătit anterior
- Credite rămase? → Se păstrează (creditele NU expiră)
- Poate face upgrade? → Da, plătește diferența

**Implicații CJA:**
- Contract nou sau reactivare? → Reactivare dacă < 30 zile, contract nou dacă > 30 zile
- Consimțământ GDPR: trebuie re-confirmat la reactivare
- Dacă datele au fost șterse: NU le putem recupera (trebuie comunicat clar)

**Implicații COA:**
- Câmpuri noi: `suspendedAt DateTime?`, `expiresAt DateTime?`
- Status flow: ACTIVE → SUSPENDED (nu plătește) → EXPIRED (30 zile) → DELETED
- Import: mecanism de re-import din ZIP-ul exportat anterior
- Backup: NU păstrăm backup după ștergere (GDPR)

**Implicații CFO:**
- Reactivare = factură nouă abonament
- Creditele anterioare: valoare contabilă de urmărit

---

## S4 — Upgrade pachet

**Situație:** A cumpărat Baza (L1), vrea Conformitate (L2).

**Întrebări:**
- Plătește diferența? → Da: preț L2 - preț L1 (prorated)
- Sau plătește integral L2? → Depinde de politica comercială
- Taburile noi se activează instant? → Da
- Datele existente se păstrează? → Da, se adaugă taburi noi

**Implicații CJA:**
- Clauză de upgrade în Termeni: "diferență de preț se calculează proporțional"
- Factură suplimentară pentru diferență

**Implicații COA:**
- ServicePurchase.layer se actualizează (upsert existent funcționează deja)
- Checkout: detectare upgrade → calcul diferență → Stripe checkout cu diferența
- UI: card L1 rămâne ACTIV, card L2 arată "Upgrade → X RON"

**Implicații CFO:**
- Factură pentru diferența de preț
- Dacă e prorated pe luni rămase: calcul complex

---

## S5 — Nu reînnoiește abonamentul

**Situație:** Abonament lunar expirat, nu plătește luna următoare.

**Întrebări:**
- Acces imediat blocat? → NU — grace period 7 zile cu avertizare
- Ce poate face în grace period? → Citire + export, NU poate genera rapoarte noi
- După grace period? → Cont suspendat, datele read-only 30 zile
- După 30 zile? → Ștergere automată (cu notificări S1)

**Implicații CJA:**
- Grace period: trebuie menționat în contract
- Notificare abonament expirat: obligatorie (email + portal)
- Read-only mode: satisface dreptul la acces fără a oferi servicii neplătite

**Implicații COA:**
- Status: ACTIVE → GRACE (7 zile) → SUSPENDED (30 zile) → EXPIRED → DELETED
- Middleware: verifică status la fiecare request, redirect la pagina de reînnoire
- Cron: Stripe webhook `invoice.payment_failed` → marchează GRACE

**Implicații CFO:**
- Stripe retry automat (3 încercări pe 7 zile)
- După 3 retry-uri eșuate: subscription canceled automat de Stripe
- Factură stornată? → Nu, pur și simplu nu se mai emite

---

## S6 — Abonament expirat dar credite rămase

**Situație:** Are 500 credite neconsummate, dar nu mai plătește abonamentul.

**Întrebări:**
- Creditele expiră? → NU — creditele sunt proprietatea clientului
- Poate folosi creditele fără abonament? → NU — abonamentul e condiția de acces
- Ce se întâmplă cu creditele la ștergere cont? → Se pierd (menționat în T&C)
- Rambursare credite nefolosite? → NU (menționat în T&C)
- La reactivare: creditele revin? → DA dacă contul nu a fost șters

**Implicații CJA:**
- Clauza creditelor: "creditele nu expiră dar necesită abonament activ pentru utilizare"
- Clauza de nerambursare: trebuie explicită în T&C
- La ștergere cont: notificare despre pierderea creditelor

**Implicații COA:**
- CreditBalance persistă independent de status tenant
- La DELETED: se șterg și creditele (CASCADE)
- La reactivare: creditele existente devin disponibile automat

---

## S7 — Schimbare nr. poziții / salariați

**Situație:** A plătit pentru 10 poziții, acum are 15.

**Întrebări:**
- Blochăm adăugarea? → NU — lasăm să adauge, dar avertizăm
- Cum plătește diferența? → "Pachet suplimentar" — credite adiționale
- Sau recalculare automată? → La generare raport, verificăm dacă are destule credite
- Dacă nu are credite? → Avertizare + redirect la cumpărare credite

**Implicații CJA:**
- Transparență: arătăm mereu câte credite consumă operația ÎNAINTE de execuție
- Nu blocăm inputul, blocăm doar generarea care costă

**Implicații COA:**
- Verificare la fiecare acțiune care consumă credite: `hasCredits(tenantId, needed)`
- UI: avertizare "Această operație consumă X credite. Aveți Y disponibile."
- Dacă Y < X: buton "Cumpără credite" în loc de "Generează"

---

## S8 — Facturare

**Situație:** Client B2B, Psihobusiness e plătitoare TVA.

**Întrebări:**
- Factură automată din Stripe? → Da, Stripe Invoice
- Factură fiscală RO? → Trebuie generată separat (sau integrare cu facturier)
- TVA? → B2B fără TVA (reverse charge dacă client RO plătitor TVA)
- Moment emitere? → La plata confirmată (webhook)

**Implicații CJA:**
- Facturare electronică obligatorie RO din 2024: e-Factura / SPV
- Trebuie menționat CUI client pe factură
- Retenție facturi: 10 ani (Codul fiscal)

**Implicații COA:**
- Integrare viitoare: SmartBill / Oblio / facturier RO
- Deocamdată: Stripe Invoice + export manual dacă e nevoie

**Implicații CFO:**
- TVA 19% pe servicii B2B către clienți neplătitori TVA
- Reverse charge pentru clienți plătitori TVA (CUI RO valid)
- Evidență separată abonamente vs credite vs servicii

---

## S9 — Trial / Demo / Cont Pilot

**Situație:** Contul actual e "Cont Pilot" — e un trial sau un demo permanent?

**Întrebări:**
- Ce e un cont pilot? → Cont de test cu acces complet pentru demonstrație
- Durată? → Nelimitată pentru faza de lansare, apoi 14 zile
- Ce poate face? → Tot, dar cu date marcate "DEMO"
- Conversie la cont plătitor? → Buton "Activează contul" → Stripe

**Implicații CJA:**
- Trial = contract implicit → trebuie T&C acceptate la creare cont
- Datele trial: se șterg la conversie sau se păstrează? → La alegerea clientului

**Implicații COA:**
- Câmp: `Tenant.isPilot Boolean` (există deja)
- isPilot=true: acces complet, fără restricții de plată
- La conversie: isPilot=false, flow normal de plată

---

## S10 — GDPR drept la ștergere (Art. 17)

**Situație:** Client trimite cerere formală de ștergere date.

**Întrebări:**
- Termen? → 30 zile calendaristice de la cerere
- Ce ștergem? → Tot ce e date personale (profil, angajați, evaluări, rapoarte)
- Ce NU ștergem? → Log-uri fiscale (facturi — obligație legală 10 ani)
- Anonimizare ca alternativă? → Da, pentru date agregate/statistice
- Cine procesează? → DPO (sau automat cu aprobare DPO)

**Implicații CJA:**
- Art. 17(3)(b): excepția obligației legale — facturile se păstrează
- Art. 17(3)(e): excepția pentru exercitarea drepturilor în instanță
- Log obligatoriu: data cererii, data execuției, ce s-a șters, ce s-a păstrat și de ce
- Răspuns formal către solicitant

**Implicații COA:**
- API: `/api/v1/gdpr/erasure-request` → creează cerere cu termen 30 zile
- Cron: procesare cereri GDPR la termen
- Ștergere selectivă: date personale DA, date fiscale NU
- Anonimizare: replace PII cu hash-uri, păstrează structura pentru statistici

**Implicații CFO:**
- Facturile se păstrează obligatoriu
- Se anonimizează datele clientului pe factură? → NU (obligație fiscală)
