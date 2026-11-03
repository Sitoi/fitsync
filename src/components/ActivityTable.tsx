'use client';

import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, AlertTriangle, Check, Layers } from 'lucide-react';
import { ActivityRecord } from '@/lib/types';
import { getSportInfo, formatDistance, formatDuration, formatDateTime } from '@/lib/garmin/sports';

interface TableProps {
  activities: ActivityRecord[];
  isLoading?: boolean;
}

export function ActivityTable({ activities, isLoading }: TableProps) {
  const [filter, setFilter] = useState<'all' | 'uploaded' | 'already_exists' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filtered = useMemo(() => {
    return activities.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesId = item.activityId.toLowerCase().includes(q);
        const matchesName = (item.activityName || '').toLowerCase().includes(q);
        const matchesSport = (item.sport || '').toLowerCase().includes(q);
        return matchesId || matchesName || matchesSport;
      }
      return true;
    });
  }, [activities, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = (record: ActivityRecord) => {
    switch (record.status) {
      case 'uploaded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3" />
            已同步
          </span>
        );
      case 'already_exists':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-3 h-3" />
            已存在
          </span>
        );
      case 'failed':
        return (
          <span
            title={record.error || '同步错误'}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 cursor-help"
          >
            <AlertTriangle className="w-3 h-3" />
            失败
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            跳过
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md overflow-hidden">
      <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-zinc-100">历史同步记录列表</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            共 {filtered.length} 条
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filters */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
            <button
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'all' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => {
                setFilter('uploaded');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'uploaded' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              新上传
            </button>
            <button
              onClick={() => {
                setFilter('already_exists');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'already_exists' ? 'bg-blue-500/20 text-blue-300 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              已存在
            </button>
            <button
              onClick={() => {
                setFilter('failed');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'failed' ? 'bg-rose-500/20 text-rose-300 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              失败
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索活动名称或 ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 w-44 sm:w-56"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/40 text-zinc-400 border-b border-zinc-800/80">
            <tr>
              <th className="py-3 px-4 font-medium">类型</th>
              <th className="py-3 px-4 font-medium">活动名称与 ID</th>
              <th className="py-3 px-4 font-medium">开始时间</th>
              <th className="py-3 px-4 font-medium">距离</th>
              <th className="py-3 px-4 font-medium">时长</th>
              <th className="py-3 px-4 font-medium">同步状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">
                  {isLoading ? '加载记录中...' : '暂无相关运动数据'}
                </td>
              </tr>
            ) : (
              currentItems.map((item) => {
                const sport = getSportInfo(item.sport);
                return (
                  <tr key={item.activityId} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 font-medium ${sport.color}`}>
                        {sport.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-200">{item.activityName}</div>
                      <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                        <span>ID: {item.activityId}</span>
                        <a
                          href={`https://connect.garmin.cn/modern/activity/${item.activityId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{formatDateTime(item.startTime)}</td>
                    <td className="py-3 px-4 font-mono">{formatDistance(item.distance)}</td>
                    <td className="py-3 px-4 font-mono">{formatDuration(item.duration)}</td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {getStatusBadge(item)}
                        {item.error && (
                          <div className="text-[11px] text-rose-400 max-w-xs truncate" title={item.error}>
                            {item.error}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <span>
            第 {page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 disabled:opacity-40 transition"
            >
              上一页
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 disabled:opacity-40 transition"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
