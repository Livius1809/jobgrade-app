/**
 * bnr-rate.ts — fetcher curs BNR oficial USD/RON și EUR/RON
 *
 * Sursa publică: https://www.bnr.ro/nbrfxrates.xml
 * Format XML simplu, fără API key, public.
 *
 * Folosit de cron-ul zilnic care actualizează tabela CreditValue cu cursul
 * curent BNR + bufferul stabilit de COG.
 */

interface BNRRates {
  date: string // ISO YYYY-MM-DD
  usd: number // RON per 1 USD
  eur: number // RON per 1 EUR
}

const BNR_XML_URL = "https://www.bnr.ro/nbrfxrates.xml"

/**
 * Descarcă XML-ul de la BNR și extrage cursurile USD și EUR.
 */
export async function fetchBnrRates(): Promise<BNRRates> {
  const res = await fetch(BNR_XML_URL, {
    headers: { Accept: "application/xml" },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    throw new Error(`BNR XML fetch failed: ${res.status}`)
  }
  const xml = await res.text()

  // Extragere simplă cu regex (XML mic, structură stabilă)
  // <Cube date="2026-04-16">
  //   <Rate currency="USD">4.5678</Rate>
  //   <Rate currency="EUR">4.9876</Rate>
  // </Cube>
  const dateMatch = xml.match(/<Cube\s+date="([^"]+)">/)
  const usdMatch = xml.match(/<Rate\s+currency="USD"[^>]*>([\d.]+)<\/Rate>/)
  const eurMatch = xml.match(/<Rate\s+currency="EUR"[^>]*>([\d.]+)<\/Rate>/)

  if (!dateMatch || !usdMatch || !eurMatch) {
    throw new Error("BNR XML format neașteptat")
  }

  return {
    date: dateMatch[1],
    usd: parseFloat(usdMatch[1]),
    eur: parseFloat(eurMatch[1]),
  }
}
