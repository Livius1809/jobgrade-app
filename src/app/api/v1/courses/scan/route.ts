/**
 * GET /api/v1/courses/scan
 *
 * Scanează directorul de cursuri pentru PDF-uri noi neprocesate.
 * Returnează status-ul fiecărui curs: procesat, text extras, adaptare completă.
 *
 * Acces: INTERNAL_API_KEY (apelat de n8n cron sau manual).
 */

import { NextRequest, NextResponse } from "next/server"
import { readdir, stat, access } from "fs/promises"
import { join } from "path"

export const dynamic = "force-dynamic"

const COURSES_DIR = join(process.cwd(), "..", "jobgrade_team", "kb", "courses", "var_primara")
const ROM_DIR = join(COURSES_DIR, "rom")

interface CourseStatus {
  name: string
  pdfExists: boolean
  textExtracted: boolean
  textLines?: number
  adaptationDoc: boolean
  adaptedModules: number
  status: "NEW" | "TEXT_ONLY" | "ADAPTATION_STARTED" | "COMPLETE"
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function countLines(path: string): Promise<number> {
  try {
    const { readFile } = await import("fs/promises")
    const content = await readFile(path, "utf-8")
    return content.split("\n").length
  } catch {
    return 0
  }
}

async function countAdaptedModules(courseName: string): Promise<number> {
  try {
    const files = await readdir(ROM_DIR)
    // Count files that match modul_N_*.md pattern
    // For IMS: files starting with the course adaptation prefix
    const prefix = courseName.replace(/_/g, "_")
    return files.filter(f =>
      f.startsWith("modul_") && f.endsWith(".md") &&
      // If there's an adaptation doc, count modules that could belong to it
      !f.startsWith("00_")
    ).length
  } catch {
    return 0
  }
}

export async function GET(req: NextRequest) {
  // Auth check
  const apiKey = req.headers.get("x-internal-key")
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const files = await readdir(COURSES_DIR)
    const pdfs = files.filter(f => f.endsWith(".pdf"))

    const results: CourseStatus[] = []

    for (const pdf of pdfs) {
      const name = pdf.replace(".pdf", "")
      const txtPath = join(COURSES_DIR, `${name}.txt`)
      const adaptPath = join(ROM_DIR, `00_abordare_adaptare_${name}.md`)

      const textExtracted = await fileExists(txtPath)
      const adaptationDoc = await fileExists(adaptPath)
      const textLines = textExtracted ? await countLines(txtPath) : undefined
      const adaptedModules = await countAdaptedModules(name)

      let status: CourseStatus["status"] = "NEW"
      if (textExtracted && adaptationDoc && adaptedModules >= 8) {
        status = "COMPLETE"
      } else if (textExtracted && adaptationDoc) {
        status = "ADAPTATION_STARTED"
      } else if (textExtracted) {
        status = "TEXT_ONLY"
      }

      results.push({
        name,
        pdfExists: true,
        textExtracted,
        textLines,
        adaptationDoc,
        adaptedModules,
        status,
      })
    }

    const summary = {
      total: results.length,
      new: results.filter(r => r.status === "NEW").length,
      textOnly: results.filter(r => r.status === "TEXT_ONLY").length,
      adaptationStarted: results.filter(r => r.status === "ADAPTATION_STARTED").length,
      complete: results.filter(r => r.status === "COMPLETE").length,
    }

    return NextResponse.json({ courses: results, summary })
  } catch (err) {
    return NextResponse.json({
      error: "scan_failed",
      details: err instanceof Error ? err.message : "Unknown error",
      coursesDir: COURSES_DIR,
    }, { status: 500 })
  }
}
