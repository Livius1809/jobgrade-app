import { NextResponse } from 'next/server';
import { auditSecrets } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const secrets = auditSecrets();

  return NextResponse.json({
    status: secrets.ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'jobgrade-app',
    // Nu expunem CARE secrets lipsesc — doar statusul
    secretsConfigured: secrets.ok,
  });
}
