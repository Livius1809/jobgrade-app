import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import type { ChatAction, ParsedResponse } from "./types"

// ── Action tag regex ────────────────────────────────────────────────────────

/**
 * Matches [ACTION:type:value] tags in agent responses.
 * Examples:
 *   [ACTION:navigate:/jobs]
 *   [ACTION:highlight:#evaluation-form]
 *   [ACTION:open-modal:createJob]
 *   [ACTION:scroll-to:#pricing-section]
 */
const ACTION_PATTERN = /\[ACTION:(navigate|highlight|open-modal|scroll-to):([^\]]+)\]/g

// ── Parse ───────────────────────────────────────────────────────────────────

/**
 * Extracts action tags from agent response text and returns clean text + actions.
 * Actions are stripped silently — the user sees only natural conversation.
 */
export function parseActions(text: string): ParsedResponse {
  const actions: ChatAction[] = []

  let match: RegExpExecArray | null
  // Reset lastIndex for safety
  ACTION_PATTERN.lastIndex = 0

  while ((match = ACTION_PATTERN.exec(text)) !== null) {
    const [, type, value] = match
    switch (type) {
      case "navigate":
        actions.push({ type: "navigate", path: value })
        break
      case "highlight":
        actions.push({ type: "highlight", elementId: value.replace(/^#/, "") })
        break
      case "open-modal":
        actions.push({ type: "open-modal", modalName: value })
        break
      case "scroll-to":
        actions.push({ type: "scroll-to", elementId: value.replace(/^#/, "") })
        break
    }
  }

  // Remove action tags and clean up extra whitespace
  const cleanText = text
    .replace(ACTION_PATTERN, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return { cleanText, actions }
}

// ── Execute ─────────────────────────────────────────────────────────────────

/** Highlight duration in ms */
const HIGHLIGHT_DURATION = 3000

/**
 * Executes a single chat action.
 * Navigation uses the Next.js router; DOM actions are direct.
 */
export function executeAction(
  action: ChatAction,
  router: AppRouterInstance
): void {
  switch (action.type) {
    case "navigate": {
      // Only allow internal paths (security)
      if (action.path.startsWith("/")) {
        router.push(action.path)
      }
      break
    }

    case "highlight": {
      const el = document.getElementById(action.elementId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.style.outline = "2px solid #6366f1"
        el.style.outlineOffset = "4px"
        el.style.transition = "outline-color 0.3s ease"
        setTimeout(() => {
          el.style.outline = "none"
          el.style.outlineOffset = ""
        }, HIGHLIGHT_DURATION)
      }
      break
    }

    case "open-modal": {
      // Dispatch a custom event that modal components can listen for
      window.dispatchEvent(
        new CustomEvent("jobgrade:open-modal", {
          detail: { modalName: action.modalName },
        })
      )
      break
    }

    case "scroll-to": {
      const target = document.getElementById(action.elementId)
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      break
    }
  }
}

/**
 * Executes all actions from a parsed response, with a small stagger
 * so navigation happens before highlights on the new page.
 */
export function executeActions(
  actions: ChatAction[],
  router: AppRouterInstance
): void {
  // Navigate first, then DOM actions after a delay to let the page render
  const navigateActions = actions.filter((a) => a.type === "navigate")
  const domActions = actions.filter((a) => a.type !== "navigate")

  // Execute navigation immediately
  navigateActions.forEach((a) => executeAction(a, router))

  // Execute DOM actions after a short delay (allows page transition)
  if (domActions.length > 0) {
    const delay = navigateActions.length > 0 ? 800 : 0
    setTimeout(() => {
      domActions.forEach((a) => executeAction(a, router))
    }, delay)
  }
}
