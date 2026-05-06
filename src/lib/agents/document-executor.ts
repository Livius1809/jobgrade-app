/**
 * document-executor.ts — Generare documente legale/comerciale
 *
 * CJA/DOA pot genera:
 * 1. Propunere comercială personalizată
 * 2. Contract prestări servicii SaaS
 * 3. NDA (Non-Disclosure Agreement)
 * 4. DPA (Data Processing Agreement) GDPR
 * 5. Factură proforma
 */

import { cpuCall } from "@/lib/cpu/gateway"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

export interface GeneratedDocument {
  type: string
  title: string
  content: string       // HTML or Markdown
  metadata: {
    clientName: string
    generatedBy: string
    version: number
    validUntil?: string
  }
}

export async function generateDocument(
  docType: "PROPOSAL" | "CONTRACT" | "NDA" | "DPA" | "PROFORMA",
  clientData: {
    companyName: string
    contactName: string
    cui?: string
    address?: string
    plan?: string
    customTerms?: string
  },
  prisma: PrismaClient
): Promise<GeneratedDocument> {
  const p = prisma as any

  // Get legal KB
  const legalKB = await p.kBEntry.findMany({
    where: { agentRole: { in: ["CJA", "BCA"] }, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 5,
    select: { content: true },
  })

  const templates: Record<string, string> = {
    PROPOSAL: `Propunere comercială JobGrade pentru ${clientData.companyName}:
- Prezentare platformă (evaluare joburi cu AI, 42 agenți, conformitate EU)
- Beneficii specifice clientului
- Planuri și prețuri (Starter/Professional/Enterprise)
- Timeline implementare
- Termeni și condiții
- CTA: demo personalizat`,

    CONTRACT: `Contract prestări servicii SaaS între:
Furnizor: Psihobusiness Consulting SRL (CIF RO15790994)
Client: ${clientData.companyName} (CUI: ${clientData.cui || "___"})
Obiect: Acces platformă JobGrade plan ${clientData.plan || "Professional"}
Include: clauze SLA, confidențialitate, GDPR, reziliere, forță majoră`,

    NDA: `Acord de confidențialitate (NDA) bilateral între Psihobusiness Consulting SRL și ${clientData.companyName}.
Scopul: protejarea informațiilor confidențiale în cadrul evaluării platformei JobGrade.
Durată: 2 ani de la semnare.`,

    DPA: `Data Processing Agreement conform GDPR Art. 28 între:
Controller: ${clientData.companyName}
Processor: Psihobusiness Consulting SRL
Date procesate: date salariale, evaluări joburi, date angajați
Baza legală: Art. 6(1)(b) GDPR — execuția contractului
Măsuri tehnice: criptare, acces RBAC, audit log, data retention 5 ani`,

    PROFORMA: `Factură proforma:
Furnizor: Psihobusiness Consulting SRL, CIF RO15790994
Client: ${clientData.companyName}
Serviciu: Platformă JobGrade — plan ${clientData.plan || "Professional"}
Preț: [conform plan selectat]
TVA: 19% (plătitor TVA)
Termen plată: 30 zile`,
  }

  const cpuResult = await cpuCall({
    model: MODEL,
    max_tokens: 4000,
    system: "",
    messages: [{
      role: "user",
      content: `Generează un document ${docType} complet și profesional.

SPECIFICAȚII:
${templates[docType] || templates.PROPOSAL}

CLIENT: ${clientData.companyName}
Contact: ${clientData.contactName}
${clientData.cui ? `CUI: ${clientData.cui}` : ""}
${clientData.address ? `Adresa: ${clientData.address}` : ""}
${clientData.customTerms ? `Termeni speciali: ${clientData.customTerms}` : ""}

CONTEXT JURIDIC:
${legalKB.map((e: any) => "- " + e.content.substring(0, 100)).join("\n") || "Conformitate GDPR + Directiva EU 2023/970 + Codul Muncii RO"}

Generează documentul complet în format HTML (cu stiluri inline pentru print/PDF).
Include: header cu logo placeholder, secțiuni numerotate, footer cu date companie.
LIMBĂ: Română

Răspunde doar cu HTML-ul documentului, fără JSON wrapper.`,
    }],
    agentRole: docType === "DPA" || docType === "NDA" || docType === "CONTRACT" ? "CJA" : "SOA",
    operationType: "document-generation",
  })

  const content = cpuResult.text

  return {
    type: docType,
    title: `${docType} — ${clientData.companyName}`,
    content,
    metadata: {
      clientName: clientData.companyName,
      generatedBy: docType === "DPA" || docType === "NDA" || docType === "CONTRACT" ? "CJA" : "SOA",
      version: 1,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  }
}
