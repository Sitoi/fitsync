'use client';

import React from 'react';
import { Play, Pause, RotateCcw, RefreshCw, Calendar, Settings2 } from 'lucide-react';
import { SyncMode } from '@/lib/types';

interface ControlProps {
  mode: SyncMode;
  setMode: (m: SyncMode) => void;
  batchSize: number;
  setBatchSize: (size: number) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  disabled?: boolean;
}

export function SyncControlPanel({
  mode,
  setMode,
  batchSize,
  setBatchSize,
  startDate,
  setStartDate,
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onReset,
  onRefresh,
  onOpenSettings,
  disabled,
}: ControlProps) {
  return (
    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <span>同步控制面板</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Garmin CN → Global
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            支持全量历史分页同步与增量同步，分批次流式执行，适配 Vercel 无服务器部署限制。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-800 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>账号凭证设置</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>刷新数据</span>
          </button>
        </div>
      </div>

      {/* Mode selection tabs */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">选择同步模式</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => setMode('full')}
            className={`p-3 rounded-xl border text-left transition ${
              mode === 'full'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/40'
            }`}
          >
            <div className="font-medium text-sm">全量历史同步</div>
            <div className="text-xs text-zinc-400 mt-0.5">从国区全部历史拉取并同步到国际区</div>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => setMode('incremental')}
            className={`p-3 rounded-xl border text-left transition ${
              mode === 'incremental'
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/40'
            }`}
          >
            <div className="font-medium text-sm">增量日常同步</div>
            <div className="text-xs text-zinc-400 mt-0.5">仅同步上次同步之后或指定日期的新运动</div>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => setMode('retry_failed')}
            className={`p-3 rounded-xl border text-left transition ${
              mode === 'retry_failed'
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-400'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/40'
            }`}
          >
            <div className="font-medium text-sm">重试失败活动</div>
            <div className="text-xs text-zinc-400 mt-0.5">仅重新尝试曾因网络中断而失败的活动</div>
          </button>
        </div>
      </div>

      {/* Advanced params row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="text-xs font-medium text-zinc-400 block mb-1.5">
            单批次处理数量 (Batch Size)
          </label>
          <div className="flex items-center gap-2">
            {[3, 5, 10, 20].map((size) => (
              <button
                key={size}
                type="button"
                disabled={isRunning}
                onClick={() => setBatchSize(size)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                  batchSize === size
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {size} 条/批
              </button>
            ))}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Vercel Serverless 执行时限建议 5 条，本地环境可设为 10-20 条
          </span>
        </div>

        {mode === 'incremental' && (
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">
              指定起始日期 (可选)
            </label>
            <div className="relative">
              <input
                type="date"
                disabled={isRunning}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
              />
              <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              留空则自动从上次同步时间开始
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800/80">
        {!isRunning && !isPaused && (
          <button
            type="button"
            disabled={disabled}
            onClick={onStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {mode === 'full'
                ? '开始全量历史同步'
                : mode === 'incremental'
                ? '开始增量同步'
                : '开始重试失败项'}
            </span>
          </button>
        )}

        {isRunning && (
          <button
            type="button"
            onClick={onPause}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 transition"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>暂停同步</span>
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            onClick={onResume}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>继续同步</span>
          </button>
        )}

        <button
          type="button"
          disabled={isRunning}
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800 transition disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置同步状态记录</span>
        </button>
      </div>
    </div>
  );
}
