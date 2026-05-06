/**
 * pseudonym-guard.ts — B2C Pseudonim 2 Straturi (GDPR by design)
 *
 * Asigura separarea identitatii reale de pseudonim:
 *   Layer 1: alias (pseudonim) — folosit in comunitati, interactiuni publice
 *   Layer 2: email/name — doar in profilul privat, NICIODATA expus altora
 *
 * Reguli:
 *   SELF      — vede tot (propriul profil)
 *   COMMUNITY — vede doar alias, status carduri, mesaje comunitate
 *   AGENT     — vede alias + date profil (herrmann, hawkins) dar NU email
 *   ADMIN     — vede tot
 */

// ═══ TIPURI ═══

export type ViewerRole = "SELF" | "COMMUNITY" | "AGENT" | "ADMIN"

/**
 * Campuri considerate identitate reala (Layer 2) — nu trebuie niciodata
 * expuse catre COMMUNITY sau AGENT.
 */
const IDENTITY_FIELDS = new Set([
  "email",
  "passwordHash",
  "name",
  "firstName",
  "lastName",
  "fullName",
  "realName",
  "phone",
  "address",
  "dateOfBirth",
  "cnp", // cod numeric personal (RO)
])

/**
 * Campuri care trebuie ascunse de COMMUNITY (vad doar alias + public).
 * Include identity + date profil tehnic.
 */
const COMMUNITY_HIDDEN_FIELDS = new Set([
  ...IDENTITY_FIELDS,
  "herrmannA",
  "herrmannB",
  "herrmannC",
  "herrmannD",
  "hawkinsEstimate",
  "hawkinsConfidence",
  "viaSignature",
  "viaLesser",
  "bigFive",
  "cognitiveStyle",
  "lastJobTitle",
  "hasCurrentJob",
  "age",
  "gender",
  "locale",
  "lastLoginAt",
  "passwordHash",
])

/**
 * Campuri pe care AGENT le poate vedea (profil cognitiv pentru calibrare)
 * dar NU identity.
 */
const AGENT_HIDDEN_FIELDS = new Set([...IDENTITY_FIELDS])

// ═══ SANITIZARE ═══

/**
 * Sanitizeaza un raspuns B2C in functie de rolul celui care priveste.
 *
 * Functioneaza recursiv pe obiecte si array-uri, astfel incat orice structura
 * returnata de Prisma (inclusiv relatii nested) e curatata.
 *
 * @param data   — obiectul/array-ul de sanitizat
 * @param viewerRole — rolul celui care vede datele
 * @returns      — obiectul curatat (copie, nu modifica originalul)
 */
export function sanitizeB2CResponse(data: any, viewerRole: ViewerRole): any {
  // SELF si ADMIN vad tot
  if (viewerRole === "SELF" || viewerRole === "ADMIN") {
    return data
  }

  if (data === null || data === undefined) return data
  if (typeof data !== "object") return data

  // Array — sanitizeaza fiecare element
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeB2CResponse(item, viewerRole))
  }

  // Date — pastreaza ca atare
  if (data instanceof Date) return data

  // Obiect — filtreaza campuri
  const hiddenFields =
    viewerRole === "COMMUNITY" ? COMMUNITY_HIDDEN_FIELDS : AGENT_HIDDEN_FIELDS

  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (hiddenFields.has(key)) continue

    // Recursie pe obiecte/array nested (relatii Prisma)
    if (typeof value === "object" && value !== null && !(value instanceof Date)) {
      sanitized[key] = sanitizeB2CResponse(value, viewerRole)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Verifica daca un obiect contine campuri de identitate reala.
 * Util pentru audit — detecteaza scurgeri inainte de a trimite raspunsul.
 *
 * @returns lista campurilor de identitate gasite (goala = OK)
 */
export function auditIdentityLeaks(data: any): string[] {
  const leaks: string[] = []

  function walk(obj: any, path: string) {
    if (obj === null || obj === undefined || typeof obj !== "object") return
    if (obj instanceof Date) return

    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, `${path}[${i}]`))
      return
    }

    for (const [key, value] of Object.entries(obj)) {
      if (IDENTITY_FIELDS.has(key) && value !== null && value !== undefined) {
        leaks.push(`${path}.${key}`)
      }
      if (typeof value === "object" && value !== null) {
        walk(value, `${path}.${key}`)
      }
    }
  }

  walk(data, "root")
  return leaks
}
