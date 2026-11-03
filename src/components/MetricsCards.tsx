'use client';

import React from 'react';
import { Activity, CheckCircle2, CopyCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface MetricsProps {
  total: number;
  uploaded: number;
  duplicates: number;
  failed: number;
  lastSyncTime: string | null;
  isLoading?: boolean;
}

export function MetricsCards({
  total,
  uploaded,
  duplicates,
  failed,
  lastSyncTime,
  isLoading,
}: MetricsProps) {
  const cards = [
    {
      title: '已发现总活动',
      value: total,
      sub: 'Garmin CN 本地记录活动数',
      icon: Activity,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: '成功上传至国际区',
      value: uploaded,
      sub: '首次同步成功写入国际区',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: '国际区已存在 (跳过)',
      value: duplicates,
      sub: '两端均已有记录，避免重复',
      icon: CopyCheck,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: '同步失败',
      value: failed,
      sub: failed > 0 ? '可点击“失败重试”再次同步' : '当前无失败项',
      icon: AlertCircle,
      color: failed > 0 ? 'text-rose-500' : 'text-zinc-400',
      bg: failed > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-zinc-500/10 border-zinc-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`p-5 rounded-2xl border transition-all duration-200 backdrop-blur-sm ${c.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {c.title}
              </span>
              <div className={`p-2 rounded-xl bg-zinc-900/60 ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-100">
                {isLoading ? '...' : c.value.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-400">条</span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
