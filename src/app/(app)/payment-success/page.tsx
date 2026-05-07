import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

const LAYER_NAMES: Record<string, string> = {
  "1": "Ordine Internă",
  "2": "Echitate Salarială",
  "3": "Competitivitate",
  "4": "Dezvoltare Organizațională",
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const success = typeof params.success === "string" ? params.success : undefined
  const tier = typeof params.tier === "string" ? params.tier : undefined
  const layer = typeof params.layer === "string" ? params.layer : undefined
  const amount = typeof params.amount === "string" ? params.amount : undefined

  if (!success) {
    redirect("/portal")
  }

  const layerName = layer ? LAYER_NAMES[layer] || `Pachet ${layer}` : ""

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Checkmark icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          Mulțumim! Plata a fost procesată.
        </h1>

        <p className="mb-6 text-sm text-muted-foreground">
          Factura va fi emisă automat și transmisă către SPV.
        </p>

        {/* Detail based on payment type */}
        <div className="mb-8 rounded-lg border bg-card p-4 text-sm text-card-foreground">
          {success === "subscription" && tier && (
            <p>
              Abonamentul <span className="font-medium">{tier}</span> este acum activ.
            </p>
          )}
          {success === "service" && layer && (
            <p>
              Pachetul <span className="font-medium">{layerName}</span> este acum disponibil.
            </p>
          )}
          {success === "credits" && amount && (
            <p>
              <span className="font-medium">{amount} credite</span> au fost adăugate în contul dvs.
            </p>
          )}
        </div>

        {/* Primary CTA */}
        <Link
          href="/portal"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Accesați portalul &rarr;
        </Link>

        {/* Secondary link */}
        <div className="mt-4">
          <Link
            href="/settings/billing"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Detalii facturare &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
