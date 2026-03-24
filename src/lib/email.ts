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
    <div style="background:#1D4ED8;padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">JobGrade</h1>
      <p style="margin:6px 0 0;color:#BFDBFE;font-size:13px;">Platforma de evaluare și ierarhizare posturi</p>
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
         style="display:inline-block;background:#1D4ED8;color:#ffffff;text-decoration:none;
                padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
        Activează contul
      </a>
      <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0;line-height:1.5;">
        Dacă nu poți apăsa butonul, copiază link-ul:<br>
        <a href="${activateUrl}" style="color:#3B82F6;word-break:break-all;">${activateUrl}</a>
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
    <div style="background:#1D4ED8;padding:28px 32px;">
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
         style="display:inline-block;background:#1D4ED8;color:#ffffff;text-decoration:none;
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
    <div style="background:#1D4ED8;padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">JobGrade</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Resetare parolă</h2>
      <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Salut ${firstName}, ai solicitat resetarea parolei. Apasă butonul de mai jos.
        Link-ul expiră în <strong>1 oră</strong>.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;
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
