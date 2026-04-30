/**
 * /api/v1/processes/map
 *
 * Harta procese C3 (Competitivitate): generare AI a hartii de procese
 * pentru un departament sau intreaga companie.
 *
 * POST — Genereaza harta procese cu Claude AI (furnizor-proces-client)
 * GET  — Recupereaza hartile de procese existente per tenant
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema validare input
const ProcessMapInputSchema = z.object({
  departmentId: z.string().optional(),
  scope: z.enum(["DEPARTMENT", "COMPANY"]),
  existingDocs: z.string().optional(),
})

// Tipuri pentru structura hartii de procese
interface ProcessNode {
  id: string
  name: string
  type: "MAIN" | "SUPPORT"
  department: string
  supplier: { name: string; description: string }
  process: { name: string; description: string; inputs: string[]; outputs: string[] }
  client: { name: string; description: string }
}

interface ProcessLink {
  from: string
  to: string
  label: string
}

interface ProcessMap {
  nodes: ProcessNode[]
  links: ProcessLink[]
  generatedAt: string
  scope: "DEPARTMENT" | "COMPANY"
  departmentId: string | null
  departmentName: string | null
}

// Cheie SystemConfig pentru harta de procese
function processMapKey(tenantId: string, scope: string, departmentId?: string): string {
  return `PROCESS_MAP_${tenantId}_${scope}_${departmentId || "ALL"}`
}

// POST — Genereaza harta de procese cu AI
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user

    const body = await req.json()
    const parsed = ProcessMapInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { departmentId, scope, existingDocs } = parsed.data

    // Validare: daca scope=DEPARTMENT, departmentId e obligatoriu
    if (scope === "DEPARTMENT" && !departmentId) {
      return NextResponse.json(
        { error: "departmentId este obligatoriu pentru scope DEPARTMENT" },
        { status: 400 },
      )
    }

    // Incarcam datele contextuale: departamente, joburi, companie
    let departmentName: string | null = null
    let contextData = ""

    if (scope === "DEPARTMENT" && departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, tenantId },
        include: { jobs: { select: { title: true, description: true } } },
      })
      if (!dept) {
        return NextResponse.json({ error: "Departamentul nu a fost gasit" }, { status: 404 })
      }
      departmentName = dept.name
      contextData = `Departament: ${dept.name}\nPosturi: ${dept.jobs.map(j => `${j.title}${j.description ? " - " + j.description.slice(0, 100) : ""}`).join("; ")}`
    } else {
      // Scope COMPANY — toate departamentele si joburile
      const departments = await prisma.department.findMany({
        where: { tenantId },
        include: { jobs: { select: { title: true, description: true } } },
      })
      contextData = departments
        .map(d => `Departament: ${d.name}\n  Posturi: ${d.jobs.map(j => j.title).join(", ")}`)
        .join("\n")
    }

    // Incarcam profilul companiei (daca exista)
    const company = await prisma.companyProfile.findUnique({
      where: { tenantId },
    })

    const companyContext = company
      ? `Companie: ${(company as any).name ?? "Nespecificata"}\nDomeniu: ${company.industry || "nespecificat"}\nDescriere: ${company.description || "nespecificata"}`
      : "Profil companie necompletat."

    // Prompt pentru Claude — generare harta procese
    const systemPrompt = `Esti un expert in managementul proceselor si calitate (ISO 9001, BPM).
Genereaza o harta de procese detaliata pentru o organizatie romaneasca.

IMPORTANT: Raspunde STRICT in formatul JSON specificat, fara text suplimentar.

Pentru fiecare proces identificat, specifica:
- Furnizor (supplier): cine furnizeaza inputurile
- Proces (process): ce transformare are loc, cu inputuri si outputuri
- Client: cine primeste rezultatul

Tipuri de procese:
- MAIN: procese care creeaza valoare directa (productie, livrare, vanzari)
- SUPPORT: procese suport (HR, IT, contabilitate, juridic)`

    const userPrompt = `Genereaza harta de procese pentru:

${companyContext}

STRUCTURA ORGANIZATIONALA:
${contextData}

${existingDocs ? `DOCUMENTE EXISTENTE:\n${existingDocs}` : ""}

SCOPE: ${scope}${departmentName ? ` — Departament: ${departmentName}` : ""}

Raspunde STRICT in acest format JSON:
{
  "nodes": [
    {
      "id": "proc_1",
      "name": "Numele procesului",
      "type": "MAIN" sau "SUPPORT",
      "department": "Departamentul responsabil",
      "supplier": { "name": "Furnizor", "description": "Ce furnizeaza" },
      "process": { "name": "Procesul", "description": "Ce transforma", "inputs": ["input1"], "outputs": ["output1"] },
      "client": { "name": "Client", "description": "Ce primeste" }
    }
  ],
  "links": [
    { "from": "proc_1", "to": "proc_2", "label": "Output transmis" }
  ]
}`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    })

    // Extragem textul din raspunsul Claude
    const textBlock = response.content.find((b) => b.type === "text")
    const rawText = textBlock?.text ?? "{}"

    // Parsam raspunsul JSON
    let mapData: { nodes: ProcessNode[]; links: ProcessLink[] }
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      mapData = JSON.parse(jsonMatch?.[0] ?? '{"nodes":[],"links":[]}')
    } catch {
      return NextResponse.json(
        { error: "Eroare la parsarea raspunsului AI. Incercati din nou." },
        { status: 502 },
      )
    }

    // Construim structura completa
    const processMap: ProcessMap = {
      nodes: Array.isArray(mapData.nodes) ? mapData.nodes : [],
      links: Array.isArray(mapData.links) ? mapData.links : [],
      generatedAt: new Date().toISOString(),
      scope,
      departmentId: departmentId || null,
      departmentName,
    }

    // Salvam in SystemConfig
    const key = processMapKey(tenantId, scope, departmentId)
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: JSON.stringify(processMap) },
      create: { key, value: JSON.stringify(processMap) },
    })

    return NextResponse.json({
      ok: true,
      key,
      processMap,
      stats: {
        totalNodes: processMap.nodes.length,
        mainProcesses: processMap.nodes.filter(n => n.type === "MAIN").length,
        supportProcesses: processMap.nodes.filter(n => n.type === "SUPPORT").length,
        totalLinks: processMap.links.length,
      },
    })
  } catch (error) {
    console.error("[PROCESSES/MAP POST]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}

// GET — Recupereaza hartile de procese existente
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user
    const url = new URL(req.url)
    const scope = url.searchParams.get("scope") // optional: DEPARTMENT sau COMPANY
    const departmentId = url.searchParams.get("departmentId") // optional

    // Prefix pentru cautare — toate hartile de procese ale tenant-ului
    const prefix = `PROCESS_MAP_${tenantId}_`

    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: prefix } },
      orderBy: { updatedAt: "desc" },
    })

    let maps: Array<ProcessMap & { key: string }> = configs
      .map(c => {
        try {
          return { ...JSON.parse(c.value) as ProcessMap, key: c.key }
        } catch {
          return null
        }
      })
      .filter(Boolean) as Array<ProcessMap & { key: string }>

    // Filtrare optionala
    if (scope) {
      maps = maps.filter(m => m.scope === scope)
    }
    if (departmentId) {
      maps = maps.filter(m => m.departmentId === departmentId)
    }

    return NextResponse.json({
      maps,
      total: maps.length,
    })
  } catch (error) {
    console.error("[PROCESSES/MAP GET]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}
