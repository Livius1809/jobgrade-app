# Decizie: Upgrade cu prorata

**Data:** 21.04.2026
**Decizie Owner:** DA, se aplică prorata la upgrade
**Status:** DE IMPLEMENTAT

## Mecanism

La upgrade de la pachetul X la pachetul Y:
1. Se calculează **zilele rămase** din abonamentul curent
2. Se calculează **credit prorata** = (preț X / 30) × zile rămase
3. **Diferență servicii** = preț servicii Y - preț servicii X (deja plătit)
4. **Abonament nou** = proporție din abonamentul Y pe zilele rămase
5. **Rest de plată** = diferență servicii + abonament nou - credit prorata
6. Opțional: + pachete credite suplimentare

## Câmpuri necesare (din 04_schema_db.md)
- `ServicePurchase.activatedAt` — data activării pachetului curent
- `ServicePurchase.validUntil` — data expirării (activatedAt + 30 zile sau + 365 zile)
- `ServicePurchase.priceRON` — prețul plătit (există deja)

## Comunicare
- Pe cardurile superioare (nepurchased): badge mic "Upgrade"
- Text sub carduri active: "Click pe un pachet superior pentru upgrade"
- În calculator upgrade: "Rest de plată după prorata din abonamentul curent"

## Decizie Owner (21.04.2026)
- La upgrade: **storno perioada neconsumată** din abonamentul curent
- Serviciile sunt one-time (plătite = consumate, nu se stornează)
- Abonamentul e recurent → se stornează prorata zilelor rămase
- Apoi se facturează prețul ÎNTREG al noului pachet (servicii + abonament)
- Creditele rămase se păstrează

## Implementare curentă (simplificată)
- Diferență servicii: preț nou - preț curent = rest de plată
- Abonament: nu se taxează din nou la upgrade (rămâne cel curent)
- Storno real cu credit note + factură nouă = de implementat cu facturier RO

## De implementat cu COG/CFO
- Storno real: Stripe refund parțial pe zilele rămase + checkout nou preț întreg
- Integrare facturier RO: credit note + factură nouă
- Ce se întâmplă cu creditele rămase (se păstrează)
