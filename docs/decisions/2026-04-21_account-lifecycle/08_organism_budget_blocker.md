# BLOCKER: Organismul nu execută — lipsă buget API

**Data:** 21.04.2026
**Status:** BLOCKER ACTIV

## Situație
- 142 task-uri în sistem, 44 blocked pe RESOURCE, 63 overdue
- 0 in progress — nimeni nu execută nimic
- Cauza: nu există buget alocat pentru API Claude (organism)
- Cron-ul rulează dar agenții nu pot procesa

## Impact
- Task-urile lifecycle (COG/CJA/COA/CFO/DMA) nu se procesează
- Ciclurile proactive sunt oprite
- Învățarea agenților e oprită
- Detecția disfuncțiilor e oprită

## Cost estimat
- ~$94/lună pentru organism background (45 agenți, cicluri la 2-4h)
- ~$52/lună infrastructură (Vercel, Neon, Redis)
- Total: ~$146/lună

## Decizie necesară Owner
- Alocăm buget? Cât? $100/lună? $200/lună?
- Sau executăm manual (Claude Code) și oprim cron-urile?
- Sau reducem la cicluri zilnice (nu la 2h)?
