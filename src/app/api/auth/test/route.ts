import { NextRequest, NextResponse } from 'next/server';
import { GarminClient } from '@/lib/garmin/client';
import { GarminRegion, SavedSession } from '@/lib/types';
import { getEnvConfig } from '@/lib/config';
import { getSyncStore } from '@/lib/state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const region = (body.region || 'CN') as GarminRegion;
    const env = getEnvConfig();

    let username = body.username;
    let password = body.password;
    const session = body.session as SavedSession | undefined;

    // Fall back to server env vars if not passed in body
    if (!username && !session?.token?.oauth1) {
      if (region === 'CN') {
        username = env.garminCnUsername;
        password = env.garminCnPassword;
      } else {
        username = env.garminGlobalUsername;
        password = env.garminGlobalPassword;
      }
    }

    if (!username && !session?.token?.oauth1) {
      return NextResponse.json(
        { error: `请提供 Garmin ${region} 的账号密码或有效会话。` },
        { status: 400 }
      );
    }

    const client = new GarminClient(region);
    const { profile, session: freshSession } = await client.connect({
      username,
      password,
      session,
    });

    // Save fresh session to store
    const store = getSyncStore();
    await store.updateSessions({
      [region === 'CN' ? 'cn' : 'global']: freshSession,
    });

    return NextResponse.json({
      success: true,
      profile,
      session: freshSession,
    });
  } catch (err: any) {
    console.error('Auth test failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || '连接失败' },
      { status: 500 }
    );
  }
}
