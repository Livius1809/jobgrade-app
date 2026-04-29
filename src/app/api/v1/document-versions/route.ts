/**
 * /api/v1/document-versions — Versionare documente cu diff + analiza impact
 *
 * Fiecare input (ROI, CCM, stat functii, stat salarii, politici etc.)
 * se versioneaza. La upload versiune noua:
 * 1. Compara cu versiunea anterioara → diff
 * 2. Analizeaza impactul pe C1-C4
 * 3. Semnalizeaza ce trebuie actualizat
 * 4. Salveaza versiunea cu diff incorporat
 *
 * GET  — Istoric versiuni per document
 * POST — Upload versiune noua + analiza diff + impact
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"
export const maxDuration = 60

interface DocumentVersion {
  id: string
  documentType: string // ROI | CCM | COD_CONDUITA | STAT_FUNCTII | STAT_SALARII | POLITICA_HR | ALTUL
  documentName: string
  version: string // v1, v2, v3...
  content: string // textul complet (sau rezumat)
  uploadedBy: string
  uploadedAt: string
  diff: {
    added: string[]     // sectiuni/articole noi
    modified: string[]  // sectiuni/articole modificate
    removed: string[]   // sectiuni/articole sterse
    summary: string     // rezumat uman al modificarilor
  } | null // null = prima versiune
  impact: {
    c1: string[] // efecte pe C1 (organizare)
    c2: string[] // efecte pe C2 (conformitate)
    c3: string[] // efecte pe C3 (competitivitate)
    c4: string[] // efecte pe C4 (dezvoltare)
    affectedJobs: number
    affectedEmployees: number
    requiresResigning: boolean
    alerts: string[]
  } | null
}

interface DocumentHistory {
  documents: Record<string, DocumentVersion[]> // key = documentType_documentName
}

async function getHistory(tenantId: string): Promise<DocumentHistory> {
  return await getTenantData<DocumentHistory>(tenantId, "DOCUMENT_VERSIONS") || { documents: {} }
}

// GET — Istoric versiuni
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const docType = req.nextUrl.searchParams.get("type")
  const history = await getHistory(session.user.tenantId)

  if (docType) {
    // Filtrare per tip document
    const filtered = Object.entries(history.documents)
      .filter(([key]) => key.startsWith(docType))
      .map(([key, versions]) => ({ key, versions, latest: versions[versions.length - 1] }))
    return NextResponse.json({ documents: filtered })
  }

  // Toate documentele — ultimele versiuni
  const summary = Object.entries(history.documents).map(([key, versions]) => ({
    key,
    documentType: versions[0]?.documentType,
    documentName: versions[0]?.documentName,
    totalVersions: versions.length,
    latest: versions[versions.length - 1],
    hasUnresolvedImpact: (versions[versions.length - 1]?.impact?.alerts?.length || 0) > 0,
  }))

  return NextResponse.json({
    documents: summary,
    types: ["ROI", "CCM", "COD_CONDUITA", "COD_ETICA", "STAT_FUNCTII", "STAT_SALARII", "POLITICA_HR", "PROCEDURA", "ALTUL"],
  })
}

// POST — Upload versiune noua
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const body = await req.json()
  const { documentType, documentName, content } = body

  if (!documentType || !documentName || !content) {
    return NextResponse.json({ error: "documentType, documentName, content obligatorii" }, { status: 400 })
  }

  const history = await getHistory(session.user.tenantId)
  const key = `${documentType}_${documentName.replace(/\s+/g, "_").toLowerCase()}`

  const existingVersions = history.documents[key] || []
  const previousVersion = existingVersions[existingVersions.length - 1]
  const versionNumber = existingVersions.length + 1

  // Calculeaza diff (simplu — pe paragrafe)
  let diff: DocumentVersion["diff"] = null
  if (previousVersion) {
    const prevParagraphs = previousVersion.content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    const newParagraphs = content.split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean)

    const prevSet = new Set(prevParagraphs)
    const newSet = new Set(newParagraphs)

    const added = newParagraphs.filter((p: string) => !prevSet.has(p)).map((p: string) => p.slice(0, 100) + (p.length > 100 ? "..." : ""))
    const removed = prevParagraphs.filter(p => !newSet.has(p)).map(p => p.slice(0, 100) + (p.length > 100 ? "..." : ""))

    // Modificate = nu identice dar similare (>50% overlap)
    const modified: string[] = []
    for (const np of newParagraphs) {
      if (prevSet.has(np)) continue // identic
      for (const pp of prevParagraphs) {
        if (newSet.has(pp)) continue // identic
        // Overlap simplu: primele 30 caractere identice
        if (np.slice(0, 30) === pp.slice(0, 30) && np !== pp) {
          modified.push(np.slice(0, 100) + (np.length > 100 ? "..." : ""))
          break
        }
      }
    }

    diff = {
      added: added.filter((a: string) => !modified.includes(a)),
      modified,
      removed,
      summary: `${added.length} secțiuni noi, ${modified.length} modificate, ${removed.length} șterse`,
    }
  }

  // Analiza impact pe C1-C4 (heuristic bazat pe tipul documentului)
  const impact: DocumentVersion["impact"] = {
    c1: [], c2: [], c3: [], c4: [],
    affectedJobs: 0, affectedEmployees: 0,
    requiresResigning: false, alerts: [],
  }

  const contentLower = content.toLowerCase()

  // C1 impact
  if (documentType === "STAT_FUNCTII" || contentLower.includes("organigram") || contentLower.includes("post") || contentLower.includes("funcți")) {
    impact.c1.push("Structura organizatorică poate fi afectată")
    impact.alerts.push("Verificați dacă organigramă reflectă modificările")
  }

  // C2 impact
  if (documentType === "CCM" || documentType === "ROI" || contentLower.includes("salar") || contentLower.includes("concedi") || contentLower.includes("disciplin")) {
    impact.c2.push("Conformitate salarială/contractuală afectată")
    impact.requiresResigning = true
    impact.alerts.push("Fișele de post cu pasaje din acest document necesită re-semnare")
  }

  // C3 impact
  if (contentLower.includes("performanț") || contentLower.includes("evaluare") || contentLower.includes("competenț") || contentLower.includes("kpi")) {
    impact.c3.push("Criterii performanță/evaluare pot fi afectate")
    impact.alerts.push("Verificați KPI-urile și pachetele salariale")
  }

  // C4 impact
  if (contentLower.includes("strateg") || contentLower.includes("viziune") || contentLower.includes("obiectiv") || contentLower.includes("cultură")) {
    impact.c4.push("Obiective strategice pot fi afectate")
    impact.alerts.push("Verificați alinierea cu obiectivele CA")
  }

  // Estimare angajați afectați
  if (documentType === "ROI" || documentType === "CCM" || documentType === "COD_CONDUITA") {
    // Afectează toți angajații
    const { prisma } = await import("@/lib/prisma")
    impact.affectedEmployees = await prisma.employeeSalaryRecord.count({ where: { tenantId: session.user.tenantId } })
    impact.affectedJobs = await prisma.job.count({ where: { tenantId: session.user.tenantId, status: "ACTIVE" } })
  }

  const newVersion: DocumentVersion = {
    id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    documentType,
    documentName,
    version: `v${versionNumber}`,
    content,
    uploadedBy: session.user.id,
    uploadedAt: new Date().toISOString(),
    diff,
    impact,
  }

  if (!history.documents[key]) history.documents[key] = []
  history.documents[key].push(newVersion)

  await setTenantData(session.user.tenantId, "DOCUMENT_VERSIONS", history)

  // Learning
  try {
    const { learnFromClientInput } = await import("@/lib/learning-hooks")
    await learnFromClientInput(session.user.tenantId, "DOCUMENT_UPDATE", `${documentType} "${documentName}" v${versionNumber}: ${diff?.summary || "prima versiune"}. Impact: ${impact.alerts.join("; ") || "minim"}`)
  } catch {}

  return NextResponse.json({
    ok: true,
    version: newVersion.version,
    diff: diff || { added: [], modified: [], removed: [], summary: "Prima versiune — fără comparație" },
    impact,
    message: impact.alerts.length > 0
      ? `Versiune ${newVersion.version} salvată. ${impact.alerts.length} alerte de impact.`
      : `Versiune ${newVersion.version} salvată. Fără impact semnificativ.`,
  })
}
