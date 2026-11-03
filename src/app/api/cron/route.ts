import { NextRequest, NextResponse } from 'next/server';
import { SyncEngine } from '@/lib/sync/engine';
import { getEnvConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const env = getEnvConfig();

  // If CRON_SECRET is configured, verify incoming auth header
  if (env.cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const engine = new SyncEngine();
    // Run an incremental batch for the latest activities
    const result = await engine.syncBatch({
      mode: 'incremental',
      batchSize: 10,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (err: any) {
    console.error('Vercel Cron sync failed:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
