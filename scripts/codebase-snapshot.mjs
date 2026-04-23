/**
 * codebase-snapshot.mjs — Generează snapshot condensat al codului pentru KB organism
 *
 * Rulat:
 *   - Post-deploy (GitHub Actions)
 *   - Manual: node scripts/codebase-snapshot.mjs
 *
 * Output: salvează în KB-ul COA (și propagă la COG) un rezumat complet:
 *   - Arborele de fișiere (src/app, src/lib, src/components)
 *   - Lista API routes cu metodele HTTP
 *   - Schema DB condensată (modele + câmpuri cheie)
 *   - Dependențe principale
 *   - Ultimele 10 commit-uri
 *
 * Cost: ~$0.00 (doar DB write, fără AI)
 */

import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import pg from "pg"
const { Pool } = pg

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error("DATABASE_URL required")
  process.exit(1)
}

const ROOT = process.cwd()

// ── 1. Arborele de fișiere (src/) ──────────────────────────────────────

function getFileTree(dir, prefix = "", maxDepth = 4, depth = 0) {
  if (depth >= maxDepth) return ""
  const entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .filter(e => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "generated")
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

  let tree = ""
  for (const entry of entries) {
    const fullPath = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      const childCount = fs.readdirSync(path.join(ROOT, fullPath)).length
      tree += `${prefix}${entry.name}/ (${childCount})\n`
      tree += getFileTree(fullPath, prefix + "  ", maxDepth, depth + 1)
    } else {
      tree += `${prefix}${entry.name}\n`
    }
  }
  return tree
}

// ── 2. API Routes ──────────────────────────────────────────────────────

function getApiRoutes() {
  const apiDir = path.join(ROOT, "src/app/api")
  const routes = []

  function scan(dir, prefix) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        scan(path.join(dir, entry.name), `${prefix}/${entry.name}`)
      } else if (entry.name === "route.ts") {
        const content = fs.readFileSync(path.join(dir, entry.name), "utf-8")
        const methods = []
        if (/export\s+(async\s+)?function\s+GET/m.test(content)) methods.push("GET")
        if (/export\s+(async\s+)?function\s+POST/m.test(content)) methods.push("POST")
        if (/export\s+(async\s+)?function\s+PUT/m.test(content)) methods.push("PUT")
        if (/export\s+(async\s+)?function\s+PATCH/m.test(content)) methods.push("PATCH")
        if (/export\s+(async\s+)?function\s+DELETE/m.test(content)) methods.push("DELETE")
        routes.push(`${methods.join(",")} ${prefix}`)
      }
    }
  }
  scan(apiDir, "/api")
  return routes.sort()
}

// ── 3. Schema DB condensată ────────────────────────────────────────────

function getSchemaModels() {
  const schema = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf-8")
  const models = []
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g
  let match
  while ((match = modelRegex.exec(schema)) !== null) {
    const name = match[1]
    const body = match[2]
    // Extrage câmpurile (nu relații)
    const fields = body.split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("//") && !l.startsWith("@@") && !l.includes("@relation"))
      .map(l => {
        const parts = l.split(/\s+/)
        return parts[0] && parts[1] ? `${parts[0]}:${parts[1]}` : null
      })
      .filter(Boolean)
      .slice(0, 8) // Max 8 câmpuri per model

    models.push(`${name} (${fields.join(", ")})`)
  }
  return models
}

// ── 4. Dependențe principale ───────────────────────────────────────────

function getKeyDeps() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"))
  const deps = Object.keys(pkg.dependencies || {})
  const keyDeps = deps.filter(d =>
    /^(next|react|prisma|@anthropic|stripe|resend|exceljs|mammoth|pdf-parse|zod|@auth|tailwindcss|sentry)/.test(d)
  )
  return keyDeps.map(d => `${d}@${pkg.dependencies[d]}`)
}

// ── 5. Git log ─────────────────────────────────────────────────────────

function getRecentCommits() {
  try {
    return execSync("git log --oneline -10", { cwd: ROOT, encoding: "utf-8" }).trim()
  } catch {
    return "(git not available)"
  }
}

// ── 6. Componente cheie (lib/) ─────────────────────────────────────────

function getLibStructure() {
  const libDir = path.join(ROOT, "src/lib")
  if (!fs.existsSync(libDir)) return []
  return fs.readdirSync(libDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      const files = fs.readdirSync(path.join(libDir, e.name))
        .filter(f => f.endsWith(".ts"))
      return `${e.name}/ (${files.length} files): ${files.slice(0, 5).join(", ")}${files.length > 5 ? "..." : ""}`
    })
}

// ── Generare snapshot ──────────────────────────────────────────────────

async function main() {
  console.log("Generating codebase snapshot...")

  const routes = getApiRoutes()
  const models = getSchemaModels()
  const deps = getKeyDeps()
  const commits = getRecentCommits()
  const libs = getLibStructure()

  const snapshot = `[CODEBASE SNAPSHOT — ${new Date().toISOString().slice(0, 10)}]

=== API ROUTES (${routes.length}) ===
${routes.join("\n")}

=== SCHEMA DB (${models.length} modele) ===
${models.join("\n")}

=== COMPONENTE LIB ===
${libs.join("\n")}

=== DEPENDENȚE CHEIE ===
${deps.join("\n")}

=== ULTIMELE 10 COMMIT-URI ===
${commits}

=== PAGINI PORTAL ===
${getFileTree("src/app/(portal)", "", 3)}

=== COMPONENTE UI ===
${getFileTree("src/components", "", 2)}
`

  console.log(`Snapshot size: ${(snapshot.length / 1024).toFixed(1)} KB`)

  // Salvăm în DB
  const p = new Pool({ connectionString: DB_URL })

  // Ștergem snapshot-ul anterior (păstrăm doar ultimul)
  await p.query(`DELETE FROM kb_entries WHERE tags @> ARRAY['codebase-snapshot']::text[]`)

  // Salvăm la COA
  await p.query(
    `INSERT INTO kb_entries (id, "agentRole", "kbType", content, tags, confidence, status, source, "createdAt")
     VALUES (gen_random_uuid(), 'COA', 'PERMANENT', $1, $2, 1, 'PERMANENT', 'EXPERT_HUMAN', NOW())`,
    [snapshot, ["codebase-snapshot", "architecture", "auto-generated"]]
  )

  // Salvăm și la COG (trebuie să știe și el)
  await p.query(
    `INSERT INTO kb_entries (id, "agentRole", "kbType", content, tags, confidence, status, source, "createdAt")
     VALUES (gen_random_uuid(), 'COG', 'PERMANENT', $1, $2, 1, 'PERMANENT', 'EXPERT_HUMAN', NOW())`,
    [snapshot, ["codebase-snapshot", "architecture", "auto-generated"]]
  )

  console.log("✓ Snapshot saved to COA + COG KB")
  await p.end()
}

main().catch(e => { console.error(e); process.exit(1) })
