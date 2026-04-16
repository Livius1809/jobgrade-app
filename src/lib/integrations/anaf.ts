/**
 * anaf.ts — integrare ANAF webservice V9 (TVA + date generale)
 *
 * Endpoint public, fără API key:
 *   POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/ws/tva
 * Body: [{ cui: number, data: "YYYY-MM-DD" }]
 *
 * Documentație: https://static.anaf.ro/static/10/Anaf/Informatii_R/API/Oferta_WS_v9.txt
 *
 * Limitări: max 500 CUI per request, max 1 request/secundă.
 */

const ANAF_ENDPOINT = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"

export interface AnafCompanyData {
  cui: string
  name: string
  vatNumber: string | null // RO12345678 dacă plătitor TVA
  isVATPayer: boolean
  address: string | null
  county: string | null
  city: string | null
  caenCode: string | null
  registrationNumber: string | null // ex: J40/1234/2020
  status: string | null // activ / radiat
  fetchedAt: Date
}

interface AnafRawResponse {
  cod?: number
  message?: string
  found: Array<{
    date_generale?: {
      cui: number
      data: string
      denumire: string
      adresa?: string
      nrRegCom?: string
      telefon?: string
      fax?: string
      codPostal?: string
      act?: string
      stare_inregistrare?: string
      data_inregistrare?: string
      cod_CAEN?: string
      iban?: string
      statusRO_e_Factura?: boolean
      organFiscalCompetent?: string
      forma_de_proprietate?: string
      forma_organizare?: string
      forma_juridica?: string
    }
    inregistrare_scop_Tva?: {
      scpTVA?: boolean
      data_inceput_ScpTVA?: string
      data_sfarsit_ScpTVA?: string
      data_anul_imp_ScpTVA?: string
      mesaj_ScpTVA?: string
    }
    inregistrare_RTVAI?: {
      dataInceputTvaInc?: string
      dataSfarsitTvaInc?: string
      dataActualizareTvaInc?: string
      dataPublicareTvaInc?: string
      tipActTvaInc?: string
      statusTvaIncasare?: boolean
    }
    stare_inactiv?: {
      dataInactivare?: string
      dataReactivare?: string
      dataPublicare?: string
      dataRadiere?: string
      statusInactivi?: boolean
    }
    inregistrare_SplitTVA?: {
      dataInceputSplitTVA?: string
      dataAnulareSplitTVA?: string
      statusSplitTVA?: boolean
    }
    adresa_sediu_social?: {
      sdenumire_Strada?: string
      snumar_Strada?: string
      sdenumire_Localitate?: string
      scod_Localitate?: string
      sdenumire_Judet?: string
      scod_Judet?: string
      scod_JudetAuto?: string
      stara?: string
      sdetalii_Adresa?: string
      scod_Postal?: string
    }
    adresa_domiciliu_fiscal?: {
      ddenumire_Strada?: string
      dnumar_Strada?: string
      ddenumire_Localitate?: string
      dcod_Localitate?: string
      ddenumire_Judet?: string
      dcod_Judet?: string
      dcod_JudetAuto?: string
      dtara?: string
      ddetalii_Adresa?: string
      dcod_Postal?: string
    }
  }>
  notFound: Array<{ cui: number; data: string }>
  notprocessed?: Array<unknown>
}

/**
 * Curăță CUI-ul de prefix RO și caractere non-numerice.
 * Returnează numărul (sau null dacă nu e valid).
 */
export function normalizeCUI(input: string): number | null {
  const digits = input.replace(/\D/g, "")
  if (!digits) return null
  const n = parseInt(digits, 10)
  if (isNaN(n) || n <= 0) return null
  // CUI valid în România = 2-10 cifre (în practică 4-9)
  if (digits.length < 2 || digits.length > 10) return null
  return n
}

/**
 * Format adresă completă din componentele ANAF.
 */
function buildAddress(
  raw: NonNullable<AnafRawResponse["found"][number]["adresa_sediu_social"]>
): { address: string | null; county: string | null; city: string | null } {
  const parts: string[] = []
  if (raw.sdenumire_Strada) parts.push(raw.sdenumire_Strada)
  if (raw.snumar_Strada) parts.push(`nr. ${raw.snumar_Strada}`)
  if (raw.sdetalii_Adresa) parts.push(raw.sdetalii_Adresa)
  if (raw.scod_Postal) parts.push(`cod ${raw.scod_Postal}`)
  return {
    address: parts.length > 0 ? parts.join(", ") : null,
    county: raw.sdenumire_Judet ?? null,
    city: raw.sdenumire_Localitate ?? null,
  }
}

/**
 * Apelează ANAF webservice și returnează datele firmei.
 *
 * @throws dacă CUI-ul nu e valid sau răspunsul nu e parsabil
 * @returns null dacă firma nu e găsită
 */
export async function lookupCUI(rawCUI: string): Promise<AnafCompanyData | null> {
  const cui = normalizeCUI(rawCUI)
  if (!cui) {
    throw new Error("CUI invalid — trebuie să fie un număr între 2 și 10 cifre")
  }

  const today = new Date().toISOString().slice(0, 10)
  const body = [{ cui, data: today }]

  let response: Response
  try {
    response = await fetch(ANAF_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      // ANAF e lent uneori — 15s timeout rezonabil
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "necunoscută"
    throw new Error(`Nu am putut contacta serverul ANAF (${msg}). Încearcă mai târziu.`)
  }

  if (!response.ok) {
    throw new Error(`Serverul ANAF a răspuns cu eroare ${response.status}`)
  }

  const data = (await response.json()) as AnafRawResponse

  if (data.message && data.message.toLowerCase().includes("error")) {
    throw new Error(`ANAF: ${data.message}`)
  }

  if (!data.found || data.found.length === 0) {
    // notFound array conține CUI-urile negăsite
    return null
  }

  const f = data.found[0]
  const general = f.date_generale
  if (!general) return null

  const sediu = f.adresa_sediu_social ?? f.adresa_domiciliu_fiscal
  const addr = sediu
    ? buildAddress(sediu as NonNullable<AnafRawResponse["found"][number]["adresa_sediu_social"]>)
    : { address: null, county: null, city: null }

  const isVAT = f.inregistrare_scop_Tva?.scpTVA === true
  const vatNumber = isVAT ? `RO${general.cui}` : null

  return {
    cui: String(general.cui),
    name: general.denumire,
    vatNumber,
    isVATPayer: isVAT,
    address: addr.address,
    county: addr.county,
    city: addr.city,
    caenCode: general.cod_CAEN ?? null,
    registrationNumber: general.nrRegCom ?? null,
    status: general.stare_inregistrare ?? null,
    fetchedAt: new Date(),
  }
}
