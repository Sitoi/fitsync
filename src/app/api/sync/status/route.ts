import { NextResponse } from 'next/server';
import { SyncEngine } from '@/lib/sync/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const engine = new SyncEngine();
    const status = await engine.getStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('API /sync/status error:', err);
    return NextResponse.json(
      { error: err.message || '获取同步状态失败' },
      { status: 500 }
    );
  }
}
