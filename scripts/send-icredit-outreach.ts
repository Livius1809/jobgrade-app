/**
 * send-icredit-outreach.ts — Primul email calibrat către iCredit
 *
 * Rulează: npx tsx scripts/send-icredit-outreach.ts
 *
 * Aplică calibrarea L1/L2/L3/L4 ÎNAINTE de trimitere.
 * Verifică: no surveillance, no superlatives, GDPR opt-out,
 * storytelling narativ, interes crescător, acord subiect-predicat.
 */

import { calibrateCommunication, getLanguageHints } from "../src/lib/comms/calibrate"
import { sendOutreachEmail } from "../src/lib/email"

// ── Email calibrat ──────────────────────────────────────────────────────────
//
// ARC NARATIV:
//   Context  → Directiva UE 2023/970 intră în vigoare, companiile financiare sunt primele vizate
//   Tensiune → Cum te conformezi fără să perturbezi operațiunile curente?
//   Punte    → Am construit un instrument care face asta metodic
//   Rezoluție → O discuție de 20 de minute, fără obligații
//
// REGULI RESPECTATE:
//   ✓ Poveste, nu fraze — fir narativ continuu, interes crescător
//   ✓ No surveillance — nu referențiem ce știm despre Liliana din surse proprii
//   ✓ No superlative anglo-saxone
//   ✓ "Echipa JobGrade" — plural, "vă scriem" nu "vă scriu"
//   ✓ 4 indicatori, nu 6 — cu articole legale
//   ✓ Limbaj specialist HR (dar fără jargon excesiv la primul contact)
//   ✓ Footer: Psihobusiness Consulting SRL + jobgrade.ro
//   ✓ GDPR opt-out
//   ✓ Ton formal-colegial, fără entuziasm performativ

const SUBJECT = "Transparența salarială — un instrument construit pentru realitățile din România"

// ── Email narativ — adaptat la rolul HR Director ────────────────────
//
// Arc narativ unitar, interes crescător, zero redundanțe:
//   P1: RECUNOAȘTERE — situația în care se află (directiva, termen)
//   P2: TENSIUNE — întrebarea reală pe care și-o pune (cum, nu de ce)
//   P3: PUNTE — răspunsul natural, concret (ce obține EA ca HR Director)
//   P4: INVITAȚIE — un singur pas simplu

const STORY_HTML = `
<p style="margin:0 0 16px;">Bună ziua,</p>

<p style="margin:0 0 16px;">
  Din iunie 2026, Directiva UE 2023/970 obligă companiile să demonstreze
  că posturile sunt evaluate pe criterii obiective, iar grila salarială
  reflectă ierarhia reală — nu istoricul negocierilor individuale.
  Pentru sectorul financiar, termenele sunt strânse.
</p>

<p style="margin:0 0 16px;">
  Întrebarea pe care o auzim cel mai des de la directori HR nu e <em>dacă</em>
  trebuie făcut, ci <em>cum</em> — fără să blochezi echipa luni de zile
  într-un proces manual care, la final, tot nu rezistă unui audit extern.
</p>

<p style="margin:0 0 16px;">
  Am construit JobGrade tocmai pentru asta: platforma ghidează evaluarea
  fiecărui post pe 4 indicatori (Art. 4 alin. 4), prin comisia internă,
  cu consens documentat și audit trail complet. La final aveți o grilă
  salarială fundamentată — prezentabilă atât angajaților, cât și
  autorităților, oricând.
</p>

<p style="margin:0 0 16px;">
  V-ar fi util să vedeți cum arată concret? Vă propunem o discuție
  de 20 de minute, fără obligații.
</p>
`

const RECIPIENT_EMAIL = "TODO@icredit.ro" // De completat cu emailul real

async function main() {
  // ── Pas 1: Calibrare ──────────────────────────────────────────────
  const fullText = `${SUBJECT}\n${STORY_HTML.replace(/<[^>]+>/g, " ")}`

  const result = calibrateCommunication(fullText, {
    recipientRole: "HR_DIRECTOR",
    isFirstContact: true,
    language: "ro",
    contentType: "email",
    clientProvidedInfo: [], // Nu avem info directă de la client — primul contact
  })

  console.log("\n═══ CALIBRARE L1/L2/L3/L4 ═══")
  console.log(`Rezultat: ${result.passed ? "PASSED" : "BLOCKED"}`)
  console.log(`Issues: ${result.issues.length}`)

  for (const issue of result.issues) {
    console.log(`  [${issue.layer}] ${issue.severity}: ${issue.rule}`)
    console.log(`    Found: ${issue.found}`)
    console.log(`    Fix: ${issue.suggestion}`)
  }

  console.log("\nLayer summary:")
  for (const [layer, status] of Object.entries(result.layerSummary)) {
    console.log(`  ${layer}: ${status.passed ? "OK" : "FAIL"} (${status.issueCount} issues)`)
  }

  // ── Pas 2: Language hints pentru HR Director ──────────────────────
  const hints = getLanguageHints("HR_DIRECTOR")
  console.log("\nLanguage hints:")
  console.log(`  Register: ${hints.register}`)
  console.log(`  Address: ${hints.addressForm}`)
  console.log(`  Focus: ${hints.focusOn}`)

  // ── Pas 3: Trimitere (doar dacă calibrarea trece) ────────────────
  if (!result.passed) {
    console.error("\n❌ Emailul NU trece calibrarea. Corectează issues BLOCK înainte de trimitere.")
    process.exit(1)
  }

  if (RECIPIENT_EMAIL.startsWith("TODO")) {
    console.log("\n⚠ Email recipient = TODO — nu se trimite. Completează adresa reală.")
    console.log("\nPreview email:")
    console.log(`  To: ${RECIPIENT_EMAIL}`)
    console.log(`  Subject: ${SUBJECT}`)
    console.log(`  Sender: Echipa JobGrade`)
    console.log(`  Footer: Psihobusiness Consulting SRL`)
    console.log(`\n✓ Emailul e calibrat și gata de trimitere.`)
    return
  }

  const sendResult = await sendOutreachEmail({
    to: RECIPIENT_EMAIL,
    prospectName: "Liliana Stroie",
    subject: SUBJECT,
    storyHtml: STORY_HTML,
    ctaLabel: "Programează o discuție",
    senderName: "Echipa JobGrade",
  })

  console.log("\n✓ Email trimis:", sendResult)
}

main().catch(console.error)
