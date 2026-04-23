/**
 * POST /api/v1/coa/api-test
 *
 * Endpoint intern: permite agenților QA să testeze API-urile platformei.
 * Simulează request-uri reale și returnează rezultatul.
 *
 * Auth: x-internal-key
 *
 * Folosit de: QAA (automation), QLA (lead), SQA (security), COA
 * Via: ACTION: API_TEST method="GET" path="/api/v1/jobs" expectedStatus=200
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 30

function checkAuth(req: NextRequest): boolean {
  return req.headers.get("x-internal-key") === process.env.INTERNAL_API_KEY
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { method, path, body, expectedStatus, expectedContains, headers: customHeaders } = await req.json()

  if (!method || !path) {
    return NextResponse.json({ error: "method and path required" }, { status: 400 })
  }

  // Securitate: doar rute /api/ permise, nu rute externe
  if (!path.startsWith("/api/")) {
    return NextResponse.json({ error: "Only /api/ paths allowed" }, { status: 403 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jobgrade.ro"
  const url = `${baseUrl}${path}`

  const startMs = Date.now()
  let response: Response
  let responseBody: any
  let responseText = ""

  try {
    const fetchHeaders: Record<string, string> = {
      "x-internal-key": process.env.INTERNAL_API_KEY || "",
      "Content-Type": "application/json",
      ...(customHeaders || {}),
    }

    response = await fetch(url, {
      method: method.toUpperCase(),
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    responseText = await response.text()
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = null
    }
  } catch (e: any) {
    return NextResponse.json({
      test: "FAIL",
      path,
      method,
      error: e.message,
      durationMs: Date.now() - startMs,
    })
  }

  const durationMs = Date.now() - startMs

  // Verificări
  const checks: Array<{ check: string; pass: boolean; detail: string }> = []

  // Check 1: Status code
  if (expectedStatus) {
    const pass = response.status === expectedStatus
    checks.push({
      check: "status",
      pass,
      detail: pass ? `${response.status} OK` : `Expected ${expectedStatus}, got ${response.status}`,
    })
  }

  // Check 2: Body contains
  if (expectedContains) {
    const pass = responseText.includes(expectedContains)
    checks.push({
      check: "contains",
      pass,
      detail: pass ? `Contains "${expectedContains}"` : `Missing "${expectedContains}"`,
    })
  }

  // Check 3: Valid JSON
  checks.push({
    check: "validJSON",
    pass: responseBody !== null,
    detail: responseBody !== null ? "Valid JSON" : "Not JSON",
  })

  // Check 4: Response time
  checks.push({
    check: "responseTime",
    pass: durationMs < 10000,
    detail: `${durationMs}ms ${durationMs < 1000 ? "(fast)" : durationMs < 5000 ? "(ok)" : "(slow)"}`,
  })

  const allPassed = checks.every(c => c.pass)

  return NextResponse.json({
    test: allPassed ? "PASS" : "FAIL",
    path,
    method,
    status: response.status,
    durationMs,
    checks,
    // Trunchiem body-ul pentru a nu supraîncărca KB
    responsePreview: responseText.slice(0, 500),
    responseKeys: responseBody ? Object.keys(responseBody) : null,
  })
}
