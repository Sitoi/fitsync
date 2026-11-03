import { NextRequest, NextResponse } from 'next/server';
import { SyncEngine } from '@/lib/sync/engine';
import { BatchSyncOptions } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Max duration for Vercel functions (if Pro plan allows up to 60s, Hobby 15s)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: BatchSyncOptions = await req.json().catch(() => ({}));
    const engine = new SyncEngine();

    const response = await engine.syncBatch(body);
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('API /sync/batch error:', err);
    return NextResponse.json(
      {
        error: err.message || '批次同步过程中发生异常',
        logs: [`[${new Date().toLocaleTimeString()}] 异常: ${err.message}`],
      },
      { status: 500 }
    );
  }
}
