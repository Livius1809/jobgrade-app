import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import LinkedIn from "next-auth/providers/linkedin"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parolă", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email as string,
            status: "ACTIVE",
          },
          include: {
            tenant: true,
            department: true,
          },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        // Actualizează lastLogin
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })

        // Verificare silentă: email încă activ pe domeniu (non-blocking)
        // Dacă OAuth fail sau bounce → suspendare + notificare admini
        import("@/lib/auth/email-check").then(({ checkEmailActive, suspendUserAndNotifyAdmins }) => {
          checkEmailActive(user.email).then(result => {
            if (!result.valid) {
              suspendUserAndNotifyAdmins(user.id, result.reason || "Email dezactivat pe domeniu")
            }
          }).catch(() => {})
        }).catch(() => {})

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          tenantId: user.tenantId,
          role: user.role,
          locale: user.locale,
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    authorized({ request, auth }) {
      // Public paths — allow without auth
      const { pathname } = request.nextUrl
      const publicPaths = ["/", "/sandbox", "/login", "/register", "/forgot-password", "/reset-password", "/activate", "/welcome", "/termeni", "/privacy", "/gdpr", "/cookies", "/transparenta-ai", "/b2b", "/media-books", "/personal", "/demo"]
      const publicPrefixes = ["/b2b/", "/api/", "/_next/", "/media-books/", "/personal/", "/demo/"]
      if (publicPaths.includes(pathname)) return true
      if (publicPrefixes.some(p => pathname.startsWith(p))) return true
      if (pathname.includes(".")) return true
      // Protected — require auth
      return !!auth
    },
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = (user as any).tenantId
        token.role = (user as any).role
        token.locale = (user as any).locale
      }

      // Validate user still exists and is ACTIVE in DB (every request).
      // Prevents access after logout, user deletion, or status change.
      // Cost: 1 lightweight DB query per request (indexed by id).
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, status: true, role: true },
        })
        if (!dbUser || dbUser.status !== "ACTIVE") {
          // Return empty token — NextAuth treats this as "no session"
          return {} as typeof token
        }
        // Sync role from DB (in case it changed since token was issued)
        token.role = dbUser.role
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.tenantId = token.tenantId as string
        session.user.role = token.role as UserRole
        session.user.locale = token.locale as string
      }
      return session
    },
  },
})
