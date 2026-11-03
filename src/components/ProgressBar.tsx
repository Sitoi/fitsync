'use client';

import React from 'react';
import { Loader2, CheckCircle2, PauseCircle } from 'lucide-react';

interface ProgressBarProps {
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  total: number;
  processed: number;
  currentActivity?: string;
  batchIndex: number;
}

export function ProgressBar({
  isRunning,
  isPaused,
  isFinished,
  total,
  processed,
  currentActivity,
  batchIndex,
}: ProgressBarProps) {
  if (!isRunning && !isPaused && !isFinished && processed === 0) {
    return null;
  }

  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          ) : isPaused ? (
            <PauseCircle className="w-4 h-4 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="font-medium text-zinc-200">
            {isRunning
              ? `正在执行批次 #${batchIndex}...`
              : isPaused
              ? '同步已暂停'
              : '同步批次执行完毕'}
          </span>
          {currentActivity && (
            <span className="text-xs text-zinc-400 truncate max-w-xs sm:max-w-md">
              ({currentActivity})
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-zinc-100">{percent}%</span>
          <span className="text-xs text-zinc-400 ml-2">
            ({processed} / {total > 0 ? total : '?'})
          </span>
        </div>
      </div>

      {/* Bar container */}
      <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isRunning
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse'
              : isPaused
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.max(percent, isRunning ? 5 : 0)}%` }}
        />
      </div>
    </div>
  );
}
