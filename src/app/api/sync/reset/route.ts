import { NextResponse } from 'next/server';
import { SyncEngine } from '@/lib/sync/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const engine = new SyncEngine();
    await engine.resetState();
    return NextResponse.json({ success: true, message: '同步状态已重置' });
  } catch (err: any) {
    console.error('API /sync/reset error:', err);
    return NextResponse.json(
      { error: err.message || '重置状态失败' },
      { status: 500 }
    );
  }
}
