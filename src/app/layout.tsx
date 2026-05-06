import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import CookieConsent from "@/components/CookieConsent"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "JobGrade — Evaluare și ierarhizare posturi",
    template: "%s | JobGrade",
  },
  description:
    "Platformă AI de evaluare posturi, structurare salarială și dezvoltare profesională. Conformitate Directiva EU 2023/970.",
  metadataBase: new URL("https://jobgrade.ro"),
  openGraph: {
    title: "JobGrade — Evaluare și ierarhizare posturi",
    description:
      "Platformă AI de evaluare posturi, structurare salarială și dezvoltare profesională. Conformitate Directiva EU 2023/970.",
    siteName: "JobGrade",
    locale: "ro_RO",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JobGrade",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <head>
        <meta name="theme-color" content="#4F46E5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body className={inter.className}>
        {children}
        <CookieConsent />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            // Dezinstalează orice SW vechi care intercepta API calls
            navigator.serviceWorker.getRegistrations().then(regs => {
              regs.forEach(r => r.unregister());
            });
          }
        ` }} />
      </body>
    </html>
  )
}
