'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface LogProps {
  logs: string[];
  onClear: () => void;
}

export function LogConsole({ logs, onClear }: LogProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md overflow-hidden">
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-zinc-200">运行日志实时控制台</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
            {logs.length} 行
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition"
          >
            <Copy className="w-3 h-3" />
            <span>{copied ? '已复制' : '复制日志'}</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 disabled:opacity-40 transition"
          >
            <Trash2 className="w-3 h-3" />
            <span>清空</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 font-mono text-xs max-h-60 overflow-y-auto space-y-1 text-zinc-400 select-text">
          {logs.length === 0 ? (
            <div className="text-zinc-400 italic">暂无运行日志，点击“开始全量同步”即可查看实时过程。</div>
          ) : (
            logs.map((line, idx) => (
              <div
                key={idx}
                className={`leading-relaxed break-all ${
                  line.includes('成功') || line.includes('uploaded')
                    ? 'text-emerald-400'
                    : line.includes('异常') || line.includes('失败') || line.includes('failed')
                    ? 'text-rose-400'
                    : line.includes('已存在') || line.includes('跳过')
                    ? 'text-blue-400'
                    : 'text-zinc-400'
                }`}
              >
                {line}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
