# Redesign Owner Dashboard — Viziune Owner 22.04.2026

## Structura nouă — 3 secțiuni

### I. DINAMICI — Situație internă + externă
Tabloul complet: ce se întâmplă în organism și în mediul extern.
Relația de cauzalitate între cele două.

**Include:**
- Sănătate organism (pulse simplificat, nu CRITICAL fără context)
- Metrici cheie: autonomie, KB hit rate, cost, task-uri executate
- Semnale externe procesate (legislație, competiție, piață)
- Starea agenților (harta sănătății, nu tabel imens)
- Maturitate per agent (Seed%, KB Hit%, Maturitate globală)
- Tendință: crește/scade/stabil per indicator

### II. DECIZII OWNER
Unde intervine Owner-ul și ce trebuie să decidă.

**Include:**
- Inbox decizii (ce "necesită decizia conducerii" — doar strategic, nu tech)
- Propuneri de la COG care așteaptă aprobare
- Decizii recente (ce s-a decis, de cine, când)
- Principii active (link la docs/sops/cog-principles-owner-22apr2026.md)

### III. INTERACȚIUNE CU STRUCTURA
Cum comunică Owner-ul cu organismul.

**Include:**
- Chat COG (consilier strategic — deja există)
- Discuție cu echipa (nivel ierarhic, departament, individual)
- Biblioteca echipei (documente partajate)
- Rapoarte (link-uri la rapoarte detaliate)
- Controluri organism (toggle-uri, conturi pilot)

## Principii design
- **Document coerent** — nu colecție de secțiuni
- **Cuprins click-abil** la început — acces rapid la orice secțiune
- **Zero redundanțe** — fiecare informație apare O DATĂ
- **Flaguri noutăți** — ce s-a schimbat de la ultima vizită
- **Ștergere informații vechi** — buton de dismiss pe notificări/semnale procesate
- **Cauzalitate vizibilă** — dacă un indicator e roșu, arată DE CE
- **Fără CRITICAL sperietor** — context: ce înseamnă, ce e de făcut

## Ce se păstrează din dashboard-ul actual
- Chat COG (dreapta)
- Pipeline inteligent (metrici bune)
- Rapoarte (link-uri)
- Controluri organism
- Conturi pilot

## Ce se elimină/mută
- "necesită decizia conducerii" x10 → COG rezolvă, nu Owner
- Secțiuni redundante (KB apare în 3 locuri diferit)
- Vital signs CRITICAL fără context actionabil
- Tabel imens agenți (merge în raport dedicat, nu pe dashboard)
