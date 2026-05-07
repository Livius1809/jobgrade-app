import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function B2CPaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const amount = typeof params.amount === "string" ? params.amount : undefined

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
          Mulțumim! Creditele au fost adăugate.
        </h1>

        {amount && (
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="font-medium">{amount} credite</span> disponibile în contul tău.
          </p>
        )}

        <p className="mb-8 text-sm text-muted-foreground">
          Bon fiscal / factura va fi emisă automat.
        </p>

        {/* Primary CTA */}
        <Link
          href="/personal"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Continuă &rarr;
        </Link>
      </div>
    </div>
  )
}
