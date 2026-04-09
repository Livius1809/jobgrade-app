# MANUAL DE URGENȚĂ — PERSOANA DE BACKUP

---

## PAGINA 1: CINE EȘTI ȘI CE FACI

**Tu ești persoana de backup.** Ești aici doar pentru situații în care Liviu (Owner-ul) nu este disponibil.

**Reguli simple:**

1. **NU modifici nimic.** Niciun cod, nicio setare, nimic.
2. **NU iei decizii.** Doar urmezi pașii din acest manual.
3. **Urmezi pașii exact în ordine.** Pas cu pas, ca o rețetă.
4. **Dacă ceva nu merge** — contactezi pe Liviu prin orice canal disponibil (vezi PAGINA 6).

> **Respiră. Nu e vina ta. Urmează pașii.**

---

## PAGINA 2: CUM VERIFICI DACĂ PLATFORMA FUNCȚIONEAZĂ

1. **Deschide browserul** (Chrome, Edge, Firefox — oricare).
2. **Scrie în bara de adrese:** `https://jobgrade.ro` și apasă Enter.
3. **Dacă vezi pagina normală** (cu logo, text, butoane) → **Totul e OK. STOP. Nu mai faci nimic.**
4. **Dacă vezi o eroare** (pagină albă, mesaj de eroare, "nu se poate conecta") → **Continuă cu PAGINA 3.**

---

## PAGINA 3: PLATFORMA NU FUNCȚIONEAZĂ — CE FACI

**Pas 1 — Verifică internetul tău.**
- Deschide o altă pagină, de exemplu `https://google.com`.
- **Dacă nici Google nu merge** → problema e la internetul tău, nu la platformă. Verifică conexiunea Wi-Fi sau cablul de internet. **STOP.**

**Pas 2 — Dacă Google merge dar jobgrade.ro NU merge** → e problema noastră. Continuă mai jos.

**Pas 3 — Loghează-te pe Vercel.**
- Deschide browserul și mergi la: `https://vercel.com/dashboard`
- Introdu credențialele (email + parolă). **Credențialele sunt într-un document separat, securizat.**
- Vei vedea un panou de control (dashboard) cu numele proiectului.

**Pas 4 — Găsește lista de deployment-uri.**
- În dashboard, caută și click pe proiectul **jobgrade-app**.
- Vei vedea o listă cu "Deployments" (publicări). Fiecare are un status.
- Caută cel mai recent care scrie **"Ready"** (cu un punct verde).

**Pas 5 — Republicare (Redeploy).**
- Lângă acel deployment, click pe cele **trei puncte** (**...**).
- Din meniul care apare, click pe **"Redeploy"**.
- Va apărea o fereastră de confirmare. Click pe **"Redeploy"** din nou.

**Pas 6 — Așteaptă.**
- **Așteaptă 3-5 minute.** Nu închide pagina.
- După 3-5 minute, deschide un tab nou și mergi la `https://jobgrade.ro`.
- **Dacă pagina apare normal** → **Problema e rezolvată. Notifică-l pe Liviu că ai făcut redeploy.**

**Pas 7 — Dacă tot nu merge.**
- **Contactează pe Liviu IMEDIAT** (vezi PAGINA 6).
- Spune-i: "Am făcut redeploy pe Vercel, dar platforma tot nu merge."

---

## PAGINA 4: PRIMESC ALARME PE EMAIL — CE FAC

Dacă primești un email de la **alerts@jobgrade.ro**, citește **subiectul** emailului și acționează conform tabelului de mai jos:

| Subiect conține | Ce faci |
|---|---|
| **SERVER_DOWN** | Mergi la **PAGINA 3** și urmează pașii. |
| **SAFETY_MONITOR_CRITICAL** | **NU faci nimic tehnic.** E o alertă psihologică. Sună **psihologul din echipă** (vezi PAGINA 6). |
| **BUDGET_EXCEEDED** | **Nu e urgență.** Notifică pe Liviu când e disponibil. Nu trebuie acțiune imediată. |
| **SECURITY_BREACH** | **NU accesa platforma. NU deschide jobgrade.ro.** Contactează pe Liviu **IMEDIAT** prin orice canal. |

> **Dacă subiectul conține altceva** și nu înțelegi despre ce e vorba → trimite emailul către Liviu. Nu acționa pe cont propriu.

---

## PAGINA 5: UN CLIENT SUNĂ SAU SCRIE CĂ CEVA NU MERGE

**Pas 1 — Copiază și trimite acest mesaj, exact așa:**

> Mulțumim că ne-ați semnalat problema. Echipa noastră a fost notificată și lucrează la rezolvare. Vă vom contacta în maximum 4 ore cu un update. Ne cerem scuze pentru inconvenient.

**Pas 2 — Notifică pe Liviu** (email, WhatsApp, telefon — ce e disponibil).

**CE NU FACI:**
- **NU promite un termen mai scurt de 4 ore.**
- **NU da detalii tehnice** (nu spune "serverul e căzut", "facem redeploy" etc.).
- **NU improviza răspunsuri.** Doar mesajul de mai sus.

---

## PAGINA 6: CONTACTE DE URGENȚĂ

| Cine | Cum îl contactezi |
|---|---|
| **Liviu (Owner)** | Telefon: _______________ |
| | Email: _______________ |
| | WhatsApp: _______________ |
| **Psiholog 1** | Telefon: _______________ |
| **Psiholog 2** | Telefon: _______________ |

**Linkuri importante:**

| Ce este | Adresa |
|---|---|
| **Platforma** | https://jobgrade.ro |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Neon Dashboard** | https://console.neon.tech (**doar verificare, NU modifica nimic**) |

> **Credențialele de acces** (email + parole) sunt într-un document separat, securizat. Dacă nu le ai, contactează pe Liviu.

---

## PAGINA 7: CE NU FACI NICIODATĂ

1. **NU modifici cod.** Niciun fișier, nicio linie.
2. **NU ștergi date.** Din nicio bază de date, din niciun panou.
3. **NU accesezi datele clienților.** Sunt confidențiale.
4. **NU răspunzi clienților pe probleme tehnice.** Doar mesajul standard de la PAGINA 5.
5. **NU dai credențiale nimănui.** Nici telefonic, nici pe email.
6. **NU instalezi nimic.** Nicio aplicație, niciun program.
7. **NU faci "update" sau "upgrade"** la nimic.
8. **NU accesa platforma dacă ai primit alertă SECURITY_BREACH.**

---

> **Amintește-ți:** Rolul tău e să menții lucrurile stabile până revine Liviu. Nu trebuie să repari nimic. Trebuie doar să urmezi pașii de mai sus.
>
> **Dacă ești nesigur pe orice pas — oprește-te și sună pe Liviu.**
