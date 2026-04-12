/**
 * Media Books configuration + data fetching.
 *
 * Reads completed agentTask results tagged "media-book" from the DB.
 * Priority: PMP_B2B (integrated final) > CWA (narrative) > first available.
 * Content is Markdown produced by the organism's interdisciplinary teams.
 */

import { prisma } from "@/lib/prisma"

export interface MediaBookConfig {
  code: string
  slug: string
  title: string
  subtitle: string
  type: "Raport" | "Serviciu"
  icon: string
}

export const MEDIA_BOOKS: MediaBookConfig[] = [
  {
    code: "MB-R1",
    slug: "job-grading",
    title: "Job Grading",
    subtitle: "Ierarhizare și evaluare posturi",
    type: "Raport",
    icon: "📊",
  },
  {
    code: "MB-R2",
    slug: "pay-gap-analysis",
    title: "Pay Gap Analysis",
    subtitle: "Analiza decalajului salarial (Art. 9 Directiva EU 2023/970)",
    type: "Raport",
    icon: "⚖️",
  },
  {
    code: "MB-R3",
    slug: "joint-assessment",
    title: "Joint Assessment",
    subtitle: "Evaluare comună angajator-angajați (Art. 10 Directiva EU 2023/970)",
    type: "Raport",
    icon: "🤝",
  },
  {
    code: "MB-S1",
    slug: "evaluare-personal",
    title: "Evaluare Personal",
    subtitle: "Evaluare competențe și potențial angajați",
    type: "Serviciu",
    icon: "👥",
  },
  {
    code: "MB-S2",
    slug: "analiza-multigenerationala",
    title: "Analiza Multigenerațională",
    subtitle: "Dinamica echipelor multi-generaționale",
    type: "Serviciu",
    icon: "🔄",
  },
  {
    code: "MB-S3",
    slug: "procese-calitate",
    title: "Procese Calitate",
    subtitle: "Sistem calitate furnizor-client cu validare AI",
    type: "Serviciu",
    icon: "✅",
  },
  {
    code: "MB-S4",
    slug: "cultura-performanta",
    title: "Cultură și Performanță",
    subtitle: "Organism viu adaptativ — cultură organizațională",
    type: "Serviciu",
    icon: "🌱",
  },
]

export function getMediaBookBySlug(slug: string): MediaBookConfig | undefined {
  return MEDIA_BOOKS.find((mb) => mb.slug === slug)
}

export function getMediaBookByCode(code: string): MediaBookConfig | undefined {
  return MEDIA_BOOKS.find((mb) => mb.code === code)
}

/**
 * Fetch the best available content for a Media Book.
 * Priority: PMP_B2B (coordinator, integrated) > CWA (narrative copy) > largest result.
 */
export async function getMediaBookContent(code: string): Promise<{
  content: string
  author: string
  sections: { role: string; content: string; chars: number }[]
} | null> {
  const tasks = await prisma.agentTask.findMany({
    where: {
      status: "COMPLETED",
      tags: { hasEvery: ["media-book", code] },
      result: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { assignedTo: true, result: true },
  })

  if (tasks.length === 0) return null

  // Build sections from all contributors
  const sections = tasks
    .filter((t) => t.result && t.result.length > 500)
    .map((t) => ({
      role: t.assignedTo,
      content: t.result!,
      chars: t.result!.length,
    }))

  // Select primary content: PMP_B2B > CWA > largest
  const primary =
    tasks.find((t) => t.assignedTo === "PMP_B2B" && t.result!.length > 2000) ||
    tasks.find((t) => t.assignedTo === "CWA" && t.result!.length > 2000) ||
    tasks.reduce((best, t) =>
      (t.result?.length || 0) > (best.result?.length || 0) ? t : best
    )

  return {
    content: primary.result || "",
    author: primary.assignedTo,
    sections,
  }
}

/**
 * Get summary stats for all Media Books (for index page).
 */
export async function getMediaBooksSummary(): Promise<
  (MediaBookConfig & {
    completedTasks: number
    totalChars: number
    hasContent: boolean
    status: "ready" | "in-progress" | "planned"
  })[]
> {
  const results = await Promise.all(
    MEDIA_BOOKS.map(async (mb) => {
      const tasks = await prisma.agentTask.findMany({
        where: {
          tags: { hasEvery: ["media-book", mb.code] },
          status: "COMPLETED",
          result: { not: null },
        },
        select: { result: true },
      })

      const totalChars = tasks.reduce((sum, t) => sum + (t.result?.length || 0), 0)
      const hasContent = tasks.some((t) => (t.result?.length || 0) > 2000)

      return {
        ...mb,
        completedTasks: tasks.length,
        totalChars,
        hasContent,
        status: hasContent
          ? ("ready" as const)
          : tasks.length > 0
            ? ("in-progress" as const)
            : ("planned" as const),
      }
    })
  )

  return results
}
