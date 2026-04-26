/**
 * prod-exec.ts — Execuție operațiuni pe DB PROD prin API
 *
 * REGULĂ PERMANENTĂ: Nu mai scriem direct în DB din scripturi locale.
 * Totul trece prin POST /api/v1/admin/exec pe prod.
 *
 * Usage:
 *   import { prodExec } from "@/lib/admin/prod-exec"
 *   await prodExec("kb-seed", { entries: [...] })
 *   await prodExec("create-task", { assignedTo: "COA", title: "..." })
 */

const PROD_URL = process.env.PROD_URL || "https://jobgrade.ro"
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || ""

export async function prodExec(operation: string, data: any): Promise<any> {
  const url = `${PROD_URL}/api/v1/admin/exec`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_KEY,
    },
    body: JSON.stringify({ operation, data }),
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(`[prod-exec] ${operation} failed: ${json.error || res.statusText}`)
  }

  return json
}

/**
 * Helper-e specifice
 */
export async function seedKBOnProd(entries: Array<{
  agentRole: string; content: string; tags?: string[];
  confidence?: number; source?: string; kbType?: string;
}>) {
  return prodExec("kb-seed", { entries })
}

export async function createTaskOnProd(task: {
  assignedTo: string; title: string; description?: string;
  assignedBy?: string; taskType?: string; priority?: string; tags?: string[];
}) {
  return prodExec("create-task", task)
}

export async function createTasksBatchOnProd(tasks: Array<{
  assignedTo: string; title: string; description?: string;
  assignedBy?: string; taskType?: string; priority?: string; tags?: string[];
}>) {
  return prodExec("create-tasks-batch", { tasks })
}

export async function notifyOwnerOnProd(title: string, body: string, sourceRole = "SYSTEM") {
  return prodExec("create-notification", { title, body, sourceRole })
}

export async function queryProd(sql: string): Promise<any[]> {
  const result = await prodExec("read-query", { sql })
  return result.rows || []
}
