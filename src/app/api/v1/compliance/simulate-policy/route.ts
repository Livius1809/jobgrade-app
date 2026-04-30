/**
 * /api/v1/compliance/simulate-policy
 *
 * Simulare C2: Adaug politica -> verificare conformitate.
 * Foloseste Claude pentru a analiza daca o politica noua
 * contravine legislatiei EU, GDPR sau Codul Muncii.
 *
 * POST — Verificare conformitate politica noua
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { getTenantData } from "@/lib/tenant-storage"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema validare input
const SimulatePolicySchema = z.object({
  policyTitle: z.string().min(3, "Titlul politicii trebuie sa aiba minim 3 caractere"),
  policyContent: z.string().min(10, "Continutul politicii trebuie sa aiba minim 10 caractere"),
  policyType: z.string().min(1, "Tipul politicii este obligatoriu"),
})

interface ComplianceIssue {
  law: string
  article: string
  description: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
}

// POST — Verificare conformitate politica noua cu Claude AI
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user

    const body = await req.json()
    const parsed = SimulatePolicySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { policyTitle, policyContent, policyType } = parsed.data

    // Incarcam politicile existente ale tenant-ului (daca exista)
    const existingPolicies = await getTenantData<
      Array<{ title: string; type: string; summary?: string }>
    >(tenantId, "UPLOADED_POLICIES")

    const existingPoliciesSummary = existingPolicies
      ? existingPolicies
          .map((p) => `- ${p.title} (${p.type})${p.summary ? ": " + p.summary : ""}`)
          .join("\n")
      : "Nu exista politici incarcate anterior."

    // Prompt pentru Claude — analiza conformitate legislativa
    const systemPrompt = `Esti un expert in dreptul muncii din Romania si legislatia europeana.
Analizezi politici interne ale companiilor pentru conformitate legala.

IMPORTANT: Raspunde STRICT in formatul JSON specificat, fara explicatii suplimentare in afara structurii JSON.

Legislatia de referinta:
1. Directiva EU 2023/970 privind transparenta salariala (transpunere pana la 07.06.2026)
2. GDPR (Regulamentul EU 2016/679)
3. Codul Muncii din Romania (Legea nr. 53/2003, actualizat)
4. Legea nr. 202/2002 privind egalitatea de sanse
5. AI Act (Regulamentul EU 2024/1689) — daca politica implica sisteme AI in HR`

    const userPrompt = `Analizeaza urmatoarea politica interna propusa si verifica conformitatea:

TITLU: ${policyTitle}
TIP: ${policyType}
CONTINUT:
${policyContent}

POLITICI EXISTENTE ALE COMPANIEI:
${existingPoliciesSummary}

Verifica:
1. Contravine Directivei EU 2023/970 (transparenta salariala)?
2. Contravine GDPR?
3. Contravine Codului Muncii din Romania?
4. Intra in conflict cu politicile existente ale companiei?
5. Contravine altor legi aplicabile (Legea 202/2002, AI Act daca e relevant)?

Raspunde STRICT in acest format JSON:
{
  "compliant": true/false,
  "issues": [
    {
      "law": "numele legii/directivei",
      "article": "articolul specific",
      "description": "descrierea problemei identificate",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW"
    }
  ],
  "suggestions": ["sugestie 1 pentru remediere", "sugestie 2"],
  "overallAssessment": "evaluare generala in 1-2 propozitii"
}`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      messages: [
        { role: "user", content: userPrompt },
      ],
      system: systemPrompt,
    })

    // Extragem textul din raspunsul Claude
    const textBlock = response.content.find((b) => b.type === "text")
    const rawText = textBlock?.text ?? "{}"

    // Parsam raspunsul JSON din Claude
    let analysisResult: {
      compliant: boolean
      issues: ComplianceIssue[]
      suggestions: string[]
      overallAssessment?: string
    }

    try {
      // Extragem JSON-ul din raspuns (Claude poate adauga text in jurul JSON-ului)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      analysisResult = JSON.parse(jsonMatch?.[0] ?? "{}")
    } catch {
      // Fallback daca parsarea esueaza
      analysisResult = {
        compliant: false,
        issues: [
          {
            law: "Eroare analiza",
            article: "N/A",
            description: "Nu s-a putut analiza automat. Consultati un specialist juridic.",
            severity: "HIGH",
          },
        ],
        suggestions: [
          "Solicitati o analiza manuala de la un consultant juridic specializat.",
        ],
      }
    }

    // Validam structura raspunsului
    const issues: ComplianceIssue[] = Array.isArray(analysisResult.issues)
      ? analysisResult.issues.map((issue) => ({
          law: String(issue.law ?? "Necunoscut"),
          article: String(issue.article ?? "N/A"),
          description: String(issue.description ?? ""),
          severity: (["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(issue.severity)
            ? issue.severity
            : "MEDIUM") as ComplianceIssue["severity"],
        }))
      : []

    const suggestions: string[] = Array.isArray(analysisResult.suggestions)
      ? analysisResult.suggestions.map(String)
      : []

    return NextResponse.json({
      compliant: analysisResult.compliant ?? issues.length === 0,
      issues,
      suggestions,
      overallAssessment: analysisResult.overallAssessment ?? null,
      analyzedPolicy: {
        title: policyTitle,
        type: policyType,
      },
      existingPoliciesCount: existingPolicies?.length ?? 0,
    })
  } catch (error) {
    console.error("[SIMULATE-POLICY POST]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}
