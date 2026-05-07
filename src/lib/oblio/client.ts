/**
 * Oblio.eu API Client
 *
 * Emite documente fiscale: facturi, chitanțe, bonuri fiscale.
 * Autentificare OAuth2: client_id (email) + client_secret → Bearer token.
 *
 * Documentație: https://www.oblio.eu/api
 */

const OBLIO_API_URL = "https://www.oblio.eu/api"

// ── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  // Reuse cached token if still valid (5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) {
    return cachedToken.token
  }

  const clientId = process.env.OBLIO_CLIENT_ID
  const clientSecret = process.env.OBLIO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("OBLIO_CLIENT_ID și OBLIO_CLIENT_SECRET trebuie configurate")
  }

  const res = await fetch(`${OBLIO_API_URL}/authorize/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => "")
    throw new Error(`Oblio auth failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }

  return cachedToken.token
}

// ── API call helper ──────────────────────────────────────────────────────────

async function oblioFetch(
  endpoint: string,
  method: "GET" | "POST" | "PUT" = "POST",
  body?: Record<string, any>
): Promise<any> {
  const token = await getAccessToken()
  const cif = process.env.OBLIO_CIF || "RO15790994"

  const res = await fetch(`${OBLIO_API_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify({ ...body, cif }) : undefined,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => "")
    throw new Error(`Oblio API ${endpoint}: ${res.status} ${err}`)
  }

  return res.json()
}

// ── Document types ───────────────────────────────────────────────────────────

export interface OblioInvoiceItem {
  name: string
  description?: string
  quantity: number
  unit: string // "buc", "luna", etc.
  price: number // preț unitar fără TVA
  vatPercentage: number // 21, 0, etc.
  vatIncluded?: boolean
}

export interface OblioCollect {
  type: "Bon fiscal card" | "Chitanta" | "Card" | "Ordin de plata" | "Alta incasare banca"
  value?: number // default: totalul documentului
  issueDate?: string // YYYY-MM-DD
  mentions?: string
  seriesName?: string // obligatoriu doar pentru Chitanta
  documentNumber?: string
}

export interface OblioInvoiceData {
  seriesName: string // seria facturii (ex: "JG")
  clientName: string
  clientCui?: string // CUI dacă e firmă
  clientAddress?: string
  clientCounty?: string
  clientCountry?: string
  issueDate?: string // YYYY-MM-DD
  dueDate?: string // YYYY-MM-DD
  products: OblioInvoiceItem[]
  collect?: OblioCollect // încasare simultană cu emiterea
  mentions?: string
  language?: "RO" | "EN"
  currency?: string // default RON
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Emite factură (B2B) sau factură simplificată (B2C) cu încasare simultană.
 */
export async function createInvoice(data: OblioInvoiceData): Promise<any> {
  return oblioFetch("/docs/invoice", "POST", data)
}

/**
 * Emite bon fiscal card pentru B2C — tranzacție online cu cardul.
 * Creează factură simplificată + încasare "Bon fiscal card" simultan.
 */
export async function emitBonFiscalCard(params: {
  clientAlias: string // pseudonimul B2C
  items: OblioInvoiceItem[]
  totalAmount: number
  stripePaymentId?: string
  issueDate?: string
}): Promise<any> {
  const today = params.issueDate || new Date().toISOString().split("T")[0]

  return createInvoice({
    seriesName: "BF", // serie bonuri fiscale
    clientName: params.clientAlias,
    clientCountry: "Romania",
    issueDate: today,
    dueDate: today, // plătit instant
    currency: "RON",
    language: "RO",
    products: params.items,
    collect: {
      type: "Bon fiscal card",
      value: params.totalAmount,
      issueDate: today,
      mentions: params.stripePaymentId
        ? `Plata online card — Stripe ${params.stripePaymentId}`
        : "Plata online card",
    },
    mentions: "Document generat automat — plata procesata prin Stripe.",
  })
}

/**
 * Emite factură B2B cu date complete.
 */
export async function emitFacturaB2B(params: {
  clientName: string
  clientCui: string
  clientAddress: string
  clientCounty: string
  items: OblioInvoiceItem[]
  stripePaymentId?: string
  dueDate?: string
}): Promise<any> {
  const today = new Date().toISOString().split("T")[0]

  return createInvoice({
    seriesName: "JG", // serie facturi JobGrade
    clientName: params.clientName,
    clientCui: params.clientCui,
    clientAddress: params.clientAddress,
    clientCounty: params.clientCounty,
    clientCountry: "Romania",
    issueDate: today,
    dueDate: params.dueDate || today,
    currency: "RON",
    language: "RO",
    products: params.items,
    collect: {
      type: "Card",
      value: params.items.reduce((s, i) => s + i.price * i.quantity, 0),
      issueDate: today,
      mentions: params.stripePaymentId
        ? `Plata online card — Stripe ${params.stripePaymentId}`
        : "Plata online card",
    },
  })
}

/**
 * Verifică conexiunea cu Oblio API.
 */
export async function checkOblioHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getAccessToken()
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
