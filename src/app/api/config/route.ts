import { NextResponse } from 'next/server';
import { getEnvConfig, hasServerCredentials } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const flags = hasServerCredentials();
  const cfg = getEnvConfig();

  // Masked usernames for display
  const maskEmail = (str: string) => {
    if (!str) return '';
    const parts = str.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const masked = name.length > 2 ? `${name.slice(0, 2)}***` : `${name}***`;
      return `${masked}@${parts[1]}`;
    }
    return str.length > 3 ? `${str.slice(0, 2)}***` : `${str}***`;
  };

  return NextResponse.json({
    hasCn: flags.hasCn,
    hasGlobal: flags.hasGlobal,
    hasKv: flags.hasKv,
    hasCronSecret: flags.hasCronSecret,
    cnUsernameMasked: maskEmail(cfg.garminCnUsername),
    globalUsernameMasked: maskEmail(cfg.garminGlobalUsername),
  });
}
