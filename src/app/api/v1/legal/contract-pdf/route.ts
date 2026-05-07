/**
 * Contract PDF Generation — POST /api/v1/legal/contract-pdf
 *
 * Generare contract B2B de prestari servicii ca HTML
 * (convertibil client-side via window.print / html2pdf).
 *
 * Prestator: Psihobusiness Consulting SRL, CIF RO15790994, platitoare TVA.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import {
  calculateServicePrice,
  LAYER_NAMES,
  detectTier,
  TIERS,
  type SubscriptionTier,
} from "@/lib/pricing"

export const dynamic = "force-dynamic"

const schema = z.object({
  tier: z.string().optional(),
  layer: z.number().min(1).max(4).optional(),
  positions: z.number().min(1),
  employees: z.number().min(1),
  contactPerson: z.string().optional(),
})

// ── Prestator (date fixe) ────────────────────────────────────────────────────

const PRESTATOR = {
  name: "Psihobusiness Consulting SRL",
  cif: "RO15790994",
  regCom: "J40/1234/2003",
  address: "Bucuresti",
  isVATPayer: true,
  representative: "Administrator",
}

// ── Numar contract ───────────────────────────────────────────────────────────

function generateContractNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `JG-${y}${m}${d}-${seq}`
}

// ── Descriere servicii per layer ─────────────────────────────────────────────

function describeServices(layer: number, positions: number, employees: number): string {
  const lines: string[] = []

  if (layer >= 1) {
    lines.push(
      `<b>C1 - Organizare interna:</b> Evaluarea si ierarhizarea a ${positions} posturi distincte ` +
      `prin metodologia JobGrade (evaluare asistata AI), generare fise de post.`
    )
  }
  if (layer >= 2) {
    lines.push(
      `<b>C2 - Conformitate:</b> Analiza structurii salariale pentru ${employees} angajati, ` +
      `analiza decalajelor salariale (pay gap, Art. 9 Directiva UE 2023/970), benchmark salarial.`
    )
  }
  if (layer >= 3) {
    lines.push(
      `<b>C3 - Competitivitate:</b> Proiectare pachete salariale, evaluare performanta, ` +
      `analiza impact bugetar.`
    )
  }
  if (layer >= 4) {
    lines.push(
      `<b>C4 - Dezvoltare:</b> Dezvoltare HR, proiectare recrutare, manual angajat, ` +
      `programe de retentie si dezvoltare organizationala.`
    )
  }

  return lines.map(l => `<p style="margin:4px 0">${l}</p>`).join("\n")
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    // Incarcam profilul companiei client
    const company = await prisma.companyProfile.findFirst({
      where: { tenantId },
      select: {
        tenant: { select: { name: true } },
        cui: true,
        regCom: true,
        address: true,
        county: true,
        isVATPayer: true,
      },
    })

    const clientName = company?.tenant?.name ?? "Beneficiar"
    const clientCUI = company?.cui ?? "________________"
    const clientRegCom = company?.regCom ?? "________________"
    const clientAddress = [company?.address, company?.county].filter(Boolean).join(", ") || "________________"
    const contactPerson = data.contactPerson ?? "________________"

    // Calculam pretul
    const layer = data.layer ?? 4
    const tier: SubscriptionTier = (data.tier as SubscriptionTier) ?? detectTier(data.positions, data.employees)
    const tierConfig = TIERS[tier]
    const pricing = calculateServicePrice(layer, data.positions, data.employees)
    const abonamentLunar = tierConfig.monthlyPrice
    const totalServicii = pricing.serviciiRON

    // TVA: B2B intre platitori de TVA = fara TVA (reverse charge)
    const clientIsVAT = company?.isVATPayer === true
    const vatRate = clientIsVAT ? 0 : 0.21
    const vatAmount = Math.round(totalServicii * vatRate)
    const totalCuTVA = totalServicii + vatAmount

    const contractNumber = generateContractNumber()
    const today = new Date().toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    const layerName = LAYER_NAMES[layer] ?? `Pachet ${layer}`

    // ── Generare HTML ──────────────────────────────────────────────────────

    const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Contract ${contractNumber}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 60px;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    h2 {
      font-size: 13pt;
      margin-top: 24px;
      margin-bottom: 8px;
    }
    .contract-nr {
      text-align: center;
      font-size: 11pt;
      margin-bottom: 24px;
      color: #555;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      page-break-inside: avoid;
    }
    .sig-block {
      width: 45%;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 4px;
    }
    table.pricing {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    table.pricing th, table.pricing td {
      border: 1px solid #999;
      padding: 6px 10px;
      text-align: left;
    }
    table.pricing th {
      background: #f0f0f0;
    }
    table.pricing td.amount {
      text-align: right;
      white-space: nowrap;
    }
  </style>
</head>
<body>

<h1>Contract de prestari servicii</h1>
<p class="contract-nr">Nr. ${contractNumber} din ${today}</p>

<h2>Art. 1 &mdash; Partile contractante</h2>
<p>
  <b>1.1. Prestatorul:</b><br>
  <b>${PRESTATOR.name}</b>, cu sediul in ${PRESTATOR.address},
  inregistrata la Registrul Comertului sub nr. ${PRESTATOR.regCom},
  CIF ${PRESTATOR.cif}, platitoare de TVA,
  reprezentata prin ${PRESTATOR.representative},
  denumita in continuare <b>„Prestatorul"</b>.
</p>
<p>
  <b>1.2. Beneficiarul:</b><br>
  <b>${clientName}</b>, cu sediul in ${clientAddress},
  ${clientRegCom !== "________________" ? `inregistrata la Registrul Comertului sub nr. ${clientRegCom}, ` : ""}CIF ${clientCUI}${clientIsVAT ? ", platitoare de TVA" : ""},
  reprezentata prin ${contactPerson},
  denumita in continuare <b>„Beneficiarul"</b>.
</p>

<h2>Art. 2 &mdash; Obiectul contractului</h2>
<p>
  Prestatorul se obliga sa furnizeze Beneficiarului servicii de consultanta in resurse umane
  prin platforma JobGrade, conform pachetului <b>${layerName}</b>,
  pentru un numar de <b>${data.positions} pozitii</b> si <b>${data.employees} angajati</b>,
  dupa cum urmeaza:
</p>
${describeServices(layer, data.positions, data.employees)}

<h2>Art. 3 &mdash; Pretul si modalitatea de plata</h2>
<p>3.1. Pretul serviciilor este structurat astfel:</p>

<table class="pricing">
  <thead>
    <tr>
      <th>Componenta</th>
      <th>Detalii</th>
      <th>Suma (RON)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Abonament ${tierConfig.label} (lunar)</td>
      <td>Acces platforma, ${tierConfig.freeChat} min chat/luna, ${tierConfig.storage} stocare</td>
      <td class="amount">${abonamentLunar.toLocaleString("ro-RO")} RON/luna</td>
    </tr>
    <tr>
      <td>Servicii ${layerName}</td>
      <td>${pricing.credits} credite x ${pricing.pricePerCredit.toFixed(2)} RON/credit</td>
      <td class="amount">${totalServicii.toLocaleString("ro-RO")} RON</td>
    </tr>
    ${vatRate > 0 ? `<tr>
      <td>TVA 21%</td>
      <td>Aplicabil conform legislatiei in vigoare</td>
      <td class="amount">${vatAmount.toLocaleString("ro-RO")} RON</td>
    </tr>` : `<tr>
      <td colspan="2"><i>TVA: taxare inversa (ambele parti platitoare de TVA)</i></td>
      <td class="amount">0 RON</td>
    </tr>`}
    <tr>
      <td><b>Total servicii</b></td>
      <td></td>
      <td class="amount"><b>${totalCuTVA.toLocaleString("ro-RO")} RON</b></td>
    </tr>
  </tbody>
</table>

<p>
  3.2. Plata se efectueaza prin virament bancar sau prin procesatorul de plati Stripe,
  in termen de 5 zile lucratoare de la emiterea facturii.
</p>
<p>
  3.3. Prestatorul va emite factura fiscala in conformitate cu legislatia romana in vigoare.
</p>

<h2>Art. 4 &mdash; Durata contractului</h2>
<p>
  4.1. Prezentul contract se incheie pe o durata de <b>12 (douasprezece) luni</b>
  de la data semnarii.
</p>
<p>
  4.2. Contractul se prelungeste automat pentru perioade succesive de 12 luni,
  daca niciuna dintre parti nu notifica in scris intentia de incetare cu cel putin
  30 de zile inainte de expirarea perioadei curente.
</p>
<p>
  4.3. Oricare dintre parti poate denunta unilateral contractul cu un preaviz
  de 30 de zile calendaristice, comunicat in scris.
</p>

<h2>Art. 5 &mdash; Confidentialitate</h2>
<p>
  5.1. Partile se obliga sa pastreze confidentialitatea tuturor informatiilor obtinute
  in cadrul sau in legatura cu executarea prezentului contract, pe toata durata
  contractului si pentru o perioada de 3 (trei) ani dupa incetarea acestuia.
</p>
<p>
  5.2. Obligatia de confidentialitate nu se aplica informatiilor care:
  (a) sunt sau devin publice fara culpa partii care le divulga;
  (b) erau cunoscute de partea receptoare anterior divulgarii;
  (c) sunt obtinute in mod legal de la un tert fara obligatie de confidentialitate;
  (d) trebuie divulgate conform legii sau unei hotarari judecatoresti.
</p>

<h2>Art. 6 &mdash; Protectia datelor cu caracter personal (GDPR)</h2>
<p>
  6.1. Partile se obliga sa respecte prevederile Regulamentului (UE) 2016/679
  privind protectia persoanelor fizice in ceea ce priveste prelucrarea datelor
  cu caracter personal si libera circulatie a acestor date (GDPR),
  precum si legislatia nationala aplicabila (Legea nr. 190/2018).
</p>
<p>
  6.2. Prestatorul prelucreaza datele cu caracter personal ale angajatilor Beneficiarului
  exclusiv in scopul furnizarii serviciilor prevazute in prezentul contract,
  in calitate de persoana imputernicita conform Art. 28 GDPR.
</p>
<p>
  6.3. Conditiile detaliate de prelucrare sunt reglementate prin Acordul de Prelucrare
  a Datelor (DPA) anexat prezentului contract, care face parte integranta din acesta.
</p>
<p>
  6.4. Durata de retentie a datelor cu caracter personal este conform politicii
  de confidentialitate a Prestatorului, disponibila la adresa platformei.
</p>

<h2>Art. 7 &mdash; Dispozitii finale</h2>
<p>
  7.1. Prezentul contract reprezinta vointa partilor si inlocuieste orice intelegere
  anterioara, scrisa sau verbala, referitoare la obiectul sau.
</p>
<p>
  7.2. Orice modificare a prezentului contract se face prin act aditional
  semnat de ambele parti.
</p>
<p>
  7.3. Litigiile care nu pot fi solutionate pe cale amiabila vor fi supuse
  instantelor judecatoresti competente de la sediul Prestatorului.
</p>
<p>
  7.4. Prezentul contract s-a incheiat in 2 (doua) exemplare originale,
  cate unul pentru fiecare parte.
</p>

<div class="signatures">
  <div class="sig-block">
    <b>PRESTATOR</b><br>
    ${PRESTATOR.name}
    <div class="sig-line">
      Semnatura si stampila
    </div>
  </div>
  <div class="sig-block">
    <b>BENEFICIAR</b><br>
    ${clientName}
    <div class="sig-line">
      Semnatura si stampila
    </div>
  </div>
</div>

</body>
</html>`

    return NextResponse.json({
      html,
      contractNumber,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[CONTRACT-PDF]", errMsg, error)
    return NextResponse.json({ message: `Eroare: ${errMsg}` }, { status: 500 })
  }
}
