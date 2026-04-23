/**
 * Infuzie COG — Sesiunea 3, 23.04.2026
 * Portal gaps, Pachet 1 la gata, design pipeline, pricing aliniat
 */
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9zuVxY2XmZbe@ep-odd-water-alccgot0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const entries = [
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S3] 7 gap-uri portal UX rezolvate pentru Pachet 1.

1. PROGRES COMISIE DIN PORTAL: CommitteeProgressView — mini-dashboard live în EvaluationPanel când sesiunea e IN_PROGRESS. Arată per-membru: progres (submitted/total), dot colorat status, progress bar, deadline alert. Polling 15s. Auto-tranziție la results când toți termină.

2. CREDIT COST PE EXPORT: Butoanele PDF/Excel/JSON/XML arată costul în credite (ex: "PDF (5cr)") + confirmare dialog înainte de deducere.

3. CERINȚA MINIM 2 POZIȚII: Mesaj "X/2 poziții adăugate" pe tab Posturi + evaluare locked cu mesaj explicit când < 2. Anterior era 3, acum 2 (corect per metodologie).

4. PRE-FLIGHT CREDITE: La lansare sesiune comisie, verifică soldul ÎNAINTE de creare. Mesaj explicit cu sold actual vs necesar.

5. REZULTATE INTERACTIV: Click pe post în tabelul ierarhie → expand cu breakdown 6 criterii (litere per criteriu). React.Fragment cu toggle.

6. IMPORT PREVIEW EDITABIL: La import stat funcții, pozițiile extrase sunt editabile inline (input per câmp) + buton ștergere per poziție ÎNAINTE de salvare.

7. LAYER HEADER: EvaluationPanel arată "Nivel X: Nume" + features + credite disponibile în header-ul secțiunii "Alegeți varianta".`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["portal-ux", "gap-uri", "pachet1", "23apr2026-s3"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S3] Pachet 1 "Ordine internă" — COMPLET, gata de producție.

SEMNĂTURĂ ELECTRONICĂ + OLOGRAFĂ:
- SignatureCanvas: canvas HTML5 cu suport mouse + touch, export base64 PNG
- Endpoint /api/v1/sessions/[id]/sign (POST semnare + GET verificare status)
- Pagina /sessions/[id]/sign cu declarație, canvas, confirmare
- Câmp signatureData (Text) + signedAt pe EvaluationSession
- Doar OWNER/COMPANY_ADMIN pot semna
- Tranziție automată → VALIDATED la semnare

RDA ELEMENTE LEGALE:
- Pagina 1: copertă + CUI + adresă companie + badge CONFIDENȚIAL
- Pagina 2: metodologie (4 criterii principale + 6 subcriterii explicate)
- Pagina 3: ierarhia posturilor (tabel complet)
- Pagina 4+: fișe de post (scop, responsabilități, cerințe per post)
- Pagina finală: semnătură + ștampilă + declarație + nota jurnal anexă
- Disclaimer confidențialitate pe fiecare pagină

VALIDARE SERVER-SIDE:
- Modul 1: minim 2 poziții + 2 salariați (ierarhizare)
- Modul 2+: minim 1 salariat (pay gap — chiar și 1 angajat ≠ administrator)`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["pachet1-complet", "semnatura", "rda-legal", "23apr2026-s3"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S3] Design pipeline Adobe → Cod — DECIZIE ARHITECTURALĂ.

PIPELINE APROBAT:
1. Illustrator → SVG icons → public/icons/ → <Icon name="..." size={24} />
2. InDesign → HTML template → src/templates/reports/{name}/ → Puppeteer → PDF pixel-perfect
3. Dreamweaver → HTML/CSS interfață → integrate în Next.js components
4. Photoshop → WebP imagini → public/images/

INFRASTRUCTURĂ LIVRATĂ:
- puppeteer-core instalat (v24)
- renderHtmlToPdf() utilitar cu detectare Chrome multi-platform + serverless
- loadTemplate() + interpolare {{variabile}} din HTML InDesign
- wrapHtmlTemplate() pentru documente complete
- Icon component (img + InlineIcon variante)
- Template RDA placeholder (4 pagini HTML+CSS)
- 6 SVG placeholder icons
- Design guide complet: src/templates/DESIGN-GUIDE.md

OWNER ARE SUITA ADOBE COMPLETĂ: InDesign, Illustrator, Dreamweaver, Photoshop + restul.

MasterReportWrapper mutat din /app/demo/ în /components/reports/ (nu era demo, e production).`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["design-pipeline", "adobe", "puppeteer", "23apr2026-s3"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S3] PRICING ALINIAT — corecție critică.

CE S-A SCHIMBAT:
- SCOS toate prețurile fixe vechi (90/112/150/200 RON/poziție) din B2B landing, PackageExplorer, commercial-knowledge
- SCOS "per poziție, nu per angajat" — INCORECT. Formula include AMBELE (poziții + salariați)
- B2B JE landing: 4 carduri (Ordine internă, Conformitate, Competitivitate, Dezvoltare) fără prețuri fixe
- CTA: "Calculator preț gratuit" — redirect la portal unde calculatorul arată costul real
- PackageExplorer: "Calculator personalizat" pe toate nivelurile
- commercial-knowledge.ts: actualizat pentru agenții AI — nu mai comunică prețuri fixe

SURSA DE ADEVĂR: pricing.ts cu funcția calcLayerCredits(layer, positions, employees)
- Baza: 60×poz + 12×poz + 20+1×ang
- Conformitate: + 15+0.5×ang + 30+1.5×poz
- Competitivitate: + 25+1×poz + 15×ang + 40
- Dezvoltare: + 40+1×ang + 60×proiecte + 20+1.5×poz
- 1 credit = 8 RON, discount volum automat (12% Professional, 25% Enterprise)

REGULĂ: Orice agent care comunică prețuri TREBUIE să direcționeze clientul la calculatorul din portal, NU să spună prețuri fixe.`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["pricing-aliniat", "corectie-critica", "23apr2026-s3"],
  },
  {
    agentRole: "COG",
    kbType: "PERMANENT",
    content: `[SESIUNE 23.04.2026-S3] STATUS COMPLET SESIUNE — 5 commit-uri.

COMMIT-URI:
1. e2c4a76 — Bloc 3+4 evaluare comisie + 9 task-uri (mediere AI, ghidaj scorare, jurnal, dashboard, email)
2. e892a68 — 7 gap-uri portal UX + infuzie COG (8 entries)
3. dbecc47 — Pachet 1 la gata (semnătură, RDA legal, minim 2 poz, Puppeteer)
4. 98d387e — Design pipeline Adobe (Icon, template loader, RDA template, design guide)
5. 60eb01a — Pricing aliniat (scos prețuri fixe vechi, formula reală)

LIVRABILE TOTALE SESIUNE:
- 10+ API routes noi
- 7 componente noi (GroupDiscussionView, DiscussionPanel, PostConsensusValidation, SessionJournal, AdminProgressDashboard, SignatureCanvas, Icon)
- 5 pagini noi (discussion, validate, journal, sign + design templates)
- 2 funcții email noi (onboarding comisie + reminder cron)
- Schema: DiscussionComment, MemberValidation, Vote.round, signatureData
- Infrastructură: Puppeteer, template loader, SVG icons
- Pricing aliniat pe tot stack-ul`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["status-sesiune", "commit-uri", "rezumat", "23apr2026-s3"],
  },

  // ── SOA — regula pricing pentru agenți client-facing ──
  {
    agentRole: "SOA",
    kbType: "PERMANENT",
    content: `[23.04.2026] REGULĂ PRICING: Nu comunica prețuri fixe per poziție. Costul se calculează pe baza numărului de POZIȚII DISTINCTE din statul de funcții ȘI a numărului de SALARIAȚI. Direcționează clientul la calculatorul de preț din portal. Discount volum automat pe baza dimensiunii organizației.`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["pricing", "regula-comunicare", "23apr2026-s3"],
  },
  {
    agentRole: "MKA",
    kbType: "PERMANENT",
    content: `[23.04.2026] REGULĂ PRICING MARKETING: Scoase prețurile fixe (90-200 RON/poz) din toate materialele. Costul depinde de poziții + salariați. CTA: "Calculator preț gratuit" → portal. NU se mai comunică "per poziție, nu per angajat" — formula include AMBELE. Materialele trebuie actualizate.`,
    source: "EXPERT_HUMAN",
    confidence: 1.0,
    status: "PERMANENT",
    tags: ["pricing", "marketing", "23apr2026-s3"],
  },
]

async function main() {
  console.log(`Infuzie COG+SOA+MKA: ${entries.length} entries...`)

  for (const entry of entries) {
    await prisma.kBEntry.create({
      data: {
        agentRole: entry.agentRole,
        kbType: entry.kbType,
        content: entry.content,
        source: entry.source,
        confidence: entry.confidence,
        status: entry.status,
        tags: entry.tags,
      },
    })
    console.log(`  ✓ ${entry.agentRole}: ${entry.tags[0]}`)
  }

  console.log(`\nInfuzie completă: ${entries.length} entries persistate.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
