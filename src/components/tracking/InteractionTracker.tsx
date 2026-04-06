"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

/**
 * InteractionTracker — invisible component that logs page views.
 * Fire-and-forget: failures are silent, never blocks UI.
 */
export default function InteractionTracker() {
  const pathname = usePathname()
  const enteredAt = useRef<number>(Date.now())
  const prevPath = useRef<string | null>(null)

  useEffect(() => {
    // Log page leave for previous page (with duration)
    if (prevPath.current && prevPath.current !== pathname) {
      const durationMs = Date.now() - enteredAt.current
      track("PAGE_LEAVE", { pageRoute: prevPath.current, durationMs })
    }

    // Log new page view
    track("PAGE_VIEW", { pageRoute: pathname })
    enteredAt.current = Date.now()
    prevPath.current = pathname
  }, [pathname])

  // Log page leave on tab close
  useEffect(() => {
    function handleBeforeUnload() {
      if (prevPath.current) {
        const durationMs = Date.now() - enteredAt.current
        // Use sendBeacon for reliability on page unload
        navigator.sendBeacon(
          "/api/v1/track",
          JSON.stringify({ eventType: "PAGE_LEAVE", pageRoute: prevPath.current, durationMs })
        )
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  return null
}

/** Fire-and-forget tracking call */
export function track(
  eventType: string,
  data?: { pageRoute?: string; entityType?: string; entityId?: string; detail?: string; durationMs?: number }
) {
  fetch("/api/v1/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, ...data }),
  }).catch(() => {}) // Silent
}
