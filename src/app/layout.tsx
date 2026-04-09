import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
