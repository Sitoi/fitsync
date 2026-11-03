'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Globe2,
  MapPin,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { ActivityRecord, GarminCredentials, SyncMode } from '@/lib/types';
import { MetricsCards } from '@/components/MetricsCards';
import { ProgressBar } from '@/components/ProgressBar';
import { SyncControlPanel } from '@/components/SyncControlPanel';
import { CredentialsModal } from '@/components/CredentialsModal';
import { ActivityTable } from '@/components/ActivityTable';
import { LogConsole } from '@/components/LogConsole';

export default function Home() {
  const [metrics, setMetrics] = useState({
    total: 0,
    uploaded: 0,
    duplicates: 0,
    failed: 0,
    lastSyncTime: null as string | null,
  });

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Sync execution state
  const [mode, setMode] = useState<SyncMode>('full');
  const [batchSize, setBatchSize] = useState(5);
  const [startDate, setStartDate] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [currentCursor, setCurrentCursor] = useState(0);
  const [currentActivityName, setCurrentActivityName] = useState('');

  // Refs for loop controls
  const stopRequestedRef = useRef(false);

  // Credentials
  const [cnCreds, setCnCreds] = useState<GarminCredentials>({});
  const [globalCreds, setGlobalCreds] = useState<GarminCredentials>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [serverFlags, setServerFlags] = useState({
    hasCn: false,
    hasGlobal: false,
    hasKv: false,
    cnUsernameMasked: '',
    globalUsernameMasked: '',
  });

  // Load from localStorage & fetch backend status on mount
  useEffect(() => {
    try {
      const savedCn = localStorage.getItem('fitsync_cn_creds');
      const savedGlobal = localStorage.getItem('fitsync_global_creds');
      if (savedCn) setCnCreds(JSON.parse(savedCn));
      if (savedGlobal) setGlobalCreds(JSON.parse(savedGlobal));
    } catch {
      // ignore
    }

    fetchConfigAndStatus();
  }, []);

  const fetchConfigAndStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const [configRes, statusRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/sync/status'),
      ]);

      if (configRes.ok) {
        const cfgData = await configRes.json();
        setServerFlags(cfgData);
      }

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setMetrics({
          total: sData.stats?.total || 0,
          uploaded: sData.stats?.uploaded || 0,
          duplicates: sData.stats?.duplicates || 0,
          failed: sData.stats?.failed || 0,
          lastSyncTime: sData.lastSyncTime || null,
        });
        if (Array.isArray(sData.recentActivities)) {
          setActivities(sData.recentActivities);
        }
      }
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSaveToLocal = () => {
    try {
      localStorage.setItem('fitsync_cn_creds', JSON.stringify(cnCreds));
      localStorage.setItem('fitsync_global_creds', JSON.stringify(globalCreds));
      addLog('已将当前凭证保存至浏览器本地缓存。');
    } catch {
      // ignore
    }
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // The client-driven sync loop (safely handles Vercel serverless execution limits)
  const runSyncLoop = async (initialCursor: number) => {
    setIsRunning(true);
    setIsPaused(false);
    setIsFinished(false);
    stopRequestedRef.current = false;

    let cursor: number | null = initialCursor;
    let bIdx = batchIndex || 1;

    addLog(`>>> 开始启动同步循环 (模式: ${mode}, 起始游标: ${cursor})`);

    try {
      while (cursor !== null && !stopRequestedRef.current) {
        setBatchIndex(bIdx);
        setCurrentCursor(cursor);

        addLog(`--- 正在请求第 ${bIdx} 批次 (游标 ${cursor})... ---`);

        const res: Response = await fetch('/api/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cursor,
            batchSize,
            mode,
            startDate: mode === 'incremental' ? startDate : undefined,
            credentials: {
              cn: cnCreds,
              global: globalCreds,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: 批次执行失败`);
        }

        const data: any = await res.json();

        // Append server logs
        if (Array.isArray(data.logs)) {
          setLogs((prev) => [...prev, ...data.logs]);
        }

        // Update activities and metrics
        if (Array.isArray(data.batchResults)) {
          setActivities((prev) => {
            const map = new Map<string, ActivityRecord>();
            for (const item of data.batchResults) {
              map.set(item.activityId, item);
            }
            for (const item of prev) {
              if (!map.has(item.activityId)) {
                map.set(item.activityId, item);
              }
            }
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
          });
        }

        if (data.summary) {
          setMetrics((prev) => ({
            ...prev,
            total: data.summary.totalDiscovered,
            uploaded: data.summary.syncedCount,
            duplicates: data.summary.duplicateCount,
            failed: data.summary.failedCount,
          }));
        }

        if (data.batchResults?.[0]?.activityName) {
          setCurrentActivityName(data.batchResults[0].activityName);
        }

        if (data.isFinished || data.nextCursor === null) {
          addLog('🎉 恭喜！全部符合条件的活动数据已同步完毕！');
          setIsFinished(true);
          setIsRunning(false);
          break;
        }

        cursor = data.nextCursor;
        bIdx++;

        if (stopRequestedRef.current) {
          addLog(`⏸ 同步已暂停在游标 ${cursor}`);
          setIsPaused(true);
          setIsRunning(false);
          break;
        }

        // Small interval between batches to respect Garmin rate limits
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (err: any) {
      addLog(`❌ 同步发生错误中断: ${err.message}`);
      setIsRunning(false);
      setIsPaused(true);
    } finally {
      if (!stopRequestedRef.current && cursor === null) {
        setIsRunning(false);
        setIsFinished(true);
      }
    }
  };

  const handleStart = () => {
    setBatchIndex(1);
    setCurrentCursor(0);
    runSyncLoop(0);
  };

  const handlePause = () => {
    stopRequestedRef.current = true;
    addLog('用户点击暂停，等待当前批次完成后停止...');
  };

  const handleResume = () => {
    runSyncLoop(currentCursor);
  };

  const handleReset = async () => {
    if (!confirm('确定要重置本地/KV中的同步状态吗？重置后将重新拉取所有历史记录。')) {
      return;
    }
    try {
      const res = await fetch('/api/sync/reset', { method: 'POST' });
      if (res.ok) {
        addLog('已重置同步记录');
        fetchConfigAndStatus();
      }
    } catch (e: any) {
      addLog(`重置失败: ${e.message}`);
    }
  };

  const hasCredentialsConfigured =
    Boolean(cnCreds.username || serverFlags.hasCn) &&
    Boolean(globalCreds.username || serverFlags.hasGlobal);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background glowing gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                  FitSync
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  v2.0 Next.js
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  Vercel Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Garmin 中国区 (CN) 运动历史全量同步至 Garmin 国际区 (Global)
              </p>
            </div>
          </div>

          {/* Sync Route Visual Badge */}
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/60 text-xs font-medium text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Garmin CN</span>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/60 text-xs font-medium text-zinc-200">
              <Globe2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Garmin Global</span>
            </div>
          </div>
        </header>

        {/* Missing Credentials Alert banner if not configured */}
        {!hasCredentialsConfigured && !isLoadingStatus && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div>
              <span className="font-semibold text-amber-300">提示：尚未配置佳明账号凭证。</span>
              <span className="text-amber-200/80 ml-1">
                请先点击右侧“配置账号”输入 Garmin CN 与 Garmin 国际区账号，或在 Vercel 部署环境变量中设置。
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium transition shrink-0"
            >
              立即配置账号
            </button>
          </div>
        )}

        {/* Metrics Cards */}
        <MetricsCards
          total={metrics.total}
          uploaded={metrics.uploaded}
          duplicates={metrics.duplicates}
          failed={metrics.failed}
          lastSyncTime={metrics.lastSyncTime}
          isLoading={isLoadingStatus}
        />

        {/* Real-time Progress Bar */}
        <ProgressBar
          isRunning={isRunning}
          isPaused={isPaused}
          isFinished={isFinished}
          total={metrics.total}
          processed={metrics.uploaded + metrics.duplicates + metrics.failed}
          currentActivity={currentActivityName}
          batchIndex={batchIndex}
        />

        {/* Sync Controls */}
        <SyncControlPanel
          mode={mode}
          setMode={setMode}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          startDate={startDate}
          setStartDate={setStartDate}
          isRunning={isRunning}
          isPaused={isPaused}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          onRefresh={fetchConfigAndStatus}
          onOpenSettings={() => setIsSettingsOpen(true)}
          disabled={!hasCredentialsConfigured}
        />

        {/* Activity Table */}
        <ActivityTable activities={activities} isLoading={isLoadingStatus} />

        {/* Real-time Terminal Log Console */}
        <LogConsole logs={logs} onClear={() => setLogs([])} />

        {/* Credentials Modal */}
        <CredentialsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          cnCreds={cnCreds}
          setCnCreds={setCnCreds}
          globalCreds={globalCreds}
          setGlobalCreds={setGlobalCreds}
          serverFlags={serverFlags}
          onSaveToLocal={handleSaveToLocal}
        />

        {/* Footer */}
        <footer className="pt-8 pb-12 border-t border-zinc-900 text-center text-xs text-zinc-400 space-y-1">
          <p>FitSync • Garmin CN → Garmin Global 双向同步引擎</p>
          <p>
            参考项目：
            <a
              href="https://github.com/deanxizian/DailySync"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-emerald-400 ml-1 underline underline-offset-2"
            >
              deanxizian/DailySync
            </a>
            与 FitHub Python 实现
          </p>
        </footer>
      </main>
    </div>
  );
}
