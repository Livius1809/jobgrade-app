/**
 * POST /api/v1/coa/code-query
 *
 * Endpoint intern pentru COA: citește fișiere din codebase,
 * caută pattern-uri, verifică existența componentelor.
 *
 * Folosit de task executor când COA sau alt agent are nevoie
 * să verifice ceva în cod (fezabilitate, existență feature, config).
 *
 * Auth: x-internal-key (doar organism, nu client)
 *
 * Acțiuni:
 *   read-file: citește un fișier (max 500 linii)
 *   search: caută un pattern în codebase (grep)
 *   list-files: listează fișierele dintr-un director
 *   check-route: verifică dacă o rută API există și ce metode are
 *   schema-model: returnează un model Prisma specific
 *   capabilities: returnează lista capabilităților platformei
 */

import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"

export const dynamic = "force-dynamic"

const ROOT = process.cwd()
const MAX_FILE_LINES = 500
const MAX_SEARCH_RESULTS = 30

// Doar organism (internal key)
function checkAuth(req: NextRequest): boolean {
  return req.headers.get("x-internal-key") === process.env.INTERNAL_API_KEY
}

// Securitate: nu permitem citire în afara proiectului
function safePath(filePath: string): string | null {
  const resolved = path.resolve(ROOT, filePath)
  if (!resolved.startsWith(ROOT)) return null
  if (resolved.includes("node_modules")) return null
  if (resolved.includes(".env")) return null // nu expunem secrete
  if (resolved.includes(".git/")) return null
  return resolved
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action, filePath, pattern, directory, modelName, routePath } = await req.json()

  switch (action) {
    case "read-file": {
      if (!filePath) return NextResponse.json({ error: "filePath required" }, { status: 400 })
      const safe = safePath(filePath)
      if (!safe) return NextResponse.json({ error: "Path not allowed" }, { status: 403 })
      if (!fs.existsSync(safe)) return NextResponse.json({ error: "File not found", filePath }, { status: 404 })

      const content = fs.readFileSync(safe, "utf-8")
      const lines = content.split("\n")
      const truncated = lines.length > MAX_FILE_LINES

      return NextResponse.json({
        filePath,
        lines: lines.length,
        truncated,
        content: lines.slice(0, MAX_FILE_LINES).join("\n"),
      })
    }

    case "search": {
      if (!pattern) return NextResponse.json({ error: "pattern required" }, { status: 400 })
      const searchDir = directory || "src"
      const safe = safePath(searchDir)
      if (!safe) return NextResponse.json({ error: "Directory not allowed" }, { status: 403 })

      try {
        const result = execSync(
          `grep -rn --include="*.ts" --include="*.tsx" --include="*.md" "${pattern}" "${safe}" | head -${MAX_SEARCH_RESULTS}`,
          { encoding: "utf-8", timeout: 10000 }
        )
        const matches = result.split("\n").filter(Boolean).map(line => {
          const colonIdx = line.indexOf(":", safe.length + 1)
          return {
            file: line.slice(0, colonIdx).replace(ROOT + path.sep, ""),
            match: line.slice(colonIdx + 1).trim().slice(0, 200),
          }
        })
        return NextResponse.json({ pattern, matches, total: matches.length })
      } catch {
        return NextResponse.json({ pattern, matches: [], total: 0 })
      }
    }

    case "list-files": {
      const dir = directory || "src"
      const safe = safePath(dir)
      if (!safe || !fs.existsSync(safe)) return NextResponse.json({ error: "Directory not found" }, { status: 404 })

      const entries = fs.readdirSync(safe, { withFileTypes: true })
        .filter(e => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "generated")
        .map(e => ({ name: e.name, type: e.isDirectory() ? "dir" : "file" }))

      return NextResponse.json({ directory: dir, entries })
    }

    case "check-route": {
      if (!routePath) return NextResponse.json({ error: "routePath required" }, { status: 400 })
      // Convertim /api/v1/jobs → src/app/api/v1/jobs/route.ts
      const fsPath = `src/app${routePath}/route.ts`
      const safe = safePath(fsPath)
      if (!safe) return NextResponse.json({ exists: false, routePath })
      if (!fs.existsSync(safe)) return NextResponse.json({ exists: false, routePath })

      const content = fs.readFileSync(safe, "utf-8")
      const methods = []
      if (/export\s+(async\s+)?function\s+GET/m.test(content)) methods.push("GET")
      if (/export\s+(async\s+)?function\s+POST/m.test(content)) methods.push("POST")
      if (/export\s+(async\s+)?function\s+PUT/m.test(content)) methods.push("PUT")
      if (/export\s+(async\s+)?function\s+PATCH/m.test(content)) methods.push("PATCH")
      if (/export\s+(async\s+)?function\s+DELETE/m.test(content)) methods.push("DELETE")

      return NextResponse.json({ exists: true, routePath, methods, lines: content.split("\n").length })
    }

    case "schema-model": {
      if (!modelName) return NextResponse.json({ error: "modelName required" }, { status: 400 })
      const schema = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf-8")
      const regex = new RegExp(`model\\s+${modelName}\\s*\\{([^}]+)\\}`, "m")
      const match = schema.match(regex)
      if (!match) return NextResponse.json({ error: "Model not found", modelName }, { status: 404 })

      return NextResponse.json({ modelName, definition: match[0] })
    }

    case "capabilities": {
      // Lista condensată a capabilităților platformei
      const apiDir = path.join(ROOT, "src/app/api")
      let routeCount = 0
      function countRoutes(dir) {
        if (!fs.existsSync(dir)) return
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) countRoutes(path.join(dir, e.name))
          else if (e.name === "route.ts") routeCount++
        }
      }
      countRoutes(apiDir)

      const schema = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf-8")
      const modelCount = (schema.match(/^model\s+\w+/gm) || []).length

      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"))

      return NextResponse.json({
        apiRoutes: routeCount,
        dbModels: modelCount,
        framework: `next@${pkg.dependencies.next}`,
        ai: !!pkg.dependencies["@anthropic-ai/sdk"],
        payments: !!pkg.dependencies.stripe,
        email: !!pkg.dependencies.resend,
        voice: !!pkg.dependencies.elevenlabs,
        features: [
          "Evaluare posturi (6 criterii, 4 variante)",
          "Fișe de post AI",
          "Pay gap analysis (EU 2023/970)",
          "Company Profiler (maturitate, coerență)",
          "MVV Progressive Builder",
          "Chat consultant HR (familiarizare + consultanță)",
          "Stripe billing (abonament + credite)",
          "Export PDF/Excel/JSON/XML",
          "Import stat funcții (XLSX/PDF/PNG Vision)",
          "Import stat salarii (XLSX/XML/CSV)",
          "Account lifecycle (export/import/reset GDPR)",
          "Owner Dashboard (4 secțiuni, OwnerInbox structurat)",
          "Organism autonom (45 agenți, KB, learning funnel)",
        ],
      })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
