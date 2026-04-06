import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? "JobGrade <noreply@jobgrade.ro>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// ── Invite user ────────────────────────────────────────────────────
export async function sendInviteEmail({
  to,
  firstName,
  inviterName,
  companyName,
  token,
}: {
  to: string
  firstName: string
  inviterName: string
  companyName: string
  token: string
}) {
  const activateUrl = `${APP_URL}/activate?token=${token}`

  const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#4F46E5;padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">JobGrade</h1>
      <p style="margin:6px 0 0;color:#C7D2FE;font-size:13px;">Platforma de evaluare și ierarhizare posturi</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Bun venit, ${firstName}!</h2>
      <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong>${inviterName}</strong> te-a invitat să te alături organizației
        <strong>${companyName}</strong> pe platforma JobGrade.
      </p>
      <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Apasă butonul de mai jos pentru a-ți activa contul și a seta parola.
        Link-ul expiră în <strong>7 zile</strong>.
      </p>
      <a href="${activateUrl}"
         style="display:inline-block;background:#E85D43;color:#ffffff;text-decoration:none;
                padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
        Activează contul
      </a>
      <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0;line-height:1.5;">
        Dacă nu poți apăsa butonul, copiază link-ul:<br>
        <a href="${activateUrl}" style="color:#4F46E5;word-break:break-all;">${activateUrl}</a>
      </p>
    </div>
    <div style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
      <p style="margin:0;color:#9CA3AF;font-size:11px;">
        Ai primit acest email deoarece cineva te-a invitat pe JobGrade.ro.
        Dacă nu te așteptai la această invitație, poți ignora acest email.
      </p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Invitație JobGrade — ${companyName}`,
    html,
  })
}

// ── Session evaluation notification ────────────────────────────────
export async function sendSessionInviteEmail({
  to,
  firstName,
  sessionName,
  deadline,
  sessionId,
}: {
  to: string
  firstName: string
  sessionName: string
  deadline?: Date
  sessionId: string
}) {
  const sessionUrl = `${APP_URL}/app/sessions/${sessionId}`
  const deadlineStr = deadline
    ? deadline.toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null

  const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#4F46E5;padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">JobGrade</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Ai fost invitat să evaluezi, ${firstName}!</h2>
      <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Sesiunea de evaluare <strong>„${sessionName}"</strong> a fost lansată.
        Ești desemnat evaluator și trebuie să completezi evaluările pentru posturile alocate.
      </p>
      ${
        deadlineStr
          ? `<p style="color:#DC2626;font-size:14px;font-weight:600;margin:0 0 20px;">
              Termen limită: ${deadlineStr}
             </p>`
          : ""
      }
      <a href="${sessionUrl}"
         style="display:inline-block;background:#E85D43;color:#ffffff;text-decoration:none;
                padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
        Mergi la sesiune →
      </a>
    </div>
    <div style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
      <p style="margin:0;color:#9CA3AF;font-size:11px;">JobGrade.ro — Evaluare și ierarhizare posturi</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Sesiune de evaluare: ${sessionName}`,
    html,
  })
}

// ── Password reset ──────────────────────────────────────────────────
export async function sendPasswordResetEmail({
  to,
  firstName,
  token,
}: {
  to: string
  firstName: string
  token: string
}) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#4F46E5;padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">JobGrade</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Resetare parolă</h2>
      <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Salut ${firstName}, ai solicitat resetarea parolei. Apasă butonul de mai jos.
        Link-ul expiră în <strong>1 oră</strong>.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#E85D43;color:#ffffff;text-decoration:none;
                padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
        Resetează parola
      </a>
      <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0;">
        Dacă nu ai solicitat resetarea parolei, ignoră acest email.
      </p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject: "Resetare parolă JobGrade",
    html,
  })
}

// ── Sales: Outreach (prospecting initial) ─────────────────────────
//
// Template narativ — conținutul e POVESTE, nu template rigid.
// Caller-ul trimite `storyHtml` = corpul complet al emailului, deja calibrat
// prin calibrateCommunication() ÎNAINTE de apel.
//
// Dacă se trimite `hook` (legacy), se folosește structura simplificată.
//
export async function sendOutreachEmail({
  to,
  prospectName,
  subject,
  storyHtml,
  hook,
  ctaUrl,
  ctaLabel,
  senderName,
  senderRole,
}: {
  to: string
  prospectName: string
  subject: string
  /** Corp email complet — narativ, calibrat L1/L2/L3/L4. Prioritar față de hook. */
  storyHtml?: string
  /** Legacy: hook scurt (o propoziție). Folosit doar dacă storyHtml lipsește. */
  hook?: string
  ctaUrl?: string
  ctaLabel?: string
  senderName?: string
  senderRole?: string
}) {
  const demoUrl = ctaUrl ?? `${APP_URL}/b2b`
  const cta = ctaLabel ?? "Programează o discuție"
  const sender = senderName ?? "Echipa JobGrade"
  const role = senderRole ?? ""

  const bodyHtml = storyHtml
    ? storyHtml
    : `<p style="color:#4B5563;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Bună ziua,
      </p>
      <p style="color:#4B5563;font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${hook ?? ""}
      </p>`

  const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#4F46E5;padding:18px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:17px;font-weight:700;font-family:Arial,sans-serif;">JobGrade</h1>
      <p style="margin:4px 0 0;color:#C7D2FE;font-size:11px;font-family:Arial,sans-serif;">Evaluare și ierarhizare posturi</p>
    </div>
    <div style="padding:32px;font-size:14px;line-height:1.75;color:#374151;">
      ${bodyHtml}
      <div style="margin:28px 0 0;">
        <a href="${demoUrl}"
           style="display:inline-block;background:#E85D43;color:#ffffff;text-decoration:none;
                  padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;font-family:Arial,sans-serif;">
          ${cta}
        </a>
      </div>
      <p style="margin:28px 0 0;font-size:14px;color:#374151;">
        Cu stimă,<br>
        <strong>${sender}</strong>${role ? `<br><span style="font-size:13px;color:#6B7280;">${role}</span>` : ""}
      </p>
    </div>
    <div style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-family:Arial,sans-serif;">
      <p style="margin:0;color:#9CA3AF;font-size:11px;line-height:1.6;">
        Psihobusiness Consulting SRL — servicii de consultanță organizațională<br>
        <a href="https://jobgrade.ro" style="color:#4F46E5;">jobgrade.ro</a>
        &nbsp;|&nbsp;
        <a href="https://psihobusiness.ro" style="color:#9CA3AF;">psihobusiness.ro</a>
      </p>
      <p style="margin:8px 0 0;color:#D1D5DB;font-size:10px;">
        Dacă nu doriți să mai primiți mesaje de la noi, vă rugăm să răspundeți cu „dezabonare".
      </p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  })
}

// ── Sales: Follow-up ─────────────────────────────────────────────
export async function sendFollowUpEmail({
  to,
  prospectName,
  followUpNumber,
  subject,
  bodyText,
  ctaUrl,
}: {
  to: string
  prospectName: string
  followUpNumber: number
  subject: string
  bodyText: string
  ctaUrl?: string
}) {
  const demoUrl = ctaUrl ?? `${APP_URL}/demo`

  const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="padding:32px;">
      <p style="color:#4B5563;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Bună ${prospectName},
      </p>
      <p style="color:#4B5563;font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${bodyText}
      </p>
      <a href="${demoUrl}"
         style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;
                padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">
        ${followUpNumber <= 1 ? "Programează demo" : "Hai să discutăm"}
      </a>
    </div>
    <div style="padding:12px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
      <p style="margin:0;color:#9CA3AF;font-size:11px;">
        JobGrade.ro — Evaluare și ierarhizare posturi
      </p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  })
}

// ── Sales: Proposal (ofertă comercială) ───────────────────────────
export async function sendProposalEmail({
  to,
  prospectName,
  prospectCompany,
  planName,
  price,
  features,
  validUntil,
}: {
  to: string
  prospectName: string
  prospectCompany: string
  planName: string
  price: string
  features: string[]
  validUntil: Date
}) {
  const validStr = validUntil.toLocaleDateString("ro-RO", {
    day: "2-digit", month: "long", year: "numeric",
  })

  const featureHtml = features
    .map(f => `<li style="padding:4px 0;color:#374151;">${f}</li>`)
    .join("")

  const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#4F46E5;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Ofertă JobGrade</h1>
      <p style="margin:6px 0 0;color:#C7D2FE;font-size:13px;">pentru ${prospectCompany}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#4B5563;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Bună ${prospectName},
      </p>
      <p style="color:#4B5563;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Conform discuției noastre, vă transmitem oferta pentru platforma JobGrade.
      </p>

      <!-- Plan card -->
      <div style="border:2px solid #4F46E5;border-radius:12px;padding:24px;margin:0 0 24px;">
        <h3 style="margin:0 0 4px;font-size:16px;color:#4F46E5;font-weight:700;">${planName}</h3>
        <p style="margin:0 0 16px;font-size:28px;font-weight:800;color:#111827;">${price}</p>
        <ul style="margin:0;padding:0 0 0 20px;font-size:13px;line-height:1.8;">
          ${featureHtml}
        </ul>
      </div>

      <p style="color:#DC2626;font-size:13px;font-weight:600;margin:0 0 20px;">
        Oferta este valabilă până la ${validStr}.
      </p>

      <a href="${APP_URL}/demo"
         style="display:inline-block;background:#E85D43;color:#ffffff;text-decoration:none;
                padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
        Acceptă oferta
      </a>
    </div>
    <div style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
      <p style="margin:0;color:#9CA3AF;font-size:11px;">
        Psihobusiness Consulting SRL | CIF RO15790994 | JobGrade.ro
      </p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Ofertă JobGrade — ${planName} pentru ${prospectCompany}`,
    html,
  })
}
