import { NextRequest, NextResponse } from "next/server"

/**
 * Wrapper pentru API route handlers cu logging și error tracking.
 * Loghează: method, path, duration, status, errors.
 *
 * Usage:
 *   export const POST = withLogging("KB_DISTILL", async (req) => { ... })
 */
export function withLogging(
  tag: string,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const start = Date.now()
    const method = req.method
    const path = new URL(req.url).pathname

    try {
      const response = await handler(req)
      const duration = Date.now() - start

      if (duration > 5000) {
        console.warn(`[${tag}] SLOW ${method} ${path} — ${duration}ms (status ${response.status})`)
      }

      return response
    } catch (error: any) {
      const duration = Date.now() - start
      console.error(`[${tag}] ERROR ${method} ${path} — ${duration}ms:`, error.message || error)

      return NextResponse.json(
        { error: "Internal server error", tag },
        { status: 500 }
      )
    }
  }
}
