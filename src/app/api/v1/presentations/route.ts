/**
 * GET /api/v1/presentations?topic=job-evaluation
 *
 * Generează prezentare PDF contextual per temă B2B.
 * SOA oferă proactiv: "Pot să vă pregătesc o prezentare pe această temă?"
 *
 * Topics disponibile:
 * - job-evaluation: Evaluarea și ierarhizarea posturilor
 * - pay-gap: Transparența salarială — Directiva EU 2023/970
 * - pricing: Pachete și prețuri JobGrade
 * - organizational: Dezvoltare organizațională
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"

export const dynamic = "force-dynamic"

interface PresentationSlide {
  title: string
  content: string[]
  highlight?: string
}

interface Presentation {
  title: string
  subtitle: string
  slides: PresentationSlide[]
  footer: string
}

// ═══════════════════════════════════════════════════════════════
// PREZENTĂRI PER TEMĂ
// ═══════════════════════════════════════════════════════════════

const PRESENTATIONS: Record<string, Presentation> = {
  "job-evaluation": {
    title: "Evaluarea și ierarhizarea posturilor",
    subtitle: "Cum funcționează și de ce contează pentru organizația dumneavoastră",
    slides: [
      {
        title: "De ce evaluarea posturilor?",
        content: [
          "Fiecare post dintr-o organizație are o valoare relativă — determină contribuția la obiectivele de business.",
          "Fără evaluare obiectivă, deciziile salariale se bazează pe negociere individuală, vechime sau percepții subiective.",
          "Directiva EU 2023/970 privind transparența salarială impune ca remunerarea să fie bazată pe criterii obiective.",
        ],
        highlight: "Evaluarea posturilor nu evaluează oameni — evaluează cerințele poziției.",
      },
      {
        title: "Cum funcționează?",
        content: [
          "Fiecare post este analizat pe 4 criterii conform legislației europene: cunoștințe și competențe, responsabilitate, efort și condiții de muncă.",
          "Evaluarea se face pe baza fișei postului — ce cere poziția, nu cine o ocupă.",
          "Rezultatul: un scor per post care determină clasa salarială.",
        ],
      },
      {
        title: "Procesul de evaluare",
        content: [
          "Pasul 1: Documentarea posturilor — fișe de post actualizate cu responsabilități, cerințe și context.",
          "Pasul 2: Evaluarea pe criterii — fiecare post primește un scor bazat pe analiza cerințelor.",
          "Pasul 3: Ierarhizarea — posturile se ordonează funcție de scor, se creează clase salariale.",
          "Pasul 4: Validarea — rezultatele sunt revizuite de management pentru coerență.",
        ],
      },
      {
        title: "Ce obțineți concret",
        content: [
          "Structură salarială transparentă și conformă cu legislația.",
          "Eliminarea decalajelor salariale nejustificate.",
          "Bază obiectivă pentru negocieri salariale și promovări.",
          "Conformitate cu Directiva EU 2023/970 (termen de transpunere în legislația națională).",
          "Reducerea riscului juridic — sarcina probei inversată: angajatorul trebuie să demonstreze echitatea.",
        ],
      },
      {
        title: "De ce JobGrade?",
        content: [
          "Platformă specializată, dezvoltată de personal acreditat în psihologia muncii.",
          "Proces asistat de AI — rapiditate fără a compromite calitatea.",
          "Conformitate integrată — legislația muncii și Directiva EU 2023/970.",
          "Diagnostic gratuit — vedeți cum arată pe datele organizației dumneavoastră, fără obligații.",
        ],
        highlight: "Puteți testa gratuit pe jobgrade.ro/b2b/sandbox",
      },
    ],
    footer: "Psihobusiness Consulting SRL — Personal acreditat în psihologia muncii | jobgrade.ro",
  },

  "pay-gap": {
    title: "Transparența salarială",
    subtitle: "Directiva EU 2023/970 — ce trebuie să știți și cum vă pregătiți",
    slides: [
      {
        title: "Ce prevede Directiva EU 2023/970?",
        content: [
          "Transparența salarială devine obligatorie pentru companiile din Uniunea Europeană.",
          "Angajatorii trebuie să asigure remunerare egală pentru muncă egală sau de valoare egală.",
          "Companiile cu peste 100 de angajați trebuie să raporteze decalajele salariale pe gen.",
          "Sarcina probei este inversată: angajatorul trebuie să demonstreze că nu discriminează.",
        ],
        highlight: "România urmează să transpună directiva în legislația națională.",
      },
      {
        title: "Ce este decalajul salarial (pay gap)?",
        content: [
          "Diferența procentuală între remunerația medie a bărbaților și a femeilor.",
          "Se calculează pe salariu de bază și pe remunerație totală (inclusiv bonusuri, beneficii).",
          "Un decalaj de peste 5% pe aceeași clasă salarială necesită evaluare comună cu reprezentanții angajaților.",
          "Nu orice diferență salarială este discriminare — dar trebuie justificată obiectiv.",
        ],
      },
      {
        title: "Cum vă ajută JobGrade?",
        content: [
          "Evaluarea posturilor pe criterii obiective — fundament pentru clase salariale corecte.",
          "Raport pay gap automat — identifică decalajele pe gen, departament, clasă salarială.",
          "Calendar obligații legale — ce termene aveți de respectat.",
          "Simulări — impact modificări salariale pe buget și conformitate.",
          "Rapoarte conforme pentru autorități — documentație gata de utilizat.",
        ],
        highlight: "Conformitatea nu e un cost — e o investiție în protecția organizației.",
      },
    ],
    footer: "Psihobusiness Consulting SRL | jobgrade.ro",
  },

  "pricing": {
    title: "Pachete și prețuri JobGrade",
    subtitle: "Transparență, flexibilitate, valoare",
    slides: [
      {
        title: "Cum funcționează",
        content: [
          "Trei variante de abonament adaptate necesităților organizației dumneavoastră.",
          "Serviciile se plătesc cu credite — fiecare serviciu are un cost transparent.",
          "Cu cât abonamentul e mai mare, cu atât prețul per credit scade.",
          "Creditele nu expiră niciodată. Puteți schimba abonamentul oricând.",
        ],
      },
      {
        title: "Ce este inclus în abonament",
        content: [
          "Acces la portal — platforma completă, disponibilă 24/7.",
          "Găzduire securizată a datelor — conforme GDPR, stocate în UE.",
          "Suport tehnic și funcțional.",
          "Minute de consultanță cu specialist HR, incluse lunar.",
          "Actualizări legislative automate.",
        ],
      },
      {
        title: "Diagnostic gratuit",
        content: [
          "Puteți experimenta platforma pe datele organizației dumneavoastră.",
          "Fără cont, fără obligații, fără card.",
          "Primiți: structura organizațională analizată, obligații legale aplicabile, recomandări.",
          "Dacă doriți să continuați, datele se păstrează automat la crearea contului.",
        ],
        highlight: "jobgrade.ro/b2b/sandbox — diagnostic gratuit, acum",
      },
    ],
    footer: "Psihobusiness Consulting SRL | CIF RO15790994 | jobgrade.ro",
  },

  "organizational": {
    title: "Dezvoltare organizațională",
    subtitle: "De la structurare la competitivitate — un parcurs natural",
    slides: [
      {
        title: "Cele 4 niveluri de dezvoltare",
        content: [
          "Organizare: structura posturilor, evaluare, ierarhizare, stat de funcții.",
          "Conformitate: grilă salarială, pay gap, obligații legale, calendar conformitate.",
          "Competitivitate: KPI, benchmark salarial, pachete compensații, procese calitate.",
          "Dezvoltare: cultură organizațională, plan intervenție, monitorizare, evoluție.",
        ],
        highlight: "Fiecare nivel se construiește pe cel anterior — nu se sare.",
      },
      {
        title: "Ce câștigați la fiecare nivel",
        content: [
          "Organizare: claritate — fiecare angajat știe ce se așteaptă de la el.",
          "Conformitate: protecție — organizația e pregătită pentru orice audit sau inspecție.",
          "Competitivitate: performanță — atrageți și rețineți talentele prin compensare corectă.",
          "Dezvoltare: evoluție — organizația se adaptează și crește natural.",
        ],
      },
    ],
    footer: "Psihobusiness Consulting SRL | jobgrade.ro",
  },
}

// ═══════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  // Prezentările sunt publice — nu necesită auth
  const url = new URL(req.url)
  const topic = url.searchParams.get("topic") || "job-evaluation"
  const format = url.searchParams.get("format") || "json"

  const presentation = PRESENTATIONS[topic]
  if (!presentation) {
    return NextResponse.json({
      error: "Temă necunoscută",
      available: Object.keys(PRESENTATIONS),
    }, { status: 404 })
  }

  if (format === "html") {
    // Returnează HTML gata de print/save as PDF
    const html = generatePresentationHTML(presentation)
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="JobGrade-${topic}.html"`,
      },
    })
  }

  return NextResponse.json({
    topic,
    ...presentation,
    downloadUrl: `/api/v1/presentations?topic=${topic}&format=html`,
    availableTopics: Object.keys(PRESENTATIONS),
  })
}

function generatePresentationHTML(p: Presentation): string {
  const slidesHtml = p.slides.map((slide, i) => `
    <div class="slide" ${i > 0 ? 'style="page-break-before: always"' : ''}>
      <div class="slide-number">${i + 1} / ${p.slides.length}</div>
      <h2>${slide.title}</h2>
      <ul>
        ${slide.content.map(c => `<li>${c}</li>`).join("\n")}
      </ul>
      ${slide.highlight ? `<div class="highlight">${slide.highlight}</div>` : ""}
    </div>
  `).join("\n")

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<title>${p.title} — JobGrade</title>
<style>
  @page { size: A4 landscape; margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; }

  .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; page-break-after: always; }
  .cover h1 { font-size: 36px; margin-bottom: 12px; }
  .cover p { font-size: 18px; opacity: 0.9; max-width: 600px; }
  .cover .logo { font-size: 14px; opacity: 0.6; margin-top: 40px; }

  .slide { height: 100vh; padding: 60px; display: flex; flex-direction: column; justify-content: center; position: relative; }
  .slide h2 { font-size: 28px; color: #4F46E5; margin-bottom: 30px; }
  .slide ul { list-style: none; padding: 0; }
  .slide li { font-size: 16px; line-height: 1.8; padding: 8px 0; padding-left: 24px; position: relative; color: #374151; }
  .slide li::before { content: "—"; position: absolute; left: 0; color: #4F46E5; font-weight: bold; }

  .highlight { margin-top: 30px; padding: 16px 24px; background: #EEF2FF; border-left: 4px solid #4F46E5; border-radius: 0 8px 8px 0; font-size: 14px; color: #4338CA; font-weight: 600; }

  .slide-number { position: absolute; top: 30px; right: 40px; font-size: 12px; color: #9CA3AF; }

  .footer-slide { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: #F9FAFB; page-break-before: always; }
  .footer-slide h2 { font-size: 24px; color: #4F46E5; margin-bottom: 20px; }
  .footer-slide p { font-size: 14px; color: #6B7280; margin: 4px 0; }
  .footer-slide .cta { margin-top: 30px; padding: 12px 32px; background: #4F46E5; color: white; border-radius: 8px; font-size: 16px; font-weight: 600; text-decoration: none; }

  @media print {
    .cover, .slide, .footer-slide { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="cover">
    <h1>${p.title}</h1>
    <p>${p.subtitle}</p>
    <div class="logo">JobGrade — Psihobusiness Consulting SRL</div>
  </div>

  ${slidesHtml}

  <div class="footer-slide">
    <h2>Vreți să vedeți cum funcționează pe datele dumneavoastră?</h2>
    <p>Diagnostic organizațional gratuit, fără cont, fără obligații.</p>
    <a class="cta" href="https://jobgrade.ro/b2b/sandbox">jobgrade.ro/b2b/sandbox</a>
    <p style="margin-top: 30px; font-size: 12px; color: #9CA3AF;">${p.footer}</p>
  </div>
</body>
</html>`
}
