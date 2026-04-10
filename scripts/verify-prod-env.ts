/**
 * verify-prod-env.ts — Verifică că toate env vars necesare pentru producție
 * sunt setate și corect formatate. Rulează ÎNAINTE de deploy pentru a evita
 * rulage 500 la primul request din producție.
 *
 * Usage:
 *   npx tsx scripts/verify-prod-env.ts
 *   DATABASE_URL="postgresql://..." npx tsx scripts/verify-prod-env.ts
 *
 * Output: listă cu ✅ / ❌ / ⚠️ pentru fiecare variabilă + verdict final.
 */
import "dotenv/config"

interface EnvCheck {
  key: string
  required: boolean
  validator?: (value: string) => string | true
  description: string
  category: "database" | "auth" | "ai" | "email" | "app" | "billing" | "monitoring"
}

const CHECKS: EnvCheck[] = [
  // ── Database ──────────────────────────────────────────────────────
  {
    key: "DATABASE_URL",
    required: true,
    validator: (v) =>
      v.startsWith("postgresql://") && v.includes("sslmode=require")
        ? true
        : "Trebuie să fie postgresql:// cu sslmode=require",
    description: "Connection string Neon Pro prod (cu pooler)",
    category: "database",
  },

  // ── Auth ──────────────────────────────────────────────────────────
  {
    key: "NEXTAUTH_SECRET",
    required: true,
    validator: (v) => (v.length >= 32 ? true : "Minim 32 caractere"),
    description: "NextAuth JWT signing secret (32+ caractere random)",
    category: "auth",
  },
  {
    key: "NEXTAUTH_URL",
    required: true,
    validator: (v) =>
      v.startsWith("https://") || v.startsWith("http://localhost")
        ? true
        : "Trebuie https://domain.ro în producție",
    description: "URL-ul public al app (https://jobgrade.ro)",
    category: "auth",
  },
  {
    key: "INTERNAL_API_KEY",
    required: true,
    validator: (v) => (v.length >= 32 ? true : "Minim 32 caractere"),
    description: "Secret pentru apeluri între Vercel ↔ n8n (separat per env)",
    category: "auth",
  },

  // ── AI ────────────────────────────────────────────────────────────
  {
    key: "ANTHROPIC_API_KEY",
    required: true,
    validator: (v) =>
      v.startsWith("sk-ant-")
        ? true
        : "Trebuie să înceapă cu sk-ant-",
    description: "Claude API key pentru agenți + task executor",
    category: "ai",
  },

  // ── Email ─────────────────────────────────────────────────────────
  {
    key: "RESEND_API_KEY",
    required: true,
    validator: (v) =>
      v.startsWith("re_") ? true : "Trebuie să înceapă cu re_",
    description: "Resend API key pentru email invite/notify",
    category: "email",
  },
  {
    key: "EMAIL_FROM",
    required: true,
    validator: (v) => (v.includes("@") ? true : "Format: Name <email@domain>"),
    description: "Email sender (ex: 'JobGrade <noreply@jobgrade.ro>')",
    category: "email",
  },

  // ── App config ────────────────────────────────────────────────────
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: true,
    validator: (v) =>
      v.startsWith("https://") || v.startsWith("http://localhost")
        ? true
        : "Trebuie https:// în producție",
    description: "URL public pentru client-side calls + email links",
    category: "app",
  },
  {
    key: "NODE_ENV",
    required: false,
    validator: (v) =>
      ["development", "production", "test"].includes(v)
        ? true
        : "Trebuie development/production/test",
    description: "Mediu execuție (Vercel îl setează automat)",
    category: "app",
  },
  {
    key: "EXECUTOR_CRON_ENABLED",
    required: false,
    validator: (v) =>
      ["true", "false"].includes(v) ? true : "Trebuie true sau false",
    description: "Kill switch pentru FLUX-057 executor cron (default off recomandat)",
    category: "app",
  },

  // ── Billing (Stripe) ──────────────────────────────────────────────
  {
    key: "STRIPE_SECRET_KEY",
    required: false, // Opțional până la primul client plătitor
    validator: (v) =>
      v.startsWith("sk_")
        ? true
        : "Trebuie să înceapă cu sk_live_ (prod) sau sk_test_ (staging)",
    description: "Stripe secret key pentru checkout + webhook",
    category: "billing",
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    required: false,
    validator: (v) =>
      v.startsWith("whsec_") ? true : "Trebuie să înceapă cu whsec_",
    description: "Stripe webhook signing secret",
    category: "billing",
  },
  {
    key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    required: false,
    validator: (v) =>
      v.startsWith("pk_")
        ? true
        : "Trebuie să înceapă cu pk_live_ (prod) sau pk_test_ (staging)",
    description: "Stripe publishable key pentru client-side",
    category: "billing",
  },

  // ── Monitoring ────────────────────────────────────────────────────
  {
    key: "SENTRY_DSN",
    required: false,
    validator: (v) =>
      v.startsWith("https://") ? true : "Trebuie URL https://... sentry.io",
    description: "Sentry DSN pentru error tracking",
    category: "monitoring",
  },

  // ── Rate Limiting (Upstash Redis) ─────────────────────────────────
  {
    key: "UPSTASH_REDIS_URL",
    required: false, // Fallback la in-memory, dar pe Vercel serverless NU persistă între requests
    validator: (v) =>
      v.startsWith("https://") ? true : "Trebuie URL https://... upstash.io",
    description: "Upstash Redis URL — CRITIC pe Vercel serverless (fallback in-memory nu funcționează cross-request)",
    category: "app",
  },
  {
    key: "UPSTASH_REDIS_TOKEN",
    required: false,
    validator: (v) =>
      v.length >= 20 ? true : "Token prea scurt",
    description: "Upstash Redis auth token",
    category: "app",
  },
]

// ─── Run checks ──────────────────────────────────────────────────────

function checkEnv(check: EnvCheck): {
  status: "ok" | "missing" | "invalid" | "skipped"
  message?: string
} {
  const value = process.env[check.key]
  if (!value) {
    return {
      status: check.required ? "missing" : "skipped",
      message: check.required ? "lipsește (OBLIGATORIU)" : "lipsește (opțional)",
    }
  }
  if (check.validator) {
    const result = check.validator(value)
    if (result !== true) {
      return { status: "invalid", message: result }
    }
  }
  return { status: "ok" }
}

async function main() {
  console.log("\n═══ Verificare env vars pentru producție ═══\n")
  console.log(`NODE_ENV: ${process.env.NODE_ENV || "undefined"}`)
  console.log()

  const byCategory: Record<string, EnvCheck[]> = {}
  for (const c of CHECKS) {
    if (!byCategory[c.category]) byCategory[c.category] = []
    byCategory[c.category].push(c)
  }

  let criticalErrors = 0
  let warnings = 0
  let optionalMissing = 0

  for (const [cat, checks] of Object.entries(byCategory)) {
    console.log(`── ${cat.toUpperCase()} ──`)
    for (const check of checks) {
      const result = checkEnv(check)
      let icon: string
      switch (result.status) {
        case "ok":
          icon = "✅"
          break
        case "missing":
          icon = check.required ? "❌" : "⚠️ "
          if (check.required) criticalErrors++
          else optionalMissing++
          break
        case "invalid":
          icon = "❌"
          criticalErrors++
          break
        case "skipped":
          icon = "⚠️ "
          optionalMissing++
          break
      }
      const suffix = result.message ? ` — ${result.message}` : ""
      console.log(`  ${icon} ${check.key.padEnd(40)} ${suffix}`)
      if (result.status !== "ok") {
        console.log(`     └─ ${check.description}`)
      }
    }
    console.log()
  }

  // ── Verdict ────────────────────────────────────────────────────────
  console.log("─".repeat(70))
  console.log()
  if (criticalErrors > 0) {
    console.log(`❌ NU E GATA: ${criticalErrors} variabile obligatorii lipsesc sau sunt invalide`)
    console.log(`   Fixează-le ÎNAINTE de deploy. Primul request pe prod va returna 500.`)
    if (optionalMissing > 0) {
      console.log(`   Plus ${optionalMissing} variabile opționale neconfigurate (ok pentru start).`)
    }
    process.exit(1)
  } else if (optionalMissing > 0) {
    console.log(`✅ GATA pentru deploy (minimal)`)
    console.log(`   ${optionalMissing} variabile opționale neconfigurate — acceptabil pentru MVP:`)
    console.log(`   - Stripe: poți lansa fără billing până la primul client plătitor`)
    console.log(`   - Sentry: recomandat dar non-blocant`)
  } else {
    console.log(`✅ GATA pentru deploy complet — toate variabilele configurate`)
  }
  console.log()
  console.log("Următorul pas: npx prisma migrate deploy (pentru a aplica schema pe DB prod)")
  console.log()
}

main()
