'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { GarminCredentials } from '@/lib/types';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cnCreds: GarminCredentials;
  setCnCreds: (c: GarminCredentials) => void;
  globalCreds: GarminCredentials;
  setGlobalCreds: (c: GarminCredentials) => void;
  serverFlags: {
    hasCn: boolean;
    hasGlobal: boolean;
    hasKv: boolean;
    cnUsernameMasked: string;
    globalUsernameMasked: string;
  };
  onSaveToLocal: () => void;
}

export function CredentialsModal({
  isOpen,
  onClose,
  cnCreds,
  setCnCreds,
  globalCreds,
  setGlobalCreds,
  serverFlags,
  onSaveToLocal,
}: CredentialsModalProps) {
  const [testingCn, setTestingCn] = useState(false);
  const [cnStatus, setCnStatus] = useState<{
    ok?: boolean;
    msg?: string;
    displayName?: string;
    avatar?: string;
  } | null>(null);

  const [testingGlobal, setTestingGlobal] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<{
    ok?: boolean;
    msg?: string;
    displayName?: string;
    avatar?: string;
  } | null>(null);

  if (!isOpen) return null;

  const testConnection = async (region: 'CN' | 'GLOBAL') => {
    const isCn = region === 'CN';
    const creds = isCn ? cnCreds : globalCreds;
    const setter = isCn ? setTestingCn : setTestingGlobal;
    const statusSetter = isCn ? setCnStatus : setGlobalStatus;

    setter(true);
    statusSetter(null);

    try {
      const res = await fetch('/api/auth/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          username: creds.username,
          password: creds.password,
          session: creds.session,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        statusSetter({
          ok: true,
          msg: `连接成功！用户: ${data.profile?.displayName || 'Garmin 用户'}`,
          displayName: data.profile?.displayName,
          avatar: data.profile?.profileImageUrl,
        });
        if (data.session) {
          if (isCn) {
            setCnCreds({ ...cnCreds, session: data.session });
          } else {
            setGlobalCreds({ ...globalCreds, session: data.session });
          }
        }
      } else {
        statusSetter({
          ok: false,
          msg: data.error || '验证失败，请检查账号密码',
        });
      }
    } catch (e: any) {
      statusSetter({
        ok: false,
        msg: e.message || '网络请求错误',
      });
    } finally {
      setter(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">佳明账号凭证配置</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                用于连接 Garmin Connect 中国区与国际区，读取与导入 FIT 运动数据。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server env indicator */}
        {(serverFlags.hasCn || serverFlags.hasGlobal) && (
          <div className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-zinc-200">已检测到服务器环境变量配置：</div>
              <div className="text-zinc-400 mt-0.5">
                {serverFlags.hasCn && (
                  <span className="mr-3">CN: {serverFlags.cnUsernameMasked || '已配置'}</span>
                )}
                {serverFlags.hasGlobal && (
                  <span>Global: {serverFlags.globalUsernameMasked || '已配置'}</span>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                下方表单留空时将直接使用环境变量。若填写则优先使用下方输入的账号。
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Garmin CN */}
          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                <span>🇨🇳 佳明国区账号</span>
                <span className="text-[10px] text-zinc-400 font-mono">(garmin.cn)</span>
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">国区邮箱 / 用户名</label>
                <input
                  type="text"
                  placeholder={serverFlags.hasCn ? '已配置环境变量 (可留空)' : 'example@mail.com'}
                  value={cnCreds.username || ''}
                  onChange={(e) => setCnCreds({ ...cnCreds, username: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">国区密码</label>
                <input
                  type="password"
                  placeholder={serverFlags.hasCn ? '••••••••' : '输入国区登录密码'}
                  value={cnCreds.password || ''}
                  onChange={(e) => setCnCreds({ ...cnCreds, password: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                disabled={testingCn}
                onClick={() => testConnection('CN')}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 disabled:opacity-50 transition"
              >
                {testingCn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>测试国区连接</span>
              </button>

              {cnStatus && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    cnStatus.ok
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {cnStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{cnStatus.msg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Garmin Global */}
          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                <span>🌐 佳明国际区账号</span>
                <span className="text-[10px] text-zinc-400 font-mono">(garmin.com)</span>
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">国际区邮箱 / 用户名</label>
                <input
                  type="text"
                  placeholder={
                    serverFlags.hasGlobal ? '已配置环境变量 (可留空)' : 'example@mail.com'
                  }
                  value={globalCreds.username || ''}
                  onChange={(e) => setGlobalCreds({ ...globalCreds, username: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">国际区密码</label>
                <input
                  type="password"
                  placeholder={serverFlags.hasGlobal ? '••••••••' : '输入国际区登录密码'}
                  value={globalCreds.password || ''}
                  onChange={(e) => setGlobalCreds({ ...globalCreds, password: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                disabled={testingGlobal}
                onClick={() => testConnection('GLOBAL')}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 disabled:opacity-50 transition"
              >
                {testingGlobal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>测试国际区连接</span>
              </button>

              {globalStatus && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    globalStatus.ok
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {globalStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{globalStatus.msg}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onSaveToLocal}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
          >
            保存到浏览器本地缓存
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
}
