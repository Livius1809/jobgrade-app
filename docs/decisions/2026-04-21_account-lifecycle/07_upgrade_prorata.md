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

## De implementat cu COG/CFO
- Formula exactă prorata
- Tratament contabil (stornare parțială + factură nouă)
- Ce se întâmplă cu creditele rămase (se păstrează)
