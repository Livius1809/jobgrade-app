/**
 * Email templates for JobGrade platform.
 *
 * Each function returns { subject, html } — the caller (email.ts) passes them
 * to Resend.  All content is in Romanian, inline-styled for email clients.
 *
 * Conventions:
 *   - No comma before "și"
 *   - No American superlatives ("Perfect!", "Amazing!")
 *   - Professional, warm, honest tone
 *   - Indigo #4F46E5 accent, CTA orange #E85D43
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// ── Shared layout pieces ──────────────────────────────────────────

function header(subtitle?: string): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#4F46E5;padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">JobGrade</h1>
      ${subtitle ? `<p style="margin:6px 0 0;color:#C7D2FE;font-size:13px;">${subtitle}</p>` : ""}
    </div>
    <div style="padding:32px;">`
}

function footerTransactional(): string {
  return `
    </div>
    <div style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
      <p style="margin:0;color:#9CA3AF;font-size:11px;">
        JobGrade.ro — Evaluare și ierarhizare posturi<br>
        Psihobusiness Consulting SRL
      </p>
    </div>
  </div>
</body>
</html>`
}

function footerMarketing(): string {
  return `
    </div>
    <div style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
      <p style="margin:0;color:#9CA3AF;font-size:11px;line-height:1.6;">
        Psihobusiness Consulting SRL — servicii de consultanță organizațională<br>
        <a href="https://jobgrade.ro" style="color:#4F46E5;">jobgrade.ro</a>
      </p>
      <p style="margin:8px 0 0;color:#D1D5DB;font-size:10px;">
        Dacă nu doriți să mai primiți mesaje comerciale de la noi,
        <a href="${APP_URL}/unsubscribe?ref={{UNSUBSCRIBE_TOKEN}}" style="color:#D1D5DB;">dezabonați-vă aici</a>.
      </p>
    </div>
  </div>
</body>
</html>`
}

function ctaButton(href: string, label: string): string {
  return `
      <a href="${href}"
         style="display:inline-block;background:#E85D43;color:#ffffff;text-decoration:none;
                padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
        ${label}
      </a>`
}

function p(text: string): string {
  return `<p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 16px;">${text}</p>`
}

function h2(text: string): string {
  return `<h2 style="margin:0 0 12px;font-size:18px;color:#111827;">${text}</h2>`
}

function muted(text: string): string {
  return `<p style="color:#9CA3AF;font-size:12px;margin:24px 0 0;line-height:1.5;">${text}</p>`
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTIONAL TEMPLATES
// ═══════════════════════════════════════════════════════════════════

/**
 * Welcome email — sent right after account creation.
 */
export function welcomeEmail(
  firstName: string,
  tenantName: string,
): { subject: string; html: string } {
  const loginUrl = `${APP_URL}/login`

  const html = `${header("Platforma de evaluare și ierarhizare posturi")}
      ${h2(`Bine ai venit, ${firstName}!`)}
      ${p(`Contul tău în organizația <strong>${tenantName}</strong> a fost creat cu succes pe platforma JobGrade.`)}
      ${p(`De aici înainte poți accesa sesiunile de evaluare, poți consulta rapoartele de ierarhizare și poți colabora cu echipa ta direct din platformă.`)}
      ${p(`Pentru a începe, autentifică-te folosind butonul de mai jos:`)}
      ${ctaButton(loginUrl, "Intră în cont")}
      ${muted(`Dacă nu ai solicitat crearea acestui cont, poți ignora acest email sau ne poți contacta la <a href="mailto:suport@jobgrade.ro" style="color:#4F46E5;">suport@jobgrade.ro</a>.`)}
    ${footerTransactional()}`

  return {
    subject: `Bine ai venit pe JobGrade — ${tenantName}`,
    html,
  }
}

/**
 * Password reset — forgot password flow.
 */
export function passwordResetEmail(
  firstName: string,
  resetLink: string,
): { subject: string; html: string } {
  const html = `${header()}
      ${h2("Resetare parolă")}
      ${p(`Salut ${firstName}, am primit o cerere de resetare a parolei pentru contul tău JobGrade.`)}
      ${p(`Apasă butonul de mai jos pentru a seta o parolă nouă. Link-ul este valid <strong>1 oră</strong>.`)}
      ${ctaButton(resetLink, "Resetează parola")}
      ${muted(`Dacă nu ai solicitat resetarea parolei, ignoră acest email — contul tău rămâne în siguranță.`)}
      ${muted(`Dacă butonul nu funcționează, copiază link-ul:<br><a href="${resetLink}" style="color:#4F46E5;word-break:break-all;">${resetLink}</a>`)}
    ${footerTransactional()}`

  return {
    subject: "Resetare parolă — JobGrade",
    html,
  }
}

/**
 * Evaluation invite — a committee member is invited to evaluate jobs in a session.
 */
export function evaluationInviteEmail(
  firstName: string,
  sessionName: string,
  inviteLink: string,
): { subject: string; html: string } {
  const html = `${header("Sesiune de evaluare")}
      ${h2(`${firstName}, ai fost desemnat evaluator`)}
      ${p(`Sesiunea de evaluare <strong>„${sessionName}"</strong> a fost lansată și tu faci parte din comitetul de evaluare.`)}
      ${p(`Accesează sesiunea pentru a vedea posturile alocate și pentru a completa evaluările. Fiecare evaluare contează pentru construirea unei ierarhii corecte.`)}
      ${ctaButton(inviteLink, "Mergi la sesiune")}
      ${muted(`Dacă ai întrebări despre proces, contactează coordonatorul sesiunii sau echipa de suport JobGrade.`)}
    ${footerTransactional()}`

  return {
    subject: `Sesiune de evaluare: ${sessionName}`,
    html,
  }
}

/**
 * Evaluation complete — the evaluation session finished; report is ready.
 */
export function evaluationCompleteEmail(
  firstName: string,
  sessionName: string,
  reportLink: string,
): { subject: string; html: string } {
  const html = `${header("Raport disponibil")}
      ${h2("Evaluarea s-a încheiat")}
      ${p(`Salut ${firstName}, sesiunea de evaluare <strong>„${sessionName}"</strong> a fost finalizată.`)}
      ${p(`Raportul de ierarhizare este gata și poate fi consultat din platformă. Acolo vei găsi scorurile consolidate, gradele rezultate și detaliile pe criterii.`)}
      ${ctaButton(reportLink, "Vezi raportul")}
      ${muted(`Raportul este disponibil doar pentru utilizatorii cu acces la această sesiune.`)}
    ${footerTransactional()}`

  return {
    subject: `Raport finalizat: ${sessionName} — JobGrade`,
    html,
  }
}

// ═══════════════════════════════════════════════════════════════════
// MARKETING / SALES TEMPLATES
// ═══════════════════════════════════════════════════════════════════

/**
 * Demo follow-up — sent after a prospect attends a demo.
 */
export function demoFollowUpEmail(
  firstName: string,
  companyName: string,
  demoDate: string,
): { subject: string; html: string } {
  const html = `${header("Evaluare și ierarhizare posturi")}
      ${p(`Bună ziua ${firstName},`)}
      ${p(`Vă mulțumim pentru timpul acordat în cadrul prezentării din ${demoDate}. Sperăm că ați reușit să vă faceți o imagine clară asupra modului în care JobGrade poate sprijini procesul de ierarhizare a posturilor din ${companyName}.`)}
      ${p(`Dacă aveți întrebări suplimentare sau doriți să discutăm despre un proiect pilot adaptat specificului organizației dumneavoastră, ne puteți contacta oricând.`)}
      ${p(`Între timp, vă lăsăm acces la un cont de test unde puteți explora platforma în ritmul propriu:`)}
      ${ctaButton(`${APP_URL}/demo?company=${encodeURIComponent(companyName)}`, "Accesează contul de test")}
      <p style="margin:28px 0 0;font-size:14px;color:#374151;">
        Cu stimă,<br>
        <strong>Echipa JobGrade</strong>
      </p>
    ${footerMarketing()}`

  return {
    subject: `Următorii pași după prezentarea JobGrade — ${companyName}`,
    html,
  }
}

/**
 * Trial expiring — reminder that the free trial is about to end.
 */
export function trialExpiringEmail(
  firstName: string,
  daysLeft: number,
): { subject: string; html: string } {
  const urgency = daysLeft <= 1 ? "mâine" : `în ${daysLeft} zile`
  const urgencyColor = daysLeft <= 3 ? "#DC2626" : "#4B5563"

  const html = `${header()}
      ${h2("Perioada de test se apropie de final")}
      ${p(`Salut ${firstName},`)}
      <p style="color:${urgencyColor};font-size:14px;line-height:1.6;margin:0 0 16px;font-weight:600;">
        Contul tău de test JobGrade expiră ${urgency}.
      </p>
      ${p(`După expirare, datele introduse și evaluările create vor fi păstrate încă 30 de zile — suficient timp să decizi dacă platforma se potrivește nevoilor tale.`)}
      ${p(`Dacă dorești să continui, poți activa un abonament direct din platformă. Dacă ai nevoie de mai mult timp sau ai întrebări, răspunde la acest email — te ajutăm.`)}
      ${ctaButton(`${APP_URL}/settings/billing`, "Activează abonamentul")}
      <p style="margin:28px 0 0;font-size:14px;color:#374151;">
        Cu stimă,<br>
        <strong>Echipa JobGrade</strong>
      </p>
    ${footerMarketing()}`

  return {
    subject: daysLeft <= 1
      ? "Ultima zi de test JobGrade — contul tău expiră mâine"
      : `Contul tău de test JobGrade expiră în ${daysLeft} zile`,
    html,
  }
}
